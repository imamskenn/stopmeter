from pathlib import Path

p = Path("src/App.jsx")
s = p.read_text()

start = s.index("function AdminDashboard(")
end = s.index("\nfunction App()", start)

new = r'''function AdminDashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [notifications, setNotifications] = useState(2);
  const [showNotifications, setShowNotifications] = useState(false);

  const [activities, setActivities] = useState([
    {
      id: 'DEMO-001',
      employee: 'Employee Demo 1',
      outlet: 'Outlet Demo',
      session: 'Pagi',
      status: 'LIVE',
      sales: 1250,
      time: new Date()
    },
    {
      id: 'DEMO-002',
      employee: 'Employee Demo 2',
      outlet: 'Outlet Demo',
      session: 'Malam',
      status: 'DRAFT',
      sales: 850,
      time: new Date(Date.now() - 60000)
    },
    {
      id: 'DEMO-003',
      employee: 'Employee Demo 3',
      outlet: 'Outlet Demo',
      session: 'Pagi',
      status: 'FINAL',
      sales: 2100,
      time: new Date(Date.now() - 120000)
    }
  ]);

  useEffect(() => {
    apiRequest('/admin/dashboard')
      .then(response => setData(response.data))
      .catch(err => setError(err.message || 'Gagal memuat dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const money = value =>
    new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(value || 0);

  const stats = [
    ['Total Outlet', data?.outlets?.total ?? 0],
    ['Outlet Aktif', data?.outlets?.active ?? 0],
    ['Total Employee', data?.employees?.total ?? 0],
    ['Employee Aktif', data?.employees?.active ?? 0],
  ];

  const card = {
    background: '#fff',
    border: '1px solid #e8eaf0',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 3px 12px #00000006'
  };

  const statusStyle = status => ({
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    background: status === 'LIVE' ? '#dcfce7' :
      status === 'FINAL' ? '#dbeafe' : '#fef3c7',
    color: status === 'LIVE' ? '#15803d' :
      status === 'FINAL' ? '#1d4ed8' : '#92400e'
  });

  if (loading) return <div style={{ padding: 30 }}>Memuat Admin Dashboard...</div>;

  if (error) return (
    <div style={{ padding: 30 }}>
      <h2>Admin Dashboard</h2>
      <p style={{ color: '#dc2626' }}>{error}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f4f6fa',
      padding: 22,
      boxSizing: 'border-box',
      color: '#172033'
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
        marginBottom: 26
      }}>
        <div>
          <h1 style={{ margin: 0, letterSpacing: 1 }}>STOPMETER</h1>
          <p style={{ color: '#7b8495', margin: '5px 0' }}>Admin Control Center</p>
          <strong>{user.name}</strong>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              padding: '11px 15px',
              border: '1px solid #e2e5ec',
              borderRadius: 9,
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Notifikasi
            {notifications > 0 && (
              <span style={{
                marginLeft: 7,
                background: '#dc2626',
                color: '#fff',
                borderRadius: 20,
                padding: '2px 7px',
                fontSize: 11
              }}>{notifications}</span>
            )}
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '11px 17px',
              border: 0,
              borderRadius: 9,
              background: '#dc2626',
              color: '#fff',
              cursor: 'pointer'
            }}
          >Logout</button>
        </div>
      </header>

      {showNotifications && (
        <section style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ marginTop: 0 }}>Notifikasi</h3>
            <button onClick={() => setNotifications(0)}>Tandai dibaca</button>
          </div>
          <p>Stopmeter baru dibuat oleh Employee Demo 1.</p>
          <p>Stopmeter DEMO-003 telah difinalisasi.</p>
          <small style={{ color: '#8991a0' }}>Notifikasi simulasi frontend.</small>
        </section>
      )}

      <section style={{
        ...card,
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#16a34a',
              display: 'inline-block'
            }} />
            <strong style={{ color: '#15803d' }}>LIVE MONITORING</strong>
            <span style={{
              background: '#fff3cd',
              color: '#946200',
              padding: '4px 8px',
              borderRadius: 5,
              fontSize: 10,
              fontWeight: 800
            }}>DEMO</span>
          </div>
          <p style={{ color: '#7b8495', margin: '7px 0 0', fontSize: 13 }}>
            Simulasi pembaruan otomatis setiap 5 detik
          </p>
        </div>
        <div style={{ fontSize: 12, color: '#7b8495' }}>
          Pembaruan terakhir: {lastUpdate.toLocaleTimeString('ms-MY')}
        </div>
      </section>

      <h2>Ringkasan</h2>
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
        gap: 13
      }}>
        {stats.map(([label, value]) => (
          <article key={label} style={card}>
            <p style={{ color: '#7b8495', margin: 0, fontSize: 13 }}>{label}</p>
            <strong style={{ fontSize: 29 }}>{value}</strong>
          </article>
        ))}
      </section>

      <section style={{ ...card, marginTop: 25 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div>
            <h2 style={{ margin: 0 }}>Aktivitas Stopmeter</h2>
            <p style={{ color: '#8991a0', fontSize: 13 }}>
              Monitoring aktivitas Employee
            </p>
          </div>
          <span style={{ fontSize: 12, color: '#8991a0' }}>
            {activities.length} aktivitas
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            minWidth: 650
          }}>
            <thead>
              <tr style={{ color: '#8991a0', fontSize: 12 }}>
                {['ID', 'Employee', 'Outlet', 'Sesi', 'Penjualan', 'Status', 'Detail'].map(x => (
                  <th key={x} style={{ padding: 12, borderBottom: '1px solid #eee' }}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f1f4' }}>{item.id}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f1f4' }}>{item.employee}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f1f4' }}>{item.outlet}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f1f4' }}>{item.session}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f1f4' }}>{money(item.sales)}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f1f4' }}>
                    <span style={statusStyle(item.status)}>{item.status}</span>
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f1f4' }}>
                    <button onClick={() => setSelected(item)}>Lihat</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: '#9aa1ad' }}>
          Data di atas hanya contoh. Belum terhubung ke transaksi produksi.
        </p>
      </section>

      {selected && (
        <section style={{ ...card, marginTop: 20, border: '1px solid #b9c9e8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ marginTop: 0 }}>Detail Stopmeter</h2>
            <button onClick={() => setSelected(null)}>Tutup</button>
          </div>
          <p><strong>ID:</strong> {selected.id}</p>
          <p><strong>Employee:</strong> {selected.employee}</p>
          <p><strong>Outlet:</strong> {selected.outlet}</p>
          <p><strong>Sesi:</strong> {selected.session}</p>
          <p><strong>Status:</strong> {selected.status}</p>
          <p><strong>Penjualan:</strong> {money(selected.sales)}</p>
          <p><strong>Waktu:</strong> {selected.time.toLocaleString('ms-MY')}</p>
          <small style={{ color: '#8991a0' }}>Detail ini menggunakan data simulasi.</small>
        </section>
      )}

      <section style={{ ...card, marginTop: 25 }}>
        <h2 style={{ marginTop: 0 }}>Outlet Saya</h2>
        {(data?.outlet_list || []).length === 0 ? (
          <p>Belum ada outlet yang ditugaskan.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: 12 }}>Nama Outlet</th>
                  <th style={{ padding: 12 }}>Kode</th>
                  <th style={{ padding: 12 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.outlet_list.map(outlet => (
                  <tr key={outlet.id}>
                    <td style={{ padding: 12, borderTop: '1px solid #eee' }}>{outlet.name}</td>
                    <td style={{ padding: 12, borderTop: '1px solid #eee' }}>{outlet.code}</td>
                    <td style={{ padding: 12, borderTop: '1px solid #eee' }}>
                      {outlet.is_active ? 'Aktif' : 'Nonaktif'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
'''

s = s[:start] + new + s[end:]
p.write_text(s)
print("Admin Live Monitoring v1 berhasil dipasang.")
