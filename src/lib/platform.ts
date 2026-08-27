import { Capacitor } from '@capacitor/core';

/**
 * Lapisan tipis yang menyembunyikan perbedaan antara aplikasi Android
 * (Capacitor) dan versi web biasa.
 *
 * Aturannya: setiap fungsi di berkas ini WAJIB tetap bekerja di web. Jalur
 * native hanya dipakai bila benar-benar berjalan di dalam aplikasi, sehingga
 * satu basis kode melayani keduanya tanpa ada yang dikorbankan.
 */

/** True hanya bila kode berjalan di dalam aplikasi Android/iOS. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function platformName(): string {
  return Capacitor.getPlatform();
}

/** Mengubah Blob menjadi base64 murni (tanpa awalan `data:`). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca berkas.'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** Unduhan gaya web: membuat tautan sementara lalu mengekliknya. */
function downloadViaAnchor(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export interface SaveResult {
  /** 'download' di web, 'share' bila lembar berbagi Android terbuka. */
  via: 'download' | 'share';
  fileName: string;
}

/**
 * Menyimpan berkas untuk pengguna.
 *
 * Di web: unduhan biasa lewat tautan.
 * Di Android: `<a download>` tidak berfungsi di dalam WebView, jadi berkas
 * ditulis ke folder cache aplikasi lalu dibuka lewat lembar berbagi — dari
 * situ pengguna bisa menyimpannya ke Files, Drive, atau langsung
 * mengirimkannya lewat WhatsApp.
 */
export async function saveFile(
  blob: Blob,
  fileName: string,
  options?: { title?: string; dialogTitle?: string },
): Promise<SaveResult> {
  if (!isNative()) {
    downloadViaAnchor(blob, fileName);
    return { via: 'download', fileName };
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const data = await blobToBase64(blob);
  // Folder cache adalah lokasi yang dijangkau FileProvider bawaan Capacitor,
  // sehingga aplikasi lain boleh membaca berkas yang dibagikan.
  await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });

  await Share.share({
    title: options?.title ?? fileName,
    url: uri,
    dialogTitle: options?.dialogTitle ?? 'Simpan atau bagikan berkas',
  });

  return { via: 'share', fileName };
}

/**
 * Membuka tautan di luar aplikasi.
 *
 * Di web: tab baru.
 * Di Android: diserahkan ke sistem sebagai intent, sehingga tautan wa.me
 * langsung membuka aplikasi WhatsApp alih-alih memuat halaman web di dalam
 * WebView aplikasi kita.
 */
export async function openExternal(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const { AppLauncher } = await import('@capacitor/app-launcher');
    await AppLauncher.openUrl({ url });
  } catch (err) {
    console.warn('[Duitku] Gagal membuka tautan lewat sistem, memakai cara biasa.', err);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/* ------------------------------------------------------------------ */
/* Cadangan penyimpanan di perangkat Android                           */
/* ------------------------------------------------------------------ */

const MIRROR_KEY = 'duitku_backup_v1';

/**
 * Menyalin data ke Preferences (SharedPreferences) Android.
 *
 * Penyimpanan WebView bisa dibersihkan sistem saat ruang menipis, sedangkan
 * Preferences ikut serta dalam Android Auto Backup — jadi data punya peluang
 * kembali setelah pemasangan ulang. Di web fungsi ini tidak melakukan apa pun.
 */
export async function mirrorToDevice(serialized: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: MIRROR_KEY, value: serialized });
  } catch (err) {
    console.warn('[Duitku] Gagal menyalin cadangan ke perangkat.', err);
  }
}

/** Membaca cadangan perangkat. Mengembalikan null bila tidak ada. */
export async function readDeviceMirror(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: MIRROR_KEY });
    return value ?? null;
  } catch (err) {
    console.warn('[Duitku] Gagal membaca cadangan perangkat.', err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Penyiapan tampilan native                                           */
/* ------------------------------------------------------------------ */

/**
 * Menyesuaikan status bar dan menutup splash screen.
 * Dipanggil sekali saat aplikasi dijalankan; di web tidak berefek apa pun.
 */
export async function initNativeShell(theme: 'light' | 'dark'): Promise<void> {
  if (!isNative()) return;
  try {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
    ]);
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0A1712' : '#12996B' });
    await StatusBar.setStyle({ style: Style.Dark });
    await SplashScreen.hide();
  } catch (err) {
    console.warn('[Duitku] Gagal menyiapkan tampilan native.', err);
  }
}
