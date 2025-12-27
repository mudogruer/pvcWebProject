import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { getDashboardData } from '../services/dataService';

const Dashboard = () => {
  const [dashboard, setDashboard] = useState({
    stats: [],
    activities: [],
    priorityJobs: [],
    weekOverview: [],
    paymentStatus: {},
    teamStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const payload = await getDashboardData();
        setDashboard(payload);
      } catch (err) {
        setError(err.message || 'Bilinmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div>
      <PageHeader title="Kontrol Paneli" subtitle="İş süreçlerinizin genel durumunu görüntüleyin" />

      {loading ? (
        <div className="card subtle-card">Veriler yükleniyor...</div>
      ) : error ? (
        <div className="card error-card">
          <div className="error-title">Veri alınamadı</div>
          <div className="error-message">{error}</div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {dashboard.stats.map((stat) => (
              <StatCard
                key={stat.id}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                change={stat.change}
                trend={stat.trend}
                tone={stat.tone}
              />
            ))}
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Son Aktiviteler</h3>
                <button className="btn btn-secondary btn-icon" type="button">
                  ⋯
                </button>
              </div>
              <div className="card-body">
                <DataTable
                  columns={[
                    { label: 'İşlem', accessor: 'action' },
                    { label: 'Kullanıcı', accessor: 'user' },
                    { label: 'Tarih', accessor: 'time' },
                  ]}
                  rows={dashboard.activities}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Öncelikli İşler</h3>
                <button className="btn btn-secondary" type="button">
                  Tümünü Gör
                </button>
              </div>
              <div className="card-body">
                <DataTable
                  columns={[
                    { label: 'İş Adı', accessor: 'name' },
                    {
                      label: 'Durum',
                      accessor: 'status',
                      render: (_value, row) => renderBadge(row.status, row.badge),
                    },
                    { label: 'Termin', accessor: 'dueDate' },
                  ]}
                  rows={dashboard.priorityJobs}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginTop: 24 }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Bu Hafta</h3>
              </div>
              <div className="card-body">
                <div className="metric-list">
                  {dashboard.weekOverview.map((item) => (
                    <div className="metric-row" key={item.label}>
                      <span className="metric-label">{item.label}</span>
                      <span className="metric-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Ödeme Durumu</h3>
              </div>
              <div className="card-body">
                <div className="metric-list">
                  <div className="metric-row">
                    <span className="metric-label">Bekleyen</span>
                    <span className="metric-value warning">{dashboard.paymentStatus.pending}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Bu Ay Tahsilat</span>
                    <span className="metric-value success">{dashboard.paymentStatus.collected}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Bu Ay Ödeme</span>
                    <span className="metric-value danger">{dashboard.paymentStatus.paid}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Ekip Durumu</h3>
              </div>
              <div className="card-body">
                <div className="metric-list">
                  <div className="metric-row">
                    <span className="metric-label">Atölye</span>
                    <span className="metric-value">{dashboard.teamStatus.workshop} kişi</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Montaj</span>
                    <span className="metric-value">{dashboard.teamStatus.assembly} kişi</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Ofis</span>
                    <span className="metric-value">{dashboard.teamStatus.office} kişi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const renderBadge = (text, type = 'secondary') => (
  <span className={`badge badge-${type}`}>{text}</span>
);

export default Dashboard;

