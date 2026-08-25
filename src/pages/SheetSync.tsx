import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/Common';
import { IconCheck, IconCopy, IconDownload, IconEdit, IconUpload } from '../components/Icons';
import {
  countRows,
  generateToken,
  isValidScriptUrl,
  syncToSheets,
  testConnection,
  type SyncResult,
} from '../lib/sheets';
import { formatDate, formatTime } from '../lib/date';
// Kode Apps Script dibaca langsung dari berkas sumbernya, supaya tombol salin
// di aplikasi tidak pernah berbeda dengan google-apps-script/Code.gs.
import appsScriptSource from '../../google-apps-script/Code.gs?raw';

const STEPS = [
  {
    title: 'Buat spreadsheet baru',
    body: 'Buka sheets.new di browser. Biarkan spreadsheet tetap privat — jangan dibagikan ke publik, karena isinya memuat nama dan nomor WhatsApp orang lain.',
  },
  {
    title: 'Buka editor Apps Script',
    body: 'Dari spreadsheet tadi, pilih menu Extensions → Apps Script. Akan terbuka tab editor kode.',
  },
  {
    title: 'Tempel kode Duitku',
    body: 'Hapus seluruh isi file Code.gs bawaan, lalu tempel kode yang kamu salin dari tombol di bawah.',
  },
  {
    title: 'Pasang token rahasia',
    body: 'Di baris atas kode, ganti GANTI_DENGAN_TOKEN_RAHASIA_ANDA dengan token yang kamu buat di halaman ini. Token di kode dan di aplikasi harus persis sama.',
  },
  {
    title: 'Deploy sebagai Web app',
    body: 'Klik Deploy → New deployment → pilih tipe Web app. Setel "Execute as: Me" dan "Who has access: Anyone" (bukan Anyone with Google account), lalu Deploy dan setujui izinnya.',
  },
  {
    title: 'Salin URL dan tempel di sini',
    body: 'Salin Web app URL yang berakhiran /exec, tempel di kolom di bawah bersama tokenmu, lalu tekan Tes Koneksi.',
  },
];

export default function SheetSync() {
  const { data, updateSettings } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const saved = data.settings.sheetSync;
  const [url, setUrl] = useState(saved.url);
  const [token, setToken] = useState(saved.token);
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'test' | 'sync'>('idle');
  const [result, setResult] = useState<SyncResult | null>(null);
  const [guideOpen, setGuideOpen] = useState(!saved.url);

  const rowCount = useMemo(() => countRows(data), [data]);
  const urlOk = !url || isValidScriptUrl(url);
  const siap = isValidScriptUrl(url) && token.trim().length > 0;

  const simpanKredensial = (patch: Partial<typeof saved>) => {
    updateSettings({ sheetSync: { ...data.settings.sheetSync, ...patch } });
  };

  const salin = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} disalin`, 'success');
    } catch {
      toast('Browser menolak akses clipboard', 'error');
    }
  };

  const buatToken = () => {
    const baru = generateToken();
    setToken(baru);
    setShowToken(true);
    simpanKredensial({ token: baru });
    toast('Token baru dibuat — jangan lupa tempel juga ke Code.gs', 'success');
  };

  const tesKoneksi = async () => {
    setBusy('test');
    setResult(null);
    const res = await testConnection(url, token);
    setResult(res);
    setBusy('idle');
    if (res.ok) {
      simpanKredensial({
        url: url.trim(),
        token,
        spreadsheetName: res.spreadsheetName,
        spreadsheetUrl: res.spreadsheetUrl,
      });
      toast('Koneksi berhasil 🎉', 'success');
    } else {
      toast('Koneksi gagal', 'error');
    }
  };

  const kirimSekarang = async () => {
    setBusy('sync');
    setResult(null);
    const res = await syncToSheets(url, token, data);
    setResult(res);
    setBusy('idle');
    if (res.ok) {
      simpanKredensial({
        url: url.trim(),
        token,
        lastSyncAt: Date.now(),
        lastRowCount: rowCount,
        spreadsheetName: res.spreadsheetName,
        spreadsheetUrl: res.spreadsheetUrl,
      });
      toast(`${rowCount} baris terkirim ke spreadsheet`, 'success');
    } else {
      toast('Gagal mengirim data', 'error');
    }
  };

  const putuskan = () => {
    updateSettings({ sheetSync: { url: '', token: '' } });
    setUrl('');
    setToken('');
    setResult(null);
    toast('Sambungan spreadsheet diputus', 'success');
  };

  return (
    <div className="page-scroll">
      <PageHeader
        title="Hubungkan ke Spreadsheet"
        subtitle="Kirim data Duitku ke Google Sheets milikmu"
        onBack={() => navigate('/pengaturan')}
      />

      <div className="page">
        {/* Status sambungan */}
        {saved.lastSyncAt ? (
          <section className="card" style={{ background: 'var(--income-bg)', borderColor: 'transparent' }}>
            <div className="row" style={{ gap: 12 }}>
              <div className="cat-icon" style={{ background: 'rgba(18,153,107,0.16)', color: 'var(--income)' }}>
                <IconCheck size={20} />
              </div>
              <div className="f1">
                <div className="fs-14 fw-700">Tersambung</div>
                <div className="fs-12 text-muted">
                  {saved.spreadsheetName ? `${saved.spreadsheetName} · ` : ''}
                  terakhir dikirim {formatDate(new Date(saved.lastSyncAt).toISOString().slice(0, 10))} pukul{' '}
                  {formatTime(saved.lastSyncAt)}
                </div>
              </div>
            </div>
            {saved.spreadsheetUrl && (
              <a
                className="btn secondary sm block mt-12"
                href={saved.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka Spreadsheet
              </a>
            )}
          </section>
        ) : (
          <section className="card" style={{ background: 'var(--green-50)', borderColor: 'transparent' }}>
            <div className="fs-13 fw-700" style={{ color: 'var(--green-600)' }}>💡 Cara kerjanya</div>
            <p className="fs-12 text-muted mt-8" style={{ lineHeight: 1.6 }}>
              Duitku mengirim datanya ke sebuah script kecil yang kamu pasang sendiri di spreadsheet milikmu.
              Spreadsheet tetap privat — yang bisa diakses dari luar hanya script itu, dan setiap kiriman
              wajib membawa token rahasiamu.
            </p>
          </section>
        )}

        {/* Panduan */}
        <div className="section-head">
          <h2 className="section-title">Panduan pemasangan</h2>
          <button className="section-link" onClick={() => setGuideOpen((v) => !v)}>
            {guideOpen ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>

        {guideOpen && (
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {STEPS.map((s, i) => (
              <div className="row" key={s.title} style={{ alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'var(--green-500)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    flex: 'none',
                  }}
                >
                  {i + 1}
                </div>
                <div className="f1">
                  <div className="fs-14 fw-700">{s.title}</div>
                  <div className="fs-12 text-muted" style={{ lineHeight: 1.55 }}>{s.body}</div>
                </div>
              </div>
            ))}

            <div className="btn-row">
              <button className="btn secondary" onClick={() => void salin(appsScriptSource, 'Kode Apps Script')}>
                <IconCopy size={16} /> Salin Kode
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  const blob = new Blob([appsScriptSource], { type: 'text/plain' });
                  const href = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = href;
                  a.download = 'Code.gs';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.setTimeout(() => URL.revokeObjectURL(href), 3000);
                  toast('Code.gs diunduh', 'success');
                }}
              >
                <IconDownload size={16} /> Unduh Code.gs
              </button>
            </div>
            <p className="field-hint text-center">
              Kode ini juga tersedia di repositori pada berkas <code>google-apps-script/Code.gs</code>.
            </p>
          </section>
        )}

        {/* Kredensial */}
        <div className="section-head"><h2 className="section-title">Sambungan</h2></div>
        <section className="card">
          <div className="field">
            <label className="field-label" htmlFor="script-url">URL Web app Apps Script</label>
            <input
              id="script-url"
              className="input"
              inputMode="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => simpanKredensial({ url: url.trim() })}
              style={{ fontSize: 13 }}
            />
            {url && !urlOk && (
              <p className="field-error">URL harus berakhiran <code>/exec</code>, bukan <code>/dev</code>.</p>
            )}
            {url && urlOk && <p className="field-hint" style={{ color: 'var(--income)' }}>✓ Format URL sudah benar</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="script-token">Token rahasia</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                id="script-token"
                className="input mono f1"
                type={showToken ? 'text' : 'password'}
                placeholder="Token yang sama dengan di Code.gs"
                value={token}
                autoComplete="off"
                onChange={(e) => setToken(e.target.value)}
                onBlur={() => simpanKredensial({ token })}
                style={{ fontSize: 13 }}
              />
              <button className="btn xs secondary" onClick={() => setShowToken((v) => !v)}>
                {showToken ? 'Tutup' : 'Lihat'}
              </button>
            </div>
            <div className="btn-row mt-8">
              <button className="btn xs secondary" onClick={buatToken}>
                <IconEdit size={14} /> Buatkan Token
              </button>
              <button className="btn xs secondary" disabled={!token} onClick={() => void salin(token, 'Token')}>
                <IconCopy size={14} /> Salin Token
              </button>
            </div>
            <p className="field-hint">
              Token ini harus persis sama dengan nilai <code>TOKEN</code> di baris atas Code.gs. Setelah mengubah
              token di Apps Script, jangan lupa deploy ulang dengan versi baru.
            </p>
          </div>
        </section>

        {/* Aksi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <button className="btn secondary block" onClick={() => void tesKoneksi()} disabled={!siap || busy !== 'idle'}>
            {busy === 'test' ? 'Menghubungi script…' : 'Tes Koneksi'}
          </button>
          <button className="btn block" onClick={() => void kirimSekarang()} disabled={!siap || busy !== 'idle'}>
            <IconUpload size={17} />
            {busy === 'sync' ? 'Mengirim data…' : `Kirim ${rowCount} Baris ke Spreadsheet`}
          </button>
        </div>

        {/* Hasil */}
        {result && (
          <section
            className="card mt-16"
            style={{
              background: result.ok ? 'var(--income-bg)' : 'var(--expense-bg)',
              borderColor: 'transparent',
            }}
          >
            <div className="fs-13 fw-700" style={{ color: result.ok ? 'var(--income)' : 'var(--expense)' }}>
              {result.ok ? '✅ Berhasil' : '⚠️ Gagal'}
              {result.error ? ` · ${result.error}` : ''}
            </div>
            <p className="fs-12 text-muted mt-8" style={{ lineHeight: 1.6 }}>{result.message}</p>
            {result.sheets && result.sheets.length > 0 && (
              <div className="fs-12 text-muted mt-8">
                {result.sheets.map((s) => (
                  <div key={s.name}>
                    • {s.name}: {s.rows} baris
                  </div>
                ))}
              </div>
            )}
            {result.ok && result.spreadsheetUrl && (
              <a
                className="btn sm block mt-12"
                href={result.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka Spreadsheet
              </a>
            )}
          </section>
        )}

        {/* Apa saja yang dikirim */}
        <div className="section-head"><h2 className="section-title">Yang dikirim</h2></div>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Ringkasan', 'Saldo, total masuk/keluar, posisi hutang-piutang'],
            ['Transaksi', 'Seluruh transaksi: tanggal, kategori, dompet, catatan, nominal'],
            ['Hutang', 'Nama, nomor WA, pokok, terbayar, sisa, umur, status, riwayat penagihan'],
            ['Dompet', 'Saldo awal, total masuk/keluar, saldo terkini'],
            ['Anggaran', 'Batas, terpakai, sisa, dan persentase bulan berjalan'],
          ].map(([name, desc]) => (
            <div className="row" key={name} style={{ gap: 10, alignItems: 'flex-start' }}>
              <div className="cat-icon" style={{ width: 32, height: 32, background: 'var(--surface-3)', fontSize: 15 }}>
                📄
              </div>
              <div className="f1">
                <div className="fs-13 fw-700">{name}</div>
                <div className="fs-12 text-muted" style={{ lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
          <p className="field-hint">
            Setiap pengiriman menimpa kelima sheet di atas. Sheet lain buatanmu sendiri — misalnya pivot atau
            grafik — tidak disentuh, jadi aman untuk menaruh olahan datamu di sana.
          </p>
        </section>

        {saved.url && (
          <button className="btn secondary block mt-16" onClick={putuskan}>
            Putuskan Sambungan
          </button>
        )}

        <p className="fs-12 text-muted text-center mt-16" style={{ lineHeight: 1.6, paddingBottom: 10 }}>
          🔒 URL dan token disimpan di perangkat ini saja. Perlakukan keduanya seperti kata sandi —
          siapa pun yang memilikinya bisa menulis ke spreadsheetmu.
        </p>
      </div>
    </div>
  );
}
