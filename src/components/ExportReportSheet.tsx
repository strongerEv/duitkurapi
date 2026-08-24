import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useToast } from './Toast';
import Sheet from './Sheet';
import { Switch } from './Common';
import { IconDownload } from './Icons';
import { downloadReportPdf, periodLabel, type ReportSections } from '../lib/pdf';
import { filterByRange, totalByType } from '../lib/calc';
import {
  addMonths,
  currentMonthKey,
  formatMonthKey,
  formatRange,
  monthRangeOf,
  rangeLengthDays,
  toISODate,
  todayISO,
  weekRangeOf,
  yearRangeOf,
  type DateRange,
  type PeriodType,
} from '../lib/date';
import { formatMoney } from '../lib/format';

const PERIODS: { value: PeriodType; label: string; emoji: string }[] = [
  { value: 'daily', label: 'Harian', emoji: '📅' },
  { value: 'weekly', label: 'Mingguan', emoji: '🗓️' },
  { value: 'monthly', label: 'Bulanan', emoji: '📆' },
  { value: 'yearly', label: 'Tahunan', emoji: '📊' },
  { value: 'custom', label: 'Kustom', emoji: '🎯' },
];

const SECTION_LABELS: { key: keyof ReportSections; label: string; desc: string }[] = [
  { key: 'summary', label: 'Ringkasan periode', desc: 'Total masuk, keluar, selisih, dan rata-rata harian.' },
  { key: 'chart', label: 'Grafik arus kas', desc: 'Diagram batang pemasukan vs pengeluaran.' },
  { key: 'categories', label: 'Rincian kategori', desc: 'Diagram donat dan tabel per kategori.' },
  { key: 'transactions', label: 'Daftar transaksi', desc: 'Tabel semua transaksi pada periode ini.' },
  { key: 'wallets', label: 'Posisi dompet', desc: 'Saldo awal, mutasi, dan saldo terkini tiap dompet.' },
  { key: 'budgets', label: 'Anggaran', desc: 'Pemakaian anggaran beserta sisanya.' },
  { key: 'debts', label: 'Hutang & piutang', desc: 'Daftar hutang aktif dan yang lewat jatuh tempo.' },
];

const DEFAULT_SECTIONS: ReportSections = {
  summary: true,
  chart: true,
  categories: true,
  transactions: true,
  wallets: true,
  budgets: true,
  debts: true,
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Bulan yang sedang dilihat pengguna, dipakai sebagai nilai awal. */
  initialMonth?: string;
}

/** Panel pemilihan periode dan isi laporan sebelum diunduh sebagai PDF. */
export default function ExportReportSheet({ open, onClose, initialMonth }: Props) {
  const { data } = useApp();
  const { toast } = useToast();

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [day, setDay] = useState(todayISO());
  const [weekAnchor, setWeekAnchor] = useState(todayISO());
  const [month, setMonth] = useState(initialMonth ?? currentMonthKey());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [customFrom, setCustomFrom] = useState(monthRangeOf(currentMonthKey()).from);
  const [customTo, setCustomTo] = useState(todayISO());
  const [sections, setSections] = useState<ReportSections>(DEFAULT_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cur = data.settings.currency;
  const dec = data.settings.showDecimals;

  const range = useMemo<DateRange>(() => {
    switch (periodType) {
      case 'daily':
        return { from: day, to: day };
      case 'weekly':
        return weekRangeOf(weekAnchor);
      case 'monthly':
        return monthRangeOf(month);
      case 'yearly':
        return yearRangeOf(year);
      default:
        return customFrom <= customTo
          ? { from: customFrom, to: customTo }
          : { from: customTo, to: customFrom };
    }
  }, [periodType, day, weekAnchor, month, year, customFrom, customTo]);

  const scoped = useMemo(
    () => filterByRange(data.transactions, range.from, range.to),
    [data.transactions, range],
  );
  const income = totalByType(scoped, 'income');
  const expense = totalByType(scoped, 'expense');

  const years = useMemo(() => {
    const set = new Set(data.transactions.map((t) => t.date.slice(0, 4)));
    set.add(String(new Date().getFullYear()));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [data.transactions]);

  const anySection = Object.values(sections).some(Boolean);

  const unduh = async () => {
    if (!anySection) {
      setError('Pilih minimal satu bagian yang ingin dimasukkan ke laporan.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const fileName = await downloadReportPdf({ data, range, periodType, sections });
      toast(`PDF tersimpan: ${fileName}`, 'success');
      onClose();
    } catch (err) {
      console.error('[Duitku] Gagal membuat PDF', err);
      toast('Gagal membuat PDF. Coba kurangi rentang tanggalnya.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const shiftDay = (delta: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + delta);
    setDay(toISODate(d));
  };

  const shiftWeek = (delta: number) => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + delta * 7);
    setWeekAnchor(toISODate(d));
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Unduh Laporan PDF"
      description="Pilih periode dan bagian yang ingin dimasukkan, lalu simpan sebagai berkas PDF."
    >
      {/* Jenis periode */}
      <div className="field">
        <span className="field-label">Periode laporan</span>
        <div className="chip-row" style={{ flexWrap: 'wrap' }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`chip ${periodType === p.value ? 'active' : ''}`}
              onClick={() => setPeriodType(p.value)}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pengaturan tiap jenis periode */}
      {periodType === 'daily' && (
        <div className="field">
          <label className="field-label" htmlFor="pdf-hari">Pilih tanggal</label>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn xs secondary" onClick={() => shiftDay(-1)}>‹</button>
            <input
              id="pdf-hari"
              className="input f1"
              type="date"
              value={day}
              onChange={(e) => e.target.value && setDay(e.target.value)}
            />
            <button className="btn xs secondary" onClick={() => shiftDay(1)}>›</button>
          </div>
          <div className="chip-row mt-8">
            <button className="chip" onClick={() => setDay(todayISO())}>Hari ini</button>
            <button className="chip" onClick={() => shiftDay(-1)}>Mundur 1 hari</button>
          </div>
        </div>
      )}

      {periodType === 'weekly' && (
        <div className="field">
          <label className="field-label" htmlFor="pdf-minggu">Minggu yang memuat tanggal</label>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn xs secondary" onClick={() => shiftWeek(-1)}>‹</button>
            <input
              id="pdf-minggu"
              className="input f1"
              type="date"
              value={weekAnchor}
              onChange={(e) => e.target.value && setWeekAnchor(e.target.value)}
            />
            <button className="btn xs secondary" onClick={() => shiftWeek(1)}>›</button>
          </div>
          <p className="field-hint">Satu minggu dihitung dari Senin sampai Minggu.</p>
          <div className="chip-row mt-8">
            <button className="chip" onClick={() => setWeekAnchor(todayISO())}>Minggu ini</button>
            <button className="chip" onClick={() => shiftWeek(-1)}>Minggu lalu</button>
          </div>
        </div>
      )}

      {periodType === 'monthly' && (
        <div className="field">
          <span className="field-label">Pilih bulan</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn xs secondary" onClick={() => setMonth((m) => addMonths(m, -1))}>‹</button>
            <div className="input f1 text-center fw-700" style={{ padding: '13px 8px' }}>
              {formatMonthKey(month)}
            </div>
            <button className="btn xs secondary" onClick={() => setMonth((m) => addMonths(m, 1))}>›</button>
          </div>
          <div className="chip-row mt-8">
            <button className="chip" onClick={() => setMonth(currentMonthKey())}>Bulan ini</button>
            <button className="chip" onClick={() => setMonth(addMonths(currentMonthKey(), -1))}>Bulan lalu</button>
          </div>
        </div>
      )}

      {periodType === 'yearly' && (
        <div className="field">
          <span className="field-label">Pilih tahun</span>
          <div className="chip-row">
            {years.map((y) => (
              <button key={y} className={`chip ${y === year ? 'active' : ''}`} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {periodType === 'custom' && (
        <div className="grid-2">
          <div className="field">
            <label className="field-label" htmlFor="pdf-dari">Dari tanggal</label>
            <input
              id="pdf-dari"
              className="input"
              type="date"
              value={customFrom}
              onChange={(e) => e.target.value && setCustomFrom(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="pdf-sampai">Sampai tanggal</label>
            <input
              id="pdf-sampai"
              className="input"
              type="date"
              value={customTo}
              onChange={(e) => e.target.value && setCustomTo(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Pratinjau isi laporan */}
      <div className="card card-flat" style={{ background: 'var(--green-50)', borderColor: 'transparent' }}>
        <div className="fs-12 text-muted">Laporan {periodLabel(periodType)}</div>
        <div className="fs-14 fw-700 mt-8">{formatRange(range)}</div>
        <div className="divider" style={{ margin: '10px 0' }} />
        <div className="row-between fs-12">
          <span className="text-muted">{scoped.length} transaksi · {rangeLengthDays(range)} hari</span>
          <span className="mono">
            <span style={{ color: 'var(--income)' }}>+{formatMoney(income, cur, dec)}</span>
            {'  '}
            <span style={{ color: 'var(--expense)' }}>-{formatMoney(expense, cur, dec)}</span>
          </span>
        </div>
        {scoped.length === 0 && (
          <p className="field-hint" style={{ marginTop: 8 }}>
            Tidak ada transaksi pada periode ini — laporan tetap bisa diunduh, isinya berupa ringkasan kosong
            beserta bagian lain yang kamu pilih.
          </p>
        )}
      </div>

      {/* Bagian yang disertakan */}
      <div className="section-head" style={{ marginTop: 18 }}>
        <span className="section-title" style={{ fontSize: 14 }}>Isi laporan</span>
        <button
          className="section-link"
          onClick={() =>
            setSections((prev) =>
              Object.values(prev).every(Boolean)
                ? { summary: true, chart: false, categories: false, transactions: true, wallets: false, budgets: false, debts: false }
                : DEFAULT_SECTIONS,
            )
          }
        >
          {Object.values(sections).every(Boolean) ? 'Ringkas saja' : 'Pilih semua'}
        </button>
      </div>
      <div className="card card-flat" style={{ padding: '2px 14px' }}>
        {SECTION_LABELS.map((s) => (
          <div className="switch-row" key={s.key}>
            <div className="f1">
              <div className="switch-label">{s.label}</div>
              <div className="switch-desc">{s.desc}</div>
            </div>
            <Switch
              checked={sections[s.key]}
              onChange={(on) => setSections((prev) => ({ ...prev, [s.key]: on }))}
              label={s.label}
            />
          </div>
        ))}
      </div>

      {error && <p className="field-error">{error}</p>}

      <button className="btn block mt-16" onClick={() => void unduh()} disabled={busy || !anySection}>
        <IconDownload size={18} /> {busy ? 'Menyiapkan PDF…' : 'Unduh PDF'}
      </button>
      <p className="field-hint text-center mt-12">
        Berkas PDF tersimpan langsung ke perangkatmu dan bisa dibagikan lewat WhatsApp, email, atau dicetak.
      </p>
    </Sheet>
  );
}
