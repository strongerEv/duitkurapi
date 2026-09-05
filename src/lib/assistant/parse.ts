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

/**
 * Singkatan dan bahasa percakapan yang lazim dipakai orang saat mengetik cepat.
 * Dipetakan ke bentuk baku supaya sisa penafsir tidak perlu tahu ragam ini.
 */
const GAUL: Record<string, string> = {
  gw: 'saya', gue: 'saya', gua: 'saya', aku: 'saya', ane: 'saya', sy: 'saya',
  brp: 'berapa', brapa: 'berapa', bpr: 'berapa',
  bln: 'bulan', thn: 'tahun', mgg: 'minggu',
  yg: 'yang', dg: 'dengan', dgn: 'dengan', sm: 'sama', utk: 'untuk', buat: 'untuk',
  gmn: 'gimana', gmna: 'gimana', gimna: 'gimana', bgmn: 'bagaimana',
  aja: 'saja', doang: 'saja', dong: '', sih: '', deh: '', nih: '', kok: '',
  udh: 'sudah', udah: 'sudah', dah: 'sudah',
  gak: 'tidak', ga: 'tidak', nggak: 'tidak', ngga: 'tidak', kaga: 'tidak', enggak: 'tidak',
  duit: 'uang', cuan: 'uang', fulus: 'uang',
  bandingin: 'bandingkan', bandingi: 'bandingkan',
  ngutang: 'hutang', ngutangin: 'hutang', utangin: 'hutang',
  abis: 'habis', ngabisin: 'habis',
  gede: 'besar', gedhe: 'besar',
  brg: 'barang', tf: 'transfer',
  bbrp: 'beberapa', sblm: 'sebelum',
};

/**
 * Kata penting yang sering salah ketik. Dipakai sebagai kamus pembanding untuk
 * mengoreksi ejaan, supaya "pengeluran" atau "booros" tetap dipahami.
 */
const KAMUS = [
  'pengeluaran', 'pemasukan', 'penghasilan', 'pendapatan', 'berapa', 'saldo', 'boros',
  'kategori', 'transaksi', 'hutang', 'piutang', 'anggaran', 'bandingkan', 'dibanding',
  'bulan', 'minggu', 'tahun', 'kemarin', 'terakhir', 'terbesar', 'paling', 'rata',
  'bensin', 'makan', 'belanja', 'tagihan', 'hiburan', 'kesehatan', 'transportasi',
  'keuangan', 'ringkasan', 'laporan', 'dompet', 'tabungan', 'sisa', 'total', 'jumlah',
  'saran', 'hemat', 'jajan', 'gaji', 'bayar', 'lunas', 'sering', 'kapan', 'siapa',
];

/** Jarak ubah antar dua kata, dipakai untuk menoleransi salah ketik ringan. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const simpan = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = simpan;
    }
  }
  return prev[b.length];
}

/** Mengembalikan bentuk baku sebuah kata: singkatan dibuka, ejaan dirapikan. */
function bakukan(kata: string): string {
  if (kata in GAUL) return GAUL[kata];

  // Huruf berulang seperti "booros" atau "saldoo" dirapatkan lebih dulu.
  const rapat = kata.replace(/([a-z])\1{1,}/g, '$1');
  if (KAMUS.includes(rapat)) return rapat;
  if (KAMUS.includes(kata)) return kata;

  /*
   * Koreksi ejaan dibatasi satu huruf saja. Toleransi dua huruf terbukti
   * berbahaya: kata sah seperti "langganan" ikut diubah menjadi "anggaran",
   * sehingga pertanyaan soal langganan dikira pertanyaan soal anggaran.
   */
  if (kata.length >= 5) {
    let terbaik: { kata: string; jarak: number } | undefined;
    for (const benar of KAMUS) {
      const jarak = editDistance(kata, benar);
      if (jarak <= 1 && (!terbaik || jarak < terbaik.jarak)) terbaik = { kata: benar, jarak };
    }
    if (terbaik) return terbaik.kata;
  }
  return kata;
}

/**
 * Membuang tanda baca, membakukan singkatan, dan mengoreksi salah ketik ringan
 * supaya pencocokan kata kunci tidak gampang meleset.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sÀ-ɏ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(bakukan)
    .filter(Boolean)
    .join(' ');
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

  /*
   * "Bandingkan dengan bulan lalu" menyebut bulan lalu sebagai pembanding,
   * bukan sebagai periode yang ditanyakan. Tanpa aturan ini, jawabannya jadi
   * membandingkan bulan lalu dengan dua bulan lalu — bukan yang dimaksud.
   */
  const sebagaiPembanding = /\b(dengan|dibanding|dibandingkan|banding|bandingkan|vs|versus|sama)\s+(bulan|minggu|tahun)\s+(lalu|kemarin)\b/.test(text);

  if (has(text, 'bulan ini', 'sebulan ini') || (sebagaiPembanding && has(text, 'bulan lalu', 'bulan kemarin'))) {
    const p = monthPeriod(currentMonthKey());
    return { ...p, label: 'bulan ini' };
  }

  if (sebagaiPembanding && has(text, 'minggu lalu', 'minggu kemarin')) {
    const range = weekRangeOf(today);
    const prev = weekRangeOf(shiftDays(today, -7));
    return { label: 'minggu ini', range, previous: { label: 'minggu lalu', range: prev }, implicit: false };
  }

  if (sebagaiPembanding && has(text, 'tahun lalu', 'tahun kemarin')) {
    const year = String(new Date().getFullYear());
    const prevYear = String(Number(year) - 1);
    return {
      label: `tahun ${year}`,
      range: yearRangeOf(year),
      previous: { label: `tahun ${prevYear}`, range: yearRangeOf(prevYear) },
      implicit: false,
    };
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

  // Nama bulan diperiksa sebelum kata "kemarin" yang berdiri sendiri, supaya
  // "Agustus kemarin" dibaca sebagai bulan Agustus, bukan hari kemarin.
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const name = MONTH_NAMES[i].toLowerCase();
    if (!hasWord(text, name)) continue;
    const yearMatch = text.match(/(20\d{2})/);
    const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
    return monthPeriod(`${year}-${String(i + 1).padStart(2, '0')}`);
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

/**
 * Nama kategori yang juga merupakan kata umum sehari-hari. "Belanja di warung"
 * lebih tepat masuk Makan & Minum daripada kategori bernama Belanja, jadi nama
 * seperti ini hanya dipakai bila tidak ada petunjuk yang lebih spesifik.
 */
const NAMA_UMUM = ['belanja', 'lainnya', 'tagihan', 'usaha'];

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

  const umum = byName[0] && NAMA_UMUM.includes(normalize(byName[0].name));
  if (byName[0] && !umum) return byName[0];

  // Kata petunjuk dikumpulkan dulu, lalu yang khusus diutamakan. "Belanja di
  // warung" menyebut dua petunjuk sekaligus, dan "warung" lebih menjelaskan.
  const cocok: { cat: Category; len: number; umum: boolean }[] = [];
  for (const [id, words] of Object.entries(HINTS)) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) continue;
    for (const w of words) {
      if (hasWord(text, w)) cocok.push({ cat, len: w.length, umum: NAMA_UMUM.includes(w) });
    }
  }

  const khusus = cocok.filter((c) => !c.umum).sort((a, b) => b.len - a.len);
  if (khusus[0]) return khusus[0].cat;

  const sisa = cocok.sort((a, b) => b.len - a.len);
  return sisa[0]?.cat ?? byName[0];
}

/* ------------------------------------------------------------------ */
/* Dompet                                                              */
/* ------------------------------------------------------------------ */

/** Nama bank dan dompet digital yang lazim disebut orang. */
const HINT_DOMPET: Record<string, string[]> = {
  bank: ['bank', 'rekening', 'bca', 'mandiri', 'bri', 'bni', 'atm', 'tabungan'],
  ewallet: ['wallet', 'ewallet', 'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja', 'digital'],
  tunai: ['tunai', 'cash', 'dompet fisik', 'uang tunai'],
};

/** Mencari dompet yang dimaksud pertanyaan. */
export function matchWallet(text: string, wallets: AppData['wallets']) {
  // Nama dompet yang benar-benar dimiliki pengguna diutamakan.
  const byName = wallets
    .filter((w) => {
      const words = normalize(w.name).split(' ').filter((x) => x.length > 3);
      return words.length > 0 && words.every((x) => hasWord(text, x));
    })
    .sort((a, b) => b.name.length - a.name.length);
  if (byName[0]) return byName[0];

  for (const [kunci, kata] of Object.entries(HINT_DOMPET)) {
    if (!kata.some((k) => hasWord(text, k))) continue;
    const cocok = wallets.find((w) => {
      const n = normalize(w.name);
      if (kunci === 'bank') return n.includes('bank') || n.includes('rekening');
      if (kunci === 'ewallet') return n.includes('wallet') || n.includes('digital');
      return n.includes('tunai') || n.includes('cash');
    });
    if (cocok) return cocok;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Maksud pertanyaan                                                   */
/* ------------------------------------------------------------------ */

/**
 * Menentukan maksud pertanyaan.
 *
 * Urutannya penting: yang lebih khusus diperiksa lebih dulu, supaya
 * "berapa kali saya jajan" tidak tertangkap sebagai pertanyaan nominal
 * hanya karena mengandung kata "berapa".
 */
function detectIntent(
  text: string,
  ada: { kategori: boolean; dompet: boolean; orang: boolean },
): Intent {
  if (!text) return 'unknown';

  if (has(text, 'halo', 'hai', 'hei', 'assalamu', 'pagi', 'siang', 'sore', 'malam') && text.length < 24) {
    return 'greeting';
  }
  if (has(text, 'bisa apa', 'apa saja', 'bantuan', 'help', 'cara pakai', 'kamu bisa')) return 'help';

  if (has(text, 'makasih', 'makasi', 'terima kasih', 'thanks', 'thank you', 'trims', 'tengkyu', 'suwun')) {
    return 'thanks';
  }
  if (
    has(text, 'kamu siapa', 'siapa kamu', 'nama kamu', 'kamu ai', 'kamu bot', 'kamu robot', 'kamu apa') ||
    /\bsiapa\s+(kamu|km|anda)\b/.test(text)
  ) {
    return 'identity';
  }

  // Pertanyaan waktu: "kapan terakhir aku isi bensin"
  if (has(text, 'kapan', 'tanggal berapa')) return 'when';

  // Menghitung banyaknya, bukan nominalnya.
  if (
    has(text, 'berapa kali', 'berapa sering', 'seberapa sering', 'berapa banyak transaksi', 'berapa transaksi') ||
    /\bada berapa\b/.test(text) ||
    (has(text, 'jumlah', 'banyaknya') && has(text, 'transaksi'))
  ) {
    return 'count';
  }

  if (has(text, 'rata rata', 'rata-rata', 'rerata', 'per hari', 'sehari')) return 'average';

  // Permintaan saran yang tidak bisa disalahartikan diperiksa paling awal,
  // supaya "ada saran biar lebih hemat" tidak tertangkap kata "lebih hemat"
  // milik pertanyaan perbandingan.
  if (has(text, 'saran', 'sarannya', 'tips', 'rekomendasi', 'nasihat', 'nasehat', 'masukan')) {
    return 'advice';
  }

  // Perbandingan didahulukan: "lebih hemat mana" mengandung kata "hemat"
  // yang juga milik pertanyaan saran.
  if (
    has(
      text, 'banding', 'bandingkan', 'dibanding', 'dibandingkan', 'perbandingan', 'vs', 'versus',
      'selisih', 'naik atau turun', 'lebih besar', 'lebih boros', 'lebih hemat', 'lebih murah',
    )
  ) {
    return 'compare';
  }

  // Permintaan rangkuman didahulukan, sebab "ringkasan keuangan saya" memuat
  // kata "keuangan saya" yang juga milik pertanyaan saran.
  const mintaRangkuman = has(
    text, 'ringkas', 'ringkasan', 'ringkaskan', 'rangkum', 'rangkuman', 'laporan',
    'overview', 'gambaran', 'rekap',
  );
  if (mintaRangkuman) return 'overview';

  if (
    has(
      text, 'saran', 'sarannya', 'tips', 'nasihat', 'nasehat', 'rekomendasi', 'gimana caranya',
      'bagaimana caranya', 'harus gimana', 'hemat', 'menghemat', 'berhemat', 'evaluasi',
      'analisis', 'analisa', 'sehat', 'kondisi', 'kondisi keuangan', 'keuangan saya',
      'gimana keuangan', 'bagaimana keuangan', 'keuanganku', 'boros tidak', 'boros nggak',
      'menurut kamu', 'perbaiki', 'diperbaiki', 'masukan', 'pendapat kamu', 'bisa nabung',
    )
  ) {
    return 'advice';
  }

  // Satu transaksi terbesar berbeda dengan peringkat kategori. Penyebutan
  // "kategori" jadi penentu: tanpa itu, orang menanyakan satu transaksi.
  const nadaTerbesar = has(text, 'terbesar', 'paling besar', 'paling mahal', 'paling banyak', 'terbanyak');
  if (nadaTerbesar && has(text, 'transaksi', 'pengeluaran', 'belanja', 'catatan') && !has(text, 'kategori')) {
    return 'largest';
  }

  if (
    has(
      text, 'paling boros', 'terboros', 'boros', 'kategori', 'peringkat', 'ranking', 'urutan',
      'paling sering', 'kemana perginya', 'ke mana perginya', 'rincian', 'rinciannya', 'breakdown',
    ) ||
    nadaTerbesar
  ) {
    return 'ranking';
  }

  // Pertanyaan tentang orang tertentu yang berhutang.
  if (ada.orang && has(text, 'bayar', 'lunas', 'hutang', 'utang', 'piutang', 'sisa', 'berapa', 'belum')) {
    return 'debt';
  }

  if (
    has(
      text, 'hutang', 'hutangnya', 'berhutang', 'utang', 'piutang', 'piutangnya', 'pinjam',
      'pinjaman', 'meminjam', 'nagih', 'menagih', 'ditagih', 'tagih', 'penagihan',
      'belum bayar', 'sudah bayar', 'telat bayar', 'telat', 'nunggak', 'menunggak',
      'tunggakan', 'jatuh tempo', 'dipegang', 'dipegang orang', 'belum kembali', 'belum balik',
    )
  ) {
    return 'debt';
  }

  if (has(text, 'anggaran', 'anggarannya', 'budget', 'jebol', 'batas belanja', 'sisa anggaran')) return 'budget';

  // Dompet tertentu diperiksa sebelum saldo keseluruhan.
  if (ada.dompet && has(text, 'saldo', 'uang', 'isi', 'berapa', 'sisa')) return 'wallet';

  // "Total uang masuk" menanyakan pemasukan, bukan saldo. Karena itu penyebutan
  // arah kas apa pun membatalkan penafsiran sebagai pertanyaan saldo.
  const nadaArusKas = has(
    text, 'habis', 'keluar', 'pengeluaran', 'belanja', 'boros', 'jajan',
    'masuk', 'pemasukan', 'penghasilan', 'pendapatan', 'gaji',
  );
  if (has(text, 'saldo', 'sisa uang', 'uang saya', 'punya uang', 'dompet', 'total uang') && !nadaArusKas) {
    return 'balance';
  }

  if (
    has(text, 'berapa', 'total', 'jumlah', 'habis', 'keluar', 'masuk', 'pengeluaran', 'pemasukan', 'belanja', 'dapat', 'income') ||
    ada.kategori
  ) {
    return 'metric';
  }
  return 'unknown';
}

/** Menafsirkan satu pertanyaan menjadi bentuk yang bisa dihitung. */
export function parseQuestion(raw: string, data: AppData): ParsedQuestion {
  const text = normalize(raw);
  const category = matchCategory(text, data.categories);
  const wallet = matchWallet(text, data.wallets);
  const period = parsePeriod(text, data.transactions);

  // Nama orang dicocokkan lebih dulu, karena "Budi sudah bayar belum"
  // hanya bisa dikenali sebagai pertanyaan hutang lewat namanya.
  const orang = data.debts.find((d) => {
    const depan = normalize(d.personName).split(' ')[0];
    return depan.length > 2 && hasWord(text, depan);
  });

  const incomeWords = has(text, 'pemasukan', 'penghasilan', 'pendapatan', 'gaji', 'income', 'uang masuk', 'terima');
  const expenseWords = has(text, 'pengeluaran', 'keluar', 'habis', 'belanja', 'boros', 'jajan', 'uang keluar');

  const flow: 'expense' | 'income' =
    incomeWords || (category?.type === 'income' && !expenseWords) ? 'income' : 'expense';

  const intent = detectIntent(text, {
    kategori: Boolean(category),
    dompet: Boolean(wallet),
    orang: Boolean(orang),
  });

  const tanyaMilikOrang = has(
    text, 'piutang', 'piutangnya', 'hutang ke saya', 'utang ke saya', 'hutang ke aku',
    'yang hutang', 'yang belum bayar', 'siapa yang', 'nagih', 'menagih', 'ditagih',
    'penagihan', 'tertagih', 'dipinjam',
  );
  const tanyaMilikSaya = has(
    text, 'hutang saya', 'utang saya', 'hutangku', 'utangku',
    'saya punya hutang', 'saya punya utang', 'saya ada hutang', 'saya ada utang',
    'saya berhutang', 'saya hutang', 'saya harus bayar',
  );
  const tanyaKeduanya = has(text, 'hutang piutang', 'utang piutang', 'piutang hutang', 'hutang dan piutang');

  const debtSide: 'mine' | 'theirs' | 'both' =
    tanyaKeduanya || (tanyaMilikOrang && tanyaMilikSaya)
      ? 'both'
      : tanyaMilikOrang
        ? 'theirs'
        : tanyaMilikSaya
          ? 'mine'
          : 'both';

  return {
    intent,
    normalized: text,
    period,
    categoryId: category?.id,
    categoryName: category?.name,
    walletId: wallet?.id,
    walletName: wallet?.name,
    flow,
    flowExplicit: incomeWords || expenseWords,
    personName: orang?.personName,
    debtSide,
  };
}
