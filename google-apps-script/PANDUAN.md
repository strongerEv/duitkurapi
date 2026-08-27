# Panduan Integrasi Duitku ↔ Google Spreadsheet

Kirim catatan keuangan Duitku ke spreadsheet milikmu sendiri, tanpa server perantara.
**Perkiraan waktu: 5 menit. Cukup dilakukan sekali.**

> Panduan ini juga tersedia dalam bentuk **PDF** yang bisa diunduh langsung dari aplikasi:
> **Pengaturan → Hubungkan ke Spreadsheet → Unduh Panduan Lengkap (PDF)**

---

## Sekilas cara kerjanya

Duitku menyimpan seluruh datanya di perangkatmu sendiri. Agar data itu bisa dibaca di Google Sheets,
kamu memasang sebuah script kecil di spreadsheet milikmu. Aplikasi lalu mengirim datanya langsung ke
script tersebut.

**Spreadsheet tetap privat.** Yang bisa dihubungi dari luar hanyalah script itu, dan setiap kiriman
wajib membawa token rahasia yang hanya kamu miliki. Tidak ada server perantara, dan tidak ada pihak
ketiga yang menyimpan datamu.

**Yang perlu disiapkan:** akun Google, browser di komputer (langkah Apps Script lebih nyaman di layar
besar), dan aplikasi Duitku yang sudah terbuka. Seluruh proses ini gratis.

---

## Langkah pemasangan

### 1. Siapkan spreadsheet baru

- Buka [sheets.new](https://sheets.new) untuk membuat Google Spreadsheet kosong
- Beri nama sesukamu, misalnya "Keuangan Duitku"
- **Biarkan spreadsheet ini privat.** Jangan dibagikan ke publik

> ⚠️ Data Duitku memuat nama dan nomor WhatsApp orang lain. Membuat spreadsheet menjadi publik berarti
> membocorkan data pribadi mereka.

### 2. Buka editor Apps Script

Dari spreadsheet tadi: menu **Extensions (Ekstensi) → Apps Script**.
Akan terbuka tab baru berisi editor kode dengan berkas bernama `Code.gs`.

### 3. Tempel kode Duitku

- Hapus seluruh isi `Code.gs` bawaan
- Tempel isi [`Code.gs`](Code.gs) dari repositori ini (atau salin dari dalam aplikasi)
- Simpan dengan <kbd>Ctrl</kbd>+<kbd>S</kbd> (<kbd>Cmd</kbd>+<kbd>S</kbd> di Mac)

**Tidak ada satu baris pun di dalam kode yang perlu kamu ubah.**

### 4. Jalankan `setupDatabase`

- Di kotak pilihan fungsi bagian atas editor, pilih **`setupDatabase`**
- Klik **Run**
- Google meminta izin: **Review permissions** → pilih akunmu
- Muncul peringatan *"Google hasn't verified this app"* → **Advanced** →
  **"Go to … (unsafe)"** → **Allow**

> ℹ️ Peringatan "belum diverifikasi" itu wajar dan bukan tanda bahaya. Script ini kamu tulis dan
> jalankan sendiri di akunmu, bukan aplikasi pihak ketiga yang dipublikasikan.

### 5. Salin token yang muncul

Setelah Run selesai, **token** ditampilkan di kotak dialog dan di **Execution log** bagian bawah editor.
Salin token itu.

Lupa token? Buka spreadsheet, pilih menu **Duitku → Lihat Token**.

### 6. Deploy sebagai Web app

**Deploy → New deployment**, klik ikon roda gigi di samping "Select type" lalu pilih **Web app**:

| Kolom | Isi |
|---|---|
| Description | bebas, misalnya `Duitku Sync` |
| Execute as | **Me** (alamat emailmu) |
| Who has access | **Anyone** |

Klik **Deploy**, lalu salin **Web app URL** yang berakhiran `/exec`.

> ⚠️ Pilih **Anyone**, BUKAN "Anyone with Google account". Kalau salah, Google membalas halaman login
> dan aplikasi melaporkan kegagalan akses.
>
> Di layar ini **tidak ada pilihan fungsi** — Apps Script otomatis memakai `doGet` dan `doPost`
> berdasarkan namanya.

### 7. Sambungkan dari aplikasi Duitku

**Pengaturan → Hubungkan ke Spreadsheet** → tempel URL dan token → **Tes Koneksi** → **Kirim ke Spreadsheet**.

---

## Isi spreadsheet setelah tersambung

| Sheet | Isi |
|---|---|
| **Ringkasan** | Saldo, total masuk dan keluar, posisi hutang-piutang, jumlah catatan |
| **Transaksi** | Tanggal, jenis, kategori, dompet, catatan, pemasukan, pengeluaran, kode bulan |
| **Hutang** | Nama, nomor WA, pokok, terbayar, sisa, jatuh tempo, umur, status, riwayat penagihan |
| **Dompet** | Saldo awal, total masuk dan keluar, saldo terkini |
| **Anggaran** | Batas, terpakai, sisa, dan persentase pemakaian bulan berjalan |

Judul kolom dibekukan, filter dipasang otomatis, nominal diberi format mata uang, dan tanggal ditulis
sebagai tanggal asli — jadi langsung bisa dipakai untuk pivot dan grafik.

Setiap sinkronisasi menimpa kelima sheet di atas. **Sheet lain yang kamu buat sendiri tidak pernah disentuh.**

---

## Bila ada yang tidak beres

| Gejala | Cara mengatasi |
|---|---|
| Google mengembalikan halaman login | Setelan "Who has access" belum `Anyone`. Deploy → Manage deployments → ikon pensil → ubah → Deploy |
| Token tidak cocok | Ambil token yang benar lewat menu **Duitku → Lihat Token**, tempel ulang di aplikasi |
| Script belum disiapkan | Fungsi `setupDatabase` belum pernah dijalankan. Buka editor, pilih fungsi itu, klik Run |
| Tidak bisa menghubungi script | Pastikan URL berakhiran `/exec` (bukan `/dev`), perangkat online, deployment belum dihapus |
| Menu Duitku tidak muncul | Muat ulang halaman spreadsheet sekali. Menu dipasang saat spreadsheet dibuka |
| Data lama masih tertinggal | Setiap sinkronisasi menimpa kelima sheet Duitku. Sheet lain buatanmu tidak disentuh |

---

## Merawat token

Token disimpan di **Script Properties** milik spreadsheetmu, bukan di dalam kode. Karena itu token
**tidak ikut tersebar** bila kode aplikasi kamu bagikan ke orang lain.

Menu **Duitku** di spreadsheet menyediakan tiga pilihan:

- **Siapkan Sheet** — menjalankan ulang pemasangan bila ada sheet yang terhapus
- **Lihat Token** — menampilkan token bila kamu lupa
- **Buat Token Baru** — mencabut token lama seketika, misalnya bila token bocor

> ✅ **Mengganti token tidak perlu deploy ulang.** Token dibaca setiap kali permintaan masuk, bukan saat
> deploy. Setelah membuat token baru, cukup perbarui nilainya di aplikasi.

---

## Bila aplikasi ini dipakai bersama

Data antar pengguna **tidak akan tercampur** — setiap orang menyimpan datanya di browser masing-masing,
meski membuka alamat aplikasi yang sama.

> 🚫 **Jangan bagikan URL dan token milikmu.** Setiap orang harus membuat spreadsheet dan menjalankan
> `setupDatabase`-nya sendiri. Bila mereka memakai URL dan token milikmu, seluruh data mereka akan
> tertulis ke spreadsheetmu dan saling menimpa.

---

## Catatan teknis

Aplikasi mengirim JSON dengan `Content-Type: text/plain`. Ini **disengaja** — dengan begitu browser
memperlakukannya sebagai *simple request* dan tidak mengirim preflight `OPTIONS`, yang tidak bisa
dijawab oleh Apps Script. Memakai `application/json` akan selalu gagal CORS.
