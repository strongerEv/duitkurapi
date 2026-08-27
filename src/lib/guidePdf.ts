/**
 * Penyusun "Panduan Integrasi Google Spreadsheet" dalam bentuk PDF.
 *
 * Dokumen ini dibuat agar pengguna bisa membacanya sambil bekerja di layar
 * lain, mencetaknya, atau meneruskannya ke orang lain yang memakai aplikasi
 * hasil bagi pakai.
 */

const PAGE = { w: 210, h: 297 };
const M = { left: 16, right: 16, bottom: 18 };
const CONTENT_W = PAGE.w - M.left - M.right;

type RGB = [number, number, number];

const C = {
  green: [18, 153, 107] as RGB,
  greenDark: [11, 103, 70] as RGB,
  greenLight: [234, 249, 242] as RGB,
  mint: [31, 208, 138] as RGB,
  text: [14, 42, 32] as RGB,
  muted: [91, 122, 108] as RGB,
  faint: [144, 169, 157] as RGB,
  border: [214, 232, 223] as RGB,
  warnBg: [254, 244, 226] as RGB,
  warn: [180, 83, 9] as RGB,
  dangerBg: [253, 236, 236] as RGB,
  danger: [214, 60, 65] as RGB,
  code: [244, 248, 246] as RGB,
  white: [255, 255, 255] as RGB,
};

interface Step {
  title: string;
  lines: string[];
  /** Kotak peringatan opsional di bawah langkah. */
  warn?: string;
}

const STEPS: Step[] = [
  {
    title: 'Siapkan spreadsheet baru',
    lines: [
      'Buka alamat sheets.new di browser untuk membuat Google Spreadsheet kosong.',
      'Beri nama sesukamu, misalnya "Keuangan Duitku".',
      'Biarkan spreadsheet ini PRIVAT. Jangan dibagikan ke publik.',
    ],
    warn:
      'Data Duitku memuat nama dan nomor WhatsApp orang lain. Membuat spreadsheet menjadi publik berarti '
      + 'membocorkan data pribadi mereka. Sepanjang panduan ini, spreadsheet tetap privat.',
  },
  {
    title: 'Buka editor Apps Script',
    lines: [
      'Dari spreadsheet tadi, pilih menu Extensions (Ekstensi) -> Apps Script.',
      'Akan terbuka tab baru berisi editor kode dengan berkas bernama Code.gs.',
    ],
  },
  {
    title: 'Tempel kode Duitku',
    lines: [
      'Hapus seluruh isi Code.gs bawaan (pilih semua lalu hapus).',
      'Tempel kode Duitku yang kamu salin atau unduh dari aplikasi.',
      'Simpan dengan ikon disket atau tekan Ctrl+S (Cmd+S di Mac).',
      'Tidak ada satu baris pun di dalam kode yang perlu kamu ubah.',
    ],
  },
  {
    title: 'Jalankan setupDatabase',
    lines: [
      'Di bagian atas editor ada kotak pilihan fungsi. Pilih: setupDatabase',
      'Klik tombol Run di sebelahnya.',
      'Google akan meminta izin: klik Review permissions, lalu pilih akun Google-mu.',
      'Muncul peringatan "Google hasn\'t verified this app". Klik Advanced, lalu "Go to <nama proyek> (unsafe)", kemudian Allow.',
    ],
    warn:
      'Peringatan "belum diverifikasi" itu wajar dan bukan tanda bahaya. Script ini kamu tulis dan '
      + 'jalankan sendiri di akunmu, bukan aplikasi pihak ketiga yang dipublikasikan.',
  },
  {
    title: 'Salin token yang muncul',
    lines: [
      'Setelah Run selesai, sebuah kotak dialog menampilkan TOKEN milikmu.',
      'Token juga tercatat di kotak Execution log di bagian bawah editor.',
      'Salin token tersebut, nanti ditempel di aplikasi Duitku.',
      'Lupa token? Buka spreadsheet, pilih menu Duitku -> Lihat Token.',
    ],
  },
  {
    title: 'Deploy sebagai Web app',
    lines: [
      'Klik Deploy -> New deployment.',
      'Klik ikon roda gigi di samping "Select type", pilih Web app.',
      'Description : bebas, misalnya Duitku Sync',
      'Execute as : Me (alamat emailmu)',
      'Who has access : Anyone',
      'Klik Deploy, lalu salin "Web app URL" yang berakhiran /exec',
    ],
    warn:
      'Pilih Anyone, BUKAN "Anyone with Google account". Kalau salah, Google akan membalas halaman '
      + 'login dan aplikasi melaporkan kegagalan akses. Di layar ini juga tidak ada pilihan fungsi: '
      + 'Apps Script otomatis memakai doGet dan doPost berdasarkan namanya.',
  },
  {
    title: 'Sambungkan dari aplikasi Duitku',
    lines: [
      'Buka Duitku -> Pengaturan -> Hubungkan ke Spreadsheet.',
      'Tempel Web app URL pada kolom URL, dan token pada kolom Token rahasia.',
      'Tekan Tes Koneksi. Bila berhasil, nama spreadsheet akan muncul.',
      'Tekan Kirim ke Spreadsheet untuk mengirim seluruh data.',
    ],
  },
];

const SHEETS: [string, string][] = [
  ['Ringkasan', 'Saldo, total masuk dan keluar, posisi hutang-piutang, jumlah catatan'],
  ['Transaksi', 'Tanggal, jenis, kategori, dompet, catatan, pemasukan, pengeluaran, kode bulan'],
  ['Hutang', 'Nama, nomor WA, pokok, terbayar, sisa, jatuh tempo, umur, status, riwayat penagihan'],
  ['Dompet', 'Saldo awal, total masuk dan keluar, saldo terkini'],
  ['Anggaran', 'Batas, terpakai, sisa, dan persentase pemakaian bulan berjalan'],
];

const TROUBLE: [string, string][] = [
  [
    'Google mengembalikan halaman login',
    'Setelan "Who has access" belum Anyone. Buka Deploy -> Manage deployments -> ikon pensil -> '
      + 'ubah menjadi Anyone -> Deploy.',
  ],
  [
    'Token tidak cocok',
    'Ambil token yang benar lewat menu Duitku -> Lihat Token pada spreadsheet, lalu tempel ulang di aplikasi.',
  ],
  [
    'Script belum disiapkan',
    'Fungsi setupDatabase belum pernah dijalankan. Buka editor Apps Script, pilih fungsi itu, lalu klik Run.',
  ],
  [
    'Tidak bisa menghubungi script',
    'Pastikan URL berakhiran /exec (bukan /dev), perangkat tersambung internet, dan deployment belum dihapus.',
  ],
  [
    'Menu Duitku tidak muncul di spreadsheet',
    'Muat ulang halaman spreadsheet sekali. Menu dipasang saat spreadsheet dibuka.',
  ],
  [
    'Data lama masih tertinggal',
    'Setiap sinkronisasi menimpa kelima sheet Duitku. Kalau ada sheet lain buatanmu, isinya tidak disentuh.',
  ],
];

/** Membangun berkas panduan dan mengembalikannya sebagai blob siap unduh. */
export async function buildGuidePdf(): Promise<{ blob: Blob; fileName: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  let y = 0;

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style: 'normal' | 'bold', size: number) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };

  const drawHeader = (first: boolean) => {
    const h = first ? 40 : 18;
    setFill(C.green);
    doc.rect(0, 0, PAGE.w, h, 'F');
    setFill(C.mint);
    doc.rect(0, h, PAGE.w, 1.2, 'F');
    setText(C.white);

    if (first) {
      font('bold', 20);
      doc.text('Duitku', M.left, 16);
      font('normal', 9.5);
      doc.text('Panduan Integrasi Google Spreadsheet', M.left, 22.5);
      font('normal', 8);
      doc.text('Kirim catatan keuanganmu ke spreadsheet sendiri, tanpa server perantara.', M.left, 31);
      doc.text('Perkiraan waktu pemasangan: 5 menit. Cukup dilakukan sekali.', M.left, 35.5);
    } else {
      font('bold', 12);
      doc.text('Duitku', M.left, 11);
      font('normal', 7.5);
      doc.text('Panduan Integrasi Google Spreadsheet', M.left, 15);
    }
    y = h + (first ? 12 : 9);
  };

  const ensure = (need: number) => {
    if (y + need <= PAGE.h - M.bottom) return;
    doc.addPage();
    drawHeader(false);
  };

  const sectionTitle = (title: string) => {
    ensure(26);
    setFill(C.green);
    doc.roundedRect(M.left, y - 3.4, 2.4, 6, 1.2, 1.2, 'F');
    font('bold', 12);
    setText(C.text);
    doc.text(title, M.left + 5, y + 1.4);
    y += 9;
  };

  /** Paragraf biasa yang otomatis membungkus baris. */
  const para = (text: string, size = 8.6, color: RGB = C.muted, indent = 0) => {
    font('normal', size);
    setText(color);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent) as string[];
    for (const line of lines) {
      ensure(6);
      doc.text(line, M.left + indent, y);
      y += size * 0.52 + 1.4;
    }
  };

  /** Kotak berwarna untuk catatan penting. */
  const callout = (label: string, text: string, bg: RGB, fg: RGB) => {
    font('normal', 8);
    const lines = doc.splitTextToSize(text, CONTENT_W - 12) as string[];
    const boxH = 9 + lines.length * 4.2;
    ensure(boxH + 4);
    setFill(bg);
    doc.roundedRect(M.left, y - 3, CONTENT_W, boxH, 2, 2, 'F');
    font('bold', 8.2);
    setText(fg);
    doc.text(label, M.left + 4, y + 2);
    font('normal', 8);
    setText(C.muted);
    let ly = y + 6.6;
    for (const line of lines) {
      doc.text(line, M.left + 4, ly);
      ly += 4.2;
    }
    y += boxH + 4;
  };

  const step = (index: number, s: Step) => {
    // Judul langkah beserta beberapa baris pertamanya dijaga tetap sehalaman.
    ensure(24);
    setFill(C.green);
    doc.circle(M.left + 3.4, y - 1, 3.4, 'F');
    font('bold', 8.5);
    setText(C.white);
    doc.text(String(index), M.left + 3.4, y + 0.5, { align: 'center' });

    font('bold', 10);
    setText(C.text);
    doc.text(s.title, M.left + 9.5, y + 0.6);
    y += 6.6;

    for (const line of s.lines) {
      ensure(6);
      font('normal', 8.6);
      setText(C.muted);
      const wrapped = doc.splitTextToSize(line, CONTENT_W - 13) as string[];
      for (let i = 0; i < wrapped.length; i++) {
        ensure(5.5);
        if (i === 0) {
          setFill(C.faint);
          doc.circle(M.left + 10.6, y - 1.1, 0.7, 'F');
        }
        setText(C.muted);
        doc.text(wrapped[i], M.left + 13, y);
        y += 4.6;
      }
    }
    y += 1.6;
    if (s.warn) {
      callout('Perhatian', s.warn, C.warnBg, C.warn);
    } else {
      y += 2;
    }
  };

  const table = (rows: [string, string][], leftW: number, headers: [string, string]) => {
    const rightW = CONTENT_W - leftW;
    const drawHead = () => {
      ensure(16);
      setFill(C.greenLight);
      doc.roundedRect(M.left, y, CONTENT_W, 7.5, 1.2, 1.2, 'F');
      font('bold', 8);
      setText(C.greenDark);
      doc.text(headers[0], M.left + 3, y + 5);
      doc.text(headers[1], M.left + leftW + 3, y + 5);
      y += 9;
    };
    drawHead();

    for (const [left, right] of rows) {
      // Kedua kolom dibungkus, dan tinggi baris mengikuti kolom yang terpanjang
      // supaya tidak ada teks yang terpotong di tengah kalimat.
      font('bold', 8);
      const leftLines = doc.splitTextToSize(left, leftW - 6) as string[];
      font('normal', 8);
      const rightLines = doc.splitTextToSize(right, rightW - 6) as string[];
      const rowH = Math.max(6.4, Math.max(leftLines.length, rightLines.length) * 4.3 + 2.4);
      if (y + rowH > PAGE.h - M.bottom) {
        doc.addPage();
        drawHeader(false);
        drawHead();
      }
      font('bold', 8);
      setText(C.text);
      let ky = y + 3.4;
      for (const line of leftLines) {
        doc.text(line, M.left + 3, ky);
        ky += 4.3;
      }
      font('normal', 8);
      setText(C.muted);
      let ly = y + 3.4;
      for (const line of rightLines) {
        doc.text(line, M.left + leftW + 3, ly);
        ly += 4.3;
      }
      y += rowH;
      setDraw(C.border);
      doc.setLineWidth(0.15);
      doc.line(M.left, y, PAGE.w - M.right, y);
      y += 2.4;
    }
    y += 4;
  };

  /* ---------------- Isi ---------------- */

  drawHeader(true);

  sectionTitle('Sekilas cara kerjanya');
  para(
    'Duitku menyimpan seluruh datanya di perangkatmu sendiri. Agar data itu bisa dibaca di Google Sheets, '
      + 'kamu memasang sebuah script kecil di spreadsheet milikmu. Aplikasi lalu mengirim datanya langsung ke '
      + 'script tersebut.',
  );
  y += 1;
  para(
    'Spreadsheet tetap privat. Yang bisa dihubungi dari luar hanyalah script itu, dan setiap kiriman wajib '
      + 'membawa token rahasia yang hanya kamu miliki. Tidak ada server perantara, dan tidak ada pihak ketiga '
      + 'yang menyimpan datamu.',
  );
  y += 3;

  callout(
    'Yang perlu disiapkan',
    'Sebuah akun Google, browser di komputer (langkah Apps Script lebih nyaman di layar besar), dan aplikasi '
      + 'Duitku yang sudah terbuka. Seluruh proses ini gratis dan cukup dikerjakan sekali.',
    C.greenLight,
    C.greenDark,
  );

  sectionTitle('Langkah pemasangan');
  STEPS.forEach((s, i) => step(i + 1, s));

  sectionTitle('Isi spreadsheet setelah tersambung');
  para(
    'Duitku menulis lima sheet berikut. Judul kolom dibekukan, filter dipasang otomatis, nominal diberi format '
      + 'mata uang, dan tanggal ditulis sebagai tanggal asli sehingga langsung bisa dipakai untuk pivot dan grafik.',
  );
  y += 3;
  table(SHEETS, 34, ['Sheet', 'Isi']);
  callout(
    'Aman untuk olahanmu sendiri',
    'Setiap sinkronisasi menimpa kelima sheet di atas. Sheet lain yang kamu buat sendiri, misalnya pivot atau '
      + 'grafik, tidak pernah disentuh.',
    C.greenLight,
    C.greenDark,
  );

  sectionTitle('Bila ada yang tidak beres');
  table(TROUBLE, 58, ['Gejala', 'Cara mengatasi']);

  sectionTitle('Merawat token');
  para(
    'Token disimpan di Script Properties milik spreadsheetmu, bukan di dalam kode. Karena itu token tidak ikut '
      + 'tersebar bila kode aplikasi kamu bagikan ke orang lain.',
  );
  y += 1;
  para('Dari spreadsheet, tersedia menu Duitku dengan tiga pilihan:');
  y += 1;
  para('\u2022  Siapkan Sheet - menjalankan ulang pemasangan bila ada sheet yang terhapus.', 8.6, C.muted, 6);
  para('\u2022  Lihat Token - menampilkan token bila kamu lupa.', 8.6, C.muted, 6);
  para('\u2022  Buat Token Baru - mencabut token lama seketika, misalnya bila token bocor.', 8.6, C.muted, 6);
  y += 2;
  callout(
    'Mengganti token tidak perlu deploy ulang',
    'Token dibaca setiap kali permintaan masuk, bukan saat deploy. Setelah membuat token baru, cukup perbarui '
      + 'nilainya di aplikasi Duitku.',
    C.greenLight,
    C.greenDark,
  );

  sectionTitle('Bila aplikasi ini dipakai bersama');
  para(
    'Data antar pengguna tidak akan tercampur: setiap orang menyimpan datanya di browser masing-masing, '
      + 'meski membuka alamat aplikasi yang sama.',
  );
  y += 2;
  callout(
    'Jangan bagikan URL dan token milikmu',
    'Setiap orang harus membuat spreadsheet dan menjalankan setupDatabase-nya sendiri. Bila mereka memakai URL '
      + 'dan token milikmu, seluruh data mereka akan tertulis ke spreadsheetmu dan saling menimpa.',
    C.dangerBg,
    C.danger,
  );

  /* ---------------- Nomor halaman ---------------- */
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    setDraw(C.border);
    doc.setLineWidth(0.2);
    doc.line(M.left, PAGE.h - 12, PAGE.w - M.right, PAGE.h - 12);
    font('normal', 7.5);
    setText(C.faint);
    doc.text('Duitku - Panduan Integrasi Google Spreadsheet', M.left, PAGE.h - 7.5);
    const label = `Halaman ${p} dari ${total}`;
    doc.text(label, PAGE.w - M.right - doc.getTextWidth(label), PAGE.h - 7.5);
  }

  return { blob: doc.output('blob'), fileName: 'Duitku-Panduan-Integrasi-Spreadsheet.pdf' };
}

/** Membuat panduan lalu memicu unduhan di browser. */
export async function downloadGuidePdf(): Promise<string> {
  const { blob, fileName } = await buildGuidePdf();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}
