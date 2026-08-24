import { useEffect, useMemo, useState } from 'react';
import type { Debt } from '../types';
import { useApp } from '../store/AppContext';
import { useToast } from './Toast';
import Sheet from './Sheet';
import { IconCopy, IconEdit, IconWhatsApp } from './Icons';
import { buildWhatsAppUrl, isValidPhone, openWhatsApp, prettyPhone, renderTemplate } from '../lib/wa';
import { debtAgeDays, debtRemaining } from '../lib/calc';
import { formatMoney } from '../lib/format';
import { humanizeDuration } from '../lib/date';

interface Props {
  debt: Debt | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Penyusun pesan penagihan WhatsApp.
 * Pengguna memilih template, boleh mengubah isinya, melihat pratinjau
 * persis seperti di WhatsApp, lalu mengirimnya lewat link `wa.me`.
 */
export default function WhatsAppReminder({ debt, open, onClose }: Props) {
  const { data, logReminder } = useApp();
  const { toast } = useToast();
  const templates = data.settings.reminderTemplates;

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Setiap kali sheet dibuka untuk hutang lain, kembalikan ke template awal.
  useEffect(() => {
    if (open) {
      setTemplateId(templates[0]?.id ?? '');
      setCustomMessage(null);
      setEditing(false);
    }
  }, [open, debt?.id, templates]);

  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const rendered = useMemo(() => {
    if (!debt || !template) return '';
    return renderTemplate(template.body, { debt, settings: data.settings });
  }, [debt, template, data.settings]);

  const message = customMessage ?? rendered;

  if (!debt) return null;

  const phoneOk = isValidPhone(debt.phone, data.settings.defaultCountryCode);
  const sisa = debtRemaining(debt);
  const umur = debtAgeDays(debt);

  const kirim = () => {
    if (!phoneOk) {
      toast('Nomor WhatsApp belum valid. Perbaiki dulu di data hutang.', 'error');
      return;
    }
    const url = buildWhatsAppUrl(debt.phone, message, data.settings.defaultCountryCode);
    openWhatsApp(url);
    logReminder(debt.id, message);
    toast('WhatsApp dibuka, tinggal tekan kirim 📤', 'success');
    onClose();
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast('Pesan disalin ke clipboard', 'success');
    } catch {
      toast('Browser menolak akses clipboard', 'error');
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Tagih ${debt.personName}`}
      description={`${prettyPhone(debt.phone, data.settings.defaultCountryCode)} · sisa ${formatMoney(
        sisa,
        data.settings.currency,
        data.settings.showDecimals,
      )} · sudah ${humanizeDuration(umur)}`}
    >
      {!phoneOk && (
        <div className="card mb-12" style={{ background: 'var(--expense-bg)', borderColor: 'transparent' }}>
          <div className="fs-13 fw-700" style={{ color: 'var(--expense)' }}>Nomor WhatsApp belum valid</div>
          <div className="fs-12 text-muted mt-8">
            Ubah data hutang dan isi nomor WA yang benar (contoh: 081234567890) supaya pesan bisa dikirim.
          </div>
        </div>
      )}

      <div className="field">
        <span className="field-label">Pilih nada pesan</span>
        <div className="chip-row">
          {templates.map((t) => (
            <button
              key={t.id}
              className={`chip ${t.id === templateId ? 'active' : ''}`}
              onClick={() => {
                setTemplateId(t.id);
                setCustomMessage(null);
                setEditing(false);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="row-between mb-8">
          <span className="field-label" style={{ marginBottom: 0 }}>Pratinjau pesan</span>
          <button className="btn xs secondary" onClick={() => setEditing((v) => !v)}>
            <IconEdit size={14} /> {editing ? 'Selesai' : 'Ubah pesan'}
          </button>
        </div>

        {editing ? (
          <textarea
            className="textarea"
            style={{ minHeight: 200 }}
            value={message}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        ) : (
          <div className="wa-canvas">
            <div className="wa-preview">{message}</div>
            <div className="fs-12 text-center mt-8" style={{ color: 'var(--text-faint)' }}>
              Pesan ini akan terisi otomatis di WhatsApp
            </div>
          </div>
        )}
        {customMessage !== null && !editing && (
          <p className="field-hint">
            Pesan sudah kamu ubah manual.{' '}
            <button
              className="section-link"
              style={{ fontSize: 11.5 }}
              onClick={() => setCustomMessage(null)}
            >
              Kembalikan ke template
            </button>
          </p>
        )}
      </div>

      <div className="btn-row mt-16">
        <button className="btn secondary" onClick={salin}>
          <IconCopy size={16} /> Salin
        </button>
        <button className="btn wa" onClick={kirim} disabled={!phoneOk} style={{ flex: 2 }}>
          <IconWhatsApp size={18} /> Kirim via WhatsApp
        </button>
      </div>

      <p className="field-hint text-center mt-12">
        Duitku membuka WhatsApp dengan pesan yang sudah jadi. Kamu tetap yang menekan tombol kirim,
        jadi tidak ada pesan terkirim tanpa sepengetahuanmu.
      </p>
    </Sheet>
  );
}
