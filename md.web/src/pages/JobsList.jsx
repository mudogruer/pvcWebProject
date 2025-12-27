import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import { getJobs } from '../services/dataService';

const JobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const payload = await getJobs();
        setJobs(payload);
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
        return job.status.toLowerCase().includes(statusFilter);
      })
      .filter((job) => {
        if (!normalizedSearch) return true;
        return (
          job.name.toLowerCase().includes(normalizedSearch) ||
          job.customer.toLowerCase().includes(normalizedSearch) ||
          job.id.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [jobs, search, statusFilter]);

  const columns = [
    { label: 'İş Kodu', accessor: 'id' },
    { label: 'İş Adı', accessor: 'name' },
    { label: 'Müşteri', accessor: 'customer' },
    { label: 'Sorumlu', accessor: 'owner' },
    {
      label: 'Durum',
      accessor: 'status',
      render: (_value, row) => renderStatus(row.status),
    },
    { label: 'Termin', accessor: 'dueDate' },
    { label: 'Bütçe', accessor: 'budget' },
  ];

  return (
    <div>
      <PageHeader
        title="İş Listesi"
        subtitle="Aktif tüm işlerinizi tek ekranda takip edin"
        actions={
          <Link className="btn btn-primary" to="/isler/yeni">
            + Yeni İş Başlat
          </Link>
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
        <div className="card subtle-card">İşler yükleniyor...</div>
      ) : error ? (
        <div className="card error-card">
          <div className="error-title">Liste yüklenemedi</div>
          <div className="error-message">{error}</div>
        </div>
      ) : (
        <DataTable columns={columns} rows={filteredJobs} />
      )}
    </div>
  );
};

const renderStatus = (status) => {
  const label = status || 'Bilinmiyor';
  const normalized = label.toLowerCase();

  let tone = 'secondary';
  if (normalized.includes('keşif')) tone = 'primary';
  if (normalized.includes('üret')) tone = 'warning';
  if (normalized.includes('montaj')) tone = 'success';
  if (normalized.includes('gecik')) tone = 'danger';

  return <span className={`badge badge-${tone}`}>{label}</span>;
};

export default JobsList;

