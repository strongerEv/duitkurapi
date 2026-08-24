import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { AmountInput, EmptyState, PageHeader } from '../components/Common';
import { ProgressBar, ProgressRing } from '../components/Charts';
import Sheet from '../components/Sheet';
import { IconPlus, IconTarget, IconTrash } from '../components/Icons';
import { budgetStatuses } from '../lib/calc';
import { addMonths, currentMonthKey, formatMonthKey } from '../lib/date';
import { formatMoney, parseAmount } from '../lib/format';

/** Halaman anggaran bulanan: batas total dan batas per kategori. */
export default function Budgets() {
  const { data, upsertBudget, deleteBudget } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [month, setMonth] = useState(currentMonthKey());
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [everyMonth, setEveryMonth] = useState(true);
  const [error, setError] = useState('');

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;
  const statuses = useMemo(() => budgetStatuses(data, month), [data, month]);
  const total = statuses.find((s) => !s.budget.categoryId);
  const perCategory = statuses.filter((s) => s.budget.categoryId);

  const expenseCategories = data.categories.filter((c) => c.type === 'expense');

  const simpan = () => {
    const value = parseAmount(amount);
    if (value <= 0) return setError('Nominal anggaran harus lebih dari 0.');
    setError('');
    upsertBudget({ categoryId, amount: value, month: everyMonth ? null : month });
    toast('Anggaran tersimpan', 'success');
    setOpen(false);
    setAmount('');
    setCategoryId(null);
  };

  const bukaForm = (catId: string | null, current?: number) => {
    setCategoryId(catId);
    setAmount(current ? new Intl.NumberFormat('id-ID').format(current) : '');
    setError('');
    setOpen(true);
  };

  return (
    <div className="page-scroll">
      <PageHeader
        title="Anggaran"
        subtitle={formatMonthKey(month)}
        onBack={() => navigate(-1)}
        right={
          <button className="icon-btn" onClick={() => bukaForm(null)} aria-label="Tambah anggaran">
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="page">
        <div className="row-between card card-flat mb-16" style={{ padding: '8px 10px' }}>
          <button className="btn xs secondary" onClick={() => setMonth((m) => addMonths(m, -1))}>‹</button>
          <span className="fs-13 fw-700">{formatMonthKey(month)}</span>
          <button className="btn xs secondary" onClick={() => setMonth((m) => addMonths(m, 1))}>›</button>
        </div>

        {/* Anggaran total */}
        {total ? (
          <section className="card">
            <div className="row" style={{ gap: 16 }}>
              <ProgressRing
                value={total.percent}
                size={104}
                thickness={11}
                color={total.over ? 'var(--expense)' : total.percent > 80 ? 'var(--warn)' : 'var(--green-500)'}
                label={
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(total.percent)}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>terpakai</div>
                  </>
                }
              />
              <div className="f1">
                <div className="fs-12 text-muted">Batas belanja bulanan</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 800 }}>
                  {formatMoney(total.budget.amount, cur, dec)}
                </div>
                <div className="fs-12 mt-8">
                  <div className="text-muted">Terpakai <strong className="mono">{formatMoney(total.spent, cur, dec)}</strong></div>
                  <div style={{ color: total.over ? 'var(--expense)' : 'var(--income)' }}>
                    {total.over ? 'Lewat ' : 'Sisa '}
                    <strong className="mono">{formatMoney(Math.abs(total.remaining), cur, dec)}</strong>
                  </div>
                </div>
                <div className="btn-row mt-12">
                  <button className="btn xs secondary" onClick={() => bukaForm(null, total.budget.amount)}>Ubah</button>
                  <button
                    className="btn xs secondary"
                    onClick={() => {
                      deleteBudget(total.budget.id);
                      toast('Anggaran total dihapus', 'success');
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
            {total.over && (
              <div className="card card-flat mt-12" style={{ background: 'var(--expense-bg)', borderColor: 'transparent', padding: 12 }}>
                <div className="fs-13 fw-700" style={{ color: 'var(--expense)' }}>⚠️ Anggaran sudah jebol</div>
                <div className="fs-12 text-muted mt-8">
                  Pengeluaranmu melebihi batas sebesar {formatMoney(Math.abs(total.remaining), cur, dec)}. Yuk rem dulu 😅
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="card row" style={{ gap: 12 }}>
            <div className="cat-icon" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>
              <IconTarget size={20} />
            </div>
            <div className="f1">
              <div className="fs-14 fw-700">Belum ada batas total</div>
              <div className="fs-12 text-muted">Tentukan batas belanja seluruh kategori.</div>
            </div>
            <button className="btn xs" onClick={() => bukaForm(null)}>Pasang</button>
          </div>
        )}

        {/* Anggaran per kategori */}
        <div className="section-head">
          <h2 className="section-title">Per kategori</h2>
          <button className="section-link" onClick={() => bukaForm(expenseCategories[0]?.id ?? null)}>+ Tambah</button>
        </div>

        {perCategory.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="Belum ada anggaran kategori"
            description="Pasang batas untuk kategori yang sering bikin boros — misalnya jajan atau belanja online."
            action={
              <button className="btn" onClick={() => bukaForm(expenseCategories[0]?.id ?? null)}>
                <IconPlus size={18} /> Pasang Anggaran
              </button>
            }
          />
        ) : (
          <div className="list" style={{ gap: 10 }}>
            {perCategory.map((s) => (
              <div className="card" key={s.budget.id}>
                <div className="row-between mb-8">
                  <span className="fs-14 fw-700">
                    {s.category?.icon} {s.category?.name}
                  </span>
                  <div className="row" style={{ gap: 6 }}>
                    <span className={`badge ${s.over ? 'danger' : s.percent > 80 ? 'warn' : 'ok'}`}>
                      {Math.round(s.percent)}%
                    </span>
                    <button
                      className="icon-btn ghost"
                      style={{ width: 30, height: 30 }}
                      aria-label="Hapus anggaran"
                      onClick={() => {
                        deleteBudget(s.budget.id);
                        toast('Anggaran dihapus', 'success');
                      }}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
                <ProgressBar
                  value={s.percent}
                  color={s.over ? 'var(--expense)' : s.percent > 80 ? 'var(--warn)' : (s.category?.color ?? 'var(--green-500)')}
                />
                <div className="row-between fs-12 text-muted mt-8">
                  <span className="mono">{formatMoney(s.spent, cur, dec)} terpakai</span>
                  <button
                    className="section-link"
                    style={{ fontSize: 12 }}
                    onClick={() => bukaForm(s.budget.categoryId, s.budget.amount)}
                  >
                    dari {formatMoney(s.budget.amount, cur, dec)} · ubah
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sheet form anggaran */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={categoryId ? 'Anggaran kategori' : 'Anggaran total'}
        description="Duitku akan memberi tanda saat pemakaian mendekati atau melewati batas."
      >
        <div className="field">
          <span className="field-label">Berlaku untuk</span>
          <div className="chip-row" style={{ flexWrap: 'wrap' }}>
            <button className={`chip ${categoryId === null ? 'active' : ''}`} onClick={() => setCategoryId(null)}>
              🎯 Semua kategori
            </button>
            {expenseCategories.map((c) => (
              <button
                key={c.id}
                className={`chip ${categoryId === c.id ? 'active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Batas nominal per bulan</label>
          <AmountInput value={amount} onChange={setAmount} autoFocus />
        </div>

        <div className="field">
          <span className="field-label">Periode</span>
          <div className="segment plain">
            <button className={everyMonth ? 'active' : ''} onClick={() => setEveryMonth(true)}>Setiap bulan</button>
            <button className={!everyMonth ? 'active' : ''} onClick={() => setEveryMonth(false)}>
              Hanya {formatMonthKey(month)}
            </button>
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn block mt-16" onClick={simpan}>Simpan Anggaran</button>
      </Sheet>
    </div>
  );
}
