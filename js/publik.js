/**
 * publik.js — portal publik tanpa login: beranda, lacak permohonan, verifikasi QR dokumen,
 * lembar bukti verifikasi (cetak), dan halaman masuk admin (Google OAuth 2.0).
 * Data portal (branding, jenis surat publik, hero, pengumuman) tampil instan dari
 * penyimpanan peramban, lalu disegarkan di latar (BRD-06 / NFR-K4).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon;

  var Pub = {
    data: Simpan.get('pub', null),
    _muat: null,
    /** Muat bootstrapPublik; render ulang hanya bila isi berubah. */
    muat: function (paksa) {
      var self = this;
      var segar = self.data && self.data._t && Date.now() - self.data._t < 300000;
      if (self.data && segar && !paksa) return Promise.resolve(self.data);
      if (self._muat) return self._muat;
      self._muat = API.panggil('bootstrapPublik', {}, { senyap: !!self.data, tanpaToken: true }).then(function (r) {
        self._muat = null;
        if (!r.success) { if (!self.data) U.toast(r.message, 'galat'); return self.data; }
        var lama = JSON.stringify(Object.assign({}, self.data || {}, { _t: 0, waktu: '' }));
        r.data._t = Date.now();
        var baru = JSON.stringify(Object.assign({}, r.data, { _t: 0, waktu: '' }));
        self.data = r.data; Simpan.set('pub', r.data);
        self.terapkanBranding();
        if (lama !== baru && window.App) App.renderUlangPublik();
        return r.data;
      });
      return self._muat;
    },
    b: function () { return (this.data && this.data.branding) || { nama: (window.APP_CONFIG || {}).APP || 'SURAT DIGITAL', tagline: 'Persuratan & Arsip Digital' }; },
    inst: function () { return (this.data && this.data.institusi) || {}; },
    terapkanBranding: function () {
      var b = this.b();
      document.title = b.nama + (b.tagline ? ' — ' + b.tagline : '');
      var fav = b.favicon || b.logo;
      if (fav) { var l = document.querySelector('link[rel=icon]'); if (l) l.href = fav; }
      U.warnaBrand(b.warnaUtama && b.warnaUtama.toUpperCase() !== '#1B4332' ? b.warnaUtama : '', b.warnaAksen && b.warnaAksen.toUpperCase() !== '#D4A017' ? b.warnaAksen : '');
    }
  };
  window.Pub = Pub;

  function logoHtml(kelas) {
    var b = Pub.b();
    return '<span class="' + (kelas || 'lg') + '">' + (b.logo ? '<img src="' + esc(b.logo) + '" alt="">' : ik('shield', 'lg')) + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Kerangka portal
  // ---------------------------------------------------------------------------
  function shell(aktif, isi) {
    var b = Pub.b(), inst = Pub.inst(), d = Pub.data || {};
    var masuk = Sesi.aktif() ? '<a class="btn btn-primary btn-sm btn-masuk" href="#/admin/dashboard">' + ik('grid', 'sm') + 'Kembali ke Panel</a>'
      : '<a class="btn btn-primary btn-sm btn-masuk" href="#/masuk">' + ik('lock', 'sm') + 'Masuk Admin</a>';
    var jalan = '';
    if (d.portal && d.portal.runningText && (d.pengumuman || []).length) {
      jalan = '<div class="teks-jalan" aria-label="Pengumuman"><div class="gerak">' + d.pengumuman.map(function (p) { return '<span><b>●</b> ' + esc(p.judul) + (p.isi ? ' — ' + esc(p.isi) : '') + '</span>'; }).join('') + '</div></div>';
    }
    var menu = [['#/', 'Beranda', 'beranda'], ['#/lacak', 'Lacak Permohonan', 'lacak'], ['#/verifikasi', 'Verifikasi Dokumen', 'verifikasi'], ['#/bantuan', 'Layanan Bantuan', 'bantuan']];
    var thn = new Date().getFullYear();
    return '<div class="pub">' + jalan +
      '<header class="pub-nav"><div class="isi">' +
      '<a class="merek" href="#/">' + logoHtml() + '<span><span class="nm">' + esc(b.nama) + ' <span class="resmi">RESMI</span></span><span class="tg">' + esc(b.tagline || '') + '</span></span></a>' +
      '<nav class="pub-menu" id="pub-menu">' + menu.map(function (m) { return '<a href="' + m[0] + '" class="' + (aktif === m[2] ? 'aktif' : '') + '">' + m[1] + '</a>'; }).join('') +
      (Sesi.aktif() ? '<a href="#/admin/dashboard">Panel Admin</a>' : '<a href="#/masuk" class="hanya-hp">Masuk Admin</a>') + '</nav>' + masuk +
      '<button class="btn btn-ghost btn-icon menu-hp" id="btn-menu-hp" aria-label="Menu">' + ik('menu') + '</button></div></header>' +
      '<main id="isi-pub" style="flex:1">' + isi + '</main>' +
      '<footer class="pub-footer"><div class="isi"><div><a class="merek" href="#/">' + logoHtml() + '<span class="nm">' + esc(b.nama) + '</span></a>' +
      '<p class="muted kecil" style="margin-top:12px;max-width:420px">' + esc(b.tagline || '') + ' — layanan permohonan surat, verifikasi keaslian dokumen ber-QR, dan arsip digital ' + esc(inst.nama || '') + '.</p>' +
      '<div class="lencana-f"><span>QR Verifikasi</span><span>Arsip Google Drive</span><span>Data Terlindungi</span></div></div>' +
      '<div><h4>Layanan Publik</h4><ul><li><a href="#/mohon">Ajukan Permohonan Surat</a></li><li><a href="#/lacak">Lacak Permohonan</a></li><li><a href="#/verifikasi">Verifikasi Dokumen</a></li><li><a href="#/bantuan">Bantuan</a></li></ul></div>' +
      '<div><h4>Sekretariat & Bantuan</h4><ul>' + (inst.nama ? '<li>' + esc(inst.nama) + '</li>' : '') + (inst.alamat ? '<li>' + esc(inst.alamat) + '</li>' : '') +
      (inst.email ? '<li class="mono">surel: ' + esc(inst.email) + '</li>' : '') + (inst.telepon ? '<li class="mono">telp: ' + esc(inst.telepon) + '</li>' : '') + '</ul></div></div>' +
      '<div class="bawah"><span>© ' + thn + ' ' + esc(inst.nama || b.nama) + '. Hak cipta dilindungi.</span><span>' +
      (Sesi.aktif() ? '<a href="#/admin/dashboard">Kembali ke Panel</a>' : '<a href="#/masuk">Masuk Admin</a>') + ' · v' + esc((window.APP_CONFIG || {}).VERSI || '1.0.0') + '</span></div></footer></div>';
  }

  function pasangShell(root) {
    var b = root.querySelector('#btn-menu-hp');
    if (b) b.addEventListener('click', function () { root.querySelector('#pub-menu').classList.toggle('buka'); });
  }

  // ---------------------------------------------------------------------------
  // Beranda
  // ---------------------------------------------------------------------------
  var _heroTimer = null;
  function renderBeranda(root, q) {
    var d = Pub.data;
    if (!d) { root.innerHTML = shell('beranda', '<div class="pub-isi" style="padding:40px 20px">' + U.skel(4, 90) + '</div>'); pasangShell(root); return; }
    var hero = (d.hero && d.hero.length && d.portal.heroAktif) ? d.hero : [{ judul: 'Layanan Persuratan & Rekomendasi Resmi', subjudul: 'Ajukan surat secara mandiri, lacak statusnya, dan terima PDF ber-QR verifikasi.' }];
    var jenis = d.jenisSurat || [];
    var isi =
      '<section class="hero"><div class="isi"><div class="kapsul">' + ik('shield', 'sm') + 'Layanan mandiri tanpa login — terbuka untuk siapa saja</div>' +
      '<div id="hero-slide"><h1>' + esc(hero[0].judul) + '</h1><p class="sub">' + esc(hero[0].subjudul || '') + '</p></div>' +
      '<div class="cta">' + (d.portal.permohonanAktif ? '<a class="btn btn-gold" href="#/mohon">' + ik('filePlus') + 'Ajukan Permohonan Surat</a>' : '<span class="btn btn-kaca" aria-disabled="true">Portal permohonan sedang ditutup</span>') +
      '<a class="btn btn-kaca" href="#/lacak">' + ik('search') + 'Lacak Progres Surat</a></div>' +
      (hero.length > 1 ? '<div class="titik-slide">' + hero.map(function (h, i) { return '<button data-i="' + i + '" class="' + (i ? '' : 'aktif') + '" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('') + '</div>' : '') +
      '<div class="fitur"><span>' + ik('clock', 'sm') + 'Nomor referensi instan</span><span>' + ik('qr', 'sm') + 'QR verifikasi keaslian</span><span>' + ik('mail', 'sm') + 'PDF dikirim ke email</span><span>' + ik('chat', 'sm') + 'Notifikasi WhatsApp</span></div></div></section>' +
      '<div class="pub-isi"><div class="kartu-aksi">' +
      '<div class="card"><div class="ik">' + ik('filePlus', 'lg') + '</div><h3>1. Ajukan Permohonan</h3><p>Isi formulir online, unggah berkas pendukung, dan dapatkan nomor referensi seketika.</p><a class="btn btn-outline btn-sm" href="#/mohon">Buka Formulir ' + ik('right', 'sm') + '</a></div>' +
      '<div class="card"><div class="ik">' + ik('search', 'lg') + '</div><h3>2. Lacak Status</h3><p>Pantau proses verifikasi dan penandatanganan dengan nomor referensi + email Anda.</p><a class="btn btn-outline btn-sm" href="#/lacak">Lacak Sekarang ' + ik('right', 'sm') + '</a></div>' +
      '<div class="card"><div class="ik">' + ik('qr', 'lg') + '</div><h3>3. Verifikasi Dokumen</h3><p>Pindai QR di pojok surat atau masukkan 10 karakter kode verifikasi.</p>' +
      '<form class="baris" id="f-verif-cepat" style="flex-wrap:nowrap"><input class="input mono" name="kode" placeholder="Kode verifikasi" maxlength="14" aria-label="Kode verifikasi" style="text-transform:uppercase"><button class="btn btn-primary btn-sm">Periksa</button></form></div>' +
      '</div>' +
      (jenis.length ? '<section class="seksi-pub"><div class="kepala"><div><div class="overline emas titik-emas">Katalog layanan</div><h2>Jenis Surat yang Dapat Diajukan</h2></div><span class="muted kecil">' + jenis.length + ' jenis layanan aktif</span></div>' +
        '<div class="grid-jenis">' + jenis.map(function (j) {
          return '<div class="card kartu-jenis"><div class="antara"><span class="kd">KODE: ' + esc(j.kode) + '</span>' + (j.lampiranPublik === 'wajib' ? '<span class="badge b-perbaikan tanpa-titik">Lampiran wajib</span>' : '') + '</div>' +
            '<h3>' + esc(j.nama) + '</h3><p>' + esc(j.deskripsi || 'Diterbitkan resmi dengan nomor surat dan QR verifikasi.') + '</p>' +
            '<button class="btn btn-soft btn-sm" data-mohon="' + esc(j.kode) + '">' + ik('filePlus', 'sm') + 'Ajukan ' + esc(j.nama) + '</button></div>';
        }).join('') + '</div></section>' : '') +
      '<section class="seksi-pub"><div class="kepala"><div><div class="overline emas titik-emas">Prosedur</div><h2>Alur Sederhana 4 Langkah</h2></div></div><div class="langkah">' +
      '<div class="ln"><div class="bulat">' + ik('edit', 'lg') + '</div><h4>Isi Formulir Online</h4><p>Lengkapi data diri, email, nomor WhatsApp, dan keperluan surat.</p></div>' +
      '<div class="ln"><div class="bulat">' + ik('hash', 'lg') + '</div><h4>Terima Nomor Referensi</h4><p>Nomor referensi dikirim ke email & WhatsApp untuk melacak status.</p></div>' +
      '<div class="ln"><div class="bulat">' + ik('signature', 'lg') + '</div><h4>Diproses & Ditandatangani</h4><p>Sekretariat memeriksa berkas, pejabat menandatangani surat.</p></div>' +
      '<div class="ln"><div class="bulat">' + ik('download', 'lg') + '</div><h4>Unduh PDF Resmi</h4><p>PDF bernomor dengan QR verifikasi dikirim & bisa diunduh dari halaman Lacak.</p></div></div></section>' +
      ((d.berkas || []).length ? '<section class="seksi-pub"><div class="kepala"><div><div class="overline emas titik-emas">Unduhan</div><h2>Templat & Berkas Pendukung</h2></div></div><div class="grid-jenis">' +
        d.berkas.map(function (b) { return '<a class="card kartu-jenis" href="' + esc(b.fileUrl) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><h3>' + ik('download', 'sm') + ' ' + esc(b.nama) + '</h3><p>' + esc(b.deskripsi || '') + '</p></a>'; }).join('') + '</div></section>' : '') +
      '</div>';
    root.innerHTML = shell('beranda', isi);
    pasangShell(root);
    root.querySelector('#f-verif-cepat').addEventListener('submit', function (e) { e.preventDefault(); var k = this.kode.value.trim().toUpperCase(); if (k) location.hash = '#/verifikasi?kode=' + encodeURIComponent(k); });
    U.$$('[data-mohon]', root).forEach(function (b) { b.addEventListener('click', function () { if (window.Permohonan) Permohonan.buka(b.dataset.mohon); }); });
    clearInterval(_heroTimer);
    if (hero.length > 1) {
      var i = 0, tampil = function (n) {
        i = n; var s = root.querySelector('#hero-slide'); if (!s) { clearInterval(_heroTimer); return; }
        s.innerHTML = '<h1>' + esc(hero[n].judul) + '</h1><p class="sub">' + esc(hero[n].subjudul || '') + '</p>';
        U.$$('.titik-slide button', root).forEach(function (b, k) { b.classList.toggle('aktif', k === n); });
      };
      U.$$('.titik-slide button', root).forEach(function (b) { b.addEventListener('click', function () { tampil(Number(b.dataset.i)); }); });
      _heroTimer = setInterval(function () { tampil((i + 1) % hero.length); }, d.portal.heroDurasi || 6000);
    }
    if (q && q.mohon !== undefined && window.Permohonan) Permohonan.buka(q.jenis || '');
    var p = (d.pengumuman || [])[0];
    if (p && d.portal.popupAktif && !sessionStorage.getItem('pop_' + p.id) && !(q && q.mohon !== undefined)) {
      sessionStorage.setItem('pop_' + p.id, '1');
      setTimeout(function () { U.modal({ judul: p.judul, ikon: ik('bell'), isi: '<p style="white-space:pre-wrap;margin:0">' + esc(p.isi || '') + '</p>', kaki: '<button class="btn btn-primary" data-tutup>Mengerti</button>' }); }, 600);
    }
  }

  // ---------------------------------------------------------------------------
  // Lacak permohonan
  // ---------------------------------------------------------------------------
  var LABEL_STATUS = { MENUNGGU: 'Menunggu diproses sekretariat', DIPROSES: 'Sedang diproses', PERLU_PERBAIKAN: 'Perlu perbaikan dari Anda', TERBIT: 'Surat telah terbit', DITOLAK: 'Permohonan ditolak', DIBATALKAN: 'Dibatalkan oleh pemohon' };
  function renderLacak(root, q) {
    var akhir = Simpan.get('lacak_terakhir', {}) || {};
    var ref = (q && q.ref) || akhir.ref || '', em = akhir.email || '';
    var isi = '<div class="pub-isi"><div class="hal-pub"><div class="jejak">' + ik('home', 'sm') + ' Beranda / Lacak Permohonan Surat</div><div class="overline emas titik-emas">Audit & tracking portal</div>' +
      '<h1>Lacak Status Permohonan Surat</h1><p class="desk">Pantau progres verifikasi, riwayat peninjauan, dan unduh salinan digital surat bertanda tangan elektronik.</p></div>' +
      '<div class="card card-pad kotak-cari"><div class="baris" style="margin-bottom:14px"><span class="pil-label" style="text-transform:none">' + ik('search', 'sm') + '</span><div><b>Pencarian Data Permohonan</b><div class="muted kecil">Kombinasi nomor referensi dan email pendaftaran diperlukan untuk autentikasi data.</div></div></div>' +
      '<form id="f-lacak" class="grid-form"><div class="field"><label for="l-ref">Nomor Referensi Permohonan <span class="wajib">*</span></label><div class="grup-input"><span class="awalan">#</span><input class="input mono" id="l-ref" name="ref" required placeholder="PRM/2026/10-0001" value="' + esc(ref) + '"></div><div class="bantu">Tercantum pada tanda terima, email, dan WhatsApp.</div></div>' +
      '<div class="field"><label for="l-em">Alamat Email Pemohon <span class="wajib">*</span></label><div class="grup-input"><span class="awalan">@</span><input class="input" id="l-em" name="email" type="email" required placeholder="nama@email.com" value="' + esc(em) + '"></div><div class="bantu">Keamanan privasi: email harus cocok dengan data permohonan.</div></div>' +
      '<div class="penuh antara"><span class="muted kecil">Lupa referensi? Cari email berjudul nama aplikasi di kotak masuk Anda.</span><button class="btn btn-primary">' + ik('search', 'sm') + 'Cek Status Permohonan</button></div></form></div>' +
      '<div id="hasil-lacak"></div></div>';
    root.innerHTML = shell('lacak', isi);
    pasangShell(root);
    var f = root.querySelector('#f-lacak');
    var cari = function () {
      var r0 = f.ref.value.trim().toUpperCase(), e0 = f.email.value.trim().toLowerCase();
      if (!r0 || !e0) return;
      Simpan.set('lacak_terakhir', { ref: r0, email: e0 });
      var box = root.querySelector('#hasil-lacak');
      box.innerHTML = '<div style="margin-top:18px">' + U.skel(3, 80) + '</div>';
      API.panggil('permohonanLacak', { noRef: r0, email: e0 }, { tanpaToken: true }).then(function (r) {
        if (!r.success) { box.innerHTML = '<div class="pemberitahuan galat" style="margin-top:18px">' + ik('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
        tampilHasilLacak(box, r.data, e0, cari);
      });
    };
    f.addEventListener('submit', function (e) { e.preventDefault(); cari(); });
    if (q && q.ref && em) cari();
  }

  function tampilHasilLacak(box, d, email, ulang) {
    var urutan = ['MENUNGGU', 'DIPROSES', 'TERBIT'];
    var riw = (d.riwayat || []).slice().reverse();
    var akhirTahap = d.status === 'TERBIT' ? 3 : d.status === 'DIPROSES' || d.status === 'PERLU_PERBAIKAN' ? 2 : 1;
    var tahapan = [
      { j: 'Permohonan Diterima Sistem', ok: true },
      { j: 'Verifikasi Berkas & Pemrosesan', ok: akhirTahap >= 2, aktif: akhirTahap === 2 },
      { j: 'Penerbitan Surat & Siap Unduh', ok: d.status === 'TERBIT', aktif: false }
    ];
    var tolak = d.status === 'DITOLAK' || d.status === 'DIBATALKAN';
    var kolom = (d.kolom || []);
    var html = '<div class="status-banner st-' + d.status.toLowerCase() + '"><span class="ik">' + ik(d.status === 'TERBIT' ? 'checkCircle' : tolak ? 'xCircle' : d.status === 'PERLU_PERBAIKAN' ? 'alert' : 'refresh') + '</span>' +
      '<div style="flex:1;min-width:200px"><b>' + esc(LABEL_STATUS[d.status] || d.status) + '</b><div class="muted kecil">' + (d.catatanAdmin && (d.status === 'PERLU_PERBAIKAN' || d.status === 'DITOLAK') ? esc(d.catatanAdmin) : 'Diperbarui ' + esc(U.tglJam(d.diperbarui))) + '</div></div>' +
      U.badge(d.status) + '</div>' +
      '<div class="grid-3-1"><div class="tumpuk"><div class="card"><div class="card-head"><div><div class="overline">Identifikasi permohonan</div><div class="mono tebal" style="font-size:15px;margin-top:4px">' + esc(d.noRef) + ' <button class="btn btn-ghost btn-xs" data-salin="' + esc(d.noRef) + '">' + ik('copy', 'sm') + '</button></div></div>' + U.badge(d.status) + '</div>' +
      '<div class="card-body"><div class="baris" style="align-items:flex-start;margin-bottom:14px"><span class="pil-label" style="background:var(--surface-2);color:var(--primary)">' + ik('file', 'sm') + '</span><div><div class="muted kecil">Jenis Dokumen Layanan</div><div style="font-size:19px;font-weight:700">' + esc(d.jenisSurat) + '</div>' +
      (d.nomorSurat ? '<div class="mono kecil" style="color:#8a6a0c">Nomor surat: ' + esc(d.nomorSurat) + '</div>' : '') + '</div></div>' +
      '<div class="blok-abu meta-grid"><div><div class="lbl">Nama pemohon (tersamar)</div><div class="nil">' + esc(d.nama) + '</div><div class="mono kecil muted">' + esc(d.email) + ' · ' + esc(d.noTelp) + '</div></div>' +
      '<div><div class="lbl">Waktu pengajuan</div><div class="nil">' + esc(U.tgl(d.tanggal)) + '</div></div>' +
      (d.instansi ? '<div><div class="lbl">Instansi / asal</div><div class="nil">' + esc(d.instansi) + '</div></div>' : '') +
      '<div><div class="lbl">Keperluan</div><div class="nil" style="font-weight:500">' + esc(d.keperluan) + '</div></div></div>' +
      (d.bisaUnduh ? '<div class="baris" style="margin-top:14px"><button class="btn btn-primary" id="btn-unduh">' + ik('download', 'sm') + 'Unduh PDF Surat Resmi</button></div>' : '') +
      (d.bisaBatal ? '<div class="antara" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--hairline)"><span class="muted kecil">' + ik('info', 'sm') + ' Ingin membatalkan pengajuan ini?</span><button class="btn btn-danger btn-sm" id="btn-batal">' + ik('xCircle', 'sm') + 'Batalkan Permohonan</button></div>' : '') +
      '</div></div>' +
      (d.bisaPerbaiki ? '<div class="card" id="kartu-perbaiki"><div class="card-head"><h3>' + ik('edit', 'sm') + ' Perbaiki Permohonan</h3></div><div class="card-body"><div class="pemberitahuan warn" style="margin-bottom:14px">' + ik('alert') + '<div><b>Catatan sekretariat:</b> ' + esc(d.catatanAdmin) + '</div></div>' +
        '<form id="f-perbaiki" class="grid-form">' + kolom.map(function (k) { var v = (d.dataIsian || {})[k.kunci] || ''; return '<div class="field ' + (k.tipe === 'area' ? 'penuh' : '') + '"><label>' + esc(k.label) + (k.wajib ? ' <span class="wajib">*</span>' : '') + '</label>' + (k.tipe === 'area' ? '<textarea class="textarea" name="' + esc(k.kunci) + '">' + esc(v) + '</textarea>' : '<input class="input" name="' + esc(k.kunci) + '" value="' + esc(v) + '"' + (k.tipe === 'tanggal' ? ' type="date"' : '') + '>') + '</div>'; }).join('') +
        '<div class="field penuh"><label>Keperluan surat <span class="wajib">*</span></label><textarea class="textarea" name="__keperluan">' + esc(d.keperluan) + '</textarea></div>' +
        (d.lampiranPublik !== 'tidak' ? '<div class="field penuh"><label>Tambah lampiran (opsional)</label><input type="file" id="pb-file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"></div>' : '') +
        '<div class="penuh" style="display:flex;justify-content:flex-end"><button class="btn btn-gold">' + ik('send', 'sm') + 'Kirim Perbaikan</button></div></form></div></div>' : '') +
      ((d.lampiran || []).length ? '<div class="card"><div class="card-head"><h3>' + ik('clip', 'sm') + ' Berkas Persyaratan Terlampir</h3><span class="mono kecil muted">' + d.lampiran.length + ' berkas</span></div><div class="card-body"><div class="lampiran-grid">' +
        d.lampiran.map(function (l) { return '<div class="lp"><span class="ik">' + ik('file', 'sm') + '</span><div style="min-width:0"><div class="nm">' + esc(l.nama) + '</div><div class="mono kecil muted">' + U.ukuran(l.ukuran) + '</div></div></div>'; }).join('') + '</div></div></div>' : '') +
      '</div><div class="tumpuk"><div class="card"><div class="card-head"><div><h3>Linimasa Riwayat</h3><div class="muted kecil">Jejak resmi alur persuratan</div></div><span class="badge b-netral tanpa-titik mono">' + riw.length + ' catatan</span></div><div class="card-body"><div class="linimasa">' +
      (tolak ? '' : tahapan.map(function (t, i) { return '<div class="lm-item"><span class="lm-titik ' + (t.ok && !t.aktif ? '' : t.aktif ? 'aktif' : 'nanti') + '">' + ik(t.ok && !t.aktif ? 'check' : i === 2 ? 'download' : 'clock', 'sm') + '</span><div class="lm-isi"><div class="jdl">' + esc(t.j) + '</div></div></div>'; }).join('')) +
      '</div><div class="garis-tipis"></div><div class="linimasa">' +
      riw.map(function (x) { return '<div class="lm-item"><span class="lm-titik ' + (x.status === 'DITOLAK' || x.status === 'DIBATALKAN' ? 'galat' : x.status === 'TERBIT' ? '' : 'aktif') + '">' + ik(x.status === 'TERBIT' ? 'check' : x.status === 'DITOLAK' ? 'x' : 'clock', 'sm') + '</span><div class="lm-isi"><div class="jdl"><span>' + esc(LABEL_STATUS[x.status] || x.status) + '</span><span class="wkt">' + esc(U.tglJam(x.w)) + '</span></div>' + (x.catatan ? '<div class="cat">' + esc(x.catatan) + '</div>' : '') + '</div></div>'; }).join('') +
      '</div></div><div class="card-foot" style="justify-content:space-between"><span class="muted kecil">' + ik('clock', 'sm') + ' Diperbarui: ' + esc(U.tglJam(d.diperbarui)) + '</span><button class="btn btn-ghost btn-sm" id="btn-segar">' + ik('refresh', 'sm') + 'Segarkan Status</button></div></div>' +
      '<div class="card card-pad"><div class="baris" style="align-items:flex-start"><span class="pil-label" style="background:var(--accent-soft);color:#7a5c00">' + ik('help', 'sm') + '</span><div><b>Butuh Pendampingan?</b><p class="muted kecil" style="margin-top:4px">Hubungi sekretariat dengan menyebutkan nomor referensi Anda.</p>' +
      (Pub.inst().email ? '<a class="btn btn-soft btn-sm" href="mailto:' + esc(Pub.inst().email) + '?subject=' + encodeURIComponent('Permohonan ' + d.noRef) + '">' + ik('mail', 'sm') + 'Email Sekretariat</a>' : '') + '</div></div></div></div></div>';
    box.innerHTML = html;
    U.$$('[data-salin]', box).forEach(function (b) { b.addEventListener('click', function () { U.salin(b.dataset.salin); }); });
    box.querySelector('#btn-segar').addEventListener('click', ulang);
    var bu = box.querySelector('#btn-unduh');
    if (bu) bu.addEventListener('click', function () { U.sibuk(bu, function () { return API.panggil('permohonanUnduh', { noRef: d.noRef, email: email }, { tanpaToken: true }).then(function (r) { if (r.success) U.unduhBase64(r.data); else U.toast(r.message, 'galat'); }); }); });
    var bb = box.querySelector('#btn-batal');
    if (bb) bb.addEventListener('click', function () {
      U.konfirmasi('Batalkan permohonan?', 'Permohonan ' + d.noRef + ' akan dibatalkan dan tidak bisa diproses lagi.', { bahaya: true, ya: 'Ya, batalkan' }).then(function (ya) {
        if (!ya) return; API.panggil('permohonanBatal', { noRef: d.noRef, email: email }, { tanpaToken: true }).then(function (r) { if (U.hasil(r)) ulang(); });
      });
    });
    var fp = box.querySelector('#f-perbaiki');
    if (fp) fp.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = fp.querySelector('button.btn-gold');
      await U.sibuk(btn, async function () {
        var isian = {}; kolom.forEach(function (k) { isian[k.kunci] = (fp.elements[k.kunci] || {}).value || ''; });
        var lamp = [], fileEl = box.querySelector('#pb-file');
        if (fileEl && fileEl.files.length) { for (var i = 0; i < Math.min(5, fileEl.files.length); i++) lamp.push(await U.bacaBerkas(fileEl.files[i])); }
        var r = await API.panggil('permohonanPerbaiki', { noRef: d.noRef, email: email, isian: isian, keperluan: fp.elements.__keperluan.value, lampiran: lamp }, { tanpaToken: true });
        if (U.hasil(r)) ulang();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Verifikasi dokumen
  // ---------------------------------------------------------------------------
  function renderVerifikasi(root, q) {
    var kode = String((q && (q.kode || q.v)) || '').toUpperCase();
    var isi = '<div class="pub-isi"><div class="hal-pub antara" style="align-items:flex-end;flex-wrap:wrap"><div><div class="jejak">' + ik('home', 'sm') + ' Beranda / Verifikasi Dokumen / QR Code</div>' +
      '<div class="pil-label" style="background:var(--surface-2);color:var(--ink-2);margin-bottom:6px">Kanal validasi publik</div><h1>Verifikasi Keaslian Dokumen</h1>' +
      '<p class="desk">Periksa apakah surat benar diterbitkan dan terdaftar di arsip resmi ' + esc(Pub.inst().nama || Pub.b().nama) + '. Data pribadi tidak ditampilkan.</p></div></div>' +
      '<div class="card card-pad"><form id="f-verif" class="baris" style="align-items:flex-end"><div class="field" style="flex:1;min-width:220px"><label for="v-kode">Kode Unik Verifikasi Dokumen</label><div class="grup-input"><span class="awalan">' + ik('qr', 'sm') + '</span><input class="input mono" id="v-kode" name="kode" value="' + esc(kode) + '" placeholder="KD82JA9XL1" maxlength="14" style="text-transform:uppercase"></div></div>' +
      '<button class="btn btn-primary">' + ik('shield', 'sm') + 'Periksa Keaslian Dokumen</button></form><div class="muted kecil" style="margin-top:10px">' + ik('help', 'sm') + ' Kode 10 karakter tercetak di bawah QR pada surat. Memindai QR dengan kamera HP otomatis membuka halaman ini.</div></div>' +
      '<div id="hasil-verif" style="margin-top:18px"></div></div>';
    root.innerHTML = shell('verifikasi', isi);
    pasangShell(root);
    var f = root.querySelector('#f-verif');
    f.addEventListener('submit', function (e) { e.preventDefault(); var k = f.kode.value.trim().toUpperCase(); if (!k) return; history.replaceState(null, '', location.pathname + '#/verifikasi?kode=' + encodeURIComponent(k)); periksa(k); });
    function periksa(k) {
      var box = root.querySelector('#hasil-verif');
      box.innerHTML = U.skel(3, 90);
      API.panggil('verifikasiDokumen', { kode: k }, { tanpaToken: true }).then(function (r) {
        if (!r.success) { box.innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
        tampilVerif(box, r.data);
      });
    }
    if (kode) periksa(kode);
  }

  function metodeLabel(m) { return { 'GOOGLE+PIN': 'Disetujui pejabat (login Google + PIN)', OPERATOR: 'Diterbitkan sekretariat atas nama pejabat', BYPASS: 'Disahkan Super Admin (bypass tercatat)', MASSAL: 'Generate massal (disetujui)' }[m] || m || '-'; }

  function tampilVerif(box, d) {
    if (!d.ditemukan) {
      box.innerHTML = '<div class="card card-pad tidak-terdaftar"><div class="baris" style="align-items:flex-start;gap:16px"><span class="pil-label" style="background:var(--danger-soft);color:var(--danger);padding:10px">' + ik('shieldX', 'lg') + '</span>' +
        '<div style="flex:1"><div class="baris"><span class="badge b-ditolak">Tidak terdaftar</span><span class="mono kecil muted">' + esc(d.kode) + '</span></div><h2 style="color:var(--danger);font-size:21px;margin:8px 0 6px">Dokumen tidak ditemukan di pangkalan data resmi</h2>' +
        '<p class="muted">Kemungkinan penyebab: (1) salah ketik kode, (2) QR dimanipulasi/palsu, atau (3) surat dibuat di luar sistem persuratan resmi.</p>' +
        '<div class="grid-2" style="margin-top:12px"><div class="blok-abu"><b>' + ik('ban', 'sm') + ' Bagi lembaga penerima</b><p class="kecil muted" style="margin-top:6px">Tunda proses yang memakai dokumen ini dan minta pemilik menunjukkan surat ber-QR yang terverifikasi.</p></div>' +
        '<div class="blok-abu"><b>' + ik('mail', 'sm') + ' Konfirmasi manual</b><p class="kecil muted" style="margin-top:6px">Hubungi sekretariat ' + esc(Pub.inst().nama || '') + (Pub.inst().email ? ' melalui ' + esc(Pub.inst().email) : '') + ' dengan menyertakan salinan dokumen.</p></div></div>' +
        '<p class="kecil muted" style="margin-top:12px">Diperiksa: ' + esc(U.tglJam(d.waktuPeriksa)) + '</p></div></div></div>';
      return;
    }
    var sah = d.status === 'TERBIT';
    var ttd = d.penandatangan || [];
    box.innerHTML = '<div class="banner-verif ' + (sah ? 'sah' : 'ditarik') + '"><div class="baris" style="gap:16px;flex-wrap:nowrap;align-items:flex-start"><span class="ikb">' + ik(sah ? 'shield' : 'alert', 'lg') + '</span><div>' +
      '<span class="badge ' + (sah ? 'b-menunggu' : 'b-ditolak') + '" style="background:' + (sah ? '#FDE68A' : '#fff') + '">' + (sah ? 'Status: sah & terdaftar' : 'Status: ditarik / tidak berlaku') + '</span>' +
      '<h2 style="margin-top:8px">' + (sah ? 'Dokumen Asli & Terdaftar Resmi' : 'Dokumen Ini Telah Ditarik & Tidak Berlaku') + '</h2>' +
      '<p>' + (sah ? 'Dokumen tercatat di buku arsip resmi dan diterbitkan melalui sistem persuratan. Cocokkan nomor, tanggal, dan perihal dengan surat yang Anda pegang.' : 'Dokumen ini pernah diterbitkan namun telah ditarik oleh institusi. Jangan dipakai untuk keperluan apa pun.') + '</p></div></div>' +
      '<div class="baris alat-cetak"><a class="btn" style="background:#fff;color:#14352A" href="#/verifikasi/cetak?kode=' + esc(d.kode) + '">' + ik('printer', 'sm') + 'Cetak Bukti Verifikasi</a></div></div>' +
      (!sah ? '<div class="card card-pad" style="margin-top:16px;border-left:4px solid #DC2626"><div class="overline" style="color:var(--danger)">' + ik('alert', 'sm') + ' Alasan penarikan resmi</div><p style="margin-top:8px;font-style:italic">"' + esc(d.alasanTarik || '-') + '"</p><div class="mono kecil muted">Ditarik: ' + esc(U.tglJam(d.diperbarui)) + '</div></div>' : '') +
      '<div class="grid-3-1" style="margin-top:16px"><div class="tumpuk"><div class="card"><div class="card-head"><div class="baris"><span class="pil-label" style="background:var(--surface-2);color:var(--primary)">' + ik('file', 'sm') + '</span><div><div class="overline">Naskah dinas institusi</div><h3>Rincian Dokumen</h3></div></div>' + U.badge(d.status) + '</div>' +
      '<div class="card-body"><div class="blok-abu antara" style="margin-bottom:14px"><div><div class="muted kecil">Nomor Registrasi Surat</div><div class="mono tebal" style="font-size:15px">' + esc(d.nomor) + '</div></div><button class="btn btn-soft btn-xs" data-salin="' + esc(d.nomor) + '">' + ik('copy', 'sm') + 'Salin</button></div>' +
      '<div class="meta-grid"><div><div class="lbl">Jenis dokumen</div><div class="nil">' + esc(d.jenis) + '</div></div><div><div class="lbl">Tanggal diterbitkan</div><div class="nil">' + esc(U.tgl(d.tanggal)) + '</div></div>' +
      '<div style="grid-column:1/-1"><div class="lbl">Perihal</div><div class="nil">' + esc(d.perihal) + (d.perihalDisamarkan ? ' <span class="badge b-netral tanpa-titik">disamarkan</span>' : '') + '</div></div></div></div></div>' +
      '<div class="card"><div class="card-head"><div class="baris"><span class="pil-label" style="background:var(--ok-soft);color:var(--ok)">' + ik('signature', 'sm') + '</span><div><div class="overline">Otoritas penandatanganan</div><h3>Pejabat Pengesah</h3></div></div></div><div class="card-body tumpuk" style="gap:10px">' +
      ttd.map(function (p) {
        return '<div class="blok-abu' + (d.slot && Number(d.slot) === Number(p.slot) ? '" style="outline:2px solid var(--accent)' : '') + '"><div class="antara"><div><div class="overline">' + esc(p.label || 'Penanda tangan') + '</div><div style="font-size:17px;font-weight:700">' + esc(p.nama) + '</div><div class="muted kecil">' + esc(p.jabatan || '') + '</div></div>' + (d.slot && Number(d.slot) === Number(p.slot) ? '<span class="badge b-terbit">QR slot ini</span>' : '') + '</div>' +
          '<div class="mono kecil muted" style="margin-top:6px">' + ik('shield', 'sm') + ' ' + esc(metodeLabel(p.metode)) + (p.waktu ? ' · ' + esc(U.tglJam(p.waktu)) : '') + '</div></div>';
      }).join('') +
      '<div class="pemberitahuan" style="margin-top:4px">' + ik('info') + '<div>Tanda tangan pada dokumen ini adalah tanda tangan elektronik tidak tersertifikasi (spesimen/QR + persetujuan tercatat). Keasliannya dibuktikan oleh catatan di halaman ini.</div></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + ik('lock', 'sm') + ' Sidik Jari Naskah (Integritas PDF)</h3></div><div class="card-body"><p class="muted kecil">Hash SHA-256 berkas PDF saat diterbitkan. Unggah PDF yang Anda terima untuk memastikan isinya tidak diubah.</p>' +
      '<div class="kotak-hash" id="hash-asli">' + esc(d.hashPdf || '-') + '</div><div class="baris" style="margin-top:10px"><button class="btn btn-soft btn-sm" data-salin="' + esc(d.hashPdf || '') + '">' + ik('copy', 'sm') + 'Salin Hash</button>' +
      '<label class="btn btn-outline btn-sm">' + ik('upload', 'sm') + 'Cocokkan PDF<input type="file" accept="application/pdf" id="cek-pdf" hidden></label></div><div class="hasil-hash" id="hasil-hash"></div></div></div></div>' +
      '<div class="tumpuk"><div class="card card-pad"><div class="antara" style="margin-bottom:10px"><b>Salinan Lembar Surat</b><span class="badge b-netral tanpa-titik mono">Hal. 1</span></div>' +
      '<div class="pratinjau-lembar"><div class="baris-x" style="width:60%;margin:0 auto 10px"></div><div class="baris-x" style="width:80%;margin:0 auto 16px"></div>' + new Array(9).join('<div class="baris-x"></div>') +
      '<div class="cap ' + (sah ? 'sah' : 'tarik') + '">' + (sah ? 'TERVERIFIKASI' : 'DITARIK / TIDAK BERLAKU') + '</div></div>' +
      (d.unduhTersedia ? '<button class="btn btn-primary btn-blok" style="margin-top:12px" id="btn-unduh-v">' + ik('download', 'sm') + 'Unduh Salinan Digital Resmi</button>' : '<div class="muted kecil" style="margin-top:10px;text-align:center">' + ik('lock', 'sm') + ' Unduhan PDF dari halaman publik dinonaktifkan institusi.</div>') +
      '<button class="btn btn-soft btn-blok" style="margin-top:8px" id="btn-bagi">' + ik('link', 'sm') + 'Bagikan Tautan Verifikasi</button></div>' +
      '<div class="card card-pad"><b>' + ik('help', 'sm') + ' Butuh Klarifikasi?</b><p class="muted kecil" style="margin-top:6px">Lembaga penerima dapat meminta konfirmasi langsung ke ' + esc(Pub.inst().nama || 'sekretariat') + '.</p>' +
      (Pub.inst().alamat ? '<div class="kecil">' + ik('building', 'sm') + ' ' + esc(Pub.inst().alamat) + '</div>' : '') + (Pub.inst().email ? '<div class="kecil mono">' + ik('mail', 'sm') + ' ' + esc(Pub.inst().email) + '</div>' : '') + (Pub.inst().telepon ? '<div class="kecil mono">' + ik('phone', 'sm') + ' ' + esc(Pub.inst().telepon) + '</div>' : '') + '</div></div></div>';
    U.$$('[data-salin]', box).forEach(function (b) { b.addEventListener('click', function () { U.salin(b.dataset.salin); }); });
    box.querySelector('#btn-bagi').addEventListener('click', function () {
      var url = location.origin + location.pathname + '?v=' + d.kode;
      if (navigator.share) navigator.share({ title: 'Verifikasi dokumen ' + d.nomor, url: url }).catch(function () {}); else U.salin(url);
    });
    var cek = box.querySelector('#cek-pdf');
    cek.addEventListener('change', async function () {
      if (!cek.files[0]) return;
      var h = await U.sha256Berkas(cek.files[0]), out = box.querySelector('#hasil-hash');
      out.innerHTML = h === d.hashPdf ? '<span style="color:var(--ok)">' + ik('checkCircle', 'sm') + ' Cocok 100% — PDF identik dengan yang diterbitkan.</span>'
        : '<span style="color:var(--danger)">' + ik('xCircle', 'sm') + ' Tidak cocok — PDF ini berbeda dari berkas resmi (mungkin diubah, dicetak ulang, atau dipindai).</span><div class="kotak-hash" style="margin-top:6px">' + h + '</div>';
    });
    var bu = box.querySelector('#btn-unduh-v');
    if (bu) bu.addEventListener('click', function () { U.sibuk(bu, function () { return API.panggil('verifikasiUnduh', { kode: d.kode }, { tanpaToken: true }).then(function (r) { if (r.success) U.unduhBase64(r.data); else U.toast(r.message, 'galat'); }); }); });
  }

  // Lembar bukti verifikasi (cetak)
  function renderCetakBukti(root, q) {
    var kode = String((q && q.kode) || '').toUpperCase();
    root.innerHTML = shell('verifikasi', '<div class="pub-isi" style="padding-top:20px"><div class="alat-cetak baris" style="justify-content:space-between;margin-bottom:14px"><a class="btn btn-ghost btn-sm" href="#/verifikasi?kode=' + esc(kode) + '">' + ik('left', 'sm') + 'Kembali ke Hasil Verifikasi</a>' +
      '<div class="baris"><button class="btn btn-soft btn-sm" id="c-salin">' + ik('link', 'sm') + 'Salin Tautan</button><button class="btn btn-primary btn-sm" id="c-cetak">' + ik('printer', 'sm') + 'Cetak Sekarang</button></div></div>' +
      '<div class="pemberitahuan alat-cetak" style="margin-bottom:14px">' + ik('info') + '<div><b>Tips pencetakan:</b> orientasi Portrait, margin Default, aktifkan opsi "Background graphics" di jendela cetak.</div></div><div id="lembar">' + U.skel(6, 60) + '</div></div>');
    pasangShell(root);
    root.querySelector('#c-cetak').addEventListener('click', function () { window.print(); });
    root.querySelector('#c-salin').addEventListener('click', function () { U.salin(location.origin + location.pathname + '?v=' + kode); });
    API.panggil('verifikasiDokumen', { kode: kode }, { tanpaToken: true }).then(function (r) {
      var el = root.querySelector('#lembar');
      if (!r.success || !r.data.ditemukan) { el.innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>Dokumen tidak ditemukan.</div></div>'; return; }
      var d = r.data, b = Pub.b(), inst = Pub.inst(), url = location.origin + location.pathname + '?v=' + d.kode;
      var noBukti = 'VER-' + new Date().getFullYear() + '/' + d.kode + '/' + Date.now().toString(36).toUpperCase().slice(-5);
      el.innerHTML = '<div class="lembar-bukti"><div style="display:flex;gap:16px;align-items:center;border-bottom:3px double #1B4332;padding-bottom:12px">' +
        (inst.logo || b.logo ? '<img src="' + esc(inst.logo || b.logo) + '" alt="" style="width:76px;height:76px;object-fit:contain">' : '') +
        '<div><div style="font-size:12px;letter-spacing:.04em">' + esc(inst.yayasan || '') + '</div><div style="font-size:21px;font-weight:800;color:#1B4332">' + esc(inst.nama || b.nama) + '</div><div style="font-size:11px">' + esc(inst.alamat || '') + (inst.email ? ' · ' + esc(inst.email) : '') + '</div></div></div>' +
        '<div style="text-align:center;margin:18px 0 6px"><div style="font-size:19px;font-weight:800;color:#1B4332">LEMBAR BUKTI VERIFIKASI KEABSAHAN ELEKTRONIK</div><div style="font-size:12px;color:#8a6a0c;font-weight:600;letter-spacing:.04em">CERTIFICATE OF ELECTRONIC DOCUMENT VERIFICATION</div></div>' +
        '<div style="background:#F3F4F5;border:1px solid #E5E7EB;border-radius:8px;padding:10px;text-align:center;font-family:var(--mono);font-size:12px;margin:12px 0">Nomor Bukti: <b>' + esc(noBukti) + '</b><br>Waktu Verifikasi: <b>' + esc(U.tglJam(d.waktuPeriksa)) + '</b></div>' +
        '<div style="background:' + (d.status === 'TERBIT' ? '#1B4332' : '#991B1B') + ';color:#fff;border-radius:10px;padding:14px 18px;margin-bottom:14px"><b style="font-size:16px">STATUS DOKUMEN: ' + (d.status === 'TERBIT' ? 'ASLI, SAH & TERDAFTAR RESMI' : 'DITARIK — TIDAK BERLAKU') + '</b>' +
        (d.status !== 'TERBIT' ? '<div style="font-size:12px;margin-top:4px">Alasan: ' + esc(d.alasanTarik) + '</div>' : '') + '</div>' +
        '<div style="font-weight:700;color:#1B4332;font-size:13px;border-bottom:1px solid #E5E7EB;padding-bottom:4px;margin-bottom:8px">I. INFORMASI NASKAH DINAS</div>' +
        '<table style="width:100%;font-size:12.5px;border-collapse:collapse"><tr><td style="width:36%;color:#555;padding:4px 0">Nomor registrasi naskah</td><td style="font-family:var(--mono)">' + esc(d.nomor) + '</td></tr><tr><td style="color:#555;padding:4px 0">Jenis dokumen</td><td>' + esc(d.jenis) + '</td></tr><tr><td style="color:#555;padding:4px 0">Perihal</td><td>' + esc(d.perihal) + '</td></tr><tr><td style="color:#555;padding:4px 0">Tanggal diterbitkan</td><td>' + esc(U.tgl(d.tanggal)) + '</td></tr></table>' +
        '<div style="font-weight:700;color:#1B4332;font-size:13px;border-bottom:1px solid #E5E7EB;padding-bottom:4px;margin:14px 0 8px">II. PENANDA TANGAN</div>' +
        (d.penandatangan || []).map(function (p) { return '<div style="font-size:12.5px;margin-bottom:6px"><b>' + esc(p.nama) + '</b> — ' + esc(p.jabatan || '') + '<br><span style="color:#555;font-size:11.5px">' + esc(metodeLabel(p.metode)) + (p.waktu ? ', ' + esc(U.tglJam(p.waktu)) : '') + '</span></div>'; }).join('') +
        '<div style="font-weight:700;color:#1B4332;font-size:13px;border-bottom:1px solid #E5E7EB;padding-bottom:4px;margin:14px 0 8px">III. INTEGRITAS BERKAS</div><div style="font-family:var(--mono);font-size:11px;word-break:break-all;background:#F3F4F5;padding:8px;border-radius:6px">SHA-256: ' + esc(d.hashPdf) + '</div>' +
        '<div style="display:flex;gap:18px;align-items:center;margin-top:18px;border:1px solid #E5E7EB;border-radius:10px;padding:14px"><div style="width:110px;height:110px;flex:none">' + U.qrSvg(url, 110) + '</div><div style="font-size:12px"><b>PINDAI VALIDASI RESMI</b><br>Arahkan kamera ke QR untuk membuka catatan arsip asli.<br><span style="font-family:var(--mono);color:#8a6a0c">KODE: ' + esc(d.kode) + '</span></div></div>' +
        '<div style="font-size:10.5px;color:#555;margin-top:16px;border-top:1px solid #E5E7EB;padding-top:8px">Lembar ini dihasilkan otomatis oleh ' + esc(b.nama) + ' berdasarkan data arsip resmi pada waktu verifikasi di atas. Keabsahan selalu dapat dicek ulang melalui QR/kode.</div></div>';
    });
  }

  // ---------------------------------------------------------------------------
  // Bantuan & Masuk admin
  // ---------------------------------------------------------------------------
  function renderBantuan(root) {
    var inst = Pub.inst();
    var faq = [['Apakah saya perlu membuat akun?', 'Tidak. Cukup isi formulir dengan email dan nomor WhatsApp yang aktif. Nomor referensi dikirim ke keduanya.'],
      ['Berapa lama surat diproses?', 'Tergantung jenis surat dan kelengkapan berkas. Pantau setiap tahap di halaman Lacak.'],
      ['Bagaimana memastikan surat asli?', 'Pindai QR di pojok surat atau masukkan kode verifikasi di halaman Verifikasi Dokumen.'],
      ['Permohonan saya diminta diperbaiki, apa yang harus dilakukan?', 'Buka halaman Lacak, masukkan nomor referensi + email, lalu kirim perbaikan dalam batas waktu yang tertera.']];
    root.innerHTML = shell('bantuan', '<div class="pub-isi"><div class="hal-pub"><div class="overline emas titik-emas">Layanan bantuan</div><h1>Pertanyaan yang Sering Diajukan</h1></div><div class="grid-3-1"><div class="card">' +
      faq.map(function (f) { return '<details style="padding:16px 20px;border-bottom:1px solid var(--hairline)"><summary style="font-weight:700;cursor:pointer">' + esc(f[0]) + '</summary><p class="muted" style="margin:8px 0 0">' + esc(f[1]) + '</p></details>'; }).join('') +
      '</div><div class="card card-pad"><b>Kontak Sekretariat</b><div class="tumpuk" style="gap:6px;margin-top:10px">' + (inst.nama ? '<div>' + ik('building', 'sm') + ' ' + esc(inst.nama) + '</div>' : '') + (inst.alamat ? '<div class="muted kecil">' + esc(inst.alamat) + '</div>' : '') +
      (inst.email ? '<a href="mailto:' + esc(inst.email) + '">' + ik('mail', 'sm') + ' ' + esc(inst.email) + '</a>' : '') + (inst.telepon ? '<div>' + ik('phone', 'sm') + ' ' + esc(inst.telepon) + '</div>' : '') + '</div></div></div></div>');
    pasangShell(root);
  }

  var _gisSiap = null;
  function renderMasuk(root, q) {
    var b = Pub.b();
    root.innerHTML = shell('', '<div class="pub-isi" style="max-width:520px;padding-top:48px;padding-bottom:20px"><div class="card"><div class="card-body" style="text-align:center;padding:32px 28px">' +
      '<div class="merek" style="justify-content:center;margin-bottom:14px">' + logoHtml() + '</div><h1 style="font-size:22px;font-weight:800">Masuk Panel ' + esc(b.nama) + '</h1>' +
      '<p class="muted" style="margin-top:6px">Khusus Super Admin, Admin (Sekretaris), dan Pimpinan yang terdaftar.</p>' +
      (q && q.pesan ? '<div class="pemberitahuan warn" style="margin:14px 0;text-align:left">' + ik('alert') + '<div>' + esc(q.pesan) + '</div></div>' : '') +
      '<div id="gis-tombol" style="display:flex;justify-content:center;min-height:44px;margin-top:18px"><div class="skel" style="width:260px;height:44px;border-radius:99px"></div></div>' +
      '<div id="masuk-info" class="muted kecil" style="margin-top:12px"></div><div id="darurat"></div>' +
      '<div class="garis-tipis"></div><div class="muted kecil">' + ik('shield', 'sm') + ' Login memakai akun Google (OAuth 2.0). Kata sandi Google tidak pernah dikirim ke aplikasi ini.</div></div></div>' +
      '<div style="text-align:center;margin-top:14px"><a href="#/" class="muted kecil">← Kembali ke beranda</a></div></div>');
    pasangShell(root);
    API.warmUp('admin');
    API.panggil('infoLogin', {}, { tanpaToken: true }).then(function (r) {
      var box = root.querySelector('#gis-tombol'); if (!box) return;
      if (!r.success) { box.innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
      if (r.data.loginSandiAktif) pasangDarurat(root);
      if (!r.data.googleClientId) { box.innerHTML = '<div class="pemberitahuan warn" style="text-align:left">' + ik('alert') + '<div>Login Google belum dikonfigurasi. Super Admin perlu menjalankan <b>ATUR_LOGIN_GOOGLE</b> di editor Apps Script.</div></div>'; return; }
      _gisSiap = _gisSiap || U.muatSkrip('https://accounts.google.com/gsi/client');
      _gisSiap.then(function () {
        if (!root.querySelector('#gis-tombol')) return;
        google.accounts.id.initialize({ client_id: r.data.googleClientId, callback: function (resp) { prosesLogin(root, resp.credential); }, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, itp_support: true });
        box.innerHTML = '';
        google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'id', width: Math.min(320, box.clientWidth || 300) });
      }).catch(function () { box.innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>Tombol Google gagal dimuat. Periksa koneksi atau pemblokir iklan.</div></div>'; });
    });
  }

  function pasangDarurat(root) {
    var el = root.querySelector('#darurat'); if (!el) return;
    el.innerHTML = '<details style="margin-top:16px;text-align:left"><summary class="kecil muted" style="cursor:pointer">Akses darurat (sandi)</summary><form id="f-darurat" class="tumpuk" style="gap:10px;margin-top:10px">' +
      '<input class="input" name="u" placeholder="Nama pengguna darurat" autocomplete="username"><input class="input" name="p" type="password" placeholder="Kata sandi" autocomplete="current-password"><button class="btn btn-outline">Masuk Darurat</button></form></details>';
    el.querySelector('#f-darurat').addEventListener('submit', function (e) {
      e.preventDefault(); var f = this, btn = f.querySelector('button');
      U.sibuk(btn, function () { return API.panggil('login', { username: f.u.value, password: f.p.value }, { tanpaToken: true }).then(function (r) { selesaiLogin(r); }); });
    });
  }

  function prosesLogin(root, credential) {
    var info = root.querySelector('#masuk-info');
    if (info) info.innerHTML = '<span class="spin" style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:putar .7s linear infinite;vertical-align:middle"></span> Memverifikasi akun Google…';
    API.panggil('loginGoogle', { credential: credential, appUrl: location.origin + location.pathname }, { tanpaToken: true }).then(function (r) {
      if (!r.success && info) info.innerHTML = '<span style="color:var(--danger)">' + esc(r.message) + '</span>';
      selesaiLogin(r);
    });
  }

  function selesaiLogin(r) {
    if (!r.success) { U.toast(r.message, 'galat'); return; }
    Sesi.set({ token: r.data.token, user: r.data.user, exp: r.data.exp, masuk: Date.now() });
    if (r.data.snapshot) { r.data.snapshot._t = Date.now(); Simpan.set('snap_' + r.data.user.email, r.data.snapshot); }
    U.toast(r.message || 'Berhasil masuk.', 'ok');
    location.hash = '#/admin/dashboard';
  }

  Pub.render = {
    beranda: renderBeranda, lacak: renderLacak, verifikasi: renderVerifikasi, cetak: renderCetakBukti, masuk: renderMasuk, bantuan: renderBantuan
  };
})();
