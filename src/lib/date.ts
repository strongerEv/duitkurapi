export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** Tanggal hari ini dalam format ISO `YYYY-MM-DD` menurut waktu lokal. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mengubah `YYYY-MM-DD` menjadi Date lokal (bukan UTC) agar tidak geser hari. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Kunci bulan `YYYY-MM`. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

export function formatDate(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[(m || 1) - 1]} ${y}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Selisih hari (bulat) antara dua tanggal ISO: `to - from`. */
export function daysBetween(fromISO: string, toISOStr: string = todayISO()): number {
  const a = fromISODate(fromISO).getTime();
  const b = fromISODate(toISOStr).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Lama hutang dalam bahasa manusia: "3 hari", "2 minggu", "1 bulan 5 hari",
 * "1 tahun 2 bulan". Dipakai pada pesan penagihan WhatsApp.
 */
export function humanizeDuration(days: number): string {
  const d = Math.max(0, Math.round(days));
  if (d === 0) return 'hari ini';
  if (d < 7) return `${d} hari`;
  if (d < 30) {
    const weeks = Math.floor(d / 7);
    const rest = d % 7;
    return rest ? `${weeks} minggu ${rest} hari` : `${weeks} minggu`;
  }
  if (d < 365) {
    const months = Math.floor(d / 30);
    const rest = d % 30;
    return rest ? `${months} bulan ${rest} hari` : `${months} bulan`;
  }
  const years = Math.floor(d / 365);
  const restMonths = Math.floor((d % 365) / 30);
  return restMonths ? `${years} tahun ${restMonths} bulan` : `${years} tahun`;
}

/** Label relatif untuk jatuh tempo. */
export function dueLabel(dueDate?: string): { text: string; tone: 'ok' | 'warn' | 'danger' } {
  if (!dueDate) return { text: 'Tanpa jatuh tempo', tone: 'ok' };
  const diff = daysBetween(todayISO(), dueDate);
  if (diff < 0) return { text: `Telat ${humanizeDuration(-diff)}`, tone: 'danger' };
  if (diff === 0) return { text: 'Jatuh tempo hari ini', tone: 'danger' };
  if (diff <= 3) return { text: `${diff} hari lagi`, tone: 'warn' };
  return { text: `${humanizeDuration(diff)} lagi`, tone: 'ok' };
}

/** Daftar tanggal (ISO) dalam satu bulan. */
export function daysInMonth(key: string): string[] {
  const [y, m] = key.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  return Array.from({ length: total }, (_, i) => `${key}-${String(i + 1).padStart(2, '0')}`);
}

/** 7 tanggal ISO dari minggu berjalan (Minggu s.d. Sabtu). */
export function currentWeekDates(ref: Date = new Date()): string[] {
  const start = new Date(ref);
  start.setDate(ref.getDate() - ref.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toISODate(d);
  });
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Rentang tanggal (inklusif) yang dipakai laporan. */
export interface DateRange {
  from: string;
  to: string;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

/** Rentang satu minggu (Senin s.d. Minggu) yang memuat tanggal `iso`. */
export function weekRangeOf(iso: string): DateRange {
  const d = fromISODate(iso);
  // getDay(): 0 = Minggu. Geser supaya Senin menjadi awal minggu.
  const offsetToMonday = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - offsetToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: toISODate(start), to: toISODate(end) };
}

export function monthRangeOf(key: string): DateRange {
  const [y, m] = key.split('-').map(Number);
  return { from: `${key}-01`, to: toISODate(new Date(y, m, 0)) };
}

export function yearRangeOf(year: string): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** Daftar tanggal ISO di dalam sebuah rentang (dibatasi agar tidak membengkak). */
export function datesInRange(range: DateRange, limit = 400): string[] {
  const out: string[] = [];
  const end = fromISODate(range.to);
  const cursor = fromISODate(range.from);
  while (cursor <= end && out.length < limit) {
    out.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Jumlah hari dalam rentang, minimal 1. */
export function rangeLengthDays(range: DateRange): number {
  return Math.max(1, daysBetween(range.from, range.to) + 1);
}

/** Label rentang yang enak dibaca manusia. */
export function formatRange(range: DateRange): string {
  if (range.from === range.to) return formatDateLong(range.from);
  const a = fromISODate(range.from);
  const b = fromISODate(range.to);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${MONTH_NAMES[b.getMonth()]} ${b.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ${MONTH_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

/** Nama hari lengkap, dipakai pada laporan harian. */
export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function dayNameOf(iso: string): string {
  return DAY_NAMES[fromISODate(iso).getDay()];
}
