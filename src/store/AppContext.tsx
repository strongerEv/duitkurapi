import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppData,
  Budget,
  Category,
  Debt,
  DebtPayment,
  MessageTemplate,
  Settings,
  Transaction,
  Wallet,
} from '../types';
import { loadData, restoreFromDeviceIfEmpty, saveData } from '../lib/storage';
import { initNativeShell } from '../lib/platform';
import { uid } from '../lib/id';
import { todayISO } from '../lib/date';
import { debtPaid } from '../lib/calc';
import { AUTO_CATEGORY } from '../lib/defaults';

interface AppContextValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  replaceAll: (next: AppData) => void;

  // Transaksi
  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Hutang
  addDebt: (input: Omit<Debt, 'id' | 'createdAt' | 'payments' | 'reminders' | 'status'>, recordCashFlow?: boolean) => Debt;
  updateDebt: (id: string, patch: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addPayment: (
    debtId: string,
    input: Omit<DebtPayment, 'id' | 'createdAt'>,
    options?: { recordCashFlow?: boolean; walletId?: string },
  ) => void;
  deletePayment: (debtId: string, paymentId: string) => void;
  logReminder: (debtId: string, message: string) => void;
  markDebtPaid: (debtId: string, options?: { recordCashFlow?: boolean; walletId?: string }) => void;

  // Kategori & dompet
  addCategory: (input: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addWallet: (input: Omit<Wallet, 'id'>) => Wallet;
  updateWallet: (id: string, patch: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;

  // Anggaran
  upsertBudget: (input: Omit<Budget, 'id'> & { id?: string }) => void;
  deleteBudget: (id: string) => void;

  // Pengaturan
  updateSettings: (patch: Partial<Settings>) => void;
  upsertTemplate: (tpl: MessageTemplate) => void;
  deleteTemplate: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const saveTimer = useRef<number | undefined>(undefined);

  // Simpan ke localStorage dengan debounce agar mengetik cepat tidak berat.
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveData(data), 200);
    return () => window.clearTimeout(saveTimer.current);
  }, [data]);

  // Ikuti tema pada elemen root.
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  // Sesuaikan status bar aplikasi Android dan tutup splash screen.
  useEffect(() => {
    void initNativeShell(data.settings.theme);
  }, [data.settings.theme]);

  // Pada aplikasi Android, penyimpanan WebView bisa terhapus sistem. Bila
  // ternyata kosong, coba pulihkan dari salinan di perangkat.
  useEffect(() => {
    let batal = false;
    void restoreFromDeviceIfEmpty(loadData()).then((pulihan) => {
      if (pulihan && !batal) setData(pulihan);
    });
    return () => {
      batal = true;
    };
    // Sengaja hanya sekali saat aplikasi dijalankan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replaceAll = useCallback((next: AppData) => {
    setData(next);
    saveData(next);
  }, []);

  /* ---------------- Transaksi ---------------- */

  const addTransaction = useCallback((input: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tx: Transaction = { ...input, id: uid('tx-'), createdAt: Date.now() };
    setData((d) => ({ ...d, transactions: [tx, ...d.transactions] }));
    return tx;
  }, []);

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setData((d) => ({
      ...d,
      transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
  }, []);

  /* ---------------- Hutang ---------------- */

  const addDebt = useCallback<AppContextValue['addDebt']>((input, recordCashFlow = false) => {
    const debt: Debt = {
      ...input,
      id: uid('debt-'),
      payments: [],
      reminders: [],
      status: 'active',
      createdAt: Date.now(),
    };
    setData((d) => {
      const next: AppData = { ...d, debts: [debt, ...d.debts] };
      if (recordCashFlow) {
        // Piutang = uang keluar dari kas kita. Hutang = uang masuk ke kas kita.
        const isReceivable = debt.type === 'receivable';
        const tx: Transaction = {
          id: uid('tx-'),
          type: isReceivable ? 'expense' : 'income',
          amount: debt.amount,
          categoryId: isReceivable ? AUTO_CATEGORY.lendMoney : AUTO_CATEGORY.loanIn,
          walletId: d.wallets[0]?.id ?? 'wal-cash',
          date: debt.date,
          note: isReceivable
            ? `Pinjaman ke ${debt.personName}`
            : `Pinjaman dari ${debt.personName}`,
          createdAt: Date.now(),
          debtId: debt.id,
        };
        next.transactions = [tx, ...next.transactions];
      }
      return next;
    });
    return debt;
  }, []);

  const updateDebt = useCallback((id: string, patch: Partial<Debt>) => {
    setData((d) => ({ ...d, debts: d.debts.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      debts: d.debts.filter((x) => x.id !== id),
      // Transaksi kas yang lahir dari hutang ini ikut dibersihkan.
      transactions: d.transactions.filter((t) => t.debtId !== id),
    }));
  }, []);

  const addPayment = useCallback<AppContextValue['addPayment']>((debtId, input, options) => {
    setData((d) => {
      const debt = d.debts.find((x) => x.id === debtId);
      if (!debt) return d;

      const payment: DebtPayment = { ...input, id: uid('pay-'), createdAt: Date.now() };
      let transactions = d.transactions;

      if (options?.recordCashFlow) {
        const isReceivable = debt.type === 'receivable';
        const tx: Transaction = {
          id: uid('tx-'),
          // Piutang dibayar = uang masuk. Kita bayar hutang = uang keluar.
          type: isReceivable ? 'income' : 'expense',
          amount: payment.amount,
          categoryId: isReceivable ? AUTO_CATEGORY.receiveDebt : AUTO_CATEGORY.payDebt,
          walletId: options.walletId ?? d.wallets[0]?.id ?? 'wal-cash',
          date: payment.date,
          note: isReceivable
            ? `Pembayaran dari ${debt.personName}`
            : `Bayar hutang ke ${debt.personName}`,
          createdAt: Date.now(),
          debtId: debt.id,
        };
        payment.transactionId = tx.id;
        transactions = [tx, ...transactions];
      }

      const payments = [...debt.payments, payment];
      const total = payments.reduce((s, p) => s + p.amount, 0);
      const lunas = total >= debt.amount;

      return {
        ...d,
        transactions,
        debts: d.debts.map((x) =>
          x.id === debtId
            ? { ...x, payments, status: lunas ? 'paid' : 'active', paidAt: lunas ? Date.now() : undefined }
            : x,
        ),
      };
    });
  }, []);

  const deletePayment = useCallback((debtId: string, paymentId: string) => {
    setData((d) => {
      const debt = d.debts.find((x) => x.id === debtId);
      if (!debt) return d;
      const removed = debt.payments.find((p) => p.id === paymentId);
      const payments = debt.payments.filter((p) => p.id !== paymentId);
      const total = payments.reduce((s, p) => s + p.amount, 0);
      const lunas = payments.length > 0 && total >= debt.amount;
      return {
        ...d,
        transactions: removed?.transactionId
          ? d.transactions.filter((t) => t.id !== removed.transactionId)
          : d.transactions,
        debts: d.debts.map((x) =>
          x.id === debtId
            ? { ...x, payments, status: lunas ? 'paid' : 'active', paidAt: lunas ? x.paidAt : undefined }
            : x,
        ),
      };
    });
  }, []);

  const markDebtPaid = useCallback<AppContextValue['markDebtPaid']>(
    (debtId, options) => {
      setData((d) => {
        const debt = d.debts.find((x) => x.id === debtId);
        if (!debt) return d;
        const sisa = Math.max(0, debt.amount - debtPaid(debt));
        if (sisa <= 0) {
          return {
            ...d,
            debts: d.debts.map((x) => (x.id === debtId ? { ...x, status: 'paid', paidAt: Date.now() } : x)),
          };
        }
        const payment: DebtPayment = {
          id: uid('pay-'),
          amount: sisa,
          date: todayISO(),
          note: 'Pelunasan',
          createdAt: Date.now(),
        };
        let transactions = d.transactions;
        if (options?.recordCashFlow) {
          const isReceivable = debt.type === 'receivable';
          const tx: Transaction = {
            id: uid('tx-'),
            type: isReceivable ? 'income' : 'expense',
            amount: sisa,
            categoryId: isReceivable ? AUTO_CATEGORY.receiveDebt : AUTO_CATEGORY.payDebt,
            walletId: options.walletId ?? d.wallets[0]?.id ?? 'wal-cash',
            date: payment.date,
            note: isReceivable ? `Pelunasan dari ${debt.personName}` : `Pelunasan ke ${debt.personName}`,
            createdAt: Date.now(),
            debtId: debt.id,
          };
          payment.transactionId = tx.id;
          transactions = [tx, ...transactions];
        }
        return {
          ...d,
          transactions,
          debts: d.debts.map((x) =>
            x.id === debtId
              ? { ...x, payments: [...x.payments, payment], status: 'paid', paidAt: Date.now() }
              : x,
          ),
        };
      });
    },
    [],
  );

  const logReminder = useCallback((debtId: string, message: string) => {
    setData((d) => ({
      ...d,
      debts: d.debts.map((x) =>
        x.id === debtId
          ? {
              ...x,
              reminders: [
                { id: uid('rem-'), sentAt: Date.now(), message, channel: 'whatsapp' as const },
                ...x.reminders,
              ],
            }
          : x,
      ),
    }));
  }, []);

  /* ---------------- Kategori & dompet ---------------- */

  const addCategory = useCallback((input: Omit<Category, 'id'>) => {
    const cat: Category = { ...input, id: uid('cat-') };
    setData((d) => ({ ...d, categories: [...d.categories, cat] }));
    return cat;
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setData((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setData((d) => {
      const target = d.categories.find((c) => c.id === id);
      if (!target || target.builtIn) return d;
      // Transaksi lama dipindah ke kategori "Lainnya" agar datanya tidak hilang.
      const fallback = target.type === 'expense' ? 'cat-lain-keluar' : 'cat-lain-masuk';
      return {
        ...d,
        categories: d.categories.filter((c) => c.id !== id),
        transactions: d.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: fallback } : t)),
        budgets: d.budgets.filter((b) => b.categoryId !== id),
      };
    });
  }, []);

  const addWallet = useCallback((input: Omit<Wallet, 'id'>) => {
    const wallet: Wallet = { ...input, id: uid('wal-') };
    setData((d) => ({ ...d, wallets: [...d.wallets, wallet] }));
    return wallet;
  }, []);

  const updateWallet = useCallback((id: string, patch: Partial<Wallet>) => {
    setData((d) => ({ ...d, wallets: d.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  }, []);

  const deleteWallet = useCallback((id: string) => {
    setData((d) => {
      if (d.wallets.length <= 1) return d;
      const fallback = d.wallets.find((w) => w.id !== id)!.id;
      return {
        ...d,
        wallets: d.wallets.filter((w) => w.id !== id),
        transactions: d.transactions.map((t) => (t.walletId === id ? { ...t, walletId: fallback } : t)),
      };
    });
  }, []);

  /* ---------------- Anggaran ---------------- */

  const upsertBudget = useCallback<AppContextValue['upsertBudget']>((input) => {
    setData((d) => {
      const existing = d.budgets.find(
        (b) => (input.id && b.id === input.id) || (b.categoryId === input.categoryId && b.month === input.month),
      );
      if (existing) {
        return { ...d, budgets: d.budgets.map((b) => (b.id === existing.id ? { ...b, ...input, id: existing.id } : b)) };
      }
      return { ...d, budgets: [...d.budgets, { ...input, id: input.id ?? uid('bud-') }] };
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));
  }, []);

  /* ---------------- Pengaturan ---------------- */

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const upsertTemplate = useCallback((tpl: MessageTemplate) => {
    setData((d) => {
      const exists = d.settings.reminderTemplates.some((t) => t.id === tpl.id);
      const reminderTemplates = exists
        ? d.settings.reminderTemplates.map((t) => (t.id === tpl.id ? tpl : t))
        : [...d.settings.reminderTemplates, tpl];
      return { ...d, settings: { ...d.settings, reminderTemplates } };
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      settings: {
        ...d.settings,
        reminderTemplates: d.settings.reminderTemplates.filter((t) => t.id !== id || t.builtIn),
      },
    }));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      setData,
      replaceAll,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      addPayment,
      deletePayment,
      logReminder,
      markDebtPaid,
      addCategory,
      updateCategory,
      deleteCategory,
      addWallet,
      updateWallet,
      deleteWallet,
      upsertBudget,
      deleteBudget,
      updateSettings,
      upsertTemplate,
      deleteTemplate,
    }),
    [
      data, replaceAll, addTransaction, updateTransaction, deleteTransaction, addDebt, updateDebt,
      deleteDebt, addPayment, deletePayment, logReminder, markDebtPaid, addCategory, updateCategory,
      deleteCategory, addWallet, updateWallet, deleteWallet, upsertBudget, deleteBudget,
      updateSettings, upsertTemplate, deleteTemplate,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus dipakai di dalam <AppProvider>.');
  return ctx;
}

/** Pintasan untuk komponen yang hanya butuh pengaturan format uang. */
export function useMoney() {
  const { data } = useApp();
  return { currency: data.settings.currency, showDecimals: data.settings.showDecimals };
}
