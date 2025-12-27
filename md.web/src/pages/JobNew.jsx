import { useState } from 'react';
import PageHeader from '../components/PageHeader';

const defaultForm = {
  name: '',
  customer: '',
  owner: '',
  dueDate: '',
  budget: '',
  notes: '',
};

const JobNew = () => {
  const [form, setForm] = useState(defaultForm);
  const [createdJob, setCreatedJob] = useState(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setCreatedJob({
      ...form,
      id: `JOB-${Math.floor(Math.random() * 9000) + 1000}`,
      status: 'Keşif',
    });
    setForm(defaultForm);
  };

  return (
    <div>
      <PageHeader
        title="Yeni İş Başlat"
        subtitle="Keşif, üretim ve montaj sürecini başlatmak için iş açın"
      />

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            İş Adı
          </label>
          <input
            id="name"
            className="form-input"
            placeholder="Örn: Ofis Mobilyası Projesi"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="customer">
            Müşteri
          </label>
          <input
            id="customer"
            className="form-input"
            placeholder="Müşteri adı"
            value={form.customer}
            onChange={(event) => updateField('customer', event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="owner">
            Sorumlu Kişi
          </label>
          <input
            id="owner"
            className="form-input"
            placeholder="İşi yönetecek kişi"
            value={form.owner}
            onChange={(event) => updateField('owner', event.target.value)}
            required
          />
        </div>

        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="dueDate">
              Termin Tarihi
            </label>
            <input
              id="dueDate"
              className="form-input"
              type="date"
              value={form.dueDate}
              onChange={(event) => updateField('dueDate', event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="budget">
              Bütçe
            </label>
            <input
              id="budget"
              className="form-input"
              type="text"
              placeholder="₺"
              value={form.budget}
              onChange={(event) => updateField('budget', event.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="notes">
            Notlar
          </label>
          <textarea
            id="notes"
            className="form-textarea"
            placeholder="Keşif detayları, ölçüler, özel istekler..."
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
          />
        </div>

        <div className="page-actions" style={{ marginTop: 8 }}>
          <button className="btn btn-secondary" type="button" onClick={() => setForm(defaultForm)}>
            Temizle
          </button>
          <button className="btn btn-primary" type="submit">
            Kaydet ve Başlat
          </button>
        </div>
      </form>

      {createdJob ? (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3 className="card-title">İş oluşturuldu</h3>
            <span className="badge badge-primary">{createdJob.id}</span>
          </div>
          <div className="card-body">
            <div className="metric-list">
              <div className="metric-row">
                <span className="metric-label">İş Adı</span>
                <span className="metric-value">{createdJob.name}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Müşteri</span>
                <span className="metric-value">{createdJob.customer}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Sorumlu</span>
                <span className="metric-value">{createdJob.owner}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Termin</span>
                <span className="metric-value">{createdJob.dueDate || 'Belirtilmedi'}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Bütçe</span>
                <span className="metric-value">{createdJob.budget || 'Belirtilmedi'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default JobNew;

