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
 * Perakit jawaban. Setiap angka dihitung langsung dari catatan pengguna,
 * jadi tidak ada kemungkinan salah hitung maupun mengarang data.
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

/** Menyusun kalimat perubahan: naik/turun berapa persen. */
function deltaSentence(now: number, before: number): { text: string; good: boolean; flat: boolean } {
  if (before === 0 && now === 0) return { text: 'sama-sama nol', good: true, flat: true };
  if (before === 0) return { text: 'naik dari nol', good: false, flat: false };
  const diff = now - before;
  const pct = Math.abs(diff / before) * 100;
  if (pct < 1) return { text: 'nyaris tidak berubah', good: true, flat: true };
  return {
    text: `${diff > 0 ? 'naik' : 'turun'} ${formatPercent(pct, 0)}`,
    good: diff < 0,
    flat: false,
  };
}

/* ------------------------------------------------------------------ */
/* Nominal untuk satu kategori / periode                               */
/* ------------------------------------------------------------------ */

function answerMetric(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const scoped = txIn(data, q.period.range);
  const flowLabel = q.flow === 'income' ? 'Pemasukan' : 'Pengeluaran';

  const relevant = scoped.filter(
    (t) => t.type === q.flow && (q.categoryId ? t.categoryId === q.categoryId : true),
  );
  const total = relevant.reduce((s, t) => s + t.amount, 0);
  const subject = q.categoryName ? `${flowLabel.toLowerCase()} ${q.categoryName}` : flowLabel.toLowerCase();

  const blocks: AnswerBlock[] = [
    {
      kind: 'stat',
      label: `${q.categoryName ?? flowLabel} · ${q.period.label}`,
      value: money(total),
      sub: `${relevant.length} transaksi · ${formatRange(q.period.range)}`,
      tone: q.flow === 'income' ? 'in' : 'out',
    },
  ];

  if (relevant.length === 0) {
    return {
      text: `Belum ada catatan ${subject} pada ${q.period.label}.`,
      blocks,
      suggestions: [`${flowLabel} bulan lalu berapa?`, 'Pengeluaran terbesar bulan ini apa?'],
    };
  }

  // Perbandingan dengan periode sebelumnya, kalau ada.
  if (q.period.previous) {
    const before = txIn(data, q.period.previous.range)
      .filter((t) => t.type === q.flow && (q.categoryId ? t.categoryId === q.categoryId : true))
      .reduce((s, t) => s + t.amount, 0);
    const d = deltaSentence(total, before);
    blocks.push({
      kind: 'delta',
      label: 'Dibanding periode sebelumnya',
      fromLabel: q.period.previous.label,
      fromValue: money(before),
      toLabel: q.period.label,
      toValue: money(total),
      deltaText: d.text,
      good: q.flow === 'income' ? !d.good : d.good,
      flat: d.flat,
    });
  }

  // Transaksi terbesar sebagai bukti, biar pengguna ingat uangnya ke mana.
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
        tone: q.flow === 'income' ? 'in' : 'out',
      };
    }),
  });

  const days = rangeLengthDays(q.period.range);
  const perDay = total / days;
  const extra = days > 2 ? ` Rata-rata ${money(perDay)} per hari.` : '';

  return {
    text: `Total ${subject} ${q.period.label} adalah ${money(total)} dari ${relevant.length} transaksi.${extra}`,
    blocks,
    suggestions: q.categoryName
      ? [`Bandingkan ${q.categoryName} dengan bulan lalu`, 'Pengeluaran terbesar bulan ini apa?']
      : ['Kategori apa yang paling boros?', 'Bandingkan dengan bulan lalu'],
  };
}

/* ------------------------------------------------------------------ */
/* Peringkat kategori                                                  */
/* ------------------------------------------------------------------ */

function answerRanking(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;
  const scoped = txIn(data, q.period.range);
  const breakdown = breakdownByCategory(scoped, data.categories, q.flow);
  const flowLabel = q.flow === 'income' ? 'pemasukan' : 'pengeluaran';

  if (breakdown.length === 0) {
    return {
      text: `Belum ada ${flowLabel} tercatat pada ${q.period.label}.`,
      blocks: [],
      suggestions: ['Ringkas kondisi keuangan saya', 'Berapa saldo saya?'],
    };
  }

  const top = breakdown.slice(0, 6);
  const total = breakdown.reduce((s, b) => s + b.total, 0);
  const first = top[0];

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

  // Bandingkan kategori juara dengan periode sebelumnya.
  if (q.period.previous && first.category) {
    const before = txIn(data, q.period.previous.range)
      .filter((t) => t.type === q.flow && t.categoryId === first.categoryId)
      .reduce((s, t) => s + t.amount, 0);
    const d = deltaSentence(first.total, before);
    blocks.push({
      kind: 'delta',
      label: `${first.category.name} dibanding sebelumnya`,
      fromLabel: q.period.previous.label,
      fromValue: money(before),
      toLabel: q.period.label,
      toValue: money(first.total),
      deltaText: d.text,
      good: q.flow === 'income' ? !d.good : d.good,
      flat: d.flat,
    });
  }

  return {
    text:
      `Yang paling menyedot ${flowLabel} ${q.period.label} adalah ${first.category?.name ?? 'Lainnya'}: ` +
      `${money(first.total)}, atau ${formatPercent(first.percent, 0)} dari total ${money(total)}.`,
    blocks,
    suggestions: [
      first.category ? `Berapa pengeluaran ${first.category.name} bulan lalu?` : 'Bandingkan dengan bulan lalu',
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

  const pick = (range: DateRange) =>
    txIn(data, range).filter((t) => t.type === q.flow && (q.categoryId ? t.categoryId === q.categoryId : true));

  const nowTx = pick(q.period.range);
  const beforeTx = pick(prev.range);
  const now = nowTx.reduce((s, t) => s + t.amount, 0);
  const before = beforeTx.reduce((s, t) => s + t.amount, 0);
  const d = deltaSentence(now, before);
  const subject = q.categoryName ?? (q.flow === 'income' ? 'Pemasukan' : 'Pengeluaran');

  const blocks: AnswerBlock[] = [
    {
      kind: 'delta',
      label: subject,
      fromLabel: prev.label,
      fromValue: money(before),
      toLabel: q.period.label,
      toValue: money(now),
      deltaText: d.text,
      good: q.flow === 'income' ? !d.good : d.good,
      flat: d.flat,
    },
  ];

  // Tanpa kategori tertentu, tunjukkan kategori mana yang paling berubah.
  if (!q.categoryId) {
    const nowBreak = breakdownByCategory(nowTx, data.categories, q.flow);
    const beforeBreak = breakdownByCategory(beforeTx, data.categories, q.flow);
    const movers = nowBreak
      .map((b) => {
        const was = beforeBreak.find((x) => x.categoryId === b.categoryId)?.total ?? 0;
        return { name: b.category?.name ?? 'Lainnya', icon: b.category?.icon, diff: b.total - was };
      })
      .filter((m) => Math.abs(m.diff) > 0)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 4);

    if (movers.length > 0) {
      blocks.push({
        kind: 'list',
        items: movers.map((m) => ({
          icon: m.icon,
          title: m.name,
          sub: m.diff > 0 ? 'bertambah' : 'berkurang',
          right: `${m.diff > 0 ? '+' : '-'}${money(Math.abs(m.diff))}`,
          tone: m.diff > 0 ? 'out' : 'in',
        })),
      });
    }
  }

  const arah = d.flat
    ? 'praktis tidak berubah'
    : `${d.text} (${money(Math.abs(now - before))})`;

  return {
    text: `${subject} ${q.period.label} ${money(now)}, sedangkan ${prev.label} ${money(before)} — ${arah}.`,
    blocks,
    suggestions: ['Kategori apa yang paling boros?', 'Ada saran biar lebih hemat?'],
  };
}

/* ------------------------------------------------------------------ */
/* Saldo & dompet                                                      */
/* ------------------------------------------------------------------ */

function answerBalance(ctx: Ctx): Answer {
  const { data, money } = ctx;
  const total = totalBalance(data.wallets, data.transactions);
  const active = data.wallets.filter((w) => !w.archived);

  return {
    text: `Saldo seluruh dompetmu saat ini ${money(total)}.`,
    blocks: [
      { kind: 'stat', label: 'Total saldo', value: money(total), tone: 'neutral' },
      {
        kind: 'list',
        items: active.map((w) => ({
          icon: w.icon,
          title: w.name,
          sub: w.accountNumber,
          right: money(walletBalance(w, data.transactions)),
        })),
      },
    ],
    suggestions: ['Ringkas kondisi keuangan saya', 'Berapa total piutang saya?'],
  };
}

/* ------------------------------------------------------------------ */
/* Hutang & piutang                                                    */
/* ------------------------------------------------------------------ */

function answerDebt(q: ParsedQuestion, ctx: Ctx): Answer {
  const { data, money } = ctx;

  if (q.personName) {
    const items = data.debts.filter((d) => d.personName === q.personName);
    const sisa = items.reduce((s, d) => s + debtRemaining(d), 0);
    const aktif = items.filter((d) => d.status === 'active');
    return {
      text:
        sisa > 0
          ? `${q.personName} masih punya sisa ${money(sisa)} dari ${aktif.length} catatan aktif.`
          : `Semua catatan ${q.personName} sudah lunas.`,
      blocks: [
        {
          kind: 'list',
          items: items.map((d) => ({
            icon: d.type === 'receivable' ? '📥' : '📤',
            title: d.type === 'receivable' ? 'Berhutang ke kamu' : 'Kamu berhutang',
            sub: `sejak ${formatDate(d.date)} · ${humanizeDuration(debtAgeDays(d))}`,
            right: money(debtRemaining(d)),
            tone: d.status === 'paid' ? 'in' : isOverdue(d) ? 'warn' : 'neutral',
          })),
        },
      ],
      suggestions: ['Siapa yang paling lama belum bayar?', 'Berapa total piutang saya?'],
    };
  }

  const aktif = data.debts.filter((d) => d.status === 'active');
  const piutang = aktif.filter((d) => d.type === 'receivable');
  const hutang = aktif.filter((d) => d.type === 'payable');
  const totalPiutang = piutang.reduce((s, d) => s + debtRemaining(d), 0);
  const totalHutang = hutang.reduce((s, d) => s + debtRemaining(d), 0);
  const telat = piutang.filter(isOverdue);

  const blocks: AnswerBlock[] = [
    { kind: 'stat', label: 'Piutang belum tertagih', value: money(totalPiutang), sub: `${piutang.length} orang`, tone: 'in' },
    { kind: 'stat', label: 'Hutangmu ke orang lain', value: money(totalHutang), sub: `${hutang.length} catatan`, tone: 'out' },
  ];

  const urut = [...piutang].sort((a, b) => debtAgeDays(b) - debtAgeDays(a)).slice(0, 5);
  if (urut.length > 0) {
    blocks.push({
      kind: 'list',
      items: urut.map((d) => ({
        icon: isOverdue(d) ? '⚠️' : '🕒',
        title: d.personName,
        sub: `${humanizeDuration(debtAgeDays(d))}${isOverdue(d) ? ' · lewat jatuh tempo' : ''}`,
        right: money(debtRemaining(d)),
        tone: isOverdue(d) ? 'warn' : 'neutral',
      })),
    });
  }

  if (telat.length > 0) {
    blocks.push({
      kind: 'note',
      tone: 'danger',
      title: `${telat.length} orang lewat jatuh tempo`,
      text: `Total ${money(telat.reduce((s, d) => s + debtRemaining(d), 0))} sudah melewati tanggal janji. Buka tab Hutang untuk menagih lewat WhatsApp.`,
    });
  }

  const posisi = totalPiutang - totalHutang;
  return {
    text:
      `Ada ${money(totalPiutang)} uangmu yang masih dipegang ${piutang.length} orang, ` +
      `dan kamu punya hutang ${money(totalHutang)}. Posisi bersihmu ${posisi >= 0 ? 'plus' : 'minus'} ${money(Math.abs(posisi))}.`,
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
      text: 'Kamu belum memasang anggaran sama sekali. Kalau dipasang, saya bisa mengingatkan sebelum jebol.',
      blocks: [
        {
          kind: 'note',
          tone: 'warn',
          title: 'Belum ada anggaran',
          text: 'Buka menu Anggaran, pasang batas total dulu. Patokan yang enak: sekitar 80% dari pemasukan bulananmu.',
        },
      ],
      suggestions: ['Berapa pemasukan bulan ini?', 'Kategori apa yang paling boros?'],
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
      text: jebol
        .map((s) => `${s.category?.name ?? 'Total'} lewat ${money(Math.abs(s.remaining))}`)
        .join(', ') + '.',
    });
  } else if (hampir.length > 0) {
    blocks.push({
      kind: 'note',
      tone: 'warn',
      title: 'Mendekati batas',
      text: hampir.map((s) => `${s.category?.name ?? 'Total'} sudah ${Math.round(s.percent)}%`).join(', ') + '. Rem dikit ya.',
    });
  }

  const text =
    jebol.length > 0
      ? `Ada ${jebol.length} anggaran yang sudah jebol bulan ini.`
      : hampir.length > 0
        ? `Anggaranmu masih aman, tapi ${hampir.length} kategori sudah mendekati batas.`
        : 'Semua anggaranmu masih terkendali bulan ini. 👌';

  return { text, blocks, suggestions: ['Kategori apa yang paling boros?', 'Ada saran biar lebih hemat?'] };
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
  const saldo = totalBalance(data.wallets, data.transactions);
  const aktif = data.debts.filter((d) => d.status === 'active');
  const piutang = aktif.filter((d) => d.type === 'receivable').reduce((s, d) => s + debtRemaining(d), 0);

  const blocks: AnswerBlock[] = [
    { kind: 'stat', label: `Pemasukan · ${q.period.label}`, value: money(v.income), tone: 'in' },
    { kind: 'stat', label: `Pengeluaran · ${q.period.label}`, value: money(v.expense), tone: 'out' },
    {
      kind: 'stat',
      label: 'Selisih',
      value: `${v.net >= 0 ? '+' : '-'}${money(Math.abs(v.net))}`,
      sub: v.income > 0 ? `rasio tabungan ${formatPercent(v.savingRate, 0)}` : undefined,
      tone: v.net >= 0 ? 'in' : 'out',
    },
    {
      kind: 'list',
      items: [
        { icon: '👛', title: 'Saldo semua dompet', right: money(saldo) },
        { icon: '🤝', title: 'Piutang belum tertagih', right: money(piutang), tone: piutang > 0 ? 'warn' : 'neutral' },
        { icon: '🧾', title: 'Jumlah transaksi', right: `${v.scoped.length}` },
      ],
    },
  ];

  return {
    text:
      `${q.period.label.charAt(0).toUpperCase() + q.period.label.slice(1)}: masuk ${money(v.income)}, ` +
      `keluar ${money(v.expense)}, jadi ${v.net >= 0 ? 'sisa' : 'minus'} ${money(Math.abs(v.net))}.`,
    blocks,
    suggestions: ['Ada saran biar lebih hemat?', 'Kategori apa yang paling boros?'],
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
      text: 'Catatanmu pada periode ini masih kosong, jadi belum ada yang bisa saya analisis. Catat beberapa transaksi dulu ya.',
      blocks: [],
      suggestions: ['Berapa saldo saya?', 'Berapa total piutang saya?'],
    };
  }

  // 1. Arus kas utama.
  if (v.net < 0) {
    poin.push(`Pengeluaranmu ${money(Math.abs(v.net))} lebih besar daripada pemasukan. Ini yang paling perlu dibereskan.`);
    blocks.push({
      kind: 'note',
      tone: 'danger',
      title: 'Besar pasak daripada tiang',
      text: `Bulan ini kamu nombok ${money(Math.abs(v.net))}. Kalau berlanjut, tabungan akan tergerus.`,
    });
  } else if (v.savingRate < 10 && v.income > 0) {
    poin.push(`Rasio tabunganmu baru ${formatPercent(v.savingRate, 0)}. Idealnya minimal 20%.`);
    blocks.push({
      kind: 'note',
      tone: 'warn',
      title: 'Sisa terlalu tipis',
      text: `Dari ${money(v.income)} pemasukan, hanya ${money(v.net)} yang tersisa. Target 20% berarti menyisihkan ${money(v.income * 0.2)}.`,
    });
  } else if (v.income > 0) {
    poin.push(`Rasio tabunganmu ${formatPercent(v.savingRate, 0)} — sudah bagus, pertahankan.`);
    blocks.push({
      kind: 'note',
      tone: 'ok',
      title: 'Arus kas sehat',
      text: `Kamu menyisakan ${money(v.net)} dari ${money(v.income)} pemasukan.`,
    });
  }

  // 2. Kategori terboros dan seberapa dominan.
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
    if (top.percent > 40) {
      poin.push(`${top.category.name} menyedot ${formatPercent(top.percent, 0)} pengeluaranmu — terlalu dominan, layak ditinjau.`);
    } else {
      poin.push(`Pengeluaran terbesarmu ${top.category.name} sebesar ${money(top.total)}.`);
    }
  }

  // 3. Kategori yang melonjak dibanding periode sebelumnya.
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
      poin.push(`${lonjakan[0].name} naik ${formatPercent((lonjakan[0].diff / lonjakan[0].was) * 100, 0)} dibanding ${q.period.previous.label}.`);
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

  // 4. Transaksi kecil yang sering — sering luput dari perhatian.
  const kecil = v.scoped.filter((t) => t.type === 'expense' && t.amount <= 50_000);
  if (kecil.length >= 8) {
    const totalKecil = kecil.reduce((s, t) => s + t.amount, 0);
    poin.push(`Ada ${kecil.length} transaksi kecil yang totalnya ${money(totalKecil)} — receh yang menumpuk.`);
  }

  // 5. Anggaran yang jebol.
  const jebol = budgetStatuses(data, monthKey(q.period.range.to)).filter((s) => s.over);
  if (jebol.length > 0) {
    poin.push(`${jebol.length} anggaran sudah jebol: ${jebol.map((s) => s.category?.name ?? 'Total').join(', ')}.`);
  }

  // 6. Piutang menganggur.
  const macet = data.debts.filter((d) => d.type === 'receivable' && d.status === 'active' && debtAgeDays(d) > 30);
  if (macet.length > 0) {
    const nilai = macet.reduce((s, d) => s + debtRemaining(d), 0);
    poin.push(`${money(nilai)} uangmu tertahan di ${macet.length} orang lebih dari sebulan. Itu uang nganggur.`);
  }

  return {
    text: poin.join(' '),
    blocks,
    suggestions: ['Kategori apa yang paling boros?', 'Bagaimana anggaran saya?', 'Berapa total piutang saya?'],
  };
}

/* ------------------------------------------------------------------ */
/* Sapaan, bantuan, dan cadangan                                       */
/* ------------------------------------------------------------------ */

const CONTOH = [
  'Berapa pengeluaran bensin bulan ini?',
  'Kategori apa yang paling boros?',
  'Bandingkan pengeluaran bulan ini dengan bulan lalu',
  'Ada saran biar lebih hemat?',
  'Berapa total piutang saya?',
  'Bagaimana anggaran saya?',
];

function answerHelp(name: string): Answer {
  return {
    text:
      `Halo ${name}! Saya bisa membaca seluruh catatan keuanganmu dan menjawab langsung, ` +
      'jadi kamu tidak perlu scroll dan menghitung sendiri. Coba tanya seperti ini:',
    blocks: [
      {
        kind: 'list',
        items: [
          { icon: '🔍', title: 'Tanya angka', sub: '"Berapa pengeluaran bensin bulan ini?"' },
          { icon: '📊', title: 'Cari yang boros', sub: '"Kategori apa yang paling boros?"' },
          { icon: '⚖️', title: 'Bandingkan waktu', sub: '"Bandingkan dengan bulan lalu"' },
          { icon: '💡', title: 'Minta saran', sub: '"Ada saran biar lebih hemat?"' },
          { icon: '🤝', title: 'Cek hutang', sub: '"Siapa yang belum bayar?"' },
        ],
      },
      {
        kind: 'note',
        tone: 'ok',
        title: 'Semua diproses di HP-mu',
        text: 'Tidak ada satu pun data keuanganmu yang dikirim ke internet. Analisisnya berjalan langsung di perangkat, jadi tetap bisa dipakai walau sedang offline.',
      },
    ],
    suggestions: CONTOH.slice(0, 4),
  };
}

function answerUnknown(q: ParsedQuestion, ctx: Ctx): Answer {
  // Daripada menyerah, berikan ringkasan periode yang ditanyakan.
  const fallback = answerOverview(q, ctx);
  return {
    ...fallback,
    text: `Saya belum paham persis maksudnya, jadi saya tampilkan ringkasan ${q.period.label} dulu. ${fallback.text}`,
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
