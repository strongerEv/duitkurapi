import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duitku.app',
  appName: 'Duitku',
  // Hasil `npm run build` dipakai apa adanya sebagai isi aplikasi Android.
  webDir: 'dist',
  android: {
    // Latar putih mencegah kedipan hitam saat WebView mulai memuat.
    backgroundColor: '#F2F7F4',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#12996B',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#12996B',
    },
  },
};

export default config;
