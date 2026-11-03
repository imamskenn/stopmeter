import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './lib/api';

const initialOutlets = [
  { id: 'OUT-001', name: 'Outlet Utama', city: 'Petaling Jaya', status: 'Aktif', admins: 2, staff: 8 },
  { id: 'OUT-002', name: 'Outlet Selatan', city: 'Shah Alam', status: 'Aktif', admins: 1, staff: 5 },
  { id: 'OUT-003', name: 'Outlet Timur', city: 'Klang', status: 'Nonaktif', admins: 1, staff: 3 },
];
const initialAdmins = [
  { name: 'Admin Utama', username: 'admin.utama', outlet: 'Outlet Utama', status: 'Aktif' },
  { name: 'Admin Selatan', username: 'admin.selatan', outlet: 'Outlet Selatan', status: 'Aktif' },
];

const nav = [
  ['overview', 'Ringkasan', '▦'],
  ['outlets', 'Manajemen Outlet', '⌂'],
  ['admins', 'Manajemen Admin', '♙'],
  ['roles', 'Hak Akses', '◇'],
  ['settings', 'Pengaturan Sistem', '⚙'],
  ['audit', 'Audit Log', '≡'],
];

function Dashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [outletsLoading, setOutletsLoading] = useState(true);


  useEffect(() => {
    apiRequest('/super-admin/outlets')
      .then(response => {
        const rows = (response.data || []).map(outlet => ({
          id: outlet.id,
          name: outlet.name,
          city: outlet.address || '-',
          status: outlet.is_active ? 'Aktif' : 'Nonaktif',
          admins: 0,
          staff: 0,
          code: outlet.code,
        }));
        setOutlets(rows);
      })
      .catch(error => console.error('Outlet API:', error.message))
      .finally(() => setOutletsLoading(false));
  }, []);



  useEffect(() => {
    apiRequest('/super-admin/dashboard')
      .then(response => setDashboardData(response.data))
      .catch(error => console.error('Dashboard API:', error.message))
      .finally(() => setDashboardLoading(false));
  }, []);

  const [page, setPage] = useState('overview');
  const [outlets, setOutlets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminForm, setAdminForm] = useState({
    name: '', email: '', password: '', outlet_ids: [],
  });
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [newOutlet, setNewOutlet] = useState({ name: '', code: '', city: '' });
  const [notice, setNotice] = useState('Mode demo — data belum tersambung ke server.');
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    apiRequest('/super-admin/admins')
      .then(response => setAdmins(response.data || []))
      .catch(error => setNotice(`Gagal memuat Admin: ${error.message}`))
      .finally(() => setAdminsLoading(false));
  }, []);

  useEffect(() => {
    if (page !== 'audit') return;

    setActivityLoading(true);
    apiRequest('/super-admin/activities')
      .then(response => setActivityData(response.data))
      .catch(error => setNotice(`Gagal memuat Audit Log: ${error.message}`))
      .finally(() => setActivityLoading(false));
  }, [page]); 

  const filtered = useMemo(() => outlets.filter(o =>
    `${o.name} ${o.city} ${o.id}`.toLowerCase().includes(query.toLowerCase())
  ), [outlets, query]);

  async function addOutlet(e) {
    e.preventDefault();

    if (!newOutlet.name.trim() || !newOutlet.code.trim()) return;

    try {
      const response = await apiRequest('/super-admin/outlets', {
        method: 'POST',
        body: JSON.stringify({
          name: newOutlet.name.trim(),
          code: newOutlet.code.trim(),
          address: newOutlet.city.trim() || null,
        }),
      });

      const outlet = response.data;

      setOutlets(current => [...current, {
        id: outlet.id,
        name: outlet.name,
        city: outlet.address || '-',
        status: outlet.is_active ? 'Aktif' : 'Nonaktif',
        admins: 0,
        staff: 0,
        code: outlet.code,
      }]);

      setNewOutlet({ name: '', code: '', city: '' });
      setShowAdd(false);
      setNotice(response.message || 'Outlet berhasil disimpan.');
    } catch (error) {
      setNotice(`Gagal menambahkan outlet: ${error.message}`);
    }
  }

  async function updateOutlet(e) {
    e.preventDefault();
    if (!editingOutlet) return;

    try {
      const response = await apiRequest(`/super-admin/outlets/${editingOutlet.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingOutlet.name.trim(),
          code: editingOutlet.code.trim(),
          address: editingOutlet.city.trim() || null,
        }),
      });

      const outlet = response.data;
      setOutlets(current => current.map(o => o.id === outlet.id ? {
        ...o,
        name: outlet.name,
        code: outlet.code,
        city: outlet.address || '-',
        status: outlet.is_active ? 'Aktif' : 'Nonaktif',
      } : o));

      setEditingOutlet(null);
      setNotice(response.message || 'Outlet berhasil diperbarui.');
    } catch (error) {
      setNotice(`Gagal memperbarui outlet: ${error.message}`);
    }
  }

  async function toggleOutlet(o) {
    const activate = o.status !== 'Aktif';

    try {
      const response = await apiRequest(`/super-admin/outlets/${o.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: activate }),
      });

      const outlet = response.data;
      setOutlets(current => current.map(item => item.id === outlet.id ? {
        ...item,
        status: outlet.is_active ? 'Aktif' : 'Nonaktif',
      } : item));

      setNotice(response.message || `Outlet berhasil ${activate ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (error) {
      setNotice(`Gagal mengubah status outlet: ${error.message}`);
    }
  }

  function openAdminForm(admin = null) {
    setEditingAdmin(admin);
    setAdminForm(admin ? {
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      outlet_ids: admin.outlet_ids || [],
    } : {
      name: '', email: '', password: '', outlet_ids: [],
    });
    setShowAdminModal(true);
  }

  async function saveAdmin(e) {
    e.preventDefault();

    if (!adminForm.outlet_ids.length) {
      setNotice('Pilih minimal satu outlet aktif.');
      return;
    }

    const payload = {
      name: adminForm.name.trim(),
      email: adminForm.email.trim(),
      outlet_ids: adminForm.outlet_ids,
    };

    if (!editingAdmin || adminForm.password.trim()) {
      payload.password = adminForm.password;
    }

    try {
      const response = await apiRequest(
        editingAdmin
          ? `/super-admin/admins/${editingAdmin.id}`
          : '/super-admin/admins',
        {
          method: editingAdmin ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );

      const admin = response.data;

      if (editingAdmin) {
        setAdmins(current => current.map(a => a.id === admin.id ? admin : a));
      } else {
        setAdmins(current => [...current, admin]);
      }

      setShowAdminModal(false);
      setEditingAdmin(null);
      setNotice(response.message || 'Data Admin berhasil disimpan.');
    } catch (error) {
      setNotice(`Gagal menyimpan Admin: ${error.message}`);
    }
  }

  async function toggleAdmin(admin) {
    const activate = admin.is_active === false;

    try {
      const response = await apiRequest(`/super-admin/admins/${admin.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: activate }),
      });

      setAdmins(current => current.map(a =>
        a.id === admin.id ? response.data : a
      ));

      setNotice(response.message || `Admin berhasil ${activate ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (error) {
      setNotice(`Gagal mengubah status Admin: ${error.message}`);
    }
  }

  const title = nav.find(n => n[0] === page)?.[1] || 'Ringkasan';

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><b>STOPMETER</b><small>CONTROL CENTER</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(([id, label, icon]) =>
        <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
          <span className="nav-icon">{icon}</span>{label}
        </button>
      )}</nav>
      <div className="sidebar-bottom"><div className="avatar">D</div><div><b>{user?.name || 'Super Admin'}</b><small>Super Admin</small></div><span className="online-dot" /></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">STOPMETER / SUPER ADMIN</div><h1>{title}</h1></div>
        <div className="top-actions"><span className="system-status"><i /> Terhubung</span><button className="profile">{(user?.name || "S").charAt(0).toUpperCase()}</button><button className="secondary" onClick={onLogout}>Keluar</button></div>
      </header>

      <div className="content">
        <div className="notice"><span>ⓘ</span>{notice}</div>
        {page === 'overview' && (
          dashboardLoading
            ? <div className="panel">Memuat data dashboard...</div>
            : <Overview
                outlets={outlets}
                admins={admins}
                setPage={setPage}
                stats={dashboardData}
              />
        )}
        {page === 'outlets' && <section className="panel">
          <div className="panel-head"><div><h2>Semua outlet</h2><p>Kelola lokasi operasional dalam satu sistem.</p></div><button className="primary" onClick={() => setShowAdd(true)}>＋ Tambah outlet</button></div>
          <div className="toolbar"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, kota, atau ID outlet..." /><span>{outletsLoading ? "Memuat..." : `${filtered.length} outlet`}</span></div>
          {outletsLoading ? <div className="empty">Memuat daftar outlet...</div> : <OutletTable
            outlets={filtered}
            onEdit={o => setEditingOutlet({ ...o, city: o.city === '-' ? '' : o.city })}
            onToggle={toggleOutlet}
          />}
        </section>}
        {page === 'admins' && <section className="panel">
          <div className="panel-head">
            <div><h2>Manajemen Admin (Inchas)</h2><p>Kelola akun dan penugasan outlet.</p></div>
            <button className="primary" onClick={() => openAdminForm()}>＋ Buat akun Admin</button>
          </div>
          {adminsLoading ? <div className="empty">Memuat daftar Admin...</div> :
          <div className="table-wrap"><table>
            <thead><tr><th>NAMA</th><th>EMAIL</th><th>OUTLET</th><th>STATUS</th><th>AKSI</th></tr></thead>
            <tbody>{admins.map(a => {
              const assigned = (a.outlet_ids || []).map(id =>
                outlets.find(o => o.id === id)?.name || 'Outlet tidak ditemukan'
              );
              return <tr key={a.id}>
                <td><b>{a.name}</b></td>
                <td>{a.email}</td>
                <td>{assigned.join(', ') || '-'}</td>
                <td><span className={`status ${a.is_active === false ? 'inactive' : 'active'}`}>
                  {a.is_active === false ? 'Nonaktif' : 'Aktif'}
                </span></td>
                <td>
                  <button className="secondary" onClick={() => openAdminForm(a)}>Edit</button>{' '}
                  <button className="secondary" onClick={() => toggleAdmin(a)}>
                    {a.is_active === false ? 'Aktifkan' : 'Nonaktifkan'}
                  </button>
                </td>
              </tr>;
            })}</tbody>
          </table>
          {!admins.length && <div className="empty">Belum ada akun Admin.</div>}
          </div>}
        </section>}
        {page === 'roles' && <section className="panel"><div className="panel-head"><div><h2>Struktur hak akses</h2><p>Pemisahan kewenangan setiap peran.</p></div></div><div className="role-grid"><Role name="Super Admin (DEV)" desc="Kontrol global seluruh outlet, pengguna, konfigurasi, laporan, dan audit." level="Akses penuh" /><Role name="Admin (Inchas)" desc="Mengelola karyawan dan operasional outlet yang ditugaskan." level="Terbatas per outlet" /><Role name="Karyawan" desc="Menginput dan mengeksekusi Stopmeter sesuai penugasan." level="Operasional" /></div></section>}
        {page === 'settings' && <section className="panel"><div className="panel-head"><div><h2>Pengaturan sistem</h2><p>Konfigurasi global Stopmeter.</p></div></div><div className="setting-row"><div><b>Mata uang</b><small>Mata uang utama transaksi</small></div><strong>MYR (Ringgit Malaysia)</strong></div><div className="setting-row"><div><b>Pergantian limit</b><small>Limit akhir menjadi limit awal shift berikutnya per outlet</small></div><span className="status active">Direncanakan aktif</span></div><div className="setting-row"><div><b>Realtime</b><small>Pembaruan aktivitas antar pengguna</small></div><span className="status pending">Menunggu backend</span></div></section>}
        {page === 'audit' && <section className="panel">
          <div className="panel-head">
            <div><h2>Audit Log</h2><p>Riwayat aktivitas dan perubahan sistem.</p></div>
            <button className="secondary" onClick={() => setPage('audit')}>Muat ulang</button>
          </div>

          {activityLoading ? <div className="empty">Memuat aktivitas...</div> : <>
            <div className="stats" style={{gridTemplateColumns:'repeat(2, minmax(0, 1fr))'}}>
              <Stat label="TOTAL AKTIVITAS" value={activityData?.total ?? 0} meta="Seluruh riwayat tercatat" icon="≡" />
              <Stat label="AKTIVITAS HARI INI" value={activityData?.today ?? 0} meta="Berdasarkan tanggal server" icon="◷" />
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>WAKTU</th><th>PELAKU</th><th>PERAN</th><th>AKTIVITAS</th><th>DESKRIPSI</th>
                </tr></thead>
                <tbody>
                  {(activityData?.recent || []).map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-'}</td>
                      <td><b>{item.actor_name || 'System'}</b></td>
                      <td>{item.actor_role || '-'}</td>
                      <td><span className="status pending">{item.action || '-'}</span></td>
                      <td>{item.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!activityData?.recent?.length &&
                <div className="empty">Belum ada aktivitas yang tercatat.</div>}
            </div>
          </>}
        </section>}
      </div>
    </main>

    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={addOutlet} onClick={e => e.stopPropagation()}><div className="modal-head"><div><h2>Tambah outlet</h2><p>Outlet baru akan masuk ke daftar pengelolaan.</p></div><button type="button" className="close" onClick={() => setShowAdd(false)}>×</button></div><label>Nama outlet<input autoFocus value={newOutlet.name} onChange={e => setNewOutlet({ ...newOutlet, name: e.target.value })} placeholder="Contoh: Outlet Utara" required /></label><label>Kode outlet<input value={newOutlet.code} onChange={e => setNewOutlet({ ...newOutlet, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="Contoh: KL-001" required /></label><label>Alamat / lokasi<input value={newOutlet.city} onChange={e => setNewOutlet({ ...newOutlet, city: e.target.value })} placeholder="Alamat outlet (opsional)" /></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowAdd(false)}>Batal</button><button className="primary">Simpan outlet</button></div></form></div>}

    {showAdminModal && <div className="modal-backdrop" onClick={() => setShowAdminModal(false)}>
      <form className="modal" onSubmit={saveAdmin} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{editingAdmin ? 'Edit akun Admin' : 'Buat akun Admin'}</h2>
            <p>Atur identitas dan outlet yang dikelola.</p>
          </div>
          <button type="button" className="close" onClick={() => setShowAdminModal(false)}>×</button>
        </div>

        <label>Nama lengkap
          <input value={adminForm.name}
            onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
            required />
        </label>

        <label>Email
          <input type="email" value={adminForm.email}
            onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
            required />
        </label>

        <label>Password {editingAdmin ? '(kosongkan jika tidak diubah)' : '(minimal 10 karakter)'}
          <input type="password" value={adminForm.password}
            onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
            minLength={10} required={!editingAdmin}
            autoComplete="new-password" />
        </label>

        <label>Penugasan outlet</label>
        <div style={{display:'grid', gap:'10px', maxHeight:'150px', overflowY:'auto', padding:'8px 2px'}}>
          {outlets.filter(o => o.status === 'Aktif').map(o => (
            <label key={o.id} style={{display:'flex', alignItems:'center', gap:'9px', margin:0}}>
              <input type="checkbox" style={{width:'auto', margin:0}}
                checked={adminForm.outlet_ids.includes(o.id)}
                onChange={e => setAdminForm({
                  ...adminForm,
                  outlet_ids: e.target.checked
                    ? [...adminForm.outlet_ids, o.id]
                    : adminForm.outlet_ids.filter(id => id !== o.id)
                })} />
              {o.name} ({o.code || o.id})
            </label>
          ))}
          {!outlets.some(o => o.status === 'Aktif') &&
            <span>Tidak ada outlet aktif.</span>}
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={() => setShowAdminModal(false)}>Batal</button>
          <button className="primary">{editingAdmin ? 'Simpan perubahan' : 'Buat Admin'}</button>
        </div>
      </form>
    </div>}

    {editingOutlet && <div className="modal-backdrop" onClick={() => setEditingOutlet(null)}>
      <form className="modal" onSubmit={updateOutlet} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2>Edit outlet</h2><p>Perbarui informasi outlet.</p></div>
          <button type="button" className="close" onClick={() => setEditingOutlet(null)}>×</button>
        </div>
        <label>Nama outlet<input value={editingOutlet.name} onChange={e => setEditingOutlet({ ...editingOutlet, name: e.target.value })} required /></label>
        <label>Kode outlet<input value={editingOutlet.code || ''} onChange={e => setEditingOutlet({ ...editingOutlet, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} required /></label>
        <label>Alamat / lokasi<input value={editingOutlet.city} onChange={e => setEditingOutlet({ ...editingOutlet, city: e.target.value })} /></label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={() => setEditingOutlet(null)}>Batal</button>
          <button className="primary">Simpan perubahan</button>
        </div>
      </form>
    </div>}
  </div>;
}

function Overview({ outlets, admins, setPage, stats }) {
  const active = outlets.filter(o => o.status === 'Aktif').length;
  return <>
    <div className="welcome"><div><span className="welcome-tag">SYSTEM OVERVIEW</span><h2>Kontrol seluruh operasional.</h2><p>Pantau outlet, pengelola, dan kesiapan sistem Stopmeter dari satu tempat.</p></div><div className="welcome-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="core">S</div></div></div>
    <div className="stats">
      <Stat label="TOTAL OUTLET" value={stats?.outlets?.total ?? 0} meta={`${stats?.outlets?.active ?? 0} outlet aktif`} icon="⌂" />
      <Stat label="ADMIN INCHAS" value={stats?.admins?.total ?? 0} meta={`${stats?.admins?.active ?? 0} akun aktif`} icon="♙" />
      <Stat label="KARYAWAN" value={stats?.employees?.total ?? 0} meta={`${stats?.employees?.active ?? 0} karyawan aktif`} icon="♧" />
      <Stat label="STATUS SISTEM" value="Online" meta="API terhubung" icon="◉" />
    </div>
    <div className="lower-grid">
      <section className="panel"><div className="panel-head"><div><h2>Outlet terbaru</h2><p>Daftar outlet yang dikelola.</p></div><button className="text-button" onClick={() => setPage('outlets')}>Lihat semua →</button></div><OutletTable outlets={outlets.slice(0, 4)} compact /></section>
      <section className="panel"><div className="panel-head"><div><h2>Akses sistem</h2><p>Struktur peran pengguna.</p></div></div><div className="access-list"><div><span className="access-icon purple">D</span><div><b>Super Admin</b><small>Kontrol seluruh sistem</small></div><strong>Full</strong></div><div><span className="access-icon blue">A</span><div><b>Admin (Inchas)</b><small>Kelola outlet & karyawan</small></div><strong>Outlet</strong></div><div><span className="access-icon amber">K</span><div><b>Karyawan</b><small>Input Stopmeter</small></div><strong>Terbatas</strong></div></div></section>
    </div>
  </>;
}
function Stat({ label, value, meta, icon }) { return <div className="stat"><div className="stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{meta}</small></div>; }
function OutletTable({ outlets, compact, onEdit, onToggle }) {
  return <div className="table-wrap">
    <table>
      <thead><tr>
        <th>OUTLET</th><th>LOKASI</th><th>ADMIN</th><th>KARYAWAN</th><th>STATUS</th>
        {!compact && <th>AKSI</th>}
      </tr></thead>
      <tbody>{outlets.map(o => <tr key={o.id}>
        <td><b>{o.name}</b><small className="subcell">{o.code || o.id}</small></td>
        <td>{o.city}</td><td>{o.admins}</td><td>{o.staff}</td>
        <td><span className={`status ${o.status === 'Aktif' ? 'active' : 'inactive'}`}>{o.status}</span></td>
        {!compact && <td>
          <button type="button" className="secondary" onClick={() => onEdit(o)}>Edit</button>{' '}
          <button type="button" className="secondary" onClick={() => onToggle(o)}>
            {o.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </td>}
      </tr>)}</tbody>
    </table>
    {!outlets.length && <div className="empty">Outlet tidak ditemukan.</div>}
  </div>;
}
function Role({ name, desc, level }) { return <div className="role-card"><div className="role-symbol">◇</div><h3>{name}</h3><p>{desc}</p><span>{level}</span></div>; }



function AdminDashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/admin/dashboard')
      .then(response => setData(response.data))
      .catch(err => setError(err.message || 'Gagal memuat dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 30 }}>Memuat Admin Dashboard...</div>;

  if (error) return (
    <div style={{ padding: 30 }}>
      <h2>Admin Dashboard</h2>
      <p style={{ color: '#dc2626' }}>{error}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );

  const stats = [
    ['Total Outlet', data?.outlets?.total ?? 0],
    ['Outlet Aktif', data?.outlets?.active ?? 0],
    ['Total Employee', data?.employees?.total ?? 0],
    ['Employee Aktif', data?.employees?.active ?? 0],
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#f5f6fa', padding: 24, boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>STOPMETER</h1>
          <p style={{ color: '#777' }}>Admin Control Center</p>
          <strong>{user.name}</strong>
        </div>
        <button onClick={onLogout} style={{ padding: '10px 18px', border: 0, borderRadius: 8, background: '#dc2626', color: 'white' }}>
          Logout
        </button>
      </header>

      <h2>Ringkasan</h2>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        {stats.map(([label, value]) => (
          <article key={label} style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px #00000008' }}>
            <p style={{ color: '#777', margin: 0 }}>{label}</p>
            <strong style={{ fontSize: 30 }}>{value}</strong>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 28, background: 'white', padding: 20, borderRadius: 12 }}>
        <h2>Outlet Saya</h2>
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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('stopmeter_token');

    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest('/user')
      .then(response => {
        const account = response.user || response.data?.user || response.data;

        if (!['super_admin', 'admin'].includes(account?.role)) {
          throw new Error('Role akun belum memiliki akses frontend.');
        }

        setUser(account);
      })
      .catch(() => {
        localStorage.removeItem('stopmeter_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const token = response.token;
      const account = response.user;

      if (!token || !account) {
        throw new Error('Format respons login tidak sesuai.');
      }

      if (!['super_admin', 'admin'].includes(account.role)) {
        throw new Error('Role akun belum memiliki akses frontend.');
      }

      localStorage.setItem('stopmeter_token', token);
      setUser(account);
      setPassword('');
    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest('/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout API:', err.message);
    } finally {
      localStorage.removeItem('stopmeter_token');
      setUser(null);
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      Memeriksa sesi...
    </div>;
  }

  if (!user) {
    return <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      background: '#f5f6fa', padding: 20
    }}>
      <form onSubmit={handleLogin} style={{
        width: '100%', maxWidth: 400, boxSizing: 'border-box',
        padding: 30, background: '#fff', borderRadius: 16,
        boxShadow: '0 10px 40px #00000012'
      }}>
        <h2 style={{ marginTop: 0 }}>STOPMETER</h2>
        <p style={{ color: '#777', marginBottom: 25 }}>Control Center</p>

        <label style={{ display: 'block', marginBottom: 15 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email akun"
            required
            autoComplete="username"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 7 }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 20 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 7 }}
          />
        </label>

        {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: 13, border: 0, borderRadius: 8,
            background: '#6546d7', color: '#fff', fontWeight: 600,
            opacity: submitting ? 0.6 : 1
          }}
        >
          {submitting ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>;
  }

  if (user.role === 'super_admin') {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return <AdminDashboard user={user} onLogout={handleLogout} />;
}

export default App;

