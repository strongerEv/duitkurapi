/**
 * Ujian pemahaman asisten Duitku.
 *
 * Berisi ratusan cara orang bertanya soal keuangan — lengkap dengan singkatan,
 * salah ketik, dan susunan kalimat yang bermacam-macam. Dipakai untuk
 * memastikan asisten tidak kebingungan saat ditanya dengan bahasa sehari-hari.
 *
 * Jalankan dengan:  npm run eval:asisten
 */
import { createDemoData } from '../src/lib/seed';
import { parseQuestion } from '../src/lib/assistant/parse';
import { ask } from '../src/lib/assistant';
import type { Intent } from '../src/lib/assistant/types';

const data = createDemoData('Evan');

interface Kasus {
  t: string;
  i: Intent;
  kat?: string;
  per?: string;
}

const k = (t: string, i: Intent, kat?: string, per?: string): Kasus => ({ t, i, kat, per });

const SOAL: Kasus[] = [
  /* ---------- Nominal per kategori ---------- */
  k('berapa pengeluaran bensin bulan ini', 'metric', 'Transportasi', 'bulan ini'),
  k('uang bensin habis berapa', 'metric', 'Transportasi'),
  k('total bbm bulan ini', 'metric', 'Transportasi'),
  k('habis berapa buat pertamax', 'metric', 'Transportasi'),
  k('pengeluaran ojek online berapa', 'metric', 'Transportasi'),
  k('berapa saya keluar buat grab', 'metric', 'Transportasi'),
  k('duit parkir sama tol berapa', 'metric', 'Transportasi'),
  k('biaya transportasi bulan ini', 'metric', 'Transportasi'),
  k('berapa habis buat makan', 'metric', 'Makan & Minum'),
  k('total jajan bulan ini berapa', 'metric', 'Makan & Minum'),
  k('uang ngopi habis berapa', 'metric', 'Makan & Minum'),
  k('berapa saya belanja di warung', 'metric', 'Makan & Minum'),
  k('pengeluaran gofood berapa', 'metric', 'Makan & Minum'),
  k('habis berapa buat sarapan', 'metric', 'Makan & Minum'),
  k('berapa buat kuliner bulan ini', 'metric', 'Makan & Minum'),
  k('total belanja bulan ini', 'metric', 'Belanja'),
  k('pengeluaran skincare berapa', 'metric', 'Belanja'),
  k('habis berapa di shopee', 'metric', 'Belanja'),
  k('berapa buat beli baju', 'metric', 'Belanja'),
  k('bayar listrik berapa', 'metric', 'Tagihan'),
  k('tagihan air bulan ini berapa', 'metric', 'Tagihan'),
  k('uang sewa kos berapa', 'metric', 'Tagihan'),
  k('berapa iuran bulan ini', 'metric', 'Tagihan'),
  k('pengeluaran netflix berapa', 'metric', 'Hiburan'),
  k('habis berapa buat nonton', 'metric', 'Hiburan'),
  k('biaya langganan spotify', 'metric', 'Hiburan'),
  k('uang liburan berapa', 'metric', 'Hiburan'),
  k('berapa buat obat', 'metric', 'Kesehatan'),
  k('biaya dokter bulan ini', 'metric', 'Kesehatan'),
  k('pengeluaran vitamin berapa', 'metric', 'Kesehatan'),
  k('habis berapa berobat', 'metric', 'Kesehatan'),
  k('uang pulsa habis berapa', 'metric', 'Pulsa & Internet'),
  k('berapa buat kuota internet', 'metric', 'Pulsa & Internet'),
  k('bayar wifi berapa', 'metric', 'Pulsa & Internet'),
  k('pengeluaran buat kucing', 'metric', 'Hewan Peliharaan'),
  k('habis berapa di petshop', 'metric', 'Hewan Peliharaan'),
  k('biaya hewan peliharaan berapa', 'metric', 'Hewan Peliharaan'),
  k('uang sekolah berapa', 'metric', 'Pendidikan'),
  k('biaya kursus bulan ini', 'metric', 'Pendidikan'),
  k('berapa buat beli buku', 'metric', 'Pendidikan'),
  k('pengeluaran donasi berapa', 'metric', 'Donasi & Zakat'),
  k('zakat berapa bulan ini', 'metric', 'Donasi & Zakat'),
  k('habis berapa buat sedekah', 'metric', 'Donasi & Zakat'),

  /* ---------- Pemasukan ---------- */
  k('gaji saya berapa bulan ini', 'metric', 'Gaji'),
  k('berapa gajian bulan ini', 'metric', 'Gaji'),
  k('pemasukan dari freelance berapa', 'metric', 'Freelance'),
  k('duit dari proyek berapa', 'metric', 'Freelance'),
  k('penghasilan usaha bulan ini', 'metric', 'Usaha'),
  k('berapa dapat dari jualan', 'metric', 'Usaha'),
  k('total pemasukan bulan ini', 'metric'),
  k('total duit masuk bulan ini', 'metric'),
  k('berapa penghasilan saya', 'metric'),
  k('pendapatan bulan lalu berapa', 'metric', undefined, 'Agustus 2026'),
  k('dapat bonus berapa', 'metric', 'Bonus & THR'),
  k('thr saya berapa', 'metric', 'Bonus & THR'),

  /* ---------- Periode ---------- */
  k('pengeluaran hari ini', 'metric', undefined, 'hari ini'),
  k('habis berapa hari ini', 'metric', undefined, 'hari ini'),
  k('pengeluaran kemarin berapa', 'metric', undefined, 'kemarin'),
  k('total pengeluaran minggu ini', 'metric', undefined, 'minggu ini'),
  k('pengeluaran minggu lalu', 'metric', undefined, 'minggu lalu'),
  k('habis berapa bulan ini', 'metric', undefined, 'bulan ini'),
  k('pengeluaran bulan lalu', 'metric', undefined, 'Agustus 2026'),
  k('pengeluaran bulan kemarin', 'metric', undefined, 'Agustus 2026'),
  k('total pengeluaran tahun ini', 'metric', undefined, 'tahun 2026'),
  k('pengeluaran tahun lalu', 'metric', undefined, 'tahun 2025'),
  k('pengeluaran agustus', 'metric', undefined, 'Agustus 2026'),
  k('pengeluaran agustus kemarin', 'metric', undefined, 'Agustus 2026'),
  k('total pengeluaran juli 2026', 'metric', undefined, 'Juli 2026'),
  k('pengeluaran 3 bulan terakhir', 'metric', undefined, '3 bulan terakhir'),
  k('total pengeluaran 6 bulan terakhir', 'metric', undefined, '6 bulan terakhir'),
  k('pengeluaran sepanjang waktu', 'metric', undefined, 'sepanjang waktu'),

  /* ---------- Peringkat & terbesar ---------- */
  k('kategori apa yang paling boros', 'ranking'),
  k('yang paling boros apa', 'ranking'),
  k('saya boros di mana', 'ranking'),
  k('kemana perginya uang saya', 'ranking'),
  k('rincian pengeluaran bulan ini', 'ranking'),
  k('breakdown pengeluaran dong', 'ranking'),
  k('urutan pengeluaran terbesar per kategori', 'ranking'),
  k('kategori mana yang paling banyak', 'ranking'),
  k('pengeluaran terbesar bulan ini apa', 'largest'),
  k('transaksi paling gede apa', 'largest'),
  k('belanja paling mahal apa', 'largest'),
  k('catatan terbesar bulan ini', 'largest'),

  /* ---------- Hitung, rata-rata, kapan ---------- */
  k('berapa kali saya jajan bulan ini', 'count', 'Makan & Minum'),
  k('ada berapa transaksi bulan ini', 'count'),
  k('berapa transaksi minggu ini', 'count', undefined, 'minggu ini'),
  k('seberapa sering saya ngopi', 'count', 'Makan & Minum'),
  k('berapa banyak transaksi bulan ini', 'count'),
  k('rata rata pengeluaran harian', 'average'),
  k('rata-rata saya habis berapa sehari', 'average'),
  k('per hari saya habis berapa', 'average'),
  k('kapan terakhir saya isi bensin', 'when', 'Transportasi'),
  k('kapan terakhir beli obat', 'when', 'Kesehatan'),
  k('kapan saya gajian', 'when', 'Gaji'),
  k('kapan terakhir belanja', 'when', 'Belanja'),

  /* ---------- Perbandingan ---------- */
  k('bandingkan dengan bulan lalu', 'compare', undefined, 'bulan ini'),
  k('bandingin pengeluaran bulan ini sama bulan lalu', 'compare', undefined, 'bulan ini'),
  k('lebih boros bulan ini apa bulan lalu', 'compare'),
  k('naik atau turun pengeluaran saya', 'compare'),
  k('bensin bulan ini vs bulan lalu', 'compare', 'Transportasi', 'bulan ini'),
  k('selisih pengeluaran bulan ini dan bulan lalu', 'compare', undefined, 'bulan ini'),
  k('lebih hemat mana bulan ini atau kemarin', 'compare'),
  k('perbandingan pengeluaran makan', 'compare', 'Makan & Minum'),

  /* ---------- Hutang & piutang ---------- */
  k('siapa yang ngutang ke saya', 'debt'),
  k('siapa aja yang belum bayar', 'debt'),
  k('total piutang saya berapa', 'debt'),
  k('berapa uang saya yang dipegang orang', 'debt'),
  k('saya ada utang nggak', 'debt'),
  k('hutang saya berapa', 'debt'),
  k('saya punya hutang ke siapa', 'debt'),
  k('budi udah bayar belum', 'debt'),
  k('rian masih ngutang berapa', 'debt'),
  k('siti sudah lunas belum', 'debt'),
  k('siapa yang paling lama belum bayar', 'debt'),
  k('ada yang jatuh tempo nggak', 'debt'),
  k('siapa yang telat bayar', 'debt'),
  k('gimana hutang piutang saya', 'debt'),
  k('berapa yang harus saya tagih', 'debt'),
  k('utang piutang saya gimana', 'debt'),
  k('pinjaman yang belum kembali berapa', 'debt'),
  k('siapa aja yang pinjam uang saya', 'debt'),

  /* ---------- Anggaran ---------- */
  k('anggaran saya gimana', 'budget'),
  k('budget saya jebol nggak', 'budget'),
  k('sisa anggaran berapa', 'budget'),
  k('anggaran makan masih sisa berapa', 'budget'),
  k('apa anggaran saya aman', 'budget'),
  k('batas belanja saya berapa', 'budget'),
  k('anggaran mana yang jebol', 'budget'),

  /* ---------- Saldo & dompet ---------- */
  k('berapa saldo saya', 'balance'),
  k('sisa uang saya berapa', 'balance'),
  k('total duit saya berapa', 'balance'),
  k('saya punya uang berapa sekarang', 'balance'),
  k('saldo rekening bank berapa', 'wallet'),
  k('duit di e-wallet berapa', 'wallet'),
  k('uang tunai saya berapa', 'wallet'),
  k('saldo bca berapa', 'wallet'),
  k('isi gopay berapa', 'wallet'),
  k('berapa cash yang saya pegang', 'wallet'),

  /* ---------- Saran & analisis ---------- */
  k('ada saran biar lebih hemat', 'advice'),
  k('gimana caranya biar hemat', 'advice'),
  k('keuangan saya sehat nggak', 'advice'),
  k('menurut kamu gimana keuangan saya', 'advice'),
  k('boros nggak sih saya', 'advice'),
  k('tolong analisa keuangan saya', 'advice'),
  k('evaluasi pengeluaran saya dong', 'advice'),
  k('saya harus gimana biar bisa nabung', 'advice'),
  k('kasih tips keuangan dong', 'advice'),
  k('gimana kondisi keuangan saya', 'advice'),
  k('apa yang harus saya perbaiki', 'advice'),

  /* ---------- Ringkasan ---------- */
  k('ringkasan bulan ini', 'overview'),
  k('rangkum keuangan saya', 'overview'),
  k('laporan bulan ini dong', 'overview'),
  k('gambaran keuangan saya', 'overview'),

  /* ---------- Sapaan, bantuan, sopan santun ---------- */
  k('halo', 'greeting'),
  k('hai', 'greeting'),
  k('selamat pagi', 'greeting'),
  k('kamu bisa apa aja', 'help'),
  k('bantuan', 'help'),
  k('cara pakai gimana', 'help'),
  k('kamu siapa', 'identity'),
  k('nama kamu siapa', 'identity'),
  k('kamu ai ya', 'identity'),
  k('makasih ya', 'thanks'),
  k('terima kasih', 'thanks'),
  k('thanks', 'thanks'),

  /* ---------- Singkatan & bahasa chat ---------- */
  k('brp pengeluaran bensin bln ini', 'metric', 'Transportasi', 'bulan ini'),
  k('brp sy habis buat makan', 'metric', 'Makan & Minum'),
  k('duit gw abis brp bulan ini', 'metric'),
  k('gmn kondisi keuangan gw', 'advice'),
  k('sisa duit gw brp', 'balance'),
  k('yg paling boros apa sih', 'ranking'),
  k('gw abis brp buat jajan', 'metric', 'Makan & Minum'),
  k('sy ada utang ga', 'debt'),
  k('brp sisa anggaran gw', 'budget'),
  k('gw boros ga sih', 'advice'),
  k('duit gw skrg brp', 'balance'),
  k('bandingin dong sm bulan lalu', 'compare', undefined, 'bulan ini'),

  /* ---------- Salah ketik ---------- */
  k('berapa pengeluran bulan ini', 'metric'),
  k('pengluaran bensin brapa', 'metric', 'Transportasi'),
  k('kategori paling booros', 'ranking'),
  k('brapa saldoo saya', 'balance'),
  k('total pengeluaraan bulan ini', 'metric'),
  k('anggran saya gimana', 'budget'),
  k('hutan saya berapa', 'debt'),
  k('ringkasn keuangan saya', 'overview'),
  k('rata rata pengluaran harian', 'average'),
  k('transaksi terbesr apa', 'largest'),
];

/* ------------------------------------------------------------------ */

let lolos = 0;
const gagal: string[] = [];

for (const s of SOAL) {
  const p = parseQuestion(s.t, data);
  const okI = p.intent === s.i;
  const okK = s.kat === undefined || p.categoryName === s.kat;
  const okP = s.per === undefined || p.period.label === s.per;
  if (okI && okK && okP) {
    lolos++;
    continue;
  }
  const salah: string[] = [];
  if (!okI) salah.push(`maksud=${p.intent}≠${s.i}`);
  if (!okK) salah.push(`kategori=${p.categoryName ?? '-'}≠${s.kat}`);
  if (!okP) salah.push(`periode=${p.period.label}≠${s.per}`);
  gagal.push(`  ✗ "${s.t}" → ${salah.join(', ')}`);
}

if (gagal.length) console.log(gagal.join('\n'));
console.log(`\nPemahaman: ${lolos}/${SOAL.length} (${Math.round((lolos / SOAL.length) * 100)}%)`);

/* Tidak boleh ada pertanyaan yang dijawab dengan tangan hampa. */
const hampa: string[] = [];
for (const s of SOAL) {
  const a = ask(s.t, data);
  if (!a.text || a.text.trim().length < 12) hampa.push(s.t);
  if (!a.suggestions || a.suggestions.length === 0) hampa.push(`${s.t} (tanpa saran lanjutan)`);
}
console.log(hampa.length ? `\nJawaban hampa:\n  ${hampa.join('\n  ')}` : 'Semua pertanyaan dijawab dengan isi ✅');

if (gagal.length || hampa.length) process.exitCode = 1;
