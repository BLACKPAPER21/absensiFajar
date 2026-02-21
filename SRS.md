# Software Requirements Specification (SRS)

## Sistem Informasi Absensi Berbasis Face Recognition dan Geolokasi

**Nama Proyek:** Absensi Fajar
**Versi Dokumen:** 1.0
**Tanggal:** 21 Februari 2026
**Status:** Draft

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Deskripsi Umum Sistem](#2-deskripsi-umum-sistem)
3. [Kebutuhan Fungsional](#3-kebutuhan-fungsional)
4. [Kebutuhan Non-Fungsional](#4-kebutuhan-non-fungsional)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Desain Database](#6-desain-database)
7. [Antarmuka Sistem](#7-antarmuka-sistem)
8. [Batasan Sistem](#8-batasan-sistem)
9. [Asumsi dan Ketergantungan](#9-asumsi-dan-ketergantungan)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen ini merupakan Spesifikasi Kebutuhan Perangkat Lunak (*Software Requirements Specification* / SRS) untuk **Sistem Informasi Absensi Fajar**. Dokumen ini mendeskripsikan seluruh kebutuhan fungsional dan non-fungsional sistem, arsitektur teknis, dan batasan pengembangan.

### 1.2 Ruang Lingkup Sistem

Sistem Absensi Fajar adalah aplikasi web berbasis *Next.js* yang memungkinkan:
- **Karyawan** melakukan check-in kehadiran secara mandiri melalui browser menggunakan verifikasi wajah (*face recognition*) dan validasi lokasi (*geofencing*).
- **Admin** mengelola data karyawan, memantau kehadiran secara real-time, melihat laporan kehadiran, dan mengonfigurasi aturan-aturan sistem.

### 1.3 Definisi dan Istilah

| Istilah | Definisi |
|---|---|
| Check-in | Proses pencatatan kehadiran karyawan ke sistem |
| Geofencing | Pembatasan area geografis di mana check-in diizinkan |
| Face Descriptor | Vektor numerik hasil ekstraksi ciri wajah menggunakan `face-api.js` |
| WIB | Waktu Indonesia Barat (UTC+8), zona waktu basis sistem |
| Admin | Pengguna dengan akses penuh ke dashboard manajemen |
| Employee | Karyawan yang hanya dapat melakukan check-in absensi |
| JWT | JSON Web Token, digunakan untuk autentikasi sesi |

### 1.4 Referensi Teknis

- Framework: **Next.js 16.1.6** (React 19)
- Bahasa: **TypeScript 5**
- Database: **PostgreSQL** (via `pg` connection pool)
- Autentikasi: **JWT** (`jose`) + `bcryptjs` untuk hashing password
- Face Recognition: **face-api.js v0.22.2**
- UI: **Tailwind CSS v4**, **Radix UI**, **Lucide React**
- Laporan PDF: **jsPDF v4** + **jspdf-autotable**
- Notifikasi: **Sonner**

---

## 2. Deskripsi Umum Sistem

### 2.1 Perspektif Produk

Sistem ini adalah aplikasi web *full-stack* yang berjalan di server Node.js. Frontend dan backend diintegrasikan dalam satu proyek Next.js menggunakan fitur *App Router* dan *API Routes*. Database PostgreSQL digunakan untuk persistensi data.

### 2.2 Fungsi Utama Produk

```
Sistem Absensi Fajar
├── Modul Autentikasi         → Login admin, sesi JWT, middleware proteksi rute
├── Modul Check-in Karyawan   → Face recognition + Geofencing + Selfie
├── Modul Dashboard Admin     → Statistik real-time + tabel kehadiran terbaru
├── Modul Manajemen Karyawan  → CRUD data karyawan + pendaftaran wajah
├── Modul Laporan             → Laporan harian/bulanan + ekspor PDF
└── Modul Pengaturan          → Konfigurasi radius, jam kerja, toleransi keterlambatan
```

### 2.3 Karakteristik Pengguna

| Jenis Pengguna | Akses | Deskripsi |
|---|---|---|
| **Admin (Super Admin)** | Dashboard penuh (`/dashboard/*`) | Mengelola sistem, karyawan, dan laporan |
| **Karyawan (Employee)** | Halaman absensi (`/attendance`) | Melakukan check-in harian menggunakan wajah & lokasi |

### 2.4 Lingkungan Operasional

- **Server:** Node.js compatible hosting (Vercel, VPS, dll.)
- **Database:** PostgreSQL (lokal atau cloud, mis. Timescale Cloud)
- **Browser Klien:** Chrome, Firefox, Edge terbaru (mendukung WebRTC & Geolocation API)
- **Perangkat:** Desktop / Laptop dengan kamera dan GPS/lokasi aktif

---

## 3. Kebutuhan Fungsional

### 3.1 Modul Autentikasi

#### FR-AUTH-01: Login Admin
- Sistem menyediakan halaman login di `/login`.
- Admin memasukkan **email** dan **password**.
- Sistem memverifikasi password menggunakan `bcryptjs` dengan salt round 10.
- Jika berhasil, sistem membuat **JWT** yang ditandatangani dengan `JWT_SECRET` dan disimpan sebagai cookie `session_token`.

#### FR-AUTH-02: Proteksi Rute Dashboard
- Semua rute `/dashboard/*` dilindungi oleh *middleware* Next.js.
- Middleware memverifikasi token JWT dari cookie `session_token`.
- Jika token tidak ada atau tidak valid, pengguna diarahkan ke `/login`.
- Jika role bukan `admin`, pengguna diarahkan ke halaman `/attendance`.

#### FR-AUTH-03: Logout
- Admin dapat logout melalui menu profil di dashboard.
- Sesi dihapus dan pengguna diarahkan ke `/login`.

---

### 3.2 Modul Check-in Karyawan

#### FR-CHECKIN-01: Verifikasi Wajah (Face Recognition)
- Halaman absensi (`/attendance`) mengakses kamera perangkat menggunakan `react-webcam`.
- Sistem memuat model face-api.js untuk deteksi dan ekstrasi wajah.
- Karyawan mengambil selfie; sistem mengekstrak **face descriptor** dari gambar.
- Descriptor selfie dibandingkan dengan descriptor wajah terdaftar di database.
- Sistem **hanya mengizinkan check-in** jika wajah yang terdeteksi cocok (*match*) dengan data biometrik karyawan yang terdaftar.

#### FR-CHECKIN-02: Validasi Geolokasi (Geofencing)
- Sistem membaca koordinat GPS karyawan menggunakan **Geolocation API** browser.
- Sistem menghitung jarak karyawan ke koordinat kantor menggunakan formula **Haversine**.
- Koordinat kantor yang terdaftar: `lat: -5.13648916306921, lng: 119.44168603184485`.
- Radius check-in dapat dikonfigurasi melalui pengaturan (default: **100 meter**).
- Jika jarak melebihi radius maksimum, check-in **ditolak** dengan pesan error.

#### FR-CHECKIN-03: Penentuan Status Kehadiran
- Status check-in ditentukan berdasarkan waktu **WIB (UTC+8)**.
- Aturan status:
  - `on_time`: Check-in dilakukan sebelum atau tepat pada batas waktu (jam mulai kantor + toleransi keterlambatan).
  - `late`: Check-in dilakukan setelah batas waktu.
- Jam mulai kantor dan toleransi keterlambatan dapat dikonfigurasi melalui pengaturan (default: `08:00`, toleransi: **15 menit**).

#### FR-CHECKIN-04: Pencegahan Check-in Ganda
- Sistem memeriksa database sebelum menyimpan check-in baru.
- Jika pengguna sudah melakukan check-in pada hari yang sama (berdasarkan tanggal WIB), permintaan **ditolak** dengan status HTTP `409 Conflict`.

#### FR-CHECKIN-05: Penyimpanan Data Check-in
- Setiap check-in yang berhasil menyimpan data ke tabel `attendance_logs`:
  - `user_id` – ID karyawan
  - `location_lat` & `location_lng` – Koordinat GPS check-in
  - `selfie_url` – URL foto selfie karyawan
  - `status` – Status kehadiran (`on_time` / `late`)
  - `confidence_score` – Skor kepercayaan pencocokan wajah
  - `check_in_time` – Waktu check-in (disimpan dalam UTC)

---

### 3.3 Modul Dashboard Admin

#### FR-DASH-01: Statistik Ringkasan Harian
Dashboard menampilkan statistik kehadiran hari ini:
- **Total Karyawan** – jumlah karyawan terdaftar
- **Hadir Hari Ini** – karyawan yang sudah check-in dengan persentase *attendance rate*
- **Terlambat / Absen** – jumlah karyawan terlambat dan absen

#### FR-DASH-02: Tabel Aktivitas Check-in Terbaru
- Menampilkan log check-in terbaru dengan kolom: **Karyawan, Waktu Masuk, Selfie, Status, Aksi**.
- Mendukung **paginasi** dengan pilihan baris per halaman (5, 10, 20).
- Admin dapat **menghapus** catatan kehadiran individual.

#### FR-DASH-03: Notifikasi
- Header dashboard menampilkan ikon notifikasi (bell) dengan indikator.
- Dropdown notifikasi menampilkan aktivitas terbaru (mis. karyawan baru terdaftar).

#### FR-DASH-04: Menu Profil Admin
- Header menampilkan foto profil admin.
- Dropdown profil menampilkan nama dan email admin.
- Terdapat tautan ke halaman **Settings** dan tombol **Logout**.

---

### 3.4 Modul Manajemen Karyawan

#### FR-EMP-01: Daftar Karyawan
- Halaman `/dashboard/employees` menampilkan semua karyawan terdaftar.
- Data yang ditampilkan: nama, email, peran (role), tanggal daftar, status face descriptor.
- Mendukung pencarian karyawan berdasarkan nama/email.

#### FR-EMP-02: Tambah Karyawan Baru
- Admin dapat menambahkan karyawan melalui form dengan field:
  - **Nama** (wajib)
  - **Email** (wajib, harus unik)
  - **Role** (wajib: `employee` atau `admin`)
  - **Password** (opsional; default: `employee123`)
  - **Face Descriptor** – data biometrik wajah yang diambil saat pendaftaran
- Sistem menghash password menggunakan `bcryptjs` sebelum disimpan.
- Jika email sudah terdaftar, sistem mengembalikan error `409 Conflict`.

#### FR-EMP-03: Edit & Hapus Karyawan
- Admin dapat mengedit data karyawan yang sudah terdaftar.
- Admin dapat menghapus karyawan dari sistem.

#### FR-EMP-04: Pendaftaran Wajah (Face Enrollment)
- Saat menambah karyawan, admin atau karyawan mengambil foto melalui kamera.
- Sistem mengekstrak **face descriptor** dari foto dan menyimpannya di database (kolom `face_descriptor` tabel `users`).

---

### 3.5 Modul Laporan

#### FR-REP-01: Filter Laporan Berdasarkan Tanggal
- Halaman `/dashboard/reports` memiliki filter tanggal.
- Defaultnya menampilkan data untuk hari ini.

#### FR-REP-02: Metrik Laporan Harian
Sistem menampilkan metrik berikut untuk tanggal yang dipilih:
- **Total Karyawan**
- **Rata-rata Jam Check-in** (dalam WIB)
- **Jumlah Absen** (total karyawan dikurangi karyawan unik yang hadir)

#### FR-REP-03: Distribusi Status (Pie Chart)
- Menampilkan distribusi status kehadiran: **On-Time**, **Late**, **Absent**.

#### FR-REP-04: Ringkasan Bulanan Per Karyawan
- Tabel yang menampilkan setiap karyawan dengan:
  - Jumlah **hari hadir** dalam bulan yang dipilih
  - Jumlah **keterlambatan** dalam bulan yang dipilih
  - **Status evaluasi** (Excellent / Needs Improvement)

#### FR-REP-05: Ekspor Laporan ke PDF
- Laporan dapat diekspor ke format PDF menggunakan **jsPDF** dan **jspdf-autotable**.

---

### 3.6 Modul Pengaturan

#### FR-SET-01: Pengaturan Umum
- Admin dapat mengonfigurasi:
  - **Nama Perusahaan**
  - **Logo Aplikasi** (upload)

#### FR-SET-02: Aturan Absensi
- Admin dapat mengonfigurasi parameter yang disimpan di tabel `settings`:
  - **Radius Check-in** (`check_in_radius`) – radius geofencing dalam meter
  - **Toleransi Keterlambatan** (`late_tolerance`) – menit toleransi setelah jam mulai
  - **Jam Mulai Kantor** (`office_start_time`) – jam mulai kerja (mis. `08:00`)
  - **Jam Selesai Kantor** (`office_end_time`) – jam selesai kerja

#### FR-SET-03: Manajemen Role
- Admin dapat melihat dan menambahkan role baru yang tersedia di sistem.

#### FR-SET-04: Pengaturan Notifikasi
- Konfigurasi notifikasi keterlambatan check-in (*Late Check-in Alerts*).

---

### 3.7 Modul Multi-Bahasa

#### FR-LANG-01: Dukungan Bahasa
- Sistem mendukung dua bahasa: **Bahasa Inggris (EN)** dan **Bahasa Indonesia (ID)**.
- Pengguna dapat mengganti bahasa dari halaman Settings.
- Preferensi bahasa disimpan dan dipersistensikan via `LanguageProvider` (React Context).
- Seluruh teks UI (sidebar, dashboard, laporan, pengaturan) mengikuti bahasa yang dipilih.

---

## 4. Kebutuhan Non-Fungsional

### 4.1 Keamanan (Security)

| ID | Kebutuhan |
|---|---|
| NFR-SEC-01 | Password karyawan di-hash menggunakan `bcryptjs` dengan salt round 10 sebelum disimpan. |
| NFR-SEC-02 | Autentikasi sesi menggunakan JWT yang ditandatangani dengan `JWT_SECRET` dari environment variable. |
| NFR-SEC-03 | Middleware Next.js memverifikasi token pada setiap permintaan ke `/dashboard/*`. |
| NFR-SEC-04 | Koneksi database menggunakan SSL (`rejectUnauthorized: false` untuk kompatibilitas cloud DB). |
| NFR-SEC-05 | Validasi geolokasi dilakukan di sisi **server** (bukan hanya client) untuk mencegah manipulasi. |
| NFR-SEC-06 | Karyawan dengan role `employee` tidak dapat mengakses halaman admin (`/dashboard`). |

### 4.2 Performa (Performance)

| ID | Kebutuhan |
|---|---|
| NFR-PERF-01 | Halaman dashboard harus memuat data statistik dalam waktu kurang dari **3 detik** pada koneksi normal. |
| NFR-PERF-02 | Koneksi ke database menggunakan **connection pool** (`pg.Pool`) untuk efisiensi. |
| NFR-PERF-03 | Proses face matching dilakukan di sisi klien (browser) untuk mengurangi beban server. |

### 4.3 Ketersediaan (Availability)

| ID | Kebutuhan |
|---|---|
| NFR-AVL-01 | Sistem harus beroperasi minimal **99%** waktu dalam sebulan. |
| NFR-AVL-02 | Klien database harus selalu dirilis ke pool setelah operasi selesai (*client.release()*). |

### 4.4 Skalabilitas (Scalability)

| ID | Kebutuhan |
|---|---|
| NFR-SCL-01 | Sistem harus mendukung minimal **200 karyawan** aktif tanpa degradasi performa signifikan. |
| NFR-SCL-02 | API paginasi memastikan tabel tidak memuat seluruh data sekaligus. |

### 4.5 Kemudahan Penggunaan (Usability)

| ID | Kebutuhan |
|---|---|
| NFR-USE-01 | Antarmuka pengguna responsif dan mendukung tampilan desktop maupun mobile. |
| NFR-USE-02 | Sistem mendukung dua bahasa (EN/ID) yang bisa diubah tanpa reload penuh. |
| NFR-USE-03 | Proses check-in karyawan dapat diselesaikan dalam kurang dari **60 detik**. |
| NFR-USE-04 | Pesan error ditampilkan dengan jelas menggunakan komponen toast (`Sonner`). |

### 4.6 Maintainability

| ID | Kebutuhan |
|---|---|
| NFR-MNT-01 | Kode ditulis dalam **TypeScript** untuk keamanan tipe dan keterbacaan. |
| NFR-MNT-02 | Koneksi database disentralisasi di `lib/db.ts`. |
| NFR-MNT-03 | Teks antarmuka dipusatkan di `lib/translations.ts` untuk kemudahan lokalisasi. |

---

## 5. Arsitektur Sistem

### 5.1 Diagram Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│                                                             │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  /login     │  │  /attendance   │  │  /dashboard/*    │ │
│  │  (Admin)    │  │  (Employee     │  │  (Admin Only)    │ │
│  │             │  │  Check-In)     │  │                  │ │
│  └─────────────┘  └────────────────┘  └──────────────────┘ │
│        │               │  face-api.js        │              │
│        │               │  react-webcam        │              │
└────────┼───────────────┼─────────────────────┼──────────────┘
         │               │                     │
         ▼               ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER (API Routes)                 │
│                                                             │
│  Middleware (JWT Verify)                                    │
│                                                             │
│  /api/auth/*         → Login, Session Management            │
│  /api/check-in       → Geofencing + Attendance Log          │
│  /api/employees/*    → CRUD Karyawan                        │
│  /api/attendance/*   → Get/Delete Attendance                │
│  /api/dashboard/*    → Stats + Reports                      │
│  /api/settings/*     → Read/Write Settings                  │
│  /api/roles/*        → Role Management                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  PostgreSQL Database  │
                │  (via pg Pool + SSL)  │
                └───────────────────────┘
```

### 5.2 Alur Proses Check-in

```
Karyawan Buka /attendance
        │
        ▼
Kamera Aktif + Ambil Selfie
        │
        ▼
face-api.js Ekstrak Descriptor Wajah
        │
        ▼
Cocokkan dengan Semua Face Descriptor di DB
        │
    ┌───┴───┐
  Cocok?   Tidak
    │         └──→ Tampilkan Error "Wajah Tidak Dikenal"
    ▼
Ambil Koordinat GPS Browser
        │
        ▼
POST /api/check-in { userId, lat, lng, selfieUrl, confidenceScore }
        │
        ▼
Server: Hitung Jarak ke Kantor (Haversine)
        │
    ┌───┴───┐
  Dalam    Di Luar
  Radius   Radius → Return 403 "Too far from office"
    │
    ▼
Server: Cek Duplicate Check-in Hari Ini
        │
    ┌───┴───┐
  Belum    Sudah → Return 409 "Already checked in"
    │
    ▼
Server: Tentukan Status (on_time / late) Berdasarkan WIB
        │
        ▼
INSERT ke attendance_logs
        │
        ▼
Return Success → Tampilkan Konfirmasi ke Karyawan
```

---

## 6. Desain Database

### 6.1 Tabel: `users`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID / SERIAL | Primary key |
| `name` | VARCHAR | Nama lengkap pengguna |
| `email` | VARCHAR | Email unik (UNIQUE constraint) |
| `role` | VARCHAR | Role: `admin` atau `employee` |
| `password_hash` | VARCHAR | Password ter-hash menggunakan bcrypt |
| `face_descriptor` | JSONB / TEXT | Array vektor wajah dari face-api.js |
| `created_at` | TIMESTAMP | Waktu pendaftaran |

### 6.2 Tabel: `attendance_logs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID / SERIAL | Primary key |
| `user_id` | FK → users.id | ID karyawan yang check-in |
| `check_in_time` | TIMESTAMP | Waktu check-in (UTC) |
| `location_lat` | DECIMAL | Lintang GPS check-in |
| `location_lng` | DECIMAL | Bujur GPS check-in |
| `selfie_url` | TEXT | URL foto selfie check-in |
| `status` | VARCHAR | Status: `on_time` atau `late` |
| `confidence_score` | DECIMAL | Skor kemiripan wajah (0.0 – 1.0) |

### 6.3 Tabel: `settings`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `key` | VARCHAR | Nama konfigurasi (PRIMARY KEY) |
| `value` | TEXT | Nilai konfigurasi |

**Key yang tersedia:**

| Key | Default | Deskripsi |
|---|---|---|
| `check_in_radius` | `100` | Radius geofencing dalam meter |
| `office_start_time` | `08:00` | Jam mulai kerja |
| `late_tolerance` | `15` | Toleransi keterlambatan (menit) |
| `office_end_time` | `17:00` | Jam selesai kerja |

---

## 7. Antarmuka Sistem

### 7.1 Antarmuka Pengguna (UI)

| Halaman | Route | Akses | Deskripsi |
|---|---|---|---|
| Login | `/login` | Public | Form login admin |
| Absensi | `/attendance` | Public (Employee) | Halaman check-in dengan kamera |
| Dashboard | `/dashboard` | Admin only | Statistik dan log kehadiran terbaru |
| Karyawan | `/dashboard/employees` | Admin only | Manajemen data karyawan |
| Laporan | `/dashboard/reports` | Admin only | Laporan dan analisis kehadiran |
| Pengaturan | `/dashboard/settings` | Admin only | Konfigurasi sistem |

### 7.2 Antarmuka API

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login dan mendapatkan token sesi |
| POST | `/api/check-in` | Public | Submit check-in karyawan |
| GET | `/api/employees` | Admin | Ambil daftar semua karyawan |
| POST | `/api/employees` | Admin | Tambah karyawan baru |
| GET | `/api/dashboard/stats` | Admin | Ambil statistik dashboard |
| GET | `/api/dashboard/reports` | Admin | Ambil data laporan |
| DELETE | `/api/attendance/:id` | Admin | Hapus catatan kehadiran |
| GET | `/api/settings` | Admin | Ambil pengaturan sistem |
| POST | `/api/settings` | Admin | Simpan pengaturan sistem |
| GET | `/api/roles` | Admin | Ambil daftar role |
| POST | `/api/roles` | Admin | Tambah role baru |

### 7.3 Antarmuka Database

Sistem terhubung ke PostgreSQL melalui:
- **`DATABASE_URL`** – connection string PostgreSQL (dari environment variable `.env.local`)
- Connection pool menggunakan library `pg` (node-postgres)
- SSL diaktifkan untuk koneksi cloud database

---

## 8. Batasan Sistem

1. **Ketergantungan Kamera** – Proses check-in hanya dapat dilakukan pada perangkat dengan kamera yang berfungsi dan izin akses kamera diberikan oleh pengguna.
2. **Ketergantungan GPS** – Proses check-in memerlukan akses lokasi GPS; akurasi bergantung pada perangkat dan sinyal GPS.
3. **Face Recognition Berbasis Browser** – Pemrosesan wajah dilakukan sepenuhnya di browser; performa dapat bervariasi tergantung spesifikasi perangkat.
4. **Zona Waktu** – Semua kalkulasi waktu mengacu pada **WIB (UTC+8)**; sistem tidak mendukung multi-zona waktu secara otomatis.
5. **Single Office Location** – Koordinat kantor hardcoded di API; hanya mendukung **satu lokasi kantor** yang dapat dikonfigurasi.
6. **Bahasa** – Hanya mendukung dua bahasa: **Bahasa Inggris** dan **Bahasa Indonesia**.

---

## 9. Asumsi dan Ketergantungan

### 9.1 Asumsi

- Setiap karyawan memiliki wajah yang telah didaftarkan (*enrolled*) ke sistem sebelum dapat melakukan check-in.
- Admin bertanggung jawab atas pendaftaran awal dan pengelolaan data karyawan.
- Karyawan mengakses sistem menggunakan browser modern yang mendukung WebRTC (akses kamera) dan Geolocation API.
- Sistem dijalankan di lingkungan server yang mendukung Node.js dan dapat terhubung ke PostgreSQL.

### 9.2 Ketergantungan Eksternal

| Ketergantungan | Versi | Fungsi |
|---|---|---|
| Next.js | 16.1.6 | Framework web full-stack |
| React | 19.2.3 | Library UI |
| TypeScript | 5.x | Bahasa pemrograman |
| PostgreSQL | - | Database utama |
| `pg` (node-postgres) | 8.x | Driver database |
| `face-api.js` | 0.22.2 | Library face recognition |
| `react-webcam` | 7.2.0 | Akses kamera browser |
| `bcryptjs` | 3.x | Hashing password |
| `jose` | 6.x | JWT encode/decode |
| `jspdf` | 4.x | Generasi PDF |
| `jspdf-autotable` | 5.x | Tabel PDF |
| `date-fns` | 4.x | Manipulasi tanggal |
| `sonner` | 2.x | Toast notification |
| Tailwind CSS | 4.x | Styling UI |

---

*Dokumen ini dibuat berdasarkan analisis kode sumber proyek `absensi-fajar`. Revisi berikutnya harus mencerminkan perubahan fungsional yang signifikan pada sistem.*
