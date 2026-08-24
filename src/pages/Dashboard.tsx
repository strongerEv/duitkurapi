import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import {
  breakdownByCategory,
  budgetStatuses,
  debtRemaining,
  filterByMonth,
  isOverdue,
  monthStats,
  summarizeDebts,
  totalBalance,
  walletBalance,
} from '../lib/calc';
import { currentMonthKey, formatMonthKey, formatDate } from '../lib/date';
import { formatMoney } from '../lib/format';
import { TransactionRow, EmptyState, InitialAvatar } from '../components/Common';
import { ProgressBar } from '../components/Charts';
import {
  IconArrowDown,
  IconArrowUp,
  IconBell,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconPlus,
  IconSettings,
  IconTarget,
  IconWallet,
} from '../components/Icons';
import Sheet from '../components/Sheet';

export default function Dashboard() {
  const { data, updateSettings } = useApp();
  const navigate = useNavigate();
  const [walletSheet, setWalletSheet] = useState(false);
  const month = currentMonthKey();

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;
  const hidden = data.settings.hideBalance;

  const balance = useMemo(() => totalBalance(data.wallets, data.transactions), [data.wallets, data.transactions]);
  const stats = useMemo(() => monthStats(data, month), [data, month]);
  const debtSummary = useMemo(() => summarizeDebts(data.debts), [data.debts]);
  const budgets = useMemo(() => budgetStatuses(data, month), [data, month]);
  const totalBudget = budgets.find((b) => !b.budget.categoryId);

  const recent = useMemo(
    () => [...data.transactions].sort(sortTx).slice(0, 5),
    [data.transactions],
  );

  const topSpending = useMemo(
    () => breakdownByCategory(filterByMonth(data.transactions, month), data.categories, 'expense').slice(0, 3),
    [data, month],
  );

  const urgentDebts = useMemo(
    () =>
      data.debts
        .filter((d) => d.type === 'receivable' && d.status === 'active')
        .sort((a, b) => {
          const aOver = isOverdue(a) ? 0 : 1;
          const bOver = isOverdue(b) ? 0 : 1;
          if (aOver !== bOver) return aOver - bOver;
          return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
        })
        .slice(0, 3),
    [data.debts],
  );

  const money = (v: number) => (hidden ? '••••••' : formatMoney(v, cur, dec));

  return (
    <div className="page-scroll">
      <header className="topbar">
        <div className="avatar">{(data.settings.userName[0] ?? 'D').toUpperCase()}</div>
        <div className="f1">
          <div className="topbar-sub">Selamat {greeting()},</div>
          <div className="topbar-title">{data.settings.userName}</div>
        </div>
        <button className="icon-btn" onClick={() => navigate('/hutang')} aria-label="Notifikasi hutang">
          <IconBell size={19} />
          {debtSummary.overdueCount > 0 && <span className="dot" />}
        </button>
        <button className="icon-btn" onClick={() => navigate('/pengaturan')} aria-label="Pengaturan">
          <IconSettings size={19} />
        </button>
      </header>

      <div className="page">
        {/* ---------- Kartu saldo ---------- */}
        <section className="balance-card">
          <div className="row-between" style={{ position: 'relative', zIndex: 1 }}>
            <span className="balance-label">Total saldo kamu</span>
            <button className="pill" onClick={() => updateSettings({ hideBalance: !hidden })}>
              {hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
              {hidden ? 'Tampilkan' : 'Sembunyikan'}
            </button>
          </div>
          <div className="balance-amount mono">{money(balance)}</div>
          <div className="balance-meta" style={{ position: 'relative', zIndex: 1 }}>
            <div>
              Dompet aktif
              <strong>{data.wallets.filter((w) => !w.archived).length} dompet</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              Piutang berjalan
              <strong>{money(debtSummary.receivableRemaining)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              Periode
              <strong>{formatMonthKey(month)}</strong>
            </div>
          </div>
          <button
            className="pill"
            style={{ marginTop: 14, position: 'relative', zIndex: 1 }}
            onClick={() => setWalletSheet(true)}
          >
            <IconWallet size={14} /> Rincian per dompet
          </button>
        </section>

        {/* ---------- Pemasukan & pengeluaran bulan ini ---------- */}
        <div className="stat-row">
          <div className="stat-card expense">
            <div className="stat-icon"><IconArrowUp size={16} /></div>
            <div className="stat-label">Pengeluaran</div>
            <div className="stat-value neg mono">-{hidden ? '••••' : formatMoney(stats.expense, cur, dec)}</div>
          </div>
          <div className="stat-card income">
            <div className="stat-icon"><IconArrowDown size={16} /></div>
            <div className="stat-label">Pemasukan</div>
            <div className="stat-value pos mono">+{hidden ? '••••' : formatMoney(stats.income, cur, dec)}</div>
          </div>
        </div>

        {/* ---------- Aksi cepat ---------- */}
        <div className="row mt-16" style={{ gap: 10 }}>
          <QuickAction emoji="➕" label="Catat" onClick={() => navigate('/transaksi/baru')} />
          <QuickAction emoji="🤝" label="Hutang" onClick={() => navigate('/hutang/baru')} />
          <QuickAction emoji="🎯" label="Anggaran" onClick={() => navigate('/anggaran')} />
          <QuickAction emoji="📊" label="Laporan" onClick={() => navigate('/laporan')} />
        </div>

        {/* ---------- Anggaran ---------- */}
        {totalBudget && (
          <>
            <div className="section-head">
              <h2 className="section-title">Anggaran bulan ini</h2>
              <button className="section-link" onClick={() => navigate('/anggaran')}>Atur</button>
            </div>
            <div className="card">
              <div className="row-between mb-8">
                <div className="row" style={{ gap: 8 }}>
                  <IconTarget size={18} />
                  <span className="fs-14 fw-700">Batas belanja</span>
                </div>
                <span className={`badge ${totalBudget.over ? 'danger' : totalBudget.percent > 80 ? 'warn' : 'ok'}`}>
                  {Math.round(totalBudget.percent)}% terpakai
                </span>
              </div>
              <ProgressBar
                value={totalBudget.percent}
                color={totalBudget.over ? 'var(--expense)' : totalBudget.percent > 80 ? 'var(--warn)' : 'var(--green-500)'}
              />
              <div className="row-between mt-8 fs-12 text-muted">
                <span>Terpakai {formatMoney(totalBudget.spent, cur, dec)}</span>
                <span>
                  {totalBudget.over ? 'Lewat ' : 'Sisa '}
                  <strong style={{ color: totalBudget.over ? 'var(--expense)' : 'var(--income)' }}>
                    {formatMoney(Math.abs(totalBudget.remaining), cur, dec)}
                  </strong>
                </span>
              </div>
            </div>
          </>
        )}

        {/* ---------- Hutang yang perlu ditagih ---------- */}
        {urgentDebts.length > 0 && (
          <>
            <div className="section-head">
              <h2 className="section-title">Perlu ditagih</h2>
              <button className="section-link" onClick={() => navigate('/hutang')}>Lihat semua</button>
            </div>
            <div className="list">
              {urgentDebts.map((d) => (
                <button key={d.id} className="list-item" onClick={() => navigate(`/hutang/detail/${d.id}`)}>
                  <InitialAvatar name={d.personName} />
                  <div className="list-body">
                    <div className="list-title">{d.personName}</div>
                    <div className="list-sub">
                      {isOverdue(d) ? (
                        <span style={{ color: 'var(--expense)', fontWeight: 700 }}>⚠ Lewat jatuh tempo</span>
                      ) : (
                        `Sejak ${formatDate(d.date)}`
                      )}
                    </div>
                  </div>
                  <div className="list-amount mono">{formatMoney(debtRemaining(d), cur, dec)}</div>
                  <IconChevronRight />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ---------- Pengeluaran terbesar ---------- */}
        {topSpending.length > 0 && (
          <>
            <div className="section-head">
              <h2 className="section-title">Pengeluaran terbesar</h2>
              <button className="section-link" onClick={() => navigate('/laporan')}>Detail</button>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topSpending.map((b) => (
                <div key={b.categoryId}>
                  <div className="row-between fs-13 mb-8">
                    <span className="fw-700">
                      {b.category?.icon} {b.category?.name ?? 'Lainnya'}
                    </span>
                    <span className="mono text-muted">{formatMoney(b.total, cur, dec)}</span>
                  </div>
                  <ProgressBar value={b.percent} color={b.category?.color ?? 'var(--green-500)'} height={6} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---------- Transaksi terbaru ---------- */}
        <div className="section-head">
          <h2 className="section-title">Transaksi terbaru</h2>
          <button className="section-link" onClick={() => navigate('/transaksi')}>Lihat semua</button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="Belum ada transaksi"
            description="Catat pemasukan atau pengeluaran pertamamu supaya Duitku bisa menghitung keuanganmu."
            action={
              <button className="btn" onClick={() => navigate('/transaksi/baru')}>
                <IconPlus size={18} /> Catat Sekarang
              </button>
            }
          />
        ) : (
          <div className="list">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onClick={() => navigate(`/transaksi/ubah/${tx.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Sheet rincian dompet ---------- */}
      <Sheet open={walletSheet} onClose={() => setWalletSheet(false)} title="Saldo per dompet">
        <div className="list">
          {data.wallets
            .filter((w) => !w.archived)
            .map((w) => (
              <div key={w.id} className="list-item" style={{ cursor: 'default' }}>
                <div
                  className="cat-icon"
                  style={{ background: `color-mix(in srgb, ${w.color} 14%, transparent)` }}
                >
                  {w.icon}
                </div>
                <div className="list-body">
                  <div className="list-title">{w.name}</div>
                  {w.accountNumber && <div className="list-sub">{w.accountNumber}</div>}
                </div>
                <div className="list-amount mono">{formatMoney(walletBalance(w, data.transactions), cur, dec)}</div>
              </div>
            ))}
        </div>
        <div className="divider" />
        <div className="row-between">
          <span className="fs-14 fw-700">Total</span>
          <span className="fs-14 fw-700 mono">{formatMoney(balance, cur, dec)}</span>
        </div>
        <button className="btn secondary block mt-16" onClick={() => { setWalletSheet(false); navigate('/pengaturan/dompet'); }}>
          Kelola Dompet
        </button>
      </Sheet>
    </div>
  );
}

function QuickAction({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        borderRadius: 'var(--r-md)',
        padding: '12px 4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--text-muted)' }}>{label}</span>
    </button>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'pagi';
  if (h < 15) return 'siang';
  if (h < 19) return 'sore';
  return 'malam';
}

function sortTx(a: { date: string; createdAt: number }, b: { date: string; createdAt: number }) {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return b.createdAt - a.createdAt;
}

