import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import {
  completeAssembly,
  createCustomer,
  createJob,
  getCustomers,
  getJob,
  getJobs,
  scheduleAssembly,
  startJobApproval,
  updateJobMeasure,
  updateJobOffer,
  updateProductionStatus,
  updateStockStatus,
  closeFinance,
  getStockItems,
  applyLocalStockReservation,
  getJobRoles,
  getJobLogs,
  addJobLog,
  updateJobStatus,
  applyLocalJobPatch,
  createLocalPurchaseOrders,
  uploadDocument,
  getJobDocuments,
  deleteDocument,
  getDocumentDownloadUrl,
} from '../services/dataService';

const normalizeJob = (job) => ({
  ...job,
  roles: Array.isArray(job?.roles) ? job.roles : [],
  payments: job?.payments || {},
  offer: job?.offer || {},
  files: job?.files || {},
  measure: job?.measure || {},
  pendingPO: job?.pendingPO || [],
});

const toMessage = (err) => {
  if (!err) return 'Bilinmeyen hata';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.detail) return err.detail;
  try {
    return JSON.stringify(err);
  } catch (e) {
    return String(err);
  }
};

const formatNumber = (value) => new Intl.NumberFormat('tr-TR').format(value || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const JobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    startType: 'OLCU',
    title: '',
    newCustomer: false,
    segment: 'B2B',
    location: '',
    contact: '',
    roles: [],
  });
  const [jobRoles, setJobRoles] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [jobsPayload, customersPayload] = await Promise.all([getJobs(), getCustomers()]);
        setJobs(jobsPayload.map(normalizeJob));
        setCustomers(customersPayload.filter((c) => !c.deleted));
        const rolesPayload = await getJobRoles();
        setJobRoles(rolesPayload);
      } catch (err) {
        setError(err.message || 'İş listesi alınamadı');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return jobs
      .filter((job) => {
        if (statusFilter === 'all') return true;
        return (job.status || '').toLowerCase().includes(statusFilter);
      })
      .filter((job) => {
        if (!normalizedSearch) return true;
        return (
          (job.title || '').toLowerCase().includes(normalizedSearch) ||
          (job.customerName || '').toLowerCase().includes(normalizedSearch) ||
          (job.id || '').toLowerCase().includes(normalizedSearch)
        );
      });
  }, [jobs, search, statusFilter]);

  const columns = [
    { label: 'İş Kodu', accessor: 'id' },
    { label: 'Başlık', accessor: 'title' },
    { label: 'Müşteri', accessor: 'customerName' },
    {
      label: 'İş Kolları',
      accessor: 'roles',
      render: (_v, row) =>
        !row.roles || row.roles.length === 0 ? (
          <span className="text-muted">Belirtilmemiş</span>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {row.roles.map((r) => (
              <span key={r.id || r.name} className="badge badge-secondary">
                {r.name}
              </span>
            ))}
          </div>
        ),
    },
    {
      label: 'Durum',
      accessor: 'status',
      render: (_value, row) => renderStatus(row.status),
    },
    { label: 'Başlatma', accessor: 'startType' },
  ];

  const openDetail = async (job) => {
    setDetailModal(true);
    setDetailLoading(true);
    setDetailError('');
    setSelectedJob(normalizeJob(job));
    try {
      const payload = await getJob(job.id);
      setSelectedJob(normalizeJob(payload));
    } catch (err) {
      setDetailError(err.message || 'İş detayı alınamadı');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleRole = (role) => {
    setForm((prev) => {
      const exists = prev.roles.find((r) => r.id === role.id);
      if (exists) {
        return { ...prev, roles: prev.roles.filter((r) => r.id !== role.id) };
      }
      return { ...prev, roles: [...prev.roles, role] };
    });
  };

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return jobRoles;
    return jobRoles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
    );
  }, [jobRoles, roleSearch]);

  return (
    <div>
      <PageHeader
        title="İş Listesi"
        subtitle="Aktif tüm işlerinizi tek ekranda takip edin"
        actions={
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setForm({
                customerId: '',
                customerName: '',
                startType: 'OLCU',
                title: '',
                newCustomer: false,
                segment: 'B2B',
                location: '',
                contact: '',
                roles: [],
              });
              setShowModal(true);
            }}
          >
            + Yeni İş Başlat
          </button>
        }
      />

      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label" htmlFor="search">
            Arama
          </label>
          <input
            id="search"
            className="filter-input"
            type="search"
            placeholder="İş adı, müşteri veya iş kodu"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="status">
            Durum
          </label>
          <select
            id="status"
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tümü</option>
            <option value="keşif">Keşif</option>
            <option value="üretim">Üretimde</option>
            <option value="montaj">Montaj</option>
            <option value="teslim">Teslim</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Loader text="İşler yükleniyor..." />
      ) : error ? (
        <div className="card error-card">
          <div className="error-title">Liste yüklenemedi</div>
          <div className="error-message">{error}</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredJobs}
          getKey={(row) => row.id}
          onRowClick={openDetail}
          />
      )}

      <Modal
        open={showModal}
        title="Yeni İş Başlat"
        size="large"
        onClose={() => setShowModal(false)}
        actions={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setShowModal(false)} disabled={submitting}>
              Vazgeç
            </button>
            <button className="btn btn-primary" type="submit" form="job-modal-form" disabled={submitting}>
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </>
        }
      >
        <form
          id="job-modal-form"
          className="grid grid-2"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              setSubmitting(true);
              setError('');

              let customerId = form.customerId;
              let customerName = form.customerName;

              if (form.newCustomer) {
                const created = await createCustomer({
                  name: form.customerName,
                  segment: form.segment,
                  location: form.location,
                  contact: form.contact,
                });
                customerId = created.id;
                customerName = created.name;
                setCustomers((prev) => [created, ...prev]);
              }

              const job = await createJob({
                customerId,
                customerName,
                title: form.title,
                startType: form.startType,
                roles: form.roles,
              });
              setJobs((prev) => [normalizeJob(job), ...prev]);
              setForm((prev) => ({
                ...prev,
                roles: [],
              }));
              setShowModal(false);
            } catch (err) {
              setError(err.message || 'İş oluşturulamadı');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="job-title">
              İş Başlığı
            </label>
            <input
              id="job-title"
              className="form-input"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Örn: Balkon PVC Doğrama"
              required
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="job-roles">
              İş Kolları (çoklu seçim)
            </label>
            <div className="chip-list" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {form.roles.length === 0 ? <span className="text-muted">Henüz seçilmedi</span> : null}
              {form.roles.map((role) => (
                <span key={role.id} className="badge badge-secondary" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {role.name}
                  <button
                    type="button"
                    className="btn btn-icon"
                    aria-label="Kaldır"
                    onClick={() => toggleRole(role)}
                    style={{ fontSize: 12 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="filter-bar" style={{ margin: 0 }}>
              <div className="filter-group">
                <label className="filter-label" htmlFor="role-search">
                  Ara / Ekle
                </label>
                <input
                  id="role-search"
                  className="filter-input"
                  placeholder="İş kolu ara"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: 160, overflow: 'auto', marginTop: 8 }}>
              <table className="table">
                <tbody>
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td>
                        <div className="text-muted">Kayıt bulunamadı</div>
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role) => {
                      const active = form.roles.some((r) => r.id === role.id);
                      return (
                        <tr key={role.id} className={active ? 'row-selected' : ''}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{role.name}</div>
                            <div className="text-muted">{role.description || 'Açıklama yok'}</div>
                          </td>
                          <td style={{ width: 80, textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={() => toggleRole(role)}
                            >
                              {active ? 'Kaldır' : 'Ekle'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="start-type">
              Başlatma Türü
            </label>
            <select
              id="start-type"
              className="form-select"
              value={form.startType}
              onChange={(e) => setForm((prev) => ({ ...prev, startType: e.target.value }))}
            >
              <option value="OLCU">Ölçü ile Başlat</option>
              <option value="FIYATLANDIRMA">Fiyatlandırma ile Başlat</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Müşteri Seçimi</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="cust-mode"
                  checked={!form.newCustomer}
                  onChange={() => setForm((prev) => ({ ...prev, newCustomer: false }))}
                />
                Mevcut
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="cust-mode"
                  checked={form.newCustomer}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      newCustomer: true,
                      customerId: '',
                      customerName: '',
                    }))
                  }
                />
                Yeni
              </label>
            </div>
          </div>

          {!form.newCustomer ? (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <select
                className="form-select"
                value={form.customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  const found = customers.find((c) => c.id === id);
                  setForm((prev) => ({ ...prev, customerId: id, customerName: found?.name || '' }));
                }}
                required
              >
                <option value="">Müşteri seç</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.segment})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="c-name">
                  Ad
                </label>
                <input
                  id="c-name"
                  className="form-input"
                  value={form.customerName}
                  onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="c-segment">
                  Segment
                </label>
                <select
                  id="c-segment"
                  className="form-select"
                  value={form.segment}
                  onChange={(e) => setForm((prev) => ({ ...prev, segment: e.target.value }))}
                >
                  <option value="B2B">B2B</option>
                  <option value="B2C">B2C</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="c-location">
                  Lokasyon
                </label>
                <input
                  id="c-location"
                  className="form-input"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="c-contact">
                  İletişim
                </label>
                <input
                  id="c-contact"
                  className="form-input"
                  value={form.contact}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
                />
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={detailModal}
        title={`İş Detayı ${selectedJob ? `- ${selectedJob.id}` : ''}`}
        size="xxlarge"
        onClose={() => {
          setDetailModal(false);
          setSelectedJob(null);
          setDetailError('');
        }}
      >
        {detailLoading ? (
          <div>Yükleniyor...</div>
        ) : detailError ? (
          <div className="error-card">
            <div className="error-title">Hata</div>
            <div className="error-message">{detailError}</div>
          </div>
        ) : selectedJob ? (
          <JobStepper
            job={selectedJob}
            onUpdated={async (updated) => {
              setSelectedJob(updated);
              setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
};

const renderStatus = (status) => {
  const label = status || 'Bilinmiyor';
  const normalized = label.toLowerCase();

  let tone = 'secondary';
  if (normalized.includes('ölçü') || normalized.includes('olcu')) tone = 'primary';
  if (normalized.includes('fiyat')) tone = 'secondary';
  if (normalized.includes('teklif')) tone = 'secondary';
  if (normalized.includes('onay')) tone = 'warning';
  if (normalized.includes('stok')) tone = 'warning';
  if (normalized.includes('hazır') || normalized.includes('hazir')) tone = 'success';
  if (normalized.includes('anlaşma') || normalized.includes('anlasma')) tone = 'info';
  if (normalized.includes('üretim')) tone = 'warning';
  if (normalized.includes('montaj')) tone = 'primary';
  if (normalized.includes('muhasebe')) tone = 'secondary';
  if (normalized.includes('kapalı') || normalized.includes('kapali')) tone = 'success';

  return <span className={`badge badge-${tone}`}>{label}</span>;
};

const STAGE_FLOW = [
  { id: 'measure', label: 'Ölçü', statuses: ['OLCU_ASAMASI'] },
  { id: 'pricing', label: 'Fiyatlandırma', statuses: ['FIYATLANDIRMA'] },
  { id: 'offer', label: 'Teklif', statuses: ['TEKLIF_TASLAK', 'TEKLIF_HAZIR'] },
  { id: 'approval', label: 'Onay', statuses: ['ONAY_BEKLIYOR'] },
  { id: 'stock', label: 'Stok/Rezervasyon', statuses: ['STOK_BEKLIYOR'] },
  { id: 'production', label: 'Üretim', statuses: ['URETIME_HAZIR', 'URETIMDE', 'ANLASMADA'] },
  { id: 'assembly', label: 'Montaj', statuses: ['MONTAJA_HAZIR', 'MONTAJ_TERMIN'] },
  { id: 'finance', label: 'Finans Kapanış', statuses: ['MUHASEBE_BEKLIYOR', 'KAPALI'] },
];

const findStageByStatus = (status) =>
  STAGE_FLOW.find((stage) => stage.statuses.includes(status)) || STAGE_FLOW[0];

const getNextStage = (currentStageId) => {
  const idx = STAGE_FLOW.findIndex((s) => s.id === currentStageId);
  if (idx < 0 || idx >= STAGE_FLOW.length - 1) return null;
  return STAGE_FLOW[idx + 1];
};

const JobStepper = ({ job, onUpdated }) => {
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState('');
  const [stockItems, setStockItems] = useState([]);
  const [stockQuery, setStockQuery] = useState('');
  const [stockSkuQuery, setStockSkuQuery] = useState('');
  const [stockColorQuery, setStockColorQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [reserveQty, setReserveQty] = useState(1);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [reservedLines, setReservedLines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsError, setLogsError] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [pendingPO, setPendingPO] = useState(job.pendingPO || []);
  const [inputs, setInputs] = useState({
    measureNote: '',
    appointment: '',
    measureCall: false,
    measureConfirmed: false,
    measureDraftFile: '',
    techDrawingFile: '',
    orderNo: '',
    cariCode: '',
    offerExpanded: true,
    offerTotal: '',
    payCash: '',
    payCard: '',
    payCheque: '',
    payAfter: '',
    chequeLines: [],
    stockReady: true,
    stockNote: '',
    productionStatus: 'URETIMDE',
    agreementDate: '',
    assemblyDate: '',
    assemblyNote: '',
    assemblyTeam: '',
    proofNote: '',
    financeTotal: '',
    financeCash: '',
    financeCard: '',
    financeCheque: '',
    discountAmount: '',
    discountNote: '',
  });

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [jobDocuments, setJobDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Initialize inputs from job data
  useEffect(() => {
    const measure = job.measure || {};
    const offer = job.offer || {};
    const payments = job.payments || {};
    const assembly = job.assembly?.schedule || {};
    const finance = job.finance || {};

    setInputs((prev) => ({
      ...prev,
      // Measure
      measureNote: measure.note || '',
      appointment: measure.appointment || '',
      measureCall: measure.call || false,
      measureConfirmed: measure.confirm || false,
      // Pricing / Offer
      orderNo: offer.orderNo || '',
      cariCode: offer.cariCode || job.customerAccountCode || '',
      offerTotal: offer.total || '',
      // Payments
      payCash: payments.cash || '',
      payCard: payments.card || '',
      payCheque: payments.cheque || '',
      payAfter: payments.after || '',
      chequeLines: payments.chequeLines || [],
      // Production
      productionStatus: job.status === 'ANLASMADA' ? 'ANLASMADA' : (job.status === 'MONTAJA_HAZIR' ? 'MONTAJA_HAZIR' : 'URETIMDE'),
      agreementDate: job.agreementDate || '',
      // Assembly
      assemblyDate: assembly.date || '',
      assemblyNote: assembly.note || '',
      assemblyTeam: assembly.team || '',
      // Finance
      financeTotal: finance.total || offer.total || '',
      financeCash: finance.cash || payments.cash || '',
      financeCard: finance.card || payments.card || '',
      financeCheque: finance.cheque || payments.cheque || '',
      discountAmount: finance.discount || '',
      discountNote: finance.discountNote || '',
    }));
  }, [job]);

  const currentStage = findStageByStatus(job.status || 'OLCU_ASAMASI');
  const [selectedStage, setSelectedStage] = useState(currentStage.id);

  const isStageSelected = (id) => selectedStage === id;
  const markStage = (id) => setSelectedStage(id);

  const stageState = (id) => {
    const currentIndex = STAGE_FLOW.findIndex((s) => s.id === currentStage.id);
    const index = STAGE_FLOW.findIndex((s) => s.id === id);
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  const pushLog = async (action, detail, meta = {}) => {
    try {
      await addJobLog({ jobId: job.id, action, detail, meta });
      const fresh = await getJobLogs(job.id);
      setLogs(fresh);
    } catch (_) {
      // log errors are non-blocking
    }
  };

  // Load job documents
  const loadJobDocuments = async () => {
    try {
      setDocsLoading(true);
      const docs = await getJobDocuments(job.id);
      setJobDocuments(docs);
    } catch (_) {
      // Non-blocking
    } finally {
      setDocsLoading(false);
    }
  };

  // Auto-advance to next stage after successful action
  const advanceToNextStage = (updatedJob) => {
    const newStage = findStageByStatus(updatedJob.status);
    if (newStage.id !== currentStage.id) {
      setSelectedStage(newStage.id);
    }
  };

  // Check if should auto-advance
  const shouldAutoAdvance = (updatedJob, logMeta) => {
    if (logMeta?.skipAdvance) return false;
    // Always auto-advance to the next stage based on new status
    return true;
  };

  const act = async (fn, logMeta, options = {}) => {
    try {
      setActionLoading(true);
      setActionError('');
      const updated = await fn();
      const normalizedUpdated = normalizeJob(updated);
      onUpdated(normalizedUpdated);
      await pushLog('update', `Aşama: ${currentStage.label}`, { stage: currentStage.id, ...(logMeta || {}) });
      
      // Auto-advance to next stage if allowed
      if (shouldAutoAdvance(normalizedUpdated, logMeta)) {
        advanceToNextStage(normalizedUpdated);
      }
    } catch (err) {
      setActionError(toMessage(err) || 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  // Document upload handler
  const handleDocUpload = async (file, docType, description = '') => {
    if (!file) return;
    try {
      setUploadingDoc(true);
      const doc = await uploadDocument(file, job.id, docType, description);
      setJobDocuments((prev) => [doc, ...prev]);
      return doc;
    } catch (err) {
      setActionError(err.message || 'Dosya yüklenemedi');
      return null;
    } finally {
      setUploadingDoc(false);
    }
  };

  // Document delete handler
  const handleDocDelete = async (docId) => {
    try {
      await deleteDocument(docId);
      setJobDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setActionError(err.message || 'Dosya silinemedi');
    }
  };

  const loadStock = async () => {
    try {
      setStockLoading(true);
      setStockError('');
      const payload = await getStockItems();
      const normalized = (payload || []).map((item) => ({
        ...item,
        available: Math.max(0, (item.onHand || 0) - (item.reserved || 0)),
      }));
      setStockItems(normalized);
    } catch (err) {
      setStockError(err.message || 'Stok listesi alınamadı');
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
    loadJobDocuments();
    const loadLogs = async () => {
      try {
        setLogsError('');
        const payload = await getJobLogs(job.id);
        setLogs(payload);
      } catch (err) {
        setLogsError(err.message || 'Loglar alınamadı');
      }
    };
    loadLogs();
    setPendingPO(job.pendingPO || []);
  }, []);

  const stockStatus = (item) => {
    if (!item) return { label: '-', tone: 'secondary' };
    if (item.available <= 0) return { label: 'Tükendi', tone: 'danger' };
    if (item.available <= item.critical) return { label: 'Kritik', tone: 'danger' };
    if (item.available <= item.critical + Math.max(5, item.critical * 0.25)) return { label: 'Düşük', tone: 'warning' };
    return { label: 'Sağlıklı', tone: 'success' };
  };

  const filteredStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    const skuQ = stockSkuQuery.trim().toLowerCase();
    const colorQ = stockColorQuery.trim().toLowerCase();
    let result = stockItems;
    
    if (q) {
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.supplier || '').toLowerCase().includes(q) ||
          (it.category || '').toLowerCase().includes(q)
      );
    }
    
    if (skuQ) {
      result = result.filter((it) => it.sku.toLowerCase().includes(skuQ));
    }
    
    if (colorQ) {
      result = result.filter((it) => (it.color || '').toLowerCase().includes(colorQ));
    }
    
    return result;
  }, [stockItems, stockQuery, stockSkuQuery, stockColorQuery]);

  const stockSummary = useMemo(() => {
    const total = stockItems.reduce((sum, it) => sum + (it.available || 0), 0);
    const critical = stockItems.filter((it) => stockStatus(it).tone !== 'success').length;
    return { total, critical };
  }, [stockItems]);

  const offerTotalValue = useMemo(() => {
    const fromJob = Number(job.offer?.total || 0);
    const local = Number(inputs.offerTotal || 0);
    return local || fromJob || 0;
  }, [job.offer, inputs.offerTotal]);

  const chequeTotal = useMemo(
    () => inputs.chequeLines.reduce((sum, c) => sum + Number(c.amount || 0), 0),
    [inputs.chequeLines]
  );

  const paymentTotal = useMemo(() => {
    return (
      Number(inputs.payCash || 0) +
      Number(inputs.payCard || 0) +
      chequeTotal +
      Number(inputs.payAfter || 0)
    );
  }, [inputs.payCash, inputs.payCard, inputs.payAfter, chequeTotal]);

  const avgChequeDays = useMemo(() => {
    const today = new Date();
    const totalAmount = inputs.chequeLines.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    if (totalAmount <= 0) return 0;
    const weighted = inputs.chequeLines.reduce((sum, c) => {
      const due = c.due ? new Date(c.due) : today;
      const days = Math.max(0, Math.round((due - today) / (1000 * 60 * 60 * 24)));
      return sum + Number(c.amount || 0) * days;
    }, 0);
    return Math.round(weighted / totalAmount);
  }, [inputs.chequeLines]);

  const selectStock = (item) => {
    setSelectedStock(item);
    setReserveQty(1);
  };

  const addReservedLine = () => {
    if (!selectedStock || reserveQty <= 0) return;
    setReservedLines((prev) => {
      const existing = prev.find((line) => line.id === selectedStock.id);
      if (existing) {
        return prev.map((line) =>
          line.id === selectedStock.id ? { ...line, qty: line.qty + reserveQty } : line
        );
      }
      return [
        ...prev,
        {
          id: selectedStock.id,
          name: selectedStock.name,
          sku: selectedStock.sku,
          qty: reserveQty,
          unit: selectedStock.unit,
          available: selectedStock.available,
          supplier: selectedStock.supplier,
          color: selectedStock.color,
        },
      ];
    });
    setSelectedStock(null);
    setReserveQty(1);
    setStockModalOpen(false);
  };

  const removeLine = (id) => {
    setReservedLines((prev) => prev.filter((line) => line.id !== id));
  };

  const status = job.status || '';

  return (
    <div className="grid grid-1" style={{ gap: 16 }}>
      <div className="card subtle-card">
        <div className="card-header">
          <h3 className="card-title">Süreç Haritası</h3>
          <span className="badge badge-secondary">{currentStage.label}</span>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', padding: '0 12px' }}>
            {STAGE_FLOW.map((stage, idx) => {
              const state = stageState(stage.id);
              const isActive = state === 'current';
              const isDone = state === 'done';
              const isLast = idx === STAGE_FLOW.length - 1;

              let color = '#e2e8f0'; // gray-200
              if (isActive) color = '#3b82f6'; // blue-500
              if (isDone) color = '#22c55e'; // green-500

              return (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 1,
                      width: 100,
                    }}
                    onClick={() => markStage(stage.id)}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: isActive ? 'white' : color,
                        border: `2px solid ${color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: isActive ? color : 'white',
                        marginBottom: 8,
                        transition: 'all 0.2s',
                        boxShadow: isActive ? `0 0 0 4px ${color}33` : 'none',
                      }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#0f172a' : '#64748b',
                        textAlign: 'center',
                        lineHeight: 1.3,
                      }}
                    >
                      {stage.label}
                    </div>
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        width: 60,
                        height: 3,
                        backgroundColor: isDone ? '#22c55e' : '#e2e8f0',
                        marginTop: -26,
                        marginLeft: -10,
                        marginRight: -10,
                        borderRadius: 2,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="card-footer text-muted">
          Seçtiğiniz aşamanın formu aşağıda açılır. Önceki aşamalara dönüp düzeltme yapabilirsiniz.
        </div>
      </div>

      <div className="card subtle-card">
        <div className="metric-row">
          <span className="metric-label">Durum</span>
          <span className="metric-value">{job.status}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Başlık</span>
          <span className="metric-value">{job.title}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Müşteri</span>
          <span className="metric-value">{job.customerName}</span>
        </div>
      </div>

      {actionError ? (
        <div className="card error-card">
          <div className="error-title">Hata</div>
          <div className="error-message">{actionError}</div>
        </div>
      ) : null}

      {isStageSelected('measure') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ölçü Randevusu</h3>
          </div>
          <div className="card-body grid grid-1" style={{ gap: 12 }}>
            <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={inputs.measureCall}
                onChange={(e) => setInputs((p) => ({ ...p, measureCall: e.target.checked }))}
              />
              Müşteri arandı / randevulaşıldı
            </label>
            <div className="grid grid-4" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Randevu Tarihi</label>
                <input
                  className="form-input"
                  type="date"
                  value={inputs.appointment?.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = inputs.appointment?.includes('T') ? inputs.appointment.split('T')[1]?.slice(0, 5) : '10:00';
                    setInputs((p) => ({ ...p, appointment: e.target.value ? `${e.target.value}T${time}` : '' }));
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Saat</label>
                <input
                  className="form-input"
                  type="time"
                  value={inputs.appointment?.includes('T') ? inputs.appointment.split('T')[1]?.slice(0, 5) : '10:00'}
                  onChange={(e) => {
                    const date = inputs.appointment?.split('T')[0] || '';
                    if (date) {
                      setInputs((p) => ({ ...p, appointment: `${date}T${e.target.value}` }));
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Randevu Onayı</label>
                <select
                  className="form-select"
                  value={inputs.measureConfirmed ? 'yes' : 'no'}
                  onChange={(e) => setInputs((p) => ({ ...p, measureConfirmed: e.target.value === 'yes' }))}
                >
                  <option value="no">Beklemede</option>
                  <option value="yes">Onaylandı</option>
                </select>
              </div>
            </div>
            <textarea
              className="form-textarea"
              placeholder="Ölçü notları / adres / görüşme notu"
              value={inputs.measureNote}
              onChange={(e) => setInputs((p) => ({ ...p, measureNote: e.target.value }))}
            />
            <div className="btn-group" style={{ gap: 12, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              type="button"
              disabled={actionLoading}
              onClick={() =>
                  act(
                    () =>
                  updateJobMeasure(job.id, {
                        measurements: { note: inputs.measureNote, call: inputs.measureCall, confirmed: inputs.measureConfirmed },
                    appointment: inputs.appointment ? { date: inputs.appointment } : null,
                        status: 'OLCU_ASAMASI',
                      }),
                    { measure: true, skipAdvance: true }
                  )
                }
              >
                💾 Kaydet
              </button>
              <button
                className="btn btn-success"
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  act(
                    () =>
                      updateJobStatus(job.id, {
                        status: 'FIYATLANDIRMA',
                      }),
                    { transition: 'FIYATLANDIRMA' }
                  )
                }
              >
                ✓ Fiyatlandırmaya Geç
            </button>
            </div>
          </div>
        </div>
      )}

      {isStageSelected('pricing') && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Fiyatlandırma</h3>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setInputs((p) => ({ ...p, offerExpanded: !p.offerExpanded }))}
            >
              {inputs.offerExpanded ? 'Alanları gizle' : 'Alanları göster'}
            </button>
          </div>
          {inputs.offerExpanded && (
            <div className="card-body grid grid-1" style={{ gap: 16 }}>
              {/* Döküman Yükleme Alanı */}
              <div className="card subtle-card">
                <div className="card-header" style={{ padding: '12px 16px' }}>
                  <h4 className="card-title" style={{ fontSize: 14 }}>Dökümanlar</h4>
                  {uploadingDoc && <Loader size="small" />}
                </div>
                <div className="card-body" style={{ padding: 16 }}>
                  <div className="grid grid-2" style={{ gap: 16 }}>
                    {/* Ölçü Taslağı */}
                    <div className="form-group">
                      <label className="form-label">Ölçü Taslağı</label>
                      <div className="file-upload-zone">
                        <input
                          type="file"
                          id="olcu-file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await handleDocUpload(file, 'olcu', 'Ölçü taslağı');
                              e.target.value = '';
                            }
                          }}
                        />
                        <label htmlFor="olcu-file" className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
                          📄 Dosya Seç
                        </label>
                        {jobDocuments.filter((d) => d.type === 'olcu').length > 0 && (
                          <span className="badge badge-success" style={{ marginLeft: 8 }}>
                            {jobDocuments.filter((d) => d.type === 'olcu').length} dosya
                          </span>
                        )}
                      </div>
                      {/* Yüklü Dosyalar */}
                      {jobDocuments.filter((d) => d.type === 'olcu').map((doc) => (
                        <div key={doc.id} className="metric-row" style={{ marginTop: 8, fontSize: 13 }}>
                          <a
                            href={getDocumentDownloadUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary"
                          >
                            📎 {doc.originalName}
                          </a>
                          <button
                            type="button"
                            className="btn btn-danger btn-small btn-icon"
                            onClick={() => handleDocDelete(doc.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Teknik Çizim */}
                    <div className="form-group">
                      <label className="form-label">Teknik Çizim</label>
                      <div className="file-upload-zone">
                        <input
                          type="file"
                          id="teknik-file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.dwg,.dxf"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await handleDocUpload(file, 'teknik', 'Teknik çizim');
                              e.target.value = '';
                            }
                          }}
                        />
                        <label htmlFor="teknik-file" className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
                          📐 Dosya Seç
                        </label>
                        {jobDocuments.filter((d) => d.type === 'teknik').length > 0 && (
                          <span className="badge badge-success" style={{ marginLeft: 8 }}>
                            {jobDocuments.filter((d) => d.type === 'teknik').length} dosya
                          </span>
                        )}
                      </div>
                      {/* Yüklü Dosyalar */}
                      {jobDocuments.filter((d) => d.type === 'teknik').map((doc) => (
                        <div key={doc.id} className="metric-row" style={{ marginTop: 8, fontSize: 13 }}>
                          <a
                            href={getDocumentDownloadUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary"
                          >
                            📎 {doc.originalName}
                          </a>
                          <button
                            type="button"
                            className="btn btn-danger btn-small btn-icon"
                            onClick={() => handleDocDelete(doc.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 12 }}>
                <div>
                  <label className="form-label">Sipariş No</label>
                  <input
                    className="form-input"
                    placeholder="Sipariş numarası"
                    value={inputs.orderNo}
                    onChange={(e) => setInputs((p) => ({ ...p, orderNo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Cari Kod</label>
                  <input
                    className="form-input"
                    placeholder="Yoksa oluşturulacak"
                    value={inputs.cariCode}
                    onChange={(e) => setInputs((p) => ({ ...p, cariCode: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Toplam Tutar (₺)</label>
            <input
              className="form-input"
              type="number"
              placeholder="Toplam tutar"
              value={inputs.offerTotal}
              onChange={(e) => setInputs((p) => ({ ...p, offerTotal: e.target.value }))}
            />
              </div>
            <button
                className={`btn btn-primary ${actionLoading ? 'loading' : ''}`}
              type="button"
              disabled={actionLoading}
              onClick={() =>
                  act(
                    () =>
                  updateJobOffer(job.id, {
                    lines: [],
                    total: Number(inputs.offerTotal || 0),
                    status: 'TEKLIF_TASLAK',
                        files: {
                          measureDraft: jobDocuments.filter((d) => d.type === 'olcu').map((d) => d.id),
                          techDrawing: jobDocuments.filter((d) => d.type === 'teknik').map((d) => d.id),
                        },
                        meta: {
                          orderNo: inputs.orderNo,
                          cariCode: inputs.cariCode || 'OLUSTUR',
                        },
                      }),
                    { pricing: true }
                )
              }
            >
              Teklif kaydet
            </button>
          </div>
          )}
        </div>
      )}

      {isStageSelected('offer') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Onay Akışı Başlat</h3>
          </div>
          <div className="card-body grid grid-1" style={{ gap: 16 }}>
            {/* Ödeme Bilgileri */}
            <div className="card subtle-card" style={{ padding: 16 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-secondary)' }}>💰 Ödeme Bilgileri</h4>
              <div className="grid grid-4" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nakit</label>
            <input
              className="form-input"
              type="number"
                    placeholder="0"
              value={inputs.payCash}
              onChange={(e) => setInputs((p) => ({ ...p, payCash: e.target.value }))}
            />
                </div>
                <div className="form-group">
                  <label className="form-label">Kredi Kartı</label>
            <input
              className="form-input"
              type="number"
                    placeholder="0"
              value={inputs.payCard}
              onChange={(e) => setInputs((p) => ({ ...p, payCard: e.target.value }))}
            />
                </div>
                <div className="form-group">
                  <label className="form-label">Çek Toplamı</label>
                  <div className="form-input" style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                    {formatNumber(chequeTotal)} ₺
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Teslim Sonrası</label>
            <input
              className="form-input"
              type="number"
                    placeholder="0"
                    value={inputs.payAfter}
                    onChange={(e) => setInputs((p) => ({ ...p, payAfter: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Çek Detayları */}
            <div className="card subtle-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>📝 Çek Ekle</h4>
                <span className="text-muted" style={{ fontSize: 12 }}>Ortalama vade: {avgChequeDays} gün</span>
              </div>
              <div className="grid grid-3" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tutar</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0"
                    value={inputs.chequeDraftAmount || ''}
                    onChange={(e) => setInputs((p) => ({ ...p, chequeDraftAmount: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vade Tarihi</label>
                  <input
                    className="form-input"
                    type="date"
                    value={inputs.chequeDraftDue || ''}
                    onChange={(e) => setInputs((p) => ({ ...p, chequeDraftDue: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Banka</label>
                  <input
                    className="form-input"
                    placeholder="Banka adı"
                    value={inputs.chequeDraftBank || ''}
                    onChange={(e) => setInputs((p) => ({ ...p, chequeDraftBank: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Şube</label>
                  <input
                    className="form-input"
                    placeholder="Şube adı"
                    value={inputs.chequeDraftBranch || ''}
                    onChange={(e) => setInputs((p) => ({ ...p, chequeDraftBranch: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Çek No</label>
                  <input
                    className="form-input"
                    placeholder="Çek numarası"
                    value={inputs.chequeDraftNumber || ''}
                    onChange={(e) => setInputs((p) => ({ ...p, chequeDraftNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => {
                    const amt = Number(inputs.chequeDraftAmount || 0);
                    if (!amt) return;
                    setInputs((p) => ({
                      ...p,
                      chequeLines: [
                        ...p.chequeLines,
                        {
                          amount: amt,
                          due: p.chequeDraftDue || '',
                          bank: p.chequeDraftBank || '',
                          branch: p.chequeDraftBranch || '',
                          number: p.chequeDraftNumber || '',
                        },
                      ],
                      chequeDraftAmount: '',
                      chequeDraftDue: '',
                      chequeDraftBank: '',
                      chequeDraftBranch: '',
                      chequeDraftNumber: '',
                    }));
                  }}
                >
                  + Çek Ekle
                </button>
              </div>
              {inputs.chequeLines.length > 0 && (
                <div className="table-container" style={{ maxHeight: 200, overflow: 'auto', marginTop: 12 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tutar</th>
                        <th>Vade</th>
                        <th>Banka</th>
                        <th>Şube</th>
                        <th>No</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {inputs.chequeLines.map((c, idx) => (
                        <tr key={`${c.number}-${idx}`}>
                          <td><strong>{formatNumber(c.amount)} ₺</strong></td>
                          <td>{formatDate(c.due)}</td>
                          <td>{c.bank || '-'}</td>
                          <td>{c.branch || '-'}</td>
                          <td>{c.number || '-'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-small btn-icon"
              onClick={() =>
                                setInputs((p) => ({
                                  ...p,
                                  chequeLines: p.chequeLines.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Toplam Özeti */}
            <div className="card subtle-card" style={{ padding: 16 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-secondary)' }}>📊 Özet</h4>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="metric-row" style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 8 }}>
                  <div>
                    <div className="metric-label">Teklif Toplamı</div>
                  </div>
                  <strong style={{ fontSize: 18 }}>{formatNumber(offerTotalValue)} ₺</strong>
                </div>
                <div className="metric-row" style={{ background: paymentTotal === offerTotalValue ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', padding: '12px', borderRadius: 8 }}>
                  <div>
                    <div className="metric-label">Ödeme Toplamı</div>
                  </div>
                  <strong style={{ fontSize: 18, color: paymentTotal === offerTotalValue ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatNumber(paymentTotal)} ₺</strong>
                </div>
              </div>
              {paymentTotal !== offerTotalValue && (
                <div className="error-text" style={{ marginTop: 8, padding: 8, background: 'var(--color-danger-bg)', borderRadius: 4 }}>
                  ⚠️ Toplam ödeme, teklif tutarıyla eşleşmiyor. Fark: {formatNumber(Math.abs(offerTotalValue - paymentTotal))} ₺
                </div>
              )}
              {avgChequeDays > 90 && (
                <div style={{ marginTop: 8, padding: 8, background: '#fef3cd', borderRadius: 4, color: '#856404' }}>
                  ⏰ Ortalama vade {avgChequeDays} gün. Uzun vade için ek onay gerekebilir.
                </div>
              )}
            </div>

            <div className="btn-group" style={{ gap: 12, marginTop: 8 }}>
              <button
                className="btn btn-success"
                type="button"
                disabled={actionLoading || paymentTotal !== offerTotalValue}
                onClick={() =>
                  act(async () => {
                    if (paymentTotal !== offerTotalValue) {
                      throw new Error('Ödeme toplamı teklif tutarıyla eşleşmiyor.');
                    }
                    const chequeSum = inputs.chequeLines.reduce((s, c) => s + Number(c.amount || 0), 0);
                    if (chequeSum !== chequeTotal) {
                      throw new Error('Çek parçaları toplamı hatalı.');
                    }
                    const payload = {
                    paymentPlan: {
                      cash: Number(inputs.payCash || 0),
                      card: Number(inputs.payCard || 0),
                        cheque: chequeTotal,
                        afterDelivery: Number(inputs.payAfter || 0),
                        cheques: inputs.chequeLines,
                    },
                    contractUrl: null,
                    stockNeeds: [],
                    };
                    const res = await startJobApproval(job.id, payload);
                    applyLocalJobPatch(job.id, {
                      payments: payload.paymentPlan,
                      offer: { ...job.offer, total: offerTotalValue },
                    });
                    return res;
                  })
                }
              >
                ✓ Onay Akışını Başlat
            </button>
            </div>
          </div>
        </div>
      )}

      {isStageSelected('approval') && (
        <div className="card">
          <div className="card-header" style={{ alignItems: 'center' }}>
            <h3 className="card-title">Stok / Rezervasyon</h3>
            <div className="badge badge-secondary">
              Mevcut: {stockSummary.total} • Kritik: {stockSummary.critical}
          </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div className="text-muted">İş için birden fazla kalem rezerve edebilirsiniz.</div>
              <button className="btn btn-secondary" type="button" onClick={() => setStockModalOpen(true)}>
                Stoktan Ekle
              </button>
            </div>

            {/* Seçili Kalemler - Dataframe Görünümü */}
            <div className="card subtle-card">
              <div className="card-header" style={{ padding: '12px 16px' }}>
                <h4 className="card-title" style={{ fontSize: 14 }}>Seçili Kalemler</h4>
                <span className="badge badge-secondary">{reservedLines.length} kalem</span>
              </div>
              {reservedLines.length === 0 ? (
                <div className="text-muted" style={{ padding: 16 }}>Henüz ekleme yapmadınız. "Stoktan Ekle" butonuna tıklayın.</div>
              ) : (
                <div className="table-container" style={{ maxHeight: 200, overflow: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Kalem</th>
                        <th>Kod</th>
                        <th>Renk</th>
                        <th>Mevcut</th>
                        <th>Miktar</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservedLines.map((line) => (
                        <tr key={line.id}>
                          <td style={{ fontWeight: 600 }}>{line.name}</td>
                          <td className="text-muted">{line.sku}</td>
                          <td><span className="badge badge-secondary">{line.color || '-'}</span></td>
                          <td>{line.available} {line.unit}</td>
                          <td style={{ minWidth: 100 }}>
                            <input
                              type="number"
                              className="form-input"
                              min="1"
                              value={line.qty}
                              onChange={(e) => {
                                const newQty = Number(e.target.value) || 1;
                                setReservedLines((prev) =>
                                  prev.map((l) => (l.id === line.id ? { ...l, qty: newQty } : l))
                                );
                              }}
                              style={{ width: 80 }}
                            />
                          </td>
                          <td>
                            <button className="btn btn-danger btn-small btn-icon" type="button" onClick={() => removeLine(line.id)}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rezervasyon Notu */}
            <div className="form-group">
              <label className="form-label">Rezervasyon Notu</label>
              <textarea
                className="form-textarea"
                placeholder="Satınalma / rezervasyon notu"
                value={inputs.stockNote}
                onChange={(e) => setInputs((p) => ({ ...p, stockNote: e.target.value }))}
                rows={3}
              />
            </div>

            <label className="form-label">
              <input
                type="checkbox"
                checked={inputs.stockReady}
                onChange={(e) => setInputs((p) => ({ ...p, stockReady: e.target.checked }))}
              />{' '}
              Stok hazır (rezerv edildi)
            </label>
            {reservedLines.some((l) => l.qty > l.available) ? (
              <div className="card error-card">
                <div className="error-title">Eksik Stok</div>
                <div className="error-message">
                  Bazı kalemler stokta yetersiz. Sipariş bekleniyor olarak işaretlenecek:
                </div>
                <ul className="text-muted" style={{ marginLeft: 16 }}>
                  {reservedLines
                    .filter((l) => l.qty > l.available)
                    .map((l) => (
                      <li key={l.id}>
                        {l.name} ({l.sku}) — Talep: {l.qty} / Mevcut: {l.available}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
            <textarea
              className="form-textarea"
              placeholder="Satınalma / rezervasyon notu"
              value={inputs.stockNote}
              onChange={(e) => setInputs((p) => ({ ...p, stockNote: e.target.value }))}
            />
            <button
              className="btn btn-primary"
              type="button"
              disabled={actionLoading || reservedLines.length === 0}
              onClick={() =>
                act(async () => {
                  const payload = {
                    ready: inputs.stockReady,
                    purchaseNotes:
                      inputs.stockNote ||
                      reservedLines
                        .map((l) => `${l.name} (${l.sku}) - ${l.qty} ${l.unit || ''} (mevcut ${l.available})`)
                        .join(' | '),
                    items: reservedLines,
                    pending: reservedLines
                      .filter((l) => l.qty > l.available)
                      .map((l) => ({ ...l, missing: l.qty - l.available })),
                  };
                  const result = await updateStockStatus(job.id, payload);
                  // Mock/local veri tutarlılığı için stokları güncelle
                  applyLocalStockReservation(reservedLines, {
                    ready: inputs.stockReady,
                    note: payload.purchaseNotes,
                    jobId: job.id,
                  });
                  if (payload.pending.length > 0) {
                    const po = createLocalPurchaseOrders(job.id, payload.pending);
                    applyLocalJobPatch(job.id, { pendingPO: payload.pending });
                    setPendingPO(payload.pending);
                    await pushLog('stock_pending', 'Eksik stok için sipariş bekleniyor', {
                      pending: payload.pending,
                      poId: po?.id,
                    });
                  } else {
                    applyLocalJobPatch(job.id, { pendingPO: [] });
                    setPendingPO([]);
                  }
                  setStockItems((prev) =>
                    prev.map((item) => {
                      const line = reservedLines.find((l) => l.id === item.id);
                      if (!line) return item;
                      const next = { ...item };
                      if (inputs.stockReady) {
                        next.onHand = Math.max(0, (next.onHand || 0) - line.qty);
                      } else {
                        next.reserved = (next.reserved || 0) + line.qty;
                      }
                      next.available = Math.max(0, (next.onHand || 0) - (next.reserved || 0));
                      return next;
                    })
                  );
                  setReservedLines([]);
                  return result;
                })
              }
            >
              Rezervasyonu Kaydet
            </button>
          </div>
        </div>
      )}

      <Modal
        open={stockModalOpen}
        title="Stoktan Kalem Ekle"
        size="xlarge"
        onClose={() => {
          setStockModalOpen(false);
          setSelectedStock(null);
          setReserveQty(1);
          setStockQuery('');
          setStockSkuQuery('');
          setStockColorQuery('');
        }}
        actions={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setStockModalOpen(false)}>
              Kapat
            </button>
            <button className="btn btn-primary" type="button" onClick={addReservedLine} disabled={!selectedStock}>
              Ekle
            </button>
          </>
        }
      >
        <div className="filter-bar" style={{ marginBottom: 12 }}>
          <div className="filter-group">
            <label className="filter-label" htmlFor="stock-search-modal">
              Kalem Ara
            </label>
            <input
              id="stock-search-modal"
              className="filter-input"
              placeholder="Kalem adı, tedarikçi..."
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="stock-sku-modal">
              Ürün Kodu
            </label>
            <input
              id="stock-sku-modal"
              className="filter-input"
              placeholder="SKU ara..."
              value={stockSkuQuery}
              onChange={(e) => setStockSkuQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="stock-color-modal">
              Renk Kodu
            </label>
            <input
              id="stock-color-modal"
              className="filter-input"
              placeholder="Renk ara..."
              value={stockColorQuery}
              onChange={(e) => setStockColorQuery(e.target.value)}
            />
          </div>
        </div>

        {stockLoading ? (
          <Loader size="small" text="Stok listesi yükleniyor..." />
        ) : stockError ? (
          <div className="card error-card">
            <div className="error-title">Stok alınamadı</div>
            <div className="error-message">{stockError}</div>
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: 320, overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Kalem</th>
                  <th>Kod</th>
                  <th>Renk</th>
                  <th>Durum</th>
                  <th>Mevcut</th>
                  <th>Tedarikçi</th>
                  <th>Seç</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-title">Kayıt yok</div>
                        <div className="empty-state-description">Arama kriterini değiştirin.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStock.slice(0, 30).map((item) => {
                    const statusBadge = stockStatus(item);
                    const isPicked = selectedStock?.id === item.id;
                    return (
                      <tr key={item.id} className={isPicked ? 'row-selected' : ''}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td><span className="text-muted">{item.sku}</span></td>
                        <td><span className="badge badge-secondary">{item.color || '-'}</span></td>
                        <td>
                          <span className={`badge badge-${statusBadge.tone}`}>{statusBadge.label}</span>
                        </td>
                        <td>
                          <strong>{item.available}</strong> / {item.onHand}
                        </td>
                        <td className="text-muted">{item.supplier}</td>
                        <td>
                          <button
                            type="button"
                            className={`btn ${isPicked ? 'btn-primary' : 'btn-secondary'} btn-small`}
                            onClick={() => selectStock(item)}
                            disabled={item.available <= 0}
                          >
                            {isPicked ? '✓' : 'Seç'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedStock && (
          <div className="card subtle-card" style={{ marginTop: 12, padding: 12 }}>
            <div className="metric-row" style={{ marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <strong>{selectedStock.name}</strong>
                <div className="text-muted">
                  Kod: {selectedStock.sku} · Renk: {selectedStock.color || '-'} · Mevcut: {selectedStock.available}
                </div>
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="reserve-qty-modal">Rezervasyon Miktarı</label>
              <input
                id="reserve-qty-modal"
                className="form-input"
                type="number"
                min="1"
                value={reserveQty}
                onChange={(e) => setReserveQty(Number(e.target.value))}
                style={{ maxWidth: 150 }}
              />
            </div>
          </div>
        )}
      </Modal>

      {isStageSelected('production') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Üretim / Montaj Hazırlık</h3>
          </div>
          <div className="card-body grid grid-1" style={{ gap: 12 }}>
            <select
              className="form-select"
              value={inputs.productionStatus}
              onChange={(e) => setInputs((p) => ({ ...p, productionStatus: e.target.value }))}
            >
              <option value="URETIMDE">Üretimde</option>
              <option value="MONTAJA_HAZIR">Montaja Hazır</option>
              <option value="ANLASMADA">Anlaşmada (ileri tarih)</option>
            </select>
            {inputs.productionStatus === 'ANLASMADA' ? (
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div>
                  <label className="form-label">Anlaşma Tarihi</label>
                  <input
                    className="form-input"
                    type="date"
                    value={inputs.agreementDate}
                    onChange={(e) => setInputs((p) => ({ ...p, agreementDate: e.target.value }))}
                  />
                </div>
                <div className="text-muted" style={{ alignSelf: 'center' }}>
                  Tarih geldiğinde üretime geçilmesi için uyarı gösterilecek.
                </div>
              </div>
            ) : null}
            <button
              className="btn btn-primary"
              type="button"
              disabled={actionLoading}
              onClick={() => {
                const payload = { status: inputs.productionStatus };
                if (inputs.productionStatus === 'ANLASMADA' && inputs.agreementDate) {
                  payload.agreementDate = new Date(inputs.agreementDate).toISOString().slice(0, 10);
                }
                // Skip auto-advance only for intermediate statuses (URETIMDE, ANLASMADA)
                const skipAdvance = inputs.productionStatus === 'URETIMDE' || inputs.productionStatus === 'ANLASMADA';
                return act(() => updateProductionStatus(job.id, payload), {
                  production: payload.status,
                  agreement: payload.agreementDate || null,
                  skipAdvance,
                });
              }}
            >
              Güncelle
            </button>
            {pendingPO.length > 0 ? (
              <div className="card subtle-card">
                <div className="card-header">
                  <h4 className="card-title">Sipariş Bekleniyor</h4>
                  <span className="badge badge-warning">{pendingPO.length} kalem</span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pendingPO.map((p) => (
                    <div key={p.id} className="metric-row" style={{ alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <strong>{p.name}</strong> <span className="text-muted">({p.sku})</span>
                        <div className="text-muted">
                          Talep: {p.qty} · Mevcut: {p.available} · Eksik: {p.missing || p.qty}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-muted">
                    Eksik kalemler geldiğinde rezervasyonu tamamlayıp üretime geçebilirsiniz.
                  </div>
                </div>
              </div>
            ) : null}
            {inputs.productionStatus === 'ANLASMADA' ? (
              <div className="card subtle-card">
                <div className="metric-row">
                  <span className="metric-label">Anlaşma Tarihi</span>
                  <span className="metric-value">{inputs.agreementDate || '—'}</span>
                </div>
                <div className="text-muted">
                  Tarih yaklaştığında üretime geçmek için hatırlatma bekleniyor.
                </div>
                {!inputs.agreementDate ? (
                  <div className="error-text" style={{ marginTop: 8 }}>Anlaşmada seçildiğinde tarih girmeniz önerilir.</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isStageSelected('assembly') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Montaj Termin</h3>
          </div>
          <div className="card-body grid grid-1" style={{ gap: 12 }}>
            <div className="grid grid-3" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Montaj Tarihi</label>
            <input
              className="form-input"
                  type="date"
                  value={inputs.assemblyDate?.split('T')[0] || inputs.assemblyDate || ''}
                  onChange={(e) => {
                    const time = inputs.assemblyTime || '09:00';
                    setInputs((p) => ({ ...p, assemblyDate: e.target.value ? `${e.target.value}T${time}` : '' }));
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Saat</label>
            <input
              className="form-input"
                  type="time"
                  value={inputs.assemblyDate?.includes('T') ? inputs.assemblyDate.split('T')[1]?.slice(0, 5) : '09:00'}
                  onChange={(e) => {
                    const date = inputs.assemblyDate?.split('T')[0] || '';
                    if (date) {
                      setInputs((p) => ({ ...p, assemblyDate: `${date}T${e.target.value}` }));
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ekip</label>
                <input
                  className="form-input"
                  placeholder="Montaj ekibi"
              value={inputs.assemblyTeam}
              onChange={(e) => setInputs((p) => ({ ...p, assemblyTeam: e.target.value }))}
            />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Montaj Notu</label>
            <textarea
              className="form-textarea"
                placeholder="Montaj notu, adres detayları vb."
              value={inputs.assemblyNote}
              onChange={(e) => setInputs((p) => ({ ...p, assemblyNote: e.target.value }))}
            />
            </div>
            <div className="btn-group" style={{ gap: 8 }}>
            <button
                className="btn btn-secondary"
              type="button"
              disabled={actionLoading}
              onClick={() =>
                act(() =>
                  scheduleAssembly(job.id, {
                    date: inputs.assemblyDate,
                    note: inputs.assemblyNote,
                    team: inputs.assemblyTeam,
                  })
                )
              }
            >
                Termin Kaydet
              </button>
              <button
                className="btn btn-success"
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  act(async () => {
                    const result = await completeAssembly(job.id, {
                      date: inputs.assemblyDate,
                      note: inputs.assemblyNote,
                      team: inputs.assemblyTeam,
                      completed: true,
                    });
                    await pushLog('assembly.completed', 'Montaj tamamlandı', { team: inputs.assemblyTeam });
                    return result;
                  })
                }
              >
                ✓ Montaj Bitti
            </button>
            </div>
          </div>
        </div>
      )}

      {isStageSelected('finance') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Son Mutabakat (Kapanış)</h3>
          </div>
          <div className="card-body grid grid-1" style={{ gap: 16 }}>
            {/* Teklif Özeti */}
            <div className="card subtle-card">
              <div className="card-header" style={{ padding: '12px 16px' }}>
                <h4 className="card-title" style={{ fontSize: 14 }}>Finansal Özet</h4>
              </div>
              <div className="card-body" style={{ padding: 16 }}>
                <div className="grid grid-2" style={{ gap: 16 }}>
                  <div>
                    <div className="metric-row">
                      <span className="metric-label">Teklif Tutarı</span>
                      <span className="metric-value">{formatNumber(offerTotalValue)} ₺</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Ön Alınan</span>
                      <span className="metric-value">
                        {formatNumber(
                          Number(job.approval?.paymentPlan?.cash || 0) +
                          Number(job.approval?.paymentPlan?.card || 0) +
                          Number(job.approval?.paymentPlan?.cheque || 0)
                        )} ₺
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Teslimat Sonrası</span>
                      <span className="metric-value">{formatNumber(Number(job.approval?.paymentPlan?.afterDelivery || 0))} ₺</span>
                    </div>
                  </div>
                  <div>
                    <div className="metric-row">
                      <span className="metric-label">Beklenen Toplam</span>
                      <span className="metric-value">
                        {formatNumber(
                          Number(job.approval?.paymentPlan?.cash || 0) +
                          Number(job.approval?.paymentPlan?.card || 0) +
                          Number(job.approval?.paymentPlan?.cheque || 0) +
                          Number(job.approval?.paymentPlan?.afterDelivery || 0)
                        )} ₺
                      </span>
                    </div>
                    {offerTotalValue !== (
                      Number(job.approval?.paymentPlan?.cash || 0) +
                      Number(job.approval?.paymentPlan?.card || 0) +
                      Number(job.approval?.paymentPlan?.cheque || 0) +
                      Number(job.approval?.paymentPlan?.afterDelivery || 0)
                    ) && (
                      <div className="badge badge-warning" style={{ marginTop: 8 }}>
                        Ödeme planı teklif tutarıyla eşleşmiyor!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gerçekleşen Tahsilat */}
            <div className="card subtle-card">
              <div className="card-header" style={{ padding: '12px 16px' }}>
                <h4 className="card-title" style={{ fontSize: 14 }}>İş Bitiminde Alınan Tutar</h4>
              </div>
              <div className="card-body" style={{ padding: 16 }}>
                <div className="grid grid-4" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Nakit</label>
            <input
              className="form-input"
              type="number"
                      placeholder="0"
              value={inputs.financeCash}
              onChange={(e) => setInputs((p) => ({ ...p, financeCash: e.target.value }))}
            />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kredi Kartı</label>
            <input
              className="form-input"
              type="number"
                      placeholder="0"
              value={inputs.financeCard}
              onChange={(e) => setInputs((p) => ({ ...p, financeCard: e.target.value }))}
            />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Çek</label>
            <input
              className="form-input"
              type="number"
                      placeholder="0"
              value={inputs.financeCheque}
              onChange={(e) => setInputs((p) => ({ ...p, financeCheque: e.target.value }))}
            />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Toplam Alınan</label>
                    <div className="form-input" style={{ background: '#f9fafb', display: 'flex', alignItems: 'center' }}>
                      {formatNumber(
                        Number(inputs.financeCash || 0) +
                        Number(inputs.financeCard || 0) +
                        Number(inputs.financeCheque || 0)
                      )} ₺
                    </div>
                  </div>
                </div>

                {/* Bakiye Kontrolü */}
                {(() => {
                  const preReceived =
                    Number(job.approval?.paymentPlan?.cash || 0) +
                    Number(job.approval?.paymentPlan?.card || 0) +
                    Number(job.approval?.paymentPlan?.cheque || 0);
                  const finishReceived =
                    Number(inputs.financeCash || 0) +
                    Number(inputs.financeCard || 0) +
                    Number(inputs.financeCheque || 0);
                  const discount = Number(inputs.discountAmount || 0);
                  const total = preReceived + finishReceived + discount;
                  const diff = offerTotalValue - total;
                  
                  return (
                    <div style={{ marginTop: 12, padding: 12, background: diff === 0 ? '#ecfdf5' : '#fef2f2', borderRadius: 8 }}>
                      <div className="metric-row">
                        <span className="metric-label">Ön Alınan</span>
                        <span>{formatNumber(preReceived)} ₺</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Şimdi Alınan</span>
                        <span>{formatNumber(finishReceived)} ₺</span>
                      </div>
                      {discount > 0 && (
                        <div className="metric-row">
                          <span className="metric-label">İskonto</span>
                          <span>{formatNumber(discount)} ₺</span>
                        </div>
                      )}
                      <hr style={{ margin: '8px 0', borderColor: 'rgba(0,0,0,0.1)' }} />
                      <div className="metric-row">
                        <span className="metric-label" style={{ fontWeight: 700 }}>Toplam</span>
                        <span style={{ fontWeight: 700 }}>{formatNumber(total)} ₺</span>
                      </div>
                      <div className="metric-row" style={{ color: diff === 0 ? '#059669' : '#dc2626' }}>
                        <span className="metric-label">Bakiye Farkı</span>
                        <span style={{ fontWeight: 700 }}>{diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)} ₺</span>
                      </div>
                      {diff !== 0 && (
                        <div className="badge badge-danger" style={{ marginTop: 8 }}>
                          {diff > 0 ? 'Eksik tahsilat!' : 'Fazla tahsilat!'}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* İskonto */}
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">İskonto Tutarı (opsiyonel)</label>
            <input
              className="form-input"
              type="number"
                  placeholder="0"
              value={inputs.discountAmount}
              onChange={(e) => setInputs((p) => ({ ...p, discountAmount: e.target.value }))}
            />
              </div>
              <div className="form-group">
                <label className="form-label">İskonto Notu</label>
            <input
              className="form-input"
                  placeholder="İskonto sebebi"
              value={inputs.discountNote}
              onChange={(e) => setInputs((p) => ({ ...p, discountNote: e.target.value }))}
            />
              </div>
            </div>

            <button
              className="btn btn-success"
              type="button"
              disabled={actionLoading}
              onClick={() =>
                act(() =>
                  closeFinance(job.id, {
                    total: Number(inputs.financeTotal || offerTotalValue),
                    payments: {
                      cash: Number(inputs.financeCash || 0),
                      card: Number(inputs.financeCard || 0),
                      cheque: Number(inputs.financeCheque || 0),
                    },
                    discount:
                      Number(inputs.discountAmount || 0) > 0
                        ? { amount: Number(inputs.discountAmount || 0), note: inputs.discountNote || '' }
                        : null,
                  })
                )
              }
            >
              İşi Kapat (Bakiye 0 olmalı)
            </button>
          </div>
        </div>
      )}

      {status === 'KAPALI' && (
        <div className="card subtle-card">
          <div className="metric-row">
            <span className="metric-label">Durum</span>
            <span className="metric-value">KAPALI</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Not</span>
            <span className="metric-value">Kilitli - değişiklik için yetkili gerekir</span>
          </div>
        </div>
      )}

      {logs.length > 0 ? (
        <div className="card subtle-card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <h3 className="card-title">İş Günlüğü</h3>
            <button className="btn btn-secondary btn-small" type="button" onClick={() => setShowLogs((v) => !v)}>
              {showLogs ? 'Gizle' : 'Göster'}
            </button>
          </div>
          {showLogs ? (
            <div className="timeline">
              {logs.map((log) => (
                <div key={log.id} className="timeline-item">
                  <div className="timeline-point" />
                  <div>
                    <div className="timeline-title">
                      {new Date(log.createdAt).toLocaleString('tr-TR')} · {log.action}
                    </div>
                    <div className="timeline-subtitle">{log.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {logsError ? <div className="error-text">{logsError}</div> : null}
        </div>
      ) : null}

      {actionLoading && (
        <div className="loader-overlay">
          <Loader text="İşlem yapılıyor..." />
        </div>
      )}
    </div>
  );
};

export default JobsList;

