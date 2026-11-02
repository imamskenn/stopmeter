# Stopmeter — Tahap 1: Super Admin

Monorepo awal:
- `frontend/`: React + Vite, siap di-deploy ke Vercel.
- `backend/`: catatan dan file awal Laravel API, siap dikembangkan/deploy ke Railway.
- Database: MongoDB Atlas (belum perlu menjalankan MongoDB di Android).

## Status
Ini adalah **starter Tahap 1**, bukan aplikasi produksi. Dashboard frontend sudah punya tampilan awal dan data demo. Login, CRUD, audit log persisten, dan koneksi database perlu diaktifkan pada tahap backend berikutnya.

## Struktur
```
stopmeter/
  frontend/
  backend/
  docs/
```

## Jalankan frontend
Butuh Node.js di lingkungan development (bisa GitHub Codespaces dari browser Android).
```bash
cd frontend
npm install
npm run dev
```

## Deploy frontend ke Vercel
1. Push folder proyek ini ke repository GitHub.
2. Import repository di Vercel.
3. Set **Root Directory** menjadi `frontend`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Tambahkan `VITE_API_URL` setelah backend Railway tersedia.

## Backend Laravel di Railway
Railway menjalankan Laravel sebagai service PHP persisten. Buat project Laravel di folder `backend` menggunakan Composer pada GitHub Codespaces atau lingkungan yang memiliki PHP + Composer.
Lihat `backend/SETUP.md`.

## Database
Buat cluster MongoDB Atlas. Simpan URI hanya di environment backend Railway sebagai `DB_URI`/`MONGODB_URI`.
Jangan pernah memasukkan kredensial database ke variabel `VITE_*` karena variabel tersebut terekspos ke browser.

## Urutan pembangunan
1. Super Admin (DEV)
2. Admin (Inchas)
3. Stopmeter (Karyawan)

Semua perubahan penting harus tercatat di audit log. Penghapusan outlet/user tidak boleh menghapus transaksi historis.
