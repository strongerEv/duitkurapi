import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { PageHeader, Switch } from '../components/Common';
import Sheet, { ConfirmDialog } from '../components/Sheet';
import ExportReportSheet from '../components/ExportReportSheet';
import {
  IconChevronRight,
  IconDownload,
  IconFileText,
  IconTrash,
  IconUpload,
  IconWhatsApp,
} from '../components/Icons';
import { exportToFile, importFromFile } from '../lib/storage';
import { createEmptyData } from '../lib/defaults';
import { createDemoData } from '../lib/seed';
import type { Settings as SettingsType } from '../types';

const CURRENCIES: { value: SettingsType['currency']; label: string }[] = [
  { value: 'IDR', label: 'Rupiah (Rp)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'SGD', label: 'Singapore Dollar (S$)' },
  { value: 'MYR', label: 'Ringgit (RM)' },
];

export default function Settings() {
  const { data, updateSettings, replaceAll } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState(data.settings.userName);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const s = data.settings;

  const importir = async (file: File) => {
    try {
      const imported = await importFromFile(file);
      replaceAll(imported);
      toast('Data berhasil dipulihkan', 'success');
    } catch {
      toast('File cadangan tidak valid', 'error');
    }
  };

  return (
    <div className="page-scroll">
      <PageHeader title="Pengaturan" subtitle="Sesuaikan Duitku dengan kebiasaanmu" onBack={() => navigate('/')} />

      <div className="page">
        {/* Profil */}
        <section className="card row" style={{ gap: 14 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
            {(s.userName[0] ?? 'D').toUpperCase()}
          </div>
          <div className="f1">
            <div className="fs-14 fw-700">{s.userName}</div>
            <div className="fs-12 text-muted">Nama ini dipakai sebagai tanda tangan pesan penagihan.</div>
          </div>
          <button className="btn xs secondary" onClick={() => { setName(s.userName); setProfileOpen(true); }}>
            Ubah
          </button>
        </section>

        {/* Tampilan */}
        <div className="section-head"><h2 className="section-title">Tampilan &amp; format</h2></div>
        <section className="card" style={{ padding: '2px 16px' }}>
          <div className="switch-row">
            <div className="f1">
              <div className="switch-label">Mode gelap</div>
              <div className="switch-desc">Nyaman dipakai malam hari.</div>
            </div>
            <Switch
              checked={s.theme === 'dark'}
              onChange={(on) => updateSettings({ theme: on ? 'dark' : 'light' })}
              label="Mode gelap"
            />
          </div>
          <div className="switch-row">
            <div className="f1">
              <div className="switch-label">Sembunyikan saldo</div>
              <div className="switch-desc">Nominal saldo di beranda ditutupi titik-titik.</div>
            </div>
            <Switch checked={s.hideBalance} onChange={(on) => updateSettings({ hideBalance: on })} label="Sembunyikan saldo" />
          </div>
          <div className="switch-row">
            <div className="f1">
              <div className="switch-label">Tampilkan desimal</div>
              <div className="switch-desc">Contoh: Rp10.000,00 alih-alih Rp10.000.</div>
            </div>
            <Switch checked={s.showDecimals} onChange={(on) => updateSettings({ showDecimals: on })} label="Tampilkan desimal" />
          </div>
        </section>

        <div className="card mt-12">
          <label className="field-label" htmlFor="mata-uang">Mata uang</label>
          <select
            id="mata-uang"
            className="select"
            value={s.currency}
            onChange={(e) => updateSettings({ currency: e.target.value as SettingsType['currency'] })}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Data master */}
        <div className="section-head"><h2 className="section-title">Data master</h2></div>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <MenuRow emoji="🏷️" title="Kategori" desc={`${data.categories.length} kategori`} onClick={() => navigate('/pengaturan/kategori')} />
          <MenuRow emoji="👛" title="Dompet" desc={`${data.wallets.length} dompet`} onClick={() => navigate('/pengaturan/dompet')} />
          <MenuRow emoji="🎯" title="Anggaran" desc={`${data.budgets.length} anggaran aktif`} onClick={() => navigate('/anggaran')} />
        </section>

        {/* WhatsApp */}
        <div className="section-head"><h2 className="section-title">Penagihan WhatsApp</h2></div>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <MenuRow
            emoji="wa"
            title="Template pesan penagihan"
            desc={`${s.reminderTemplates.length} template tersedia`}
            onClick={() => navigate('/pengaturan/template')}
          />
        </section>
        <div className="card mt-12">
          <label className="field-label" htmlFor="kode-negara">Kode negara default</label>
          <div className="input-prefixed">
            <span className="prefix">+</span>
            <input
              id="kode-negara"
              className="input mono"
              inputMode="numeric"
              value={s.defaultCountryCode}
              onChange={(e) => updateSettings({ defaultCountryCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            />
          </div>
          <p className="field-hint">
            Dipakai untuk mengubah nomor lokal (08…) menjadi format internasional WhatsApp. Indonesia = 62.
          </p>
        </div>

        {/* Laporan PDF */}
        <div className="section-head"><h2 className="section-title">Laporan PDF</h2></div>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="fs-12 text-muted" style={{ lineHeight: 1.6 }}>
            Buat laporan keuangan rapi dalam bentuk PDF — bisa harian, mingguan, bulanan, tahunan,
            atau rentang tanggal bebas. Cocok untuk arsip pribadi, laporan ke pasangan, atau lampiran pengajuan.
          </p>
          <button className="btn block" onClick={() => setExportOpen(true)}>
            <IconFileText size={17} /> Buat &amp; Unduh Laporan PDF
          </button>
        </section>

        {/* Cadangan */}
        <div className="section-head"><h2 className="section-title">Cadangan data</h2></div>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="fs-12 text-muted" style={{ lineHeight: 1.6 }}>
            Semua data Duitku tersimpan di perangkat ini saja. Unduh cadangan secara berkala supaya
            catatanmu tidak hilang jika browser dibersihkan atau ganti HP.
          </p>
          <div className="btn-row">
            <button className="btn secondary" onClick={() => { exportToFile(data); toast('Cadangan diunduh', 'success'); }}>
              <IconDownload size={16} /> Unduh
            </button>
            <button className="btn secondary" onClick={() => fileRef.current?.click()}>
              <IconUpload size={16} /> Pulihkan
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importir(file);
              e.target.value = '';
            }}
          />
        </section>

        {/* Zona bahaya */}
        <div className="section-head"><h2 className="section-title">Zona bahaya</h2></div>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn outline block" onClick={() => setConfirmDemo(true)}>
            🎲 Isi dengan Data Contoh
          </button>
          <button className="btn danger block" onClick={() => setConfirmReset(true)}>
            <IconTrash size={16} /> Hapus Semua Data
          </button>
        </section>

        <p className="fs-12 text-muted text-center mt-16" style={{ lineHeight: 1.6, paddingBottom: 10 }}>
          <strong>Duitku</strong> v1.0.0<br />
          Pencatat keuangan pribadi &amp; penagih hutang otomatis.<br />
          Dibuat untuk dipakai sehari-hari 💚
        </p>
      </div>

      {/* Sheet ubah profil */}
      <Sheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Ubah nama">
        <div className="field">
          <label className="field-label" htmlFor="ubah-nama">Nama panggilan</label>
          <input
            id="ubah-nama"
            className="input"
            value={name}
            maxLength={40}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          className="btn block"
          onClick={() => {
            const clean = name.trim();
            if (!clean) return;
            updateSettings({ userName: clean });
            setProfileOpen(false);
            toast('Nama diperbarui', 'success');
          }}
        >
          Simpan
        </button>
      </Sheet>

      <ExportReportSheet open={exportOpen} onClose={() => setExportOpen(false)} />

      <ConfirmDialog
        open={confirmReset}
        danger
        title="Hapus semua data?"
        message="Seluruh transaksi, hutang, anggaran, dan pengaturan akan dihapus permanen dari perangkat ini. Unduh cadangan dulu kalau belum."
        confirmLabel="Ya, hapus semua"
        onConfirm={() => {
          replaceAll(createEmptyData());
          setConfirmReset(false);
          toast('Semua data dihapus', 'success');
        }}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmDemo}
        title="Ganti dengan data contoh?"
        message="Data yang ada sekarang akan diganti dengan data contoh untuk eksplorasi fitur."
        confirmLabel="Ya, ganti"
        onConfirm={() => {
          replaceAll(createDemoData(s.userName));
          setConfirmDemo(false);
          toast('Data contoh dimuat', 'success');
        }}
        onCancel={() => setConfirmDemo(false)}
      />
    </div>
  );
}

function MenuRow({
  emoji,
  title,
  desc,
  onClick,
}: {
  emoji: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      className="list-item"
      onClick={onClick}
      style={{ borderRadius: 0, borderBottom: '1px solid var(--border)' }}
    >
      <div className="cat-icon" style={{ background: 'var(--surface-3)', color: emoji === 'wa' ? '#25D366' : undefined }}>
        {emoji === 'wa' ? <IconWhatsApp size={19} /> : emoji}
      </div>
      <div className="list-body">
        <div className="list-title">{title}</div>
        <div className="list-sub">{desc}</div>
      </div>
      <IconChevronRight />
    </button>
  );
}
