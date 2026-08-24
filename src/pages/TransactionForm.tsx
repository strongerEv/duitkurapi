import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { AmountInput, PageHeader } from '../components/Common';
import { ConfirmDialog } from '../components/Sheet';
import { IconCheck, IconTrash } from '../components/Icons';
import { parseAmount } from '../lib/format';
import { todayISO } from '../lib/date';
import type { TxType } from '../types';

/** Form tambah / ubah transaksi. Dipakai untuk kedua mode lewat parameter `id`. */
export default function TransactionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const { toast } = useToast();

  const existing = useMemo(() => data.transactions.find((t) => t.id === id), [data.transactions, id]);
  const isEdit = Boolean(existing);

  const [type, setType] = useState<TxType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(
    existing ? new Intl.NumberFormat('id-ID').format(existing.amount) : '',
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [walletId, setWalletId] = useState(existing?.walletId ?? data.wallets[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categories = data.categories.filter((c) => c.type === type);

  const changeType = (next: TxType) => {
    setType(next);
    // Kategori lama tidak berlaku lagi saat jenis transaksi berubah.
    setCategoryId('');
  };

  const submit = () => {
    const value = parseAmount(amount);
    if (value <= 0) return setError('Nominal harus lebih dari 0.');
    if (!categoryId) return setError('Pilih kategori dulu ya.');
    if (!walletId) return setError('Pilih dompet dulu ya.');
    setError('');

    const payload = { type, amount: value, categoryId, walletId, date, note: note.trim() || undefined };
    if (isEdit && existing) {
      updateTransaction(existing.id, payload);
      toast('Transaksi diperbarui', 'success');
    } else {
      addTransaction(payload);
      toast('Transaksi tersimpan', 'success');
    }
    navigate(-1);
  };

  const remove = () => {
    if (!existing) return;
    deleteTransaction(existing.id);
    toast('Transaksi dihapus', 'success');
    navigate('/transaksi', { replace: true });
  };

  return (
    <div className="page-scroll">
      <PageHeader
        title={isEdit ? 'Ubah Transaksi' : 'Catat Transaksi'}
        onBack={() => navigate(-1)}
        right={
          isEdit ? (
            <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Hapus transaksi">
              <IconTrash size={18} />
            </button>
          ) : undefined
        }
      />

      <div className="page">
        <div className="segment mb-16">
          <button className={type === 'expense' ? 'active' : ''} onClick={() => changeType('expense')}>
            💸 Pengeluaran
          </button>
          <button className={type === 'income' ? 'active' : ''} onClick={() => changeType('income')}>
            💰 Pemasukan
          </button>
        </div>

        <div className="field">
          <label className="field-label">Nominal</label>
          <AmountInput value={amount} onChange={setAmount} autoFocus={!isEdit} />
        </div>

        <div className="field">
          <span className="field-label">Kategori</span>
          <div className="picker-grid">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`picker-item ${categoryId === c.id ? 'active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="emo">{c.icon}</span>
                <span className="nm">{c.name}</span>
              </button>
            ))}
            <button type="button" className="picker-item" onClick={() => navigate('/pengaturan/kategori')}>
              <span className="emo">➕</span>
              <span className="nm">Tambah</span>
            </button>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Dompet</span>
          <div className="chip-row">
            {data.wallets
              .filter((w) => !w.archived)
              .map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`chip ${walletId === w.id ? 'active' : ''}`}
                  onClick={() => setWalletId(w.id)}
                >
                  {w.icon} {w.name}
                </button>
              ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tanggal">Tanggal</label>
          <input id="tanggal" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="catatan">Catatan (opsional)</label>
          <input
            id="catatan"
            className="input"
            placeholder="Contoh: Makan siang di warteg"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn block mt-16" onClick={submit}>
          <IconCheck size={18} /> {isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}
        </button>
        <button className="btn secondary block mt-12" onClick={() => navigate(-1)}>Batal</button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Hapus transaksi ini?"
        message="Transaksi yang dihapus tidak bisa dikembalikan dan saldo akan dihitung ulang."
        confirmLabel="Ya, hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
