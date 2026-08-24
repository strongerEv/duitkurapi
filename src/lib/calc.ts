import type { AppData, Budget, Category, Debt, Transaction, Wallet } from '../types';
import { daysBetween, monthKey, todayISO, yearOf } from './date';

/* ------------------------------------------------------------------ */
/* Hutang                                                              */
/* ------------------------------------------------------------------ */

/** Total yang sudah dibayar untuk sebuah hutang. */
export function debtPaid(debt: Debt): number {
  return debt.payments.reduce((sum, p) => sum + p.amount, 0);
}

/** Sisa hutang yang belum dibayar (tidak pernah negatif). */
export function debtRemaining(debt: Debt): number {
  return Math.max(0, debt.amount - debtPaid(debt));
}

export function debtProgress(debt: Debt): number {
  if (debt.amount <= 0) return 100;
  return Math.min(100, (debtPaid(debt) / debt.amount) * 100);
}

/** Umur hutang dalam hari. */
export function debtAgeDays(debt: Debt): number {
  return Math.max(0, daysBetween(debt.date, todayISO()));
}

export function isOverdue(debt: Debt): boolean {
  if (debt.status === 'paid' || !debt.dueDate) return false;
  return daysBetween(todayISO(), debt.dueDate) < 0;
}

export interface DebtSummary {
  receivableTotal: number;
  receivableRemaining: number;
  payableTotal: number;
  payableRemaining: number;
  activeCount: number;
  overdueCount: number;
  paidCount: number;
  /** Piutang - hutang: posisi bersih. */
  net: number;
}

export function summarizeDebts(debts: Debt[]): DebtSummary {
  const s: DebtSummary = {
    receivableTotal: 0,
    receivableRemaining: 0,
    payableTotal: 0,
    payableRemaining: 0,
    activeCount: 0,
    overdueCount: 0,
    paidCount: 0,
    net: 0,
  };
  for (const d of debts) {
    const remaining = debtRemaining(d);
    if (d.type === 'receivable') {
      s.receivableTotal += d.amount;
      s.receivableRemaining += remaining;
    } else {
      s.payableTotal += d.amount;
      s.payableRemaining += remaining;
    }
    if (d.status === 'paid') s.paidCount += 1;
    else {
      s.activeCount += 1;
      if (isOverdue(d)) s.overdueCount += 1;
    }
  }
  s.net = s.receivableRemaining - s.payableRemaining;
  return s;
}

/* ------------------------------------------------------------------ */
/* Transaksi & saldo                                                   */
/* ------------------------------------------------------------------ */

export function totalByType(transactions: Transaction[], type: Transaction['type']): number {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
}

export function filterByMonth(transactions: Transaction[], key: string): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === key);
}

export function filterByYear(transactions: Transaction[], year: string): Transaction[] {
  return transactions.filter((t) => yearOf(t.date) === year);
}

/** Saldo seluruh dompet = saldo awal + pemasukan - pengeluaran. */
export function totalBalance(wallets: Wallet[], transactions: Transaction[]): number {
  const initial = wallets.filter((w) => !w.archived).reduce((s, w) => s + w.initialBalance, 0);
  const income = totalByType(transactions, 'income');
  const expense = totalByType(transactions, 'expense');
  return initial + income - expense;
}

export function walletBalance(wallet: Wallet, transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.walletId === wallet.id)
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), wallet.initialBalance);
}

export interface CategoryBreakdown {
  category: Category | undefined;
  categoryId: string;
  total: number;
  percent: number;
  count: number;
}

/** Rincian nominal per kategori, sudah diurutkan dari yang terbesar. */
export function breakdownByCategory(
  transactions: Transaction[],
  categories: Category[],
  type: Transaction['type'],
): CategoryBreakdown[] {
  const filtered = transactions.filter((t) => t.type === type);
  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const map = new Map<string, { total: number; count: number }>();
  for (const t of filtered) {
    const cur = map.get(t.categoryId) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    map.set(t.categoryId, cur);
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      category: categories.find((c) => c.id === categoryId),
      total: v.total,
      count: v.count,
      percent: total ? (v.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Deret harian untuk grafik batang. */
export function dailySeries(
  transactions: Transaction[],
  dates: string[],
): { date: string; income: number; expense: number }[] {
  return dates.map((date) => {
    const dayTx = transactions.filter((t) => t.date === date);
    return {
      date,
      income: totalByType(dayTx, 'income'),
      expense: totalByType(dayTx, 'expense'),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Anggaran                                                            */
/* ------------------------------------------------------------------ */

/** Budget yang berlaku untuk bulan tertentu (spesifik mengalahkan global). */
export function budgetFor(budgets: Budget[], categoryId: string | null, month: string): Budget | undefined {
  return (
    budgets.find((b) => b.categoryId === categoryId && b.month === month) ??
    budgets.find((b) => b.categoryId === categoryId && b.month === null)
  );
}

export interface BudgetStatus {
  budget: Budget;
  category?: Category;
  spent: number;
  remaining: number;
  percent: number;
  over: boolean;
}

export function budgetStatuses(data: AppData, month: string): BudgetStatus[] {
  const monthTx = filterByMonth(data.transactions, month).filter((t) => t.type === 'expense');
  const relevant = data.budgets.filter((b) => b.month === month || b.month === null);
  // Hindari duplikat: budget khusus bulan ini mengalahkan budget global.
  const seen = new Set<string>();
  const result: BudgetStatus[] = [];
  for (const b of [...relevant].sort((a) => (a.month ? -1 : 1))) {
    const key = b.categoryId ?? '__total__';
    if (seen.has(key)) continue;
    seen.add(key);
    const spent = b.categoryId
      ? monthTx.filter((t) => t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0)
      : monthTx.reduce((s, t) => s + t.amount, 0);
    result.push({
      budget: b,
      category: b.categoryId ? data.categories.find((c) => c.id === b.categoryId) : undefined,
      spent,
      remaining: b.amount - spent,
      percent: b.amount ? (spent / b.amount) * 100 : 0,
      over: spent > b.amount,
    });
  }
  return result.sort((a, b) => Number(!!a.budget.categoryId) - Number(!!b.budget.categoryId));
}

/* ------------------------------------------------------------------ */
/* Statistik ringkas                                                   */
/* ------------------------------------------------------------------ */

export interface MonthStats {
  income: number;
  expense: number;
  balance: number;
  txCount: number;
  /** Rata-rata pengeluaran per hari berjalan pada bulan tersebut. */
  avgDailyExpense: number;
  topCategory?: CategoryBreakdown;
}

export function monthStats(data: AppData, month: string): MonthStats {
  const tx = filterByMonth(data.transactions, month);
  const income = totalByType(tx, 'income');
  const expense = totalByType(tx, 'expense');
  const breakdown = breakdownByCategory(tx, data.categories, 'expense');
  const [y, m] = month.split('-').map(Number);
  const now = new Date();
  const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m;
  const daysElapsed = isCurrent ? now.getDate() : new Date(y, m, 0).getDate();
  return {
    income,
    expense,
    balance: income - expense,
    txCount: tx.length,
    avgDailyExpense: daysElapsed ? expense / daysElapsed : 0,
    topCategory: breakdown[0],
  };
}
