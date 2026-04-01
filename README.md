# Absensi Fajar

Sistem absensi karyawan berbasis Next.js (App Router) dengan backend API route dan database PostgreSQL.

## Menjalankan Project

1. Install dependency:

	npm install

2. Siapkan file env (contoh di bawah).

3. Jalankan development server:

	npm run dev

4. Buka http://localhost:3000

## Konfigurasi Database (Supabase)

Project ini mendukung 2 variabel koneksi:

- SUPABASE_DB_URL (prioritas utama)
- DATABASE_URL (fallback)

Contoh isi .env.local:

SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
PGSSLMODE=require
PGSSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=ganti-dengan-secret-yang-aman

Catatan:

- Untuk lingkungan lokal tanpa SSL, set PGSSLMODE=disable.
- Jangan commit file .env* karena berisi kredensial.

## Migrasi dari TigerData ke Supabase

1. Buat project baru di Supabase.
2. Ambil connection string PostgreSQL dari menu Connect.
3. Set connection string tersebut ke SUPABASE_DB_URL pada .env.local.
4. Jalankan inisialisasi schema:

	node scripts/setup-db.js

5. Seed admin:

	node scripts/seed-admin.js

6. Jika perlu migrasi role dinamis:

	node scripts/migrate-roles.js

7. Pindahkan data lama (opsional) dengan dump/restore PostgreSQL:

	pg_dump "<tigerdata_url>" --format=custom --no-owner --no-privileges --file=tiger.dump
	pg_restore --no-owner --no-privileges --dbname="<supabase_url>" tiger.dump

## Stack

- Next.js 16
- React 19
- PostgreSQL via pg
