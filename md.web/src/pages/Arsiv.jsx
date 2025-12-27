import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import { getArchiveFiles } from '../services/dataService';

const Arsiv = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const payload = await getArchiveFiles();
        setRows(payload);
      } catch (err) {
        setError(err.message || 'Arşiv alınamadı');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div>
      <PageHeader title="Dijital Arşiv" subtitle="Teklif, sözleşme ve üretim dokümanları" />

      {loading ? (
        <div className="card subtle-card">Arşiv yükleniyor...</div>
      ) : error ? (
        <div className="card error-card">
          <div className="error-title">Arşiv alınamadı</div>
          <div className="error-message">{error}</div>
        </div>
      ) : (
        <DataTable
          columns={[
            { label: 'Dosya', accessor: 'name' },
            { label: 'Kategori', accessor: 'category' },
            { label: 'Tarih', accessor: 'date' },
            { label: 'Sahip', accessor: 'owner' },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
};

export default Arsiv;

