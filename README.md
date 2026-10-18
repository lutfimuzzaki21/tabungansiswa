# Tabungan Siswa

Aplikasi web untuk manajemen tabungan siswa yang aman, responsif, dan mudah digunakan untuk lingkungan sekolah.

## Fitur

- Autentikasi dengan Supabase Auth (role: guru/admin dan siswa)
- Manajemen kelas dan siswa
- Transaksi tabungan (setoran, penarikan) dengan upload bukti foto
- Manajemen pinjaman dan pembayaran kembali
- Riwayat transaksi dengan audit trail
- Dashboard untuk guru dan siswa
- Penutupan tabungan dengan tanda tangan digital
- Laporan saldo dan transaksi
- Row Level Security (RLS) untuk keamanan data
- Desain mobile-first dan responsif

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL, Auth, Storage)
- React Hook Form + Zod
- Recharts, date-fns, numeral, jspdf, html2canvas, signature_pad
- Lucide React, Sonner

## Prasyarat

- Node.js 18+ (rekomendasi Node.js 22)
- Akun Supabase (proyek baru atau existing)
- npm atau pnpm

## Konfigurasi Environment Variables

Buat file .env.local berdasarkan .env.example:

`ash
cp .env.example .env.local
`

Isi dengan kredensial Supabase:

`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
`

> **Penting:** Jangan pernah expose SUPABASE_SERVICE_ROLE_KEY ke browser. Gunakan hanya di server-side.

## Setup Supabase

1. Buat proyek baru di [supabase.com](https://supabase.com/)
2. Jalankan migration SQL di Dashboard Supabase > SQL Editor:
   - Upload semua file di folder supabase/migrations/ secara berurutan (berdasarkan timestamp)
3. Buat bucket Storage untuk bukti transaksi:
   - Dashboard > Storage > Create bucket
   - Nama: proofs
   - Public bucket: boleh (dengan RLS), atau gunakan private + signed URL sesuai kebutuhan
4. Atur Storage RLS jika diperlukan untuk melindungi akses file

## Menjalankan Aplikasi Lokal

`ash
npm install
npm run dev
`

Aplikasi akan berjalan di http://localhost:3000

## Build untuk Production

`ash
npm run build
npm run start
`

## Typecheck & Lint

`ash
npm run lint
npx tsc --noEmit
`

## Membuat Akun Guru Pertama (Bootstrap)

Karena registrasi publik tidak disediakan untuk guru, lakukan langkah berikut:

1. Buat user melalui Supabase Auth (Auth > Users > Add user) untuk akun guru pertama
2. Buat record di tabel profiles dengan role 	eacher atau dmin dan link ke user ID tersebut
3. Login dengan akun tersebut melalui aplikasi

## Deployment ke Vercel

1. Push kode ke repository Git
2. Import proyek di [Vercel](https://vercel.com/)
3. Tambahkan environment variables yang sama seperti .env.local
4. Deploy

## Catatan Keamanan

- Semua mutasi divalidasi server-side
- Row Level Security (RLS) diterapkan di semua tabel sensitif
- Upload file divalidasi (tipe dan ukuran)
- Nama file diacak untuk mencegah path traversal
- Tidak ada kredensial yang dikomit ke repository
- Audit log untuk aktivitas penting

## Struktur Proyek

`
tabungansiswa_valid/
├── src/
│   ├── app/                 # App Router pages
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── auth/
│   ├── components/          # UI components
│   │   ├── layout/
│   │   └── ui/
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities & clients
│   │   └── utils/
│   └── types/               # TypeScript types
├── supabase/
│   └── migrations/          # Database migrations
└── public/                  # Static assets
`

## Lisensi

Proyek ini dikembangkan untuk tujuan pendidikan dan manajemen sekolah.
