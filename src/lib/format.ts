import type { Settings } from '../types';

const LOCALE_BY_CURRENCY: Record<Settings['currency'], string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  SGD: 'en-SG',
  MYR: 'ms-MY',
};

const SYMBOL_BY_CURRENCY: Record<Settings['currency'], string> = {
  IDR: 'Rp',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  MYR: 'RM',
};

export function currencySymbol(currency: Settings['currency']): string {
  return SYMBOL_BY_CURRENCY[currency] ?? 'Rp';
}

/** Format nominal tanpa simbol mata uang, contoh: `1.250.000`. */
export function formatNumber(
  value: number,
  currency: Settings['currency'] = 'IDR',
  showDecimals = false,
): string {
  const digits = showDecimals ? 2 : 0;
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] ?? 'id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Format nominal lengkap dengan simbol, contoh: `Rp1.250.000`. */
export function formatMoney(
  value: number,
  currency: Settings['currency'] = 'IDR',
  showDecimals = false,
): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${currencySymbol(currency)}${formatNumber(Math.abs(value), currency, showDecimals)}`;
}

/** Format ringkas untuk chart & kartu kecil: 1,2 jt / 950 rb. */
export function formatCompact(value: number, currency: Settings['currency'] = 'IDR'): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const sym = currencySymbol(currency);
  if (currency === 'IDR') {
    if (abs >= 1_000_000_000) return `${sign}${sym}${trim(abs / 1_000_000_000)} M`;
    if (abs >= 1_000_000) return `${sign}${sym}${trim(abs / 1_000_000)} jt`;
    if (abs >= 1_000) return `${sign}${sym}${trim(abs / 1_000)} rb`;
    return `${sign}${sym}${Math.round(abs)}`;
  }
  if (abs >= 1_000_000) return `${sign}${sym}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${sym}${trim(abs / 1_000)}K`;
  return `${sign}${sym}${Math.round(abs)}`;
}

function trim(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return String(rounded).replace('.', ',');
}

/** Membaca angka dari input bebas: "Rp 1.500.000" -> 1500000. */
export function parseAmount(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d,.-]/g, '');
  // Format Indonesia: titik = pemisah ribuan, koma = desimal.
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

/** Menampilkan angka dengan pemisah ribuan saat user mengetik di input. */
export function formatAmountInput(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace('.', ',')}%`;
}
