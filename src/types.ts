/** Tipe data inti aplikasi Duitku. */

export type TxType = 'income' | 'expense';

/** Kategori transaksi (pemasukan atau pengeluaran). */
export interface Category {
  id: string;
  name: string;
  /** Emoji sebagai ikon kategori. */
  icon: string;
  /** Warna aksen (hex) untuk chart & badge. */
  color: string;
  type: TxType;
  /** Kategori bawaan tidak bisa dihapus, hanya diubah. */
  builtIn?: boolean;
}

/** Dompet / sumber dana: cash, bank, e-wallet. */
export interface Wallet {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Saldo awal ketika dompet dibuat. */
  initialBalance: number;
  /** Nomor rekening / nomor e-wallet (opsional, hanya untuk catatan). */
  accountNumber?: string;
  archived?: boolean;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  walletId: string;
  /** Tanggal transaksi, format ISO `YYYY-MM-DD`. */
  date: string;
  note?: string;
  createdAt: number;
  /** Diisi otomatis saat transaksi dibuat dari pembayaran hutang. */
  debtId?: string;
}

export type DebtType =
  /** Piutang: orang lain berhutang kepada kita. */
  | 'receivable'
  /** Hutang: kita berhutang kepada orang lain. */
  | 'payable';

export type DebtStatus = 'active' | 'paid';

/** Cicilan / pembayaran sebagian atas sebuah hutang. */
export interface DebtPayment {
  id: string;
  amount: number;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  note?: string;
  createdAt: number;
  /** Id transaksi yang tercatat di arus kas (bila dicatat ke kas). */
  transactionId?: string;
}

/** Catatan penagihan yang pernah dikirim lewat WhatsApp. */
export interface ReminderLog {
  id: string;
  sentAt: number;
  /** Isi pesan yang dikirim (setelah placeholder diganti). */
  message: string;
  channel: 'whatsapp';
}

export interface Debt {
  id: string;
  type: DebtType;
  /** Nama orang yang berhutang / memberi hutang. */
  personName: string;
  /** Nomor WhatsApp seperti yang diketik user (contoh: 0812xxxx). */
  phone: string;
  /** Nominal pokok hutang. */
  amount: number;
  /** Tanggal hutang dibuat, ISO `YYYY-MM-DD`. */
  date: string;
  /** Tanggal jatuh tempo, ISO `YYYY-MM-DD`. Opsional. */
  dueDate?: string;
  note?: string;
  payments: DebtPayment[];
  reminders: ReminderLog[];
  status: DebtStatus;
  createdAt: number;
  /** Diisi saat lunas. */
  paidAt?: number;
}

/** Anggaran bulanan. `categoryId` null berarti budget total semua kategori. */
export interface Budget {
  id: string;
  categoryId: string | null;
  amount: number;
  /** Bulan berlaku, format `YYYY-MM`. Null = berlaku setiap bulan. */
  month: string | null;
}

export interface Settings {
  userName: string;
  currency: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR';
  /** Tampilkan angka desimal pada nominal. */
  showDecimals: boolean;
  /** Sembunyikan nominal saldo di dashboard. */
  hideBalance: boolean;
  /** Kode negara default untuk normalisasi nomor WA, contoh `62`. */
  defaultCountryCode: string;
  /** Template pesan penagihan. Mendukung placeholder, lihat `lib/wa.ts`. */
  reminderTemplates: MessageTemplate[];
  theme: 'light' | 'dark';
}

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  builtIn?: boolean;
}

/** Seluruh state aplikasi yang dipersistensi ke localStorage. */
export interface AppData {
  version: number;
  settings: Settings;
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  debts: Debt[];
  budgets: Budget[];
}
