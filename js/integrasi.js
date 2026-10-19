/**
 * integrasi.js — Migrasi Data (gas-migrasi-database: sumber hanya-baca, dry-run, upsert,
 * aman diulang, preset e-SURAT v4.5) dan Integrasi & Sistem (TTE PSrE, AI Gemini,
 * Verifikasi Pusat, backup manual, status pemasangan).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon, A = window.Admin;

  // ===========================================================================
  // MIGRASI DATA
  // ===========================================================================
  A.daftar('migrasi', {
    judul: 'Migrasi Data', tanpaRenderUlang: true,
    render: function (el, ctx) {
      var st = ctx.state;
      el.innerHTML = '<div class="mg-root">' + A.kepala({ overline: 'Sistem', judul: 'Migrasi Data', desk: 'Pindahkan data dari spreadsheet app lama (mis. e-SURAT v4.5) ke SURAT DIGITAL. Sumber hanya dibaca, data tujuan tidak pernah dihapus, aman dijalankan berulang (upsert berdasarkan kunci alami).' }) +
        '<div class="card card-pad" style="margin-bottom:16px"><div class="baris" style="align-items:flex-end"><div class="field" style="flex:1;min-width:260px"><label>URL / ID spreadsheet sumber</label><input class="input mono" id="mg-url" value="' + esc(st.url || '') + '" placeholder="https://docs.google.com/spreadsheets/d/…"></div>' +
        '<label class="cek"><input type="checkbox" id="mg-preset"' + (st.preset !== false ? ' checked' : '') + '> Preset e-SURAT v4.5</label><button class="btn btn-primary" id="mg-baca" data-muat="Membaca…">' + ik('search', 'sm') + 'Baca Sumber</button></div>' +
        '<div class="bantu" style="margin-top:8px">Akun pemilik skrip harus punya akses baca ke spreadsheet sumber. Hash sandi lama tidak pernah dipindahkan — pengguna masuk dengan Google.</div></div>' +
        '<div id="mg-isi">' + (st.info ? '' : '<div class="card">' + U.kosong('Tempel URL spreadsheet sumber lalu klik Baca Sumber.', 'database') + '</div>') + '</div></div>';
      var R = el.querySelector('.mg-root');
      R.querySelector('#mg-baca').addEventListener('click', function () {
        st.url = R.querySelector('#mg-url').value.trim(); st.preset = R.querySelector('#mg-preset').checked;
        if (!st.url) { U.toast('Isi URL spreadsheet sumber.', 'galat'); return; }
        U.sibuk(this, function () { return API.panggil('migrasiInfo', { url: st.url, preset: st.preset }, { timeout: 120000 }).then(function (r) { if (!r.success) { U.toast(r.message, 'galat'); return; } st.info = r.data; st.laporan = null; gambar(R.querySelector('#mg-isi'), st); }); });
      });
      if (st.info) gambar(R.querySelector('#mg-isi'), st);
    }
  });

  function gambar(box, st) {
    var info = st.info, tujuan = info.tujuanTersedia || [];
    box.innerHTML = '<div class="card" style="margin-bottom:16px"><div class="card-head"><div><h3>' + ik('database', 'sm') + ' ' + esc(info.sumber.nama) + '</h3><div class="mono kecil muted">' + esc(info.sumber.id) + '</div></div><span class="badge b-netral tanpa-titik">' + info.sheets.length + ' sheet</span></div>' +
      '<div class="tabel-wrap"><table class="tabel responsif"><thead><tr><th>Bawa</th><th>Sheet sumber</th><th>Baris</th><th>Tujuan</th><th>Pemetaan kolom</th></tr></thead><tbody>' + info.sheets.map(function (s, i) {
        var peta = s.peta || {}, n = Object.keys(peta).filter(function (k) { return peta[k]; }).length;
        return '<tr data-i="' + i + '"><td data-l="Bawa"><input type="checkbox" data-aktif' + (s.tujuan && s.aktif !== false ? ' checked' : '') + (s.tujuan ? '' : ' disabled') + ' aria-label="Bawa sheet"></td><td data-l="Sheet"><b style="font-weight:600">' + esc(s.nama) + '</b>' + (s.catatan ? '<div class="kecil muted">' + esc(s.catatan) + '</div>' : '') + '</td><td data-l="Baris" class="mono">' + U.angka(s.baris) + '</td>' +
          '<td data-l="Tujuan"><select class="select" data-tujuan style="min-height:34px"><option value="">— tidak dibawa —</option>' + tujuan.map(function (t) { return '<option' + (t === s.tujuan ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></td>' +
          '<td data-l="Pemetaan">' + (s.tujuan ? '<button class="btn btn-ghost btn-xs" data-peta>' + ik('sliders', 'sm') + (s.peta ? n + '/' + s.header.length + ' kolom' : 'otomatis') + '</button>' : '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="card-foot" style="justify-content:space-between"><label class="cek"><input type="checkbox" id="mg-timpa"' + (st.timpa ? ' checked' : '') + '> Timpa nilai yang sudah ada di tujuan (bawaan: hanya mengisi yang baru)</label><div class="baris"><button class="btn btn-outline" id="mg-dry" data-muat="Mensimulasikan…">' + ik('eye', 'sm') + 'Dry-run (simulasi)</button><button class="btn btn-gold" id="mg-jalan" data-muat="Memigrasikan…"' + (st.laporan && st.laporan.dryRun ? '' : ' disabled') + '>' + ik('play', 'sm') + 'Jalankan Migrasi</button></div></div></div>' +
      '<div id="mg-lap"></div>';
    U.$$('tr[data-i]', box).forEach(function (tr) {
      var s = info.sheets[Number(tr.dataset.i)];
      tr.querySelector('[data-tujuan]').addEventListener('change', function () { s.tujuan = this.value; s.peta = null; s.aktif = !!s.tujuan; st.laporan = null; gambarUlang(); });
      tr.querySelector('[data-aktif]').addEventListener('change', function () { s.aktif = this.checked; st.laporan = null; box.querySelector('#mg-jalan').disabled = true; });
      var pb = tr.querySelector('[data-peta]'); if (pb) pb.addEventListener('click', function () { aturPeta(s, gambarUlang); });
    });
    function gambarUlang() { gambar(box, st); }
    box.querySelector('#mg-timpa').addEventListener('change', function () { st.timpa = this.checked; st.laporan = null; box.querySelector('#mg-jalan').disabled = true; });
    var rencana = function () { return info.sheets.filter(function (s) { return s.tujuan && s.aktif !== false; }).map(function (s) { return { sumber: s.nama, tujuan: s.tujuan, peta: s.peta || {}, aktif: true }; }); };
    var jalankan = function (dry, btn) {
      var rc = rencana();
      if (!rc.length) { U.toast('Pilih minimal satu sheet untuk dibawa.', 'galat'); return; }
      U.sibuk(btn, function () { return API.panggil('migrasiJalankan', { url: st.url, rencana: rc, dryRun: dry, timpa: !!st.timpa, preset: st.preset !== false }, { timeout: 330000 }).then(function (r) {
        if (!r.success) { U.toast(r.message, 'galat'); return; }
        st.laporan = r.data; laporan(box.querySelector('#mg-lap'), r.data);
        box.querySelector('#mg-jalan').disabled = !dry;
        if (!dry) { U.toast('Migrasi selesai. Memuat ulang data panel…', 'ok'); A._segarAwal = false; API.panggil('bootstrapAdmin', {}).then(function (b) { if (b.success) A.terapkan(b.data); }); }
      }); });
    };
    box.querySelector('#mg-dry').addEventListener('click', function () { jalankan(true, this); });
    box.querySelector('#mg-jalan').addEventListener('click', function () { var b = this; U.konfirmasi('Jalankan migrasi sekarang?', 'Data ditulis ke database SURAT DIGITAL sesuai hasil dry-run. Sumber tidak diubah. Aman diulang bila ada yang terlewat.', { ya: 'Ya, migrasikan' }).then(function (y) { if (y) jalankan(false, b); }); });
    if (st.laporan) laporan(box.querySelector('#mg-lap'), st.laporan);
  }

  function laporan(box, d) {
    var rp = d.report || {}, keys = Object.keys(rp), tot = { source: 0, inserted: 0, updated: 0, skipped: 0 };
    keys.forEach(function (k) { Object.keys(tot).forEach(function (x) { tot[x] += rp[k][x] || 0; }); });
    box.innerHTML = '<div class="card"><div class="card-head"><h3>' + (d.dryRun ? ik('eye', 'sm') + ' Hasil Dry-run (belum ada data ditulis)' : ik('checkCircle', 'sm') + ' Hasil Migrasi') + '</h3><span class="badge ' + (d.dryRun ? 'b-diproses' : 'b-terbit') + '">' + (d.dryRun ? 'simulasi' : 'selesai') + '</span></div>' +
      '<div class="tabel-wrap"><table class="tabel responsif"><thead><tr><th>Tujuan</th><th>Baris sumber</th><th>Baru</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' + keys.map(function (k) { var x = rp[k]; return '<tr><td data-l="Tujuan" class="mono">' + esc(k) + '</td><td data-l="Sumber">' + U.angka(x.source) + '</td><td data-l="Baru" style="color:var(--ok);font-weight:700">+' + U.angka(x.inserted) + '</td><td data-l="Diperbarui">' + U.angka(x.updated) + '</td><td data-l="Dilewati" class="muted">' + U.angka(x.skipped) + '</td></tr>'; }).join('') +
      '<tr><td data-l="Total"><b>Total</b></td><td data-l="Sumber"><b>' + U.angka(tot.source) + '</b></td><td data-l="Baru"><b>+' + U.angka(tot.inserted) + '</b></td><td data-l="Diperbarui"><b>' + U.angka(tot.updated) + '</b></td><td data-l="Dilewati"><b>' + U.angka(tot.skipped) + '</b></td></tr></tbody></table></div>' +
      ((d.warnings || []).length ? '<div class="card-body"><div class="pemberitahuan warn">' + ik('alert') + '<div>' + d.warnings.slice(0, 30).map(esc).join('<br>') + '</div></div></div>' : '') + '</div>';
  }

  function aturPeta(s, selesai) {
    var peta = Object.assign({}, s.peta || {});
    var m = U.modal({ judul: 'Pemetaan kolom — ' + s.nama, sub: 'Tujuan: ' + s.tujuan + '. Kolom tanpa padanan tidak dibawa.', lebar: 'lebar', ikon: ik('sliders'),
      isi: '<div class="tabel-wrap"><table class="tabel"><thead><tr><th>Kolom sumber</th><th>Kolom tujuan</th></tr></thead><tbody>' + s.header.map(function (h) { return '<tr><td class="mono">' + esc(h) + '</td><td><input class="input mono" style="min-height:34px" data-h="' + esc(h) + '" value="' + esc(peta[h] || '') + '" placeholder="(tidak dibawa)"></td></tr>'; }).join('') + '</tbody></table></div><div class="bantu" style="margin-top:8px">Nama kolom tujuan harus persis seperti header sheet tujuan (camelCase), mis. <span class="mono">nomorSurat</span>, <span class="mono">perihal</span>.</div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" data-ok>Terapkan</button>' });
    m.$('[data-ok]').addEventListener('click', function () {
      var p = {}; U.$$('[data-h]', m.el).forEach(function (i) { var v = i.value.trim(); if (v && v !== 'passwordHash') p[i.dataset.h] = v; });
      s.peta = p; m.tutup(); selesai();
    });
  }

  // ===========================================================================
  // INTEGRASI & SISTEM
  // ===========================================================================
  A.daftar('integrasi', {
    judul: 'Integrasi & Sistem', tanpaRenderUlang: true,
    render: function (el) {
      el.innerHTML = '<div class="int-root">' + A.kepala({ overline: 'Sistem', judul: 'Integrasi & Sistem', desk: 'Integrasi opsional. Semua kunci API disimpan di Script Properties dan hanya tampil tersamar.' }) + '<div id="int-isi">' + U.skel(4, 90) + '</div></div>';
      var box = el.querySelector('#int-isi');
      Promise.all([API.panggil('statusKeamanan', {}), API.panggil('ping', {}, { senyap: true })]).then(function (rs) {
        if (!document.body.contains(box)) return;
        var rh = rs[0].success ? rs[0].data.rahasia : {}, ping = rs[1].success ? rs[1].data : {};
        var status = function (k) { var x = rh[k] || {}; return x.ada ? '<span class="badge b-terbit tanpa-titik">' + ik('check', 'sm') + ' ' + esc(x.samar) + '</span>' : '<span class="badge b-draf tanpa-titik">kosong</span>'; };
        box.innerHTML = '<div class="grid-2" style="margin-bottom:18px">' +
          '<div class="card"><div class="card-head"><h3>' + ik('database', 'sm') + ' Status Pemasangan</h3>' + (ping.siap ? '<span class="badge b-terbit">siap</span>' : '<span class="badge b-ditolak">belum dipasang</span>') + '</div><div class="card-body tumpuk" style="gap:8px;font-size:13px">' +
          '<div class="antara"><span>Versi backend</span><b class="mono">' + esc(ping.v || '-') + '</b></div><div class="antara"><span>Versi frontend</span><b class="mono">' + esc((window.APP_CONFIG || {}).VERSI || '-') + '</b></div>' +
          '<div class="antara"><span>Waktu server</span><b class="mono">' + esc(U.tglJam(ping.waktu)) + '</b></div><div class="antara"><span>Alamat aplikasi</span><b class="mono kecil" style="word-break:break-all;text-align:right">' + esc(A.cfg('APP_URL', '-')) + '</b></div>' +
          '<div class="garis-tipis"></div><div class="baris"><button class="btn btn-soft btn-sm" id="int-backup" data-muat="Mencadangkan…">' + ik('save', 'sm') + 'Backup Database Sekarang</button><button class="btn btn-ghost btn-sm" id="int-perf">' + ik('zap', 'sm') + 'Uji Kecepatan</button></div><div id="int-hasil"></div></div></div>' +
          '<div class="card"><div class="card-head"><h3>' + ik('sparkles', 'sm') + ' AI Notulensi (Gemini)</h3>' + (A.cfgBool('BA_AI_AKTIF', false) ? '<span class="badge b-terbit">aktif</span>' : '<span class="badge b-draf">mati</span>') + '</div><div class="card-body tumpuk" style="gap:12px">' +
          '<div class="antara kecil"><span>GEMINI_API_KEY</span>' + status('GEMINI_API_KEY') + '</div><div id="int-ai"></div></div></div></div>' +
          '<div class="card" style="margin-bottom:18px"><div class="card-head"><div><h3>' + ik('shield', 'sm') + ' TTE Resmi (PSrE)</h3><div class="muted kecil">Adapter umum (bearer/apikey/basic/oauth2). Mode simulasi untuk uji tanpa menghubungi penyedia.</div></div>' + (A.cfgBool('TTE_AKTIF', false) ? '<span class="badge b-terbit">aktif</span>' : '<span class="badge b-draf">mati</span>') + '</div><div class="card-body tumpuk" style="gap:12px">' +
          '<div class="baris kecil" style="gap:18px"><span>TTE_API_KEY ' + status('TTE_API_KEY') + '</span><span>TTE_CLIENT_SECRET ' + status('TTE_CLIENT_SECRET') + '</span><a href="#/admin/pengaturan/keamanan">' + ik('key', 'sm') + ' ubah kunci</a></div><div id="int-tte"></div>' +
          '<div class="baris"><button class="btn btn-soft btn-sm" id="int-tte-tes" data-muat="Menguji…">' + ik('zap', 'sm') + 'Tes Koneksi</button><button class="btn btn-soft btn-sm" id="int-tte-sinkron" data-muat="Sinkron…">' + ik('refresh', 'sm') + 'Sinkron Status Asinkron</button></div></div></div>' +
          '<div class="card"><div class="card-head"><div><h3>' + ik('globe', 'sm') + ' Verifikasi Pusat (opsional)</h3><div class="muted kecil">Laporkan ringkasan dokumen terbit/ditarik ke server verifikasi pusat lintas aplikasi (ditandatangani HMAC).</div></div></div><div class="card-body tumpuk" style="gap:8px">' +
          '<div class="antara kecil"><span>VP_URL</span>' + status('VP_URL') + '</div><div class="antara kecil"><span>VP_KODE_APP</span>' + status('VP_KODE_APP') + '</div><div class="antara kecil"><span>VP_KUNCI</span>' + status('VP_KUNCI') + '</div>' +
          '<a class="btn btn-soft btn-sm" style="align-self:flex-start" href="#/admin/pengaturan/keamanan">' + ik('key', 'sm') + 'Atur di Keamanan & Rahasia</a></div></div>';
        var ai = document.createElement('div'); box.querySelector('#int-ai').appendChild(ai);
        formRingkas(ai, [{ k: 'BA_AI_AKTIF', l: 'Aktifkan rekam & transkripsi Berita Acara', tipe: 'saklar' }, { k: 'GEMINI_MODEL', l: 'Model', tipe: 'pilihan', opsi: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'] }, { k: 'GEMINI_MODEL_KUSTOM', l: 'Model kustom (opsional)' }]);
        formRingkas(box.querySelector('#int-tte'), [{ k: 'TTE_AKTIF', l: 'Aktifkan TTE resmi', tipe: 'saklar' }, { k: 'TTE_NAMA_PENYEDIA', l: 'Nama PSrE' }, { k: 'TTE_MODE', l: 'Mode', tipe: 'pilihan', opsi: ['simulasi', 'sinkron', 'asinkron'] }, { k: 'TTE_AUTH', l: 'Autentikasi', tipe: 'pilihan', opsi: ['bearer', 'apikey', 'basic', 'oauth2'] },
          { k: 'TTE_BASE_URL', l: 'URL dasar API', mono: true }, { k: 'TTE_PATH_SIGN', l: 'Path tanda tangan', mono: true }, { k: 'TTE_PATH_STATUS', l: 'Path status', mono: true }, { k: 'TTE_PATH_USER', l: 'Path cek akun', mono: true }, { k: 'TTE_CLIENT_ID', l: 'Client ID (oauth2)', mono: true }, { k: 'TTE_TOKEN_URL', l: 'URL token (oauth2)', mono: true }]);
        var hasil = box.querySelector('#int-hasil');
        box.querySelector('#int-backup').addEventListener('click', function () { U.sibuk(this, function () { return API.panggil('backupManual', {}, { timeout: 180000 }).then(function (r) { if (U.hasil(r)) hasil.innerHTML = '<div class="pemberitahuan ok" style="margin-top:8px">' + ik('checkCircle') + '<div>' + esc(r.data.nama) + ' — <a href="' + esc(r.data.url) + '" target="_blank" rel="noopener">buka</a></div></div>'; }); }); });
        box.querySelector('#int-perf').addEventListener('click', function () {
          var b = this, t = [];
          U.sibuk(b, async function () {
            for (var i = 0; i < 3; i++) { var t0 = performance.now(), r = await API.panggil('ping', { i: i }, { senyap: true }); t.push({ total: Math.round(performance.now() - t0), server: r.ms || 0 }); }
            hasil.innerHTML = '<div class="blok-abu" style="margin-top:8px;font-size:13px">' + t.map(function (x, i) { return '<div class="antara"><span>Ping ' + (i + 1) + '</span><span class="mono">' + x.total + ' ms (server ' + x.server + ' ms)</span></div>'; }).join('') + '<div class="muted kecil" style="margin-top:6px">Selisih total−server = jaringan + antre Google. Lihat Console: <span class="mono">Perf.table()</span>.</div></div>';
          });
        });
        box.querySelector('#int-tte-tes').addEventListener('click', function () { U.sibuk(this, function () { return API.panggil('tteTesKoneksi', {}, { timeout: 60000 }).then(function (r) { U.hasil(r); }); }); });
        box.querySelector('#int-tte-sinkron').addEventListener('click', function () { U.sibuk(this, function () { return API.panggil('tteSinkronStatus', {}, { timeout: 120000 }).then(function (r) { U.hasil(r); }); }); });
      });
    }
  });

  function formRingkas(box, fields) {
    box.innerHTML = '<div class="grid-form">' + fields.map(function (f) {
      var v = A.cfg(f.k, '');
      if (f.tipe === 'saklar') return '<label class="saklar penuh"><input type="checkbox" data-cf="' + f.k + '" data-tipe="saklar"' + (String(v) === 'true' ? ' checked' : '') + '><span class="jalur"></span>' + esc(f.l) + '</label>';
      if (f.tipe === 'pilihan') return '<div class="field"><label>' + esc(f.l) + '</label><select class="select" data-cf="' + f.k + '">' + f.opsi.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>';
      return '<div class="field"><label>' + esc(f.l) + '</label><input class="input' + (f.mono ? ' mono' : '') + '" data-cf="' + f.k + '" value="' + esc(v) + '"></div>';
    }).join('') + '</div><div class="baris" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-primary btn-sm" data-simpan data-muat="Menyimpan…">' + ik('save', 'sm') + 'Simpan</button></div>';
    box.querySelector('[data-simpan]').addEventListener('click', function () {
      var c = {};
      U.$$('[data-cf]', box).forEach(function (i) { var nv = i.dataset.tipe === 'saklar' ? String(i.checked) : i.value.trim(); if (nv !== String(A.cfg(i.dataset.cf, i.dataset.tipe === 'saklar' ? 'false' : ''))) c[i.dataset.cf] = nv; });
      if (!Object.keys(c).length) { U.toast('Tidak ada perubahan.', 'info'); return; }
      U.sibuk(this, function () { return API.panggil('simpanConfig', { config: c }).then(function (r) { if (U.hasil(r)) A.setConfig(r.data.config); }); });
    });
  }
})();
