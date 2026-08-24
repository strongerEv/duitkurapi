import type { jsPDF as JsPdfDoc } from 'jspdf';
import type { AppData, Transaction } from '../types';
import {
  breakdownByCategory,
  budgetStatuses,
  debtAgeDays,
  debtPaid,
  debtRemaining,
  filterByRange,
  isOverdue,
  totalBalance,
  totalByType,
  walletBalance,
} from './calc';
import {
  DAY_SHORT,
  MONTH_SHORT,
  dayNameOf,
  datesInRange,
  formatDate,
  formatMonthKey,
  formatRange,
  fromISODate,
  monthKey,
  rangeLengthDays,
  todayISO,
  type DateRange,
  type PeriodType,
} from './date';
import { formatMoney, formatNumber, formatPercent } from './format';
import { prettyPhone } from './wa';

/* ------------------------------------------------------------------ */
/* Konfigurasi tampilan                                                */
/* ------------------------------------------------------------------ */

const PAGE = { w: 210, h: 297 };
const M = { left: 14, right: 14, top: 16, bottom: 18 };
const CONTENT_W = PAGE.w - M.left - M.right;

const C = {
  green: [18, 153, 107] as RGB,
  greenDark: [11, 103, 70] as RGB,
  greenLight: [234, 249, 242] as RGB,
  mint: [31, 208, 138] as RGB,
  text: [14, 42, 32] as RGB,
  muted: [91, 122, 108] as RGB,
  faint: [144, 169, 157] as RGB,
  border: [214, 232, 223] as RGB,
  zebra: [247, 251, 249] as RGB,
  white: [255, 255, 255] as RGB,
  expense: [214, 60, 65] as RGB,
  expenseBg: [253, 236, 236] as RGB,
  income: [15, 138, 96] as RGB,
  incomeBg: [228, 247, 238] as RGB,
  warn: [180, 83, 9] as RGB,
  warnBg: [254, 244, 226] as RGB,
};

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [148, 163, 184];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Font bawaan PDF hanya mendukung Latin-1, sedangkan nama kategori/dompet
 * buatan pengguna bisa mengandung emoji. Karakter di luar jangkauan dibuang
 * supaya tidak muncul sebagai simbol aneh di berkas hasil.
 */
function safe(text: string): string {
  return (text ?? '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ReportSections {
  summary: boolean;
  categories: boolean;
  chart: boolean;
  transactions: boolean;
  wallets: boolean;
  debts: boolean;
  budgets: boolean;
}

export interface ReportInput {
  data: AppData;
  range: DateRange;
  periodType: PeriodType;
  sections: ReportSections;
}

/* ------------------------------------------------------------------ */
/* Pembangun dokumen                                                   */
/* ------------------------------------------------------------------ */

/**
 * Menyusun laporan keuangan Duitku menjadi berkas PDF A4 dan
 * mengembalikannya sebagai blob siap unduh.
 *
 * Pustaka jsPDF dimuat secara dinamis supaya tidak ikut membebani bundel
 * utama aplikasi — hanya diunduh saat pengguna benar-benar membuat laporan.
 */
export async function buildReportPdf(input: ReportInput): Promise<{ blob: Blob; fileName: string }> {
  const { jsPDF } = await import('jspdf');
  const { data, range, periodType, sections } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;
  const money = (v: number) => safe(formatMoney(v, cur, dec));

  const tx = filterByRange(data.transactions, range.from, range.to).sort((a, b) =>
    a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date),
  );
  const income = totalByType(tx, 'income');
  const expense = totalByType(tx, 'expense');

  let y = 0;

  /* ---------- Primitif ---------- */

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style: 'normal' | 'bold', size: number) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };

  /** Kop halaman: dipanggil untuk halaman pertama dan setiap halaman baru. */
  const drawHeader = (first: boolean) => {
    const h = first ? 34 : 20;
    setFill(C.green);
    doc.rect(0, 0, PAGE.w, h, 'F');
    setFill(C.mint);
    doc.rect(0, h, PAGE.w, 1.2, 'F');

    setText(C.white);
    font('bold', first ? 19 : 13);
    doc.text('Duitku', M.left, first ? 15 : 12);

    font('normal', first ? 9 : 7.5);
    doc.text(
      first ? 'Laporan Keuangan Pribadi' : `Laporan ${periodLabel(periodType)} - ${safe(formatRange(range))}`,
      M.left,
      first ? 20.5 : 16,
    );

    if (first) {
      font('bold', 11);
      doc.text(safe(periodTitle(periodType, range)), M.left, 28.5);
      font('normal', 8);
      const meta = `Dibuat ${safe(formatDate(todayISO()))}`;
      doc.text(meta, PAGE.w - M.right - doc.getTextWidth(meta), 28.5);
      const owner = safe(data.settings.userName || 'Pengguna Duitku');
      font('bold', 9);
      doc.text(owner, PAGE.w - M.right - doc.getTextWidth(owner), 15);
      font('normal', 7.5);
      const sub = 'Pemilik catatan';
      doc.text(sub, PAGE.w - M.right - doc.getTextWidth(sub), 20);
    }

    y = h + (first ? 10 : 8);
  };

  const drawFooter = (pageNo: number, totalPages: number) => {
    setDraw(C.border);
    doc.setLineWidth(0.2);
    doc.line(M.left, PAGE.h - 12, PAGE.w - M.right, PAGE.h - 12);
    font('normal', 7.5);
    setText(C.faint);
    doc.text('Dibuat dengan Duitku - catatan keuangan & penagih hutang', M.left, PAGE.h - 7.5);
    const label = `Halaman ${pageNo} dari ${totalPages}`;
    doc.text(label, PAGE.w - M.right - doc.getTextWidth(label), PAGE.h - 7.5);
  };

  /** Menambah halaman baru bila ruang tersisa kurang dari `need` mm. */
  const ensure = (need: number) => {
    if (y + need <= PAGE.h - M.bottom) return;
    doc.addPage();
    drawHeader(false);
  };

  const sectionTitle = (title: string, note?: string) => {
    // Sediakan ruang untuk judul beserta beberapa baris isinya, supaya judul
    // tidak tertinggal sendirian di dasar halaman.
    ensure(30);
    setFill(C.green);
    doc.roundedRect(M.left, y - 3.2, 2.4, 6, 1.2, 1.2, 'F');
    font('bold', 11.5);
    setText(C.text);
    doc.text(safe(title), M.left + 5, y + 1.4);
    if (note) {
      font('normal', 8);
      setText(C.muted);
      doc.text(safe(note), PAGE.w - M.right - doc.getTextWidth(safe(note)), y + 1.4);
    }
    y += 8;
  };

  /* ---------- Tabel ---------- */

  interface Column {
    header: string;
    width: number;
    align?: 'left' | 'right';
    /** Warna teks khusus per baris. */
    color?: (rowIndex: number) => RGB | undefined;
  }

  const table = (columns: Column[], rows: string[][], opts?: { rowHeight?: number }) => {
    const rh = opts?.rowHeight ?? 7;
    const headerH = 7.5;

    const drawHead = () => {
      ensure(headerH + rh);
      setFill(C.greenLight);
      doc.roundedRect(M.left, y, CONTENT_W, headerH, 1.2, 1.2, 'F');
      font('bold', 8);
      setText(C.greenDark);
      let x = M.left + 3;
      for (const col of columns) {
        const w = col.width - 3;
        if (col.align === 'right') doc.text(safe(col.header), x + w, y + 5, { align: 'right' });
        else doc.text(safe(col.header), x, y + 5);
        x += col.width;
      }
      y += headerH + 1;
    };

    drawHead();

    rows.forEach((row, i) => {
      if (y + rh > PAGE.h - M.bottom) {
        doc.addPage();
        drawHeader(false);
        drawHead();
      }
      if (i % 2 === 1) {
        setFill(C.zebra);
        doc.rect(M.left, y, CONTENT_W, rh, 'F');
      }
      font('normal', 8);
      let x = M.left + 3;
      columns.forEach((col, ci) => {
        const custom = col.color?.(i);
        setText(custom ?? C.text);
        const w = col.width - 3;
        const value = safe(row[ci] ?? '');
        const fitted = fitText(doc, value, w);
        if (col.align === 'right') doc.text(fitted, x + w, y + rh - 2.4, { align: 'right' });
        else doc.text(fitted, x, y + rh - 2.4);
        x += col.width;
      });
      y += rh;
    });

    setDraw(C.border);
    doc.setLineWidth(0.2);
    doc.line(M.left, y, PAGE.w - M.right, y);
    y += 6;
  };

  /* ---------- Kartu ringkasan ---------- */

  const summaryCards = (
    items: { label: string; value: string; tone: 'income' | 'expense' | 'neutral' | 'brand' }[],
  ) => {
    const gap = 3.5;
    const cardW = (CONTENT_W - gap * (items.length - 1)) / items.length;
    const cardH = 20;
    ensure(cardH + 4);
    items.forEach((item, i) => {
      const x = M.left + i * (cardW + gap);
      const bg =
        item.tone === 'income' ? C.incomeBg : item.tone === 'expense' ? C.expenseBg : item.tone === 'brand' ? C.green : C.greenLight;
      setFill(bg);
      doc.roundedRect(x, y, cardW, cardH, 2.4, 2.4, 'F');

      font('normal', 7.5);
      setText(item.tone === 'brand' ? C.white : C.muted);
      doc.text(safe(item.label), x + 4, y + 7);

      font('bold', item.value.length > 13 ? 10 : 11.5);
      const valueColor =
        item.tone === 'income' ? C.income : item.tone === 'expense' ? C.expense : item.tone === 'brand' ? C.white : C.text;
      setText(valueColor);
      doc.text(fitText(doc, safe(item.value), cardW - 8), x + 4, y + 14.5);
    });
    y += cardH + 7;
  };

  /* ---------- Grafik ---------- */

  /** Potongan lingkaran penuh (pie) yang nanti dilubangi menjadi donat. */
  const fillSector = (cx: number, cy: number, r: number, startDeg: number, endDeg: number, color: RGB) => {
    const sweep = endDeg - startDeg;
    if (sweep <= 0) return;
    const steps = Math.max(2, Math.ceil(sweep / 5));
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const deg = startDeg + (sweep * i) / steps;
      const rad = (deg * Math.PI) / 180;
      points.push([cx + r * Math.cos(rad), cy + r * Math.sin(rad)]);
    }
    const rel: number[][] = [];
    let prev: [number, number] = [cx, cy];
    for (const p of points) {
      rel.push([p[0] - prev[0], p[1] - prev[1]]);
      prev = p;
    }
    rel.push([cx - prev[0], cy - prev[1]]);
    setFill(color);
    doc.lines(rel, cx, cy, [1, 1], 'F', true);
  };

  const donutWithLegend = (slices: { label: string; value: number; color: RGB }[], centerLabel: string) => {
    const total = slices.reduce((s, x) => s + x.value, 0);
    if (total <= 0) return;

    const r = 21;
    const cx = M.left + r + 4;
    const blockH = r * 2 + 10;
    ensure(Math.max(blockH, slices.length * 6 + 8));
    const cy = y + r + 3;

    let angle = -90;
    for (const s of slices) {
      const sweep = (s.value / total) * 360;
      fillSector(cx, cy, r, angle, angle + sweep, s.color);
      angle += sweep;
    }
    // Lubang tengah + label total.
    setFill(C.white);
    doc.circle(cx, cy, r * 0.6, 'F');
    font('bold', 9);
    setText(C.text);
    doc.text(safe(centerLabel), cx, cy - 0.4, { align: 'center' });
    font('normal', 6.5);
    setText(C.muted);
    doc.text('Total', cx, cy + 3.6, { align: 'center' });

    // Legenda di sebelah kanan donat.
    const legendX = cx + r + 8;
    const legendW = PAGE.w - M.right - legendX;
    let ly = y + 4;
    for (const s of slices) {
      setFill(s.color);
      doc.roundedRect(legendX, ly - 2.4, 2.6, 2.6, 0.6, 0.6, 'F');
      font('normal', 8);
      setText(C.text);
      const pct = formatPercent((s.value / total) * 100, 1);
      const amount = money(s.value);
      const right = `${pct}  ${amount}`;
      const rightW = doc.getTextWidth(right);
      doc.text(fitText(doc, safe(s.label), legendW - rightW - 8), legendX + 4.6, ly);
      setText(C.muted);
      doc.text(right, PAGE.w - M.right, ly, { align: 'right' });
      ly += 5.6;
    }

    y = Math.max(y + blockH, ly + 2);
  };

  const barChart = (series: { label: string; expense: number; income: number }[]) => {
    if (series.length === 0) return;
    const chartH = 34;
    ensure(chartH + 16);
    const max = Math.max(1, ...series.map((s) => Math.max(s.expense, s.income)));
    const slotW = CONTENT_W / series.length;
    const barW = Math.min(3.4, slotW / 3.2);
    const baseY = y + chartH;

    // Garis bantu horizontal.
    setDraw(C.border);
    doc.setLineWidth(0.15);
    for (let i = 0; i <= 2; i++) {
      const gy = baseY - (chartH * i) / 2;
      doc.line(M.left, gy, PAGE.w - M.right, gy);
    }

    series.forEach((s, i) => {
      const cx = M.left + slotW * i + slotW / 2;
      const eh = (s.expense / max) * chartH;
      const ih = (s.income / max) * chartH;
      if (s.expense > 0) {
        setFill(C.expense);
        doc.roundedRect(cx - barW - 0.6, baseY - eh, barW, Math.max(0.6, eh), 0.5, 0.5, 'F');
      }
      if (s.income > 0) {
        setFill(C.green);
        doc.roundedRect(cx + 0.6, baseY - ih, barW, Math.max(0.6, ih), 0.5, 0.5, 'F');
      }
      font('normal', 6.4);
      setText(C.faint);
      doc.text(fitText(doc, safe(s.label), slotW - 1), cx, baseY + 4, { align: 'center' });
    });

    y = baseY + 8;

    // Keterangan warna.
    font('normal', 7.5);
    setFill(C.expense);
    doc.roundedRect(M.left, y - 2.2, 2.4, 2.4, 0.5, 0.5, 'F');
    setText(C.muted);
    doc.text('Pengeluaran', M.left + 4, y);
    setFill(C.green);
    doc.roundedRect(M.left + 30, y - 2.2, 2.4, 2.4, 0.5, 0.5, 'F');
    doc.text('Pemasukan', M.left + 34, y);
    y += 8;
  };

  const progressRow = (label: string, spent: number, limit: number, color: RGB) => {
    ensure(12);
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const over = spent > limit;
    font('bold', 8.5);
    setText(C.text);
    doc.text(fitText(doc, safe(label), CONTENT_W - 60), M.left, y);
    font('normal', 8);
    setText(over ? C.expense : C.muted);
    const right = `${money(spent)} / ${money(limit)}`;
    doc.text(right, PAGE.w - M.right, y, { align: 'right' });
    y += 2.6;
    setFill(C.border);
    doc.roundedRect(M.left, y, CONTENT_W, 2.6, 1.3, 1.3, 'F');
    setFill(over ? C.expense : color);
    const w = Math.max(1.5, (CONTENT_W * pct) / 100);
    doc.roundedRect(M.left, y, w, 2.6, 1.3, 1.3, 'F');
    y += 7;
    font('normal', 7);
    setText(over ? C.expense : C.faint);
    doc.text(
      over
        ? `Lewat anggaran ${money(spent - limit)} (${formatPercent((spent / Math.max(1, limit)) * 100, 0)})`
        : `Terpakai ${formatPercent(pct, 0)} - sisa ${money(limit - spent)}`,
      M.left,
      y,
    );
    y += 7;
  };

  const note = (text: string) => {
    ensure(10);
    font('normal', 8);
    setText(C.muted);
    const lines = doc.splitTextToSize(safe(text), CONTENT_W) as string[];
    for (const line of lines) {
      ensure(5);
      doc.text(line, M.left, y);
      y += 4.4;
    }
    y += 3;
  };

  /* ================================================================== */
  /* Isi laporan                                                        */
  /* ================================================================== */

  drawHeader(true);

  /* ---------- Ringkasan ---------- */
  if (sections.summary) {
    const days = rangeLengthDays(range);
    sectionTitle('Ringkasan Periode', `${safe(formatRange(range))} (${days} hari)`);
    summaryCards([
      { label: 'Pemasukan', value: money(income), tone: 'income' },
      { label: 'Pengeluaran', value: money(expense), tone: 'expense' },
      { label: 'Selisih', value: `${income - expense >= 0 ? '+' : '-'}${money(Math.abs(income - expense))}`, tone: income - expense >= 0 ? 'income' : 'expense' },
    ]);

    const saldo = totalBalance(data.wallets, data.transactions);
    const rows: string[][] = [
      ['Jumlah transaksi', `${formatNumber(tx.length, cur)} catatan`],
      ['Rata-rata pengeluaran per hari', money(expense / days)],
      ['Rata-rata pemasukan per hari', money(income / days)],
      [
        'Rasio tabungan',
        income > 0 ? formatPercent(((income - expense) / income) * 100, 1) : '-',
      ],
      ['Saldo seluruh dompet (saat ini)', money(saldo)],
    ];
    const biggest = [...tx].filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];
    if (biggest) {
      const cat = data.categories.find((c) => c.id === biggest.categoryId);
      rows.push([
        'Pengeluaran terbesar',
        `${money(biggest.amount)} - ${safe(cat?.name ?? 'Lainnya')} (${safe(formatDate(biggest.date))})`,
      ]);
    }
    table(
      [
        { header: 'Keterangan', width: CONTENT_W * 0.5 },
        { header: 'Nilai', width: CONTENT_W * 0.5, align: 'right' },
      ],
      rows,
    );
  }

  /* ---------- Grafik tren ---------- */
  if (sections.chart && tx.length > 0) {
    const series = buildSeries(tx, range, periodType);
    if (series.length > 1) {
      sectionTitle('Grafik Arus Kas', seriesCaption(periodType));
      barChart(series);
    }
  }

  /* ---------- Rincian kategori ---------- */
  if (sections.categories && tx.length > 0) {
    const outBreak = breakdownByCategory(tx, data.categories, 'expense');
    if (outBreak.length > 0) {
      sectionTitle('Pengeluaran per Kategori', `Total ${money(expense)}`);
      donutWithLegend(
        outBreak.slice(0, 8).map((b) => ({
          label: b.category?.name ?? 'Lainnya',
          value: b.total,
          color: hexToRgb(b.category?.color ?? '#94A3B8'),
        })),
        compactForPdf(expense, cur),
      );
      table(
        [
          { header: 'Kategori', width: CONTENT_W * 0.42 },
          { header: 'Transaksi', width: CONTENT_W * 0.16, align: 'right' },
          { header: 'Persentase', width: CONTENT_W * 0.17, align: 'right' },
          { header: 'Total', width: CONTENT_W * 0.25, align: 'right' },
        ],
        outBreak.map((b) => [
          b.category?.name ?? 'Lainnya',
          String(b.count),
          formatPercent(b.percent, 1),
          money(b.total),
        ]),
      );
    }

    const inBreak = breakdownByCategory(tx, data.categories, 'income');
    if (inBreak.length > 0) {
      sectionTitle('Pemasukan per Kategori', `Total ${money(income)}`);
      table(
        [
          { header: 'Kategori', width: CONTENT_W * 0.42 },
          { header: 'Transaksi', width: CONTENT_W * 0.16, align: 'right' },
          { header: 'Persentase', width: CONTENT_W * 0.17, align: 'right' },
          { header: 'Total', width: CONTENT_W * 0.25, align: 'right' },
        ],
        inBreak.map((b) => [
          b.category?.name ?? 'Lainnya',
          String(b.count),
          formatPercent(b.percent, 1),
          money(b.total),
        ]),
        { rowHeight: 6.6 },
      );
    }
  }

  /* ---------- Daftar transaksi ---------- */
  if (sections.transactions) {
    sectionTitle('Rincian Transaksi', `${tx.length} catatan`);
    if (tx.length === 0) {
      note('Tidak ada transaksi pada periode ini.');
    } else {
      table(
        [
          { header: 'Tanggal', width: CONTENT_W * 0.15 },
          { header: 'Kategori', width: CONTENT_W * 0.22 },
          { header: 'Keterangan', width: CONTENT_W * 0.28 },
          { header: 'Dompet', width: CONTENT_W * 0.15 },
          {
            header: 'Nominal',
            width: CONTENT_W * 0.2,
            align: 'right',
            color: (i) => (tx[i]?.type === 'income' ? C.income : C.expense),
          },
        ],
        tx.map((t) => {
          const cat = data.categories.find((c) => c.id === t.categoryId);
          const wal = data.wallets.find((w) => w.id === t.walletId);
          return [
            formatDate(t.date),
            cat?.name ?? 'Lainnya',
            t.note ?? '-',
            wal?.name ?? '-',
            `${t.type === 'income' ? '+' : '-'}${money(t.amount)}`,
          ];
        }),
        { rowHeight: 6.6 },
      );

      // Baris total di bawah tabel.
      ensure(10);
      font('bold', 9);
      setText(C.text);
      doc.text('Total pemasukan', M.left, y);
      setText(C.income);
      doc.text(`+${money(income)}`, PAGE.w - M.right, y, { align: 'right' });
      y += 5.4;
      setText(C.text);
      doc.text('Total pengeluaran', M.left, y);
      setText(C.expense);
      doc.text(`-${money(expense)}`, PAGE.w - M.right, y, { align: 'right' });
      y += 5.4;
      setText(C.text);
      doc.text('Selisih', M.left, y);
      setText(income - expense >= 0 ? C.income : C.expense);
      doc.text(
        `${income - expense >= 0 ? '+' : '-'}${money(Math.abs(income - expense))}`,
        PAGE.w - M.right,
        y,
        { align: 'right' },
      );
      y += 9;
    }
  }

  /* ---------- Dompet ---------- */
  if (sections.wallets) {
    sectionTitle('Posisi Dompet', 'Saldo terkini seluruh sumber dana');
    const active = data.wallets.filter((w) => !w.archived);
    table(
      [
        { header: 'Dompet', width: CONTENT_W * 0.3 },
        { header: 'Saldo awal', width: CONTENT_W * 0.22, align: 'right' },
        { header: 'Mutasi periode ini', width: CONTENT_W * 0.24, align: 'right' },
        { header: 'Saldo saat ini', width: CONTENT_W * 0.24, align: 'right' },
      ],
      active.map((w) => {
        const scoped = tx.filter((t) => t.walletId === w.id);
        const delta = totalByType(scoped, 'income') - totalByType(scoped, 'expense');
        return [
          w.name,
          money(w.initialBalance),
          `${delta >= 0 ? '+' : '-'}${money(Math.abs(delta))}`,
          money(walletBalance(w, data.transactions)),
        ];
      }),
    );
    ensure(8);
    font('bold', 9);
    setText(C.text);
    doc.text('Total saldo', M.left, y);
    doc.text(money(totalBalance(data.wallets, data.transactions)), PAGE.w - M.right, y, { align: 'right' });
    y += 9;
  }

  /* ---------- Anggaran ---------- */
  if (sections.budgets) {
    const key = monthKey(range.to);
    const statuses = budgetStatuses(data, key);
    if (statuses.length > 0) {
      sectionTitle('Anggaran Bulanan', safe(formatMonthKey(key)));
      for (const s of statuses) {
        progressRow(
          s.category ? s.category.name : 'Total semua kategori',
          s.spent,
          s.budget.amount,
          s.category ? hexToRgb(s.category.color) : C.green,
        );
      }
    }
  }

  /* ---------- Hutang & piutang ---------- */
  if (sections.debts && data.debts.length > 0) {
    const receivable = data.debts.filter((d) => d.type === 'receivable' && d.status === 'active');
    const payable = data.debts.filter((d) => d.type === 'payable' && d.status === 'active');
    const totalReceivable = receivable.reduce((s, d) => s + debtRemaining(d), 0);
    const totalPayable = payable.reduce((s, d) => s + debtRemaining(d), 0);

    sectionTitle('Hutang & Piutang', `${receivable.length + payable.length} catatan aktif`);
    summaryCards([
      { label: 'Piutang (belum tertagih)', value: money(totalReceivable), tone: 'income' },
      { label: 'Hutang (belum dibayar)', value: money(totalPayable), tone: 'expense' },
      {
        label: 'Posisi bersih',
        value: `${totalReceivable - totalPayable >= 0 ? '+' : '-'}${money(Math.abs(totalReceivable - totalPayable))}`,
        tone: 'brand',
      },
    ]);

    const debtColumns = [
      { header: 'Nama', width: CONTENT_W * 0.2 },
      { header: 'Nomor WA', width: CONTENT_W * 0.18 },
      { header: 'Pokok', width: CONTENT_W * 0.16, align: 'right' as const },
      { header: 'Terbayar', width: CONTENT_W * 0.15, align: 'right' as const },
      { header: 'Sisa', width: CONTENT_W * 0.16, align: 'right' as const },
      { header: 'Umur', width: CONTENT_W * 0.15, align: 'right' as const },
    ];

    if (receivable.length > 0) {
      font('bold', 9);
      setText(C.text);
      ensure(8);
      doc.text('Orang yang berhutang kepada Anda', M.left, y);
      y += 4;
      table(
        debtColumns.map((c, i) =>
          i === 4 ? { ...c, color: (r: number) => (isOverdue(receivable[r]) ? C.expense : C.text) } : c,
        ),
        receivable.map((d) => [
          d.personName,
          d.phone ? prettyPhone(d.phone, data.settings.defaultCountryCode) : '-',
          money(d.amount),
          money(debtPaid(d)),
          money(debtRemaining(d)),
          `${debtAgeDays(d)} hari`,
        ]),
        { rowHeight: 6.6 },
      );

      const overdue = receivable.filter(isOverdue);
      if (overdue.length > 0) {
        ensure(14);
        setFill(C.warnBg);
        const boxH = 8 + overdue.length * 4.6;
        doc.roundedRect(M.left, y - 4, CONTENT_W, boxH, 2, 2, 'F');
        font('bold', 8.5);
        setText(C.warn);
        doc.text('Perlu segera ditagih (lewat jatuh tempo)', M.left + 4, y + 1.4);
        font('normal', 8);
        let ly = y + 6.4;
        for (const d of overdue) {
          doc.text(
            fitText(
              doc,
              `${safe(d.personName)} - ${money(debtRemaining(d))} - jatuh tempo ${safe(formatDate(d.dueDate!))}`,
              CONTENT_W - 8,
            ),
            M.left + 4,
            ly,
          );
          ly += 4.6;
        }
        y += boxH + 2;
      }
    }

    if (payable.length > 0) {
      font('bold', 9);
      setText(C.text);
      ensure(8);
      doc.text('Hutang Anda kepada orang lain', M.left, y);
      y += 4;
      table(
        debtColumns,
        payable.map((d) => [
          d.personName,
          d.phone ? prettyPhone(d.phone, data.settings.defaultCountryCode) : '-',
          money(d.amount),
          money(debtPaid(d)),
          money(debtRemaining(d)),
          `${debtAgeDays(d)} hari`,
        ]),
        { rowHeight: 6.6 },
      );
    }
  }

  /* ---------- Catatan penutup ---------- */
  // Hanya ditulis bila masih muat di halaman berjalan, supaya tidak lahir
  // halaman baru yang isinya cuma satu paragraf.
  if (y + 18 <= PAGE.h - M.bottom) {
    setDraw(C.border);
    doc.setLineWidth(0.2);
    doc.line(M.left, y, PAGE.w - M.right, y);
    y += 5;
    note(
      'Laporan ini dibuat otomatis oleh aplikasi Duitku berdasarkan catatan yang tersimpan di perangkat Anda. ' +
        'Angka pada laporan mengikuti transaksi yang tercatat pada rentang tanggal di atas.',
    );
  }

  /* ---------- Nomor halaman ---------- */
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFooter(p, total);
  }

  const fileName = `Duitku-Laporan-${periodSlug(periodType)}-${range.from}${
    range.from === range.to ? '' : `-sd-${range.to}`
  }.pdf`;

  return { blob: doc.output('blob'), fileName };
}

/** Membuat berkas PDF lalu memicu unduhan di browser. */
export async function downloadReportPdf(input: ReportInput): Promise<string> {
  const { blob, fileName } = await buildReportPdf(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Beri jeda agar unduhan sempat dimulai sebelum URL dilepas.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}

/* ------------------------------------------------------------------ */
/* Pembantu                                                            */
/* ------------------------------------------------------------------ */

/** Memotong teks dengan elipsis supaya tidak melewati lebar kolom. */
function fitText(doc: JsPdfDoc, text: string, maxWidth: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}...`) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
}

/** Versi ringkas nominal untuk bagian tengah donat (tanpa karakter khusus). */
function compactForPdf(value: number, currency: AppData['settings']['currency']): string {
  const abs = Math.abs(value);
  const sym = currency === 'IDR' ? 'Rp' : '';
  const trim = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  if (currency === 'IDR') {
    if (abs >= 1_000_000_000) return `${sym}${trim(abs / 1_000_000_000)} M`;
    if (abs >= 1_000_000) return `${sym}${trim(abs / 1_000_000)} jt`;
    if (abs >= 1_000) return `${sym}${trim(abs / 1_000)} rb`;
  }
  return `${sym}${formatNumber(abs, currency)}`;
}

/** Deret data untuk grafik batang, menyesuaikan panjang periode. */
function buildSeries(
  tx: Transaction[],
  range: DateRange,
  periodType: PeriodType,
): { label: string; expense: number; income: number }[] {
  const days = rangeLengthDays(range);

  // Periode panjang dikelompokkan per bulan agar batang tidak terlalu rapat.
  if (periodType === 'yearly' || days > 62) {
    const map = new Map<string, { expense: number; income: number }>();
    for (const t of tx) {
      const key = monthKey(t.date);
      const cur = map.get(key) ?? { expense: 0, income: 0 };
      if (t.type === 'income') cur.income += t.amount;
      else cur.expense += t.amount;
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => ({ label: MONTH_SHORT[Number(key.slice(5, 7)) - 1], ...v }));
  }

  const dates = datesInRange(range);
  return dates.map((date) => {
    const dayTx = tx.filter((t) => t.date === date);
    const d = fromISODate(date);
    const label = days <= 8 ? DAY_SHORT[d.getDay()] : String(d.getDate());
    return {
      label,
      expense: totalByType(dayTx, 'expense'),
      income: totalByType(dayTx, 'income'),
    };
  });
}

function seriesCaption(periodType: PeriodType): string {
  if (periodType === 'yearly') return 'Dikelompokkan per bulan';
  if (periodType === 'weekly' || periodType === 'daily') return 'Dikelompokkan per hari';
  return 'Dikelompokkan per hari';
}

export function periodLabel(periodType: PeriodType): string {
  switch (periodType) {
    case 'daily':
      return 'Harian';
    case 'weekly':
      return 'Mingguan';
    case 'monthly':
      return 'Bulanan';
    case 'yearly':
      return 'Tahunan';
    default:
      return 'Kustom';
  }
}

function periodSlug(periodType: PeriodType): string {
  return periodLabel(periodType);
}

function periodTitle(periodType: PeriodType, range: DateRange): string {
  if (periodType === 'daily') return `Laporan Harian - ${dayNameOf(range.from)}, ${formatRange(range)}`;
  return `Laporan ${periodLabel(periodType)} - ${formatRange(range)}`;
}
