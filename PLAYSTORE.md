# Daftar Persiapan Rilis Play Store

Semua aset dan teks yang dibutuhkan sudah disiapkan di repositori ini.
Tinggal salin-tempel ke Play Console.

---

## ✅ Sudah siap di repositori

| Kebutuhan | Berkas | Ukuran |
|---|---|---|
| Ikon aplikasi | `store/icon-512.png` | 512 × 512 |
| Feature graphic | `store/feature-graphic.png` | 1024 × 500 |
| Tangkapan layar (7 buah) | `store/screenshots/*.png` | 1080 × 1920 |
| Kebijakan privasi | `public/privacy.html` | terbit otomatis lewat GitHub Pages |

Tangkapan layar dibuat dari aplikasi yang benar-benar berjalan, bukan mockup.

---

## ⚠️ Yang masih perlu kamu isi sendiri

1. **Alamat email kontak** pada `public/privacy.html` — cari tulisan
   `[ISI ALAMAT EMAIL KONTAK ANDA DI SINI]` di bagian bawah berkas.
2. **Aktifkan GitHub Pages** agar kebijakan privasi punya URL publik:
   *Settings → Pages → Source: **GitHub Actions*** → dorong ke branch utama.
   URL-nya nanti berbentuk `https://<pengguna>.github.io/<repo>/privacy.html`
3. **Keystore** untuk menandatangani rilis (lihat [`ANDROID.md`](ANDROID.md)).

---

## Teks listing siap pakai

### Nama aplikasi (maks. 30 karakter)
```
Duitku - Catatan Keuangan
```

### Deskripsi singkat (maks. 80 karakter)
```
Catat keuangan pribadi dan tagih hutang langsung lewat WhatsApp. Tanpa akun.
```

### Deskripsi lengkap (maks. 4000 karakter)
```
Duitku membantu kamu mencatat pemasukan dan pengeluaran sehari-hari, sekaligus
mengelola hutang piutang dengan tenang.

MENAGIH HUTANG JADI TIDAK CANGGUNG
Simpan nama dan nomor WhatsApp orang yang meminjam uangmu. Saat waktunya
menagih, cukup tekan satu tombol: WhatsApp terbuka dengan pesan yang sudah
lengkap berisi jumlah pinjaman, sisa yang belum dibayar, dan sudah berapa lama
hutang itu berjalan. Kamu tetap yang menekan tombol kirim, jadi tidak ada pesan
yang terkirim tanpa sepengetahuanmu.

Tersedia lima pilihan nada pesan, dari yang halus sampai tegas, dan kamu bisa
menyusun template sendiri.

CATATAN KEUANGAN YANG RAPI
- Pemasukan dan pengeluaran dengan kategori, dompet, tanggal, dan catatan
- Banyak dompet: uang tunai, rekening bank, e-wallet, atau buatanmu sendiri
- 22 kategori bawaan, bisa ditambah dengan ikon dan warna pilihanmu
- Pencarian dan penyaringan, dikelompokkan rapi per hari

HUTANG DAN PIUTANG
- Dua arah: orang berhutang padamu, atau kamu yang berhutang
- Cicilan bertahap dengan riwayat lengkap
- Penanda otomatis untuk yang lewat jatuh tempo
- Umur hutang dihitung sendiri: "3 hari", "2 bulan 5 hari"

LAPORAN DAN ANGGARAN
- Diagram donat dan batang untuk melihat ke mana uangmu pergi
- Unduh laporan PDF: harian, mingguan, bulanan, tahunan, atau rentang bebas
- Anggaran bulanan per kategori dengan peringatan sebelum jebol

SINKRONISASI GOOGLE SPREADSHEET (OPSIONAL)
Kirim seluruh datamu ke spreadsheet milikmu sendiri untuk diolah lebih lanjut.
Spreadsheet tetap privat dan sepenuhnya milikmu.

PRIVASI SEBAGAI DASAR
Duitku tidak punya server. Seluruh catatanmu tersimpan di perangkatmu sendiri.
Tidak ada akun, tidak ada pendaftaran, tidak ada iklan, tidak ada pelacak.
Datamu tidak pernah kami lihat, karena memang tidak ada jalurnya.

Tersedia mode gelap, pilihan mata uang, serta cadangan data yang bisa diunduh
dan dipulihkan kapan saja.
```

### Kategori
`Keuangan` (Finance)

### Tag
`keuangan pribadi`, `catatan hutang`, `anggaran`, `pengeluaran`

---

## Jawaban formulir Data safety

Formulir ini wajib diisi dan harus jujur. Berikut jawaban yang sesuai dengan
cara kerja Duitku:

| Pertanyaan | Jawaban |
|---|---|
| Apakah aplikasi mengumpulkan atau membagikan data pengguna? | **Tidak** |
| Apakah data dienkripsi saat transit? | Tidak berlaku — tidak ada data yang dikirim ke server pengembang |
| Apakah pengguna dapat meminta penghapusan data? | **Ya** — lewat Pengaturan → Hapus Semua Data, atau dengan menghapus aplikasi |
| Apakah ada data yang dikumpulkan untuk analitik? | **Tidak** |
| Apakah ada iklan? | **Tidak** |

**Penjelasan bila ditanya reviewer:** seluruh data disimpan lokal di perangkat.
Aplikasi hanya memakai jaringan bila pengguna sendiri mengaktifkan sinkronisasi
ke spreadsheet Google miliknya, atau saat membuka WhatsApp untuk mengirim pesan
penagihan yang disusunnya sendiri.

---

## Klasifikasi konten

Isi kuesioner apa adanya. Duitku tidak memuat kekerasan, konten dewasa, judi,
maupun pembelian dalam aplikasi. Hasilnya biasanya **Rating 3+ / Semua umur**.

---

## Urutan pengerjaan

1. Isi email kontak pada `public/privacy.html`
2. Aktifkan GitHub Pages, catat URL kebijakan privasinya
3. Buat keystore dan simpan cadangannya di tempat aman
4. `Build → Generate Signed Bundle / APK → Android App Bundle`
5. Daftar Play Console ($25, sekali seumur hidup)
6. Buat aplikasi baru, unggah berkas `.aab`
7. Isi listing memakai teks dan aset di atas
8. Isi Data safety dan klasifikasi konten
9. Kirim untuk ditinjau — biasanya 1–7 hari

---

## Saat merilis pembaruan

```bash
npm run android:sync
```

Naikkan `versionCode` (dan `versionName`) pada `android/app/build.gradle`,
bangun ulang `.aab`, lalu unggah sebagai rilis baru.

> `versionCode` **wajib** lebih besar dari rilis sebelumnya, jika tidak Play
> Console akan menolak unggahannya.
