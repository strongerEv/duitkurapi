import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { EmptyState, PageHeader } from '../components/Common';
import { BarChart, DonutChart, ProgressBar } from '../components/Charts';
import ExportReportSheet from '../components/ExportReportSheet';
import { IconArrowDown, IconArrowUp, IconChevronRight, IconDownload, IconTarget } from '../components/Icons';
import {
  breakdownByCategory,
  budgetStatuses,
  dailySeries,
  filterByMonth,
  filterByYear,
  monthStats,
  summarizeDebts,
  totalByType,
} from '../lib/calc';
import {
  DAY_SHORT,
  MONTH_SHORT,
  addMonths,
  currentMonthKey,
  currentWeekDates,
  daysInMonth,
  formatMonthKey,
  fromISODate,
} from '../lib/date';
import { formatCompact, formatMoney, formatPercent } from '../lib/format';
import type { TxType } from '../types';

type Period = 'month' | 'year';
type Grain = 'weekly' | 'monthly';

export default function Reports() {
  const { data } = useApp();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<Period>('month');
  const [month, setMonth] = useState(currentMonthKey());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [focus, setFocus] = useState<TxType>('expense');
  const [grain, setGrain] = useState<Grain>('weekly');
  const [exportOpen, setExportOpen] = useState(false);

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;

  const scoped = useMemo(
    () => (period === 'month' ? filterByMonth(data.transactions, month) : filterByYear(data.transactions, year)),
    [data.transactions, period, month, year],
  );

  const income = totalByType(scoped, 'income');
  const expense = totalByType(scoped, 'expense');
  const breakdown = useMemo(
    () => breakdownByCategory(scoped, data.categories, focus),
    [scoped, data.categories, focus],
  );
  const focusTotal = focus === 'expense' ? expense : income;

  const stats = useMemo(() => monthStats(data, month), [data, month]);
  const budgets = useMemo(() => budgetStatuses(data, month), [data, month]);
  const debtSummary = useMemo(() => summarizeDebts(data.debts), [data.debts]);

  // Data grafik batang: mingguan (7 hari) atau bulanan (12 bulan).
  const barData = useMemo(() => {
    if (grain === 'weekly') {
      const dates = currentWeekDates();
      return dailySeries(data.transactions, dates).map((d) => ({
        label: DAY_SHORT[fromISODate(d.date).getDay()],
        values: [d.expense, d.income],
      }));
    }
    return MONTH_SHORT.map((label, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const tx = filterByMonth(data.transactions, key);
      return { label, values: [totalByType(tx, 'expense'), totalByType(tx, 'income')] };
    });
  }, [grain, data.transactions, year]);

  const dailyThisMonth = useMemo(
    () => dailySeries(filterByMonth(data.transactions, month), daysInMonth(month)),
    [data.transactions, month],
  );
  const busiestDay = useMemo(
    () => [...dailyThisMonth].sort((a, b) => b.expense - a.expense)[0],
    [dailyThisMonth],
  );

  const years = useMemo(() => {
    const set = new Set(data.transactions.map((t) => t.date.slice(0, 4)));
    set.add(String(new Date().getFullYear()));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [data.transactions]);

  const hasData = scoped.length > 0;

  return (
    <div className="page-scroll">
      <PageHeader
        title="Laporan"
        subtitle="Lihat ke mana uangmu pergi"
        right={
          <button className="icon-btn" onClick={() => setExportOpen(true)} aria-label="Unduh laporan PDF">
            <IconDownload size={19} />
          </button>
        }
      />

      <div className="page">
        <div className="segment plain mb-12">
          <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Bulanan</button>
          <button className={period === 'year' ? 'active' : ''} onClick={() => setPeriod('year')}>Tahunan</button>
        </div>

        {period === 'month' ? (
          <div className="row-between card card-flat" style={{ padding: '8px 10px' }}>
            <button className="btn xs secondary" onClick={() => setMonth((m) => addMonths(m, -1))}>‹</button>
            <span className="fs-13 fw-700">{formatMonthKey(month)}</span>
            <button
              className="btn xs secondary"
              disabled={month >= currentMonthKey()}
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              ›
            </button>
          </div>
        ) : (
          <div className="chip-row">
            {years.map((y) => (
              <button key={y} className={`chip ${y === year ? 'active' : ''}`} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Ringkasan */}
        <div className="stat-row">
          <div className="stat-card expense">
            <div className="stat-icon"><IconArrowUp size={16} /></div>
            <div className="stat-label">Pengeluaran</div>
            <div className="stat-value neg mono">-{formatMoney(expense, cur, dec)}</div>
          </div>
          <div className="stat-card income">
            <div className="stat-icon"><IconArrowDown size={16} /></div>
            <div className="stat-label">Pemasukan</div>
            <div className="stat-value pos mono">+{formatMoney(income, cur, dec)}</div>
          </div>
        </div>

        <div className="card mt-12 row-between">
          <div>
            <div className="fs-12 text-muted">Selisih {period === 'month' ? 'bulan' : 'tahun'} ini</div>
            <div
              className="mono"
              style={{ fontSize: 20, fontWeight: 800, color: income - expense >= 0 ? 'var(--income)' : 'var(--expense)' }}
            >
              {income - expense >= 0 ? '+' : '-'}{formatMoney(Math.abs(income - expense), cur, dec)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="fs-12 text-muted">Rasio tabungan</div>
            <div className="fs-14 fw-700">
              {income > 0 ? formatPercent(Math.max(0, ((income - expense) / income) * 100), 0) : '—'}
            </div>
          </div>
        </div>

        <button className="btn secondary block mt-12" onClick={() => setExportOpen(true)}>
          <IconDownload size={17} /> Unduh Laporan PDF
        </button>

        {!hasData ? (
          <EmptyState
            emoji="📊"
            title="Belum ada data di periode ini"
            description="Catat beberapa transaksi dulu, nanti grafiknya muncul otomatis di sini."
            action={<button className="btn" onClick={() => navigate('/transaksi/baru')}>Catat Transaksi</button>}
          />
        ) : (
          <>
            {/* Donut kategori */}
            <div className="section-head">
              <h2 className="section-title">Rincian kategori</h2>
              <div className="segment plain" style={{ padding: 3 }}>
                <button
                  className={focus === 'expense' ? 'active' : ''}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setFocus('expense')}
                >
                  Keluar
                </button>
                <button
                  className={focus === 'income' ? 'active' : ''}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setFocus('income')}
                >
                  Masuk
                </button>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <DonutChart
                  slices={breakdown.slice(0, 7).map((b) => ({
                    label: b.category?.name ?? 'Lainnya',
                    value: b.total,
                    color: b.category?.color ?? '#94A3B8',
                  }))}
                  centerValue={formatCompact(focusTotal, cur)}
                  centerLabel={focus === 'expense' ? 'Total keluar' : 'Total masuk'}
                />
              </div>
              <div className="legend">
                {breakdown.slice(0, 7).map((b) => (
                  <div className="legend-row" key={b.categoryId}>
                    <span className="legend-dot" style={{ background: b.category?.color ?? '#94A3B8' }} />
                    <span className="legend-name">
                      {b.category?.icon} {b.category?.name ?? 'Lainnya'}
                    </span>
                    <span className="legend-val mono">{formatPercent(b.percent)}</span>
                    <span className="legend-val mono" style={{ minWidth: 78, textAlign: 'right', color: 'var(--text)' }}>
                      {formatMoney(b.total, cur, dec)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistik batang */}
            <div className="section-head">
              <h2 className="section-title">Statistik</h2>
              <div className="segment plain" style={{ padding: 3 }}>
                <button
                  className={grain === 'weekly' ? 'active' : ''}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setGrain('weekly')}
                >
                  Mingguan
                </button>
                <button
                  className={grain === 'monthly' ? 'active' : ''}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setGrain('monthly')}
                >
                  Bulanan
                </button>
              </div>
            </div>
            <div className="card">
              <div className="row mb-12" style={{ gap: 16, fontSize: 12 }}>
                <span className="row" style={{ gap: 6 }}>
                  <span className="legend-dot" style={{ background: 'var(--expense)' }} /> Pengeluaran
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span className="legend-dot" style={{ background: 'var(--green-500)' }} /> Pemasukan
                </span>
              </div>
              <BarChart
                data={barData}
                colors={['var(--expense)', 'var(--green-500)']}
                formatValue={(v) => formatMoney(v, cur, dec)}
              />
            </div>

            {/* Insight */}
            <div className="section-head">
              <h2 className="section-title">Ringkasan cerdas</h2>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Insight
                emoji="📅"
                label="Rata-rata pengeluaran harian"
                value={formatMoney(stats.avgDailyExpense, cur, dec)}
              />
              {stats.topCategory?.category && (
                <Insight
                  emoji={stats.topCategory.category.icon}
                  label={`Kategori terboros: ${stats.topCategory.category.name}`}
                  value={`${formatMoney(stats.topCategory.total, cur, dec)} (${formatPercent(stats.topCategory.percent, 0)})`}
                />
              )}
              {busiestDay && busiestDay.expense > 0 && (
                <Insight
                  emoji="🔥"
                  label="Hari paling boros bulan ini"
                  value={`${fromISODate(busiestDay.date).getDate()} ${formatMonthKey(month).split(' ')[0]} · ${formatMoney(busiestDay.expense, cur, dec)}`}
                />
              )}
              <Insight emoji="🧾" label="Jumlah transaksi" value={`${scoped.length} catatan`} />
              <Insight
                emoji="🤝"
                label="Posisi hutang-piutang"
                value={`${debtSummary.net >= 0 ? '+' : '-'}${formatMoney(Math.abs(debtSummary.net), cur, dec)}`}
              />
            </div>
          </>
        )}

        {/* Anggaran */}
        {period === 'month' && budgets.length > 0 && (
          <>
            <div className="section-head">
              <h2 className="section-title">Anggaran</h2>
              <button className="section-link" onClick={() => navigate('/anggaran')}>
                Atur <IconChevronRight size={14} />
              </button>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {budgets.map((b) => (
                <div key={b.budget.id}>
                  <div className="row-between fs-13 mb-8">
                    <span className="fw-700">
                      {b.category ? `${b.category.icon} ${b.category.name}` : '🎯 Total semua kategori'}
                    </span>
                    <span className="mono text-muted">
                      {formatMoney(b.spent, cur, dec)} / {formatMoney(b.budget.amount, cur, dec)}
                    </span>
                  </div>
                  <ProgressBar
                    value={b.percent}
                    height={6}
                    color={b.over ? 'var(--expense)' : b.percent > 80 ? 'var(--warn)' : 'var(--green-500)'}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {period === 'month' && budgets.length === 0 && (
          <div className="card mt-16 row" style={{ gap: 12 }}>
            <div className="cat-icon" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>
              <IconTarget size={20} />
            </div>
            <div className="f1">
              <div className="fs-14 fw-700">Belum pasang anggaran</div>
              <div className="fs-12 text-muted">Pasang batas belanja bulanan supaya lebih terkendali.</div>
            </div>
            <button className="btn xs" onClick={() => navigate('/anggaran')}>Atur</button>
          </div>
        )}
      </div>

      <ExportReportSheet open={exportOpen} onClose={() => setExportOpen(false)} initialMonth={month} />
    </div>
  );
}

function Insight({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <div className="cat-icon" style={{ width: 36, height: 36, background: 'var(--surface-3)', fontSize: 17 }}>
        {emoji}
      </div>
      <div className="f1">
        <div className="fs-12 text-muted">{label}</div>
        <div className="fs-14 fw-700 mono">{value}</div>
      </div>
    </div>
  );
}
