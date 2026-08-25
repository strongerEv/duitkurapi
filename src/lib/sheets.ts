import type { AppData } from '../types';
import { debtAgeDays, debtPaid, debtRemaining, isOverdue, totalBalance, totalByType, walletBalance, budgetStatuses } from './calc';
import { currentMonthKey, formatDate, todayISO } from './date';
import { normalizePhone } from './wa';

/** Versi kontrak data yang dipahami Code.gs. Naikkan bila skema berubah. */
export const SYNC_VERSION = 1;

/**
 * `text` memaksa format teks di Sheets (menjaga nomor WA & kode bulan tetap utuh),
 * sedangkan `auto` membiarkan Sheets menafsirkan sendiri — dipakai pada kolom
 * yang isinya bercampur angka dan kata.
 */
export type ColumnType = 'text' | 'auto' | 'date' | 'currency' | 'number' | 'percent';

export interface SheetColumn {
  header: string;
  type: ColumnType;
  width?: number;
}

export interface SheetSpec {
  name: string;
  columns: SheetColumn[];
  rows: (string | number)[][];
  filter?: boolean;
}

export interface SyncPayload {
  app: 'duitku';
  action: 'sync' | 'ping';
  version: number;
  token: string;
  generatedAt: string;
  currencyFormat: string;
  sheets: SheetSpec[];
}

export interface SyncResult {
  ok: boolean;
  message: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  sheets?: { name: string; rows: number }[];
  error?: string;
}

/** Format angka Google Sheets untuk tiap mata uang. */
const CURRENCY_FORMAT: Record<AppData['settings']['currency'], string> = {
  IDR: '"Rp"#,##0',
  USD: '"$"#,##0.00',
  EUR: '"€"#,##0.00',
  SGD: '"S$"#,##0.00',
  MYR: '"RM"#,##0.00',
};

/* ------------------------------------------------------------------ */
/* Penyusunan data                                                     */
/* ------------------------------------------------------------------ */

/** Menyusun seluruh data Duitku menjadi lembar-lembar siap tulis. */
export function buildSheets(data: AppData): SheetSpec[] {
  return [
    buildRingkasan(data),
    buildTransaksi(data),
    buildHutang(data),
    buildDompet(data),
    buildAnggaran(data),
  ];
}

function buildRingkasan(data: AppData): SheetSpec {
  const tx = data.transactions;
  const income = totalByType(tx, 'income');
  const expense = totalByType(tx, 'expense');
  const aktif = data.debts.filter((d) => d.status === 'active');
  const piutang = aktif.filter((d) => d.type === 'receivable').reduce((s, d) => s + debtRemaining(d), 0);
  const hutang = aktif.filter((d) => d.type === 'payable').reduce((s, d) => s + debtRemaining(d), 0);

  const rows: (string | number)[][] = [
    ['Pemilik catatan', data.settings.userName || '-'],
    ['Terakhir disinkronkan', formatDate(todayISO())],
    ['Jumlah transaksi', tx.length],
    ['Total pemasukan (sepanjang waktu)', income],
    ['Total pengeluaran (sepanjang waktu)', expense],
    ['Saldo seluruh dompet', totalBalance(data.wallets, tx)],
    ['Piutang belum tertagih', piutang],
    ['Hutang belum dibayar', hutang],
    ['Posisi bersih hutang-piutang', piutang - hutang],
    ['Catatan hutang aktif', aktif.length],
    ['Hutang lewat jatuh tempo', aktif.filter(isOverdue).length],
    ['Jumlah dompet', data.wallets.filter((w) => !w.archived).length],
    ['Jumlah kategori', data.categories.length],
  ];

  return {
    name: 'Ringkasan',
    filter: false,
    columns: [
      { header: 'Keterangan', type: 'text', width: 260 },
      // Kolom ini memuat angka dan teks sekaligus, jadi dibiarkan ditafsirkan
      // Sheets supaya nominalnya tetap berupa angka yang bisa dihitung.
      { header: 'Nilai', type: 'auto', width: 180 },
    ],
    rows,
  };
}

function buildTransaksi(data: AppData): SheetSpec {
  const rows = [...data.transactions]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date)))
    .map((t) => {
      const cat = data.categories.find((c) => c.id === t.categoryId);
      const wal = data.wallets.find((w) => w.id === t.walletId);
      return [
        t.date,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        cat?.name ?? 'Lainnya',
        wal?.name ?? '-',
        t.note ?? '',
        t.type === 'income' ? t.amount : 0,
        t.type === 'expense' ? t.amount : 0,
        t.date.slice(0, 7),
      ];
    });

  return {
    name: 'Transaksi',
    columns: [
      { header: 'Tanggal', type: 'date', width: 95 },
      { header: 'Jenis', type: 'text', width: 100 },
      { header: 'Kategori', type: 'text', width: 150 },
      { header: 'Dompet', type: 'text', width: 130 },
      { header: 'Catatan', type: 'text', width: 240 },
      { header: 'Pemasukan', type: 'currency', width: 120 },
      { header: 'Pengeluaran', type: 'currency', width: 120 },
      { header: 'Bulan', type: 'text', width: 80 },
    ],
    rows,
  };
}

function buildHutang(data: AppData): SheetSpec {
  const rows = [...data.debts]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
    })
    .map((d) => {
      const terakhirTagih = d.reminders[0]
        ? new Date(d.reminders[0].sentAt).toISOString().slice(0, 10)
        : '';
      return [
        d.type === 'receivable' ? 'Piutang (orang hutang ke saya)' : 'Hutang (saya berhutang)',
        d.personName,
        d.phone ? `+${normalizePhone(d.phone, data.settings.defaultCountryCode)}` : '',
        d.amount,
        debtPaid(d),
        debtRemaining(d),
        d.date,
        d.dueDate ?? '',
        debtAgeDays(d),
        d.status === 'paid' ? 'Lunas' : isOverdue(d) ? 'Lewat jatuh tempo' : 'Berjalan',
        d.payments.length,
        d.reminders.length,
        terakhirTagih,
        d.note ?? '',
      ];
    });

  return {
    name: 'Hutang',
    columns: [
      { header: 'Jenis', type: 'text', width: 200 },
      { header: 'Nama', type: 'text', width: 150 },
      { header: 'Nomor WhatsApp', type: 'text', width: 140 },
      { header: 'Pokok', type: 'currency', width: 120 },
      { header: 'Terbayar', type: 'currency', width: 120 },
      { header: 'Sisa', type: 'currency', width: 120 },
      { header: 'Tanggal Pinjam', type: 'date', width: 110 },
      { header: 'Jatuh Tempo', type: 'date', width: 110 },
      { header: 'Umur (hari)', type: 'number', width: 90 },
      { header: 'Status', type: 'text', width: 140 },
      { header: 'Jml Cicilan', type: 'number', width: 90 },
      { header: 'Kali Ditagih', type: 'number', width: 90 },
      { header: 'Terakhir Ditagih', type: 'date', width: 120 },
      { header: 'Catatan', type: 'text', width: 240 },
    ],
    rows,
  };
}

function buildDompet(data: AppData): SheetSpec {
  const rows = data.wallets.map((w) => [
    w.name,
    w.accountNumber ?? '',
    w.initialBalance,
    totalByType(data.transactions.filter((t) => t.walletId === w.id), 'income'),
    totalByType(data.transactions.filter((t) => t.walletId === w.id), 'expense'),
    walletBalance(w, data.transactions),
    w.archived ? 'Diarsipkan' : 'Aktif',
  ]);

  return {
    name: 'Dompet',
    columns: [
      { header: 'Nama Dompet', type: 'text', width: 160 },
      { header: 'No. Rekening', type: 'text', width: 130 },
      { header: 'Saldo Awal', type: 'currency', width: 130 },
      { header: 'Total Masuk', type: 'currency', width: 130 },
      { header: 'Total Keluar', type: 'currency', width: 130 },
      { header: 'Saldo Saat Ini', type: 'currency', width: 140 },
      { header: 'Status', type: 'text', width: 100 },
    ],
    rows,
  };
}

function buildAnggaran(data: AppData): SheetSpec {
  const month = currentMonthKey();
  const rows = budgetStatuses(data, month).map((s) => [
    month,
    s.category ? s.category.name : 'Total semua kategori',
    s.budget.amount,
    s.spent,
    s.remaining,
    s.budget.amount > 0 ? s.spent / s.budget.amount : 0,
    s.over ? 'Lewat anggaran' : 'Aman',
  ]);

  return {
    name: 'Anggaran',
    columns: [
      { header: 'Bulan', type: 'text', width: 90 },
      { header: 'Kategori', type: 'text', width: 200 },
      { header: 'Batas', type: 'currency', width: 130 },
      { header: 'Terpakai', type: 'currency', width: 130 },
      { header: 'Sisa', type: 'currency', width: 130 },
      { header: 'Persentase', type: 'percent', width: 100 },
      { header: 'Status', type: 'text', width: 130 },
    ],
    rows,
  };
}

/* ------------------------------------------------------------------ */
/* Komunikasi dengan Apps Script                                       */
/* ------------------------------------------------------------------ */

/** Memastikan URL yang dimasukkan pengguna memang endpoint web app. */
export function isValidScriptUrl(url: string): boolean {
  const trimmed = (url || '').trim();
  return /^https:\/\/script\.google(usercontent)?\.com\/macros\/s\/[\w-]+\/exec/.test(trimmed);
}

/**
 * Menerjemahkan kegagalan jaringan menjadi pesan yang bisa ditindaklanjuti,
 * karena `fetch` hanya melaporkan "Failed to fetch" untuk banyak sebab berbeda.
 */
function explainFailure(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch|network|load failed/i.test(msg)) {
    return (
      'Tidak bisa menghubungi script. Periksa: (1) URL berakhiran /exec, ' +
      '(2) saat Deploy, "Who has access" disetel ke Anyone, ' +
      '(3) perangkat sedang tersambung internet.'
    );
  }
  return msg;
}

/** Membaca balasan Apps Script; balasan berupa HTML berarti izin deploy salah. */
async function readResponse(res: Response): Promise<SyncResult> {
  const text = await res.text();
  try {
    return JSON.parse(text) as SyncResult;
  } catch {
    if (/<html|<!doctype/i.test(text)) {
      return {
        ok: false,
        error: 'AKSES_DITOLAK',
        message:
          'Google mengembalikan halaman login, bukan data. Buka Deploy → Manage deployments → Edit, ' +
          'lalu setel "Who has access" menjadi Anyone dan deploy ulang.',
      };
    }
    return { ok: false, error: 'BALASAN_TIDAK_DIKENAL', message: 'Balasan script tidak dikenali.' };
  }
}

/** Menguji koneksi dan kecocokan token tanpa mengubah isi spreadsheet. */
export async function testConnection(url: string, token: string): Promise<SyncResult> {
  if (!isValidScriptUrl(url)) {
    return { ok: false, error: 'URL_TIDAK_VALID', message: 'URL harus berupa Web app Apps Script yang berakhiran /exec.' };
  }
  try {
    const target = `${url.trim()}?action=ping&token=${encodeURIComponent(token)}`;
    const res = await fetch(target, { method: 'GET', redirect: 'follow' });
    return await readResponse(res);
  } catch (err) {
    return { ok: false, error: 'GAGAL_TERHUBUNG', message: explainFailure(err) };
  }
}

/**
 * Mengirim seluruh data ke spreadsheet.
 *
 * Content-Type sengaja `text/plain`: dengan begitu browser memperlakukannya
 * sebagai permintaan sederhana dan tidak mengirim preflight OPTIONS, yang
 * tidak bisa dijawab oleh Apps Script.
 */
export async function syncToSheets(url: string, token: string, data: AppData): Promise<SyncResult> {
  if (!isValidScriptUrl(url)) {
    return { ok: false, error: 'URL_TIDAK_VALID', message: 'URL harus berupa Web app Apps Script yang berakhiran /exec.' };
  }
  if (!token.trim()) {
    return { ok: false, error: 'TOKEN_KOSONG', message: 'Token belum diisi.' };
  }

  const payload: SyncPayload = {
    app: 'duitku',
    action: 'sync',
    version: SYNC_VERSION,
    token,
    generatedAt: new Date().toISOString(),
    currencyFormat: CURRENCY_FORMAT[data.settings.currency] ?? '#,##0',
    sheets: buildSheets(data),
  };

  try {
    const res = await fetch(url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    return await readResponse(res);
  } catch (err) {
    return { ok: false, error: 'GAGAL_MENGIRIM', message: explainFailure(err) };
  }
}

/** Perkiraan jumlah baris yang akan ditulis, untuk ditampilkan sebelum kirim. */
export function countRows(data: AppData): number {
  return buildSheets(data).reduce((sum, s) => sum + s.rows.length, 0);
}
