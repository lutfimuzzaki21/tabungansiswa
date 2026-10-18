# Tabungan Siswa

Aplikasi web untuk mengelola tabungan siswa, transaksi kas, pinjaman dana, dan laporan keuangan sekolah dalam satu dashboard.

> Dibangun untuk operasional sekolah yang membutuhkan pencatatan saldo yang rapi, akses berbasis peran, dan tampilan yang nyaman di desktop maupun mobile.

## Fitur Utama

- Dashboard terpisah untuk admin, guru, dan siswa
- Manajemen data siswa, kelas, dan profil pengguna
- Setoran dan penarikan tabungan dengan saldo atomik
- Upload bukti transaksi yang opsional
- Pencarian siswa saat mencatat transaksi
- Pinjaman dana guru dan pencatatan pembayaran kembali
- Riwayat transaksi dan audit log
- Laporan saldo, total setoran, dan total penarikan per siswa
- Ekspor laporan ke format `.xlsx`
- Penutupan tabungan dengan tanda tangan digital
- Supabase Row Level Security (RLS)
- Layout responsif untuk desktop dan mobile

## Tech Stack

- [Next.js 15](https://nextjs.org/) dengan App Router
- TypeScript, React 19, dan Tailwind CSS
- [Supabase](https://supabase.com/) untuk PostgreSQL, Auth, Storage, dan RPC
- Base UI dan komponen UI lokal
- `xlsx` untuk ekspor laporan
- Vitest untuk pengujian
- Lucide React, date-fns, Sonner, dan Signature Pad

## Persyaratan

- Node.js 18 atau lebih baru
- npm
- Project Supabase

## Quick Start

```bash
git clone https://github.com/lutfimuzzaki21/tabungansiswa.git
cd tabungansiswa
npm install
```

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Jalankan aplikasi development:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Setup Database Supabase

Untuk membuat database baru, gunakan file utama berikut:

```text
supabase/full_migration.sql
```

Jalankan seluruh isinya di **Supabase Dashboard > SQL Editor**. File ini mencakup:

- Tabel dan enum aplikasi
- Trigger profile dan rekening siswa
- RPC transaksi tabungan
- RPC pinjaman guru dan pembayaran
- Row Level Security
- Storage bucket `proofs` dan policy terkait

Folder `supabase/migrations/` berisi migration historis dan berguna sebagai referensi perubahan bertahap. Untuk project baru, gunakan `full_migration.sql` sebagai sumber setup utama.

### Akun Admin atau Guru Pertama

1. Buat user melalui **Supabase Dashboard > Authentication > Users**.
2. Salin UUID user tersebut.
3. Buat atau sesuaikan record pada tabel `profiles` dengan role `admin` atau `teacher`.
4. Login melalui halaman aplikasi.

Contoh query setelah user dibuat:

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Administrator'
WHERE id = 'USER_UUID';
```

## Perintah Development

```bash
# Menjalankan development server
npm run dev

# Menjalankan lint
npm run lint

# Menjalankan test
npm test

# Build production
npm run build

# Menjalankan hasil build
npm run start
```

## Struktur Project

```text
src/
├── app/
│   ├── (auth)/          # Halaman login
│   ├── (dashboard)/     # Halaman utama aplikasi
│   └── auth/            # Route autentikasi
├── components/          # Layout dan komponen UI
├── hooks/               # React hooks
├── lib/                 # Supabase client dan utility
└── types/               # TypeScript types
supabase/
├── full_migration.sql   # Setup database baru
└── migrations/          # Migration historis
tests/                   # Unit dan validation tests
```

## Keamanan

- Jangan commit `.env.local` atau secret Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh digunakan di server-side.
- RLS membatasi akses data berdasarkan role pengguna.
- Validasi nominal, tipe file, dan ukuran file dilakukan sebelum data diproses.
- RPC transaksi menjaga perubahan saldo tetap atomik.

## Deployment

Project dapat di-deploy ke Vercel atau platform Node.js lainnya:

1. Push repository ke Git provider.
2. Import project ke [Vercel](https://vercel.com/).
3. Tambahkan environment variables yang sama dengan `.env.local`.
4. Deploy project.

## Lisensi

Project ini dikembangkan untuk kebutuhan pendidikan dan manajemen operasional sekolah.
