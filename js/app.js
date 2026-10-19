/**
 * app.js — titik mulai: pemeriksaan kelengkapan berkas, tema, router hash
 * (#/ portal publik · #/admin/… panel), tautan QR ?v=KODE → halaman verifikasi,
 * pemanasan server, dan indikator luring.
 */
(function () {
  'use strict';
  var U = window.UI;

  // 1) Integritas: semua modul harus termuat (cache lama / berkas terlewat saat unggah)
  var WAJIB = ['APP_CONFIG', 'API', 'UI', 'qrcode', 'Pub', 'Permohonan', 'Admin', 'Surat', 'DocEngineUI'];
  var hilang = WAJIB.filter(function (k) { return !window[k]; });
  if (hilang.length) {
    document.getElementById('app').innerHTML = '<div class="boot"><div class="logo-boot">!</div><div style="max-width:440px;text-align:center"><b>Berkas aplikasi tidak lengkap</b><p class="muted" style="margin-top:6px">Modul berikut gagal dimuat: <span class="mono">' + hilang.join(', ') + '</span>. Muat ulang paksa (Ctrl+Shift+R). Bila tetap, pastikan semua berkas folder <span class="mono">js/</span> ikut diunggah.</p></div></div>';
    return;
  }

  U.terapkanTema(Simpan.get('tema', 'otomatis'));
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (Simpan.get('tema', 'otomatis') === 'otomatis') { U.terapkanTema('otomatis'); Pub.terapkanBranding(); } });
  Pub.terapkanBranding();

  // 2) Tautan QR: https://…/?v=KODE → #/verifikasi?kode=KODE
  var cari = new URLSearchParams(location.search);
  if (cari.get('v')) { history.replaceState(null, '', location.pathname + '#/verifikasi?kode=' + encodeURIComponent(cari.get('v').toUpperCase())); }
  else if (cari.get('ref')) { history.replaceState(null, '', location.pathname + '#/lacak?ref=' + encodeURIComponent(cari.get('ref'))); }

  function uraiHash() {
    var h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('?'), jalur = (i >= 0 ? h.slice(0, i) : h).split('/').filter(String), q = {};
    if (i >= 0) new URLSearchParams(h.slice(i + 1)).forEach(function (v, k) { q[k] = v; });
    return { jalur: jalur, q: q };
  }

  var _publikAktif = '';
  function rute() {
    var root = document.getElementById('app'), r = uraiHash(), j = r.jalur;
    if (j[0] === 'admin') {
      if (!Sesi.aktif()) { location.replace('#/masuk' + (Sesi.data ? '?pesan=' + encodeURIComponent('Sesi berakhir. Silakan masuk kembali.') : '')); return; }
      _publikAktif = '';
      document.body.classList.add('mode-admin');
      Admin.masuk(root, j.slice(1), r.q);
      if (!Pub.data) setTimeout(function () { Pub.muat(); }, 1500);
      return;
    }
    Admin.rute = null;
    document.body.classList.remove('mode-admin');
    if (root.querySelector('.adm')) root.innerHTML = '';
    var hal = j[0] || 'beranda';
    if (hal === 'masuk' && Sesi.aktif()) { location.replace('#/admin/dashboard'); return; }
    var fn = { beranda: Pub.render.beranda, mohon: Pub.render.beranda, lacak: Pub.render.lacak, verifikasi: j[1] === 'cetak' ? Pub.render.cetak : Pub.render.verifikasi, bantuan: Pub.render.bantuan, masuk: Pub.render.masuk }[hal];
    if (!fn) { location.replace('#/'); return; }
    _publikAktif = (hal === 'mohon' ? 'beranda' : hal) + '|' + (j[1] || '');
    fn(root, hal === 'mohon' ? {} : r.q);
    if (hal !== 'mohon') window.scrollTo(0, 0);
    var p = Pub.muat();
    if (hal === 'mohon') {
      history.replaceState(null, '', location.pathname + '#/');
      p.then(function (d) { if (d) Permohonan.buka(r.q.jenis || ''); });
    }
  }

  window.App = {
    mulai: rute,
    /** Data portal berubah (latar) → render ulang halaman publik yang aman di-render ulang. */
    renderUlangPublik: function () {
      if (!_publikAktif || document.querySelector('#modal-root .overlay')) return;
      var hal = _publikAktif.split('|')[0];
      if (hal === 'beranda' || hal === 'bantuan') { var y = scrollY; rute(); scrollTo(0, y); }
    }
  };

  window.addEventListener('hashchange', rute);
  window.addEventListener('offline', function () { U.toast('Koneksi terputus — data tersimpan tetap bisa dilihat.', 'info', 5000); });
  window.addEventListener('online', function () { U.toast('Kembali daring.', 'ok', 2000); });

  if (!API.konfigurasiSiap()) {
    var b = document.createElement('div');
    b.className = 'pemberitahuan warn no-print';
    b.style.cssText = 'border-radius:0;justify-content:center;position:relative;z-index:50';
    b.innerHTML = U.ikon('alert') + '<div><b>Konfigurasi belum lengkap.</b> Isi <span class="mono">GAS_URL</span> di <span class="mono">js/config.js</span> dengan URL Web App Apps Script yang berakhiran <span class="mono">/exec</span>.</div>';
    document.body.insertBefore(b, document.body.firstChild);
  }

  rute();
  // 3) Pemanasan server: halaman publik → cache portal; ada sesi → cache panel
  setTimeout(function () { API.warmUp(Sesi.aktif() ? 'admin' : 'pub'); }, 300);
})();
