import type { AppData, Debt, Transaction } from '../types';
import { createEmptyData } from './defaults';
import { toISODate } from './date';
import { uid } from './id';

/** Membuat data contoh agar aplikasi langsung terasa hidup saat pertama dibuka. */
export function createDemoData(userName = 'Sobat Duitku'): AppData {
  const data = createEmptyData();
  data.settings.userName = userName;
  data.wallets = [
    { id: 'wal-cash', name: 'Uang Tunai', icon: '👛', color: '#12996B', initialBalance: 750_000 },
    { id: 'wal-bank', name: 'Rekening Bank', icon: '🏦', color: '#0EA5A0', initialBalance: 6_500_000, accountNumber: '••• 1160' },
    { id: 'wal-ewallet', name: 'E-Wallet', icon: '📱', color: '#1FD08A', initialBalance: 320_000 },
  ];

  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return toISODate(d);
  };

  const tx = (
    type: Transaction['type'],
    amount: number,
    categoryId: string,
    walletId: string,
    offset: number,
    note?: string,
  ): Transaction => ({
    id: uid('tx-'),
    type,
    amount,
    categoryId,
    walletId,
    date: day(offset),
    note,
    createdAt: Date.now() - offset * 86_400_000,
  });

  data.transactions = [
    tx('income', 8_500_000, 'cat-gaji', 'wal-bank', 24, 'Gaji bulanan'),
    tx('income', 1_750_000, 'cat-freelance', 'wal-bank', 18, 'Proyek desain logo'),
    tx('income', 450_000, 'cat-usaha', 'wal-ewallet', 9, 'Penjualan online'),
    tx('expense', 1_850_000, 'cat-tagihan', 'wal-bank', 22, 'Sewa kos bulanan'),
    tx('expense', 236_000, 'cat-belanja', 'wal-ewallet', 20, 'Belanja bulanan'),
    tx('expense', 42_000, 'cat-makan', 'wal-cash', 16, 'Makan siang'),
    tx('expense', 185_000, 'cat-transport', 'wal-ewallet', 14, 'Isi bensin'),
    tx('expense', 54_000, 'cat-hiburan', 'wal-bank', 12, 'Langganan Netflix'),
    tx('expense', 200_000, 'cat-hewan', 'wal-cash', 10, 'Makanan kucing & vitamin'),
    tx('expense', 320_000, 'cat-kesehatan', 'wal-bank', 8, 'Vitamin & obat'),
    tx('expense', 98_000, 'cat-pulsa', 'wal-ewallet', 6, 'Paket data'),
    tx('expense', 67_500, 'cat-makan', 'wal-cash', 4, 'Kopi & camilan'),
    tx('expense', 149_000, 'cat-belanja', 'wal-ewallet', 3, 'Skincare'),
    tx('expense', 35_000, 'cat-transport', 'wal-cash', 2, 'Ojek online'),
    tx('expense', 88_000, 'cat-makan', 'wal-ewallet', 1, 'Makan malam bareng teman'),
    tx('expense', 25_000, 'cat-makan', 'wal-cash', 0, 'Sarapan'),
  ];

  const debt = (
    type: Debt['type'],
    personName: string,
    phone: string,
    amount: number,
    ageDays: number,
    dueInDays: number | null,
    note: string,
    paid: number[] = [],
  ): Debt => {
    const payments = paid.map((amt, i) => ({
      id: uid('pay-'),
      amount: amt,
      date: day(Math.max(0, ageDays - (i + 1) * 7)),
      note: `Cicilan ke-${i + 1}`,
      createdAt: Date.now(),
    }));
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const dueDate = dueInDays === null ? undefined : day(-dueInDays);
    return {
      id: uid('debt-'),
      type,
      personName,
      phone,
      amount,
      date: day(ageDays),
      dueDate,
      note,
      payments,
      reminders: [],
      status: totalPaid >= amount ? 'paid' : 'active',
      createdAt: Date.now() - ageDays * 86_400_000,
      paidAt: totalPaid >= amount ? Date.now() : undefined,
    };
  };

  data.debts = [
    debt('receivable', 'Budi Santoso', '081234567890', 1_500_000, 62, 7, 'Pinjam untuk servis motor', [300_000]),
    debt('receivable', 'Siti Aminah', '081298765432', 500_000, 21, 14, 'Talangan belanja bareng'),
    debt('receivable', 'Rian Pratama', '085712345678', 2_000_000, 95, -12, 'Modal usaha kecil', [500_000, 250_000]),
    debt('payable', 'Kak Dewi', '081377889900', 750_000, 30, 10, 'Pinjam buat bayar kos'),
    debt('receivable', 'Andi Wijaya', '081155667788', 250_000, 45, null, 'Uang makan siang kantor', [250_000]),
  ];

  data.budgets = [
    { id: uid('bud-'), categoryId: null, amount: 6_000_000, month: null },
    { id: uid('bud-'), categoryId: 'cat-makan', amount: 1_500_000, month: null },
    { id: uid('bud-'), categoryId: 'cat-belanja', amount: 1_000_000, month: null },
    { id: uid('bud-'), categoryId: 'cat-transport', amount: 600_000, month: null },
  ];

  return data;
}
