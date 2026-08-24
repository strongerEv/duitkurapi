import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './store/AppContext';
import { ToastProvider } from './components/Toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HashRouter dipilih agar aplikasi bisa dihosting statis (GitHub Pages) tanpa konfigurasi server. */}
    <HashRouter>
      <AppProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppProvider>
    </HashRouter>
  </React.StrictMode>,
);
