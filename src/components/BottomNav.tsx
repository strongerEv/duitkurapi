import { NavLink, useNavigate } from 'react-router-dom';
import { IconChart, IconHandshake, IconHome, IconList, IconPlus } from './Icons';

/** Navigasi bawah dengan tombol tambah transaksi di tengah. */
export default function BottomNav() {
  const navigate = useNavigate();

  const item = (to: string, label: string, Icon: typeof IconHome) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end={to === '/'}>
      <Icon size={21} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <nav className="bottom-nav">
      {item('/', 'Beranda', IconHome)}
      {item('/transaksi', 'Transaksi', IconList)}
      <button className="nav-fab" onClick={() => navigate('/transaksi/baru')} aria-label="Tambah transaksi">
        <IconPlus size={24} />
      </button>
      {item('/hutang', 'Hutang', IconHandshake)}
      {item('/laporan', 'Laporan', IconChart)}
    </nav>
  );
}
