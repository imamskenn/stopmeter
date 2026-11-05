import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './lib/api';
import LoadingScreen from './LoadingScreen';
import AppLayout from './AppLayout';


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
  const [stopmeters, setStopmeters] = useState([]);
  const [stopmetersLoading, setStopmetersLoading] = useState(true);


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

  useEffect(() => {
    apiRequest('/stopmeters')
      .then(response => setStopmeters(response.data || []))
      .catch(error => console.error('Stopmeter API:', error.message))
      .finally(() => setStopmetersLoading(false));
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

  return (
    <AppLayout
      user={user}
      role="Super Admin"
      title={title}
      nav={nav}
      activePage={page}
      onNavigate={setPage}
      onLogout={onLogout}
    >

        <div className="notice"><span>ⓘ</span>{notice}</div>
        {page === 'overview' && (
          dashboardLoading
            ? <div className="panel">Memuat data dashboard...</div>
            : <Overview
                outlets={outlets}
                admins={admins}
                setPage={setPage}
                stats={dashboardData}
                stopmeters={stopmeters}
                stopmetersLoading={stopmetersLoading}
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
    </AppLayout>
  );
}

function Overview({ outlets, admins, setPage, stats, stopmeters = [], stopmetersLoading = false }) {
  const [showOutletRanking, setShowOutletRanking] = useState(false);

  const now = new Date();
  const monthName = now.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
  const lastDay = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlyRecords = stopmeters.filter(record => {
    const date = String(record.operational_date || '');
    return date.slice(0, 7) === monthKey;
  });

  const outletRankings = outlets.map(outlet => {
    const records = monthlyRecords.filter(record =>
      String(record.outlet_id) === String(outlet.id)
    );

    return {
      ...outlet,
      biTotal: records.reduce((sum, record) => {
        const value = Number(record.bi || 0);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
      recordCount: records.length,
    };
  });

  const formatBI = value => new Intl.NumberFormat('id-ID').format(value);

  const getOutletBadges = outlet => {
    const others = outletRankings.filter(item => item.id !== outlet.id);
    const averageOtherBI = others.length
      ? others.reduce((sum, item) => sum + item.biTotal, 0) / others.length
      : 0;

    return {
      bi: others.length > 0 && outlet.biTotal > averageOtherBI,
      up: false,
      growth: false,
    };
  };

  return <>
    <div className="welcome">
      <div>
        <span className="welcome-tag">SYSTEM OVERVIEW</span>
        <h2>Kontrol seluruh operasional.</h2>
        <p>Pantau outlet, pengelola, dan kesiapan sistem Stopmeter dari satu tempat.</p>
      </div>
      <div className="welcome-art">
        <div className="orbit orbit-one"/>
        <div className="orbit orbit-two"/>
        <div className="core">S</div>
      </div>
    </div>

    <div className="stats">
      <Stat label="TOTAL OUTLET" value={stats?.outlets?.total ?? 0} meta={`${stats?.outlets?.active ?? 0} outlet aktif`} icon="⌂" />
      <Stat label="ADMIN INCHAS" value={stats?.admins?.total ?? 0} meta={`${stats?.admins?.active ?? 0} akun aktif`} icon="♙" />
      <Stat label="KARYAWAN" value={stats?.employees?.total ?? 0} meta={`${stats?.employees?.active ?? 0} karyawan aktif`} icon="♧" />
      <Stat label="STATUS SISTEM" value="Online" meta="API terhubung" icon="◉" />
    </div>

    <section className="panel outlet-growth-panel">
      <div className="panel-head outlet-growth-heading">
        <div>
          <span className="growth-eyebrow">PERFORMA OPERASIONAL</span>
          <h2>Performa Outlet</h2>
          <p>Lencana performa setiap outlet bulan ini.</p>
        </div>
        <span className="growth-period">
          {`01–${lastDay} ${monthName}`}
        </span>
      </div>

      <div className="growth-modal-notice">
        {stopmetersLoading
          ? 'Memuat data Stopmeter...'
          : 'Data sementara: API hanya mengirim maksimal 100 record Stopmeter terbaru. Peringkat bulanan bisa belum lengkap.'}
      </div>

      <div className="outlet-badge-list">
        {outletRankings.map(outlet => {
          const badges = getOutletBadges(outlet);
          return (
            <div className="outlet-badge-row" key={outlet.id}>
              <div className="outlet-badge-name">
                <strong>{outlet.name}</strong>
                <small>{outlet.city || 'Lokasi belum diatur'}</small>
              </div>
              <div className="outlet-badges">
                {badges.bi && <span className="outlet-icon-badge badge-bi" title="BI Teratas">♛</span>}
                {badges.up && <span className="outlet-icon-badge badge-up" title="Penambahan Limit">↑</span>}
                {badges.growth && <span className="outlet-icon-badge badge-growth" title="Naik Daun">↗</span>}
              </div>
            </div>
          );
        })}
        {!outlets.length && <p className="growth-ranking-empty">Belum ada outlet.</p>}
      </div>

      <div className="growth-footer">
        <span>{outlets.length} outlet terdaftar</span>
        <button
          type="button"
          className="growth-detail-button"
          onClick={() => setShowOutletRanking(true)}
        >
          Lihat seluruh outlet <span>→</span>
        </button>
      </div>
    </section>

    {showOutletRanking && (
      <div
        className="growth-modal-backdrop"
        onClick={() => setShowOutletRanking(false)}
      >
        <section
          className="growth-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="growth-modal-title"
          onClick={e => e.stopPropagation()}
        >
          <div className="growth-modal-header">
            <div>
              <span className="growth-eyebrow">PERFORMA BULANAN</span>
              <h2 id="growth-modal-title">Seluruh Outlet</h2>
              <p>{`Periode 01–${lastDay} ${monthName}`}</p>
            </div>
            <button
              type="button"
              className="growth-modal-close"
              onClick={() => setShowOutletRanking(false)}
              aria-label="Tutup"
            >
              ×
            </button>
          </div>

          <div className="growth-modal-notice">
            Data sementara dari maksimal 100 record Stopmeter terbaru. Angka bulanan mungkin belum lengkap.
          </div>

          <div className="growth-outlet-list">
            {byBI.length ? byBI.map((outlet, index) => (
              <div className="growth-outlet-row" key={outlet.id}>
                <div className="growth-outlet-symbol">{index + 1}</div>
                <div className="growth-outlet-info">
                  <strong>{outlet.name}</strong>
                  <small>{outlet.city || 'Lokasi belum diatur'}</small>
                  <small>BI: {formatBI(outlet.biTotal)} · Catatan: {outlet.recordCount}</small>
                </div>
                <span className={`status ${outlet.status === 'Aktif' ? 'active' : 'inactive'}`}>
                  {outlet.status}
                </span>
              </div>
            )) : (
              <div className="empty">Belum ada outlet terdaftar.</div>
            )}
          </div>

          <div className="growth-modal-footer">
            <button
              type="button"
              className="secondary"
              onClick={() => setShowOutletRanking(false)}
            >
              Tutup
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setShowOutletRanking(false);
                setPage('outlets');
              }}
            >
              Manajemen outlet
            </button>
          </div>
        </section>
      </div>
    )}
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
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [modalClosing, setModalClosing] = useState(false);

  const closeDetail = () => {
    setModalClosing(true);
    setTimeout(() => {
      setSelected(null);
      setModalClosing(false);
    }, 220);
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptCategory, setReceiptCategory] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [activities, setActivities] = useState([
    {
      id: 'DEMO-001',
      employee: 'Employee Demo 1',
      outlet: 'Outlet Demo',
      session: 'Pagi',
      status: 'On Working',
      sales: 1250,
      time: new Date()
    },
    {
      id: 'DEMO-002',
      employee: 'Employee Demo 2',
      outlet: 'Outlet Demo',
      session: 'Malam',
      status: 'On Working',
      sales: 850,
      time: new Date(Date.now() - 60000)
    },
    {
      id: 'DEMO-003',
      employee: 'Employee Demo 3',
      outlet: 'Outlet Demo',
      session: 'Pagi',
      status: 'Already',
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

  const sortedActivities = [...activities].sort((a, b) => {
    const priority = status => status === 'Already' ? 0 : 1;
    return priority(a.status) - priority(b.status)
      || new Date(b.time) - new Date(a.time);
  });

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
    background: status === 'On Working' ? '#dcfce7' : '#dbeafe',
    color: status === 'On Working' ? '#15803d' : '#1d4ed8'
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
          <h1 style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: -1,
            color: '#172033'
          }}>Hello, {user?.name || 'Admin'}!</h1>
          <p style={{
            color: '#68758b',
            margin: '7px 0 0',
            fontSize: 17,
            fontWeight: 500
          }}>Operasionalkan tim-mu</p>
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
            {activities.length > 0 && (
              <span style={{
                marginLeft: 7,
                background: '#dc2626',
                color: '#fff',
                borderRadius: 20,
                padding: '2px 7px',
                fontSize: 11
              }}>{activities.length}</span>
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

      <nav style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        borderBottom: '1px solid #e5e9f0',
        paddingBottom: 10
      }}>
        {[
          ['home', 'Home'],
          ['receipt', 'Resit']
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              border: 0,
              borderRadius: 9,
              padding: '9px 16px',
              background: activeTab === tab ? '#172f59' : '#fff',
              color: activeTab === tab ? '#fff' : '#526078',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >{label}</button>
        ))}
      </nav>

      {activeTab === 'home' && (
      <>
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))',
        gap: 10,
        marginBottom: 18
      }}>
        {[
          { label: 'Saldo Inch​​as', value: money(5000), note: 'Saldo demo', color: '#2563eb', icon: '↗' },
          { label: 'Total Outlet', value: data?.outlets?.total ?? 0, note: 'Outlet terdaftar', color: '#0f766e', icon: '⌂' },
          { label: 'Total Pekerja', value: data?.employees?.total ?? 0, note: 'Seluruh pekerja', color: '#7c3aed', icon: '♙' },
          { label: 'Total Harus Disetor', value: money(1250), note: 'Nilai demo', color: '#d97706', icon: '⇩' }
        ].map(item => (
          <article key={item.label} style={{
            ...card,
            border: 0,
            borderRadius: 14,
            padding: 12,
            minHeight: 88,
            boxShadow: '0 3px 12px #17203308'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#778196', fontSize: 12, fontWeight: 650 }}>{item.label}</span>
              <span style={{
                width: 27, height: 27, borderRadius: 9,
                display: 'grid', placeItems: 'center',
                background: `${item.color}14`, color: item.color,
                fontSize: 16, fontWeight: 800
              }}>{item.icon}</span>
            </div>
            <div style={{ fontSize: 'clamp(16px, 4.5vw, 21px)', fontWeight: 850, marginTop: 8, letterSpacing: '-.5px', overflowWrap: 'anywhere' }}>{item.value}</div>
            <small style={{ color: '#9aa1ad' }}>{item.note}</small>
          </article>
        ))}
      </section>

      <section style={{ ...card, border: 0, borderRadius: 16, padding: 14 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 8, marginBottom: 12
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>Aktivitas Terbaru</h2>
            <p style={{ margin: '5px 0 0', color: '#8991a0', fontSize: 12 }}>
              Aktivitas operasional seluruh outlet
            </p>
          </div>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              border: 0, background: '#eef2ff', color: '#4657a5',
              borderRadius: 9, padding: '8px 10px', fontSize: 12,
              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >{showNotifications ? 'Tutup' : 'Lihat semua'}</button>
        </div>

        {!showNotifications ? (
          <div style={{ position: 'relative', height: 160, cursor: 'pointer' }}>
            {sortedActivities.slice(0, 3).map((item, index) => (
              <article
                key={item.id}
                onClick={() => setSelected(item)}
                className="stop-activity-card"
                style={{
                  position: 'absolute',
                  top: index * 13,
                  left: index * 5,
                  right: index * 5,
                  zIndex: 3 - index,
                  minHeight: 108,
                  boxSizing: 'border-box',
                  background: '#fff',
                  border: '1px solid #e8eaf0',
                  borderRadius: 17,
                  padding: 17,
                  boxShadow: '0 7px 22px #17203312',
                  transform: `scale(${1 - index * 0.025})`,
                  transformOrigin: 'top center',
                  transition: 'all 300ms ease'
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  alignItems: 'start',
                  gap: 8
                }}>
                  <strong style={{ fontSize: 14 }}>{item.employee}</strong>
                  <strong style={{ fontSize: 13, color: '#526078' }}>{item.outlet}</strong>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: 12 }}>
                      {new Date(item.time).toLocaleDateString('ms-MY')}
                    </strong>
                    <div style={{ fontSize: 11, color: '#8991a0', marginTop: 4 }}>
                      {item.session}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={statusStyle(item.status)}>{item.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 18 }}>{money(item.sales)}</strong>
                  <small style={{ color: '#8991a0' }}>
                    {new Date(item.time).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {sortedActivities.map(item => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  textAlign: 'left', background: '#f8f9fc',
                  border: '1px solid #edf0f5', borderRadius: 14,
                  padding: 15, cursor: 'pointer', color: '#172033'
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  alignItems: 'start',
                  gap: 8
                }}>
                  <strong style={{ fontSize: 13 }}>{item.employee}</strong>
                  <strong style={{ fontSize: 12, color: '#526078' }}>{item.outlet}</strong>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: 11 }}>
                      {new Date(item.time).toLocaleDateString('ms-MY')}
                    </strong>
                    <div style={{ fontSize: 11, color: '#8991a0', marginTop: 4 }}>
                      {item.session}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 9 }}>
                  <span style={statusStyle(item.status)}>{item.status}</span>
                  <small style={{ marginLeft: 8, color: '#8991a0' }}>{item.id}</small>
                </div>
                <strong>{money(item.sales)}</strong>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <section
          onClick={closeDetail}
          className={`stop-modal-overlay${modalClosing ? ' closing' : ''}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.48)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`stop-modal-panel${modalClosing ? ' closing' : ''}`}
            style={{
              ...card,
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 22,
              padding: 20,
              boxSizing: 'border-box',
              position: 'relative'
            }}
          >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
          }}>
            <div>
              <h2 style={{ margin: 0 }}>Detail Stopmeter</h2>
              <p style={{ color: '#8991a0', fontSize: 12 }}>
                {selected.id} · {selected.outlet}
              </p>
            </div>
            <button className="stop-soft-button" onClick={closeDetail}
              style={{
                border: 0,
                background: '#f0f2f6',
                borderRadius: 10,
                padding: '10px 14px',
                cursor: 'pointer'
              }}>Tutup</button>
          </div>

          <div style={{
            background: '#f6f8fc',
            borderRadius: 14,
            padding: 15,
            marginBottom: 18
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              alignItems: 'start',
              gap: 8
            }}>
              <strong style={{ fontSize: 13 }}>{selected.employee}</strong>
              <strong style={{ fontSize: 12, color: '#526078' }}>{selected.outlet}</strong>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: 11 }}>
                  {new Date(selected.time).toLocaleDateString('ms-MY')}
                </strong>
                <div style={{ fontSize: 11, color: '#8991a0', marginTop: 4 }}>
                  {selected.session}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <span style={statusStyle(selected.status)}>{selected.status}</span>
              <small style={{ marginLeft: 8, color: '#8991a0' }}>{selected.id}</small>
            </div>
          </div>

          <h3 style={{ fontSize: 14 }}>METER CALCULATION</h3>
          <div style={{
            background: '#f6f8fc',
            borderRadius: 14,
            padding: 15
          }}>
            {[
              ['R', '1,000 − 500', '500'],
              ['M', '1,000 − 500', '500']
            ].map(([label, formula, total]) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                padding: '9px 0'
              }}>
                <strong>{label}</strong>
                <span style={{ color: '#778196' }}>{formula}</span>
                <strong>{total}</strong>
              </div>
            ))}
            <div style={{
              borderTop: '1px solid #dce2eb',
              marginTop: 7,
              paddingTop: 13,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <strong>Total Limit</strong>
              <strong>1,000</strong>
            </div>
          </div>

          <h3 style={{ fontSize: 14, marginTop: 22 }}>RECORD TOTAL</h3>
          <div style={{
            background: '#fff',
            border: '1px solid #edf0f5',
            borderRadius: 14,
            padding: '5px 15px'
          }}>
            {[
              ['BI', '−100'],
              ['DP', '+500'],
              ['Inch In', '+200'],
              ['Inch Out', '−50'],
              ['VC', '−10']
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '13px 0',
                borderBottom: '1px solid #f0f2f6'
              }}>
                <span style={{ color: '#778196' }}>Total {label}</span>
                <strong style={{
                  color: value.startsWith('+') ? '#16865c' :
                    value.startsWith('−') ? '#dc6262' : '#172033'
                }}>{value}</strong>
              </div>
            ))}
          </div>

          <div style={{
            background: '#edf5ff',
            borderRadius: 16,
            padding: 18,
            marginTop: 18
          }}>
            <span style={{
              color: '#5274a8',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1
            }}>FINAL SALES</span>
            <div style={{
              fontSize: 30,
              fontWeight: 850,
              color: '#244e87',
              marginTop: 5
            }}>RM 1,540</div>
            <p style={{
              fontSize: 11,
              color: '#6680a4',
              marginBottom: 0
            }}>
              1,000 − 100 + 500 + 200 − 50 − 10
            </p>
          </div>
          <p style={{ color: '#9aa1ad', fontSize: 11 }}>
            Contoh perhitungan simulasi frontend.
          </p>
          </div>
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
      </>
      )}

      {activeTab === 'receipt' && (
        <section style={{
          ...card,
          maxWidth: 600,
          margin: '0 auto',
          padding: 16,
          border: 0
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 19 }}>Tambah Resit</h2>
          <p style={{ margin: '0 0 18px', color: '#778196', fontSize: 12 }}>
            Catat pengeluaran dan lampirkan foto resit.
          </p>

          <form onSubmit={e => {
            e.preventDefault();
            if (!receiptFile || !receiptCategory || !receiptAmount) return;

            setReceiptHistory(previous => [{
              id: Date.now(),
              category: receiptCategory,
              amount: Number(receiptAmount),
              fileName: receiptFile.name,
              imageUrl: URL.createObjectURL(receiptFile),
              date: new Date()
            }, ...previous]);

            setReceiptFile(null);
            setReceiptCategory('');
            setReceiptAmount('');
            e.target.reset();
          }}>
            <div style={{
              border: '1px dashed #aab4c4',
              borderRadius: 12,
              padding: 18,
              textAlign: 'center',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>＋</div>
              <strong style={{ fontSize: 13 }}>Foto resit wajib</strong>
              <p style={{ color: '#8991a0', fontSize: 11 }}>
                Ambil foto atau pilih dari galeri
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{
                  padding: 12,
                  borderRadius: 9,
                  background: '#172f59',
                  color: '#fff',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  Ambil Foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
                <label style={{
                  padding: 12,
                  borderRadius: 9,
                  background: '#eaf0f8',
                  color: '#172f59',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  Pilih Galeri
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              {receiptFile && (
                <p style={{ fontSize: 12, color: '#16865c' }}>
                  {receiptFile.name}
                </p>
              )}
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>
              Kategori pengeluaran
            </label>
            <select
              required
              value={receiptCategory}
              onChange={e => setReceiptCategory(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                margin: '7px 0 16px',
                border: '1px solid #dce1e9',
                borderRadius: 9,
                background: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Pilih kategori</option>
              {['Makanan', 'Transportasi', 'Barang', 'Sakit', 'Operasional'].map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>
              Total pengeluaran (RM)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={receiptAmount}
              onChange={e => setReceiptAmount(e.target.value)}
              placeholder="Masukkan total resit"
              style={{
                width: '100%',
                padding: 12,
                margin: '7px 0 10px',
                border: '1px solid #dce1e9',
                borderRadius: 9,
                boxSizing: 'border-box'
              }}
            />

            <p style={{
              fontSize: 11,
              color: '#68758b',
              marginBottom: 16
            }}>
              Nominal resit diisi manual sesuai jumlah pada foto.
            </p>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: 13,
                border: 0,
                borderRadius: 10,
                background: '#172f59',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >Simpan catatan resit</button>
          </form>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 15 }}>Riwayat Resit</h3>
            {receiptHistory.length === 0 ? (
              <p style={{ color: '#8991a0', fontSize: 12 }}>
                Belum ada catatan resit.
              </p>
            ) : receiptHistory.map(item => (
              <div key={item.id}
                onClick={() => setSelectedReceipt(item)}
                style={{
                  padding: 12,
                  border: '1px solid #e8eaf0',
                  borderRadius: 10,
                  marginBottom: 8,
                  cursor: 'pointer'
                }}>
                <strong>{item.category}</strong>
                <div style={{ fontSize: 13, marginTop: 5 }}>
                  {money(item.amount)}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 7
                }}>
                  <small style={{
                    color: '#8991a0',
                    overflowWrap: 'anywhere'
                  }}>{item.fileName}</small>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      if (window.confirm('Hapus catatan resit ini?')) {
                        setReceiptHistory(previous =>
                          previous.filter(receipt => receipt.id !== item.id)
                        );
                      }
                    }}
                    style={{
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#dc2626',
                      borderRadius: 7,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >Hapus</button>
                </div>
              </div>
            ))}
          </div>
          {selectedReceipt && (
            <div
              onClick={() => setSelectedReceipt(null)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: '#101828bb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#fff',
                  width: '100%',
                  maxWidth: 480,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  borderRadius: 15,
                  padding: 14,
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12
                }}>
                  <strong>Preview Resit</strong>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(null)}
                    style={{
                      border: 0,
                      background: '#f1f3f6',
                      borderRadius: 8,
                      padding: '7px 11px',
                      cursor: 'pointer'
                    }}
                  >Tutup</button>
                </div>

                <img
                  src={selectedReceipt.imageUrl}
                  alt="Foto resit"
                  style={{
                    display: 'block',
                    width: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                    borderRadius: 9,
                    background: '#f4f6fa'
                  }}
                />

                <div style={{ marginTop: 14 }}>
                  <strong>{selectedReceipt.category}</strong>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginTop: 5
                  }}>{money(selectedReceipt.amount)}</div>
                  <small style={{ color: '#8991a0' }}>
                    {selectedReceipt.date.toLocaleString('ms-MY')}
                  </small>
                </div>
              </div>
            </div>
          )}

          <p style={{ color: '#9aa1ad', fontSize: 11, marginTop: 16 }}>
            Tampilan frontend. Pengiriman ke Super Admin dan pemotongan deposit belum aktif.
          </p>
        </section>
      )}

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
    return <LoadingScreen />;
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

