import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { EmptyState, InitialAvatar, PageHeader } from '../components/Common';
import { ProgressBar } from '../components/Charts';
import WhatsAppReminder from '../components/WhatsAppReminder';
import { IconPlus, IconSearch, IconWhatsApp } from '../components/Icons';
import { debtAgeDays, debtPaid, debtProgress, debtRemaining, isOverdue, summarizeDebts } from '../lib/calc';
import { dueLabel, formatDate, humanizeDuration } from '../lib/date';
import { formatMoney } from '../lib/format';
import { prettyPhone } from '../lib/wa';
import type { Debt, DebtType } from '../types';

type StatusFilter = 'active' | 'paid' | 'all';

export default function Debts() {
  const { data } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<DebtType>('receivable');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [query, setQuery] = useState('');
  const [reminderFor, setReminderFor] = useState<Debt | null>(null);

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;
  const summary = useMemo(() => summarizeDebts(data.debts), [data.debts]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.debts
      .filter((d) => d.type === tab)
      .filter((d) => (status === 'all' ? true : d.status === status))
      .filter((d) => (q ? d.personName.toLowerCase().includes(q) || d.phone.includes(q) : true))
      .sort((a, b) => {
        // Yang paling mendesak naik ke atas: telat dulu, lalu jatuh tempo terdekat.
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        const aOver = isOverdue(a) ? 0 : 1;
        const bOver = isOverdue(b) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
      });
  }, [data.debts, tab, status, query]);

  const totalTagihan = tab === 'receivable' ? summary.receivableRemaining : summary.payableRemaining;

  return (
    <div className="page-scroll">
      <PageHeader
        title="Hutang & Piutang"
        subtitle={`${summary.activeCount} aktif · ${summary.overdueCount} lewat tempo`}
        right={
          <button className="icon-btn" onClick={() => navigate('/hutang/baru')} aria-label="Tambah hutang">
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="page">
        {/* Ringkasan posisi */}
        <section className="balance-card">
          <div className="balance-label" style={{ position: 'relative', zIndex: 1 }}>
            {tab === 'receivable' ? 'Total uangmu yang dipegang orang' : 'Total hutangmu ke orang lain'}
          </div>
          <div className="balance-amount mono">{formatMoney(totalTagihan, cur, dec)}</div>
          <div className="balance-meta" style={{ position: 'relative', zIndex: 1 }}>
            <div>
              Piutang
              <strong>{formatMoney(summary.receivableRemaining, cur, dec)}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              Hutang
              <strong>{formatMoney(summary.payableRemaining, cur, dec)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              Posisi bersih
              <strong>{summary.net >= 0 ? '+' : '-'}{formatMoney(Math.abs(summary.net), cur, dec)}</strong>
            </div>
          </div>
        </section>

        <div className="segment mt-16">
          <button className={tab === 'receivable' ? 'active' : ''} onClick={() => setTab('receivable')}>
            📥 Orang Hutang ke Saya
          </button>
          <button className={tab === 'payable' ? 'active' : ''} onClick={() => setTab('payable')}>
            📤 Saya Berhutang
          </button>
        </div>

        <div className="search-wrap mt-12">
          <IconSearch />
          <input
            className="input"
            placeholder="Cari nama atau nomor WA…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="chip-row mt-12">
          <button className={`chip ${status === 'active' ? 'active' : ''}`} onClick={() => setStatus('active')}>
            Belum Lunas
          </button>
          <button className={`chip ${status === 'paid' ? 'active' : ''}`} onClick={() => setStatus('paid')}>
            Sudah Lunas
          </button>
          <button className={`chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatus('all')}>
            Semua
          </button>
        </div>

        {list.length === 0 ? (
          <EmptyState
            emoji="🤝"
            title={tab === 'receivable' ? 'Belum ada piutang' : 'Belum ada hutang'}
            description={
              tab === 'receivable'
                ? 'Catat siapa saja yang meminjam uangmu beserta nomor WA-nya, supaya nanti bisa ditagih hanya dengan sekali tekan.'
                : 'Catat hutangmu ke orang lain supaya tidak lupa membayar dan tidak sungkan saat ditanya.'
            }
            action={
              <button className="btn" onClick={() => navigate('/hutang/baru')}>
                <IconPlus size={18} /> Tambah Catatan
              </button>
            }
          />
        ) : (
          <div className="list mt-12" style={{ gap: 10 }}>
            {list.map((d) => (
              <DebtCard
                key={d.id}
                debt={d}
                onOpen={() => navigate(`/hutang/detail/${d.id}`)}
                onRemind={() => setReminderFor(d)}
              />
            ))}
          </div>
        )}
      </div>

      <WhatsAppReminder debt={reminderFor} open={Boolean(reminderFor)} onClose={() => setReminderFor(null)} />
    </div>
  );
}

function DebtCard({ debt, onOpen, onRemind }: { debt: Debt; onOpen: () => void; onRemind: () => void }) {
  const { data } = useApp();
  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;

  const sisa = debtRemaining(debt);
  const terbayar = debtPaid(debt);
  const progress = debtProgress(debt);
  const umur = debtAgeDays(debt);
  const tempo = dueLabel(debt.dueDate);
  const overdue = isOverdue(debt);
  const lunas = debt.status === 'paid';

  return (
    <article
      className={`debt-card ${overdue ? 'overdue' : ''} ${lunas ? 'paid' : ''}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <div className="debt-head">
        <InitialAvatar name={debt.personName} />
        <div className="f1">
          <div className="debt-name">{debt.personName}</div>
          <div className="debt-phone">{prettyPhone(debt.phone, data.settings.defaultCountryCode)}</div>
        </div>
        <div className="debt-amount">
          <div className="big mono" style={{ color: lunas ? 'var(--income)' : undefined }}>
            {formatMoney(sisa, cur, dec)}
          </div>
          <div className="small">dari {formatMoney(debt.amount, cur, dec)}</div>
        </div>
      </div>

      <div>
        <ProgressBar
          value={progress}
          height={6}
          color={lunas ? 'var(--income)' : overdue ? 'var(--expense)' : 'var(--green-500)'}
        />
        <div className="row-between fs-12 text-muted" style={{ marginTop: 6 }}>
          <span>Terbayar {formatMoney(terbayar, cur, dec)}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="badge-row">
        {lunas ? (
          <span className="badge ok">✅ Lunas</span>
        ) : (
          <>
            <span className={`badge ${tempo.tone === 'danger' ? 'danger' : tempo.tone === 'warn' ? 'warn' : 'info'}`}>
              ⏰ {tempo.text}
            </span>
            <span className="badge">📅 Sudah {humanizeDuration(umur)}</span>
          </>
        )}
        {debt.reminders.length > 0 && <span className="badge">📨 {debt.reminders.length}× ditagih</span>}
        <span className="badge">Sejak {formatDate(debt.date)}</span>
      </div>

      {!lunas && debt.type === 'receivable' && (
        <button
          className="btn wa sm block"
          onClick={(e) => {
            e.stopPropagation();
            onRemind();
          }}
        >
          <IconWhatsApp size={17} /> Tagih via WhatsApp
        </button>
      )}
    </article>
  );
}
