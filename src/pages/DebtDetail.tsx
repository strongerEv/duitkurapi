import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { AmountInput, EmptyState, InitialAvatar, PageHeader, Switch } from '../components/Common';
import { ProgressRing } from '../components/Charts';
import Sheet, { ConfirmDialog } from '../components/Sheet';
import WhatsAppReminder from '../components/WhatsAppReminder';
import {
  IconCheck,
  IconEdit,
  IconPhone,
  IconPlus,
  IconTrash,
  IconWhatsApp,
} from '../components/Icons';
import { debtAgeDays, debtPaid, debtProgress, debtRemaining, isOverdue } from '../lib/calc';
import { dueLabel, formatDate, formatDateLong, formatTime, humanizeDuration, todayISO } from '../lib/date';
import { formatMoney, parseAmount } from '../lib/format';
import { prettyPhone } from '../lib/wa';

export default function DebtDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, addPayment, deletePayment, markDebtPaid, deleteDebt } = useApp();
  const { toast } = useToast();

  const debt = useMemo(() => data.debts.find((d) => d.id === id), [data.debts, id]);

  const [payOpen, setPayOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Form cicilan
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [payNote, setPayNote] = useState('');
  const [payToCash, setPayToCash] = useState(true);
  const [payWallet, setPayWallet] = useState(data.wallets[0]?.id ?? '');
  const [payError, setPayError] = useState('');

  if (!debt) {
    return (
      <div className="page-scroll">
        <PageHeader title="Hutang tidak ditemukan" onBack={() => navigate('/hutang')} />
        <div className="page">
          <EmptyState
            emoji="🔍"
            title="Catatan tidak ada"
            description="Mungkin sudah dihapus. Kembali ke daftar hutang untuk melihat catatan lain."
            action={<button className="btn" onClick={() => navigate('/hutang')}>Ke Daftar Hutang</button>}
          />
        </div>
      </div>
    );
  }

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;
  const sisa = debtRemaining(debt);
  const terbayar = debtPaid(debt);
  const progress = debtProgress(debt);
  const umur = debtAgeDays(debt);
  const tempo = dueLabel(debt.dueDate);
  const lunas = debt.status === 'paid';
  const isReceivable = debt.type === 'receivable';

  const submitPayment = () => {
    const value = parseAmount(payAmount);
    if (value <= 0) return setPayError('Nominal cicilan harus lebih dari 0.');
    if (value > sisa) return setPayError(`Nominal melebihi sisa hutang (${formatMoney(sisa, cur, dec)}).`);
    setPayError('');
    addPayment(
      debt.id,
      { amount: value, date: payDate, note: payNote.trim() || undefined },
      { recordCashFlow: payToCash, walletId: payWallet },
    );
    toast(value >= sisa ? 'Hutang lunas! 🎉' : 'Cicilan tercatat', 'success');
    setPayOpen(false);
    setPayAmount('');
    setPayNote('');
  };

  return (
    <div className="page-scroll">
      <PageHeader
        title="Detail Hutang"
        subtitle={isReceivable ? 'Orang berhutang ke kamu' : 'Kamu berhutang'}
        onBack={() => navigate('/hutang')}
        right={
          <button className="icon-btn" onClick={() => navigate(`/hutang/ubah/${debt.id}`)} aria-label="Ubah">
            <IconEdit size={18} />
          </button>
        }
      />

      <div className="page">
        {/* Kartu profil */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="row">
            <InitialAvatar name={debt.personName} size={54} />
            <div className="f1">
              <div style={{ fontSize: 18, fontWeight: 750 }}>{debt.personName}</div>
              <div className="fs-13 text-muted row" style={{ gap: 5 }}>
                <IconPhone size={14} /> {prettyPhone(debt.phone, data.settings.defaultCountryCode)}
              </div>
            </div>
            <ProgressRing
              value={progress}
              size={64}
              thickness={7}
              color={lunas ? 'var(--income)' : isOverdue(debt) ? 'var(--expense)' : 'var(--green-500)'}
              label={<div style={{ fontSize: 13, fontWeight: 800 }}>{Math.round(progress)}%</div>}
            />
          </div>

          <div className="divider" style={{ margin: 0 }} />

          <div className="row-between">
            <div>
              <div className="fs-12 text-muted">Sisa hutang</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: lunas ? 'var(--income)' : 'var(--text)' }}>
                {formatMoney(sisa, cur, dec)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="fs-12 text-muted">Total pinjaman</div>
              <div className="mono fs-14 fw-700">{formatMoney(debt.amount, cur, dec)}</div>
              <div className="fs-12" style={{ color: 'var(--income)' }}>
                terbayar {formatMoney(terbayar, cur, dec)}
              </div>
            </div>
          </div>

          <div className="badge-row">
            {lunas ? (
              <span className="badge ok">✅ Lunas {debt.paidAt ? `· ${formatDate(new Date(debt.paidAt).toISOString().slice(0, 10))}` : ''}</span>
            ) : (
              <span className={`badge ${tempo.tone === 'danger' ? 'danger' : tempo.tone === 'warn' ? 'warn' : 'info'}`}>
                ⏰ {tempo.text}
              </span>
            )}
            <span className="badge">📅 Berjalan {humanizeDuration(umur)}</span>
            <span className="badge">🗓 Sejak {formatDate(debt.date)}</span>
            {debt.dueDate && <span className="badge">🎯 Tempo {formatDate(debt.dueDate)}</span>}
          </div>

          {debt.note && (
            <div className="card card-flat" style={{ background: 'var(--surface-2)', padding: 12 }}>
              <div className="fs-12 text-muted mb-8">Catatan</div>
              <div className="fs-13" style={{ lineHeight: 1.6 }}>{debt.note}</div>
            </div>
          )}
        </section>

        {/* Aksi utama */}
        {!lunas && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {isReceivable && (
              <button className="btn wa block" onClick={() => setRemindOpen(true)}>
                <IconWhatsApp size={19} /> Tagih Sekarang via WhatsApp
              </button>
            )}
            <div className="btn-row">
              <button className="btn secondary" onClick={() => setPayOpen(true)}>
                <IconPlus size={16} /> Catat Cicilan
              </button>
              <button className="btn outline" onClick={() => setConfirmPaid(true)}>
                <IconCheck size={16} /> Tandai Lunas
              </button>
            </div>
          </div>
        )}

        {lunas && (
          <div className="card mt-16 text-center" style={{ background: 'var(--income-bg)', borderColor: 'transparent' }}>
            <div style={{ fontSize: 32 }}>🎉</div>
            <div className="fs-14 fw-700 mt-8">Hutang ini sudah lunas</div>
            <div className="fs-12 text-muted mt-8">
              {umur === 0 ? 'Selesai di hari yang sama' : `Selesai dalam ${humanizeDuration(umur)}`} dengan{' '}
              {debt.payments.length} kali pembayaran.
            </div>
            {isReceivable && (
              <button className="btn wa sm block mt-12" onClick={() => setRemindOpen(true)}>
                <IconWhatsApp size={16} /> Kirim Ucapan Terima Kasih
              </button>
            )}
          </div>
        )}

        {/* Riwayat cicilan */}
        <div className="section-head">
          <h2 className="section-title">Riwayat pembayaran</h2>
          <span className="fs-12 text-muted">{debt.payments.length} kali</span>
        </div>
        {debt.payments.length === 0 ? (
          <div className="card text-center fs-13 text-muted" style={{ padding: 22 }}>
            Belum ada pembayaran sama sekali.
          </div>
        ) : (
          <div className="card timeline">
            {[...debt.payments]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((p, i, arr) => (
                <div className="timeline-item" key={p.id}>
                  <div className="timeline-rail">
                    <div className="timeline-dot" />
                    {i < arr.length - 1 && <div className="timeline-line" />}
                  </div>
                  <div className="timeline-body">
                    <div className="row-between">
                      <div className="fs-14 fw-700 mono" style={{ color: 'var(--income)' }}>
                        +{formatMoney(p.amount, cur, dec)}
                      </div>
                      <button
                        className="icon-btn ghost"
                        style={{ width: 30, height: 30 }}
                        aria-label="Hapus cicilan"
                        onClick={() => {
                          deletePayment(debt.id, p.id);
                          toast('Cicilan dihapus', 'success');
                        }}
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                    <div className="fs-12 text-muted">
                      {formatDateLong(p.date)}
                      {p.note ? ` · ${p.note}` : ''}
                      {p.transactionId ? ' · tercatat di kas' : ''}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Riwayat penagihan */}
        <div className="section-head">
          <h2 className="section-title">Riwayat penagihan WA</h2>
          {debt.reminders.length > 0 && (
            <button className="section-link" onClick={() => setHistoryOpen(true)}>Lihat isi pesan</button>
          )}
        </div>
        {debt.reminders.length === 0 ? (
          <div className="card text-center fs-13 text-muted" style={{ padding: 22 }}>
            Belum pernah ditagih lewat WhatsApp.
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {debt.reminders.slice(0, 4).map((r) => (
              <div key={r.id} className="row" style={{ gap: 10 }}>
                <div
                  className="cat-icon"
                  style={{ width: 34, height: 34, background: 'rgba(37,211,102,0.14)', color: '#25D366' }}
                >
                  <IconWhatsApp size={16} />
                </div>
                <div className="f1">
                  <div className="fs-13 fw-700">Pesan penagihan dikirim</div>
                  <div className="fs-12 text-muted">
                    {formatDate(new Date(r.sentAt).toISOString().slice(0, 10))} pukul {formatTime(r.sentAt)}
                  </div>
                </div>
              </div>
            ))}
            {debt.reminders.length > 4 && (
              <div className="fs-12 text-muted text-center">+{debt.reminders.length - 4} penagihan lainnya</div>
            )}
          </div>
        )}

        <button className="btn secondary block mt-16" onClick={() => setConfirmDelete(true)}>
          <IconTrash size={16} /> Hapus Catatan Ini
        </button>
      </div>

      {/* ---------- Sheet cicilan ---------- */}
      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Catat pembayaran"
        description={`Sisa hutang saat ini ${formatMoney(sisa, cur, dec)}`}
      >
        <div className="field">
          <label className="field-label">Nominal dibayar</label>
          <AmountInput value={payAmount} onChange={setPayAmount} autoFocus />
          <div className="chip-row mt-8">
            {[0.25, 0.5, 1].map((frac) => (
              <button
                key={frac}
                className="chip"
                onClick={() => setPayAmount(new Intl.NumberFormat('id-ID').format(Math.round(sisa * frac)))}
              >
                {frac === 1 ? 'Lunasi semua' : `${frac * 100}% sisa`}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tglbayar">Tanggal pembayaran</label>
          <input id="tglbayar" className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="notebayar">Catatan (opsional)</label>
          <input
            id="notebayar"
            className="input"
            placeholder="Contoh: Transfer BCA"
            value={payNote}
            maxLength={100}
            onChange={(e) => setPayNote(e.target.value)}
          />
        </div>

        <div className="card card-flat" style={{ padding: '2px 14px' }}>
          <div className="switch-row">
            <div className="f1">
              <div className="switch-label">Catat ke arus kas</div>
              <div className="switch-desc">
                {isReceivable ? 'Masuk sebagai pemasukan.' : 'Keluar sebagai pengeluaran.'}
              </div>
            </div>
            <Switch checked={payToCash} onChange={setPayToCash} label="Catat ke arus kas" />
          </div>
        </div>

        {payToCash && (
          <div className="field mt-12">
            <span className="field-label">Dompet</span>
            <div className="chip-row">
              {data.wallets
                .filter((w) => !w.archived)
                .map((w) => (
                  <button
                    key={w.id}
                    className={`chip ${payWallet === w.id ? 'active' : ''}`}
                    onClick={() => setPayWallet(w.id)}
                  >
                    {w.icon} {w.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {payError && <p className="field-error">{payError}</p>}

        <button className="btn block mt-16" onClick={submitPayment}>
          <IconCheck size={18} /> Simpan Pembayaran
        </button>
      </Sheet>

      {/* ---------- Sheet riwayat pesan ---------- */}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Isi pesan yang pernah dikirim">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {debt.reminders.map((r) => (
            <div key={r.id}>
              <div className="fs-12 text-muted mb-8">
                {formatDateLong(new Date(r.sentAt).toISOString().slice(0, 10))} · {formatTime(r.sentAt)}
              </div>
              <div className="wa-canvas">
                <div className="wa-preview">{r.message}</div>
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      <WhatsAppReminder debt={debt} open={remindOpen} onClose={() => setRemindOpen(false)} />

      <ConfirmDialog
        open={confirmPaid}
        title="Tandai hutang lunas?"
        message={`Sisa ${formatMoney(sisa, cur, dec)} akan dicatat sebagai pelunasan dan status berubah menjadi LUNAS.`}
        confirmLabel="Ya, lunas"
        onConfirm={() => {
          markDebtPaid(debt.id, { recordCashFlow: true, walletId: payWallet });
          setConfirmPaid(false);
          toast('Hutang ditandai lunas 🎉', 'success');
        }}
        onCancel={() => setConfirmPaid(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Hapus catatan hutang?"
        message="Riwayat cicilan dan penagihan akan ikut hilang. Aksi ini tidak bisa dibatalkan."
        confirmLabel="Ya, hapus"
        onConfirm={() => {
          deleteDebt(debt.id);
          toast('Catatan hutang dihapus', 'success');
          navigate('/hutang', { replace: true });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
