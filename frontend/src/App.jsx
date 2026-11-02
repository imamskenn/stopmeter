import { useMemo, useState } from 'react';

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

function App() {
  const [page, setPage] = useState('overview');
  const [outlets, setOutlets] = useState(initialOutlets);
  const [admins] = useState(initialAdmins);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newOutlet, setNewOutlet] = useState({ name: '', city: '' });
  const [notice, setNotice] = useState('Mode demo — data belum tersambung ke server.');

  const filtered = useMemo(() => outlets.filter(o =>
    `${o.name} ${o.city} ${o.id}`.toLowerCase().includes(query.toLowerCase())
  ), [outlets, query]);

  function addOutlet(e) {
    e.preventDefault();
    if (!newOutlet.name.trim() || !newOutlet.city.trim()) return;
    const id = `OUT-${String(outlets.length + 1).padStart(3, '0')}`;
    setOutlets([...outlets, { id, ...newOutlet, status: 'Aktif', admins: 0, staff: 0 }]);
    setNewOutlet({ name: '', city: '' });
    setShowAdd(false);
    setNotice('Outlet demo ditambahkan. Data ini belum tersimpan ke database.');
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
      <div className="sidebar-bottom"><div className="avatar">D</div><div><b>Developer</b><small>Super Admin</small></div><span className="online-dot" /></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">STOPMETER / SUPER ADMIN</div><h1>{title}</h1></div>
        <div className="top-actions"><span className="system-status"><i /> Sistem demo</span><button className="profile">D</button></div>
      </header>

      <div className="content">
        <div className="notice"><span>ⓘ</span>{notice}</div>
        {page === 'overview' && <Overview outlets={outlets} admins={admins} setPage={setPage} />}
        {page === 'outlets' && <section className="panel">
          <div className="panel-head"><div><h2>Semua outlet</h2><p>Kelola lokasi operasional dalam satu sistem.</p></div><button className="primary" onClick={() => setShowAdd(true)}>＋ Tambah outlet</button></div>
          <div className="toolbar"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, kota, atau ID outlet..." /><span>{filtered.length} outlet</span></div>
          <OutletTable outlets={filtered} />
        </section>}
        {page === 'admins' && <section className="panel">
          <div className="panel-head"><div><h2>Manajemen Admin (Inchas)</h2><p>Kelola akun pengelola outlet dan penugasannya.</p></div><button className="primary" onClick={() => setNotice('Pembuatan akun Admin akan diaktifkan setelah API dan autentikasi selesai.')}>＋ Buat akun Admin</button></div>
          <div className="table-wrap"><table><thead><tr><th>NAMA</th><th>USERNAME</th><th>OUTLET</th><th>STATUS</th><th></th></tr></thead><tbody>{admins.map(a => <tr key={a.username}><td><b>{a.name}</b></td><td>{a.username}</td><td>{a.outlet}</td><td><span className="status active">{a.status}</span></td><td><button className="more" onClick={() => setNotice('Pengaturan akun akan tersedia setelah backend aktif.')}>•••</button></td></tr>)}</tbody></table></div>
        </section>}
        {page === 'roles' && <section className="panel"><div className="panel-head"><div><h2>Struktur hak akses</h2><p>Pemisahan kewenangan setiap peran.</p></div></div><div className="role-grid"><Role name="Super Admin (DEV)" desc="Kontrol global seluruh outlet, pengguna, konfigurasi, laporan, dan audit." level="Akses penuh" /><Role name="Admin (Inchas)" desc="Mengelola karyawan dan operasional outlet yang ditugaskan." level="Terbatas per outlet" /><Role name="Karyawan" desc="Menginput dan mengeksekusi Stopmeter sesuai penugasan." level="Operasional" /></div></section>}
        {page === 'settings' && <section className="panel"><div className="panel-head"><div><h2>Pengaturan sistem</h2><p>Konfigurasi global Stopmeter.</p></div></div><div className="setting-row"><div><b>Mata uang</b><small>Mata uang utama transaksi</small></div><strong>MYR (Ringgit Malaysia)</strong></div><div className="setting-row"><div><b>Pergantian limit</b><small>Limit akhir menjadi limit awal shift berikutnya per outlet</small></div><span className="status active">Direncanakan aktif</span></div><div className="setting-row"><div><b>Realtime</b><small>Pembaruan aktivitas antar pengguna</small></div><span className="status pending">Menunggu backend</span></div></section>}
        {page === 'audit' && <section className="panel"><div className="panel-head"><div><h2>Audit log</h2><p>Jejak perubahan dan aktivitas pengguna.</p></div></div><div className="empty"><div className="empty-icon">≡</div><b>Audit log belum tersedia</b><span>Log akan tercatat otomatis setelah backend dan autentikasi diaktifkan.</span></div></section>}
      </div>
    </main>

    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={addOutlet} onClick={e => e.stopPropagation()}><div className="modal-head"><div><h2>Tambah outlet</h2><p>Outlet baru akan masuk ke daftar pengelolaan.</p></div><button type="button" className="close" onClick={() => setShowAdd(false)}>×</button></div><label>Nama outlet<input autoFocus value={newOutlet.name} onChange={e => setNewOutlet({ ...newOutlet, name: e.target.value })} placeholder="Contoh: Outlet Utara" required /></label><label>Kota / lokasi<input value={newOutlet.city} onChange={e => setNewOutlet({ ...newOutlet, city: e.target.value })} placeholder="Contoh: Kuala Lumpur" required /></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowAdd(false)}>Batal</button><button className="primary">Simpan outlet demo</button></div></form></div>}
  </div>;
}

function Overview({ outlets, admins, setPage }) {
  const active = outlets.filter(o => o.status === 'Aktif').length;
  return <>
    <div className="welcome"><div><span className="welcome-tag">SYSTEM OVERVIEW</span><h2>Kontrol seluruh operasional.</h2><p>Pantau outlet, pengelola, dan kesiapan sistem Stopmeter dari satu tempat.</p></div><div className="welcome-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="core">S</div></div></div>
    <div className="stats">
      <Stat label="TOTAL OUTLET" value={outlets.length} meta={`${active} outlet aktif`} icon="⌂" />
      <Stat label="ADMIN INCHAS" value={admins.length} meta="Akun pengelola terdaftar" icon="♙" />
      <Stat label="KARYAWAN" value={16} meta="Data demo sementara" icon="♧" />
      <Stat label="STATUS SISTEM" value="Demo" meta="Backend belum terhubung" icon="◉" />
    </div>
    <div className="lower-grid">
      <section className="panel"><div className="panel-head"><div><h2>Outlet terbaru</h2><p>Daftar outlet yang dikelola.</p></div><button className="text-button" onClick={() => setPage('outlets')}>Lihat semua →</button></div><OutletTable outlets={outlets.slice(0, 4)} compact /></section>
      <section className="panel"><div className="panel-head"><div><h2>Akses sistem</h2><p>Struktur peran pengguna.</p></div></div><div className="access-list"><div><span className="access-icon purple">D</span><div><b>Super Admin</b><small>Kontrol seluruh sistem</small></div><strong>Full</strong></div><div><span className="access-icon blue">A</span><div><b>Admin (Inchas)</b><small>Kelola outlet & karyawan</small></div><strong>Outlet</strong></div><div><span className="access-icon amber">K</span><div><b>Karyawan</b><small>Input Stopmeter</small></div><strong>Terbatas</strong></div></div></section>
    </div>
  </>;
}
function Stat({ label, value, meta, icon }) { return <div className="stat"><div className="stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{meta}</small></div>; }
function OutletTable({ outlets, compact }) { return <div className="table-wrap"><table><thead><tr><th>OUTLET</th><th>LOKASI</th><th>ADMIN</th><th>KARYAWAN</th><th>STATUS</th></tr></thead><tbody>{outlets.map(o => <tr key={o.id}><td><b>{o.name}</b><small className="subcell">{o.id}</small></td><td>{o.city}</td><td>{o.admins}</td><td>{o.staff}</td><td><span className={`status ${o.status === 'Aktif' ? 'active' : 'inactive'}`}>{o.status}</span></td></tr>)}</tbody></table>{!outlets.length && <div className="empty">Outlet tidak ditemukan.</div>}</div>; }
function Role({ name, desc, level }) { return <div className="role-card"><div className="role-symbol">◇</div><h3>{name}</h3><p>{desc}</p><span>{level}</span></div>; }

export default App;
