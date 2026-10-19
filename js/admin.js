/**
 * admin.js — kerangka panel admin: sidebar per peran + lencana, topbar (cari global,
 * lonceng, tema, profil), router halaman, data snapshot SWR (tampil instan dari peramban,
 * disegarkan di latar), penjaga sesi diam, pembantu tabel/berkas/PDF, Dashboard, dan
 * antrean Permohonan (split view).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon;

  var MENU = [
    { grup: 'UTAMA', item: [
      { k: 'dashboard', l: 'Dashboard', i: 'grid' },
      { k: 'permohonan', l: 'Permohonan Surat', i: 'filePlus', lencana: 'permohonan' },
      { k: 'email-masuk', l: 'Email Masuk', i: 'mail', lencana: 'emailMasuk' },
      { k: 'ttd', l: 'Tanda Tangan', i: 'signature', lencana: 'ttd' }] },
    { grup: 'PERSURATAN', item: [
      { k: 'surat-masuk', l: 'Surat Masuk', i: 'inbox' },
      { k: 'surat-keluar', l: 'Surat Keluar', i: 'send' },
      { k: 'sk', l: 'Surat Keputusan', i: 'stamp' },
      { k: 'berita-acara', l: 'Berita Acara', i: 'clipboard' },
      { k: 'dokumen', l: 'Dokumen & Sertifikat', i: 'certificate' },
      { k: 'mou', l: 'MOU / Kerja Sama', i: 'handshake' },
      { k: 'arsip', l: 'Arsip Penting', i: 'archive' }] },
    { grup: 'KOMUNIKASI', item: [
      { k: 'whatsapp', l: 'WhatsApp & Notifikasi', i: 'chat', peran: ['SUPER_ADMIN', 'ADMIN'] },
      { k: 'crm', l: 'CRM Kontak', i: 'users', peran: ['SUPER_ADMIN', 'ADMIN'] }] },
    { grup: 'LAPORAN', item: [
      { k: 'laporan', l: 'Laporan & Rekap', i: 'chart' },
      { k: 'log', l: 'Log Aktivitas', i: 'list', peran: ['SUPER_ADMIN'] }] },
    { grup: 'SISTEM', item: [
      { k: 'pengaturan', l: 'Pengaturan', i: 'sliders', peran: ['SUPER_ADMIN', 'ADMIN'] },
      { k: 'migrasi', l: 'Migrasi Data', i: 'database', peran: ['SUPER_ADMIN'] },
      { k: 'integrasi', l: 'Integrasi & Sistem', i: 'zap', peran: ['SUPER_ADMIN'] }] }
  ];
  var PERAN_LABEL = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', PIMPINAN: 'Pimpinan' };
  var KEY_MODUL = { permohonan: 'permohonan', 'email-masuk': 'emailMasuk', 'surat-masuk': 'suratMasuk', 'surat-keluar': 'suratKeluar', sk: 'sk', 'berita-acara': 'beritaAcara', dokumen: 'dokumen', mou: 'mou', arsip: 'arsip' };
  var MODUL_KEY = {}; Object.keys(KEY_MODUL).forEach(function (k) { MODUL_KEY[KEY_MODUL[k]] = k; });

  var A = {
    data: null, halaman: {}, state: {}, rute: null, _timer: null, _segarAwal: false, _basi: false,
    KEY_MODUL: KEY_MODUL, MODUL_KEY: MODUL_KEY, PERAN_LABEL: PERAN_LABEL,
    daftar: function (k, def) { A.halaman[k] = def; },
    user: function () { return (A.data && A.data.user) || Sesi.user() || {}; },
    peran: function () { return A.user().peran || ''; },
    sa: function () { return A.peran() === 'SUPER_ADMIN'; },
    adm: function () { return A.peran() === 'SUPER_ADMIN' || A.peran() === 'ADMIN'; },
    tulis: function () { return A.adm(); },
    cfg: function (k, def) { var c = (A.data && A.data.config) || {}; return c[k] === undefined || c[k] === '' ? def : c[k]; },
    cfgBool: function (k, def) { var v = A.cfg(k, def); return v === true || String(v).toLowerCase() === 'true'; },
    rows: function (m) { return ((A.data && A.data.modul && A.data.modul[m]) || {}).rows || []; },
    infoModul: function (m) { return (A.data && A.data.modul && A.data.modul[m]) || { rows: [], total: 0 }; },
    master: function (n) { return (A.data && A.data.master && A.data.master[n]) || []; },
    lencana: function () { return (A.data && A.data.lencana) || {}; },
    jenis: function (modulJenis, semua) { return A.master('jenisSurat').filter(function (j) { return (!modulJenis || j.modul === modulJenis) && (semua || String(j.aktif) !== 'false'); }); },
    jenisByKode: function (k) { return A.master('jenisSurat').filter(function (j) { return String(j.kode).toUpperCase() === String(k || '').toUpperCase(); })[0]; },
    pejabatAktif: function () { return A.master('pejabat').filter(function (p) { return String(p.aktif) !== 'false'; }).sort(function (a, b) { return (Number(a.urutan) || 9) - (Number(b.urutan) || 9); }); },
    pejabatById: function (id) { return A.master('pejabat').filter(function (p) { return String(p.id) === String(id); })[0]; },
    json: function (v, def) { if (v && typeof v === 'object') return v; try { return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    templateJenis: function (kode) {
      var t = A.master('templateDoc').filter(function (x) { return String(x.kodeJenis).toUpperCase() === String(kode || '').toUpperCase(); })[0];
      if (!t) return null;
      return Object.assign({}, t, { bidang: A.json(t.bidang, []), slotTtd: A.json(t.slotTtd, []), keluaran: A.json(t.keluaran, ['pdf']), placeholder: A.json(t.placeholder, []) });
    },
    idDariUrl: function (u) { return (String(u || '').match(/[-\w]{25,}/) || [])[0] || ''; }
  };
  window.Admin = A;

  // ---------------------------------------------------------------------------
  // Snapshot (stale-while-revalidate)
  // ---------------------------------------------------------------------------
  function kunciSnap() { var u = Sesi.user(); return 'snap_' + (u && u.email || 'x'); }
  A.muatLokal = function () {
    var s = Simpan.get(kunciSnap(), null);
    if (s && s.v && s.v !== ((window.APP_CONFIG || {}).VERSI || s.v)) s = null;
    A.data = s; return s;
  };
  var simpanLokal = U.debounce(function () { if (A.data) { A.data._t = A.data._t || Date.now(); Simpan.set(kunciSnap(), A.data); } }, 800);
  A.terapkan = function (snap) {
    snap._t = Date.now();
    A.data = snap;
    if (snap.user) { var s = Sesi.data || {}; s.user = Object.assign({}, s.user || {}, snap.user); Sesi.set(s); }
    simpanLokal();
  };
  A.gabung = function (r) {
    if (!A.data || !r) return false;
    var berubah = false;
    Object.keys(r.modul || {}).forEach(function (m) {
      var lama = A.data.modul[m], baru = r.modul[m];
      if (!lama || JSON.stringify(lama.rows) !== JSON.stringify(baru.rows) || lama.total !== baru.total) { A.data.modul[m] = baru; berubah = true; }
    });
    Object.keys(r.master || {}).forEach(function (n) { if (JSON.stringify(A.data.master[n]) !== JSON.stringify(r.master[n])) { A.data.master[n] = r.master[n]; berubah = true; } });
    if (r.config && JSON.stringify(r.config) !== JSON.stringify(A.data.config)) { A.data.config = r.config; berubah = true; }
    if (r.lencana) { A.data.lencana = r.lencana; gambarLencana(); }
    A.data._t = Date.now();
    simpanLokal();
    return berubah;
  };
  A.setModul = function (m, info) { if (!A.data) return; A.data.modul[m] = info; simpanLokal(); };
  A.setMaster = function (n, rows) { if (!A.data || !rows) return; A.data.master[n] = rows; simpanLokal(); };
  A.setConfig = function (c) { if (!A.data || !c) return; A.data.config = c; simpanLokal(); };
  /** Ganti/menyisipkan satu baris di daftar modul (setelah simpan) tanpa menunggu server. */
  A.upsertBaris = function (m, rec) {
    if (!A.data || !rec || !A.data.modul[m]) return;
    var rows = A.data.modul[m].rows, i = rows.findIndex(function (r) { return r.id === rec.id; });
    if (i >= 0) rows[i] = Object.assign({}, rows[i], rec); else { rows.unshift(rec); A.data.modul[m].total++; }
    A.data._dashBasi = true;
    simpanLokal();
  };
  A.hapusBaris = function (m, id) { if (!A.data || !A.data.modul[m]) return; A.data.modul[m].rows = A.data.modul[m].rows.filter(function (r) { return r.id !== id; }); A.data._dashBasi = true; simpanLokal(); };

  /** Segarkan modul tertentu dari server; render ulang bila berubah. */
  A.segarkan = function (modul, o) {
    o = o || {};
    var d = { modul: [].concat(modul || []) };
    if (o.master) d.master = [].concat(o.master);
    if (o.config) d.config = true;
    return API.panggil('refreshModul', d, { diam: !!o.diam, senyap: !!o.diam }).then(function (r) {
      if (!r.success) { if (!o.diam) U.toast(r.message, 'galat'); return false; }
      var berubah = A.gabung(r.data);
      if (berubah && o.render !== false) A.renderUlang(true);
      return berubah;
    });
  };

  // ---------------------------------------------------------------------------
  // Sesi: diam, peringatan, habis
  // ---------------------------------------------------------------------------
  var _aktif = Date.now(), _pingServer = Date.now(), _peringatan = null;
  function idleMs() { return Math.max(5, Number(A.cfg('SESI_IDLE_MENIT', 60)) || 60) * 60000; }
  function catatAktif() {
    _aktif = Date.now();
    if (_peringatan) return;
    if (Date.now() - _pingServer > 4 * 60000 && Sesi.aktif()) { _pingServer = Date.now(); API.panggil('validateSession', {}, { senyap: true }); }
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, U.debounce(catatAktif, 400), { passive: true }); });
  function periksaDiam() {
    if (!Sesi.aktif() || !A.rute) return;
    var sisa = idleMs() - (Date.now() - _aktif);
    if (sisa <= 0) { if (_peringatan) _peringatan.tutup('x'); A.sesiHabis('SESSION_IDLE', 'Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.'); return; }
    if (sisa < 120000 && !_peringatan) {
      _peringatan = U.modal({ judul: 'Sesi hampir berakhir', ikon: ik('clock'), tetap: true,
        isi: '<p style="margin:0">Tidak ada aktivitas selama beberapa waktu. Sesi akan berakhir dalam <b id="hitung-mundur">2:00</b> demi keamanan.</p>',
        kaki: '<button class="btn btn-ghost" data-keluar>Keluar</button><button class="btn btn-primary" data-lanjut>Tetap Masuk</button>',
        setelahTutup: function () { _peringatan = null; } });
      _peringatan.$('[data-lanjut]').addEventListener('click', function () { _aktif = Date.now(); _pingServer = Date.now(); API.panggil('validateSession', {}); _peringatan.tutup(); });
      _peringatan.$('[data-keluar]').addEventListener('click', function () { _peringatan.tutup(); A.keluar(); });
    }
    if (_peringatan) { var el = _peringatan.$('#hitung-mundur'); if (el) { var s = Math.max(0, Math.round(sisa / 1000)); el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); } }
  }
  setInterval(periksaDiam, 1000);

  A.sesiHabis = function (kode, pesan) {
    if (!Sesi.data) return;
    Sesi.hapus();
    berhenti();
    A.rute = null;
    U.toast(pesan || 'Sesi berakhir.', 'info');
    location.hash = '#/masuk?pesan=' + encodeURIComponent(pesan || 'Sesi berakhir. Silakan masuk kembali.');
  };
  API.onSesiHabis = function (kode, pesan) { A.sesiHabis(kode, pesan); };
  A.keluar = function (semua) {
    var p = API.panggil(semua ? 'keluarSemua' : 'logout', {});
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    p.finally(function () { Simpan.del(kunciSnap()); Sesi.hapus(); berhenti(); A.rute = null; location.hash = '#/'; U.toast(semua ? 'Semua sesi akun dicabut.' : 'Anda telah keluar.', 'ok'); });
  };
  function berhenti() { clearInterval(A._timer); A._timer = null; A._segarAwal = false; }

  // ---------------------------------------------------------------------------
  // Kerangka
  // ---------------------------------------------------------------------------
  function bolehMenu(it) { return !it.peran || it.peran.indexOf(A.peran()) >= 0; }
  function brand() {
    var b = (window.Pub && Pub.b()) || {};
    return { nama: A.cfg('APP_NAME', b.nama || 'SURAT DIGITAL'), tagline: A.cfg('APP_TAGLINE', b.tagline || ''), logo: b.logo || '' };
  }
  function shell() {
    var u = A.user(), b = brand();
    var nav = MENU.map(function (g) {
      var it = g.item.filter(bolehMenu);
      if (!it.length) return '';
      return '<div class="sb-grup">' + g.grup + '</div>' + it.map(function (x) {
        return '<a class="sb-item" href="#/admin/' + x.k + '" data-k="' + x.k + '">' + ik(x.i) + '<span>' + esc(x.l) + '</span>' + (x.lencana ? '<span class="lencana" data-lencana="' + x.lencana + '" hidden></span>' : '') + '</a>';
      }).join('');
    }).join('');
    return '<div class="adm"><aside class="sidebar" id="sidebar"><div class="sb-brand"><span class="sb-logo">' + (b.logo ? '<img src="' + esc(b.logo) + '" alt="">' : ik('shield')) + '</span>' +
      '<div style="min-width:0"><div class="sb-nama">' + esc(b.nama) + '</div><div class="sb-tag">' + esc(b.tagline) + '</div></div></div>' +
      '<nav class="sb-nav" aria-label="Menu utama">' + nav + '</nav>' +
      '<div class="sb-user"><span class="avatar">' + (u.foto ? '<img src="' + esc(u.foto) + '" alt="" referrerpolicy="no-referrer">' : esc(U.inisial(u.nama))) + '</span><div style="min-width:0"><div class="nm">' + esc(u.nama || u.email) + '</div><span class="pr">' + esc(PERAN_LABEL[u.peran] || u.peran || '') + '</span></div>' +
      '<button class="btn btn-ghost btn-sm btn-icon" id="sb-keluar" title="Keluar" aria-label="Keluar">' + ik('logout') + '</button></div></aside>' +
      '<div class="main"><header class="topbar"><button class="btn btn-ghost btn-icon hamburger" id="btn-ham" aria-label="Buka menu">' + ik('menu') + '</button>' +
      '<div class="crumb"><span class="seksi" id="crumb-seksi"></span><span class="muted" id="crumb-garis">/</span><span class="hal" id="crumb-hal"></span></div>' +
      '<div class="cari-global"><input class="input" id="cari-global" placeholder="Cari nomor, perihal, nama…" autocomplete="off" aria-label="Cari global">' + ik('search') + '<kbd>Ctrl K</kbd><div class="hasil-cari" id="hasil-cari" hidden></div></div>' +
      '<button class="btn btn-ghost btn-icon lonceng" id="btn-lonceng" aria-label="Pemberitahuan">' + ik('bell') + '<span class="titik" id="titik-lonceng" hidden></span></button>' +
      '<button class="btn btn-ghost btn-icon" id="btn-tema" aria-label="Ganti tema">' + ik(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon') + '</button>' +
      '<a class="btn btn-ghost btn-icon sembunyi-hp" href="#/" title="Portal publik" aria-label="Portal publik">' + ik('globe') + '</a></header>' +
      '<main class="konten" id="konten"></main></div></div>';
  }

  function pasangShell(root) {
    var sb = root.querySelector('#sidebar');
    var tutupSb = function () { sb.classList.remove('buka'); var t = document.querySelector('.tirai'); if (t) t.remove(); };
    root.querySelector('#btn-ham').addEventListener('click', function () {
      sb.classList.add('buka');
      var t = document.createElement('div'); t.className = 'tirai'; t.addEventListener('click', tutupSb); document.body.appendChild(t);
    });
    U.$$('.sb-item', sb).forEach(function (a) { a.addEventListener('click', tutupSb); });
    root.querySelector('#sb-keluar').addEventListener('click', menuProfil);
    root.querySelector('#btn-tema').addEventListener('click', function () {
      var gelap = document.documentElement.getAttribute('data-theme') !== 'dark';
      U.setTema(gelap ? 'gelap' : 'terang');
      this.innerHTML = ik(gelap ? 'sun' : 'moon');
      if (window.Pub) Pub.terapkanBranding();
      if (A.rute && A.rute.k === 'dashboard') A.renderUlang();
    });
    root.querySelector('#btn-lonceng').addEventListener('click', bukaLonceng);
    pasangCari(root);
    gambarLencana();
  }

  function menuProfil() {
    var u = A.user();
    var m = U.modal({ judul: u.nama || 'Akun', sub: u.email, ikon: ik('user'),
      isi: '<div class="tumpuk" style="gap:10px"><div class="blok-abu meta-grid"><div><div class="lbl">Peran</div><div class="nil">' + esc(PERAN_LABEL[u.peran] || u.peran) + '</div></div><div><div class="lbl">Jabatan</div><div class="nil">' + esc(u.jabatan || '-') + '</div></div></div>' +
        '<button class="btn btn-soft" data-ttd>' + ik('key', 'sm') + 'PIN Tanda Tangan</button>' +
        '<button class="btn btn-soft" data-semua>' + ik('shieldX', 'sm') + 'Keluar dari semua perangkat</button></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Tutup</button><button class="btn btn-primary" data-keluar>' + ik('logout', 'sm') + 'Keluar</button>' });
    m.$('[data-keluar]').addEventListener('click', function () { m.tutup(); A.keluar(); });
    m.$('[data-ttd]').addEventListener('click', function () { m.tutup(); location.hash = '#/admin/ttd?pin=1'; });
    m.$('[data-semua]').addEventListener('click', function () { U.konfirmasi('Keluar dari semua perangkat?', 'Semua sesi akun ini (termasuk perangkat lain) akan dicabut.', { ya: 'Ya, cabut semua' }).then(function (y) { if (y) { m.tutup(); A.keluar(true); } }); });
  }

  function gambarLencana() {
    var l = A.lencana(), tot = 0;
    U.$$('[data-lencana]').forEach(function (el) { var n = Number(l[el.dataset.lencana] || 0); tot += n; el.hidden = !n; el.textContent = n > 99 ? '99+' : n; });
    var t = document.getElementById('titik-lonceng'); if (t) t.hidden = !tot;
    var nama = brand().nama;
    document.title = (tot ? '(' + tot + ') ' : '') + nama;
  }

  function bukaLonceng() {
    var l = A.lencana();
    var item = [['permohonan', 'filePlus', 'permohonan menunggu diproses', 'permohonan'], ['emailMasuk', 'mail', 'email surat masuk belum dibaca', 'email-masuk'], ['ttd', 'signature', 'dokumen menunggu tanda tangan', 'ttd']];
    var isi = item.filter(function (x) { return l[x[0]]; }).map(function (x) {
      return '<a class="item-kartu" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit" href="#/admin/' + x[3] + '" data-tutup>' + ik(x[1]) + '<div><b>' + U.angka(l[x[0]]) + '</b> ' + x[2] + '</div>' + ik('right', 'sm') + '</a>';
    }).join('');
    var m = U.modal({ judul: 'Pemberitahuan', ikon: ik('bell'), isi: isi ? '<div class="daftar-kartu">' + isi + '</div>' : U.kosong('Tidak ada pekerjaan tertunda. 🎉', 'checkCircle'), kaki: '' });
    U.$$('a[data-tutup]', m.el).forEach(function (a) { a.addEventListener('click', function () { m.tutup(); }); });
  }

  // ---- cari global (data snapshot di peramban; instan tanpa server) ----
  var SUMBER_CARI = [
    ['permohonan', 'Permohonan', function (r) { return [r.noRef, r.nama, r.jenisSurat, r.email]; }, function (r) { return r.noRef + ' — ' + r.nama; }, function (r) { return r.jenisSurat + ' · ' + (U.STATUS[r.status] || [0, r.status])[1]; }],
    ['suratMasuk', 'Surat Masuk', function (r) { return [r.nomorAgenda, r.perihal, r.asalInstansi, r.nomorSuratAsal]; }, function (r) { return (r.nomorAgenda || '') + ' — ' + r.perihal; }, function (r) { return r.asalInstansi; }],
    ['suratKeluar', 'Surat Keluar', function (r) { return [r.nomorSurat, r.perihal, r.tujuan, r.kodeVerifikasi]; }, function (r) { return (r.nomorSurat || 'DRAF') + ' — ' + r.perihal; }, function (r) { return r.tujuan; }],
    ['sk', 'SK', function (r) { return [r.nomorSK, r.tentang, r.kodeVerifikasi]; }, function (r) { return (r.nomorSK || 'DRAF') + ' — ' + r.tentang; }, function () { return ''; }],
    ['beritaAcara', 'Berita Acara', function (r) { return [r.nomorDokumen, r.agenda, r.lokasi]; }, function (r) { return (r.nomorDokumen || 'DRAF') + ' — ' + r.agenda; }, function (r) { return r.lokasi; }],
    ['dokumen', 'Dokumen', function (r) { return [r.nomor, r.judul, r.penerima, r.kodeVerifikasi]; }, function (r) { return (r.nomor || 'DRAF') + ' — ' + r.judul; }, function (r) { return r.penerima; }],
    ['mou', 'MOU', function (r) { return [r.nomorMOU, r.pihakTerkait, r.ruangLingkup]; }, function (r) { return r.nomorMOU + ' — ' + r.pihakTerkait; }, function () { return ''; }],
    ['arsip', 'Arsip', function (r) { return [r.kodeArsip, r.namaDokumen, r.nomorLegalitas, r.kategori]; }, function (r) { return r.kodeArsip + ' — ' + r.namaDokumen; }, function (r) { return r.kategori; }],
    ['emailMasuk', 'Email', function (r) { return [r.subjek, r.dariNama, r.dariEmail]; }, function (r) { return r.subjek; }, function (r) { return r.dariNama + ' <' + r.dariEmail + '>'; }]
  ];
  function pasangCari(root) {
    var inp = root.querySelector('#cari-global'), box = root.querySelector('#hasil-cari');
    var jalan = U.debounce(function () {
      var q = inp.value.trim().toLowerCase();
      if (q.length < 2) { box.hidden = true; return; }
      var hasil = [];
      SUMBER_CARI.forEach(function (s) {
        A.rows(s[0]).forEach(function (r) {
          if (hasil.length >= 30) return;
          if (s[2](r).join(' ').toLowerCase().indexOf(q) >= 0) hasil.push({ m: s[0], label: s[1], r: r, judul: s[3](r), sub: s[4](r) });
        });
      });
      box.innerHTML = hasil.length ? hasil.map(function (h) {
        return '<a href="#/admin/' + MODUL_KEY[h.m] + '?id=' + encodeURIComponent(h.r.id) + '"><div class="antara"><b style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(h.judul) + '</b><span class="badge b-netral tanpa-titik">' + esc(h.label) + '</span></div><div class="muted kecil">' + esc(h.sub || '') + '</div></a>';
      }).join('') : '<div class="kosong" style="padding:18px">Tidak ditemukan.</div>';
      box.hidden = false;
    }, 120);
    inp.addEventListener('input', jalan);
    inp.addEventListener('focus', jalan);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.hidden = true; inp.blur(); } if (e.key === 'Enter') { var a = box.querySelector('a'); if (a) { location.hash = a.getAttribute('href'); box.hidden = true; inp.value = ''; } } });
    box.addEventListener('click', function (e) { if (e.target.closest('a')) { box.hidden = true; inp.value = ''; } });
    document.addEventListener('click', function (e) { if (!e.target.closest('.cari-global')) box.hidden = true; });
  }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { var i = document.getElementById('cari-global'); if (i) { e.preventDefault(); i.focus(); i.select(); } }
  });

  // ---------------------------------------------------------------------------
  // Router admin
  // ---------------------------------------------------------------------------
  A.cariMenu = function (k) { var x = null; MENU.forEach(function (g) { g.item.forEach(function (it) { if (it.k === k) x = { grup: g.grup, it: it }; }); }); return x; };

  A.masuk = function (root, jalur, q) {
    if (!Sesi.aktif()) { location.hash = '#/masuk'; return; }
    var k = jalur[0] || 'dashboard', sub = jalur.slice(1).join('/');
    var mn = A.cariMenu(k);
    if (!A.data) A.muatLokal();
    if (!root.querySelector('.adm')) { root.innerHTML = shell(); pasangShell(root); }
    if (mn && !bolehMenu(mn.it)) { k = 'dashboard'; mn = A.cariMenu(k); U.toast('Menu tersebut tidak tersedia untuk peran Anda.', 'info'); }
    A.rute = { k: k, sub: sub, q: q || {} };
    U.$$('.sb-item', root).forEach(function (a) { a.classList.toggle('aktif', a.dataset.k === k); });
    var h = A.halaman[k];
    document.getElementById('crumb-seksi').textContent = mn ? mn.grup : '';
    document.getElementById('crumb-hal').textContent = (h && h.judul) || (mn && mn.it.l) || k;
    var el = document.getElementById('konten');
    if (!A.data) {
      el.innerHTML = '<div class="kepala-hal"><div><div class="skel" style="width:160px;height:14px"></div><div class="skel" style="width:280px;height:30px;margin-top:10px"></div></div></div>' + U.skel(5, 70);
      muatAwal();
      return;
    }
    renderHalaman();
    if (!A._segarAwal) muatAwal();
    else if (h && h.modul && Date.now() - (A.data._t || 0) > 60000) A.segarkan(h.modul, { diam: true });
    mulaiLatar();
    window.scrollTo(0, 0);
  };

  function muatAwal() {
    A._segarAwal = true;
    API.panggil('bootstrapAdmin', {}).then(function (r) {
      if (!r.success) { if (!A.data) document.getElementById('konten').innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(r.message) + ' <button class="btn btn-sm btn-outline" id="ulang-boot">Coba lagi</button></div></div>'; var b = document.getElementById('ulang-boot'); if (b) b.onclick = function () { A._segarAwal = false; muatAwal(); }; A._segarAwal = false; return; }
      var ada = !!A.data;
      var lama = ada ? JSON.stringify([A.data.modul, A.data.master, A.data.config]) : '';
      var uLama = ada ? JSON.stringify([A.data.user && A.data.user.peran, A.data.user && A.data.user.nama, A.cfg('APP_NAME')]) : '';
      A.terapkan(r.data);
      var root = document.getElementById('app');
      if (!A.rute || !root) return;
      if (ada && uLama !== JSON.stringify([A.data.user.peran, A.data.user.nama, A.cfg('APP_NAME')]) && root.querySelector('.adm')) { root.innerHTML = shell(); pasangShell(root); A.masuk(root, [A.rute.k].concat(A.rute.sub ? A.rute.sub.split('/') : []), A.rute.q); return; }
      gambarLencana();
      if (!ada) { A.masuk(root, [A.rute.k].concat(A.rute.sub ? A.rute.sub.split('/') : []), A.rute.q); return; }
      if (lama !== JSON.stringify([r.data.modul, r.data.master, r.data.config])) A.renderUlang(true);
    });
  }

  function mulaiLatar() {
    if (A._timer) return;
    A._timer = setInterval(function () {
      if (!Sesi.aktif() || document.hidden || !A.rute) return;
      var h = A.halaman[A.rute.k];
      A.segarkan(h && h.modul ? h.modul : [], { diam: true });
    }, 180000);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Sesi.aktif() && A.rute && A.data && Date.now() - (A.data._t || 0) > 90000) {
      var h = A.halaman[A.rute.k]; A.segarkan(h && h.modul ? h.modul : [], { diam: true });
    }
  });

  function sedangMenyunting() {
    if (document.querySelector('#modal-root .overlay')) return true;
    var a = document.activeElement;
    return !!(a && a.closest && a.closest('#konten') && /INPUT|TEXTAREA|SELECT/.test(a.tagName) || (a && a.isContentEditable));
  }
  function renderHalaman() {
    var el = document.getElementById('konten'), r = A.rute;
    var h = A.halaman[r.k];
    if (!h) { el.innerHTML = U.kosong('Halaman belum tersedia.', 'alert'); return; }
    A.state[r.k] = A.state[r.k] || {};
    try { h.render(el, { sub: r.sub, q: r.q, state: A.state[r.k] }); }
    catch (e) { console.error(e); el.innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>Gagal menampilkan halaman: ' + esc(e.message) + '</div></div>'; }
  }
  /** Render ulang halaman aktif (dipanggil setelah data latar berubah). */
  A.renderUlang = function (dariLatar) {
    if (!A.rute) return;
    var h = A.halaman[A.rute.k];
    if (dariLatar && (h && h.tanpaRenderUlang || A.rute.sub || sedangMenyunting())) { A._basi = true; return; }
    A._basi = false;
    var y = window.scrollY;
    renderHalaman();
    window.scrollTo(0, y);
  };

  // ---------------------------------------------------------------------------
  // Pembantu tampilan
  // ---------------------------------------------------------------------------
  A.kepala = function (o) {
    return '<div class="kepala-hal"><div>' + (o.overline ? '<div class="overline emas titik-emas">' + esc(o.overline) + '</div>' : '') + '<h1>' + esc(o.judul) + '</h1>' + (o.desk ? '<div class="desk">' + o.desk + '</div>' : '') + '</div>' +
      '<div class="aksi-hal">' + (o.aksi || '') + '</div></div>';
  };
  A.chips = function (opsi, aktif, attr) {
    return '<div class="chip-baris">' + opsi.map(function (o) { return '<button class="chip' + (String(o.v) === String(aktif) ? ' aktif' : '') + '" ' + (attr || 'data-chip') + '="' + esc(o.v) + '">' + esc(o.l) + (o.n !== undefined ? '<span class="jml">' + U.angka(o.n) + '</span>' : '') + '</button>'; }).join('') + '</div>';
  };
  /** Tabel responsif. kolom: [{l, k, f(row)→html, kelas}] */
  A.tabel = function (o) {
    if (!o.rows.length) return '<div class="card">' + U.kosong(o.kosong || 'Belum ada data.', o.ikonKosong) + '</div>';
    var head = (o.cek ? '<th class="sel-cek"><input type="checkbox" data-cek-semua aria-label="Pilih semua"></th>' : '') + o.kolom.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('');
    var body = o.rows.map(function (r) {
      return '<tr class="' + (o.klik !== false ? 'klik' : '') + '" data-id="' + esc(r[o.id || 'id']) + '">' + (o.cek ? '<td class="sel-cek"><input type="checkbox" data-cek="' + esc(r[o.id || 'id']) + '"' + (o.terpilih && o.terpilih[r[o.id || 'id']] ? ' checked' : '') + ' aria-label="Pilih"></td>' : '') +
        o.kolom.map(function (c) { var v = c.f ? c.f(r) : esc(r[c.k] == null || r[c.k] === '' ? '-' : r[c.k]); return '<td data-l="' + esc(c.l) + '" class="' + (c.kelas || '') + '">' + v + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<div class="card"><div class="tabel-wrap"><table class="tabel responsif"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + (o.kaki || '') + '</div>';
  };
  A.pasangTabel = function (el, onKlik, onCek) {
    U.$$('tbody tr.klik', el).forEach(function (tr) {
      tr.addEventListener('click', function (e) { if (e.target.closest('input,button,a,label')) return; onKlik(tr.dataset.id); });
    });
    if (onCek) {
      U.$$('[data-cek]', el).forEach(function (c) { c.addEventListener('change', function () { onCek(c.dataset.cek, c.checked); }); });
      var s = el.querySelector('[data-cek-semua]');
      if (s) s.addEventListener('change', function () { U.$$('[data-cek]', el).forEach(function (c) { c.checked = s.checked; onCek(c.dataset.cek, s.checked); }); });
    }
  };
  /** Penyaring teks + halaman (klien) */
  A.saring = function (rows, q, fn) { q = String(q || '').toLowerCase().trim(); if (!q) return rows; return rows.filter(function (r) { return fn(r).join(' ').toLowerCase().indexOf(q) >= 0; }); };
  A.potong = function (rows, st, n) { st.batas = st.batas || n || 50; return { tampil: rows.slice(0, st.batas), sisa: Math.max(0, rows.length - st.batas) }; };
  A.tombolLagi = function (sisa) { return sisa ? '<div style="padding:12px;text-align:center"><button class="btn btn-soft btn-sm" data-lagi>' + ik('down', 'sm') + 'Tampilkan ' + Math.min(sisa, 50) + ' lagi (' + U.angka(sisa) + ' tersisa)</button></div>' : ''; };
  A.infoTerpotong = function (m) { var i = A.infoModul(m); return i.terpotong ? '<div class="muted kecil" style="margin:-6px 0 10px">' + ik('info', 'sm') + ' Menampilkan ' + U.angka(i.rows.length) + ' data terbaru dari ' + U.angka(i.total) + '. Gunakan Laporan untuk periode lama.</div>' : ''; };

  /** Pratinjau berkas base64 (PDF/gambar) di modal; tombol unduh & tab baru. */
  A.lihatBerkas = function (d, judul) {
    var url = URL.createObjectURL(U.blobDariBase64(d.base64, d.mime));
    var isi = /pdf/.test(d.mime) ? '<iframe src="' + url + '#view=FitH" title="Pratinjau" style="width:100%;height:min(78vh,1100px);border:0;border-radius:8px;background:#525659"></iframe>'
      : /image/.test(d.mime) ? '<img src="' + url + '" alt="" style="max-width:100%;margin:0 auto;border-radius:8px">'
        : U.kosong('Pratinjau tidak tersedia untuk jenis berkas ini. Gunakan Unduh.', 'file');
    var m = U.modal({ judul: judul || d.nama, sub: d.nama, lebar: 'sangat-lebar', isi: isi,
      kaki: (d.url ? '<a class="btn btn-ghost" href="' + esc(d.url) + '" target="_blank" rel="noopener">' + ik('external', 'sm') + 'Google Drive</a>' : '') +
        '<a class="btn btn-soft" href="' + url + '" target="_blank" rel="noopener">' + ik('external', 'sm') + 'Tab baru</a><button class="btn btn-primary" data-unduh>' + ik('download', 'sm') + 'Unduh</button>',
      setelahTutup: function () { setTimeout(function () { URL.revokeObjectURL(url); }, 5000); } });
    m.$('[data-unduh]').addEventListener('click', function () { U.unduhBase64(d); });
    return m;
  };
  A.bukaBerkas = function (idAtauUrl, judul, btn) {
    var id = /^[-\w]{20,}$/.test(String(idAtauUrl || '')) ? idAtauUrl : A.idDariUrl(idAtauUrl);
    if (!id) { if (idAtauUrl) window.open(idAtauUrl, '_blank', 'noopener'); return Promise.resolve(); }
    var jalan = function () {
      return API.panggil('ambilBerkasBase64', { fileId: id }).then(function (r) {
        if (r.success) A.lihatBerkas(r.data, judul);
        else if (r.kode === 'BERKAS_BESAR' && r.data && r.data.url) window.open(r.data.url, '_blank', 'noopener');
        else U.toast(r.message, 'galat');
      });
    };
    return btn ? U.sibuk(btn, jalan) : jalan();
  };
  A.unggah = function (modul, file, maksMb) {
    return U.bacaBerkas(file).then(function (b) {
      if (b.ukuran > (maksMb || 10) * 1048576) throw new Error('Berkas lebih dari ' + (maksMb || 10) + ' MB.');
      return API.panggil('uploadBerkas', { modul: modul, nama: b.nama, base64: b.base64 });
    });
  };
  A.ttdRingkas = function (ttd) {
    ttd = A.json(ttd, []);
    if (!ttd.length) return '';
    return '<div class="slot-ttd">' + ttd.map(function (p) { return '<span class="sl ' + (p.status === 'SETUJU' ? 'ok' : '') + '" title="' + esc(p.jabatan || '') + '">' + ik(p.status === 'SETUJU' ? 'check' : 'clock', 'sm') + esc(p.nama || p.label) + '</span>'; }).join('') + '</div>';
  };
  A.waLink = function (hp) { hp = String(hp || '').replace(/\D/g, ''); if (hp.indexOf('0') === 0) hp = '62' + hp.slice(1); return hp ? 'https://wa.me/' + hp : ''; };

  // ===========================================================================
  // DASHBOARD
  // ===========================================================================
  var _chart = null;
  A.daftar('dashboard', {
    judul: 'Dashboard', modul: ['permohonan', 'emailMasuk'],
    render: function (el, ctx) {
      var d = A.data.dashboard, u = A.user();
      if (!d) { el.innerHTML = U.skel(4, 120); A.muatDashboard(true); return; }
      var k = d.kpi || {}, jam = new Date().getHours();
      var salam = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
      var kpi = [
        { j: 'Permohonan Menunggu', n: k.permohonanMenunggu, ket: '+' + (k.permohonanHariIni || 0) + ' hari ini · ' + (k.permohonanDiproses || 0) + ' diproses', i: 'filePlus', h: 'permohonan', sorot: k.permohonanMenunggu > 0 },
        { j: 'Email Belum Diarsip', n: k.emailBelumDiarsip, ket: (k.emailBaru || 0) + ' baru' + (k.emailTertuaMenit ? ' · tertua ' + menitKe(k.emailTertuaMenit) : ''), i: 'mail', h: 'email-masuk', sorot: k.emailBaru > 0 },
        { j: 'Surat Masuk Bulan Ini', n: k.suratMasukBulanIni, ket: k.suratMasukPerubahan === null || k.suratMasukPerubahan === undefined ? 'bulan lalu: 0' : (k.suratMasukPerubahan >= 0 ? '▲ ' : '▼ ') + Math.abs(k.suratMasukPerubahan) + '% vs bulan lalu', i: 'inbox', h: 'surat-masuk' },
        { j: 'Surat Keluar Terbit', n: k.suratKeluarTerbit, ket: 'terakhir: ' + (k.nomorTerakhir || '-'), i: 'send', h: 'surat-keluar' },
        { j: 'MOU Aktif', n: k.mouAktif, ket: (k.mouSegera || 0) + ' berakhir ≤ 60 hari', i: 'handshake', h: 'mou', sorot: k.mouSegera > 0 },
        { j: 'Menunggu Tanda Tangan', n: k.ttdMenunggu, ket: 'SK ' + (k.skTerbit || 0) + ' · BA ' + (k.baTerbit || 0) + ' terbit', i: 'signature', h: 'ttd', sorot: k.ttdMenunggu > 0 }
      ];
      var aksiCepat = A.tulis() ? '<a class="btn btn-gold" href="#/admin/surat-keluar/baru">' + ik('plus', 'sm') + 'Buat Surat Keluar</a><a class="btn btn-outline" href="#/admin/surat-masuk?baru=1">' + ik('inbox', 'sm') + 'Catat Surat Masuk</a>' : '';
      el.innerHTML = A.kepala({ overline: 'Ringkasan operasional', judul: salam + ', ' + String(u.nama || '').split(' ')[0], desk: esc(U.hariTgl(new Date())) + ' · data dihitung ' + esc(U.relatif(d.dihitung)), aksi: aksiCepat + '<button class="btn btn-ghost btn-icon" id="dash-segar" title="Segarkan" aria-label="Segarkan">' + ik('refresh') + '</button>' }) +
        '<div class="grid-kpi">' + kpi.map(function (x) { return '<a class="kpi klik' + (x.sorot ? ' sorot' : '') + '" href="#/admin/' + x.h + '" style="text-decoration:none;color:inherit"><div class="judul"><span>' + esc(x.j) + '</span>' + ik(x.i, 'sm') + '</div><div class="angka">' + U.angka(x.n) + '</div><div class="ket">' + esc(x.ket) + '</div></a>'; }).join('') + '</div>' +
        '<div class="grid-3-1"><div class="tumpuk"><div class="card"><div class="card-head"><div><h3>Tren Surat 9 Bulan</h3><div class="muted kecil">Surat masuk dicatat vs dokumen keluar terbit</div></div><div class="legenda"><span style="--c:var(--primary)">Masuk</span><span style="--c:var(--accent)">Keluar</span></div></div><div class="card-body"><div class="wadah-grafik"><canvas id="grafik-tren" aria-label="Grafik tren surat"></canvas></div></div></div>' +
        '<div class="card"><div class="card-head"><h3>Terbit Terbaru</h3><a class="btn btn-ghost btn-sm" href="#/admin/surat-keluar">Lihat semua ' + ik('right', 'sm') + '</a></div>' +
        ((d.terbaru || []).length ? '<div class="tabel-wrap"><table class="tabel responsif"><thead><tr><th>Nomor</th><th>Perihal</th><th>Pejabat</th><th>Waktu</th></tr></thead><tbody>' + d.terbaru.map(function (t) {
          return '<tr class="klik" data-buka="' + esc(MODUL_KEY[t.modul]) + '" data-id="' + esc(t.id) + '"><td data-l="Nomor" class="mono">' + esc(t.nomor) + '</td><td data-l="Perihal">' + esc(t.judul) + '</td><td data-l="Pejabat">' + esc(t.pejabat || '-') + '</td><td data-l="Waktu" class="mono kecil">' + esc(U.relatif(t.waktu)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : U.kosong('Belum ada dokumen terbit.', 'send')) + '</div></div>' +
        '<div class="tumpuk"><div class="card"><div class="card-head"><h3>Antrean Kerja</h3><span class="badge b-netral tanpa-titik">' + (d.antrean || []).length + '</span></div><div class="card-body" style="padding-top:8px">' +
        ((d.antrean || []).length ? d.antrean.map(function (a) {
          return '<a class="antara" style="padding:10px 0;border-bottom:1px solid var(--hairline);color:inherit;text-decoration:none" href="#/admin/' + (a.tipe === 'email' ? 'email-masuk' : 'permohonan') + '?id=' + encodeURIComponent(a.id) + '"><div style="min-width:0"><div class="baris" style="gap:6px">' + ik(a.tipe === 'email' ? 'mail' : 'filePlus', 'sm') + '<b style="font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.judul) + '</b></div><div class="muted kecil">' + esc(a.sub) + ' · <span class="mono">' + esc(a.ref) + '</span></div></div><div style="text-align:right">' + U.badge(a.status) + '<div class="mono kecil muted antrean-wkt">' + esc(U.relatif(a.waktu)) + '</div></div></a>';
        }).join('') : U.kosong('Semua antrean sudah ditangani.', 'checkCircle')) + '</div></div>' +
        ((d.mouSegera || []).length ? '<div class="card"><div class="card-head"><h3>MOU Segera Berakhir</h3></div><div class="card-body">' + d.mouSegera.map(function (m) {
          return '<a class="antara" style="padding:8px 0;border-bottom:1px solid var(--hairline);color:inherit;text-decoration:none" href="#/admin/mou?id=' + esc(m.id) + '"><div><b style="font-size:13.5px">' + esc(m.pihak) + '</b><div class="mono kecil muted">' + esc(m.nomor) + '</div></div><span class="badge ' + (m.sisaHari <= 14 ? 'b-ditolak' : 'b-menunggu') + '">' + (m.sisaHari < 0 ? 'lewat' : m.sisaHari + ' hari') + '</span></a>';
        }).join('') + '</div></div>' : '') +
        '<div class="card card-pad"><div class="overline" style="margin-bottom:10px">Status sistem</div><div class="tumpuk" style="gap:8px;font-size:13px">' +
        '<div class="antara"><span>' + ik('mail', 'sm') + ' Sisa kuota email hari ini</span><b class="mono">' + (d.sistem.kuotaEmail >= 0 ? U.angka(d.sistem.kuotaEmail) : '-') + '</b></div>' +
        '<div class="antara"><span>' + ik('zap', 'sm') + ' Pekerja latar</span><b class="mono">' + esc({ on: 'aktif · 1 menit', hemat: 'hemat · 5 menit', off: 'mati', belum: 'belum dipasang' }[d.sistem.pekerja] || d.sistem.pekerja) + '</b></div>' +
        '<div class="antara"><span>' + ik('wa', 'sm') + ' WhatsApp</span>' + (d.sistem.waAktif ? '<span class="badge b-terbit">aktif</span>' : '<span class="badge b-draf">mati</span>') + '</div>' +
        '<div class="antara"><span>' + ik('inbox', 'sm') + ' Tarik email terakhir</span><b class="mono kecil">' + (d.sistem.emailTarikTerakhir ? esc(U.relatif(new Date(d.sistem.emailTarikTerakhir).toISOString())) : 'belum') + '</b></div></div></div>' +
        '</div></div>';
      el.querySelector('#dash-segar').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return A.muatDashboard(true, true); }); });
      U.$$('[data-buka]', el).forEach(function (tr) { tr.addEventListener('click', function () { location.hash = '#/admin/' + tr.dataset.buka + '?id=' + encodeURIComponent(tr.dataset.id); }); });
      gambarGrafik(d.tren || []);
      if (A.data._dashBasi || Date.now() - (A.data._dashT || A.data._t || 0) > 60000) A.muatDashboard(false);
    }
  });
  function menitKe(m) { return m < 60 ? m + ' mnt' : m < 1440 ? Math.round(m / 60) + ' jam' : Math.round(m / 1440) + ' hari'; }
  A.muatDashboard = function (tampilGalat, segar) {
    return API.panggil('hitungDashboard', segar ? { _fresh: true } : {}, { diam: !segar, senyap: !segar }).then(function (r) {
      if (!r.success) { if (tampilGalat) U.toast(r.message, 'galat'); return; }
      var lama = JSON.stringify(A.data.dashboard && A.data.dashboard.kpi) + JSON.stringify(A.data.dashboard && A.data.dashboard.antrean);
      A.data.dashboard = r.data; A.data._dashT = Date.now(); A.data._dashBasi = false; simpanLokal();
      if ((segar || lama !== JSON.stringify(r.data.kpi) + JSON.stringify(r.data.antrean)) && A.rute && A.rute.k === 'dashboard') A.renderUlang(!segar);
    });
  };
  function gambarGrafik(tren) {
    var cv = document.getElementById('grafik-tren'); if (!cv) return;
    U.muatChart().then(function () {
      if (!document.body.contains(cv)) return;
      if (_chart) { try { _chart.destroy(); } catch (e) {} }
      var cs = getComputedStyle(document.documentElement);
      var cP = cs.getPropertyValue('--primary').trim() || '#1B4332', cA = cs.getPropertyValue('--accent').trim() || '#D4A017', cM = cs.getPropertyValue('--muted').trim() || '#64748B', cB = cs.getPropertyValue('--border').trim() || '#E5E7EB';
      _chart = new Chart(cv, { type: 'bar', data: { labels: tren.map(function (t) { return t.label; }), datasets: [
        { label: 'Masuk', data: tren.map(function (t) { return t.masuk; }), backgroundColor: cP, borderRadius: 6, maxBarThickness: 22 },
        { label: 'Keluar', data: tren.map(function (t) { return t.keluar; }), backgroundColor: cA, borderRadius: 6, maxBarThickness: 22 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false }, ticks: { color: cM } }, y: { beginAtZero: true, ticks: { precision: 0, color: cM }, grid: { color: cB } } } } });
    }).catch(function () { cv.parentNode.innerHTML = '<div class="muted kecil">Grafik tidak dapat dimuat (koneksi ke CDN).</div>'; });
  }

  // ===========================================================================
  // PERMOHONAN SURAT (split view)
  // ===========================================================================
  var STATUS_PRM = [['MENUNGGU', 'Menunggu'], ['DIPROSES', 'Diproses'], ['PERLU_PERBAIKAN', 'Perlu Perbaikan'], ['TERBIT', 'Terbit'], ['DITOLAK', 'Ditolak'], ['DIBATALKAN', 'Dibatalkan'], ['', 'Semua']];
  var _detailPrm = {};
  A.daftar('permohonan', {
    judul: 'Permohonan Surat', modul: ['permohonan'],
    render: function (el, ctx) {
      var st = ctx.state;
      if (st.status === undefined) st.status = 'MENUNGGU';
      if (ctx.q.id && st._qid !== ctx.q.id) { st._qid = ctx.q.id; st.pilih = ctx.q.id; var r0 = A.rows('permohonan').filter(function (r) { return r.id === ctx.q.id; })[0]; if (r0) st.status = ''; }
      var semua = A.rows('permohonan'), hit = {};
      semua.forEach(function (r) { hit[r.status] = (hit[r.status] || 0) + 1; });
      var rows = semua.filter(function (r) { return !st.status || r.status === st.status; });
      rows = A.saring(rows, st.cari, function (r) { return [r.noRef, r.nama, r.email, r.jenisSurat, r.instansi, r.nomorSurat]; });
      if (st.status === 'MENUNGGU' || st.status === 'DIPROSES') rows = rows.slice().sort(function (a, b) { return String(a.dibuat).localeCompare(String(b.dibuat)); });
      var p = A.potong(rows, st, 40);
      el.innerHTML = A.kepala({ overline: 'Portal publik', judul: 'Antrean Permohonan Surat', desk: 'Ambil permohonan untuk diproses (terkunci atas nama Anda), lalu buat surat dari data pemohon.', aksi: '<button class="btn btn-ghost btn-icon" id="prm-segar" aria-label="Segarkan" title="Segarkan">' + ik('refresh') + '</button>' }) +
        '<div class="bilah-alat"><div class="cari">' + ik('search') + '<input class="input" id="prm-cari" placeholder="Cari no. referensi, nama, email…" value="' + esc(st.cari || '') + '"></div></div>' +
        '<div style="margin-bottom:14px">' + A.chips(STATUS_PRM.map(function (s) { return { v: s[0], l: s[1], n: s[0] ? hit[s[0]] || 0 : semua.length }; }), st.status) + '</div>' + A.infoTerpotong('permohonan') +
        '<div class="belah"><div class="daftar-kartu" id="prm-daftar">' + (p.tampil.length ? p.tampil.map(function (r) {
          return '<div class="item-kartu' + (st.pilih === r.id ? ' pilih' : '') + '" data-id="' + esc(r.id) + '" tabindex="0" role="button"><div class="atas"><span class="mono kecil tebal">' + esc(r.noRef) + '</span>' + U.badge(r.status) + '</div>' +
            '<div class="jdl">' + esc(r.jenisSurat) + '</div><div class="sub">' + esc(r.nama) + (r.instansi ? ' · ' + esc(r.instansi) : '') + '</div>' +
            '<div class="bawah"><span>' + ik('clock', 'sm') + ' ' + esc(U.relatif(r.dibuat)) + '</span><span>' + esc(r.diambilOleh ? '👤 ' + r.diambilOleh.split('@')[0] : '') + '</span></div></div>';
        }).join('') + A.tombolLagi(p.sisa) : '<div class="card">' + U.kosong('Tidak ada permohonan pada status ini.', 'inbox') + '</div>') + '</div>' +
        '<div class="card panel-detail" id="prm-detail">' + (st.pilih ? U.skel(5, 50) : U.kosong('Pilih permohonan di kiri untuk melihat detail.', 'filePlus')) + '</div></div>';
      el.querySelector('#prm-cari').addEventListener('input', U.debounce(function () { st.cari = this.value; st.batas = 40; A.renderUlang(); var i = document.getElementById('prm-cari'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250));
      U.$$('[data-chip]', el).forEach(function (b) { b.addEventListener('click', function () { st.status = b.dataset.chip; st.batas = 40; A.renderUlang(); }); });
      U.$$('.item-kartu', el).forEach(function (c) {
        var buka = function () { st.pilih = c.dataset.id; U.$$('.item-kartu', el).forEach(function (x) { x.classList.toggle('pilih', x === c); }); detailPrm(el.querySelector('#prm-detail'), c.dataset.id); if (innerWidth <= 960) el.querySelector('#prm-detail').scrollIntoView({ behavior: 'smooth' }); };
        c.addEventListener('click', buka); c.addEventListener('keydown', function (e) { if (e.key === 'Enter') buka(); });
      });
      var lg = el.querySelector('[data-lagi]'); if (lg) lg.addEventListener('click', function () { st.batas += 50; A.renderUlang(); });
      el.querySelector('#prm-segar').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return A.segarkan(['permohonan']); }); });
      if (st.pilih) detailPrm(el.querySelector('#prm-detail'), st.pilih);
    }
  });

  function detailPrm(box, id) {
    if (_detailPrm[id]) gambarDetailPrm(box, _detailPrm[id]);
    API.panggil('permohonanDetail', { id: id }).then(function (r) {
      if (!document.body.contains(box)) return;
      if (!r.success) { box.innerHTML = '<div class="card-body"><div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(r.message) + '</div></div></div>'; return; }
      var baru = JSON.stringify(r.data) !== JSON.stringify(_detailPrm[id]);
      _detailPrm[id] = r.data;
      if (baru) gambarDetailPrm(box, r.data);
    });
  }

  function gambarDetailPrm(box, p) {
    var me = A.user().email, tulis = A.tulis();
    var milikLain = p.status === 'DIPROSES' && p.diambilOleh && p.diambilOleh !== me && !A.sa();
    var isian = A.json(p.dataIsian, {}), lamp = A.json(p.lampiran, []), riw = A.json(p.riwayat, []).slice().reverse();
    var label = {}; (p.kolom || []).forEach(function (k) { label[k.kunci] = k.label; });
    var aksi = [];
    if (tulis) {
      if (p.status === 'MENUNGGU') aksi.push('<button class="btn btn-primary" data-a="ambil">' + ik('check', 'sm') + 'Ambil & Proses</button>');
      if (p.status === 'DIPROSES' && !milikLain) aksi.push('<button class="btn btn-gold" data-a="surat">' + ik('filePlus', 'sm') + (p.suratKeluarId ? 'Lanjutkan Surat' : 'Buat Surat') + '</button>');
      if (['MENUNGGU', 'DIPROSES'].indexOf(p.status) >= 0 && !milikLain) aksi.push('<button class="btn btn-outline" data-a="perbaikan">' + ik('edit', 'sm') + 'Minta Perbaikan</button>');
      if (['MENUNGGU', 'DIPROSES', 'PERLU_PERBAIKAN'].indexOf(p.status) >= 0 && !milikLain) aksi.push('<button class="btn btn-danger" data-a="tolak">' + ik('xCircle', 'sm') + 'Tolak</button>');
      if (p.status === 'TERBIT') aksi.push('<button class="btn btn-soft" data-a="kirimUlang">' + ik('send', 'sm') + 'Kirim Ulang PDF</button>');
    }
    if (p.status === 'TERBIT' && p.pdfId) aksi.push('<button class="btn btn-soft" data-a="pdf">' + ik('eye', 'sm') + 'Lihat Surat</button>');
    if (p.suratKeluarId) aksi.push('<a class="btn btn-ghost" href="#/admin/surat-keluar?id=' + esc(p.suratKeluarId) + '">' + ik('external', 'sm') + 'Register</a>');
    box.innerHTML = '<div class="kepala-detail"><div class="antara"><span class="overline">Nomor referensi</span>' + U.badge(p.status) + '</div><div class="no">' + esc(p.noRef) + '</div>' +
      '<div class="baris kecil muted"><span>' + ik('file', 'sm') + ' ' + esc(p.jenisSurat) + '</span><span>' + ik('calendar', 'sm') + ' ' + esc(U.tglJam(p.dibuat)) + '</span>' + (p.diambilOleh ? '<span>' + ik('user', 'sm') + ' ' + esc(p.diambilOleh) + '</span>' : '') + '</div></div>' +
      '<div class="gulir"><div class="card-body tumpuk" style="gap:16px">' +
      (milikLain ? '<div class="pemberitahuan warn">' + ik('lock') + '<div>Sedang diproses oleh <b>' + esc(p.diambilOleh) + '</b>.</div></div>' : '') +
      (p.catatanAdmin && ['PERLU_PERBAIKAN', 'DITOLAK'].indexOf(p.status) >= 0 ? '<div class="pemberitahuan ' + (p.status === 'DITOLAK' ? 'galat' : 'warn') + '">' + ik('info') + '<div><b>Catatan:</b> ' + esc(p.catatanAdmin) + '</div></div>' : '') +
      (p.nomorSurat ? '<div class="nomor-tetap">' + ik('stamp') + '<div><div class="overline">Nomor surat terbit</div><div class="mono">' + esc(p.nomorSurat) + '</div></div></div>' : '') +
      '<div><div class="overline" style="margin-bottom:8px">Data pemohon</div><div class="meta-grid"><div><div class="lbl">Nama</div><div class="nil">' + esc(p.nama) + '</div></div>' +
      '<div><div class="lbl">Email</div><div class="nil"><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></div></div>' +
      '<div><div class="lbl">WhatsApp</div><div class="nil"><a href="' + esc(A.waLink(p.noTelp)) + '" target="_blank" rel="noopener">' + esc(p.noTelp) + '</a></div></div>' +
      '<div><div class="lbl">Instansi</div><div class="nil">' + esc(p.instansi || '-') + '</div></div>' +
      '<div><div class="lbl">Riwayat pengajuan</div><div class="nil">' + U.angka(p.riwayatPengirim || 1) + ' permohonan dari email ini</div></div></div></div>' +
      '<div><div class="overline" style="margin-bottom:8px">Keperluan</div><div class="blok-abu" style="white-space:pre-wrap">' + esc(p.keperluan) + '</div></div>' +
      (Object.keys(isian).length ? '<div><div class="overline" style="margin-bottom:8px">Isian formulir</div><div class="meta-grid">' + Object.keys(isian).map(function (k) { return '<div><div class="lbl">' + esc(label[k] || k) + '</div><div class="nil">' + esc(isian[k]) + '</div></div>'; }).join('') + '</div></div>' : '') +
      (lamp.length ? '<div><div class="overline" style="margin-bottom:8px">Lampiran (' + lamp.length + ')</div><div class="lampiran-grid">' + lamp.map(function (l) { return '<button class="lp" style="cursor:pointer;text-align:left" data-berkas="' + esc(l.id) + '" data-nama="' + esc(l.nama) + '"><span class="ik">' + ik(/image/.test(l.mime) ? 'image' : 'file', 'sm') + '</span><div style="min-width:0"><div class="nm">' + esc(l.nama) + '</div><div class="mono kecil muted">' + U.ukuran(l.ukuran) + '</div></div></button>'; }).join('') + '</div></div>' : '') +
      '<div><div class="overline" style="margin-bottom:10px">Riwayat</div><div class="linimasa">' + riw.map(function (x) {
        return '<div class="lm-item"><span class="lm-titik ' + (x.status === 'DITOLAK' || x.status === 'DIBATALKAN' ? 'galat' : x.status === 'TERBIT' ? '' : 'aktif') + '">' + ik(x.status === 'TERBIT' ? 'check' : 'clock', 'sm') + '</span><div class="lm-isi"><div class="jdl"><span>' + esc((U.STATUS[x.status] || [0, x.status])[1]) + ' <span class="muted kecil" style="font-weight:500">· ' + esc(x.oleh || '') + '</span></span><span class="wkt">' + esc(U.tglJam(x.w)) + '</span></div>' + (x.catatan ? '<div class="cat">' + esc(x.catatan) + '</div>' : '') + '</div></div>';
      }).join('') + '</div></div></div></div>' +
      (aksi.length ? '<div class="bilah">' + aksi.join('') + '</div>' : '');
    U.$$('[data-berkas]', box).forEach(function (b) { b.addEventListener('click', function () { A.bukaBerkas(b.dataset.berkas, b.dataset.nama, b); }); });
    U.$$('[data-a]', box).forEach(function (b) { b.addEventListener('click', function () { aksiPrm(b.dataset.a, p, b, box); }); });
  }

  function aksiPrm(a, p, btn, box) {
    var selesai = function (r) {
      if (!U.hasil(r)) return;
      if (r.data && r.data.id) { A.upsertBaris('permohonan', r.data); _detailPrm[p.id] = Object.assign({}, _detailPrm[p.id], r.data); }
      A.renderUlang();
      API.panggil('refreshModul', { modul: [] }, { senyap: true, diam: true }).then(function (x) { if (x.success) A.gabung(x.data); });
    };
    if (a === 'ambil') return U.sibuk(btn, function () { return API.panggil('permohonanProses', { id: p.id }).then(selesai); });
    if (a === 'surat') {
      var j = A.jenisByKode(p.kodeJenis), key = j ? ({ SURAT_KELUAR: 'surat-keluar', SK: 'sk', BA: 'berita-acara', DOKUMEN: 'dokumen' }[j.modul] || 'surat-keluar') : 'surat-keluar';
      location.hash = '#/admin/' + key + '/baru?prm=' + encodeURIComponent(p.id);
      return;
    }
    if (a === 'perbaikan') return U.minta('Minta perbaikan ' + p.noRef, { label: 'Apa yang perlu diperbaiki pemohon?', textarea: true, min: 10, placeholder: 'Contoh: Lampirkan scan KTM yang masih berlaku.', bantu: 'Dikirim ke email/WA pemohon bersama tautan perbaikan.', ya: 'Kirim Permintaan' })
      .then(function (c) { if (c) API.panggil('permohonanMintaPerbaikan', { id: p.id, catatan: c }).then(selesai); });
    if (a === 'tolak') return U.minta('Tolak permohonan ' + p.noRef, { label: 'Alasan penolakan', textarea: true, min: 10, bahaya: true, ya: 'Tolak Permohonan', bantu: 'Alasan dikirim ke pemohon.' })
      .then(function (c) { if (c) API.panggil('permohonanTolak', { id: p.id, catatan: c }).then(selesai); });
    if (a === 'kirimUlang') return U.minta('Kirim ulang PDF', { label: 'Email tujuan', tipe: 'email', nilai: p.email, ya: 'Kirim', bantu: 'Ubah bila pemohon salah menulis email; data permohonan ikut dikoreksi.' })
      .then(function (e) { if (e) API.panggil('permohonanKirimUlangPdf', { id: p.id, email: e }).then(function (r) { U.hasil(r); }); });
    if (a === 'pdf') return A.bukaBerkas(p.pdfId, p.nomorSurat, btn);
  }
})();
