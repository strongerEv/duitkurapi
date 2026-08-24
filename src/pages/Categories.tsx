import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { CategoryIcon, PageHeader } from '../components/Common';
import Sheet, { ConfirmDialog } from '../components/Sheet';
import { IconPlus, IconTrash } from '../components/Icons';
import type { Category, TxType } from '../types';

const EMOJI_CHOICES = [
  '🍜', '🍔', '☕', '🛒', '🛍️', '🛵', '🚗', '⛽', '🏠', '🧾', '💡', '📶',
  '🎬', '🎮', '🎧', '📚', '💊', '🏥', '🐾', '👕', '💇', '✈️', '🏖️', '🎁',
  '💰', '💵', '🏦', '📈', '💻', '🏪', '🤝', '💸', '🎯', '📦', '✨', '🤲',
];

const COLOR_CHOICES = [
  '#12996B', '#1FD08A', '#0EA5A0', '#84CC16', '#22C55E', '#14B8A6',
  '#3B82F6', '#06B6D4', '#8B5CF6', '#A855F7', '#EC4899', '#F59E0B',
  '#F97316', '#EF4444', '#94A3B8', '#64748B',
];

export default function Categories() {
  const { data, addCategory, updateCategory, deleteCategory } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TxType>('expense');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(EMOJI_CHOICES[0]);
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [error, setError] = useState('');

  const list = data.categories.filter((c) => c.type === tab);

  const buka = (cat?: Category) => {
    setEditing(cat ?? null);
    setName(cat?.name ?? '');
    setIcon(cat?.icon ?? EMOJI_CHOICES[0]);
    setColor(cat?.color ?? COLOR_CHOICES[0]);
    setError('');
    setOpen(true);
  };

  const simpan = () => {
    if (!name.trim()) return setError('Nama kategori tidak boleh kosong.');
    setError('');
    if (editing) {
      updateCategory(editing.id, { name: name.trim(), icon, color });
      toast('Kategori diperbarui', 'success');
    } else {
      addCategory({ name: name.trim(), icon, color, type: tab });
      toast('Kategori ditambahkan', 'success');
    }
    setOpen(false);
  };

  return (
    <div className="page-scroll">
      <PageHeader
        title="Kategori"
        subtitle={`${list.length} kategori ${tab === 'expense' ? 'pengeluaran' : 'pemasukan'}`}
        onBack={() => navigate(-1)}
        right={
          <button className="icon-btn" onClick={() => buka()} aria-label="Tambah kategori">
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="page">
        <div className="segment mb-16">
          <button className={tab === 'expense' ? 'active' : ''} onClick={() => setTab('expense')}>Pengeluaran</button>
          <button className={tab === 'income' ? 'active' : ''} onClick={() => setTab('income')}>Pemasukan</button>
        </div>

        <div className="list">
          {list.map((c) => (
            <div className="list-item" key={c.id} style={{ cursor: 'default' }}>
              <CategoryIcon category={c} />
              <button
                className="list-body"
                style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => buka(c)}
              >
                <div className="list-title">{c.name}</div>
                <div className="list-sub">
                  {c.builtIn ? 'Kategori bawaan' : 'Kategori buatanmu'} ·{' '}
                  {data.transactions.filter((t) => t.categoryId === c.id).length} transaksi
                </div>
              </button>
              {!c.builtIn && (
                <button
                  className="icon-btn ghost"
                  style={{ width: 32, height: 32 }}
                  aria-label={`Hapus ${c.name}`}
                  onClick={() => setToDelete(c)}
                >
                  <IconTrash size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button className="btn outline block mt-16" onClick={() => buka()}>
          <IconPlus size={18} /> Tambah Kategori Baru
        </button>
        <p className="field-hint text-center mt-12">
          Kategori bawaan tidak bisa dihapus, tapi nama, ikon, dan warnanya boleh diubah sesukamu.
        </p>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Ubah kategori' : 'Kategori baru'}>
        <div className="field">
          <label className="field-label" htmlFor="nama-kat">Nama kategori</label>
          <input
            id="nama-kat"
            className="input"
            placeholder="Contoh: Jajan Kopi"
            value={name}
            maxLength={30}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">Ikon</span>
          <div className="picker-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {EMOJI_CHOICES.map((e) => (
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
            {COLOR_CHOICES.map((c) => (
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

        <div className="card card-flat row" style={{ gap: 12, background: 'var(--surface-2)' }}>
          <CategoryIcon category={{ id: 'x', name, icon, color, type: tab }} />
          <div className="f1">
            <div className="fs-12 text-muted">Pratinjau</div>
            <div className="fs-14 fw-700">{name || 'Nama kategori'}</div>
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn block mt-16" onClick={simpan}>Simpan Kategori</button>
      </Sheet>

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title={`Hapus kategori ${toDelete?.name}?`}
        message="Transaksi yang memakai kategori ini akan dipindahkan ke kategori 'Lainnya' supaya datanya tidak hilang."
        confirmLabel="Ya, hapus"
        onConfirm={() => {
          if (toDelete) {
            deleteCategory(toDelete.id);
            toast('Kategori dihapus', 'success');
          }
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
