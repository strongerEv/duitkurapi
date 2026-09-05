import type { AppData, Category, Settings, Wallet } from '../types';
import { DEFAULT_TEMPLATES } from './wa';

export const DATA_VERSION = 1;

export const DEFAULT_CATEGORIES: Category[] = [
  // Pengeluaran
  { id: 'cat-makan', name: 'Makan & Minum', icon: '🍜', color: '#12996B', type: 'expense', builtIn: true },
  { id: 'cat-belanja', name: 'Belanja', icon: '🛍️', color: '#1FD08A', type: 'expense', builtIn: true },
  { id: 'cat-transport', name: 'Transportasi', icon: '🛵', color: '#0EA5A0', type: 'expense', builtIn: true },
  { id: 'cat-tagihan', name: 'Tagihan', icon: '🧾', color: '#3B82F6', type: 'expense', builtIn: true },
  { id: 'cat-hiburan', name: 'Hiburan', icon: '🎬', color: '#8B5CF6', type: 'expense', builtIn: true },
  { id: 'cat-kesehatan', name: 'Kesehatan', icon: '💊', color: '#EF4444', type: 'expense', builtIn: true },
  { id: 'cat-pendidikan', name: 'Pendidikan', icon: '📚', color: '#F59E0B', type: 'expense', builtIn: true },
  { id: 'cat-rumah', name: 'Rumah', icon: '🏠', color: '#14B8A6', type: 'expense', builtIn: true },
  { id: 'cat-pulsa', name: 'Pulsa & Internet', icon: '📶', color: '#06B6D4', type: 'expense', builtIn: true },
  { id: 'cat-hewan', name: 'Hewan Peliharaan', icon: '🐾', color: '#84CC16', type: 'expense', builtIn: true },
  { id: 'cat-donasi', name: 'Donasi & Zakat', icon: '🤲', color: '#22C55E', type: 'expense', builtIn: true },
  { id: 'cat-bayar-hutang', name: 'Bayar Hutang', icon: '💸', color: '#F97316', type: 'expense', builtIn: true },
  { id: 'cat-beri-pinjam', name: 'Memberi Pinjaman', icon: '🤝', color: '#A855F7', type: 'expense', builtIn: true },
  { id: 'cat-lain-keluar', name: 'Lainnya', icon: '📦', color: '#94A3B8', type: 'expense', builtIn: true },
  // Pemasukan
  { id: 'cat-gaji', name: 'Gaji', icon: '💰', color: '#12996B', type: 'income', builtIn: true },
  { id: 'cat-bonus', name: 'Bonus & THR', icon: '🎁', color: '#1FD08A', type: 'income', builtIn: true },
  { id: 'cat-usaha', name: 'Usaha', icon: '🏪', color: '#0EA5A0', type: 'income', builtIn: true },
  { id: 'cat-freelance', name: 'Freelance', icon: '💻', color: '#3B82F6', type: 'income', builtIn: true },
  { id: 'cat-investasi', name: 'Investasi', icon: '📈', color: '#8B5CF6', type: 'income', builtIn: true },
  { id: 'cat-terima-hutang', name: 'Terima Pembayaran Hutang', icon: '📥', color: '#22C55E', type: 'income', builtIn: true },
  { id: 'cat-pinjaman', name: 'Dana Pinjaman', icon: '🏦', color: '#F59E0B', type: 'income', builtIn: true },
  { id: 'cat-lain-masuk', name: 'Lainnya', icon: '✨', color: '#94A3B8', type: 'income', builtIn: true },
];

export const DEFAULT_WALLETS: Wallet[] = [
  { id: 'wal-cash', name: 'Uang Tunai', icon: '👛', color: '#12996B', initialBalance: 0 },
  { id: 'wal-bank', name: 'Rekening Bank', icon: '🏦', color: '#0EA5A0', initialBalance: 0 },
  { id: 'wal-ewallet', name: 'E-Wallet', icon: '📱', color: '#1FD08A', initialBalance: 0 },
];

export const DEFAULT_SETTINGS: Settings = {
  userName: '',
  currency: 'IDR',
  showDecimals: false,
  hideBalance: false,
  defaultCountryCode: '62',
  reminderTemplates: DEFAULT_TEMPLATES,
  theme: 'light',
  assistantEnabled: true,
  sheetSync: { url: '', token: '' },
};

export function createEmptyData(): AppData {
  return {
    version: DATA_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      reminderTemplates: DEFAULT_TEMPLATES.map((t) => ({ ...t })),
      sheetSync: { ...DEFAULT_SETTINGS.sheetSync },
    },
    wallets: DEFAULT_WALLETS.map((w) => ({ ...w })),
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    debts: [],
    budgets: [],
  };
}

/** Id kategori yang dipakai otomatis saat mencatat pembayaran hutang ke kas. */
export const AUTO_CATEGORY = {
  payDebt: 'cat-bayar-hutang',
  lendMoney: 'cat-beri-pinjam',
  receiveDebt: 'cat-terima-hutang',
  loanIn: 'cat-pinjaman',
};
