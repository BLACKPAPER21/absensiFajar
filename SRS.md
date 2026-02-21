# Software Requirements Specification (SRS)

## Sistem Informasi Absensi Berbasis Face Recognition dan Geolokasi

**Nama Proyek:** Absensi Fajar
**Versi Dokumen:** 2.0
**Tanggal:** 21 Februari 2026
**Status:** Final Draft

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Deskripsi Umum Sistem](#2-deskripsi-umum-sistem)
3. [Kebutuhan Fungsional](#3-kebutuhan-fungsional)
4. [Kebutuhan Non-Fungsional](#4-kebutuhan-non-fungsional)
5. [Kebutuhan Lainnya](#5-kebutuhan-lainnya)
6. [Use Case](#6-use-case)
7. [Arsitektur Sistem](#7-arsitektur-sistem)
8. [Desain Database](#8-desain-database)
9. [Antarmuka Sistem](#9-antarmuka-sistem)
10. [Batasan Sistem](#10-batasan-sistem)
11. [Asumsi dan Ketergantungan](#11-asumsi-dan-ketergantungan)

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

| ID | Kebutuhan | Prioritas |
|---|---|---|
| NFR-SEC-01 | Password karyawan di-hash menggunakan `bcryptjs` dengan salt round **10** sebelum disimpan ke database. | Tinggi |
| NFR-SEC-02 | Autentikasi sesi menggunakan **JWT** yang ditandatangani dengan `JWT_SECRET` yang disimpan sebagai environment variable, bukan hardcoded. | Tinggi |
| NFR-SEC-03 | Middleware Next.js memverifikasi token JWT pada **setiap** permintaan ke `/dashboard/*` sebelum rendering. | Tinggi |
| NFR-SEC-04 | Koneksi database menggunakan **SSL** untuk mengenkripsi data yang ditransmisikan antara aplikasi dan PostgreSQL. | Tinggi |
| NFR-SEC-05 | Validasi geolokasi (geofencing) **wajib** dilakukan di sisi server untuk mencegah manipulasi koordinat dari sisi client. | Tinggi |
| NFR-SEC-06 | Karyawan dengan role `employee` **tidak dapat** mengakses halaman admin (`/dashboard`); akan diredireksikan otomatis ke `/attendance`. | Tinggi |
| NFR-SEC-07 | Data biometrik (face descriptor) disimpan sebagai JSONB terenkripsi di database dan tidak pernah dikirim ke pihak ketiga. | Tinggi |
| NFR-SEC-08 | Sistem mencegah **SQL Injection** dengan menggunakan parameterized query (`$1, $2, ...`) pada semua operasi database. | Tinggi |
| NFR-SEC-09 | Sesi admin otomatis kedaluwarsa jika JWT melewati waktu expired yang ditentukan. | Sedang |
| NFR-SEC-10 | Environment variable sensitif (`DATABASE_URL`, `JWT_SECRET`) **tidak boleh** di-commit ke repositori (dijaga oleh `.gitignore`). | Tinggi |

### 4.2 Performa (Performance)

| ID | Kebutuhan | Target Metrik |
|---|---|---|
| NFR-PERF-01 | Halaman dashboard harus memuat semua data statistik dalam waktu kurang dari **3 detik** pada koneksi broadband normal (≥10 Mbps). | < 3 detik |
| NFR-PERF-02 | Koneksi ke database menggunakan **connection pool** (`pg.Pool`) agar tidak membuat koneksi baru di setiap request. | Pool aktif |
| NFR-PERF-03 | Proses face descriptor matching dilakukan **sepenuhnya di sisi client** (browser) untuk mengurangi beban komputasi server. | Client-side |
| NFR-PERF-04 | API endpoint `/api/dashboard/stats` harus merespons dalam kurang dari **2 detik** bahkan dengan 50 request bersamaan. | < 2 detik |
| NFR-PERF-05 | Tabel kehadiran menggunakan **paginasi server-side** sehingga tidak memuat seluruh data sekaligus (max 20 baris per halaman). | < 500ms |
| NFR-PERF-06 | Ukuran bundle JavaScript yang dikirim ke klien harus diminimalkan melalui **lazy loading** dan code splitting bawaan Next.js. | < 200 KB initial |

### 4.3 Ketersediaan (Availability)

| ID | Kebutuhan | Target |
|---|---|---|
| NFR-AVL-01 | Sistem harus beroperasi dengan uptime minimal **99%** (kurang dari ~7.3 jam downtime per bulan). | 99% uptime |
| NFR-AVL-02 | Klien koneksi database **selalu dirilis** ke pool setelah operasi selesai menggunakan blok `finally { client.release() }`. | Wajib |
| NFR-AVL-03 | Sistem harus menangani kegagalan koneksi database dengan **graceful error response** (HTTP 500 + pesan error) tanpa crash server. | Handled |
| NFR-AVL-04 | Jika model face-api.js gagal dimuat, sistem harus menampilkan **pesan fallback** kepada karyawan agar tidak bingung. | Handled |

### 4.4 Skalabilitas (Scalability)

| ID | Kebutuhan | Target |
|---|---|---|
| NFR-SCL-01 | Sistem harus mendukung minimal **200 karyawan** aktif dengan data kehadiran harian tanpa degradasi performa signifikan. | 200 users |
| NFR-SCL-02 | Database harus mampu menyimpan **log kehadiran 2 tahun** (±200 karyawan × 250 hari kerja × 2 = ±100.000 baris) tanpa masalah. | 100K rows |
| NFR-SCL-03 | Arsitektur berbasis **Next.js API Routes** memungkinkan migrasi mudah ke deployment serverless (Vercel) tanpa refaktor besar. | Serverless-ready |
| NFR-SCL-04 | Kolom yang sering di-query (`user_id`, `check_in_time`) pada tabel `attendance_logs` harus diindeks di database. | Index pada FK |

### 4.5 Kemudahan Penggunaan (Usability)

| ID | Kebutuhan | Kriteria |
|---|---|---|
| NFR-USE-01 | Antarmuka pengguna **responsif** (responsive design) dan mendukung tampilan desktop (≥1024px) maupun tablet/mobile (≥360px). | Responsive |
| NFR-USE-02 | Sistem mendukung dua bahasa (**EN/ID**) yang bisa diubah secara instan tanpa reload penuh halaman. | Zero-reload switch |
| NFR-USE-03 | Seluruh proses check-in karyawan (buka halaman → verifikasi wajah → konfirmasi) dapat diselesaikan dalam kurang dari **60 detik**. | < 60 detik |
| NFR-USE-04 | Setiap pesan error atau sukses ditampilkan dengan jelas menggunakan komponen **toast notification** (`Sonner`) selama minimal 3 detik. | Toast 3 detik |
| NFR-USE-05 | Ikon dan label navigasi sidebar harus **self-explanatory** sehingga admin baru tidak perlu pelatihan untuk navigasi dasar. | Intuitive nav |
| NFR-USE-06 | Seluruh tombol aksi (tambah, hapus, simpan) harus memiliki **loading state** yang terlihat untuk mencegah double-submit. | Loading state |

### 4.6 Keterpeliharaan (Maintainability)

| ID | Kebutuhan |
|---|---|
| NFR-MNT-01 | Seluruh kode ditulis dalam **TypeScript** untuk keamanan tipe statis, deteksi bug lebih awal, dan keterbacaan kode. |
| NFR-MNT-02 | Koneksi database disentralisasi di satu file `lib/db.ts` agar konfigurasi pool mudah diubah tanpa menyentuh banyak file. |
| NFR-MNT-03 | Teks antarmuka (UI strings) dipusatkan di `lib/translations.ts` sehingga penambahan bahasa baru tidak memerlukan perubahan komponen. |
| NFR-MNT-04 | Komponen UI dipisah menjadi file-file independen (`Sidebar.tsx`, `StatsCard.tsx`) agar mudah diuji dan dimodifikasi secara terpisah. |
| NFR-MNT-05 | Setiap API route menggunakan **try-catch-finally** untuk penanganan error yang konsisten dan pencegahan resource leak. |
| NFR-MNT-06 | File konfigurasi environment (`.env.local`) terdokumentasi dalam README sehingga developer baru mudah melakukan setup. |

### 4.7 Portabilitas (Portability)

| ID | Kebutuhan |
|---|---|
| NFR-PORT-01 | Aplikasi dapat di-deploy di berbagai platform hosting Node.js: **Vercel**, **VPS Linux**, atau **Docker container**. |
| NFR-PORT-02 | Database dapat menggunakan PostgreSQL versi 13 ke atas, baik lokal maupun cloud (Neon, Supabase, Timescale). |
| NFR-PORT-03 | Koordinat kantor (latitude/longitude) dapat diubah melalui konfigurasi tanpa harus mengubah source code utama. |

---

## 5. Kebutuhan Lainnya

### 5.1 Kebutuhan Antarmuka Perangkat Keras

| Komponen | Spesifikasi Minimum |
|---|---|
| **Kamera** | Resolusi minimal 720p (HD) untuk akurasi face recognition yang memadai |
| **Processor (Client)** | Dual-core 1.6 GHz atau lebih untuk menjalankan model face-api.js di browser |
| **RAM (Client)** | Minimal 2 GB RAM agar browser tidak crash saat memuat model face recognition |
| **Koneksi Internet** | Minimal 1 Mbps untuk upload selfie dan komunikasi dengan API server |
| **GPS/Lokasi** | Perangkat harus mendukung geolocation browser (GPS hardware atau WiFi positioning) |
| **Server** | Minimal 1 vCPU, 512 MB RAM untuk menjalankan Next.js server (Vercel Free Tier memenuhi ini) |

### 5.2 Kebutuhan Antarmuka Perangkat Lunak

| Komponen | Versi Minimum | Catatan |
|---|---|---|
| Browser | Chrome 90+, Firefox 88+, Edge 90+ | Harus mendukung WebRTC dan Geolocation API |
| Node.js (Server) | 18.x LTS | Required oleh Next.js 16 |
| PostgreSQL | 13.x | Mendukung JSONB untuk face descriptor |
| npm | 8.x | Package manager |

### 5.3 Kebutuhan Antarmuka Komunikasi

- **Protokol:** HTTPS (HTTP dengan TLS/SSL) wajib digunakan di environment produksi.
- **Format Data API:** JSON untuk semua request dan response antara client dan server.
- **Cookie:** Cookie `session_token` menggunakan flag `HttpOnly` dan `Secure` di produksi.
- **Database:** Koneksi melalui PostgreSQL wire protocol dengan connection string berformat `postgresql://user:password@host:port/dbname`.

### 5.4 Kebutuhan Privasi dan Perlindungan Data

| ID | Kebutuhan |
|---|---|
| NFR-PRIV-01 | Data biometrik wajah (face descriptor) **hanya digunakan** untuk keperluan autentikasi kehadiran, tidak dibagikan ke pihak ketiga. |
| NFR-PRIV-02 | Foto selfie karyawan yang diambil saat check-in disimpan dengan URL yang tidak dapat ditebak (gunakan UUID atau hash). |
| NFR-PRIV-03 | Admin **tidak dapat** melihat password karyawan; hanya hash yang disimpan dan tidak ada operasi decode. |
| NFR-PRIV-04 | Log akses dan aktivitas sistem harus dapat dihapus oleh admin untuk pemenuhan hak penghapusan data. |

### 5.5 Kebutuhan Kegagalan dan Pemulihan (Failure & Recovery)

| Skenario Kegagalan | Perilaku Sistem yang Diharapkan |
|---|---|
| Database tidak dapat diakses | API mengembalikan HTTP 500 + pesan error deskriptif; UI menampilkan toast error |
| Kamera tidak tersedia / ditolak | Halaman `/attendance` menampilkan pesan panduan untuk mengaktifkan izin kamera |
| GPS tidak tersedia / ditolak | Tombol check-in dinonaktifkan dengan pesan "Aktifkan lokasi untuk melanjutkan" |
| Model face-api.js gagal dimuat | Sistem menampilkan pesan loading error dan opsi retry tanpa crash halaman |
| Koneksi internet terputus saat check-in | API request gagal; sistem menampilkan toast "Gagal terhubung, coba lagi" |
| JWT kedaluwarsa saat sesi aktif | Middleware me-redirect ke `/login` pada request berikutnya |
| Duplikat check-in | API mengembalikan HTTP 409 + pesan "Anda sudah absen hari ini" |

### 5.6 Kebutuhan Audit dan Logging

| ID | Kebutuhan |
|---|---|
| NFR-AUD-01 | Setiap transaksi check-in berhasil dicatat dengan `check_in_time`, `user_id`, `status`, dan `confidence_score`. |
| NFR-AUD-02 | Setiap penambahan atau penghapusan karyawan harus dapat dilacak melalui kolom `created_at` di tabel `users`. |
| NFR-AUD-03 | Error kritis pada server (database error, API crash) di-log ke console server untuk keperluan debugging. |
| NFR-AUD-04 | Admin dapat melihat riwayat kehadiran lengkap per karyawan melalui halaman Laporan. |

---

## 6. Use Case

### 6.1 Diagram Use Case (Ringkasan)

```
                    ┌─────────────────────────────────────────────────────┐
                    │              SISTEM ABSENSI FAJAR                  │
                    │                                                     │
                    │   ┌─────────────────┐   ┌──────────────────────┐  │
                    │   │   UC-01         │   │   UC-02              │  │
         ┌──────┐   │   │   Login Admin   │   │   Keluar (Logout)    │  │
         │      │───┼──▶│                 │   │                      │  │
         │      │   │   └─────────────────┘   └──────────────────────┘  │
         │ADMIN │   │                                                     │
         │      │   │   ┌─────────────────┐   ┌──────────────────────┐  │
         │      │───┼──▶│   UC-03         │   │   UC-04              │  │
         └──────┘   │   │   Lihat         │   │   Kelola Karyawan    │  │
                    │   │   Dashboard     │   │   (CRUD)             │  │
                    │   └─────────────────┘   └──────────────────────┘  │
                    │                                                     │
                    │   ┌─────────────────┐   ┌──────────────────────┐  │
         ┌──────┐   │   │   UC-05         │   │   UC-06              │  │
         │      │───┼──▶│   Check-in      │   │   Lihat Laporan      │  │
         │KARYA-│   │   │   Absensi       │   │   dan Ekspor PDF     │  │
         │ WAN  │   │   └─────────────────┘   └──────────────────────┘  │
         │      │   │                                                     │
         └──────┘   │   ┌─────────────────┐   ┌──────────────────────┐  │
                    │   │   UC-07         │   │   UC-08              │  │
                    │   │   Daftar Wajah  │   │   Kelola Pengaturan  │  │
         ┌──────┐   │   │   (Enrollment)  │   │   Sistem             │  │
         │ADMIN │───┼──▶│                 │───┤                      │  │
         └──────┘   │   └─────────────────┘   └──────────────────────┘  │
                    │                                                     │
                    └─────────────────────────────────────────────────────┘
```

---

### 6.2 Use Case: UC-01 – Login Admin

| Field | Detail |
|---|---|
| **ID** | UC-01 |
| **Nama** | Login Admin |
| **Aktor** | Admin |
| **Deskripsi** | Admin masuk ke sistem menggunakan email dan password untuk mengakses dashboard manajemen. |
| **Precondition** | Admin belum login; halaman `/login` terbuka. |
| **Postcondition** | Admin berhasil masuk dan diarahkan ke `/dashboard`. |
| **Trigger** | Admin mengakses URL `/login` atau mencoba membuka `/dashboard` tanpa sesi aktif. |

**Alur Normal:**
1. Admin membuka halaman `/login`.
2. Admin mengisi form: **email** dan **password**.
3. Admin menekan tombol **Login**.
4. Sistem mengirim `POST /api/auth/login` dengan kredensial.
5. Server memverifikasi email di database, lalu membandingkan password dengan hash `bcryptjs`.
6. Jika cocok, server membuat **JWT** dan menyimpannya di cookie `session_token`.
7. Sistem mengarahkan admin ke `/dashboard`.

**Alur Alternatif:**
- *4a. Email tidak ditemukan* → sistem menampilkan toast error "Email atau password salah".
- *5a. Password tidak cocok* → sistem menampilkan toast error "Email atau password salah".
- *6a. JWT Secret tidak terkonfigurasi* → sistem menampilkan error 500.

---

### 6.3 Use Case: UC-02 – Logout

| Field | Detail |
|---|---|
| **ID** | UC-02 |
| **Nama** | Logout |
| **Aktor** | Admin |
| **Deskripsi** | Admin mengakhiri sesi aktif dan keluar dari sistem. |
| **Precondition** | Admin sudah login dan berada di halaman dashboard. |
| **Postcondition** | Sesi dihapus; admin diarahkan ke `/login`. |

**Alur Normal:**
1. Admin mengklik ikon profil di header dashboard.
2. Dropdown menu muncul; admin memilih **Logout**.
3. Sistem menampilkan konfirmasi dialog.
4. Admin mengkonfirmasi logout.
5. Sistem menghapus cookie `session_token` dan mengarahkan ke `/login`.

---

### 6.4 Use Case: UC-03 – Lihat Dashboard

| Field | Detail |
|---|---|
| **ID** | UC-03 |
| **Nama** | Lihat Dashboard |
| **Aktor** | Admin |
| **Deskripsi** | Admin memantau statistik kehadiran harian dan log kehadiran terbaru secara real-time. |
| **Precondition** | Admin sudah login sebagai `admin`. |
| **Postcondition** | Admin dapat melihat statistik dan tabel kehadiran terbaru. |

**Alur Normal:**
1. Admin mengakses `/dashboard`.
2. Sistem memanggil `GET /api/dashboard/stats`.
3. Sistem menampilkan **Stats Cards**: Total Karyawan, Hadir Hari Ini (+ attendance rate), Terlambat/Absen.
4. Sistem menampilkan **tabel kehadiran terbaru** (5 baris per halaman).
5. Admin dapat mengubah jumlah baris per halaman (5/10/20) dan navigasi paginasi.
6. Admin dapat **menghapus** catatan kehadiran tertentu dengan mengklik ikon hapus.

---

### 6.5 Use Case: UC-04 – Kelola Karyawan (CRUD)

| Field | Detail |
|---|---|
| **ID** | UC-04 |
| **Nama** | Kelola Karyawan |
| **Aktor** | Admin |
| **Deskripsi** | Admin dapat menambah, melihat, mengedit, dan menghapus data karyawan beserta data biometrik wajahnya. |
| **Precondition** | Admin sudah login. |
| **Postcondition** | Data karyawan tersimpan/diperbarui/dihapus di database. |

**Alur Normal – Tambah Karyawan:**
1. Admin membuka `/dashboard/employees`.
2. Admin mengklik tombol **Add Employee**.
3. Admin mengisi form: nama, email, role, password (opsional).
4. Admin mengambil foto wajah karyawan menggunakan kamera.
5. Sistem mengekstrak **face descriptor** dari foto menggunakan `face-api.js`.
6. Admin mengklik **Simpan**; sistem mengirim `POST /api/employees`.
7. Server meng-hash password, menyimpan data dan face descriptor ke tabel `users`.
8. Sistem menampilkan toast sukses dan memperbarui daftar karyawan.

**Alur Alternatif:**
- *3a. Email sudah terdaftar* → API mengembalikan 409; sistem menampilkan error "Email sudah terdaftar".
- *4a. Tidak ada wajah terdeteksi* → sistem meminta admin untuk mengambil foto ulang.

---

### 6.6 Use Case: UC-05 – Check-in Absensi

| Field | Detail |
|---|---|
| **ID** | UC-05 |
| **Nama** | Check-in Absensi |
| **Aktor** | Karyawan (Employee) |
| **Deskripsi** | Karyawan melakukan absensi masuk harian menggunakan verifikasi wajah dan validasi lokasi GPS. |
| **Precondition** | Karyawan memiliki data wajah terdaftar; browser mendukung kamera dan geolokasi. |
| **Postcondition** | Catatan kehadiran tersimpan di `attendance_logs` dengan status `on_time` atau `late`. |
| **Trigger** | Karyawan membuka halaman `/attendance` saat jam kerja. |

**Alur Normal:**
1. Karyawan membuka halaman `/attendance`.
2. Sistem memuat model face-api.js dan mengaktifkan kamera.
3. Karyawan mengizinkan akses kamera dan geolokasi.
4. Sistem mendeteksi wajah secara real-time di video stream.
5. Karyawan mengklik tombol **Absen Sekarang**; sistem mengambil selfie.
6. Sistem mengekstrak face descriptor dari selfie dan mencocokkan dengan database.
7. Karyawan teridentifikasi; sistem membaca koordinat GPS browser.
8. Sistem mengirim `POST /api/check-in` dengan `{ userId, lat, lng, selfieUrl, confidenceScore }`.
9. Server memvalidasi jarak ke kantor menggunakan formula Haversine.
10. Server memeriksa apakah karyawan sudah check-in hari ini.
11. Server menentukan status (`on_time` / `late`) berdasarkan waktu WIB.
12. Data disimpan ke `attendance_logs`; server mengembalikan respons sukses.
13. Sistem menampilkan konfirmasi "Absensi berhasil dicatat" kepada karyawan.

**Alur Alternatif:**
- *6a. Wajah tidak cocok dengan database* → sistem menampilkan error "Wajah tidak dikenali".
- *9a. Karyawan di luar radius kantor* → API mengembalikan 403; sistem menampilkan "Anda terlalu jauh dari kantor".
- *10a. Karyawan sudah check-in hari ini* → API mengembalikan 409; sistem menampilkan "Anda sudah absen hari ini".
- *3a. Karyawan menolak izin kamera/GPS* → tombol absen dinonaktifkan dengan pesan panduan.

---

### 6.7 Use Case: UC-06 – Lihat Laporan dan Ekspor PDF

| Field | Detail |
|---|---|
| **ID** | UC-06 |
| **Nama** | Lihat Laporan dan Ekspor PDF |
| **Aktor** | Admin |
| **Deskripsi** | Admin menganalisis kehadiran karyawan berdasarkan tanggal dan mengekspor laporan ke format PDF. |
| **Precondition** | Admin sudah login; terdapat data kehadiran di database. |
| **Postcondition** | Admin mendapatkan laporan visual dan/atau file PDF laporan. |

**Alur Normal:**
1. Admin membuka `/dashboard/reports`.
2. Sistem menampilkan laporan hari ini secara default.
3. Admin memilih tanggal melalui filter tanggal.
4. Sistem memanggil `GET /api/dashboard/reports?date=YYYY-MM-DD`.
5. Sistem menampilkan: metrik harian (total karyawan, rata-rata check-in, jumlah absen), pie chart distribusi status, dan tabel ringkasan bulanan.
6. Admin mengklik **Export PDF**.
7. Sistem menggunakan `jsPDF` + `jspdf-autotable` untuk membuat file PDF.
8. Browser mengunduh file PDF laporan secara otomatis.

---

### 6.8 Use Case: UC-07 – Pendaftaran Wajah (Face Enrollment)

| Field | Detail |
|---|---|
| **ID** | UC-07 |
| **Nama** | Pendaftaran Wajah |
| **Aktor** | Admin |
| **Deskripsi** | Admin mendaftarkan data biometrik wajah karyawan baru ke sistem agar dapat digunakan untuk proses check-in. |
| **Precondition** | Admin sudah login; data profil karyawan sudah diisi. |
| **Postcondition** | Face descriptor karyawan tersimpan di kolom `face_descriptor` tabel `users`. |

**Alur Normal:**
1. Admin membuka form tambah/edit karyawan di `/dashboard/employees`.
2. Admin mengklik seksi **Face Enrollment** pada form.
3. Kamera aktif dan menampilkan live video stream.
4. Admin mengarahkan karyawan ke depan kamera hingga wajah terdeteksi.
5. Admin mengklik tombol **Capture**; sistem mengambil gambar dari webcam.
6. Sistem memproses gambar menggunakan `face-api.js` dan mengekstrak vektor face descriptor (128 dimensi).
7. Descriptor disertakan dalam payload saat submit form karyawan.
8. Server menyimpan descriptor ke database sebagai JSONB.

**Alur Alternatif:**
- *4a. Tidak ada wajah terdeteksi dalam frame* → sistem menampilkan pesan "Posisikan wajah di dalam frame".
- *6a. Lebih dari satu wajah terdeteksi* → sistem meminta agar hanya satu orang di depan kamera.

---

### 6.9 Use Case: UC-08 – Kelola Pengaturan Sistem

| Field | Detail |
|---|---|
| **ID** | UC-08 |
| **Nama** | Kelola Pengaturan Sistem |
| **Aktor** | Admin |
| **Deskripsi** | Admin mengonfigurasi parameter operasional sistem seperti radius check-in, jam kerja, dan toleransi keterlambatan. |
| **Precondition** | Admin sudah login. |
| **Postcondition** | Pengaturan baru tersimpan di tabel `settings` dan langsung berlaku untuk check-in berikutnya. |

**Alur Normal:**
1. Admin membuka `/dashboard/settings`.
2. Sistem mengambil pengaturan saat ini dari `GET /api/settings`.
3. Admin mengubah nilai yang diinginkan (radius, jam mulai, toleransi, dll.).
4. Admin mengklik **Save Changes**.
5. Sistem mengirim `POST /api/settings` dengan nilai baru.
6. Server mengupdate tabel `settings` di database.
7. Sistem menampilkan toast "Pengaturan berhasil disimpan".
8. Perubahan berlaku pada proses check-in berikutnya secara real-time.

---

## 5. Arsitektur Sistem

### 7.1 Diagram Arsitektur High-Level

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

### 7.2 Alur Proses Check-in

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

## 8. Desain Database

### 8.1 Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────┐         ┌──────────────────────────────────────┐
│              users              │         │           attendance_logs             │
├─────────────────────────────────┤         ├──────────────────────────────────────┤
│ PK  id           SERIAL         │◄──┐     │ PK  id             SERIAL            │
│     name         VARCHAR(255)   │   │     │ FK  user_id        INT (→ users.id)  │
│     email        VARCHAR(255)   │   └─────│     check_in_time  TIMESTAMP         │
│     role         VARCHAR(50)    │         │     location_lat   DECIMAL(10,8)     │
│     password_hash VARCHAR(255)  │         │     location_lng   DECIMAL(11,8)     │
│     face_descriptor JSONB       │         │     selfie_url     TEXT              │
│     created_at   TIMESTAMP      │         │     status         VARCHAR(20)       │
└─────────────────────────────────┘         │     confidence_score DECIMAL(5,4)   │
                                            └──────────────────────────────────────┘

┌─────────────────────────────────┐
│            settings             │
├─────────────────────────────────┤
│ PK  key     VARCHAR(100)        │
│     value   TEXT                │
└─────────────────────────────────┘
```

### 8.2 Tabel: `users`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID unik |
| `name` | VARCHAR(255) | NOT NULL | Nama lengkap pengguna |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email unik untuk login |
| `role` | VARCHAR(50) | NOT NULL | Role: `admin` atau `employee` |
| `password_hash` | VARCHAR(255) | NOT NULL | Password ter-hash bcrypt |
| `face_descriptor` | JSONB | NULLABLE | Array float 128-dimensi wajah |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Waktu pendaftaran (UTC) |

### 8.3 Tabel: `attendance_logs`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID unik |
| `user_id` | INT | NOT NULL, FK | Referensi ke `users.id` |
| `check_in_time` | TIMESTAMP | DEFAULT NOW() | Waktu check-in (UTC) |
| `location_lat` | DECIMAL(10,8) | NOT NULL | Lintang GPS saat check-in |
| `location_lng` | DECIMAL(11,8) | NOT NULL | Bujur GPS saat check-in |
| `selfie_url` | TEXT | NOT NULL | URL foto selfie karyawan |
| `status` | VARCHAR(20) | NOT NULL | Status: `on_time` atau `late` |
| `confidence_score` | DECIMAL(5,4) | DEFAULT 0 | Skor kemiripan wajah (0.0000–1.0000) |

### 8.4 Tabel: `settings`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `key` | VARCHAR(100) | PRIMARY KEY | Nama kunci konfigurasi |
| `value` | TEXT | NOT NULL | Nilai konfigurasi |

**Key yang tersedia:**

| Key | Default | Deskripsi |
|---|---|---|
| `check_in_radius` | `100` | Radius geofencing dalam meter |
| `office_start_time` | `08:00` | Jam mulai kerja |
| `late_tolerance` | `15` | Toleransi keterlambatan (menit) |
| `office_end_time` | `17:00` | Jam selesai kerja |

### 8.5 Skema DDL (Data Definition Language)

```sql
-- ============================================================
-- SISTEM ABSENSI FAJAR - Database Schema
-- PostgreSQL 13+
-- ============================================================

-- Tabel Pengguna (Admin & Karyawan)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    role          VARCHAR(50)  NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('admin', 'employee')),
    password_hash VARCHAR(255) NOT NULL,
    face_descriptor JSONB,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian karyawan berdasarkan email dan role
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ============================================================

-- Tabel Log Kehadiran
CREATE TABLE IF NOT EXISTS attendance_logs (
    id               SERIAL PRIMARY KEY,
    user_id          INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_time    TIMESTAMP    NOT NULL DEFAULT NOW(),
    location_lat     DECIMAL(10,8) NOT NULL,
    location_lng     DECIMAL(11,8) NOT NULL,
    selfie_url       TEXT         NOT NULL,
    status           VARCHAR(20)  NOT NULL
                     CHECK (status IN ('on_time', 'late')),
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0.0000
);

-- Index untuk performa query dashboard dan laporan
CREATE INDEX IF NOT EXISTS idx_attendance_user_id
    ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time
    ON attendance_logs(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_date_wib
    ON attendance_logs(DATE(check_in_time + INTERVAL '8 hours'));

-- ============================================================

-- Tabel Konfigurasi Sistem
CREATE TABLE IF NOT EXISTS settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Data default konfigurasi
INSERT INTO settings (key, value) VALUES
    ('check_in_radius',   '100'),
    ('office_start_time', '08:00'),
    ('late_tolerance',    '15'),
    ('office_end_time',   '17:00')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Contoh Data Admin Awal
-- (Password: admin123 - gunakan bcrypt hash di produksi!)
-- ============================================================
-- INSERT INTO users (name, email, role, password_hash)
-- VALUES ('Super Admin', 'admin@company.com', 'admin',
--         '$2b$10$xxxHashedPasswordHerexxx');
```

### 8.6 Relasi Antar Tabel

| Relasi | Tipe | Keterangan |
|---|---|---|
| `users` → `attendance_logs` | One-to-Many (1:N) | Satu karyawan dapat memiliki banyak log kehadiran |
| `attendance_logs.user_id` → `users.id` | Foreign Key | Dengan `ON DELETE CASCADE` (hapus user = hapus log kehadirannya) |

---

## 9. Antarmuka Sistem

### 9.1 Antarmuka Pengguna (UI)

| Halaman | Route | Akses | Deskripsi |
|---|---|---|---|
| Login | `/login` | Public | Form login admin |
| Absensi | `/attendance` | Public (Employee) | Halaman check-in dengan kamera |
| Dashboard | `/dashboard` | Admin only | Statistik dan log kehadiran terbaru |
| Karyawan | `/dashboard/employees` | Admin only | Manajemen data karyawan |
| Laporan | `/dashboard/reports` | Admin only | Laporan dan analisis kehadiran |
| Pengaturan | `/dashboard/settings` | Admin only | Konfigurasi sistem |

### 9.2 Antarmuka API

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

### 9.3 Antarmuka Database

Sistem terhubung ke PostgreSQL melalui:
- **`DATABASE_URL`** – connection string PostgreSQL (dari environment variable `.env.local`)
- Connection pool menggunakan library `pg` (node-postgres)
- SSL diaktifkan untuk koneksi cloud database

---

## 10. Diagram UML

> Diagram berikut dibuat menggunakan notasi **PlantUML**. Untuk merendernya, paste kode ke [plantuml.com](https://plantuml.com) atau ekstensi PlantUML di VS Code.

---

### 10.1 Class Diagram

```plantuml
@startuml Class_Diagram

title Class Diagram - Sistem Absensi Fajar

class User {
  +id: int
  +name: string
  +email: string
  +role: string
  +passwordHash: string
  +faceDescriptor: float[]
  +createdAt: DateTime
  --
  +validatePassword(raw: string): boolean
  +hasRole(role: string): boolean
}

class AttendanceLog {
  +id: int
  +userId: int
  +checkInTime: DateTime
  +locationLat: float
  +locationLng: float
  +selfieUrl: string
  +status: StatusEnum
  +confidenceScore: float
  --
  +isOnTime(): boolean
  +getWIBTime(): DateTime
}

class Settings {
  +key: string
  +value: string
  --
  +get(key: string): string
  +set(key: string, val: string): void
}

class AuthService {
  +login(email: string, password: string): JWT
  +verifyToken(token: string): Payload
  +hashPassword(raw: string): string
  +logout(): void
}

class CheckInService {
  -officeCoords: Coordinates
  --
  +calculateDistance(lat: float, lng: float): float
  +validateGeofence(lat: float, lng: float): boolean
  +isDuplicate(userId: int, date: Date): boolean
  +determineStatus(timeWIB: Time): StatusEnum
  +saveLog(data: CheckInPayload): AttendanceLog
}

class FaceRecognitionService {
  +loadModels(): void
  +detectFace(imageData: Blob): FaceDescriptor
  +matchFace(descriptor: float[], database: float[][]): MatchResult
}

class ReportService {
  +getDailyStats(date: Date): DailyStats
  +getMonthlySummary(month: Date): EmployeeSummary[]
  +exportToPDF(data: ReportData): Blob
}

enum StatusEnum {
  ON_TIME
  LATE
}

User "1" o-- "0..*" AttendanceLog : has
AuthService ..> User : uses
CheckInService ..> AttendanceLog : creates
CheckInService ..> Settings : reads
FaceRecognitionService ..> User : reads faceDescriptor
ReportService ..> AttendanceLog : aggregates
ReportService ..> User : reads

@enduml
```

---

### 10.2 Sequence Diagram – Proses Login Admin

```plantuml
@startuml Sequence_Login

title Sequence Diagram: Login Admin

actor Admin
participant "Browser\n/login" as Browser
participant "Next.js Server\n/api/auth/login" as API
participant "PostgreSQL" as DB

Admin -> Browser : Isi email & password, klik Login
Browser -> API : POST /api/auth/login\n{ email, password }
API -> DB : SELECT user WHERE email = ?
DB --> API : user row (id, role, passwordHash)
alt Password Cocok (bcrypt.compare)
  API --> Browser : Set cookie session_token (JWT)\nHTTP 200 OK
  Browser --> Admin : Redirect ke /dashboard
else Password Salah
  API --> Browser : HTTP 401\n{ error: "Invalid credentials" }
  Browser --> Admin : Tampilkan toast error
end

@enduml
```

---

### 10.3 Sequence Diagram – Proses Check-in Karyawan

```plantuml
@startuml Sequence_CheckIn

title Sequence Diagram: Check-in Absensi Karyawan

actor Karyawan
participant "Browser\n/attendance" as Browser
participant "face-api.js" as FaceAPI
participant "Geolocation API" as GeoAPI
participant "Next.js Server\n/api/check-in" as API
participant "PostgreSQL" as DB

Karyawan -> Browser : Buka /attendance
Browser -> FaceAPI : loadModels()
FaceAPI --> Browser : Models loaded ✓
Browser -> Browser : Aktifkan kamera (react-webcam)

Karyawan -> Browser : Klik "Absen Sekarang"
Browser -> FaceAPI : detectFace(selfieBlob)
FaceAPI --> Browser : faceDescriptor[128]
Browser -> DB : GET /api/employees (fetch all descriptors)
DB --> Browser : users[] with faceDescriptors
Browser -> FaceAPI : matchFace(descriptor, database)
alt Wajah Cocok
  FaceAPI --> Browser : { userId, confidenceScore }
  Browser -> GeoAPI : getCurrentPosition()
  GeoAPI --> Browser : { lat, lng }
  Browser -> API : POST /api/check-in\n{ userId, lat, lng, selfieUrl, confidenceScore }
  API -> DB : SELECT settings (radius, startTime, tolerance)
  DB --> API : settings
  API -> API : calculateDistance(lat, lng)
  alt Dalam Radius Kantor
    API -> DB : SELECT attendance_logs WHERE user=today
    DB --> API : existing logs
    alt Belum Check-in Hari Ini
      API -> API : determineStatus(wibTime)
      API -> DB : INSERT INTO attendance_logs
      DB --> API : { id, checkInTime, status }
      API --> Browser : HTTP 200\n{ success, status }
      Browser --> Karyawan : ✅ Absensi Berhasil!
    else Sudah Check-in
      API --> Browser : HTTP 409\n{ error: 'Already checked in today' }
      Browser --> Karyawan : ⚠️ Sudah absen hari ini
    end
  else Di Luar Radius
    API --> Browser : HTTP 403\n{ error: 'Too far from office' }
    Browser --> Karyawan : ❌ Terlalu jauh dari kantor
  end
else Wajah Tidak Cocok
  FaceAPI --> Browser : No match found
  Browser --> Karyawan : ❌ Wajah tidak dikenali
end

@enduml
```

---

### 10.4 Sequence Diagram – Tambah Karyawan Baru

```plantuml
@startuml Sequence_AddEmployee

title Sequence Diagram: Tambah Karyawan Baru

actor Admin
participant "Browser\n/dashboard/employees" as Browser
participant "face-api.js" as FaceAPI
participant "Next.js Server\n/api/employees" as API
participant "PostgreSQL" as DB

Admin -> Browser : Buka halaman Employees
Admin -> Browser : Klik "Add Employee"
Admin -> Browser : Isi form (nama, email, role, password)
Admin -> Browser : Aktifkan kamera, posisikan wajah
Browser -> FaceAPI : detectFace(capturedImage)
FaceAPI --> Browser : faceDescriptor[128]

Admin -> Browser : Klik Simpan
Browser -> API : POST /api/employees\n{ name, email, role, password, faceDescriptor }
API -> API : bcrypt.hash(password, 10)
API -> DB : INSERT INTO users\n(name, email, role, passwordHash, faceDescriptor)
alt Insert Berhasil
  DB --> API : { id, name, email, role }
  API --> Browser : HTTP 201\n{ id, name, email, role }
  Browser --> Admin : ✅ Karyawan berhasil ditambahkan
else Email Duplikat
  DB --> API : Error: UNIQUE violation (code 23505)
  API --> Browser : HTTP 409\n{ error: 'Email already exists' }
  Browser --> Admin : ❌ Email sudah terdaftar
end

@enduml
```

---

### 10.5 Activity Diagram – Proses Absensi Lengkap

```plantuml
@startuml Activity_CheckIn

title Activity Diagram: Alur Lengkap Proses Absensi

|Karyawan|
start
:Buka halaman /attendance;
:Izinkan akses kamera & GPS;

|Browser|
:Muat model face-api.js;
:Tampilkan live video stream;

|Karyawan|
:Klik tombol "Absen Sekarang";

|Browser|
:Ambil foto selfie dari webcam;
:Ekstrak face descriptor (128-dim);
:Ambil semua descriptor dari API;

if (Wajah cocok dengan database?) then (Ya)
  :Identifikasi userId & confidenceScore;
  :Baca koordinat GPS browser;
  :Kirim POST /api/check-in;

  |Server|
  :Baca pengaturan dari tabel settings;
  :Hitung jarak ke kantor (Haversine);

  if (Jarak ≤ radius check-in?) then (Ya)
    :Cek log kehadiran hari ini;

    if (Belum check-in hari ini?) then (Ya)
      :Tentukan status berdasarkan waktu WIB;

      if (Waktu ≤ jam masuk + toleransi?) then (Ya)
        :Set status = ON_TIME;
      else (Tidak)
        :Set status = LATE;
      endif

      :INSERT ke attendance_logs;

      |Browser|
      :Tampilkan ✅ Absensi Berhasil;
    else (Sudah)
      |Browser|
      :Tampilkan ⚠️ Sudah absen hari ini;
    endif
  else (Tidak)
    |Browser|
    :Tampilkan ❌ Terlalu jauh dari kantor;
  endif
else (Tidak)
  |Browser|
  :Tampilkan ❌ Wajah tidak dikenali;
endif

stop

@enduml
```

---

### 10.6 Component Diagram

```plantuml
@startuml Component_Diagram

title Component Diagram - Sistem Absensi Fajar

package "Client Side (Browser)" {
  [Login Page] as Login
  [Attendance Page\n(/attendance)] as AttPage
  [Dashboard] as Dash
  [Employees Page] as EmpPage
  [Reports Page] as RepPage
  [Settings Page] as SetPage
  [Sidebar & Layout] as Layout
  [LanguageProvider\n(React Context)] as Lang
  [face-api.js\n(Face Recognition)] as FaceLib
  [react-webcam\n(Camera Access)] as Webcam
  [jsPDF\n(PDF Export)] as PDF
}

package "Server Side (Next.js API Routes)" {
  [JWT Middleware] as Middleware
  [Auth API\n(/api/auth)] as AuthAPI
  [CheckIn API\n(/api/check-in)] as CheckInAPI
  [Employees API\n(/api/employees)] as EmpAPI
  [Dashboard API\n(/api/dashboard)] as DashAPI
  [Reports API\n(/api/dashboard/reports)] as RepAPI
  [Settings API\n(/api/settings)] as SetAPI
  [Roles API\n(/api/roles)] as RolesAPI
}

package "Data Layer" {
  [DB Pool\n(lib/db.ts)] as DBPool
  database "PostgreSQL" as PostgreSQL {
    [users]
    [attendance_logs]
    [settings]
  }
}

package "External" {
  [Geolocation API\n(Browser API)] as GeoAPI
  [Cloud Storage\n(Selfie URL)] as Storage
}

' Client → Server connections
Login --> AuthAPI
AttPage --> CheckInAPI
AttPage --> EmpAPI
Dash --> DashAPI
EmpPage --> EmpAPI
RepPage --> RepAPI
SetPage --> SetAPI

' Client internal
AttPage --> FaceLib
AttPage --> Webcam
AttPage --> GeoAPI
RepPage --> PDF
Dash --> Layout
EmpPage --> Layout
RepPage --> Layout
SetPage --> Layout
Layout --> Lang

' Middleware protection
Middleware -right--> Dash
Middleware --> EmpPage
Middleware --> RepPage
Middleware --> SetPage

' Server → Data Layer
AuthAPI --> DBPool
CheckInAPI --> DBPool
EmpAPI --> DBPool
DashAPI --> DBPool
RepAPI --> DBPool
SetAPI --> DBPool
RolesAPI --> DBPool
DBPool --> PostgreSQL

' External
CheckInAPI --> Storage : selfie_url

@enduml
```

---

### 10.7 State Diagram – Status Kehadiran Karyawan

```plantuml
@startuml State_Attendance

title State Diagram: Status Kehadiran Karyawan (Per Hari)

[*] --> ABSENT : Hari kerja dimulai

ABSENT --> CHECKING : Karyawan membuka /attendance

state CHECKING {
  [*] --> FaceDetecting : Kamera aktif
  FaceDetecting --> FaceMatched : Wajah cocok
  FaceDetecting --> FaceRejected : Wajah tidak cocok
  FaceMatched --> GeoChecking : GPS dibaca
  GeoChecking --> GeoValid : Dalam radius
  GeoChecking --> GeoInvalid : Di luar radius
  GeoValid --> Submitting : POST /api/check-in
  Submitting --> CheckInSuccess : 200 OK
  Submitting --> CheckInFailed : Error (409/403/500)
}

CHECKING --> ON_TIME : CheckInSuccess + waktu ≤ batas
CHECKING --> LATE : CheckInSuccess + waktu > batas
CHECKING --> ABSENT : FaceRejected /\nGeoInvalid /\nCheckInFailed

ON_TIME --> [*] : Akhir hari
LATE --> [*] : Akhir hari
ABSENT --> [*] : Akhir hari (tidak hadir)

ON_TIME : Tercatat hadir - tepat waktu
LATE : Tercatat hadir - terlambat
ABSENT : Tidak ada log kehadiran

note right of ON_TIME
  status = 'on_time'
  Disimpan di attendance_logs
end note

note right of LATE
  status = 'late'
  Disimpan di attendance_logs
end note

@enduml
```

---

## 11. Batasan Sistem

1. **Ketergantungan Kamera** – Proses check-in hanya dapat dilakukan pada perangkat dengan kamera yang berfungsi dan izin akses kamera diberikan oleh pengguna.
2. **Ketergantungan GPS** – Proses check-in memerlukan akses lokasi GPS; akurasi bergantung pada perangkat dan sinyal GPS.
3. **Face Recognition Berbasis Browser** – Pemrosesan wajah dilakukan sepenuhnya di browser; performa dapat bervariasi tergantung spesifikasi perangkat.
4. **Zona Waktu** – Semua kalkulasi waktu mengacu pada **WIB (UTC+8)**; sistem tidak mendukung multi-zona waktu secara otomatis.
5. **Single Office Location** – Koordinat kantor hardcoded di API; hanya mendukung **satu lokasi kantor** yang dapat dikonfigurasi.
6. **Bahasa** – Hanya mendukung dua bahasa: **Bahasa Inggris** dan **Bahasa Indonesia**.

---

## 12. Asumsi dan Ketergantungan

### 12.1 Asumsi

- Setiap karyawan memiliki wajah yang telah didaftarkan (*enrolled*) ke sistem sebelum dapat melakukan check-in.
- Admin bertanggung jawab atas pendaftaran awal dan pengelolaan data karyawan.
- Karyawan mengakses sistem menggunakan browser modern yang mendukung WebRTC (akses kamera) dan Geolocation API.
- Sistem dijalankan di lingkungan server yang mendukung Node.js dan dapat terhubung ke PostgreSQL.

### 12.2 Ketergantungan Eksternal

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
