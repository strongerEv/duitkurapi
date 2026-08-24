import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { AmountInput, PageHeader, Switch } from '../components/Common';
import { ConfirmDialog } from '../components/Sheet';
import { IconCheck, IconTrash } from '../components/Icons';
import { parseAmount } from '../lib/format';
import { todayISO, toISODate } from '../lib/date';
import { isValidPhone, normalizePhone, prettyPhone } from '../lib/wa';
import type { DebtType } from '../types';

/** Form tambah / ubah catatan hutang beserta nomor WhatsApp penagihan. */
export default function DebtForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, addDebt, updateDebt, deleteDebt } = useApp();
  const { toast } = useToast();

  const existing = useMemo(() => data.debts.find((d) => d.id === id), [data.debts, id]);
  const isEdit = Boolean(existing);

  const [type, setType] = useState<DebtType>(
    existing?.type ?? ((params.get('jenis') as DebtType) || 'receivable'),
  );
  const [personName, setPersonName] = useState(existing?.personName ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [amount, setAmount] = useState(
    existing ? new Intl.NumberFormat('id-ID').format(existing.amount) : '',
  );
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? defaultDueDate());
  const [useDueDate, setUseDueDate] = useState(existing ? Boolean(existing.dueDate) : true);
  const [note, setNote] = useState(existing?.note ?? '');
  const [recordCashFlow, setRecordCashFlow] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const phoneOk = !phone || isValidPhone(phone, data.settings.defaultCountryCode);

  const submit = () => {
    const value = parseAmount(amount);
    if (!personName.trim()) return setError('Nama orangnya diisi dulu ya.');
    if (value <= 0) return setError('Nominal hutang harus lebih dari 0.');
    if (type === 'receivable' && !phone.trim()) {
      return setError('Nomor WhatsApp wajib diisi supaya bisa ditagih otomatis.');
    }
    if (phone.trim() && !isValidPhone(phone, data.settings.defaultCountryCode)) {
      return setError('Nomor WhatsApp belum valid. Contoh: 081234567890');
    }
    setError('');

    const payload = {
      type,
      personName: personName.trim(),
      phone: phone.trim(),
      amount: value,
      date,
      dueDate: useDueDate ? dueDate : undefined,
      note: note.trim() || undefined,
    };

    if (isEdit && existing) {
      updateDebt(existing.id, payload);
      toast('Catatan hutang diperbarui', 'success');
      navigate(`/hutang/detail/${existing.id}`, { replace: true });
    } else {
      const created = addDebt(payload, recordCashFlow);
      toast('Catatan hutang tersimpan', 'success');
      navigate(`/hutang/detail/${created.id}`, { replace: true });
    }
  };

  const remove = () => {
    if (!existing) return;
    deleteDebt(existing.id);
    toast('Catatan hutang dihapus', 'success');
    navigate('/hutang', { replace: true });
  };

  return (
    <div className="page-scroll">
      <PageHeader
        title={isEdit ? 'Ubah Catatan Hutang' : 'Catat Hutang Baru'}
        onBack={() => navigate(-1)}
        right={
          isEdit ? (
            <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Hapus hutang">
              <IconTrash size={18} />
            </button>
          ) : undefined
        }
      />

      <div className="page">
        <div className="segment mb-16">
          <button className={type === 'receivable' ? 'active' : ''} onClick={() => setType('receivable')}>
            📥 Orang hutang ke saya
          </button>
          <button className={type === 'payable' ? 'active' : ''} onClick={() => setType('payable')}>
            📤 Saya berhutang
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="nama">
            {type === 'receivable' ? 'Nama peminjam' : 'Nama pemberi pinjaman'}
          </label>
          <input
            id="nama"
            className="input"
            placeholder="Contoh: Budi Santoso"
            value={personName}
            maxLength={60}
            onChange={(e) => setPersonName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="wa">
            Nomor WhatsApp {type === 'receivable' && <span style={{ color: 'var(--expense)' }}>*</span>}
          </label>
          <input
            id="wa"
            className="input mono"
            type="tel"
            inputMode="tel"
            placeholder="081234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {phone && phoneOk ? (
            <p className="field-hint" style={{ color: 'var(--income)' }}>
              ✓ Akan dikirim ke {prettyPhone(phone, data.settings.defaultCountryCode)} (
              <span className="mono">{normalizePhone(phone, data.settings.defaultCountryCode)}</span>)
            </p>
          ) : (
            <p className="field-hint">
              Boleh diketik 08…, +62…, atau 62…. Duitku otomatis merapikannya ke format WhatsApp.
              {type === 'receivable' && ' Nomor ini dipakai untuk menagih langsung dari aplikasi.'}
            </p>
          )}
          {phone && !phoneOk && <p className="field-error">Nomor belum valid.</p>}
        </div>

        <div className="field">
          <label className="field-label">Nominal hutang</label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tgl">Tanggal hutang</label>
            <input id="tgl" className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tempo">Jatuh tempo</label>
            <input
              id="tempo"
              className="input"
              type="date"
              value={dueDate}
              disabled={!useDueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="card card-flat" style={{ padding: '2px 14px' }}>
          <div className="switch-row">
            <div className="f1">
              <div className="switch-label">Pakai jatuh tempo</div>
              <div className="switch-desc">Duitku akan menandai hutang yang lewat tanggalnya.</div>
            </div>
            <Switch checked={useDueDate} onChange={setUseDueDate} label="Pakai jatuh tempo" />
          </div>

          {!isEdit && (
            <div className="switch-row">
              <div className="f1">
                <div className="switch-label">Catat ke arus kas</div>
                <div className="switch-desc">
                  {type === 'receivable'
                    ? 'Uang yang dipinjamkan dicatat sebagai pengeluaran.'
                    : 'Uang pinjaman yang diterima dicatat sebagai pemasukan.'}
                </div>
              </div>
              <Switch checked={recordCashFlow} onChange={setRecordCashFlow} label="Catat ke arus kas" />
            </div>
          )}
        </div>

        <div className="field mt-16">
          <label className="field-label" htmlFor="ket">Keperluan / catatan</label>
          <textarea
            id="ket"
            className="textarea"
            style={{ minHeight: 84 }}
            placeholder="Contoh: Pinjam buat servis motor, janji dibayar setelah gajian."
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="field-hint">Catatan ini bisa ikut ditampilkan pada pesan penagihan lewat placeholder {'{catatan}'}.</p>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn block mt-16" onClick={submit}>
          <IconCheck size={18} /> {isEdit ? 'Simpan Perubahan' : 'Simpan Catatan Hutang'}
        </button>
        <button className="btn secondary block mt-12" onClick={() => navigate(-1)}>Batal</button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Hapus catatan hutang?"
        message="Seluruh riwayat cicilan dan catatan penagihan untuk orang ini akan ikut terhapus."
        confirmLabel="Ya, hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/** Default jatuh tempo: 30 hari dari sekarang. */
function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return toISODate(d);
}
