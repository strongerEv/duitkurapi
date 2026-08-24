import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { AmountInput, PageHeader } from '../components/Common';
import Sheet, { ConfirmDialog } from '../components/Sheet';
import { IconPlus, IconTrash } from '../components/Icons';
import { walletBalance } from '../lib/calc';
import { formatMoney, parseAmount } from '../lib/format';
import type { Wallet } from '../types';

const WALLET_EMOJI = ['👛', '🏦', '📱', '💳', '💵', '🪙', '🐷', '🧧', '💼', '🏧', '📊', '🎫'];
const WALLET_COLORS = ['#12996B', '#1FD08A', '#0EA5A0', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#64748B'];

export default function Wallets() {
  const { data, addWallet, updateWallet, deleteWallet } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(WALLET_EMOJI[0]);
  const [color, setColor] = useState(WALLET_COLORS[0]);
  const [initial, setInitial] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [toDelete, setToDelete] = useState<Wallet | null>(null);
  const [error, setError] = useState('');

  const buka = (w?: Wallet) => {
    setEditing(w ?? null);
    setName(w?.name ?? '');
    setIcon(w?.icon ?? WALLET_EMOJI[0]);
    setColor(w?.color ?? WALLET_COLORS[0]);
    setInitial(w ? new Intl.NumberFormat('id-ID').format(w.initialBalance) : '');
    setAccountNumber(w?.accountNumber ?? '');
    setError('');
    setOpen(true);
  };

  const simpan = () => {
    if (!name.trim()) return setError('Nama dompet tidak boleh kosong.');
    setError('');
    const payload = {
      name: name.trim(),
      icon,
      color,
      initialBalance: parseAmount(initial),
      accountNumber: accountNumber.trim() || undefined,
    };
    if (editing) {
      updateWallet(editing.id, payload);
      toast('Dompet diperbarui', 'success');
    } else {
      addWallet(payload);
      toast('Dompet ditambahkan', 'success');
    }
    setOpen(false);
  };

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;

  return (
    <div className="page-scroll">
      <PageHeader
        title="Dompet"
        subtitle={`${data.wallets.length} sumber dana`}
        onBack={() => navigate(-1)}
        right={
          <button className="icon-btn" onClick={() => buka()} aria-label="Tambah dompet">
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="page">
        <div className="list">
          {data.wallets.map((w) => (
            <div className="list-item" key={w.id} style={{ cursor: 'default' }}>
              <div
                className="cat-icon"
                style={{ background: `color-mix(in srgb, ${w.color} 14%, transparent)` }}
              >
                {w.icon}
              </div>
              <button
                className="list-body"
                style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => buka(w)}
              >
                <div className="list-title">{w.name}</div>
                <div className="list-sub">
                  {w.accountNumber ? `${w.accountNumber} · ` : ''}
                  saldo awal {formatMoney(w.initialBalance, cur, dec)}
                </div>
              </button>
              <div style={{ textAlign: 'right' }}>
                <div className="list-amount mono">{formatMoney(walletBalance(w, data.transactions), cur, dec)}</div>
              </div>
              {data.wallets.length > 1 && (
                <button
                  className="icon-btn ghost"
                  style={{ width: 32, height: 32 }}
                  aria-label={`Hapus ${w.name}`}
                  onClick={() => setToDelete(w)}
                >
                  <IconTrash size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button className="btn outline block mt-16" onClick={() => buka()}>
          <IconPlus size={18} /> Tambah Dompet
        </button>
        <p className="field-hint text-center mt-12">
          Saldo dompet dihitung dari saldo awal ditambah pemasukan dikurangi pengeluaran yang tercatat di dompet itu.
        </p>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Ubah dompet' : 'Dompet baru'}>
        <div className="field">
          <label className="field-label" htmlFor="nama-dompet">Nama dompet</label>
          <input
            id="nama-dompet"
            className="input"
            placeholder="Contoh: BCA, GoPay, Celengan"
            value={name}
            maxLength={30}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">Saldo awal</label>
          <AmountInput value={initial} onChange={setInitial} large={false} />
          <p className="field-hint">Isi dengan saldo yang ada saat ini supaya perhitungan langsung akurat.</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="norek">Nomor rekening (opsional)</label>
          <input
            id="norek"
            className="input mono"
            placeholder="••• 1160"
            value={accountNumber}
            maxLength={30}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">Ikon</span>
          <div className="picker-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {WALLET_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                className={`picker-item ${icon === e ? 'active' : ''}`}
                style={{ padding: '9px 0' }}
                onClick={() => setIcon(e)}
              >
                <span className="emo">{e}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Warna</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {WALLET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Warna ${c}`}
                onClick={() => setColor(c)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn block mt-16" onClick={simpan}>Simpan Dompet</button>
      </Sheet>

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title={`Hapus dompet ${toDelete?.name}?`}
        message="Transaksi di dompet ini akan dipindahkan ke dompet lain supaya riwayatnya tidak hilang."
        confirmLabel="Ya, hapus"
        onConfirm={() => {
          if (toDelete) {
            deleteWallet(toDelete.id);
            toast('Dompet dihapus', 'success');
          }
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
