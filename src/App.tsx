import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import AiChat from './components/AiChat';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import TransactionForm from './pages/TransactionForm';
import Reports from './pages/Reports';
import Debts from './pages/Debts';
import DebtForm from './pages/DebtForm';
import DebtDetail from './pages/DebtDetail';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';
import Categories from './pages/Categories';
import Wallets from './pages/Wallets';
import Templates from './pages/Templates';
import SheetSync from './pages/SheetSync';
import Onboarding from './pages/Onboarding';
import { useApp } from './store/AppContext';

export default function App() {
  const { data } = useApp();
  const location = useLocation();

  // Layar sambutan tampil sampai pengguna mengisi nama atau memilih data contoh.
  const needsOnboarding = !data.settings.userName;
  if (needsOnboarding) return <Onboarding />;

  // Halaman form tampil penuh tanpa navigasi bawah.
  const fullScreen = /\/(baru|ubah|detail)/.test(location.pathname);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transaksi" element={<Transactions />} />
        <Route path="/transaksi/baru" element={<TransactionForm />} />
        <Route path="/transaksi/ubah/:id" element={<TransactionForm />} />
        <Route path="/hutang" element={<Debts />} />
        <Route path="/hutang/baru" element={<DebtForm />} />
        <Route path="/hutang/ubah/:id" element={<DebtForm />} />
        <Route path="/hutang/detail/:id" element={<DebtDetail />} />
        <Route path="/laporan" element={<Reports />} />
        <Route path="/anggaran" element={<Budgets />} />
        <Route path="/pengaturan" element={<Settings />} />
        <Route path="/pengaturan/kategori" element={<Categories />} />
        <Route path="/pengaturan/dompet" element={<Wallets />} />
        <Route path="/pengaturan/template" element={<Templates />} />
        <Route path="/pengaturan/spreadsheet" element={<SheetSync />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Asisten selalu tersedia, kecuali saat mengisi formulir agar tidak
          menutupi tombol simpan. */}
      {!fullScreen && <AiChat />}
      {!fullScreen && <BottomNav />}
    </div>
  );
}
