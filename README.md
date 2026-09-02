# DheMoney Web

Dashboard web untuk mengelola keuangan pribadi, terhubung ke Google Spreadsheet yang sama dengan bot Telegram DheMoneyBot.

## Struktur Project

```
/
├── index.html          Dashboard
├── transaksi.html       Daftar transaksi + tambah/edit/hapus
├── dompet.html           Kelola dompet (Bank/E-Wallet/Tunai) + saldo per dompet
├── laporan.html          Laporan periode + grafik tren + budget bulanan
├── setup.html            Konfigurasi Web App URL & secret key
├── css/style.css
├── js/
│   ├── config.js         Simpan konfigurasi di localStorage
│   ├── api.js             Wrapper fetch ke GAS Web App
│   ├── dashboard.js
│   ├── transaksi.js
│   ├── dompet.js
│   └── laporan.js
```

## Setup Sheet yang Dibutuhkan (v2: Dompet + Budget)

Sebelum pakai fitur ini, pastikan spreadsheet sudah punya:
- Kolom `Dompet` di ujung sheet `Log` (setelah kolom `ID`)
- Sheet baru `Dompet` dengan header `Nama | Tipe`
- Sheet baru `Budget` dengan header `Bulan | Kategori | Limit`

Dan `Code.gs` di Apps Script sudah diupdate ke versi terbaru (yang menambahkan endpoint wallet & budget).

## Cara Deploy ke GitHub Pages

1. Buat repository baru di GitHub (bisa privat atau publik — repo privat tetap bisa pakai GitHub Pages di plan berbayar, kalau plan gratis harus publik).
2. Upload seluruh isi folder ini ke root repository.
3. Buka **Settings → Pages** di repo tersebut.
4. Di bagian **Source**, pilih branch `main` dan folder `/ (root)`.
5. Klik **Save**. Tunggu 1-2 menit, GitHub akan memberi URL seperti `https://username.github.io/nama-repo/`.
6. Buka URL tersebut — Anda akan diarahkan ke halaman setup untuk memasukkan Web App URL dan Secret Key.

## Catatan Keamanan

- Secret Key yang Anda masukkan di halaman setup tersimpan di **localStorage browser Anda sendiri**, tidak pernah dikirim ke server manapun selain Web App GAS Anda.
- Karena ini adalah static site publik, siapa pun yang tahu URL situs bisa membukanya — tapi tanpa Secret Key yang benar, mereka tidak akan bisa membaca atau menulis data (request akan ditolak dengan "Unauthorized").
- Kalau Anda curiga Secret Key bocor, buat yang baru di Script Properties GAS, lalu update lagi lewat halaman `setup.html` di web app Anda.

## Pengembangan Selanjutnya

Sudah selesai: budgeting per kategori (dengan pesan motivasi otomatis), multi-dompet, caching backend, animasi & micro-interaction (count-up angka, skeleton loading, progress bar animasi), dan optimasi untuk hosting (preconnect, manifest PWA, favicon, halaman 404 custom).

Ide lanjutan lain: export data ke CSV/PDF, edit daftar keyword kategori langsung dari UI, recurring transaction (gaji/tagihan bulanan otomatis), dark mode, dan pindah dana antar dompet (transfer).

## Catatan Optimasi

- Total ukuran project ±104KB (tanpa gambar berat) — ringan untuk dimuat di jaringan apapun.
- Semua path file relatif — aman di-host di subpath manapun (`username.github.io/nama-repo/`).
- `manifest.json` + ikon SVG — bisa di-"Add to Home Screen" di HP, terasa seperti app native.
- `preconnect` ke Google Fonts & cdnjs — mempercepat load font dan Chart.js.
- `404.html` custom — kalau ada yang salah ketik URL, tetap dapat tampilan rapi dengan tombol balik ke Dashboard.
- Animasi menghormati `prefers-reduced-motion` — otomatis nonaktif kalau pengguna set preferensi "reduce motion" di OS mereka.
