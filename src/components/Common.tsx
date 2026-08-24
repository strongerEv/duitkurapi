import React from 'react';
import type { Category, Transaction } from '../types';
import { useApp } from '../store/AppContext';
import { formatMoney } from '../lib/format';
import { formatDate } from '../lib/date';
import { IconBack } from './Icons';

/** Ikon kategori dengan latar warna kategori. */
export function CategoryIcon({ category, size = 42 }: { category?: Category; size?: number }) {
  const color = category?.color ?? 'var(--text-faint)';
  return (
    <div
      className="cat-icon"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        fontSize: size * 0.45,
      }}
      aria-hidden
    >
      {category?.icon ?? '❓'}
    </div>
  );
}

/** Avatar inisial berwarna, dipakai untuk daftar orang yang berhutang. */
export function InitialAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
  const palette = ['#12996B', '#0EA5A0', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#84CC16', '#EC4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const bg = palette[hash % palette.length];
  return (
    <div className="debt-avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.34 }} aria-hidden>
      {initials}
    </div>
  );
}

/** Satu baris transaksi pada daftar. */
export function TransactionRow({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  const { data } = useApp();
  const category = data.categories.find((c) => c.id === tx.categoryId);
  const wallet = data.wallets.find((w) => w.id === tx.walletId);
  const sign = tx.type === 'income' ? '+' : '-';
  return (
    <button className="list-item" onClick={onClick} type="button">
      <CategoryIcon category={category} />
      <div className="list-body">
        <div className="list-title">{tx.note?.trim() || category?.name || 'Transaksi'}</div>
        <div className="list-sub">
          {formatDate(tx.date)} · {wallet?.icon ?? ''} {wallet?.name ?? 'Dompet'}
        </div>
      </div>
      <div className={`list-amount mono ${tx.type === 'income' ? 'amount-in' : 'amount-out'}`}>
        {sign}
        {formatMoney(tx.amount, data.settings.currency, data.settings.showDecimals)}
      </div>
    </button>
  );
}

export function EmptyState({
  emoji = '🌱',
  title,
  description,
  action,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="emo">{emoji}</span>
      <div className="ttl">{title}</div>
      {description && <p className="dsc">{description}</p>}
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="topbar">
      {onBack && (
        <button className="icon-btn ghost" onClick={onBack} aria-label="Kembali">
          <IconBack size={20} />
        </button>
      )}
      <div className="f1">
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      {right}
    </header>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

/** Input nominal yang otomatis memberi pemisah ribuan saat diketik. */
export function AmountInput({
  value,
  onChange,
  autoFocus,
  placeholder = '0',
  large = true,
}: {
  value: string;
  onChange: (next: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
  large?: boolean;
}) {
  const { data } = useApp();
  const symbol = data.settings.currency === 'IDR' ? 'Rp' : '';
  return (
    <div className="input-prefixed">
      {symbol && <span className="prefix">{symbol}</span>}
      <input
        className={`input mono ${large ? 'amount' : ''}`}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '');
        }}
      />
    </div>
  );
}
