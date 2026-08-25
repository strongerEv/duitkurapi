/**
 * ============================================================================
 *  Duitku  ->  Google Sheets
 *  Jembatan sinkronisasi berbasis Google Apps Script.
 * ============================================================================
 *
 *  CARA PEMASANGAN
 *  ---------------
 *  1. Buat Google Spreadsheet baru (boleh kosong, biarkan privat).
 *  2. Menu  Extensions -> Apps Script.
 *  3. Hapus isi file Code.gs bawaan, lalu tempel SELURUH isi berkas ini.
 *  4. Ganti nilai TOKEN di bawah dengan kata sandi rahasia buatan Anda.
 *     (Di aplikasi Duitku ada tombol untuk membuatkan token acak.)
 *  5. Simpan, lalu klik  Deploy -> New deployment.
 *       - Select type ......... Web app
 *       - Description ......... Duitku Sync
 *       - Execute as .......... Me (email Anda)
 *       - Who has access ...... Anyone           <-- WAJIB "Anyone",
 *                                                    bukan "Anyone with Google account"
 *  6. Klik Deploy, setujui izin yang diminta Google.
 *  7. Salin "Web app URL" yang berakhiran /exec
 *  8. Buka Duitku -> Pengaturan -> Hubungkan ke Spreadsheet,
 *     tempel URL dan token tadi, lalu tekan "Tes Koneksi".
 *
 *  CATATAN KEAMANAN
 *  ----------------
 *  - Spreadsheet Anda TETAP PRIVAT. Yang bisa diakses publik hanyalah URL
 *    script ini, dan setiap permintaan wajib menyertakan TOKEN yang benar.
 *  - Perlakukan URL + token seperti kata sandi. Siapa pun yang memiliki
 *    keduanya bisa menulis ke spreadsheet Anda.
 *  - Kalau token bocor: ganti nilai TOKEN di bawah, lalu
 *    Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy.
 *
 *  SETIAP SINKRONISASI AKAN MENIMPA ISI SHEET YANG DIKELOLA DUITKU
 *  (Ringkasan, Transaksi, Hutang, Dompet, Anggaran). Sheet lain buatan Anda
 *  sendiri tidak akan disentuh, jadi aman untuk menaruh pivot/grafik di sana.
 * ============================================================================
 */

/** Ganti dengan token rahasia Anda sendiri. Minimal 12 karakter. */
var TOKEN = 'GANTI_DENGAN_TOKEN_RAHASIA_ANDA';

/** Versi kontrak data yang didukung script ini. */
var SUPPORTED_VERSION = 1;

/* ========================================================================== */
/*  Titik masuk                                                               */
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
      message: 'Jembatan Duitku aktif. Sambungkan dari aplikasi Duitku.',
    });
  }

  if (params.action === 'ping') {
    if (!isTokenValid(params.token)) {
      return jsonOut({ ok: false, error: 'TOKEN_SALAH', message: 'Token tidak cocok.' });
    }
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

  if (!isTokenValid(payload.token)) {
    return jsonOut({ ok: false, error: 'TOKEN_SALAH', message: 'Token tidak cocok.' });
  }

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
      message: 'Versi aplikasi lebih baru dari script. Perbarui Code.gs di Apps Script.',
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

    // Sheet bawaan "Sheet1"/"Sheet 1" yang masih kosong ikut dibersihkan
    // supaya spreadsheet terlihat rapi setelah sinkronisasi pertama.
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

/** Membuang sheet bawaan kosong setelah sinkronisasi pertama. */
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
/*  Pembantu                                                                  */
/* ========================================================================== */

/**
 * Membandingkan token dengan waktu tetap, supaya tidak bisa ditebak
 * karakter demi karakter dari selisih waktu balasan.
 */
function isTokenValid(candidate) {
  var expected = String(TOKEN || '');
  var given = String(candidate || '');
  if (expected === 'GANTI_DENGAN_TOKEN_RAHASIA_ANDA') return false;
  if (expected.length === 0 || given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Bisa dijalankan manual dari editor Apps Script (tombol Run) untuk
 * memastikan script punya izin dan token sudah diganti.
 */
function ujiPemasangan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!isTokenValid(TOKEN)) {
    Logger.log('GAGAL: TOKEN belum diganti atau kosong. Ubah nilai variabel TOKEN di baris atas.');
    return;
  }
  Logger.log('OK. Spreadsheet: ' + ss.getName());
  Logger.log('Token sudah diisi (' + String(TOKEN).length + ' karakter).');
  Logger.log('Langkah berikutnya: Deploy -> New deployment -> Web app -> Who has access: Anyone.');
}
