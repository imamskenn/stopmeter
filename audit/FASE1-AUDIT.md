# Audit Fase 1 — Stopmeter

Tanggal audit: 5 November 2026
Sumber: repo `imamskenn/stopmeter` (private), branch `main`, commit tree `845c5379` (push terakhir 2026-11-05 03:30 UTC).
Metode: seluruh source dibaca langsung dari GitHub (frontend 10 file, backend 24 file, 14 script root), lalu `npm ci` + `npm run build` dijalankan lokal.

## 1. Ringkasan kesehatan proyek

| Aspek | Status | Catatan |
|---|---|---|
| Build frontend | **Lulus** | `vite build` sukses, 265 kB JS / 25 kB CSS |
| Test backend | **Tidak bisa dijalankan** | Hanya 2 file test contoh Laravel; PHP tidak tersedia di sandbox audit |
| Test frontend | **Tidak ada** | Tidak ada vitest/jest, tidak ada ESLint/Prettier |
| Cakupan fitur vs brief | **±30%** | CRUD outlet/admin jalan; Stopmeter, resit, limit, badge hanya sebagian/tidak ada |
| Ketepatan data | **Rendah** | Ranking dihitung dari maksimal 100 record terbaru |
| Keamanan | **Kritis** | `.env` & kredensial ter-commit, token tanpa expiry, tanpa rate limit |
| Konsistensi UI | **Rendah** | 3 bahasa visual berbeda dalam satu aplikasi |

Kesimpulan singkat: ini **bukan** aplikasi operasional siap pakai. Ini dashboard admin yang sudah tersambung ke API nyata (Render + MongoDB Atlas) untuk sebagian fitur, ditambah banyak tampilan demo yang belum punya backend.

## 2. Koreksi terhadap asumsi brief

Hal-hal berikut berbeda dari asumsi awal brief dan sudah diverifikasi di kode:

1. **Database = MongoDB Atlas, bukan SQLite.** `composer.json` memakai `mongodb/laravel-mongodb ^5.12`; semua model menetapkan `protected $connection = 'mongodb'`. `backend/.env.example` masih `DB_CONNECTION=sqlite` (sisa skeleton Laravel) — ini sumber kebingungan.
2. **Role yang benar-benar ada: 3, bukan 5.** `App\Enums\UserRole` hanya `super_admin`, `admin`, `employee`. **Tidak ada** role `inchas` dan `outlet` terpisah. Di UI, `admin` dilabeli "Admin (Inchas)" — jadi dalam implementasi sekarang **Inchas = admin**.
3. **Frontend hanya menerima 2 role.** Login menolak `employee` dengan pesan "Role akun belum memiliki akses frontend" (`App.jsx` ~1568 & ~1600). Employee hanya ada di API.
4. **Tidak ada modul resit di backend.** Resit murni state React di memori (`receiptHistory`), tidak ada endpoint, tidak ada upload, tidak ada saldo.
5. **Tidak ada modul pergerakan limit (R+/R-/M+/M-).** Tidak ada tabel/collection, tidak ada endpoint, tidak ada UI.
6. **Tidak ada endpoint tulis Stopmeter.** Hanya `index` dan `show`. Tidak ada `store`, `update`, atau finalisasi → `finalized_at` tidak pernah diisi oleh kode mana pun.

## 3. Struktur repository (aktual)

```
stopmeter/
├── README.md                  # usang: menyebut Railway, MongoDB, Reverb
├── activate-admin.py … update-admin-password.py   # 14 script Python debug/produksi
├── backend/                   # Laravel 13 + Sanctum + MongoDB
│   ├── .env                   # ⚠ TRACKED (harus dirotasi)
│   ├── .env.example           # masih sqlite (menyesatkan)
│   ├── Dockerfile             # php artisan serve di produksi
│   ├── app/
│   │   ├── Console/Commands/CreateSuperAdmin.php
│   │   ├── Enums/UserRole.php (3 case)
│   │   ├── Http/Controllers/Api/  (8 controller)
│   │   ├── Http/Middleware/CheckRole.php
│   │   ├── Models/  (User, Outlet, Stopmeter, ActivityLog, PersonalAccessToken)
│   │   ├── Providers/AppServiceProvider.php
│   │   └── Support/ActivityLogger.php
│   ├── config/database.php    # ada blok 'mongodb'
│   ├── database/migrations/   # 4 file, SEMUANYA bawaan Laravel
│   └── routes/api.php
└── frontend/                  # React 19 + Vite 8, tanpa router & tanpa vite.config.js
    ├── .env  &  .env.example  # identik (sha sama) ⚠
    ├── src/App.jsx            # 1.692 baris (semua halaman)
    ├── src/AppLayout.jsx/.css # layout sidebar super admin
    ├── src/LoadingScreen.jsx/.css
    ├── src/style.css          # CSS legacy (navy/purple)
    ├── src/lib/api.js         # 1 fungsi fetch
    ├── patch-camera.py, remove_scanner.py, update_receipt.py, update-admin-live.py
```

Tidak ada: `vercel.json`, `render.yaml`, `.github/workflows`, ESLint/Prettier, vitest, router, state management, folder `components/ pages/ hooks/ services/`.

## 4. Peta API (aktual, 15 route)

| Method | Path | Middleware | Controller | Status |
|---|---|---|---|---|
| POST | `/api/login` | publik, **tanpa throttle** | AuthController | jalan |
| GET | `/api/user` | auth:sanctum | AuthController | jalan |
| POST | `/api/logout` | auth:sanctum | AuthController | jalan |
| GET | `/api/super-admin/dashboard` | role:super_admin | SuperAdminDashboardController | jalan (hitung user/outlet, bukan operasional) |
| GET | `/api/super-admin/activities` | role:super_admin | SuperAdminActivityController | jalan (limit 20) |
| GET/POST/PUT/DELETE | `/api/super-admin/outlets[/{id}]` | role:super_admin | OutletController | jalan + audit log |
| GET/POST/PUT/DELETE | `/api/super-admin/admins[/{id}]` | role:super_admin | AdminController | jalan + audit log |
| GET | `/api/admin/dashboard` | role:admin | AdminDashboardController | jalan (statistik user/outlet) |
| GET | `/api/stopmeters` | role:super_admin,admin,employee | StopmeterController@index | **read-only, limit 100** |
| GET | `/api/stopmeters/{id}` | idem | StopmeterController@show | jalan |
| GET/POST/PUT/DELETE | `/api/management/employees[/{id}]` | role:super_admin,admin | EmployeeController | **jalan tapi tidak ada UI** |

Tidak ada endpoint untuk: Stopmeter (tulis/finalisasi), resit, saldo Inchas, pergerakan limit, customer, laporan/agregasi, export.

## 5. Peta database

Tidak ada migration untuk tabel bisnis. `database/migrations/` hanya berisi `users`, `cache`, `jobs`, `personal_access_tokens` — semuanya bawaan Laravel dan **tidak dipakai** karena model memakai MongoDB.

Collection MongoDB yang dipakai kode (tanpa skema, tanpa index, tanpa seeder):

| Collection | Field (dari `$fillable`/cast) | Index |
|---|---|---|
| `users` | name, email, password, role, outlet_ids[], is_active | hanya unique email bawaan |
| `outlets` | name, code, address, is_active, settings | — |
| `stopmeters` | outlet_id, employee_id, employee_name, operational_date, session, status, r_initial, r_current, m_initial, m_current, bi, dp, inch_in, inch_out, vc, total_limit, sales_net, finalized_at | **tidak ada** |
| `activity_logs` | actor_id, actor_name, actor_role, action, target_type, target_id, description, metadata, ip_address | — |
| `personal_access_tokens` | (Sanctum, model custom MongoDB — benar, di-wire di AppServiceProvider) | — |

Konsekuensi: query `whereIn('outlet_id')` + `orderBy('created_at')` + filter `operational_date` akan full-scan saat data bertumbuh.

## 6. Fitur: ada / setengah / belum

**Sudah berfungsi (tersambung API):** login/logout/session restore, CRUD outlet, CRUD admin + penugasan outlet, isolasi data admin per outlet, audit log (sebagian), role middleware, statistik user/outlet di dashboard.

**Setengah jadi:** badge BI (formula ada, tapi data tidak lengkap & satu tombol crash), audit log (hanya Admin/Outlet yang tercatat), employee (API lengkap, UI tidak ada), dashboard admin (memuat statistik nyata tapi menampilkan angka demo di tempat lain).

**Belum ada sama sekali:** input/finalisasi Stopmeter, resit + saldo, pergerakan limit R/M, badge Banyak Limit, badge Naik Daun, badge Loss, modul customer win/loss, laporan profit/loss, pagination, filter tanggal, export, notifikasi, role Outlet.

## 7. Temuan per prioritas

### CRITICAL

**C1. `.env` backend & frontend ter-commit di repository.**
`backend/.env` (1.292 byte) dan `frontend/.env` (52 byte, isinya identik dengan `.env.example`) ada di tree repo, padahal `.gitignore` sudah memuat `.env`. Karena backend memakai MongoDB Atlas, file itu hampir pasti memuat connection string berisi kredensial + `APP_KEY`.
Dampak: siapa pun yang punya akses repo (atau history-nya) memegang kunci database produksi.
Tindakan: rotasi password user MongoDB + `APP_KEY`, hapus dari tracking, bersihkan history, lalu pindahkan ke environment Render/Vercel.

**C2. Kredensial admin hardcoded di script Python root.**
`create-admin.py`, `update-admin-password.py` memuat email+password literal, dan 4 script menunjuk langsung ke `https://stopmeter-api.onrender.com/api`. Ini kredensial produksi di dalam repo.
Tindakan: rotasi password akun tersebut, hapus script dari repo (atau pindahkan ke `scripts/` tanpa kredensial, baca dari env).

**C3. Crash runtime di dashboard Super Admin.**
`App.jsx:606` memakai `byBI` (`{byBI.length ? byBI.map(...)`) padahal variabel itu **tidak pernah dideklarasikan** di file mana pun (hanya 1 kemunculan di seluruh source). Membuka tombol "Lihat seluruh outlet" pada panel Performa Outlet akan melempar `ReferenceError: byBI is not defined`.
Catatan: `vite build` tetap lulus karena ini error runtime, bukan compile error. Sudah dipastikan lewat analisis statis (identifier dipakai tanpa deklarasi/import).

**C4. Aturan bisnis inti belum ada implementasinya.**
Brief menyebut resit mengurangi saldo Inchas secara otomatis, atomic, dan idempotent. Di kode: tidak ada endpoint resit, tidak ada field saldo, tidak ada ledger. Resit yang "disimpan" hanya masuk state React (`App.jsx:1265-1280`) dan **hilang saat refresh**. Kalau fitur ini dipakai operator, data pengeluaran hilang tanpa jejak.

**C5. Ranking & badge dihitung dari data yang dijamin tidak lengkap.**
`StopmeterController.php:40` → `->limit(100)`. Frontend menghitung `biTotal` per outlet dari 100 record terbaru itu (`Overview`, `App.jsx:460-490`). Bulan dengan >100 record → outlet dengan volume tinggi justru bisa kehilangan record dan tidak dapat badge.
Frontend sudah jujur menampilkan peringatan "Data sementara…" — itu benar, tapi artinya **badge BI saat ini tidak boleh dipakai untuk keputusan operasional**.

**C6. Token tidak pernah kedaluwarsa + disimpan di localStorage.**
`config/sanctum.php:53` → `'expiration' => null`. Token disimpan `localStorage` (`App.jsx:1603`, `lib/api.js:4`). Satu XSS = token permanen. Ditambah `/login` tanpa `throttle` (`routes/api.php:13`) → brute force bebas.

### HIGH

**H1. Angka demo ditampilkan sebagai data operasional.** Di `AdminDashboard`: "Saldo Inchas RM 5.000 (Saldo demo)", "Total Harus Disetor RM 1.250 (Nilai demo)", 3 aktivitas `DEMO-001..003`, "METER CALCULATION 1.000 − 500", "FINAL SALES RM 1.540". Untuk aplikasi keuangan, ini berbahaya: operator bisa mengira itu angka nyata.

**H2. Dashboard Admin tidak pernah mengambil aktivitas dari API.** `activities` hanya state awal demo (`App.jsx:698-724`); `setInterval` 5 detik hanya memperbarui `lastUpdate` yang tidak dirender di mana pun.

**H3. Filter employee di PHP, bukan query.** `EmployeeController@index` dan `AdminDashboardController@index` melakukan `User::where('role','employee')->get()->filter(...)` — memuat seluruh employee ke memori lalu menyaring. Efek samping: employee tanpa `outlet_ids` tidak pernah terlihat oleh admin (by design, tapi tidak terdokumentasi).

**H4. Audit log tidak konsisten.** Hanya `AdminController` (3x) dan `OutletController` (3x) yang memanggil `ActivityLogger`. `EmployeeController` (create/update/deactivate) tidak mencatat apa pun, padahal perubahan akses karyawan adalah aksi sensitif.

**H5. Kontrak response API tidak seragam.** Ada `{message,data}`, `{data}`, `{user}`, `{message}` saja, dan error validasi 422 vs error role 403 dengan bentuk berbeda. Frontend menebak-nebak (`response.user || response.data?.user || response.data`).

**H6. Tidak ada handling 401 global.** Token kedaluwarsa/dicabut → semua request gagal, user terjebak di layar error dengan tombol Logout manual; tidak ada redirect ke login.

**H7. `API_URL` bisa `undefined`.** `lib/api.js:1` membaca `import.meta.env.VITE_API_URL` tanpa fallback/validasi; kalau env tidak di-set, request menuju `undefined/login`.

**H8. Backend produksi pakai dev server.** `Dockerfile` CMD: `php artisan serve --host=0.0.0.0`. Single-threaded, tidak untuk produksi; juga tidak ada `php artisan migrate` saat start dan tidak ada queue worker meski README menyebut worker/Reverb.

**H9. Tidak ada pagination/filter tanggal.** `/stopmeters` tidak menerima `from`, `to`, `per_page`, atau `outlet_id` untuk employee; tidak ada agregasi server-side. Semua perhitungan bulanan di browser.

### MEDIUM

- **M1. Tiga sistem visual bercampur:** `style.css` (navy `#111b2d` + ungu `#7565d9`), `AppLayout.css` (`--app-*` monokrom `#191919`), dan `AdminDashboard` (137 objek inline style, palet sendiri `#172033`/`#172f59`/`#2563eb`/`#0f766e`/`#7c3aed`). Sidebar super admin hitam, tombol utama ungu, login ungu, admin dashboard biru navy.
- **M2. Token CSS tidak dipakai konsisten.** `AppLayout.css` mendefinisikan 8 variabel `--app-*`, tapi isinya masih memakai 20+ nilai hardcoded (`#333`, `#eee`, `#888`, `#999`, `#444`, `#777`, `#aaa`).
- **M3. CSS legacy mati.** `style.css` masih memuat `.shell .sidebar .brand .nav-item .sidebar-bottom .profile .text-button .access-list .access-icon .lower-grid .empty-icon .more .purple .blue .amber` yang tidak dipakai JSX lagi (diverifikasi satu per satu).
- **M4. Komponen raksasa.** `App.jsx` 1.692 baris; `AdminDashboard` 874 baris dalam satu fungsi; `Dashboard` 425 baris; 3 modal + tabel + form di dalam satu file.
- **M5. Dead code.** `initialOutlets` (baris 7) & `initialAdmins` (baris 12) tidak dipakai; `stats` array di `AdminDashboard` tidak dipakai; `lastUpdate` tidak dirender; prop `compact` di `OutletTable` tidak pernah dikirim; `rate limiting`, `Request`/`Rule` import tidak terpakai di beberapa controller.
- **M6. Tombol "Muat ulang" audit log tidak berfungsi.** `onClick={() => setPage('audit')}` — `page` sudah `'audit'`, jadi `useEffect([page])` tidak terpicu ulang.
- **M7. Memory leak resit.** `URL.createObjectURL()` (`App.jsx:1272`) tidak pernah `revokeObjectURL`; setiap simpan menahan blob gambar di memori sampai tab ditutup.
- **M8. Tidak ada error boundary / state konsisten.** `console.error` jadi satu-satunya penanganan di 4 tempat; sebagian halaman punya empty state, sebagian hanya teks.
- **M9. Aksesibilitas.** Modal tanpa focus trap dan tanpa handler `Escape`; tombol ikon badge hanya `title` tanpa `aria-label`; teks abu `#8991a0` di atas putih ≈ 2,9:1 (gagal WCAG AA); tabel tanpa `scope`/caption.
- **M10. Dependensi tidak reproducible.** `package.json` memakai `"latest"` untuk react/vite/plugin; `@vitejs/plugin-react` terdaftar tapi tidak ada `vite.config.js` sehingga plugin tidak aktif (tidak ada Fast Refresh).
- **M11. Tidak ada index MongoDB** pada `stopmeters.outlet_id`, `operational_date`, `employee_id` — agregasi bulanan akan melambat drastis.
- **M12. Test tidak merepresentasikan produksi.** `phpunit.xml` menyetel `DB_CONNECTION=sqlite, :memory:` padahal model memaksa koneksi `mongodb`; 2 test yang ada hanya test contoh.
- **M13. Dokumentasi usang.** README menyebut Railway, MongoDB, Reverb, "Tahap 1 demo"; realita: Render + Vercel, tanpa Reverb. `backend/README.md` masih README Laravel default.

### LOW

- `index.html` masih berjudul "Stopmeter — Super Admin".
- Campur bahasa: UI Indonesia, beberapa label Inggris (`SYSTEM OVERVIEW`, `On Working`, `Already`), komentar Indonesia.
- Format angka tidak konsisten: `money()` pakai `ms-MY`/MYR, `formatBI()` pakai `id-ID`.
- Indentasi `ActivityLogger::log` di `AdminController`/`OutletController` tidak konsisten (sisa paste).
- 14 script `*.py` di root: artefak debugging, bukan test; tidak terdokumentasi.
- Tidak ada CI (`.github/workflows`), tidak ada versioning API.

## 8. Duplikasi kode

1. **Modal + backdrop + close** ditulis 3x manual (`showAdd`, `showAdminModal`, `editingOutlet`) dengan pola identik, plus 2 modal lain di `AdminDashboard` dan 1 di resit → tidak ada komponen `Modal`.
2. **`OutletTable`** menduplikasi markup tabel yang juga ditulis ulang di `AdminDashboard` ("Outlet Saya") dan di modal ranking.
3. **Komponen `Stat`** hanya dipakai Super Admin; Admin punya 4 kartu statistik yang ditulis ulang sebagai array inline.
4. **Mapping response API → state** (outlet, admin) ditulis 2x: sekali saat load awal, sekali lagi setelah create/update.
5. **Logika filter outlet milik admin** (`array_diff` atas `outlet_ids`) diduplikasi di `EmployeeController@index`, `EmployeeController@canManageEmployee`, dan `AdminDashboardController@index`.
6. **Validasi "outlet aktif & valid"** ditulis 3x (AdminController store, AdminController update, EmployeeController store/update).

## 9. Temuan arsitektur

- **Tidak ada layer antara HTTP dan bisnis.** Controller langsung memanggil model + menyusun JSON. Belum perlu service layer sekarang, tapi begitu resit/limit masuk, aturan transaksi wajib dipisah (Action/Service) supaya atomic & bisa diuji.
- **Tidak ada sumber kebenaran skema.** MongoDB tanpa migration/seeder; `stopmeters` diisi dari luar repo (tidak ada satu pun endpoint/script yang menulis ke sana). Ini risiko terbesar untuk integritas data keuangan: skema hanya "kesepakatan lisan".
- **Frontend tanpa router.** Navigasi = `useState('overview')`. Tidak ada URL, tidak bisa deep-link/refresh ke halaman tertentu, tidak bisa back button.
- **Frontend hanya 2 role, backend 3.** `employee` tidak punya UI sama sekali; kalau nanti dibuat, `AppLayout` perlu diekstrak agar dipakai bersama (sekarang Admin punya layout sendiri).
- **Perhitungan finansial di klien.** `biTotal`, badge, ranking semuanya di browser dari data mentah — bertentangan dengan aturan di `backend/SETUP.md` sendiri ("Server calculates all meter and net sales values").

## 10. Rekomendasi design system (Fase 2)

Arah: **Modern Professional Operations Dashboard** — netral, tenang, padat informasi. Bukan gradient/shadow tebal.

Palet usulan (diturunkan dari warna yang sudah dipakai, bukan karangan baru):

```css
:root {
  /* netral */
  --bg: #f6f7f9;            /* sekarang #f4f4f4 / #f5f7fb / #f4f6fa */
  --surface: #ffffff;
  --surface-elevated: #fbfbfc;
  --border: #e5e7eb;        /* sekarang #e7e7e7 / #e8eaf0 / #e5e9f0 / #edf0f5 */
  --text: #17191d;          /* sekarang #222 / #172033 */
  --text-secondary: #5b6472;/* sekarang #526078 / #68758b */
  --muted: #8b93a1;         /* sekarang #888/#8991a0/#929bad/#9aa1ad */

  /* aksi */
  --primary: #1f2937;       /* sejalan sidebar #191919 */
  --primary-hover: #111827;

  /* status (satu sumber untuk semua halaman) */
  --success: #16794f;  --success-bg: #e7f4ee;
  --warning: #b45309;  --warning-bg: #fdf3e3;
  --danger:  #b91c1c;  --danger-bg:  #fdecec;
  --info:    #1d4ed8;  --info-bg:    #e8eefc;

  /* badge pastel (sesuai brief) */
  --badge-bi-bg: #f6efd9;     --badge-bi-fg: #8a6d1f;   /* gold */
  --badge-limit-bg: #e6eefc;  --badge-limit-fg: #1e4b8f;/* biru */
  --badge-growth-bg: #e6f4ec; --badge-growth-fg: #1c6b48;/* hijau */
}
```

Skala: radius `8 / 12 / 16`, spacing `4 / 8 / 12 / 16 / 24 / 32`, font Inter (sudah dipakai), ukuran teks `11 / 12 / 14 / 16 / 20 / 26`, ikon 16/18/20. Breakpoint: pertahankan `700 / 1050` (sudah ada), tambah `480` untuk HP.

Yang wajib diseragamkan lebih dulu: satu `Modal` (focus trap + Escape), satu `Table`, satu `Button` (primary/secondary/danger), satu `Badge`, satu set `Empty/Loading/Error state`, dan **hapus seluruh inline style di `AdminDashboard`** supaya admin & super admin memakai `AppLayout` yang sama.

## 11. Urutan refactoring paling aman

1. **Stop the bleeding (tanpa ubah fitur):** rotasi kredensial, untrack `.env`, hapus script berkredensial, perbaiki `byBI`, tambah `throttle` login + expiry token, tambah handling 401.
2. **Guardrails:** ESLint+Prettier, hapus CSS mati, hapus dead code (`initialOutlets`, `initialAdmins`, `stats`, `lastUpdate`), pindahkan palette ke satu file token.
3. **Pecah `App.jsx` tanpa ubah perilaku:** `layouts/AppLayout`, `pages/superadmin/*`, `pages/admin/*`, `components/{Modal,Table,Stat,Badge,EmptyState}`, `lib/api.js` + `lib/format.js`. Target: tidak ada file >300 baris.
4. **Betulkan sumber data (backend dulu):** index MongoDB, endpoint agregasi performa outlet per bulan, hapus perhitungan ranking dari browser.
5. **Bangun tulang punggung transaksi:** `stopmeters` create + finalisasi (atomic, immutability, carry-forward R/M), `limit_movements` (R+/R-/M+/M-), `resit` + `balance_ledger` (idempotent, satu transaksi), baru setelah itu badge Banyak Limit / Naik Daun.
6. **Migrasi UI per halaman** ke token & komponen baru, mulai dari halaman yang paling sering dipakai.
7. **Test:** feature test per role (isolasi outlet), test idempotensi resit, test finalisasi ganda.

## 12. Hal yang perlu dikonfirmasi sebelum implementasi

1. **Dari mana data `stopmeters` masuk sekarang?** Tidak ada endpoint tulis maupun script yang menulis ke collection itu. Apakah diinput manual di MongoDB, atau ada aplikasi lain?
2. **Rumus resmi R, M, BI, DP, VC, inch_in/out, `sales_net`?** Model punya fieldnya, tapi tidak ada satu baris kode yang menghitung. Saya butuh formula final sebelum menyentuh angka.
3. **Apakah "Inchas" = role `admin` sekarang, atau harus dipisah** menjadi Office (admin) dan Inchas?
4. **Apakah role `Outlet` perlu akun login sendiri?** Saat ini tidak ada.
5. **Resit = pengeluaran (mengurangi saldo) atau setoran?** Brief menyebut "total resit mengurangi deposit/balance Inchas". Saldo awal Inchas berasal dari mana?
6. **Alur permintaan limit:** Employee minta → Office menyetujui? Butuh status pending/approved, atau pencatatan langsung?
7. **Badge Banyak Limit** butuh data R+/M+ per outlet per bulan. Setuju dibuat tabel `limit_movements` dulu sebagai sumbernya?
8. **Badge Naik Daun** butuh customer win/loss. Modul customer belum ada — tunda sampai modul itu dibangun?
9. **Prioritas:** keamanan + kebenaran data dulu, atau membangun modul Stopmeter/resit dulu, atau redesign UI dulu?
10. **Cara kerja:** saya buat branch + pull request (bukan push ke `main`), dan boleh saya `npm ci`/build di lingkungan ini untuk verifikasi?

## 13. Yang belum diverifikasi (jujur)

- Backend tidak dijalankan: PHP tidak tersedia di sandbox audit, dan aplikasi butuh MongoDB Atlas. Semua temuan backend berasal dari pembacaan kode, bukan eksekusi.
- `backend/.env` dan `frontend/.env` **tidak dibaca isinya** (hanya keberadaan & ukurannya). Nilai kredensial tidak pernah ditampilkan.
- Perilaku runtime selain `byBI` (mis. apakah ranking benar-benar kosong di produksi) tidak diuji ke API produksi.
- Riwayat git tidak bisa diperiksa (repo diambil lewat API), jadi tidak dipastikan kapan `.env` mulai ter-commit.
