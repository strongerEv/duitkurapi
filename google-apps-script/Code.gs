/**
 * ============================================================================
 *  Duitku  ->  Google Sheets
 *  Jembatan sinkronisasi berbasis Google Apps Script.
 * ============================================================================
 *
 *  TIDAK ADA YANG PERLU DIUBAH DI KODE INI.
 *  Token dibuat otomatis oleh fungsi setupDatabase() dan disimpan aman
 *  di Script Properties, bukan ditulis di dalam kode.
 *
 *  CARA PEMASANGAN
 *  ---------------
 *  1. Buat Google Spreadsheet baru. Biarkan PRIVAT, jangan dibagikan ke
 *     publik — isinya memuat nama dan nomor WhatsApp orang lain.
 *
 *  2. Menu  Extensions -> Apps Script.
 *
 *  3. Hapus isi file Code.gs bawaan, lalu tempel SELURUH isi berkas ini.
 *     Simpan (ikon disket atau Ctrl+S).
 *
 *  4. Di bagian atas editor ada kotak pilihan fungsi. Pilih  setupDatabase
 *     lalu klik  Run.
 *       - Google akan meminta izin. Klik Review permissions -> pilih akun Anda.
 *       - Muncul peringatan "Google hasn't verified this app". Itu wajar,
 *         karena script ini Anda tulis sendiri. Klik  Advanced  ->
 *         "Go to <nama proyek> (unsafe)"  ->  Allow.
 *       - Setelah selesai, TOKEN ANDA akan ditampilkan di kotak Execution log
 *         di bagian bawah layar. Salin token itu.
 *
 *  5. Klik  Deploy -> New deployment -> pilih tipe  Web app.
 *       - Execute as ........ Me (email Anda)
 *       - Who has access .... Anyone      <-- WAJIB "Anyone",
 *                                             bukan "Anyone with Google account"
 *     Klik Deploy, lalu salin "Web app URL" yang berakhiran /exec
 *
 *  6. Buka Duitku -> Pengaturan -> Hubungkan ke Spreadsheet.
 *     Tempel URL dan token tadi, lalu tekan "Tes Koneksi".
 *
 *  MELIHAT TOKEN LAGI DI KEMUDIAN HARI
 *  -----------------------------------
 *  Dari spreadsheet, gunakan menu  Duitku -> Lihat Token.
 *  (Menu itu muncul setelah spreadsheet dimuat ulang sekali.)
 *
 *  MENGGANTI TOKEN
 *  ---------------
 *  Menu  Duitku -> Buat Token Baru. Token lama langsung tidak berlaku.
 *  Anda TIDAK perlu deploy ulang — cukup perbarui token di aplikasi Duitku.
 *
 *  CATATAN KEAMANAN
 *  ----------------
 *  Spreadsheet Anda tetap privat. Yang bisa diakses dari luar hanyalah URL
 *  script ini, dan setiap permintaan wajib menyertakan token yang benar.
 *  Perlakukan URL + token seperti kata sandi.
 *
 *  Setiap sinkronisasi menimpa isi sheet yang dikelola Duitku
 *  (Ringkasan, Transaksi, Hutang, Dompet, Anggaran). Sheet lain buatan Anda
 *  sendiri tidak disentuh, jadi aman untuk menaruh pivot atau grafik di sana.
 * ============================================================================
 */

/** Kunci penyimpanan token di Script Properties. */
var TOKEN_KEY = 'DUITKU_TOKEN';

/** Versi kontrak data yang didukung script ini. */
var SUPPORTED_VERSION = 1;

/** Sheet yang dikelola Duitku dan akan ditimpa setiap sinkronisasi. */
var SHEET_NAMES = ['Ringkasan', 'Transaksi', 'Hutang', 'Dompet', 'Anggaran'];

/* ========================================================================== */
/*  Pemasangan                                                                */
/* ========================================================================== */

/**
 * Jalankan sekali dari editor Apps Script (pilih fungsi ini lalu klik Run).
 *
 * Fungsi ini membuatkan token acak, menyiapkan sheet-sheet kosong, dan
 * menampilkan token yang harus Anda tempel di aplikasi Duitku.
 * Aman dijalankan berulang kali: token yang sudah ada tidak akan diganti.
 */
function setupDatabase() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty(TOKEN_KEY);
  var tokenBaru = false;

  if (!token) {
    token = buatTokenAcak();
    props.setProperty(TOKEN_KEY, token);
    tokenBaru = true;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dibuat = siapkanSheetKosong(ss);

  var pesan =
    (tokenBaru ? 'Pemasangan selesai. Token baru sudah dibuat.' : 'Token yang sudah ada tetap dipakai.') +
    '\n\n=======================================\n' +
    ' TOKEN ANDA:\n\n' +
    ' ' + token + '\n' +
    '=======================================\n\n' +
    'Salin token di atas, lalu tempel di aplikasi Duitku pada\n' +
    'Pengaturan -> Hubungkan ke Spreadsheet.\n\n' +
    'Spreadsheet : ' + ss.getName() + '\n' +
    'Sheet siap  : ' + SHEET_NAMES.join(', ') +
    (dibuat.length ? '\n Baru dibuat : ' + dibuat.join(', ') : '') +
    '\n\nLangkah berikutnya:\n' +
    'Deploy -> New deployment -> Web app\n' +
    '  Execute as ...... Me\n' +
    '  Who has access .. Anyone\n' +
    'Lalu salin Web app URL yang berakhiran /exec.';

  Logger.log(pesan);
  tampilkanDialog('Duitku siap dipakai', pesan);
  return token;
}

/** Menampilkan token yang tersimpan, lewat menu Duitku di spreadsheet. */
function lihatToken() {
  var token = tokenTersimpan();
  if (!token) {
    tampilkanDialog('Belum disiapkan', 'Token belum ada.\n\nJalankan dulu fungsi setupDatabase() dari editor Apps Script, atau pilih menu Duitku -> Siapkan Sheet.');
    return;
  }
  tampilkanDialog(
    'Token Duitku',
    'Token Anda:\n\n' + token + '\n\nTempel token ini di aplikasi Duitku pada\nPengaturan -> Hubungkan ke Spreadsheet.',
  );
}

/**
 * Membuat token baru dan membatalkan yang lama.
 * Tidak perlu deploy ulang, cukup perbarui token di aplikasi Duitku.
 */
function buatTokenBaru() {
  var token = buatTokenAcak();
  PropertiesService.getScriptProperties().setProperty(TOKEN_KEY, token);
  var pesan =
    'Token baru:\n\n' + token + '\n\n' +
    'Token lama sudah tidak berlaku. Perbarui token di aplikasi Duitku\n' +
    'supaya sinkronisasi bisa berjalan lagi.\n\n' +
    'Anda tidak perlu melakukan deploy ulang.';
  Logger.log(pesan);
  tampilkanDialog('Token diperbarui', pesan);
  return token;
}

/** Menambahkan menu "Duitku" di spreadsheet saat dibuka. */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Duitku')
      .addItem('Siapkan Sheet', 'setupDatabase')
      .addItem('Lihat Token', 'lihatToken')
      .addSeparator()
      .addItem('Buat Token Baru', 'buatTokenBaru')
      .addToUi();
  } catch (err) {
    // Spreadsheet dibuka tanpa antarmuka (misalnya lewat pemicu terjadwal).
  }
}

/* ========================================================================== */
/*  Titik masuk web app                                                       */
/* ========================================================================== */

/**
 * Dipanggil saat URL dibuka lewat browser atau saat aplikasi melakukan
 * tes koneksi. Tidak pernah mengembalikan isi spreadsheet.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};

  if (!params.action) {
    return jsonOut({
      ok: true,
      app: 'duitku-sheets-bridge',
      version: SUPPORTED_VERSION,
      siap: Boolean(tokenTersimpan()),
      message: tokenTersimpan()
        ? 'Jembatan Duitku aktif. Sambungkan dari aplikasi Duitku.'
        : 'Script terpasang, tetapi setupDatabase() belum dijalankan.',
    });
  }

  if (params.action === 'ping') {
    var cek = periksaToken(params.token);
    if (!cek.ok) return jsonOut(cek);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonOut({
      ok: true,
      action: 'ping',
      version: SUPPORTED_VERSION,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      timeZone: ss.getSpreadsheetTimeZone(),
      message: 'Koneksi berhasil.',
    });
  }

  return jsonOut({ ok: false, error: 'AKSI_TIDAK_DIKENAL', message: 'Aksi tidak dikenal: ' + params.action });
}

/**
 * Menerima kiriman data dari Duitku.
 *
 * Aplikasi mengirim JSON dengan Content-Type `text/plain` supaya browser
 * tidak melakukan preflight OPTIONS — Apps Script tidak bisa menjawab
 * preflight, jadi cara inilah yang membuat sinkronisasi berjalan dari browser.
 */
function doPost(e) {
  var payload;
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut({ ok: false, error: 'JSON_RUSAK', message: 'Isi kiriman bukan JSON yang sah.' });
  }

  var cek = periksaToken(payload.token);
  if (!cek.ok) return jsonOut(cek);

  if (payload.action === 'ping') {
    return jsonOut({ ok: true, action: 'ping', message: 'Koneksi berhasil.' });
  }

  if (payload.action !== 'sync') {
    return jsonOut({ ok: false, error: 'AKSI_TIDAK_DIKENAL', message: 'Aksi tidak dikenal.' });
  }

  if (payload.version && payload.version > SUPPORTED_VERSION) {
    return jsonOut({
      ok: false,
      error: 'VERSI_TIDAK_COCOK',
      message: 'Versi aplikasi lebih baru dari script. Tempel ulang Code.gs versi terbaru, lalu deploy ulang.',
    });
  }

  // Kunci agar dua sinkronisasi berbarengan tidak saling menimpa.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return jsonOut({ ok: false, error: 'SIBUK', message: 'Sinkronisasi lain sedang berjalan.' });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = payload.sheets || [];
    var written = [];

    for (var i = 0; i < sheets.length; i++) {
      var spec = sheets[i];
      if (!spec || !spec.name || !spec.columns) continue;
      writeSheet(ss, spec, payload);
      written.push({ name: spec.name, rows: (spec.rows || []).length });
    }

    removeEmptyDefaultSheet(ss);

    return jsonOut({
      ok: true,
      action: 'sync',
      syncedAt: new Date().toISOString(),
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      sheets: written,
      message: 'Data berhasil disimpan ke spreadsheet.',
    });
  } catch (err) {
    return jsonOut({ ok: false, error: 'GAGAL_MENULIS', message: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/* ========================================================================== */
/*  Penulisan sheet                                                           */
/* ========================================================================== */

/**
 * Menulis satu sheet: judul kolom, isi baris, dan pemformatan.
 * Sheet dibuat otomatis bila belum ada, dan isinya ditimpa setiap sinkronisasi.
 */
function writeSheet(ss, spec, payload) {
  var sheet = ss.getSheetByName(spec.name) || ss.insertSheet(spec.name);
  var columns = spec.columns;
  var rows = spec.rows || [];
  var colCount = columns.length;
  var rowCount = rows.length;

  ensureSize(sheet, rowCount + 2, colCount);
  sheet.clearContents();
  sheet.clearFormats();

  // ---- Baris judul ----
  var headers = [];
  for (var c = 0; c < colCount; c++) headers.push(String(columns[c].header || ''));

  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setValues([headers]);
  headerRange
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground('#12996B')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 28);
  sheet.setFrozenRows(1);

  // ---- Format kolom ----
  // Sengaja dipasang SEBELUM isi ditulis. Kalau formatnya dipasang belakangan,
  // Sheets sudah terlanjur menafsirkan teks seperti "+6281234" atau "2026-08"
  // menjadi angka atau tanggal, dan itu tidak bisa dibatalkan.
  for (var f = 0; f < colCount; f++) {
    var col = columns[f];
    var formatRange = sheet.getRange(2, f + 1, Math.max(sheet.getMaxRows() - 1, 1), 1);
    var format = formatFor(col.type, payload);
    if (format) formatRange.setNumberFormat(format);
    if (col.type === 'currency' || col.type === 'number' || col.type === 'percent') {
      formatRange.setHorizontalAlignment('right');
    }
    sheet.setColumnWidth(f + 1, col.width || 120);
  }

  // ---- Isi ----
  if (rowCount > 0) {
    var values = [];
    for (var r = 0; r < rowCount; r++) {
      var src = rows[r] || [];
      var line = [];
      for (var k = 0; k < colCount; k++) {
        line.push(coerce(src[k], columns[k].type));
      }
      values.push(line);
    }
    sheet.getRange(2, 1, rowCount, colCount).setValues(values);

    // Garis selang-seling supaya mudah dibaca.
    for (var z = 0; z < rowCount; z += 2) {
      sheet.getRange(2 + z, 1, 1, colCount).setBackground('#F5FAF7');
    }
  }

  // Filter agar mudah disortir langsung dari spreadsheet.
  if (rowCount > 0 && spec.filter !== false) {
    var existing = sheet.getFilter();
    if (existing) existing.remove();
    sheet.getRange(1, 1, rowCount + 1, colCount).createFilter();
  }
}

/** Menambah baris/kolom bila sheet belum cukup besar. */
function ensureSize(sheet, needRows, needCols) {
  var maxRows = sheet.getMaxRows();
  if (needRows > maxRows) sheet.insertRowsAfter(maxRows, needRows - maxRows);
  var maxCols = sheet.getMaxColumns();
  if (needCols > maxCols) sheet.insertColumnsAfter(maxCols, needCols - maxCols);
}

/**
 * Mengubah nilai mentah dari aplikasi menjadi tipe yang dipahami Sheets.
 * Tanggal dikirim sebagai teks `YYYY-MM-DD` lalu diubah menjadi Date asli
 * supaya bisa disortir dan dipakai di rumus.
 */
function coerce(value, type) {
  if (value === null || value === undefined) return '';
  if (type === 'date') {
    var s = String(value);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return s;
  }
  if (type === 'currency' || type === 'number' || type === 'percent') {
    var n = Number(value);
    return isNaN(n) ? value : n;
  }
  return value;
}

/** Format angka Google Sheets untuk tiap tipe kolom. */
function formatFor(type, payload) {
  switch (type) {
    case 'currency':
      return (payload && payload.currencyFormat) || '#,##0';
    case 'number':
      return '#,##0';
    case 'percent':
      return '0.0%';
    case 'date':
      return 'dd/mm/yyyy';
    case 'text':
      // Format teks menjaga nomor WhatsApp dan kode bulan tetap utuh.
      return '@';
    default:
      return null;
  }
}

/** Membuat sheet kosong beserta catatan penanda, dipakai saat pemasangan. */
function siapkanSheetKosong(ss) {
  var dibuat = [];
  for (var i = 0; i < SHEET_NAMES.length; i++) {
    var name = SHEET_NAMES[i];
    if (ss.getSheetByName(name)) continue;
    var sheet = ss.insertSheet(name);
    sheet.getRange(1, 1).setValue('Menunggu sinkronisasi pertama dari aplikasi Duitku.');
    dibuat.push(name);
  }
  removeEmptyDefaultSheet(ss);
  return dibuat;
}

/** Membuang sheet bawaan kosong setelah pemasangan atau sinkronisasi pertama. */
function removeEmptyDefaultSheet(ss) {
  var all = ss.getSheets();
  if (all.length <= 1) return;
  for (var i = 0; i < all.length; i++) {
    var s = all[i];
    var name = s.getName();
    if (name !== 'Sheet1' && name !== 'Sheet 1' && name !== 'Helaian1') continue;
    if (s.getLastRow() === 0 && s.getLastColumn() === 0) {
      ss.deleteSheet(s);
      return;
    }
  }
}

/* ========================================================================== */
/*  Token                                                                     */
/* ========================================================================== */

/** Token acak berbasis UUID, cukup panjang untuk dipakai sebagai kata sandi. */
function buatTokenAcak() {
  return Utilities.getUuid().replace(/-/g, '');
}

function tokenTersimpan() {
  return PropertiesService.getScriptProperties().getProperty(TOKEN_KEY) || '';
}

/**
 * Memeriksa token kiriman dan menjelaskan penyebabnya bila gagal, supaya
 * aplikasi bisa menampilkan langkah perbaikan yang tepat.
 */
function periksaToken(candidate) {
  var expected = tokenTersimpan();
  if (!expected) {
    return {
      ok: false,
      error: 'BELUM_DISIAPKAN',
      message: 'Script belum disiapkan. Buka editor Apps Script, pilih fungsi setupDatabase, lalu klik Run untuk mendapatkan token.',
    };
  }
  if (!cocokAman(expected, String(candidate || ''))) {
    return {
      ok: false,
      error: 'TOKEN_SALAH',
      message: 'Token tidak cocok. Ambil token yang benar lewat menu Duitku -> Lihat Token pada spreadsheet Anda.',
    };
  }
  return { ok: true };
}

/**
 * Membandingkan dua teks dengan waktu tetap, supaya token tidak bisa
 * ditebak karakter demi karakter dari selisih waktu balasan.
 */
function cocokAman(expected, given) {
  if (expected.length !== given.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

/* ========================================================================== */
/*  Pembantu                                                                  */
/* ========================================================================== */

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Menampilkan kotak dialog bila tersedia; kalau tidak, cukup lewat Logger. */
function tampilkanDialog(judul, pesan) {
  try {
    SpreadsheetApp.getUi().alert(judul, pesan, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    // Dijalankan tanpa antarmuka. Isinya tetap tercatat di Execution log.
  }
}
