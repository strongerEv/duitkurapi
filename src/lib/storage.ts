import type { AppData } from '../types';
import { DATA_VERSION, createEmptyData } from './defaults';

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Kuota penuh atau mode privat: jangan sampai aplikasi mati.
    console.warn('[Duitku] Gagal menyimpan data.', err);
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

/** Mengunduh seluruh data sebagai file JSON cadangan. */
export function exportToFile(data: AppData): void {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `duitku-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Membaca file cadangan JSON menjadi AppData. */
export async function importFromFile(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<AppData>;
  if (!parsed || typeof parsed !== 'object') throw new Error('Format file tidak dikenali.');
  return migrate(parsed);
}
