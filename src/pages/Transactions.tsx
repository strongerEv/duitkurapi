import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { EmptyState, PageHeader, TransactionRow } from '../components/Common';
import Sheet from '../components/Sheet';
import { IconFilter, IconPlus, IconSearch } from '../components/Icons';
import { addMonths, currentMonthKey, formatDate, formatMonthKey, monthKey, todayISO } from '../lib/date';
import { formatMoney } from '../lib/format';
import { totalByType } from '../lib/calc';
import type { Transaction, TxType } from '../types';

type TypeFilter = 'all' | TxType;

export default function Transactions() {
  const { data } = useApp();
  const navigate = useNavigate();

  const [month, setMonth] = useState(currentMonthKey());
  const [type, setType] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [walletIds, setWalletIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.transactions
      .filter((t) => monthKey(t.date) === month)
      .filter((t) => (type === 'all' ? true : t.type === type))
      .filter((t) => (categoryIds.length ? categoryIds.includes(t.categoryId) : true))
      .filter((t) => (walletIds.length ? walletIds.includes(t.walletId) : true))
      .filter((t) => {
        if (!q) return true;
        const cat = data.categories.find((c) => c.id === t.categoryId)?.name.toLowerCase() ?? '';
        return (t.note ?? '').toLowerCase().includes(q) || cat.includes(q) || String(t.amount).includes(q);
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
  }, [data, month, type, query, categoryIds, walletIds]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const income = totalByType(filtered, 'income');
  const expense = totalByType(filtered, 'expense');
  const activeFilters = categoryIds.length + walletIds.length;

  return (
    <div className="page-scroll">
      <PageHeader
        title="Transaksi"
        subtitle={`${filtered.length} catatan · ${formatMonthKey(month)}`}
        right={
          <button className="icon-btn" onClick={() => navigate('/transaksi/baru')} aria-label="Tambah transaksi">
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="page">
        {/* Navigasi bulan */}
        <div className="row-between card card-flat" style={{ padding: '8px 10px' }}>
          <button className="btn xs secondary" onClick={() => setMonth((m) => addMonths(m, -1))}>‹ Sebelumnya</button>
          <button
            className="fs-13 fw-700"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setMonth(currentMonthKey())}
          >
            {formatMonthKey(month)}
          </button>
          <button
            className="btn xs secondary"
            disabled={month >= currentMonthKey()}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            Berikutnya ›
          </button>
        </div>

        {/* Ringkasan */}
        <div className="stat-row" style={{ marginTop: 12 }}>
          <div className="stat-card income" style={{ padding: 12 }}>
            <div className="stat-label">Masuk</div>
            <div className="stat-value pos mono" style={{ fontSize: 17 }}>+{formatMoney(income, cur, dec)}</div>
          </div>
          <div className="stat-card expense" style={{ padding: 12 }}>
            <div className="stat-label">Keluar</div>
            <div className="stat-value neg mono" style={{ fontSize: 17 }}>-{formatMoney(expense, cur, dec)}</div>
          </div>
        </div>

        {/* Pencarian */}
        <div className="search-wrap mt-12">
          <IconSearch />
          <input
            className="input"
            placeholder="Cari catatan, kategori, atau nominal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Tab jenis + filter */}
        <div className="row mt-12">
          <div className="segment f1">
            <button className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>Semua</button>
            <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>Masuk</button>
            <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>Keluar</button>
          </div>
          <button className="icon-btn" onClick={() => setFilterOpen(true)} aria-label="Filter lanjutan">
            <IconFilter size={18} />
            {activeFilters > 0 && <span className="dot" />}
          </button>
        </div>

        {/* Daftar */}
        {grouped.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Tidak ada transaksi"
            description="Coba ganti bulan, ubah filter, atau catat transaksi baru."
            action={
              <button className="btn" onClick={() => navigate('/transaksi/baru')}>
                <IconPlus size={18} /> Catat Transaksi
              </button>
            }
          />
        ) : (
          grouped.map(([date, items]) => {
            const dayIn = totalByType(items, 'income');
            const dayOut = totalByType(items, 'expense');
            return (
              <div key={date}>
                <div className="day-group-label">
                  <span>{isToday(date) ? 'Hari ini' : formatDate(date)}</span>
                  <span className="mono">
                    {dayIn > 0 && <span style={{ color: 'var(--income)' }}>+{formatMoney(dayIn, cur, dec)} </span>}
                    {dayOut > 0 && <span style={{ color: 'var(--expense)' }}>-{formatMoney(dayOut, cur, dec)}</span>}
                  </span>
                </div>
                <div className="list">
                  {items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} onClick={() => navigate(`/transaksi/ubah/${tx.id}`)} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sheet filter */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter transaksi">
        <div className="field">
          <span className="field-label">Kategori</span>
          <div className="chip-row" style={{ flexWrap: 'wrap' }}>
            {data.categories
              .filter((c) => (type === 'all' ? true : c.type === type))
              .map((c) => (
                <button
                  key={c.id}
                  className={`chip ${categoryIds.includes(c.id) ? 'active' : ''}`}
                  onClick={() =>
                    setCategoryIds((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                  }
                >
                  {c.icon} {c.name}
                </button>
              ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Dompet</span>
          <div className="chip-row" style={{ flexWrap: 'wrap' }}>
            {data.wallets.map((w) => (
              <button
                key={w.id}
                className={`chip ${walletIds.includes(w.id) ? 'active' : ''}`}
                onClick={() =>
                  setWalletIds((prev) => (prev.includes(w.id) ? prev.filter((x) => x !== w.id) : [...prev, w.id]))
                }
              >
                {w.icon} {w.name}
              </button>
            ))}
          </div>
        </div>

        <div className="btn-row mt-16">
          <button
            className="btn secondary"
            onClick={() => {
              setCategoryIds([]);
              setWalletIds([]);
            }}
          >
            Reset
          </button>
          <button className="btn" onClick={() => setFilterOpen(false)}>Terapkan</button>
        </div>
      </Sheet>
    </div>
  );
}

function groupByDate(items: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of items) {
    const arr = map.get(t.date) ?? [];
    arr.push(t);
    map.set(t.date, arr);
  }
  return [...map.entries()];
}

function isToday(date: string): boolean {
  return date === todayISO();
}
