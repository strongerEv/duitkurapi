# Membangun Duitku sebagai Aplikasi Android

Duitku dibungkus dengan [Capacitor](https://capacitorjs.com), sehingga satu basis kode
melayani dua jalur sekaligus:

- **Web** — deploy folder `dist/` ke GitHub Pages / Netlify / Vercel
- **Android** — proyek asli di folder `android/`, dibuka dengan Android Studio

Mengubah kode sekali, keduanya ikut terbarui.

---

## Yang perlu disiapkan

- **Android Studio** versi terbaru (JDK 17 sudah termasuk di dalamnya)
- **Node.js 18+**

---

## Langkah membangun

### 1. Ambil kode dan pasang dependensi

```bash
git clone <repositori-ini>
cd testing1
npm install
```

### 2. Buka di Android Studio

```bash
npm run android
```

Perintah itu menjalankan tiga hal sekaligus: `npm run build`, `npx cap sync android`,
lalu membuka Android Studio.

Saat pertama dibuka, **Gradle sync** berjalan otomatis dan mengunduh dependensi.
Ini memakan 5–15 menit sekali saja; sesudahnya jauh lebih cepat.

### 3. Jalankan di perangkat

**Pakai HP asli** — aktifkan *Developer options* → *USB debugging*, sambungkan kabel,
pilih perangkat di daftar, lalu tekan **Run** (▶).

**Pakai emulator** — *Device Manager* → buat perangkat virtual → **Run**.

### 4. Membuat APK untuk dibagikan

**Build → Build Bundle(s)/APK(s) → Build APK(s)**

Hasilnya ada di `android/app/build/outputs/apk/debug/app-debug.apk`.
Berkas ini bisa langsung dikirim dan dipasang orang lain — tidak perlu Play Store.

### 5. Membuat rilis untuk Play Store

1. **Build → Generate Signed Bundle / APK → Android App Bundle**
2. Buat *keystore* baru bila belum punya

   > ⚠️ **Simpan berkas keystore beserta kata sandinya, dan buat cadangannya.**
   > Bila keystore hilang, aplikasi yang sudah terbit **tidak akan pernah bisa
   > diperbarui lagi** — satu-satunya jalan adalah menerbitkan aplikasi baru dari nol.

3. Unggah berkas `.aab` ke [Play Console](https://play.google.com/console)
   (biaya pendaftaran $25, sekali seumur hidup)

Play Store mewajibkan **kebijakan privasi** berupa URL publik, serta pengisian formulir
**Data safety**. Isian yang sesuai untuk Duitku: data disimpan lokal di perangkat, tidak
dikirim ke server mana pun, kecuali ke spreadsheet milik pengguna sendiri bila fitur
sinkronisasi diaktifkan.

---

## Alur pengembangan sehari-hari

```bash
npm run dev           # kembangkan seperti biasa di browser
npm run android:sync  # salin hasil build terbaru ke proyek Android
```

Setelah `android:sync`, tekan **Run** lagi di Android Studio.

Untuk merilis versi baru ke Play Store, naikkan `versionCode` (dan `versionName`)
pada `android/app/build.gradle`, lalu bangun ulang berkas `.aab`.

---

## Perbedaan perilaku web dan Android

Semua perbedaan platform terkumpul di satu berkas: [`src/lib/platform.ts`](src/lib/platform.ts).
Setiap fungsi di sana selalu punya jalur web yang bekerja, sehingga menambah dukungan
Android tidak pernah merusak versi webnya.

| Kemampuan | Web | Android |
|---|---|---|
| Menyimpan PDF & cadangan | Unduhan berkas biasa | Ditulis ke cache lalu dibuka lewat lembar berbagi — bisa disimpan ke Files/Drive atau langsung dikirim lewat WhatsApp |
| Membuka tautan `wa.me` | Tab baru di browser | Intent sistem, langsung membuka aplikasi WhatsApp |
| Penyimpanan data | `localStorage` | `localStorage` + salinan di Preferences, yang ikut serta dalam Android Auto Backup |
| Status bar & splash | — | Warna hijau merek mengikuti tema terang/gelap |

Pemulihan otomatis: bila penyimpanan WebView ternyata kosong saat aplikasi dibuka
(misalnya setelah dibersihkan sistem atau dipasang ulang), Duitku memeriksa salinan di
perangkat dan memulihkan datanya.

---

## Mengganti ikon dan splash

Berkas sumbernya ada di folder `assets/`. Setelah menggantinya, jalankan:

```bash
npx @capacitor/assets generate --android
```

Seluruh ukuran ikon dan splash untuk tiap kerapatan layar dibuat ulang otomatis.

---

## Identitas aplikasi

| Keterangan | Nilai |
|---|---|
| Application ID | `com.duitku.app` |
| Nama aplikasi | Duitku |
| minSdk | 24 (Android 7.0) |
| targetSdk | 36 |

Application ID diubah di `capacitor.config.ts` **dan** `android/app/build.gradle`.
Ubahlah sebelum penerbitan pertama, karena nilai ini tidak bisa diganti setelah aplikasi
terbit di Play Store.
