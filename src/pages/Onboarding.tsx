import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { createDemoData } from '../lib/seed';
import { IconChevronRight, IconWhatsApp } from '../components/Icons';

/** Layar sambutan pertama kali: minta nama & tawarkan data contoh. */
export default function Onboarding() {
  const { updateSettings, replaceAll } = useApp();
  const [name, setName] = useState('');

  const mulai = () => {
    const clean = name.trim() || 'Sobat Duitku';
    updateSettings({ userName: clean });
  };

  const pakaiContoh = () => {
    replaceAll(createDemoData(name.trim() || 'Sobat Duitku'));
  };

  return (
    <div className="app-shell" style={{ paddingBottom: 24 }}>
      <div className="page" style={{ paddingTop: 40 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 26,
            background: 'linear-gradient(135deg, var(--mint), var(--green-700))',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 34,
            fontWeight: 800,
            boxShadow: 'var(--shadow-green)',
            marginBottom: 20,
          }}
        >
          D
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          Selamat datang di<br />
          <span style={{ color: 'var(--green-500)' }}>Duitku</span> 👋
        </h1>
        <p className="text-muted fs-14 mt-8" style={{ lineHeight: 1.6 }}>
          Catat pemasukan &amp; pengeluaran, atur anggaran, dan yang paling penting —
          tagih hutang teman langsung lewat WhatsApp tanpa perlu mengetik pesan.
        </p>

        <div className="card mt-16" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Feature emoji="💚" title="Catatan keuangan lengkap" desc="Multi-dompet, kategori kustom, dan riwayat rapi per hari." />
          <Feature emoji="📊" title="Laporan visual" desc="Grafik donat & batang untuk melihat ke mana uangmu pergi." />
          <Feature
            emoji="wa"
            title="Tagih hutang via WhatsApp"
            desc="Simpan nomor WA peminjam, pesan penagihan otomatis berisi total & lama hutang."
          />
          <Feature emoji="🎯" title="Anggaran bulanan" desc="Pasang batas belanja, Duitku ingatkan sebelum jebol." />
        </div>

        <div className="field mt-16">
          <label className="field-label" htmlFor="nama">Siapa nama panggilanmu?</label>
          <input
            id="nama"
            className="input"
            placeholder="Contoh: Evan"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && mulai()}
          />
          <p className="field-hint">Dipakai sebagai sapaan di beranda dan tanda tangan pesan penagihan.</p>
        </div>

        <button className="btn block" onClick={mulai}>
          Mulai Catat Keuangan <IconChevronRight size={18} />
        </button>
        <button className="btn outline block mt-12" onClick={pakaiContoh}>
          Coba dengan Data Contoh
        </button>

        <p className="fs-12 text-muted text-center mt-16" style={{ lineHeight: 1.6 }}>
          🔒 Semua data disimpan di perangkatmu sendiri (localStorage). Tidak ada server, tidak ada yang mengintip.
        </p>
      </div>
    </div>
  );
}

function Feature({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          background: 'var(--green-50)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
          flex: 'none',
          color: '#25D366',
        }}
      >
        {emoji === 'wa' ? <IconWhatsApp size={20} /> : emoji}
      </div>
      <div className="f1">
        <div className="fs-14 fw-700">{title}</div>
        <div className="fs-12 text-muted" style={{ lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}
