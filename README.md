<div align="center">

# 💚 Duitku

**Aplikasi pencatat keuangan pribadi & manajemen hutang dengan penagihan langsung via WhatsApp.**

Dibuat dengan React + TypeScript + Vite · Tanpa server · Data 100% di perangkatmu

</div>

---

## ✨ Apa itu Duitku?

Duitku adalah aplikasi web (PWA) mobile-first untuk mencatat keuangan sehari-hari.
Bedanya dengan aplikasi keuangan lain: **Duitku punya fitur penagihan hutang otomatis lewat WhatsApp.**

Simpan nama dan nomor WA orang yang berhutang, lalu cukup tekan satu tombol —
WhatsApp terbuka dengan pesan penagihan yang sudah lengkap berisi **nominal hutang,
sisa yang belum dibayar, sudah berapa lama hutang berjalan, dan status jatuh temponya.**

---

## 🚀 Fitur Lengkap

### 📒 Pencatatan Keuangan
- **Transaksi pemasukan & pengeluaran** dengan nominal, kategori, dompet, tanggal, dan catatan
- **Multi-dompet** — uang tunai, rekening bank, e-wallet, atau dompet buatanmu sendiri, masing-masing dengan saldo terpisah
- **22 kategori bawaan** (makan, transportasi, tagihan, gaji, freelance, dll.) plus kategori kustom dengan ikon & warna sendiri
- **Pencarian & filter** berdasarkan bulan, jenis, kategori, dompet, atau kata kunci
- **Pengelompokan per hari** dengan subtotal masuk/keluar di setiap tanggal
- **Sembunyikan saldo** sekali tekan saat sedang di tempat umum

### 🤝 Hutang & Piutang
- Dua arah: **piutang** (orang berhutang ke kamu) dan **hutang** (kamu berhutang ke orang)
- Simpan **nama, nomor WhatsApp, nominal, tanggal pinjam, jatuh tempo, dan keperluan**
- **Cicilan / pembayaran sebagian** dengan riwayat lengkap berbentuk timeline
- **Progress bar & ring** untuk melihat berapa persen sudah terbayar
- **Deteksi jatuh tempo otomatis** — kartu berubah merah saat lewat tempo, dan yang paling mendesak naik ke atas
- **Umur hutang** dihitung otomatis: "3 hari", "2 minggu", "3 bulan 5 hari", "1 tahun 2 bulan"
- Opsi **catat ke arus kas** — uang yang dipinjamkan/dibayar ikut memengaruhi saldo dompet
- **Riwayat penagihan** — setiap pesan WA yang pernah dikirim tersimpan lengkap dengan isinya

### 📱 Penagihan Langsung ke WhatsApp
Ini fitur andalannya:

1. Buka catatan hutang → tekan **"Tagih Sekarang via WhatsApp"**
2. Pilih nada pesan: **Halus, Tegas, Pengingat Jatuh Tempo, Tawaran Cicilan,** atau **Ucapan Terima Kasih**
3. Lihat pratinjau persis seperti tampilan chat WhatsApp — boleh diedit dulu kalau mau
4. Tekan kirim → WhatsApp terbuka ke nomor yang benar dengan **pesan sudah terisi otomatis**

**Normalisasi nomor otomatis.** Ketik `0812-3456-7890`, `+62 812 3456 7890`, atau `812 3456 7890` —
semuanya dirapikan ke format WhatsApp internasional `6281234567890`. Kode negara bisa diganti di Pengaturan.

**Template bisa dikustom** dengan 12 placeholder yang diganti otomatis:

| Placeholder | Diganti dengan |
|---|---|
| `{nama}` | Nama lengkap yang berhutang |
| `{panggilan}` | Nama depan saja |
| `{total}` | Total hutang awal |
| `{sisa}` | Sisa yang belum dibayar |
| `{terbayar}` | Jumlah yang sudah dibayar |
| `{lama}` | Lama hutang, contoh: `2 bulan 5 hari` |
| `{hari}` | Lama hutang dalam angka hari |
| `{tanggal}` | Tanggal hutang dibuat |
| `{jatuhtempo}` | Tanggal jatuh tempo |
| `{statustempo}` | Contoh: `sudah telat 3 hari` |
| `{catatan}` | Catatan/keperluan hutang |
| `{pengirim}` | Namamu, sebagai tanda tangan |

Contoh hasil jadinya:

> Halo Rian 👋
>
> Maaf mengganggu waktunya. Saya mau mengingatkan soal pinjaman sebesar **Rp2.000.000** pada tanggal 21 Mei 2026 (3 bulan 5 hari yang lalu).
>
> Sisa yang belum dilunasi: **Rp1.250.000**
> Sudah dibayar: Rp750.000
>
> Kalau sudah ada rezekinya, boleh dibantu diselesaikan ya 🙏
> Terima kasih banyak!
>
> — Evan

> **Catatan privasi:** Duitku hanya *membuka* WhatsApp dengan pesan yang sudah jadi.
> Kamu tetap yang menekan tombol kirim, jadi tidak ada pesan terkirim tanpa sepengetahuanmu.

### 📊 Sinkronisasi ke Google Sheets
Duitku bisa mengirim seluruh datanya ke spreadsheet milikmu sendiri, otomatis, tanpa server perantara.

**Spreadsheet tetap privat.** Yang diakses dari luar hanya sebuah Apps Script kecil yang kamu pasang
sendiri di spreadsheet itu, dan setiap kiriman wajib membawa token rahasiamu. Ini penting, karena data
Duitku memuat nama dan nomor WhatsApp orang lain — jangan pernah membuat spreadsheetnya publik.

Lima sheet yang ditulis (ditimpa setiap sinkronisasi):

| Sheet | Isi |
|---|---|
| **Ringkasan** | Saldo, total masuk/keluar, posisi hutang-piutang, jumlah catatan |
| **Transaksi** | Tanggal, jenis, kategori, dompet, catatan, pemasukan, pengeluaran, kode bulan |
| **Hutang** | Nama, nomor WA, pokok, terbayar, sisa, tanggal, jatuh tempo, umur, status, riwayat penagihan |
| **Dompet** | Saldo awal, total masuk/keluar, saldo terkini |
| **Anggaran** | Batas, terpakai, sisa, persentase bulan berjalan |

Judul kolom dibekukan, filter dipasang otomatis, kolom nominal diberi format mata uang, dan tanggal
ditulis sebagai tanggal asli — jadi langsung bisa dibuat pivot atau grafik. Sheet lain buatanmu sendiri
tidak pernah disentuh.

**Cara memasang** — panduan lengkapnya ada di dalam aplikasi (Pengaturan → Hubungkan ke Spreadsheet),
lengkap dengan tombol salin kode. **Tidak ada satu baris pun di `Code.gs` yang perlu diubah:**

1. Buat spreadsheet baru, biarkan privat
2. Extensions → Apps Script, tempel isi [`google-apps-script/Code.gs`](google-apps-script/Code.gs)
3. Pilih fungsi **`setupDatabase`** di kotak pilihan atas editor → **Run** → izinkan akses
4. Token muncul di dialog dan di Execution log — salin
5. Deploy → New deployment → **Web app**, dengan **Who has access: Anyone**
   (di sini tidak ada pilihan fungsi; Apps Script memakai `doGet`/`doPost` otomatis)
6. Tempel URL `/exec` dan token di aplikasi, tekan **Tes Koneksi** lalu **Kirim ke Spreadsheet**

Token dibuat acak oleh script dan disimpan di **Script Properties**, bukan di dalam kode. Setelah
spreadsheet dimuat ulang sekali, tersedia menu **Duitku** di spreadsheet berisi *Siapkan Sheet*,
*Lihat Token*, dan *Buat Token Baru*. Mengganti token **tidak memerlukan deploy ulang** — cukup
perbarui nilainya di aplikasi.

> **Catatan teknis:** Duitku mengirim JSON dengan `Content-Type: text/plain`. Ini disengaja —
> dengan begitu browser memperlakukannya sebagai *simple request* dan tidak mengirim preflight
> `OPTIONS`, yang tidak bisa dijawab oleh Apps Script. Memakai `application/json` akan selalu gagal CORS.

### 📄 Unduh Laporan PDF
- **Periode fleksibel**: harian, mingguan (Senin–Minggu), bulanan, tahunan, atau **rentang tanggal bebas**
- **Pilih isi laporannya sendiri** lewat 7 saklar: ringkasan, grafik arus kas, rincian kategori, daftar transaksi, posisi dompet, anggaran, dan hutang-piutang
- **Pratinjau sebelum unduh** — jumlah transaksi, total masuk/keluar, dan rentang tanggalnya langsung terlihat
- Isi berkas PDF-nya:
  - Kop hijau berisi nama pemilik catatan, periode, dan tanggal pembuatan
  - Kartu ringkasan pemasukan, pengeluaran, dan selisih
  - Tabel statistik: jumlah transaksi, rata-rata harian, rasio tabungan, pengeluaran terbesar
  - **Diagram batang** arus kas dan **diagram donat** per kategori — digambar sebagai vektor asli, tajam saat dicetak
  - Tabel transaksi lengkap beserta total di bawahnya
  - Posisi tiap dompet: saldo awal, mutasi periode, saldo terkini
  - Bar pemakaian anggaran per kategori
  - Daftar hutang-piutang aktif lengkap dengan nomor WA, sisa, umur hutang, dan **kotak sorot untuk yang lewat jatuh tempo**
  - Nomor halaman otomatis di setiap lembar
- Nama berkas rapi otomatis, contoh: `Duitku-Laporan-Bulanan-2026-08-01-sd-2026-08-31.pdf`
- Pustaka PDF dimuat **hanya saat dipakai**, jadi aplikasi tetap ringan saat dibuka biasa

Cocok untuk arsip pribadi, laporan ke pasangan, lampiran pengajuan pinjaman, atau sekadar dicetak.
Bisa dibuka dari **Laporan → ikon unduh** atau **Pengaturan → Laporan PDF**.

### 📊 Laporan & Analisis
- **Donut chart** rincian pengeluaran/pemasukan per kategori beserta persentasenya
- **Bar chart** perbandingan masuk vs keluar, tampilan mingguan (7 hari) atau bulanan (12 bulan)
- **Periode bulanan & tahunan** dengan navigasi bulan maju-mundur
- **Ringkasan cerdas**: rata-rata pengeluaran harian, kategori terboros, hari paling boros, rasio tabungan, dan posisi bersih hutang-piutang

### 🎯 Anggaran
- Batas belanja **total** dan **per kategori**
- Berlaku **setiap bulan** atau **khusus bulan tertentu**
- Indikator warna: hijau (aman) → kuning (>80%) → merah (jebol) lengkap dengan sisa/kelebihannya

### ⚙️ Lain-lain
- 🌙 **Mode gelap** penuh
- 💾 **Ekspor & impor cadangan** dalam format JSON
- 💱 Dukungan mata uang: IDR, USD, EUR, SGD, MYR
- 📲 **PWA** — bisa dipasang di layar utama HP dan dibuka seperti aplikasi biasa
- 🔒 **Tanpa server, tanpa akun, tanpa tracking.** Semua data disimpan di `localStorage` perangkatmu

---

## 🛠️ Menjalankan Aplikasi

Butuh **Node.js 18+**.

```bash
# 1. Install dependency
npm install

# 2. Jalankan mode pengembangan
npm run dev
# buka http://localhost:5173

# 3. Build untuk produksi
npm run build

# 4. Pratinjau hasil build
npm run preview
```

### Deploy

Hasil build ada di folder `dist/` dan sepenuhnya statis — bisa langsung di-hosting di
GitHub Pages, Netlify, Vercel, Cloudflare Pages, atau server apa pun.

Aplikasi memakai `HashRouter` dan `base: './'`, jadi **tidak perlu konfigurasi rewrite di server.**

---

## 📁 Struktur Proyek

```
src/
├── main.tsx                    Titik masuk aplikasi
├── App.tsx                     Shell & routing
├── index.css                   Design system (tema hijau, light & dark)
├── types.ts                    Definisi tipe data inti
│
├── lib/
│   ├── wa.ts                   ★ Normalisasi nomor WA, render template, buat link wa.me
│   ├── pdf.ts                  ★ Penyusun laporan PDF (tata letak, tabel, grafik vektor)
│   ├── sheets.ts               ★ Penyusun & pengirim data ke Google Sheets
│   ├── calc.ts                 Perhitungan saldo, hutang, anggaran, statistik
│   ├── date.ts                 Format tanggal Indonesia & "lama hutang" versi manusia
│   ├── format.ts               Format mata uang & input nominal
│   ├── storage.ts              Persistensi localStorage, migrasi, ekspor/impor
│   ├── defaults.ts             Kategori, dompet, dan pengaturan bawaan
│   └── id.ts                   Pembuat id unik
│
├── store/
│   └── AppContext.tsx          Seluruh state & aksi aplikasi (React Context)
│
├── components/
│   ├── WhatsAppReminder.tsx    ★ Penyusun pesan penagihan + pratinjau gaya WA
│   ├── ExportReportSheet.tsx   ★ Pemilih periode & isi laporan sebelum diunduh PDF
│   ├── Charts.tsx              Donut, bar, progress bar, progress ring (SVG murni)
│   ├── Common.tsx              Ikon kategori, avatar, baris transaksi, input nominal
│   ├── Sheet.tsx               Bottom sheet & dialog konfirmasi
│   ├── Toast.tsx               Notifikasi singkat
│   ├── BottomNav.tsx           Navigasi bawah
│   └── Icons.tsx               Ikon SVG inline
│
└── pages/
    ├── Onboarding.tsx          Layar sambutan
    ├── Dashboard.tsx           Beranda: saldo, ringkasan, tagihan mendesak
    ├── Transactions.tsx        Daftar transaksi + filter
    ├── TransactionForm.tsx     Tambah/ubah transaksi
    ├── Debts.tsx               Daftar hutang & piutang
    ├── DebtForm.tsx            Tambah/ubah catatan hutang
    ├── DebtDetail.tsx          Detail, cicilan, riwayat penagihan
    ├── Reports.tsx             Laporan & grafik
    ├── Budgets.tsx             Anggaran bulanan
    ├── Settings.tsx            Pengaturan & cadangan data
    ├── Categories.tsx          Kelola kategori
    ├── Wallets.tsx             Kelola dompet
    └── Templates.tsx           Kelola template pesan penagihan
```

Tidak ada library chart, UI kit, atau state manager eksternal — hanya React, React Router,
dan CSS. Ukuran bundle utama sekitar **93 KB gzip**; jsPDF (~129 KB gzip) dimuat terpisah
dan baru diunduh browser saat pengguna benar-benar membuat laporan PDF.

---

## 💡 Tips Pemakaian

- Baru pertama buka? Pilih **"Coba dengan Data Contoh"** untuk melihat semua fitur langsung terisi.
- Isi **saldo awal dompet** di Pengaturan → Dompet supaya total saldo langsung akurat.
- Saat mencatat piutang, aktifkan **"Catat ke arus kas"** agar uang yang dipinjamkan ikut mengurangi saldo.
- Buat template penagihanmu sendiri di **Pengaturan → Template Penagihan** — pratinjaunya langsung terlihat.
- **Unduh cadangan** secara berkala. Data hanya ada di browser ini; kalau riwayat browser dibersihkan, data ikut hilang.
- Mau laporan ringkas saja? Di panel unduh PDF, tekan **"Ringkas saja"** untuk hanya menyertakan ringkasan dan daftar transaksi.

---

## 📄 Lisensi

MIT — bebas dipakai, diubah, dan disebarkan.
