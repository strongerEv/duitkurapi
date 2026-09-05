import type { AppData, Transaction } from '../../types';
import {
  breakdownByCategory,
  budgetStatuses,
  debtAgeDays,
  debtRemaining,
  filterByRange,
  isOverdue,
  totalBalance,
  totalByType,
  walletBalance,
} from '../calc';
import { formatDate, formatRange, humanizeDuration, monthKey, rangeLengthDays, type DateRange } from '../date';
import { formatMoney, formatPercent } from '../format';
import type { Answer, AnswerBlock, ParsedPeriod, ParsedQuestion } from './types';

/**
 * Perakit jawaban.
 *
 * Angkanya dihitung langsung dari catatan pengguna, tapi cara menyampaikannya
 * sengaja dibuat seperti teman yang lagi bantu lihat-lihat pengeluaran —
 * pakai "kamu", kalimat pendek, dan sesekali bereaksi. Bukan seperti laporan
 * bank.
 */

interface Ctx {
  data: AppData;
  money: (v: number) => string;
}

function makeCtx(data: AppData): Ctx {
  const { currency, showDecimals } = data.settings;
  return { data, money: (v: number) => formatMoney(v, currency, showDecimals) };
}

const txIn = (data: AppData, range: DateRange) => filterByRange(data.transactions, range.from, range.to);

/** Memilih satu dari beberapa variasi kalimat, biar tidak terdengar seperti robot. */
function pick(...opts: string[]): string {
  return opts[Math.floor(Math.random() * opts.length)];
}

/** "bulan ini" tetap huruf kecil di tengah kalimat, tapi kapital di awal. */
function kapital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Menyusun keterangan perubahan dengan bahasa sehari-hari. */
function delta(now: number, before: number): { text: string; turun: boolean; datar: boolean; pct: number } {
  if (before === 0 && now === 0) return { text: 'sama-sama kosong', turun: false, datar: true, pct: 0 };
  if (before === 0) return { text: 'baru ada bulan ini', turun: false, datar: false, pct: 100 };
  const diff = now - before;
  const pct = Math.abs(diff / before) * 100;
  if (pct < 1) return { text: 'hampir sama persis', turun: false, datar: true, pct };
  return {
    text: `${diff > 0 ? 'naik' : 'turun'} ${formatPercent(pct, 0)}`,
    turun: diff < 0,
    datar: false,
    pct,
  };
}

/* ------------------------------------------------------------------ */
/* Nominal untuk satu kategori / periode                               */
/* ------------------------------------------------------------------ */

function answerMetric(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const scoped = txIn(data, q.period.range);
  const masuk = q.flow === 'income';

  const relevant = scoped.filter(
    (t) => t.type === q.flow && (q.categoryId ? t.categoryId === q.categoryId : true),
  );
  const total = relevant.reduce((s, t) => s + t.amount, 0);
  const label = q.categoryName ?? (masuk ? 'Pemasukan' : 'Pengeluaran');

  const blocks: AnswerBlock[] = [
    {
      kind: 'stat',
      label: `${label} · ${q.period.label}`,
      value: money(total),
      sub: `${relevant.length} transaksi · ${formatRange(q.period.range)}`,
      tone: masuk ? 'in' : 'out',
    },
  ];

  if (relevant.length === 0) {
    const apa = q.categoryName ? `pengeluaran ${q.categoryName}` : masuk ? 'pemasukan' : 'pengeluaran';
    return {
      text: pick(
        `Kosong — nggak ada ${apa} ${q.period.label}.`,
        `Nggak ada catatan ${apa} ${q.period.label}. Bersih.`,
        `Belum ada ${apa} ${q.period.label} nih.`,
      ),
      blocks,
      suggestions: [
        q.categoryName ? `${kapital(q.categoryName)} bulan lalu berapa?` : 'Coba bulan lalu',
        'Yang paling boros apa?',
      ],
    };
  }

  // Perbandingan dengan periode sebelumnya.
  let ekor = '';
  if (q.period.previous) {
    const before = txIn(data, q.period.previous.range)
      .filter((t) => t.type === q.flow && (q.categoryId ? t.categoryId === q.categoryId : true))
      .reduce((s, t) => s + t.amount, 0);
    const d = delta(total, before);
    blocks.push({
      kind: 'delta',
      label: 'Dibanding sebelumnya',
      fromLabel: q.period.previous.label,
      fromValue: money(before),
      toLabel: q.period.label,
      toValue: money(total),
      deltaText: d.text,
      good: masuk ? !d.turun : d.turun,
      flat: d.datar,
    });

    if (!d.datar && before > 0) {
      const bagus = masuk ? !d.turun : d.turun;
      ekor = bagus
        ? pick(` ${kapital(d.text)} dari ${q.period.previous.label} — mantap 👍`, ` Lebih baik dari ${q.period.previous.label}, ${d.text}.`)
        : pick(` ${kapital(d.text)} dibanding ${q.period.previous.label} nih.`, ` Naiknya lumayan dibanding ${q.period.previous.label}.`);
    }
  }

  // Transaksi terbesar sebagai bukti.
  const top = [...relevant].sort((a, b) => b.amount - a.amount).slice(0, 4);
  blocks.push({
    kind: 'list',
    items: top.map((t) => {
      const cat = data.categories.find((c) => c.id === t.categoryId);
      return {
        icon: cat?.icon,
        title: t.note?.trim() || cat?.name || 'Transaksi',
        sub: formatDate(t.date),
        right: money(t.amount),
        tone: masuk ? 'in' : 'out',
      };
    }),
  });

  const days = rangeLengthDays(q.period.range);
  const rata = days > 2 ? ` Kalau dirata-rata sekitar ${money(total / days)} sehari.` : '';

  const inti = q.categoryName
    ? pick(
        `Buat ${q.categoryName} ${q.period.label} kamu ${masuk ? 'dapat' : 'habis'} ${money(total)}, dari ${relevant.length} transaksi.`,
        `${kapital(q.categoryName)} ${q.period.label} totalnya ${money(total)} — ${relevant.length} transaksi.`,
      )
    : pick(
        `${kapital(q.period.label)} kamu ${masuk ? 'dapat' : 'keluar'} ${money(total)} dari ${relevant.length} transaksi.`,
        `Total ${masuk ? 'pemasukan' : 'pengeluaran'} ${q.period.label} ${money(total)}, dari ${relevant.length} transaksi.`,
      );

  return {
    text: inti + ekor + rata,
    blocks,
    suggestions: q.categoryName
      ? [`Bandingkan ${q.categoryName} dengan bulan lalu`, 'Yang paling boros apa?']
      : ['Yang paling boros apa?', 'Bandingkan dengan bulan lalu'],
  };
}

/* ------------------------------------------------------------------ */
/* Peringkat kategori                                                  */
/* ------------------------------------------------------------------ */

function answerRanking(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const scoped = txIn(data, q.period.range);
  const breakdown = breakdownByCategory(scoped, data.categories, q.flow);
  const masuk = q.flow === 'income';

  if (breakdown.length === 0) {
    return {
      text: pick(
        `Belum ada ${masuk ? 'pemasukan' : 'pengeluaran'} ${q.period.label}, jadi belum ada yang bisa diurutkan.`,
        `Kosong ${q.period.label} — nggak ada yang bisa dibandingkan.`,
      ),
      blocks: [],
      suggestions: ['Coba bulan lalu', 'Berapa saldo saya?'],
    };
  }

  const top = breakdown.slice(0, 6);
  const total = breakdown.reduce((s, b) => s + b.total, 0);
  const juara = top[0];
  const nama = juara.category?.name ?? 'Lainnya';

  const blocks: AnswerBlock[] = [
    {
      kind: 'bars',
      items: top.map((b) => ({
        label: b.category?.name ?? 'Lainnya',
        icon: b.category?.icon,
        display: money(b.total),
        pct: b.percent,
        color: b.category?.color ?? '#94A3B8',
      })),
    },
  ];

  if (q.period.previous && juara.category) {
    const before = txIn(data, q.period.previous.range)
      .filter((t) => t.type === q.flow && t.categoryId === juara.categoryId)
      .reduce((s, t) => s + t.amount, 0);
    const d = delta(juara.total, before);
    blocks.push({
      kind: 'delta',
      label: `${nama} dibanding sebelumnya`,
      fromLabel: q.period.previous.label,
      fromValue: money(before),
      toLabel: q.period.label,
      toValue: money(juara.total),
      deltaText: d.text,
      good: masuk ? !d.turun : d.turun,
      flat: d.datar,
    });
  }

  const porsi = juara.percent;
  const komentar =
    porsi > 50
      ? ` Itu lebih dari separuh total pengeluaranmu lho.`
      : porsi > 35
        ? ` Porsinya lumayan gede, ${formatPercent(porsi, 0)} dari total.`
        : ` Sekitar ${formatPercent(porsi, 0)} dari total ${money(total)}.`;

  return {
    text: masuk
      ? `Pemasukan terbesarmu ${q.period.label} dari ${nama}: ${money(juara.total)}.${komentar}`
      : pick(
          `Yang paling bikin dompet tipis ${q.period.label}: ${nama}, ${money(juara.total)}.${komentar}`,
          `Juaranya ${nama} nih — ${money(juara.total)} ${q.period.label}.${komentar}`,
        ),
    blocks,
    suggestions: [
      juara.category ? `${kapital(juara.category.name)} bulan lalu berapa?` : 'Bandingkan dengan bulan lalu',
      'Ada saran biar lebih hemat?',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Perbandingan antar periode                                          */
/* ------------------------------------------------------------------ */

function answerCompare(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const prev: ParsedPeriod['previous'] = q.period.previous ?? {
    label: 'periode sebelumnya',
    range: q.period.range,
  };

  const pick2 = (range: DateRange) =>
    txIn(data, range).filter((t) => t.type === q.flow && (q.categoryId ? t.categoryId === q.categoryId : true));

  const nowTx = pick2(q.period.range);
  const beforeTx = pick2(prev.range);
  const now = nowTx.reduce((s, t) => s + t.amount, 0);
  const before = beforeTx.reduce((s, t) => s + t.amount, 0);
  const d = delta(now, before);
  const masuk = q.flow === 'income';
  const subjek = q.categoryName ?? (masuk ? 'Pemasukan' : 'Pengeluaran');
  const bagus = masuk ? !d.turun : d.turun;

  const blocks: AnswerBlock[] = [
    {
      kind: 'delta',
      label: subjek,
      fromLabel: prev.label,
      fromValue: money(before),
      toLabel: q.period.label,
      toValue: money(now),
      deltaText: d.text,
      good: bagus,
      flat: d.datar,
    },
  ];

  if (!q.categoryId) {
    const nowBreak = breakdownByCategory(nowTx, data.categories, q.flow);
    const beforeBreak = breakdownByCategory(beforeTx, data.categories, q.flow);
    const berubah = nowBreak
      .map((b) => {
        const was = beforeBreak.find((x) => x.categoryId === b.categoryId)?.total ?? 0;
        return { name: b.category?.name ?? 'Lainnya', icon: b.category?.icon, diff: b.total - was };
      })
      .filter((m) => Math.abs(m.diff) > 0)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 4);

    if (berubah.length > 0) {
      blocks.push({
        kind: 'list',
        items: berubah.map((m) => ({
          icon: m.icon,
          title: m.name,
          sub: m.diff > 0 ? 'nambah' : 'berkurang',
          right: `${m.diff > 0 ? '+' : '-'}${money(Math.abs(m.diff))}`,
          tone: m.diff > 0 ? 'out' : 'in',
        })),
      });
    }
  }

  if (d.datar) {
    return {
      text: `${subjek} ${q.period.label} dan ${prev.label} hampir sama, ${money(now)} banding ${money(before)}. Stabil.`,
      blocks,
      suggestions: ['Yang paling boros apa?', 'Ada saran biar lebih hemat?'],
    };
  }

  const selisih = money(Math.abs(now - before));
  const inti = `${subjek} ${q.period.label} ${money(now)}, ${prev.label} ${money(before)}.`;
  const reaksi = bagus
    ? pick(` ${kapital(d.text)} — hemat ${selisih} 👏`, ` Turun ${selisih}, bagus itu.`)
    : pick(` ${kapital(d.text)}, nambah ${selisih} nih.`, ` Naik ${selisih} dibanding sebelumnya.`);

  return {
    text: inti + reaksi,
    blocks,
    suggestions: ['Yang paling boros apa?', 'Ada saran biar lebih hemat?'],
  };
}

/* ------------------------------------------------------------------ */
/* Saldo & dompet                                                      */
/* ------------------------------------------------------------------ */

function answerBalance(ctx: Ctx): Answer {
  const { data, money } = ctx;
  const total = totalBalance(data.wallets, data.transactions);
  const aktif = data.wallets.filter((w) => !w.archived);

  return {
    text: pick(
      `Total duitmu sekarang ${money(total)}, tersebar di ${aktif.length} dompet.`,
      `Saldomu ${money(total)} — ini rinciannya per dompet:`,
    ),
    blocks: [
      { kind: 'stat', label: 'Total saldo', value: money(total), tone: 'neutral' },
      {
        kind: 'list',
        items: aktif.map((w) => ({
          icon: w.icon,
          title: w.name,
          sub: w.accountNumber,
          right: money(walletBalance(w, data.transactions)),
        })),
      },
    ],
    suggestions: ['Ringkas kondisi keuangan saya', 'Yang paling boros apa?'],
  };
}

/* ------------------------------------------------------------------ */
/* Hutang & piutang                                                    */
/* ------------------------------------------------------------------ */

function answerDebt(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;

  // Pertanyaan tentang satu orang tertentu.
  if (q.personName) {
    const items = data.debts.filter((d) => d.personName === q.personName);
    const sisa = items.reduce((s, d) => s + debtRemaining(d), 0);
    const aktif = items.filter((d) => d.status === 'active');
    return {
      text:
        sisa > 0
          ? `${q.personName} masih sisa ${money(sisa)}${aktif.length > 1 ? ` dari ${aktif.length} catatan` : ''}.`
          : `${q.personName} udah lunas semua. Aman ✅`,
      blocks: [
        {
          kind: 'list',
          items: items.map((d) => ({
            icon: d.type === 'receivable' ? '📥' : '📤',
            title: d.type === 'receivable' ? 'Dia pinjam ke kamu' : 'Kamu pinjam ke dia',
            sub: `sejak ${formatDate(d.date)} · udah ${humanizeDuration(debtAgeDays(d))}`,
            right: money(debtRemaining(d)),
            tone: d.status === 'paid' ? 'in' : isOverdue(d) ? 'warn' : 'neutral',
          })),
        },
      ],
      suggestions: ['Siapa yang paling lama belum bayar?', 'Total piutang saya berapa?'],
    };
  }

  const aktif = data.debts.filter((d) => d.status === 'active');
  const piutang = aktif.filter((d) => d.type === 'receivable');
  const hutang = aktif.filter((d) => d.type === 'payable');
  const totalPiutang = piutang.reduce((s, d) => s + debtRemaining(d), 0);
  const totalHutang = hutang.reduce((s, d) => s + debtRemaining(d), 0);
  const telat = piutang.filter(isOverdue);

  /* --- Kasus kosong. Ini yang dulu keliru dijawab "Ada Rp0". --- */

  if (q.debtSide === 'mine' && totalHutang === 0) {
    const pernah = data.debts.some((d) => d.type === 'payable');
    return {
      text: pernah
        ? pick('Kamu lagi nggak punya hutang. Semuanya udah lunas ✅', 'Bersih — nggak ada hutang yang belum dibayar. Semua lunas 👍')
        : pick('Kamu nggak punya hutang sama sekali 👍', 'Nggak ada catatan hutang atas namamu. Aman.'),
      blocks:
        totalPiutang > 0
          ? [
              {
                kind: 'note',
                tone: 'ok',
                title: 'Tapi ada yang ngutang ke kamu',
                text: `${money(totalPiutang)} masih dipegang ${piutang.length} orang. Tanya "siapa yang belum bayar?" kalau mau lihat.`,
              },
            ]
          : [],
      suggestions: totalPiutang > 0 ? ['Siapa yang belum bayar?'] : ['Ringkas kondisi keuangan saya'],
    };
  }

  if (q.debtSide === 'theirs' && totalPiutang === 0) {
    const pernah = data.debts.some((d) => d.type === 'receivable');
    return {
      text: pernah
        ? pick('Nggak ada yang ngutang ke kamu sekarang. Semua udah balik ✅', 'Semua piutangmu udah lunas. Bersih 👍')
        : 'Belum ada catatan orang yang ngutang ke kamu.',
      blocks: [],
      suggestions: ['Ringkas kondisi keuangan saya', 'Berapa saldo saya?'],
    };
  }

  if (totalPiutang === 0 && totalHutang === 0) {
    const pernah = data.debts.length > 0;
    return {
      text: pernah
        ? pick('Bersih! Nggak ada hutang, nggak ada piutang. Semua udah lunas 🎉', 'Semuanya udah beres — nggak ada yang menggantung ✅')
        : 'Belum ada catatan hutang maupun piutang sama sekali di Duitku.',
      blocks: [],
      suggestions: ['Ringkas kondisi keuangan saya', 'Berapa saldo saya?'],
    };
  }

  /* --- Ada isinya. --- */

  const blocks: AnswerBlock[] = [];
  if (totalPiutang > 0) {
    blocks.push({ kind: 'stat', label: 'Dipegang orang lain', value: money(totalPiutang), sub: `${piutang.length} orang`, tone: 'in' });
  }
  if (totalHutang > 0) {
    blocks.push({ kind: 'stat', label: 'Hutangmu', value: money(totalHutang), sub: `${hutang.length} catatan`, tone: 'out' });
  }

  // Daftar disesuaikan dengan arah pertanyaan.
  const sorot = q.debtSide === 'mine' ? hutang : piutang;
  const urut = [...sorot].sort((a, b) => debtAgeDays(b) - debtAgeDays(a)).slice(0, 5);
  if (urut.length > 0) {
    blocks.push({
      kind: 'list',
      items: urut.map((d) => ({
        icon: isOverdue(d) ? '⚠️' : '🕒',
        title: d.personName,
        sub: `udah ${humanizeDuration(debtAgeDays(d))}${isOverdue(d) ? ' · lewat jatuh tempo' : ''}`,
        right: money(debtRemaining(d)),
        tone: isOverdue(d) ? 'warn' : 'neutral',
      })),
    });
  }

  if (telat.length > 0 && q.debtSide !== 'mine') {
    blocks.push({
      kind: 'note',
      tone: 'danger',
      title: `${telat.length} orang udah lewat jatuh tempo`,
      text: `Totalnya ${money(telat.reduce((s, d) => s + debtRemaining(d), 0))}. Buka tab Hutang kalau mau langsung ditagih lewat WhatsApp.`,
    });
  }

  if (q.debtSide === 'mine') {
    return {
      text: pick(
        `Kamu masih punya hutang ${money(totalHutang)} ke ${hutang.length} orang.`,
        `Hutangmu yang belum lunas ${money(totalHutang)}, ke ${hutang.length} orang.`,
      ),
      blocks,
      suggestions: ['Total piutang saya berapa?', 'Ringkas kondisi keuangan saya'],
    };
  }

  const posisi = totalPiutang - totalHutang;

  // Kalau yang ditanya khusus piutang, jangan diselipi urusan hutang sendiri —
  // itu bikin jawabannya panjang tanpa menjawab pertanyaannya.
  const fokusPiutang = q.debtSide === 'theirs' || totalHutang === 0;

  const inti = fokusPiutang
    ? pick(
        `Ada ${money(totalPiutang)} duitmu yang masih dipegang ${piutang.length} orang.`,
        `${money(totalPiutang)} masih nyangkut di ${piutang.length} orang.`,
      ) + (telat.length > 0 ? ` ${telat.length} di antaranya udah lewat jatuh tempo.` : '')
    : `${money(totalPiutang)} masih dipegang ${piutang.length} orang, dan kamu sendiri punya hutang ${money(totalHutang)}. ` +
      `Jadi posisimu ${posisi >= 0 ? 'plus' : 'minus'} ${money(Math.abs(posisi))}.`;

  return {
    text: inti,
    blocks,
    suggestions: ['Siapa yang paling lama belum bayar?', 'Ringkas kondisi keuangan saya'],
  };
}

/* ------------------------------------------------------------------ */
/* Anggaran                                                            */
/* ------------------------------------------------------------------ */

function answerBudget(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const key = monthKey(q.period.range.to);
  const statuses = budgetStatuses(data, key);

  if (statuses.length === 0) {
    return {
      text: 'Kamu belum pasang anggaran sama sekali. Kalau dipasang, nanti aku bisa ingetin sebelum jebol.',
      blocks: [
        {
          kind: 'note',
          tone: 'warn',
          title: 'Belum ada anggaran',
          text: 'Buka menu Anggaran, pasang batas totalnya dulu. Patokan gampang: sekitar 80% dari pemasukan bulananmu.',
        },
      ],
      suggestions: ['Berapa pemasukan bulan ini?', 'Yang paling boros apa?'],
    };
  }

  const jebol = statuses.filter((s) => s.over);
  const hampir = statuses.filter((s) => !s.over && s.percent >= 80);

  const blocks: AnswerBlock[] = [
    {
      kind: 'bars',
      items: statuses.map((s) => ({
        label: s.category ? s.category.name : 'Total semua kategori',
        icon: s.category?.icon,
        display: `${money(s.spent)} / ${money(s.budget.amount)}`,
        pct: Math.min(100, s.percent),
        color: s.over ? '#E5484D' : s.percent > 80 ? '#F59E0B' : (s.category?.color ?? '#12996B'),
      })),
    },
  ];

  if (jebol.length > 0) {
    blocks.push({
      kind: 'note',
      tone: 'danger',
      title: `${jebol.length} anggaran jebol`,
      text: jebol.map((s) => `${s.category?.name ?? 'Total'} lewat ${money(Math.abs(s.remaining))}`).join(', ') + '.',
    });
  } else if (hampir.length > 0) {
    blocks.push({
      kind: 'note',
      tone: 'warn',
      title: 'Udah mepet',
      text: hampir.map((s) => `${s.category?.name ?? 'Total'} udah ${Math.round(s.percent)}%`).join(', ') + '. Rem dikit ya 😅',
    });
  }

  const text =
    jebol.length > 0
      ? pick(`Waduh, ada ${jebol.length} anggaran yang udah jebol bulan ini.`, `${jebol.length} anggaranmu kelewat batas nih bulan ini.`)
      : hampir.length > 0
        ? `Masih aman, tapi ${hampir.length} kategori udah mepet batas.`
        : pick('Anggaranmu aman semua bulan ini 👌', 'Semua masih terkendali, nggak ada yang jebol 👍');

  return { text, blocks, suggestions: ['Yang paling boros apa?', 'Ada saran biar lebih hemat?'] };
}

/* ------------------------------------------------------------------ */
/* Ringkasan & saran                                                   */
/* ------------------------------------------------------------------ */

interface Vitals {
  income: number;
  expense: number;
  net: number;
  savingRate: number;
  scoped: Transaction[];
  breakdown: ReturnType<typeof breakdownByCategory>;
}

function vitals(data: AppData, range: DateRange): Vitals {
  const scoped = txIn(data, range);
  const income = totalByType(scoped, 'income');
  const expense = totalByType(scoped, 'expense');
  return {
    income,
    expense,
    net: income - expense,
    savingRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    scoped,
    breakdown: breakdownByCategory(scoped, data.categories, 'expense'),
  };
}

function answerOverview(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const v = vitals(data, q.period.range);

  if (v.scoped.length === 0) {
    return {
      text: `Belum ada catatan apa pun ${q.period.label}. Masih kosong.`,
      blocks: [],
      suggestions: ['Coba bulan lalu', 'Berapa saldo saya?'],
    };
  }

  const saldo = totalBalance(data.wallets, data.transactions);
  const aktif = data.debts.filter((d) => d.status === 'active');
  const piutang = aktif.filter((d) => d.type === 'receivable').reduce((s, d) => s + debtRemaining(d), 0);

  const blocks: AnswerBlock[] = [
    { kind: 'stat', label: `Masuk · ${q.period.label}`, value: money(v.income), tone: 'in' },
    { kind: 'stat', label: `Keluar · ${q.period.label}`, value: money(v.expense), tone: 'out' },
    {
      kind: 'stat',
      label: v.net >= 0 ? 'Sisa' : 'Nombok',
      value: `${v.net >= 0 ? '+' : '-'}${money(Math.abs(v.net))}`,
      sub: v.income > 0 ? `nabung ${formatPercent(v.savingRate, 0)} dari pemasukan` : undefined,
      tone: v.net >= 0 ? 'in' : 'out',
    },
    {
      kind: 'list',
      items: [
        { icon: '👛', title: 'Saldo semua dompet', right: money(saldo) },
        { icon: '🤝', title: 'Masih dipegang orang', right: money(piutang), tone: piutang > 0 ? 'warn' : 'neutral' },
        { icon: '🧾', title: 'Jumlah transaksi', right: `${v.scoped.length}` },
      ],
    },
  ];

  const tutup =
    v.net >= 0
      ? pick(` Sisa ${money(v.net)} — lumayan 👍`, ` Masih sisa ${money(v.net)}, aman.`)
      : pick(` Nombok ${money(Math.abs(v.net))} nih.`, ` Minus ${money(Math.abs(v.net))}, keluarnya lebih gede.`);

  return {
    text: `${kapital(q.period.label)} masuk ${money(v.income)}, keluar ${money(v.expense)}.${tutup}`,
    blocks,
    suggestions: ['Ada saran biar lebih hemat?', 'Yang paling boros apa?'],
  };
}

/** Saran yang seluruhnya diturunkan dari angka pengguna sendiri. */
function answerAdvice(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const v = vitals(data, q.period.range);
  const blocks: AnswerBlock[] = [];
  const poin: string[] = [];

  if (v.scoped.length === 0) {
    return {
      text: `Catatanmu ${q.period.label} masih kosong, jadi belum ada yang bisa aku lihat. Catat beberapa transaksi dulu ya, nanti aku bantu analisis.`,
      blocks: [],
      suggestions: ['Berapa saldo saya?', 'Coba bulan lalu'],
    };
  }

  // 1. Arus kas — yang paling penting, taruh duluan.
  if (v.net < 0) {
    poin.push(pick(
      `Yang paling perlu dibenerin: bulan ini kamu nombok ${money(Math.abs(v.net))}, keluarnya lebih gede dari masuknya.`,
      `Pertama-tama, kamu lagi minus ${money(Math.abs(v.net))} — pengeluaran melebihi pemasukan.`,
    ));
    blocks.push({
      kind: 'note',
      tone: 'danger',
      title: 'Besar pasak daripada tiang',
      text: `Bulan ini nombok ${money(Math.abs(v.net))}. Kalau kebiasaan, tabungan bakal kegerus pelan-pelan.`,
    });
  } else if (v.savingRate < 10 && v.income > 0) {
    poin.push(`Sisanya tipis banget — cuma ${formatPercent(v.savingRate, 0)} dari pemasukan. Idealnya minimal 20%.`);
    blocks.push({
      kind: 'note',
      tone: 'warn',
      title: 'Sisanya tipis',
      text: `Dari ${money(v.income)} yang masuk, cuma ${money(v.net)} yang nyisa. Kalau mau 20%, berarti sisihin ${money(v.income * 0.2)}.`,
    });
  } else if (v.income > 0) {
    poin.push(`Kabar bagusnya, kamu nabung ${formatPercent(v.savingRate, 0)} dari pemasukan. Itu udah bagus, pertahanin.`);
    blocks.push({
      kind: 'note',
      tone: 'ok',
      title: 'Aman nih',
      text: `Dari ${money(v.income)} pemasukan, ${money(v.net)} berhasil kamu sisihkan.`,
    });
  }

  // 2. Kategori paling dominan.
  const top = v.breakdown[0];
  if (top?.category) {
    blocks.push({
      kind: 'bars',
      items: v.breakdown.slice(0, 5).map((b) => ({
        label: b.category?.name ?? 'Lainnya',
        icon: b.category?.icon,
        display: money(b.total),
        pct: b.percent,
        color: b.category?.color ?? '#94A3B8',
      })),
    });
    poin.push(
      top.percent > 40
        ? `${top.category.name} makan ${formatPercent(top.percent, 0)} dari pengeluaranmu — agak dominan, coba dilihat lagi.`
        : `Pengeluaran terbesarmu di ${top.category.name}, ${money(top.total)}.`,
    );
  }

  // 3. Kategori yang melonjak.
  if (q.period.previous) {
    const before = breakdownByCategory(txIn(data, q.period.previous.range), data.categories, 'expense');
    const lonjakan = v.breakdown
      .map((b) => {
        const was = before.find((x) => x.categoryId === b.categoryId)?.total ?? 0;
        return { name: b.category?.name ?? 'Lainnya', icon: b.category?.icon, now: b.total, was, diff: b.total - was };
      })
      .filter((m) => m.was > 0 && m.diff > 0 && m.diff / m.was > 0.3)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);

    if (lonjakan.length > 0) {
      poin.push(`${lonjakan[0].name} lompat ${formatPercent((lonjakan[0].diff / lonjakan[0].was) * 100, 0)} dibanding ${q.period.previous.label}.`);
      blocks.push({
        kind: 'list',
        items: lonjakan.map((m) => ({
          icon: m.icon,
          title: m.name,
          sub: `dari ${money(m.was)} jadi ${money(m.now)}`,
          right: `+${money(m.diff)}`,
          tone: 'out',
        })),
      });
    }
  }

  // 4. Receh yang menumpuk.
  const kecil = v.scoped.filter((t) => t.type === 'expense' && t.amount <= 50_000);
  if (kecil.length >= 8) {
    poin.push(`Ada ${kecil.length} transaksi kecil yang kalau dijumlah jadi ${money(kecil.reduce((s, t) => s + t.amount, 0))}. Receh tapi numpuk.`);
  }

  // 5. Anggaran jebol.
  const jebol = budgetStatuses(data, monthKey(q.period.range.to)).filter((s) => s.over);
  if (jebol.length > 0) {
    poin.push(`Oh iya, ${jebol.length} anggaran udah jebol: ${jebol.map((s) => s.category?.name ?? 'Total').join(', ')}.`);
  }

  // 6. Piutang mengendap.
  const macet = data.debts.filter((d) => d.type === 'receivable' && d.status === 'active' && debtAgeDays(d) > 30);
  if (macet.length > 0) {
    poin.push(`Terakhir, ${money(macet.reduce((s, d) => s + debtRemaining(d), 0))} nyangkut di ${macet.length} orang lebih dari sebulan. Sayang, itu uang nganggur.`);
  }

  return {
    text: poin.join(' '),
    blocks,
    suggestions: ['Yang paling boros apa?', 'Gimana anggaran saya?', 'Total piutang saya berapa?'],
  };
}

/* ------------------------------------------------------------------ */
/* Sapaan, bantuan, dan cadangan                                       */
/* ------------------------------------------------------------------ */

const CONTOH = [
  'Berapa pengeluaran bensin bulan ini?',
  'Yang paling boros apa?',
  'Bandingkan dengan bulan lalu',
  'Ada saran biar lebih hemat?',
  'Total piutang saya berapa?',
  'Gimana anggaran saya?',
];

function answerHelp(name: string): Answer {
  return {
    text:
      `Halo ${name}! Aku bisa baca semua catatan keuanganmu, jadi kamu nggak perlu scroll-scroll ` +
      'dan ngitung sendiri. Tanya aja pakai bahasa biasa, contohnya:',
    blocks: [
      {
        kind: 'list',
        items: [
          { icon: '🔍', title: 'Nanya angka', sub: '"Berapa pengeluaran bensin bulan ini?"' },
          { icon: '📊', title: 'Cari yang boros', sub: '"Yang paling boros apa?"' },
          { icon: '⚖️', title: 'Bandingin waktu', sub: '"Bandingkan dengan bulan lalu"' },
          { icon: '💡', title: 'Minta saran', sub: '"Ada saran biar lebih hemat?"' },
          { icon: '🤝', title: 'Cek hutang', sub: '"Siapa yang belum bayar?"' },
        ],
      },
      {
        kind: 'note',
        tone: 'ok',
        title: 'Semua diproses di HP kamu',
        text: 'Nggak ada data keuanganmu yang dikirim ke internet. Semuanya dihitung langsung di perangkat, jadi tetap jalan walau lagi offline.',
      },
    ],
    suggestions: CONTOH.slice(0, 4),
  };
}

function answerUnknown(q: ParsedQuestion, ctx: Ctx): Answer {
  const fallback = answerOverview(q, ctx);
  return {
    ...fallback,
    text: `Hmm, aku kurang nangkep maksudnya 😅 Tapi ini ringkasan ${q.period.label}, siapa tahu yang kamu cari. ${fallback.text}`,
    suggestions: CONTOH.slice(0, 4),
  };
}

/* ------------------------------------------------------------------ */
/* Pintu masuk                                                         */
/* ------------------------------------------------------------------ */

export function buildAnswer(q: ParsedQuestion, data: AppData): Answer {
  const ctx = makeCtx(data);
  switch (q.intent) {
    case 'greeting':
    case 'help':
      return answerHelp(data.settings.userName || 'Sobat');
    case 'advice':
      return answerAdvice(q, ctx);
    case 'compare':
      return answerCompare(q, ctx);
    case 'ranking':
      return answerRanking(q, ctx);
    case 'debt':
      return answerDebt(q, ctx);
    case 'budget':
      return answerBudget(q, ctx);
    case 'balance':
      return answerBalance(ctx);
    case 'overview':
      return answerOverview(q, ctx);
    case 'metric':
      return answerMetric(q, ctx);
    default:
      return answerUnknown(q, ctx);
  }
}

export { CONTOH as CONTOH_PERTANYAAN };
