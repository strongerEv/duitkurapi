import type { AppData, Category } from '../../types';
import {
  MONTH_NAMES,
  addMonths,
  currentMonthKey,
  formatMonthKey,
  fromISODate,
  monthRangeOf,
  toISODate,
  todayISO,
  weekRangeOf,
  yearRangeOf,
  type DateRange,
} from '../date';
import type { Intent, ParsedPeriod, ParsedQuestion } from './types';

/**
 * Penafsir pertanyaan berbahasa Indonesia.
 *
 * Pendekatannya sengaja berbasis kata kunci, bukan model bahasa: jawabannya
 * jadi pasti benar secara angka, bekerja tanpa internet, dan tidak sepotong pun
 * data keuangan pengguna meninggalkan perangkat.
 */

/** Membuang tanda baca dan merapikan spasi agar pencocokan lebih longgar. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sÀ-ɏ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mencocokkan kata secara utuh, bukan sebagai potongan huruf.
 *
 * Ini penting: "pemasukan" mengandung potongan "emas", dan "kosong" mengandung
 * "kos". Tanpa batas kata, pertanyaan tentang pemasukan akan salah dikenali
 * sebagai pertanyaan tentang investasi emas.
 */
function hasWord(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRe(phrase)}\\b`).test(text);
}

const has = (text: string, ...words: string[]) => words.some((w) => hasWord(text, w));

/* ------------------------------------------------------------------ */
/* Periode                                                             */
/* ------------------------------------------------------------------ */

function monthPeriod(key: string): ParsedPeriod {
  const prev = addMonths(key, -1);
  return {
    label: formatMonthKey(key),
    range: monthRangeOf(key),
    previous: { label: formatMonthKey(prev), range: monthRangeOf(prev) },
    implicit: false,
  };
}

function shiftDays(iso: string, delta: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

/** Rentang beberapa bulan ke belakang, termasuk bulan berjalan. */
function lastMonthsPeriod(count: number): ParsedPeriod {
  const endKey = currentMonthKey();
  const startKey = addMonths(endKey, -(count - 1));
  const range: DateRange = { from: monthRangeOf(startKey).from, to: monthRangeOf(endKey).to };
  const prevEnd = addMonths(startKey, -1);
  const prevStart = addMonths(prevEnd, -(count - 1));
  return {
    label: `${count} bulan terakhir`,
    range,
    previous: {
      label: `${count} bulan sebelumnya`,
      range: { from: monthRangeOf(prevStart).from, to: monthRangeOf(prevEnd).to },
    },
    implicit: false,
  };
}

/** Menafsirkan penyebutan waktu di dalam pertanyaan. */
export function parsePeriod(text: string, transactions: AppData['transactions']): ParsedPeriod {
  const today = todayISO();

  /*
   * Urutan pemeriksaan penting. Periode "ini" didahulukan supaya pertanyaan
   * seperti "bandingkan bulan ini dengan bulan lalu" memakai bulan berjalan
   * sebagai periode utama — pembandingnya sudah dibuat otomatis. Sebutan
   * bertingkat ("bulan kemarin") juga harus diperiksa sebelum kata tunggalnya
   * ("kemarin"), kalau tidak akan tertangkap sebagai hari kemarin.
   */

  if (has(text, 'bulan ini', 'sebulan ini')) {
    const p = monthPeriod(currentMonthKey());
    return { ...p, label: 'bulan ini' };
  }

  if (has(text, 'minggu ini', 'pekan ini', 'seminggu ini', 'seminggu')) {
    const range = weekRangeOf(today);
    const prev = weekRangeOf(shiftDays(today, -7));
    return { label: 'minggu ini', range, previous: { label: 'minggu lalu', range: prev }, implicit: false };
  }

  if (has(text, 'tahun ini', 'setahun ini', 'setahun')) {
    const year = String(new Date().getFullYear());
    const prevYear = String(Number(year) - 1);
    return {
      label: `tahun ${year}`,
      range: yearRangeOf(year),
      previous: { label: `tahun ${prevYear}`, range: yearRangeOf(prevYear) },
      implicit: false,
    };
  }

  if (has(text, 'hari ini')) {
    const kemarin = shiftDays(today, -1);
    return {
      label: 'hari ini',
      range: { from: today, to: today },
      previous: { label: 'kemarin', range: { from: kemarin, to: kemarin } },
      implicit: false,
    };
  }

  if (has(text, 'bulan lalu', 'bulan kemarin')) {
    return monthPeriod(addMonths(currentMonthKey(), -1));
  }

  if (has(text, 'minggu lalu', 'minggu kemarin', 'pekan lalu')) {
    const anchor = shiftDays(today, -7);
    const range = weekRangeOf(anchor);
    const prev = weekRangeOf(shiftDays(anchor, -7));
    return { label: 'minggu lalu', range, previous: { label: 'dua minggu lalu', range: prev }, implicit: false };
  }

  if (has(text, 'tahun lalu', 'tahun kemarin')) {
    const year = String(new Date().getFullYear() - 1);
    const prevYear = String(Number(year) - 1);
    return {
      label: `tahun ${year}`,
      range: yearRangeOf(year),
      previous: { label: `tahun ${prevYear}`, range: yearRangeOf(prevYear) },
      implicit: false,
    };
  }

  if (has(text, 'kemarin')) {
    const kemarin = shiftDays(today, -1);
    const lusa = shiftDays(today, -2);
    return {
      label: 'kemarin',
      range: { from: kemarin, to: kemarin },
      previous: { label: 'dua hari lalu', range: { from: lusa, to: lusa } },
      implicit: false,
    };
  }

  if (has(text, 'sepanjang', 'selama ini', 'semua waktu', 'dari awal', 'keseluruhan')) {
    const dates = transactions.map((t) => t.date).sort();
    return {
      label: 'sepanjang waktu',
      range: { from: dates[0] ?? today, to: dates[dates.length - 1] ?? today },
      implicit: false,
    };
  }

  const lastMonths = text.match(/(\d+)\s*bulan\s*(terakhir|belakangan|ke belakang)/);
  if (lastMonths) {
    const n = Math.min(24, Math.max(2, Number(lastMonths[1])));
    return lastMonthsPeriod(n);
  }

  // Nama bulan, boleh disertai tahun: "juli", "agustus 2026"
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const name = MONTH_NAMES[i].toLowerCase();
    if (!hasWord(text, name)) continue;
    const yearMatch = text.match(/(20\d{2})/);
    const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
    return monthPeriod(`${year}-${String(i + 1).padStart(2, '0')}`);
  }

  // Tidak disebut sama sekali: pakai bulan berjalan.
  const p = monthPeriod(currentMonthKey());
  return { ...p, label: 'bulan ini', implicit: true };
}

/* ------------------------------------------------------------------ */
/* Kategori                                                            */
/* ------------------------------------------------------------------ */

/**
 * Kata sehari-hari yang dipakai orang tetapi tidak sama dengan nama kategori.
 * Contoh: orang bertanya "bensin", sedangkan kategorinya bernama "Transportasi".
 */
const HINTS: Record<string, string[]> = {
  'cat-transport': ['bensin', 'bbm', 'pertamax', 'pertalite', 'solar', 'ojek', 'ojol', 'grab', 'gojek', 'transport', 'angkot', 'busway', 'kereta', 'parkir', 'tol', 'servis motor', 'bengkel'],
  'cat-makan': ['makan', 'makanan', 'jajan', 'kopi', 'ngopi', 'warung', 'warteg', 'resto', 'restoran', 'kuliner', 'snack', 'camilan', 'sarapan', 'minum', 'gofood', 'grabfood'],
  'cat-belanja': ['belanja', 'shopping', 'baju', 'pakaian', 'skincare', 'kosmetik', 'online shop', 'olshop', 'tokopedia', 'shopee'],
  'cat-tagihan': ['tagihan', 'listrik', 'air', 'pdam', 'sewa', 'kos', 'kontrakan', 'iuran'],
  'cat-hiburan': ['hiburan', 'nonton', 'bioskop', 'netflix', 'spotify', 'game', 'langganan', 'streaming', 'liburan'],
  'cat-kesehatan': ['kesehatan', 'obat', 'dokter', 'rumah sakit', 'vitamin', 'apotek', 'berobat'],
  'cat-pendidikan': ['pendidikan', 'sekolah', 'kuliah', 'kursus', 'buku', 'spp', 'les'],
  'cat-rumah': ['rumah', 'perabot', 'furniture', 'renovasi', 'peralatan rumah'],
  'cat-pulsa': ['pulsa', 'internet', 'kuota', 'paket data', 'wifi'],
  'cat-hewan': ['hewan', 'kucing', 'anjing', 'peliharaan', 'petshop'],
  'cat-donasi': ['donasi', 'zakat', 'sedekah', 'infak', 'amal'],
  'cat-gaji': ['gaji', 'gajian', 'salary', 'upah'],
  'cat-bonus': ['bonus', 'thr', 'tunjangan'],
  'cat-usaha': ['usaha', 'jualan', 'dagang', 'bisnis', 'toko'],
  'cat-freelance': ['freelance', 'proyek', 'sampingan', 'lepas'],
  'cat-investasi': ['investasi', 'saham', 'reksadana', 'dividen', 'emas'],
};

/** Mencari kategori yang paling cocok dengan pertanyaan. */
export function matchCategory(text: string, categories: Category[]): Category | undefined {
  // Nama kategori yang benar-benar dimiliki pengguna diutamakan, termasuk
  // kategori buatan sendiri. Yang paling panjang menang agar "Makan & Minum"
  // dipilih lebih dulu daripada kategori bernama "Makan".
  const byName = categories
    .filter((c) => {
      const words = normalize(c.name).split(' ').filter((w) => w.length > 3);
      return words.length > 0 && words.every((w) => hasWord(text, w));
    })
    .sort((a, b) => b.name.length - a.name.length);
  if (byName[0]) return byName[0];

  let best: { cat: Category; len: number } | undefined;
  for (const [id, words] of Object.entries(HINTS)) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) continue;
    for (const w of words) {
      if (hasWord(text, w) && (!best || w.length > best.len)) best = { cat, len: w.length };
    }
  }
  return best?.cat;
}

/* ------------------------------------------------------------------ */
/* Maksud pertanyaan                                                   */
/* ------------------------------------------------------------------ */

function detectIntent(text: string, hasCategory: boolean): Intent {
  if (!text) return 'unknown';

  if (has(text, 'halo', 'hai', 'hei', 'assalamu', 'pagi', 'siang', 'sore', 'malam') && text.length < 24) {
    return 'greeting';
  }
  if (has(text, 'bisa apa', 'apa saja', 'bantuan', 'help', 'cara pakai', 'kamu bisa')) return 'help';

  if (has(text, 'saran', 'sarannya', 'tips', 'nasihat', 'nasehat', 'rekomendasi', 'gimana caranya', 'bagaimana caranya', 'harus gimana', 'hemat', 'menghemat', 'berhemat', 'evaluasi', 'analisis', 'analisa', 'sehat', 'kondisi keuangan', 'boros nggak', 'boros ga', 'menurut kamu')) {
    return 'advice';
  }
  // Pencocokan memakai batas kata, jadi imbuhan harus disebut satu per satu.
  if (has(text, 'banding', 'bandingkan', 'dibanding', 'dibandingkan', 'perbandingan', 'vs', 'versus', 'selisih', 'naik atau turun', 'lebih besar', 'lebih boros')) {
    return 'compare';
  }
  if (has(text, 'paling boros', 'paling besar', 'terboros', 'terbesar', 'boros', 'top', 'peringkat', 'ranking', 'paling sering', 'urutan', 'kemana perginya', 'ke mana perginya', 'rincian', 'rinciannya', 'breakdown')) {
    return 'ranking';
  }
  if (has(text, 'hutang', 'hutangnya', 'berhutang', 'utang', 'piutang', 'piutangnya', 'pinjam', 'pinjaman', 'meminjam', 'nagih', 'menagih', 'ditagih', 'penagihan', 'belum bayar', 'jatuh tempo')) {
    return 'debt';
  }
  if (has(text, 'anggaran', 'anggarannya', 'budget', 'jebol', 'batas belanja', 'sisa anggaran')) return 'budget';
  if (has(text, 'saldo', 'sisa uang', 'uang saya', 'punya uang', 'dompet')) return 'balance';
  if (has(text, 'ringkas', 'ringkasan', 'ringkaskan', 'rangkum', 'rangkuman', 'laporan', 'overview', 'kondisi', 'gambaran')) return 'overview';

  if (has(text, 'berapa', 'total', 'jumlah', 'habis', 'keluar', 'masuk', 'pengeluaran', 'pemasukan', 'belanja', 'dapat', 'income') || hasCategory) {
    return 'metric';
  }
  return 'unknown';
}

/** Menafsirkan satu pertanyaan menjadi bentuk yang bisa dihitung. */
export function parseQuestion(raw: string, data: AppData): ParsedQuestion {
  const text = normalize(raw);
  const category = matchCategory(text, data.categories);
  const period = parsePeriod(text, data.transactions);

  const incomeWords = has(text, 'pemasukan', 'penghasilan', 'pendapatan', 'gaji', 'income', 'uang masuk', 'dapat duit', 'terima');
  const expenseWords = has(text, 'pengeluaran', 'keluar', 'habis', 'belanja', 'boros', 'spending', 'uang keluar', 'jajan');

  // Kategori pemasukan otomatis mengarahkan pertanyaan ke arus masuk.
  const flow: 'expense' | 'income' =
    incomeWords || (category?.type === 'income' && !expenseWords) ? 'income' : 'expense';

  const intent = detectIntent(text, Boolean(category));

  // Nama orang pada pertanyaan hutang: cocokkan dengan daftar yang ada.
  let personName: string | undefined;
  if (intent === 'debt') {
    const found = data.debts.find((d) => {
      const first = normalize(d.personName).split(' ')[0];
      return first.length > 2 && text.includes(first);
    });
    personName = found?.personName;
  }

  return {
    intent,
    normalized: text,
    period,
    categoryId: category?.id,
    categoryName: category?.name,
    flow,
    flowExplicit: incomeWords || expenseWords,
    personName,
  };
}
