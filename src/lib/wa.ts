import type { Debt, MessageTemplate, Settings } from '../types';
import { formatMoney } from './format';
import { daysBetween, formatDateLong, humanizeDuration, todayISO } from './date';
import { debtPaid, debtRemaining } from './calc';

/**
 * Normalisasi nomor WhatsApp ke format internasional tanpa tanda `+`.
 * Contoh: `0812-3456-7890` -> `6281234567890`, `+62 812 3456` -> `62812345`.
 */
export function normalizePhone(raw: string, countryCode = '62'): string {
  let digits = (raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  digits = digits.replace(/\D/g, '');
  if (!digits) return '';
  const cc = (countryCode || '62').replace(/\D/g, '') || '62';
  // 08xxxx -> 62 8xxxx
  if (digits.startsWith('0')) return cc + digits.replace(/^0+/, '');
  // 62xxxx sudah benar
  if (digits.startsWith(cc)) return digits;
  // 8xxxx (tanpa 0 dan tanpa kode negara)
  return cc + digits;
}

/** Cek apakah nomor WA masuk akal untuk dikirimi pesan. */
export function isValidPhone(raw: string, countryCode = '62'): boolean {
  const n = normalizePhone(raw, countryCode);
  return n.length >= 9 && n.length <= 16;
}

/** Tampilan nomor yang enak dibaca: `+62 812-3456-7890`. */
export function prettyPhone(raw: string, countryCode = '62'): string {
  const n = normalizePhone(raw, countryCode);
  if (!n) return '-';
  const cc = (countryCode || '62').replace(/\D/g, '');
  const rest = n.startsWith(cc) ? n.slice(cc.length) : n;
  const grouped = rest.replace(/(\d{3,4})(?=\d)/g, '$1-');
  return `+${cc} ${grouped}`;
}

/** Placeholder yang bisa dipakai di template pesan penagihan. */
export const TEMPLATE_PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: '{nama}', desc: 'Nama orang yang berhutang' },
  { key: '{panggilan}', desc: 'Nama depan saja' },
  { key: '{total}', desc: 'Total hutang awal' },
  { key: '{sisa}', desc: 'Sisa hutang yang belum dibayar' },
  { key: '{terbayar}', desc: 'Jumlah yang sudah dibayar' },
  { key: '{lama}', desc: 'Lama hutang, contoh: 2 bulan 5 hari' },
  { key: '{hari}', desc: 'Lama hutang dalam angka hari' },
  { key: '{tanggal}', desc: 'Tanggal hutang dibuat' },
  { key: '{jatuhtempo}', desc: 'Tanggal jatuh tempo' },
  { key: '{statustempo}', desc: 'Contoh: telat 3 hari / 5 hari lagi' },
  { key: '{catatan}', desc: 'Catatan hutang' },
  { key: '{pengirim}', desc: 'Nama kamu (dari Pengaturan)' },
];

export interface TemplateContext {
  debt: Debt;
  settings: Settings;
}

/** Mengganti seluruh placeholder pada template dengan data hutang sebenarnya. */
export function renderTemplate(body: string, ctx: TemplateContext): string {
  const { debt, settings } = ctx;
  const cur = settings.currency;
  const dec = settings.showDecimals;
  const days = Math.max(0, daysBetween(debt.date, todayISO()));
  const remaining = debtRemaining(debt);
  const paid = debtPaid(debt);

  let tempoStatus = 'tanpa jatuh tempo';
  if (debt.dueDate) {
    const diff = daysBetween(todayISO(), debt.dueDate);
    if (diff < 0) tempoStatus = `sudah telat ${humanizeDuration(-diff)}`;
    else if (diff === 0) tempoStatus = 'jatuh tempo hari ini';
    else tempoStatus = `${humanizeDuration(diff)} lagi menuju jatuh tempo`;
  }

  const map: Record<string, string> = {
    '{nama}': debt.personName || 'Kakak',
    '{panggilan}': (debt.personName || 'Kakak').trim().split(/\s+/)[0],
    '{total}': formatMoney(debt.amount, cur, dec),
    '{sisa}': formatMoney(remaining, cur, dec),
    '{terbayar}': formatMoney(paid, cur, dec),
    '{lama}': humanizeDuration(days),
    '{hari}': String(days),
    '{tanggal}': formatDateLong(debt.date),
    '{jatuhtempo}': debt.dueDate ? formatDateLong(debt.dueDate) : '-',
    '{statustempo}': tempoStatus,
    '{catatan}': debt.note || '-',
    '{pengirim}': settings.userName || 'Saya',
  };

  return body.replace(/\{[a-zA-Z]+\}/g, (found) => map[found] ?? found);
}

/**
 * Membuat link `wa.me` yang membuka chat WhatsApp ke nomor tujuan
 * dengan pesan yang sudah terisi otomatis.
 */
export function buildWhatsAppUrl(phone: string, message: string, countryCode = '62'): string {
  const to = normalizePhone(phone, countryCode);
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

/** Membuka WhatsApp di tab baru. Dipisah agar mudah dites/di-mock. */
export function openWhatsApp(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Template bawaan: sopan, tegas, jatuh tempo, terima kasih, dan cicilan. */
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-halus',
    name: 'Penagihan Halus',
    builtIn: true,
    body:
      'Halo {panggilan} 👋\n\n' +
      'Maaf mengganggu waktunya. Saya mau mengingatkan soal pinjaman sebesar *{total}* ' +
      'pada tanggal {tanggal} ({lama} yang lalu).\n\n' +
      'Sisa yang belum dilunasi: *{sisa}*\n' +
      'Sudah dibayar: {terbayar}\n\n' +
      'Kalau sudah ada rezekinya, boleh dibantu diselesaikan ya 🙏\n' +
      'Terima kasih banyak!\n\n— {pengirim}',
  },
  {
    id: 'tpl-tegas',
    name: 'Penagihan Tegas',
    builtIn: true,
    body:
      'Halo {nama},\n\n' +
      'Ini pengingat mengenai hutang Anda:\n' +
      '• Jumlah pinjaman: *{total}*\n' +
      '• Sisa tagihan: *{sisa}*\n' +
      '• Tanggal pinjam: {tanggal}\n' +
      '• Sudah berjalan: *{lama}* ({hari} hari)\n' +
      '• Jatuh tempo: {jatuhtempo} ({statustempo})\n\n' +
      'Mohon segera diselesaikan pembayarannya. Terima kasih atas perhatiannya.\n\n— {pengirim}',
  },
  {
    id: 'tpl-jatuhtempo',
    name: 'Pengingat Jatuh Tempo',
    builtIn: true,
    body:
      'Hai {panggilan}! ⏰\n\n' +
      'Pengingat ya, hutang *{sisa}* jatuh tempo pada {jatuhtempo} — {statustempo}.\n' +
      'Catatan: {catatan}\n\n' +
      'Kabari saja kalau butuh perpanjangan waktu 🙏\n\n— {pengirim}',
  },
  {
    id: 'tpl-cicilan',
    name: 'Tawaran Cicilan',
    builtIn: true,
    body:
      'Halo {panggilan},\n\n' +
      'Sisa hutangnya sekarang *{sisa}* dari total {total}, sudah berjalan {lama}.\n' +
      'Kalau berat dilunasi sekaligus, boleh dicicil dulu semampunya ya, nanti saya catat setiap pembayarannya.\n\n' +
      'Terima kasih 🙏\n\n— {pengirim}',
  },
  {
    id: 'tpl-terimakasih',
    name: 'Ucapan Terima Kasih (Lunas)',
    builtIn: true,
    body:
      'Halo {panggilan} 🙏\n\n' +
      'Terima kasih banyak, pembayaran hutang sebesar *{total}* sudah saya terima dengan lengkap. ' +
      'Hutang dinyatakan LUNAS per hari ini.\n\n' +
      'Semoga rezekinya makin lancar ya!\n\n— {pengirim}',
  },
];
