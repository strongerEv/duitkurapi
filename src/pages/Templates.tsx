import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/Common';
import Sheet, { ConfirmDialog } from '../components/Sheet';
import { IconPlus, IconTrash } from '../components/Icons';
import { TEMPLATE_PLACEHOLDERS, renderTemplate } from '../lib/wa';
import { uid } from '../lib/id';
import { todayISO, toISODate } from '../lib/date';
import type { Debt, MessageTemplate } from '../types';

/** Kelola template pesan penagihan WhatsApp beserta pratinjaunya. */
export default function Templates() {
  const { data, upsertTemplate, deleteTemplate } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [toDelete, setToDelete] = useState<MessageTemplate | null>(null);
  const [error, setError] = useState('');

  /** Hutang contoh untuk memperlihatkan hasil akhir pesan. */
  const sampleDebt = useMemo<Debt>(() => {
    const past = new Date();
    past.setDate(past.getDate() - 47);
    const due = new Date();
    due.setDate(due.getDate() - 5);
    return {
      id: 'contoh',
      type: 'receivable',
      personName: 'Budi Santoso',
      phone: '081234567890',
      amount: 1_500_000,
      date: toISODate(past),
      dueDate: toISODate(due),
      note: 'Pinjam untuk servis motor',
      payments: [{ id: 'p1', amount: 300_000, date: todayISO(), createdAt: Date.now() }],
      reminders: [],
      status: 'active',
      createdAt: Date.now(),
    };
  }, []);

  const preview = useMemo(
    () => (body ? renderTemplate(body, { debt: sampleDebt, settings: data.settings }) : ''),
    [body, sampleDebt, data.settings],
  );

  const buka = (tpl?: MessageTemplate) => {
    setEditing(tpl ?? null);
    setName(tpl?.name ?? '');
    setBody(tpl?.body ?? 'Halo {panggilan},\n\nSisa hutangmu {sisa} sudah berjalan {lama}.\nMohon segera diselesaikan ya 🙏\n\n— {pengirim}');
    setError('');
    setOpen(true);
  };

  const simpan = () => {
    if (!name.trim()) return setError('Nama template tidak boleh kosong.');
    if (!body.trim()) return setError('Isi pesan tidak boleh kosong.');
    setError('');
    upsertTemplate({
      id: editing?.id ?? uid('tpl-'),
      name: name.trim(),
      body: body.trim(),
      builtIn: editing?.builtIn,
    });
    toast('Template tersimpan', 'success');
    setOpen(false);
  };

  const sisipkan = (key: string) => setBody((b) => `${b}${key}`);

  return (
    <div className="page-scroll">
      <PageHeader
        title="Template Penagihan"
        subtitle={`${data.settings.reminderTemplates.length} template`}
        onBack={() => navigate(-1)}
        right={
          <button className="icon-btn" onClick={() => buka()} aria-label="Tambah template">
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="page">
        <div className="card mb-16" style={{ background: 'var(--green-50)', borderColor: 'transparent' }}>
          <div className="fs-13 fw-700" style={{ color: 'var(--green-600)' }}>💡 Cara kerjanya</div>
          <p className="fs-12 text-muted mt-8" style={{ lineHeight: 1.6 }}>
            Tulis pesan sekali, pakai berkali-kali. Placeholder seperti <code>{'{nama}'}</code>,{' '}
            <code>{'{sisa}'}</code>, dan <code>{'{lama}'}</code> akan otomatis diganti dengan data hutang
            orang yang sedang kamu tagih.
          </p>
        </div>

        <div className="list" style={{ gap: 10 }}>
          {data.settings.reminderTemplates.map((t) => (
            <div className="card" key={t.id}>
              <div className="row-between mb-8">
                <div className="row" style={{ gap: 8 }}>
                  <span className="fs-14 fw-700">{t.name}</span>
                  {t.builtIn && <span className="badge">bawaan</span>}
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn xs secondary" onClick={() => buka(t)}>Ubah</button>
                  {!t.builtIn && (
                    <button
                      className="icon-btn ghost"
                      style={{ width: 30, height: 30 }}
                      aria-label={`Hapus ${t.name}`}
                      onClick={() => setToDelete(t)}
                    >
                      <IconTrash size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div className="wa-canvas">
                <div className="wa-preview" style={{ fontSize: 12.5 }}>
                  {renderTemplate(t.body, { debt: sampleDebt, settings: data.settings })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn outline block mt-16" onClick={() => buka()}>
          <IconPlus size={18} /> Buat Template Sendiri
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Ubah template' : 'Template baru'}
        description="Pratinjau di bawah memakai data hutang contoh."
      >
        <div className="field">
          <label className="field-label" htmlFor="nama-tpl">Nama template</label>
          <input
            id="nama-tpl"
            className="input"
            placeholder="Contoh: Penagihan Santai"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="isi-tpl">Isi pesan</label>
          <textarea
            id="isi-tpl"
            className="textarea"
            style={{ minHeight: 190 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">Ketuk untuk menyisipkan placeholder</span>
          <div className="chip-row" style={{ flexWrap: 'wrap' }}>
            {TEMPLATE_PLACEHOLDERS.map((p) => (
              <button key={p.key} className="chip" onClick={() => sisipkan(p.key)} title={p.desc}>
                {p.key}
              </button>
            ))}
          </div>
          <div className="card card-flat mt-8" style={{ background: 'var(--surface-2)', padding: 12 }}>
            {TEMPLATE_PLACEHOLDERS.map((p) => (
              <div key={p.key} className="fs-12" style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
                <code style={{ color: 'var(--green-600)', minWidth: 96 }}>{p.key}</code>
                <span className="text-muted">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Pratinjau</span>
          <div className="wa-canvas">
            <div className="wa-preview">{preview || 'Ketik pesanmu di atas…'}</div>
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn block mt-16" onClick={simpan}>Simpan Template</button>
      </Sheet>

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title={`Hapus template ${toDelete?.name}?`}
        message="Template ini tidak akan muncul lagi saat kamu menagih hutang."
        confirmLabel="Ya, hapus"
        onConfirm={() => {
          if (toDelete) {
            deleteTemplate(toDelete.id);
            toast('Template dihapus', 'success');
          }
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
