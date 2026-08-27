import type { AppData } from '../types';
import { DATA_VERSION, createEmptyData } from './defaults';
import { mirrorToDevice, readDeviceMirror, saveFile } from './platform';

const STORAGE_KEY = 'duitku:data:v1';

/** Membaca data dari localStorage; jatuh ke data kosong bila gagal/korup. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return migrate(parsed);
  } catch (err) {
    console.warn('[Duitku] Gagal membaca data tersimpan, memakai data kosong.', err);
    return createEmptyData();
  }
}

export function saveData(data: AppData): void {
  const serialized = JSON.stringify(data);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    // Kuota penuh atau mode privat: jangan sampai aplikasi mati.
    console.warn('[Duitku] Gagal menyimpan data.', err);
  }
  // Di Android disalin juga ke penyimpanan perangkat; di web tidak berefek.
  void mirrorToDevice(serialized);
}

/**
 * Memulihkan data dari salinan perangkat bila penyimpanan WebView kosong.
 *
 * Android sesekali membersihkan penyimpanan WebView saat ruang menipis, dan
 * pemasangan ulang selalu mengosongkannya. Salinan di Preferences ikut serta
 * dalam Android Auto Backup, sehingga catatan pengguna punya peluang kembali.
 * Mengembalikan data pulihan, atau null bila tidak ada yang perlu dipulihkan.
 */
export async function restoreFromDeviceIfEmpty(current: AppData): Promise<AppData | null> {
  const kosong =
    current.transactions.length === 0 && current.debts.length === 0 && !current.settings.userName;
  if (!kosong) return null;

  const serialized = await readDeviceMirror();
  if (!serialized) return null;

  try {
    const parsed = migrate(JSON.parse(serialized) as Partial<AppData>);
    const adaIsinya =
      parsed.transactions.length > 0 || parsed.debts.length > 0 || Boolean(parsed.settings.userName);
    if (!adaIsinya) return null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.warn('[Duitku] Salinan perangkat tidak bisa dibaca.', err);
    return null;
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[Duitku] Gagal menghapus data.', err);
  }
}

/**
 * Menggabungkan data tersimpan dengan struktur terbaru sehingga field baru
 * selalu punya nilai default dan data lama tetap terpakai.
 */
export function migrate(input: Partial<AppData>): AppData {
  const base = createEmptyData();
  const settings = { ...base.settings, ...(input.settings ?? {}) };
  if (!Array.isArray(settings.reminderTemplates) || settings.reminderTemplates.length === 0) {
    settings.reminderTemplates = base.settings.reminderTemplates;
  }
  // Data lama belum mengenal sinkronisasi spreadsheet.
  settings.sheetSync = { ...base.settings.sheetSync, ...(input.settings?.sheetSync ?? {}) };
  return {
    version: DATA_VERSION,
    settings,
    wallets: Array.isArray(input.wallets) && input.wallets.length ? input.wallets : base.wallets,
    categories:
      Array.isArray(input.categories) && input.categories.length ? mergeCategories(base.categories, input.categories) : base.categories,
    transactions: Array.isArray(input.transactions) ? input.transactions : [],
    debts: Array.isArray(input.debts)
      ? input.debts.map((d) => ({
          ...d,
          payments: Array.isArray(d.payments) ? d.payments : [],
          reminders: Array.isArray(d.reminders) ? d.reminders : [],
        }))
      : [],
    budgets: Array.isArray(input.budgets) ? input.budgets : [],
  };
}

/** Kategori bawaan baru tetap ditambahkan tanpa menghapus kategori buatan user. */
function mergeCategories(defaults: AppData['categories'], saved: AppData['categories']) {
  const savedIds = new Set(saved.map((c) => c.id));
  const missingBuiltIns = defaults.filter((c) => c.builtIn && !savedIds.has(c.id));
  return [...saved, ...missingBuiltIns];
}

/** Menyimpan seluruh data sebagai berkas JSON cadangan. */
export async function exportToFile(data: AppData): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const fileName = `duitku-backup-${stamp}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  await saveFile(blob, fileName, { title: 'Cadangan Duitku', dialogTitle: 'Simpan cadangan' });
  return fileName;
}

/** Membaca file cadangan JSON menjadi AppData. */
export async function importFromFile(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<AppData>;
  if (!parsed || typeof parsed !== 'object') throw new Error('Format file tidak dikenali.');
  return migrate(parsed);
}
