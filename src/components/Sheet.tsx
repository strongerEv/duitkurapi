import React, { useEffect } from 'react';
import { IconClose } from './Icons';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Sembunyikan tombol silang di pojok kanan. */
  hideClose?: boolean;
}

/** Bottom sheet modal — pola navigasi utama untuk form di aplikasi ini. */
export default function Sheet({ open, onClose, title, description, children, hideClose }: SheetProps) {
  // Kunci scroll halaman di belakang sheet & tutup dengan tombol Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {(title || !hideClose) && (
          <div className="sheet-head">
            <div className="f1">
              {title && <h3 className="sheet-title">{title}</h3>}
              {description && <p className="sheet-desc" style={{ marginBottom: 0 }}>{description}</p>}
            </div>
            {!hideClose && (
              <button className="icon-btn ghost" onClick={onClose} aria-label="Tutup">
                <IconClose size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog konfirmasi untuk aksi yang tidak bisa dibatalkan. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onCancel} title={title} hideClose>
      <p className="fs-14 text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>{message}</p>
      <div className="btn-row">
        <button className="btn secondary" onClick={onCancel}>{cancelLabel}</button>
        <button className={danger ? 'btn danger' : 'btn'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Sheet>
  );
}
