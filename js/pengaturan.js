/**
 * pengaturan.js — Pengaturan: Institusi & kop, Branding (pratinjau langsung), Pengguna,
 * Pejabat TTD (spesimen, PIN, TTE), Jenis Surat (format nomor), Template Dokumen,
 * Portal publik (hero, pengumuman, berkas), Dokumen & verifikasi, Email masuk, Keamanan
 * (rahasia Script Properties — hanya tampil tersamar).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon, A = window.Admin;
  var SA = ['SUPER_ADMIN'], ADM = ['SUPER_ADMIN', 'ADMIN'];
  var TAB = [
    { k: 'institusi', l: 'Institusi & Kop', i: 'building', p: SA },
    { k: 'branding', l: 'Branding Aplikasi', i: 'image', p: SA },
    { k: 'pengguna', l: 'Pengguna & Peran', i: 'users', p: SA },
    { k: 'pejabat', l: 'Pejabat Penanda Tangan', i: 'signature', p: SA },
    { k: 'jenis', l: 'Jenis Surat & Nomor', i: 'hash', p: SA },
    { k: 'template', l: 'Template Dokumen', i: 'layers', p: ADM },
    { k: 'portal', l: 'Portal Publik', i: 'globe', p: SA },
    { k: 'dokumen', l: 'Dokumen & Verifikasi', i: 'qr', p: SA },
    { k: 'email', l: 'Email Masuk', i: 'mail', p: SA },
    { k: 'keamanan', l: 'Keamanan & Rahasia', i: 'shield', p: SA }
  ];

  A.daftar('pengaturan', {
    judul: 'Pengaturan', tanpaRenderUlang: true,
    render: function (el, ctx) {
      var tabs = TAB.filter(function (t) { return t.p.indexOf(A.peran()) >= 0; });
      var st = ctx.state;
      var k = ctx.sub || st.tab || tabs[0].k;
      if (!tabs.some(function (t) { return t.k === k; })) k = tabs[0].k;
      st.tab = k;
      el.innerHTML = '<div class="set-root">' + A.kepala({ overline: 'Sistem', judul: 'Pengaturan', desk: 'Perubahan tersimpan di AppConfig/Master; rahasia hanya di Script Properties.' }) +
        '<div class="tab-vertikal"><nav aria-label="Bagian pengaturan">' + tabs.map(function (t) { return '<button data-t="' + t.k + '" class="' + (t.k === k ? 'aktif' : '') + '">' + ik(t.i, 'sm') + esc(t.l) + '</button>'; }).join('') + '</nav><div id="set-isi"></div></div></div>';
      var R = el.querySelector('.set-root');
      U.$$('nav button', R).forEach(function (b) { b.addEventListener('click', function () { history.replaceState(null, '', '#/admin/pengaturan/' + b.dataset.t); A.rute.sub = b.dataset.t; st.tab = b.dataset.t; U.$$('nav button', R).forEach(function (x) { x.classList.toggle('aktif', x === b); }); bagian(R.querySelector('#set-isi'), b.dataset.t); }); });
      bagian(R.querySelector('#set-isi'), k);
    }
  });

  function bagian(box, k) {
    box.innerHTML = '';
    var f = { institusi: tabInstitusi, branding: tabBranding, pengguna: tabPengguna, pejabat: tabPejabat, jenis: tabJenis, template: function (b) { var w = document.createElement('div'); w.className = 'card card-pad'; b.appendChild(w); DocEngineUI.renderTemplate(w); }, portal: tabPortal, dokumen: tabDokumen, email: tabEmail, keamanan: tabKeamanan }[k];
    if (f) f(box);
  }

  // ---------------------------------------------------------------------------
  // Pembantu: formulir konfigurasi & tabel master
  // ---------------------------------------------------------------------------
  function kartu(judul, desk, isi) { return '<div class="card" style="margin-bottom:16px"><div class="card-head"><div><h3>' + esc(judul) + '</h3>' + (desk ? '<div class="muted kecil">' + desk + '</div>' : '') + '</div></div><div class="card-body">' + isi + '</div></div>'; }
  function formConfig(box, judul, desk, fields, setelah) {
    var w = document.createElement('div');
    w.innerHTML = kartu(judul, desk, '<div class="grid-form">' + fields.map(function (f) {
      var v = A.cfg(f.k, f.bawaan === undefined ? '' : f.bawaan), id = 'cf-' + f.k;
      if (f.tipe === 'saklar') return '<div class="field' + (f.penuh ? ' penuh' : '') + '"><label class="saklar"><input type="checkbox" data-cf="' + f.k + '" data-tipe="saklar"' + (String(v) === 'true' ? ' checked' : '') + '><span class="jalur"></span>' + esc(f.l) + '</label>' + (f.bantu ? '<div class="bantu">' + esc(f.bantu) + '</div>' : '') + '</div>';
      var inp = f.tipe === 'area' ? '<textarea class="textarea" id="' + id + '" data-cf="' + f.k + '">' + esc(v) + '</textarea>'
        : f.tipe === 'pilihan' ? '<select class="select" id="' + id + '" data-cf="' + f.k + '">' + f.opsi.map(function (o) { var ov = typeof o === 'string' ? o : o[0], ol = typeof o === 'string' ? o : o[1]; return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>'
          : '<input class="input' + (f.mono ? ' mono' : '') + '" id="' + id + '" data-cf="' + f.k + '" type="' + (f.tipe === 'angka' ? 'number' : 'text') + '" value="' + esc(v) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
      return '<div class="field' + (f.penuh ? ' penuh' : '') + '"><label for="' + id + '">' + esc(f.l) + '</label>' + inp + (f.bantu ? '<div class="bantu">' + esc(f.bantu) + '</div>' : '') + '</div>';
    }).join('') + '</div><div class="baris" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" data-simpan data-muat="Menyimpan…">' + ik('save', 'sm') + 'Simpan</button></div>');
    box.appendChild(w);
    w.querySelector('[data-simpan]').addEventListener('click', function () {
      var c = {};
      U.$$('[data-cf]', w).forEach(function (i) {
        var nv = i.dataset.tipe === 'saklar' ? String(i.checked) : i.value.trim();
        var lama = String(A.cfg(i.dataset.cf, i.dataset.tipe === 'saklar' ? 'false' : ''));
        if (nv !== lama) c[i.dataset.cf] = nv;
      });
      if (!Object.keys(c).length) { U.toast('Tidak ada perubahan.', 'info'); return; }
      var b = this;
      U.sibuk(b, function () { return API.panggil('simpanConfig', { config: c }).then(function (r) { if (!U.hasil(r)) return; A.setConfig(r.data.config); if (setelah) setelah(c); }); });
    });
    return w;
  }

  /** o: {master, judul, desk, kolom, fields, siapkan(v, rec, berkas)→Promise, aksiBaris(rec)→html, pasangBaris(w, rows), tombolBaru} */
  function tabelMaster(box, o) {
    var w = document.createElement('div'); box.appendChild(w);
    var gambar = function () {
      var rows = A.master(o.master).slice();
      if (o.urut) rows.sort(o.urut);
      w.innerHTML = '<div class="antara" style="margin-bottom:12px;flex-wrap:wrap"><div><h3 style="font-size:17px">' + esc(o.judul) + '</h3>' + (o.desk ? '<div class="muted kecil">' + o.desk + '</div>' : '') + '</div><button class="btn btn-gold btn-sm" data-baru>' + ik('plus', 'sm') + esc(o.tombolBaru || 'Tambah') + '</button></div>' +
        A.tabel({ rows: rows, kolom: o.kolom.concat([{ l: '', f: function (r) { return '<div class="baris" style="gap:4px;justify-content:flex-end">' + (o.aksiBaris ? o.aksiBaris(r) : '') + '<button class="btn btn-ghost btn-xs" data-ubah="' + esc(r.id) + '" aria-label="Ubah">' + ik('edit', 'sm') + '</button><button class="btn btn-ghost btn-xs" data-hapus="' + esc(r.id) + '" aria-label="Hapus">' + ik('trash', 'sm') + '</button></div>'; } }]), kosong: 'Belum ada data.', klik: false });
      w.querySelector('[data-baru]').addEventListener('click', function () { form(null); });
      U.$$('[data-ubah]', w).forEach(function (b) { b.addEventListener('click', function () { form(rows.filter(function (r) { return r.id === b.dataset.ubah; })[0]); }); });
      U.$$('[data-hapus]', w).forEach(function (b) {
        b.addEventListener('click', function () {
          U.konfirmasi('Hapus data?', 'Data master dihapus permanen. Untuk data yang sudah dipakai, sebaiknya nonaktifkan saja.', { bahaya: true, ya: 'Hapus' }).then(function (y) {
            if (y) API.panggil('masterHapus', { master: o.master, id: b.dataset.hapus }).then(function (r) { if (U.hasil(r)) { A.setMaster(o.master, r.data); gambar(); if (o.setelah) o.setelah(); } });
          });
        });
      });
      if (o.pasangBaris) o.pasangBaris(w, rows, gambar);
    };
    var form = function (rec) {
      var nilai = rec ? Object.assign({}, rec) : Object.assign({}, o.bawaan || {});
      Object.keys(nilai).forEach(function (k) { if (typeof nilai[k] === 'boolean') nilai[k] = String(nilai[k]); });
      Surat.formModal({ judul: (rec ? 'Ubah ' : 'Tambah ') + o.judulSatuan, sub: rec ? (rec.nama || rec.kode || rec.judul || '') : '', ikon: o.ikon, nilai: nilai, fields: typeof o.fields === 'function' ? o.fields(rec) : o.fields,
        simpan: async function (v, berkas) {
          if (rec) v.id = rec.id;
          if (o.siapkan) { var cek = await o.siapkan(v, rec, berkas); if (cek === false) return { success: false }; }
          var r = await API.panggil('masterSimpan', { master: o.master, record: v });
          if (U.hasil(r)) { A.setMaster(o.master, r.data); gambar(); if (o.setelah) o.setelah(); }
          return r;
        } });
    };
    gambar();
  }
  var YA_TIDAK = [{ v: 'true', l: 'Ya' }, { v: 'false', l: 'Tidak' }];
  function aktifBadge(r) { return String(r.aktif) === 'false' ? '<span class="badge b-draf">Nonaktif</span>' : '<span class="badge b-terbit">Aktif</span>'; }
  function segarPublik() { if (window.Pub) Pub.muat(true); }

  // ---------------------------------------------------------------------------
  // Institusi & kop
  // ---------------------------------------------------------------------------
  function tabInstitusi(box) {
    formConfig(box, 'Identitas Institusi', 'Dipakai di kop surat, portal, email, dan halaman verifikasi.', [
      { k: 'INSTITUSI_NAMA', l: 'Nama institusi', penuh: true }, { k: 'INSTITUSI_SINGKATAN', l: 'Singkatan' }, { k: 'INSTITUSI_KODE', l: 'Kode untuk nomor surat {INSTITUSI}', mono: true },
      { k: 'INSTITUSI_YAYASAN', l: 'Yayasan / baris atas kop' }, { k: 'INSTITUSI_KOTA', l: 'Kota (tempat tanda tangan)' }, { k: 'INSTITUSI_ALAMAT', l: 'Alamat', penuh: true },
      { k: 'INSTITUSI_TELEPON', l: 'Telepon' }, { k: 'INSTITUSI_EMAIL', l: 'Email resmi' }, { k: 'INSTITUSI_WEBSITE', l: 'Website' }, { k: 'INSTITUSI_AKREDITASI', l: 'Akreditasi' }, { k: 'TAHUN_AKADEMIK', l: 'Tahun akademik', mono: true }
    ], segarPublik);
    var inst = (window.Pub && Pub.inst()) || {};
    var w = document.createElement('div');
    w.innerHTML = kartu('Logo Kop Surat', 'Terpisah dari logo aplikasi. PNG/JPG transparan, disarankan ≥ 300 px.', '<div class="baris" style="gap:18px"><div style="width:96px;height:96px;border:1px dashed var(--border-strong);border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff" id="lk-pratinjau">' + (inst.logo ? '<img src="' + esc(inst.logo) + '" alt="" style="max-width:88px;max-height:88px">' : ik('image', 'xl')) + '</div>' +
      '<label class="btn btn-outline">' + ik('upload', 'sm') + 'Pilih logo<input type="file" accept="image/png,image/jpeg,image/webp" id="lk-file" hidden></label></div>');
    box.appendChild(w);
    w.querySelector('#lk-file').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      U.kompresGambar(f, 600, f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png').then(function (b) {
        return API.panggil('unggahLogo', { nama: b.nama, base64: b.base64 }).then(function (r) { if (U.hasil(r)) { A.setConfig(r.data.config); w.querySelector('#lk-pratinjau').innerHTML = '<img src="' + b.dataUrl + '" alt="" style="max-width:88px;max-height:88px">'; segarPublik(); } });
      }).catch(function (e) { U.toast(e.message, 'galat'); });
    });
  }

  // ---------------------------------------------------------------------------
  // Branding
  // ---------------------------------------------------------------------------
  function tabBranding(box) {
    var b = (window.Pub && Pub.b()) || {};
    var st = { nama: A.cfg('APP_NAME', b.nama || 'SURAT DIGITAL'), tagline: A.cfg('APP_TAGLINE', b.tagline || ''), warnaUtama: A.cfg('APP_WARNA_UTAMA', '#1B4332'), warnaAksen: A.cfg('APP_WARNA_AKSEN', '#D4A017'), logo: b.logo || '', logoBaru: null, favBaru: null, hapusLogo: false };
    var w = document.createElement('div');
    w.innerHTML = '<div class="grid-2"><div>' + kartu('Identitas Aplikasi', 'Tampil di portal, halaman masuk, panel, tab peramban, dan email.', '<div class="tumpuk" style="gap:14px">' +
      '<div class="field"><label>Nama aplikasi (3–40)</label><input class="input" id="br-nama" maxlength="40" value="' + esc(st.nama) + '"></div>' +
      '<div class="field"><label>Tagline (maks. 80)</label><input class="input" id="br-tag" maxlength="80" value="' + esc(st.tagline) + '"></div>' +
      '<div class="grid-form"><div class="field"><label>Warna utama</label><div class="baris" style="flex-wrap:nowrap"><input type="color" id="br-w1c" value="' + esc(st.warnaUtama) + '" style="width:44px;height:40px;border:0;background:none;padding:0"><input class="input mono" id="br-w1" value="' + esc(st.warnaUtama) + '" maxlength="7"></div></div>' +
      '<div class="field"><label>Warna aksen</label><div class="baris" style="flex-wrap:nowrap"><input type="color" id="br-w2c" value="' + esc(st.warnaAksen) + '" style="width:44px;height:40px;border:0;background:none;padding:0"><input class="input mono" id="br-w2" value="' + esc(st.warnaAksen) + '" maxlength="7"></div></div></div>' +
      '<div class="baris"><label class="btn btn-outline btn-sm">' + ik('upload', 'sm') + 'Logo aplikasi<input type="file" id="br-logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden></label><label class="btn btn-ghost btn-sm">' + ik('image', 'sm') + 'Favicon<input type="file" id="br-fav" accept="image/png,image/svg+xml" hidden></label>' + (st.logo ? '<button class="btn btn-ghost btn-sm" id="br-hapuslogo">' + ik('trash', 'sm') + 'Hapus logo</button>' : '') + '</div>' +
      '<div class="baris" style="justify-content:space-between;margin-top:6px"><button class="btn btn-ghost btn-sm" id="br-reset">' + ik('rotate', 'sm') + 'Kembalikan bawaan</button><button class="btn btn-primary" id="br-simpan" data-muat="Menyimpan…">' + ik('save', 'sm') + 'Simpan Branding</button></div></div>') + '</div>' +
      '<div>' + kartu('Pratinjau', 'Langsung berubah saat Anda mengetik.', '<div id="br-prev"></div>') + '</div></div>';
    box.appendChild(w);
    var $ = function (s) { return w.querySelector(s); };
    var prev = function () {
      var lg = st.hapusLogo ? '' : (st.logoBaru ? st.logoBaru.dataUrl : st.logo);
      var logo = '<span style="width:34px;height:34px;border-radius:9px;background:' + esc(st.warnaUtama) + ';display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;flex:none">' + (lg ? '<img src="' + esc(lg) + '" style="width:100%;height:100%;object-fit:contain;background:#fff">' : ik('shield', 'sm')) + '</span>';
      $('#br-prev').innerHTML = '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden"><div style="display:flex;gap:10px;align-items:center;padding:10px 12px;background:var(--surface)">' + logo + '<div><b>' + esc(st.nama) + '</b> <span class="resmi">RESMI</span><div class="kecil muted">' + esc(st.tagline) + '</div></div></div>' +
        '<div style="padding:22px 14px;text-align:center;color:#fff;background:linear-gradient(135deg,' + esc(st.warnaUtama) + ',#23563F)"><b style="font-size:16px">Layanan Persuratan Resmi</b><div style="margin-top:10px"><span style="background:' + esc(st.warnaAksen) + ';padding:6px 12px;border-radius:7px;font-size:12px;font-weight:700">Ajukan Permohonan</span></div></div>' +
        '<div style="display:flex"><div style="width:42%;background:' + esc(st.warnaUtama) + ';filter:brightness(.8);padding:10px;color:#fff;font-size:11px"><div style="display:flex;gap:6px;align-items:center">' + logo + '<b>' + esc(st.nama) + '</b></div><div style="margin-top:10px;border-left:3px solid ' + esc(st.warnaAksen) + ';padding:5px 8px;background:rgba(255,255,255,.12);border-radius:5px">Dashboard</div></div><div style="flex:1;padding:10px;font-size:11px" class="muted">Panel admin</div></div></div>';
    };
    var sinkron = function (a, b2, k) { $(a).addEventListener('input', function () { var v = this.value; if (/^#[0-9a-f]{6}$/i.test(v)) { st[k] = v.toUpperCase(); $(b2).value = st[k]; prev(); } }); };
    sinkron('#br-w1c', '#br-w1', 'warnaUtama'); sinkron('#br-w1', '#br-w1c', 'warnaUtama'); sinkron('#br-w2c', '#br-w2', 'warnaAksen'); sinkron('#br-w2', '#br-w2c', 'warnaAksen');
    $('#br-nama').addEventListener('input', function () { st.nama = this.value; prev(); });
    $('#br-tag').addEventListener('input', function () { st.tagline = this.value; prev(); });
    $('#br-logo').addEventListener('change', function () { var f = this.files[0]; if (!f) return; U.kompresGambar(f, 512).then(function (b2) { st.logoBaru = b2; st.hapusLogo = false; prev(); }).catch(function (e) { U.toast(e.message, 'galat'); }); });
    $('#br-fav').addEventListener('change', function () { var f = this.files[0]; if (!f) return; U.kompresGambar(f, 128, 'image/png').then(function (b2) { st.favBaru = b2; U.toast('Favicon dipilih — klik Simpan.', 'info'); }); });
    var hl = $('#br-hapuslogo'); if (hl) hl.addEventListener('click', function () { st.hapusLogo = true; st.logoBaru = null; prev(); });
    var selesai = function (r) {
      if (!U.hasil(r)) return;
      A.setConfig(r.data.config);
      if (window.Pub) { Pub.data = Pub.data || {}; Pub.data.branding = r.data.branding; Simpan.set('pub', Pub.data); Pub.terapkanBranding(); }
      var app = document.getElementById('app'); if (app) { app.innerHTML = ''; }
      App.mulai();
    };
    $('#br-simpan').addEventListener('click', function () {
      var d = { nama: $('#br-nama').value.trim(), tagline: $('#br-tag').value.trim(), warnaUtama: st.warnaUtama, warnaAksen: st.warnaAksen };
      if (d.nama.length < 3) { U.toast('Nama app minimal 3 karakter.', 'galat'); return; }
      if (st.logoBaru) { d.logoBase64 = st.logoBaru.base64; d.logoNama = st.logoBaru.nama; }
      if (st.favBaru) { d.faviconBase64 = st.favBaru.base64; d.faviconNama = st.favBaru.nama; }
      if (st.hapusLogo) d.hapusLogo = true;
      U.sibuk(this, function () { return API.panggil('brandingSimpan', d).then(selesai); });
    });
    $('#br-reset').addEventListener('click', function () { U.konfirmasi('Kembalikan branding bawaan?', 'Nama, tagline, warna, logo, dan favicon kembali ke bawaan SURAT DIGITAL.', { ya: 'Kembalikan' }).then(function (y) { if (y) API.panggil('brandingSimpan', { reset: true }).then(selesai); }); });
    prev();
  }

  // ---------------------------------------------------------------------------
  // Pengguna
  // ---------------------------------------------------------------------------
  function tabPengguna(box) {
    var c = document.createElement('div'); c.className = 'card card-pad'; box.appendChild(c);
    c.insertAdjacentHTML('beforeend', '<div class="pemberitahuan" style="margin-bottom:14px">' + ik('info') + '<div>Pengguna masuk dengan <b>akun Google</b> yang emailnya terdaftar di sini. Peran dibaca langsung setiap permintaan — perubahan peran/nonaktif berlaku seketika. Pemohon publik tidak perlu akun.</div></div>');
    tabelMaster(c, { master: 'pengguna', judul: 'Pengguna Panel', judulSatuan: 'Pengguna', ikon: 'user', tombolBaru: 'Tambah Pengguna', bawaan: { peran: 'ADMIN', aktif: 'true' },
      kolom: [{ l: 'Nama', f: function (r) { return '<b style="font-weight:600">' + esc(r.nama) + '</b><div class="muted kecil">' + esc(r.jabatan || '') + '</div>'; } }, { l: 'Email Google', k: 'email', kelas: 'mono' },
        { l: 'Peran', f: function (r) { return '<span class="badge ' + (r.peran === 'SUPER_ADMIN' ? 'b-ttd' : r.peran === 'PIMPINAN' ? 'b-diproses' : 'b-netral') + ' tanpa-titik">' + esc(A.PERAN_LABEL[r.peran] || r.peran) + '</span>'; } }, { l: 'Status', f: aktifBadge }],
      fields: [{ k: 'nama', l: 'Nama', wajib: true }, { k: 'email', l: 'Email akun Google', wajib: true, mono: true }, { k: 'peran', l: 'Peran', tipe: 'pilihan', opsi: [{ v: 'SUPER_ADMIN', l: 'Super Admin — semua akses' }, { v: 'ADMIN', l: 'Admin / Sekretaris — operasional' }, { v: 'PIMPINAN', l: 'Pimpinan — baca + tanda tangan' }] }, { k: 'jabatan', l: 'Jabatan' }, { k: 'aktif', l: 'Aktif', tipe: 'pilihan', opsi: YA_TIDAK }] });
  }

  // ---------------------------------------------------------------------------
  // Pejabat
  // ---------------------------------------------------------------------------
  function tabPejabat(box) {
    var c = document.createElement('div'); c.className = 'card card-pad'; box.appendChild(c);
    var tte = A.cfgBool('TTE_AKTIF', false);
    tabelMaster(c, { master: 'pejabat', judul: 'Pejabat Penanda Tangan', judulSatuan: 'Pejabat', ikon: 'signature', tombolBaru: 'Tambah Pejabat', desk: 'Email pejabat = email login Google untuk menyetujui dokumen dengan PIN.', bawaan: { aktif: 'true', urutan: 1 },
      urut: function (a, b) { return (Number(a.urutan) || 9) - (Number(b.urutan) || 9); },
      kolom: [{ l: 'Pejabat', f: function (r) { return '<b style="font-weight:600">' + esc([r.nama, r.gelar].filter(String).join(', ')) + '</b><div class="muted kecil">' + esc(r.jabatan) + (r.nidn ? ' · NIDN ' + esc(r.nidn) : '') + '</div>'; } },
        { l: 'Email', f: function (r) { return r.email ? '<span class="mono kecil">' + esc(r.email) + '</span>' : '<span class="muted kecil">— (tidak bisa menyetujui sendiri)</span>'; } },
        { l: 'Spesimen', f: function (r) { return r.fileTtdId ? '<span class="badge b-terbit tanpa-titik">' + ik('check', 'sm') + ' ada</span>' : '<span class="badge b-draf tanpa-titik">belum</span>'; } },
        { l: 'PIN', f: function (r) { return r.pinAktif ? '<span class="badge b-terbit tanpa-titik">aktif</span>' : '<span class="badge b-draf tanpa-titik">belum</span>'; } },
        tte ? { l: 'TTE', f: function (r) { return String(r.tteResmiAktif) === 'true' ? '<span class="badge b-diproses tanpa-titik">' + esc(r.tteStatus || 'aktif') + '</span>' : '-'; } } : null,
        { l: 'Masa jabatan', f: function (r) { return r.mulai || r.selesai ? '<span class="kecil">' + esc(r.mulai ? U.tglPendek(r.mulai) : '…') + ' – ' + esc(r.selesai ? U.tglPendek(r.selesai) : 'sekarang') + '</span>' : '-'; } }, { l: 'Status', f: aktifBadge }].filter(Boolean),
      aksiBaris: function (r) { return (r.fileTtdId ? '<button class="btn btn-ghost btn-xs" data-spesimen="' + esc(r.fileTtdId) + '" title="Lihat spesimen" aria-label="Lihat spesimen">' + ik('eye', 'sm') + '</button>' : '') + (r.pinAktif ? '<button class="btn btn-ghost btn-xs" data-resetpin="' + esc(r.id) + '" title="Reset PIN" aria-label="Reset PIN">' + ik('key', 'sm') + '</button>' : '') + (tte && String(r.tteResmiAktif) === 'true' ? '<button class="btn btn-ghost btn-xs" data-cektte="' + esc(r.id) + '" title="Cek sertifikat TTE">' + ik('shield', 'sm') + '</button>' : ''); },
      pasangBaris: function (w, rows, gambar) {
        U.$$('[data-spesimen]', w).forEach(function (b) { b.addEventListener('click', function () { A.bukaBerkas(b.dataset.spesimen, 'Spesimen tanda tangan', b); }); });
        U.$$('[data-resetpin]', w).forEach(function (b) { b.addEventListener('click', function () { U.konfirmasi('Reset PIN pejabat?', 'Pejabat harus mengatur PIN baru sebelum dapat menyetujui dokumen.', { ya: 'Reset PIN' }).then(function (y) { if (y) API.panggil('ttdResetPin', { pejabatId: b.dataset.resetpin }).then(function (r) { if (U.hasil(r)) { A.setMaster('pejabat', r.data.master); gambar(); } }); }); }); });
        U.$$('[data-cektte]', w).forEach(function (b) { b.addEventListener('click', function () { U.sibuk(b, function () { return API.panggil('tteCekPejabat', { pejabatId: b.dataset.cektte }).then(function (r) { if (U.hasil(r)) { A.setMaster('pejabat', r.data.master); gambar(); } }); }); }); });
      },
      fields: function () {
        return [{ k: 'nama', l: 'Nama lengkap', wajib: true }, { k: 'gelar', l: 'Gelar (ditulis setelah nama)' }, { k: 'jabatan', l: 'Jabatan', wajib: true }, { k: 'nidn', l: 'NIDN / NIP', mono: true },
          { k: 'email', l: 'Email Google pejabat', mono: true, bantu: 'Untuk persetujuan TTD (Google + PIN) dan notifikasi.' }, { k: 'urutan', l: 'Urutan tampil', tipe: 'angka' },
          { k: 'mulai', l: 'Mulai menjabat', tipe: 'tanggal' }, { k: 'selesai', l: 'Selesai menjabat', tipe: 'tanggal', bantu: 'Dipakai slot "menurut jabatan pada tanggal dokumen".' },
          { k: 'aktif', l: 'Aktif', tipe: 'pilihan', opsi: YA_TIDAK },
          { k: '_ttd', l: 'Spesimen tanda tangan (PNG transparan disarankan)', tipe: 'berkas', accept: 'image/png,image/jpeg,image/webp' }]
          .concat(tte ? [{ k: 'tteResmiAktif', l: 'Memiliki sertifikat TTE resmi', tipe: 'pilihan', opsi: [{ v: 'false', l: 'Tidak' }, { v: 'true', l: 'Ya' }] }, { k: 'tteIdPengguna', l: 'ID pengguna di PSrE', mono: true }, { k: 'tteEmail', l: 'Email akun PSrE', mono: true }] : []);
      },
      siapkan: async function (v, rec, berkas) {
        if (berkas._ttd) { var b = await U.kompresGambar(berkas._ttd, 900, berkas._ttd.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'); v.ttdBase64 = b.base64; v.ttdNama = b.nama; }
      } });
  }

  // ---------------------------------------------------------------------------
  // Jenis surat & penomoran
  // ---------------------------------------------------------------------------
  function contohNomor(fmt, kode) {
    var d = new Date(), rom = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][d.getMonth()];
    return String(fmt || '').replace(/\{NOMOR\}/g, '001').replace(/\{KODE\}/g, kode || 'KODE').replace(/\{INSTITUSI\}/g, A.cfg('INSTITUSI_KODE', 'INST')).replace(/\{ROMAWI\}/g, rom)
      .replace(/\{TAHUN\}/g, d.getFullYear()).replace(/\{BULAN\}/g, String(d.getMonth() + 1).padStart(2, '0')).replace(/\{TANGGAL\}/g, String(d.getDate()).padStart(2, '0'));
  }
  function tabJenis(box) {
    var c = document.createElement('div'); c.className = 'card card-pad'; box.appendChild(c);
    var MODUL = [{ v: 'SURAT_KELUAR', l: 'Surat Keluar' }, { v: 'SK', l: 'Surat Keputusan' }, { v: 'BA', l: 'Berita Acara' }, { v: 'DOKUMEN', l: 'Dokumen & Sertifikat' }, { v: 'MOU', l: 'MOU' }];
    tabelMaster(c, { master: 'jenisSurat', judul: 'Jenis Surat & Penomoran', judulSatuan: 'Jenis Surat', ikon: 'hash', tombolBaru: 'Tambah Jenis',
      desk: 'Token format: <span class="mono">{NOMOR} {KODE} {INSTITUSI} {ROMAWI} {TAHUN} {BULAN} {TANGGAL}</span>. Nomor direset tiap tahun & dikunci saat terbit.',
      bawaan: { modul: 'SURAT_KELUAR', formatNomor: '{NOMOR}/{KODE}/{INSTITUSI}/{ROMAWI}/{TAHUN}', aktif: 'true', pakaiQr: 'true', bisaDiajukanPublik: 'false', lampiranPublik: 'opsional', samarkanPerihal: 'false' },
      urut: function (a, b) { return String(a.modul + a.kode).localeCompare(String(b.modul + b.kode)); },
      kolom: [{ l: 'Kode', k: 'kode', kelas: 'mono' }, { l: 'Nama', f: function (r) { return '<b style="font-weight:600">' + esc(r.nama) + '</b><div class="muted kecil">' + esc((MODUL.filter(function (m) { return m.v === r.modul; })[0] || {}).l || r.modul) + '</div>'; } },
        { l: 'Format → contoh', f: function (r) { return '<span class="mono kecil">' + esc(r.formatNomor) + '</span><div class="mono kecil muted">' + esc(contohNomor(r.formatNomor, r.kode)) + '</div>'; } },
        { l: 'Terpakai', f: function (r) { return '<span class="mono">' + esc(r.nomorBerjalan || 0) + '</span> <span class="muted kecil">(' + esc(r.tahunBerjalan || '-') + ')</span>'; } },
        { l: 'Publik', f: function (r) { return String(r.bisaDiajukanPublik) === 'true' ? '<span class="badge b-diproses tanpa-titik">portal</span>' : '-'; } }, { l: 'Status', f: aktifBadge }],
      fields: function (rec) {
        return [{ k: 'kode', l: 'Kode', wajib: true, mono: true, bantu: 'Huruf besar/angka, mis. SKET, UND.' }, { k: 'nama', l: 'Nama jenis', wajib: true }, { k: 'modul', l: 'Modul', tipe: 'pilihan', opsi: MODUL },
          { k: 'formatNomor', l: 'Format nomor', mono: true, penuh: true, bantu: 'Wajib memuat {NOMOR}.' }]
          .concat(rec ? [] : [{ k: 'nomorBerjalan', l: 'Nomor terakhir yang sudah terpakai tahun ini', tipe: 'angka', bawaan: '0', bantu: 'Isi bila melanjutkan penomoran manual sebelumnya.' }])
          .concat([{ k: 'aktif', l: 'Aktif', tipe: 'pilihan', opsi: YA_TIDAK }, { k: 'pakaiQr', l: 'Pakai QR verifikasi', tipe: 'pilihan', opsi: YA_TIDAK },
            { k: 'bisaDiajukanPublik', l: 'Bisa diajukan lewat portal', tipe: 'pilihan', opsi: YA_TIDAK }, { k: 'lampiranPublik', l: 'Lampiran pemohon', tipe: 'pilihan', opsi: ['tidak', 'opsional', 'wajib'] },
            { k: 'urutanPublik', l: 'Urutan di portal', tipe: 'angka' }, { k: 'samarkanPerihal', l: 'Samarkan perihal di halaman verifikasi', tipe: 'pilihan', opsi: [{ v: 'false', l: 'Tidak' }, { v: 'true', l: 'Ya (data sensitif)' }] },
            { k: 'deskripsiPublik', l: 'Deskripsi di portal', tipe: 'area', penuh: true }]);
      },
      setelah: segarPublik });
  }

  // ---------------------------------------------------------------------------
  // Portal publik
  // ---------------------------------------------------------------------------
  function tabPortal(box) {
    formConfig(box, 'Layanan Permohonan', 'Atur buka/tutup portal dan batas pengajuan.', [
      { k: 'PERMOHONAN_AKTIF', l: 'Portal permohonan dibuka', tipe: 'saklar', bawaan: 'true' }, { k: 'PERMOHONAN_TAUTAN_PDF', l: 'Tampilkan unduhan PDF di halaman Lacak', tipe: 'saklar', bawaan: 'true' },
      { k: 'PERMOHONAN_BATAS_JAM', l: 'Maks. permohonan per email/perangkat per jam', tipe: 'angka' }, { k: 'PERMOHONAN_BATAS_PERBAIKAN_HARI', l: 'Batas hari perbaikan (lalu otomatis ditolak)', tipe: 'angka' },
      { k: 'PERMOHONAN_FORMAT_REF', l: 'Format nomor referensi', mono: true, bantu: '{TAHUN} {BULAN} {URUT}' }, { k: 'UPLOAD_MAX_MB', l: 'Maks. ukuran lampiran (MB)', tipe: 'angka' },
      { k: 'UPLOAD_FORMAT', l: 'Format lampiran diizinkan', mono: true, penuh: true }, { k: 'PERMOHONAN_PESAN_SUKSES', l: 'Pesan layar sukses', tipe: 'area', penuh: true }
    ], segarPublik);
    formConfig(box, 'Tampilan Beranda', '', [
      { k: 'HERO_AKTIF', l: 'Hero slide', tipe: 'saklar', bawaan: 'true' }, { k: 'HERO_DURASI', l: 'Durasi per slide (ms)', tipe: 'angka' },
      { k: 'RUNNING_TEXT_AKTIF', l: 'Teks berjalan pengumuman', tipe: 'saklar', bawaan: 'true' }, { k: 'POPUP_AKTIF', l: 'Popup pengumuman terbaru', tipe: 'saklar', bawaan: 'true' }
    ], segarPublik);
    var mk = function (o) { var c = document.createElement('div'); c.className = 'card card-pad'; c.style.marginBottom = '16px'; box.appendChild(c); o.setelah = segarPublik; tabelMaster(c, o); };
    mk({ master: 'hero', judul: 'Hero Slide', judulSatuan: 'Slide', ikon: 'image', bawaan: { aktif: 'true', urutan: 1 }, urut: function (a, b) { return (Number(a.urutan) || 9) - (Number(b.urutan) || 9); },
      kolom: [{ l: 'Urut', k: 'urutan', kelas: 'mono' }, { l: 'Judul', f: function (r) { return '<b style="font-weight:600">' + esc(r.judul) + '</b><div class="muted kecil">' + esc(r.subjudul || '') + '</div>'; } }, { l: 'Status', f: aktifBadge }],
      fields: [{ k: 'judul', l: 'Judul', wajib: true, penuh: true }, { k: 'subjudul', l: 'Subjudul', tipe: 'area', penuh: true }, { k: 'urutan', l: 'Urutan', tipe: 'angka' }, { k: 'aktif', l: 'Aktif', tipe: 'pilihan', opsi: YA_TIDAK }] });
    mk({ master: 'pengumuman', judul: 'Pengumuman', judulSatuan: 'Pengumuman', ikon: 'bell', bawaan: { aktif: 'true', tipe: 'info' },
      kolom: [{ l: 'Judul', f: function (r) { return '<b style="font-weight:600">' + esc(r.judul) + '</b><div class="muted kecil">' + esc(String(r.isi || '').slice(0, 90)) + '</div>'; } }, { l: 'Periode', f: function (r) { return '<span class="kecil">' + esc(r.mulai ? U.tglPendek(r.mulai) : '…') + ' – ' + esc(r.selesai ? U.tglPendek(r.selesai) : '…') + '</span>'; } }, { l: 'Status', f: aktifBadge }],
      fields: [{ k: 'judul', l: 'Judul', wajib: true, penuh: true }, { k: 'isi', l: 'Isi', tipe: 'area', penuh: true }, { k: 'tipe', l: 'Tipe', tipe: 'pilihan', opsi: ['info', 'penting'] }, { k: 'aktif', l: 'Aktif', tipe: 'pilihan', opsi: YA_TIDAK }, { k: 'mulai', l: 'Mulai tampil', tipe: 'tanggal' }, { k: 'selesai', l: 'Selesai tampil', tipe: 'tanggal' }] });
    mk({ master: 'berkasTemplate', judul: 'Berkas Unduhan Publik', judulSatuan: 'Berkas', ikon: 'download', bawaan: { aktif: 'true', urutan: 1 },
      kolom: [{ l: 'Nama', f: function (r) { return '<b style="font-weight:600">' + esc(r.nama) + '</b><div class="muted kecil">' + esc(r.deskripsi || '') + '</div>'; } }, { l: 'Tautan', f: function (r) { return '<a class="kecil" href="' + esc(r.fileUrl) + '" target="_blank" rel="noopener">buka ' + ik('external', 'sm') + '</a>'; } }, { l: 'Status', f: aktifBadge }],
      fields: [{ k: 'nama', l: 'Nama berkas', wajib: true }, { k: 'urutan', l: 'Urutan', tipe: 'angka' }, { k: 'fileUrl', l: 'Tautan berbagi (Google Drive, akses "siapa saja")', wajib: true, penuh: true, mono: true }, { k: 'deskripsi', l: 'Deskripsi', tipe: 'area', penuh: true }, { k: 'aktif', l: 'Aktif', tipe: 'pilihan', opsi: YA_TIDAK }] });
  }

  // ---------------------------------------------------------------------------
  // Dokumen & verifikasi
  // ---------------------------------------------------------------------------
  function tabDokumen(box) {
    formConfig(box, 'Alamat Aplikasi', 'Dipakai di QR verifikasi & tautan notifikasi. Terisi otomatis saat Super Admin/Admin pertama kali masuk.', [
      { k: 'APP_URL', l: 'Alamat frontend (GitHub Pages)', mono: true, penuh: true, ph: 'https://akun.github.io/surat-digital', bantu: 'Ubah hanya bila alamat situs berpindah; QR lama tetap menunjuk alamat lama.' }]);
    formConfig(box, 'Tata Letak Dokumen', 'Berlaku untuk format HTML cadangan & editor naskah.', [
      { k: 'DOK_UKURAN_KERTAS', l: 'Ukuran kertas', tipe: 'pilihan', opsi: ['A4', 'F4', 'Letter'] }, { k: 'DOK_FONT', l: 'Huruf', tipe: 'pilihan', opsi: ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Bookman Old Style'] },
      { k: 'DOK_UKURAN_FONT', l: 'Ukuran huruf (pt)', tipe: 'angka' }, { k: 'DOK_INDENT_NASKAH', l: 'Perataan naskah editor', tipe: 'pilihan', opsi: [['editor', 'Rata kanan-kiri tanpa menjorok'], ['template', 'Ikuti gaya template']] },
      { k: 'DOK_MARGIN_ATAS', l: 'Margin atas (cm)', tipe: 'angka' }, { k: 'DOK_MARGIN_BAWAH', l: 'Margin bawah (cm)', tipe: 'angka' }, { k: 'DOK_MARGIN_KIRI', l: 'Margin kiri (cm)', tipe: 'angka' }, { k: 'DOK_MARGIN_KANAN', l: 'Margin kanan (cm)', tipe: 'angka' }
    ]);
    formConfig(box, 'Verifikasi & Register', '', [
      { k: 'DOK_QR_AKTIF', l: 'QR verifikasi pada semua dokumen', tipe: 'saklar', bawaan: 'true' }, { k: 'VERIF_TAUTAN_PDF', l: 'Izinkan unduh PDF dari halaman verifikasi publik', tipe: 'saklar', bawaan: 'false', bantu: 'Bawaan mati demi privasi; verifikasi tetap menampilkan nomor, perihal, penanda tangan, dan hash.' },
      { k: 'SM_FORMAT_AGENDA', l: 'Format nomor agenda surat masuk', mono: true, bantu: '{TAHUN} {URUT}' }
    ]);
  }

  // ---------------------------------------------------------------------------
  // Email masuk
  // ---------------------------------------------------------------------------
  function tabEmail(box) {
    var info = document.createElement('div');
    info.innerHTML = '<div class="pemberitahuan" style="margin-bottom:16px">' + ik('info') + '<div><b>Cara kerja:</b> buat filter di Gmail akun pemilik skrip (Setelan → Filter) yang memberi label <span class="mono">SURAT-MASUK</span> pada email surat dinas. Sistem menarik email berlabel tersebut, menyimpan lampiran ke Drive, lalu memberi label <span class="mono">SURAT-MASUK/DIPROSES</span>.</div></div>';
    box.appendChild(info);
    var w = formConfig(box, 'Penarikan Email', '', [
      { k: 'EMAIL_MASUK_AKTIF', l: 'Tarik email otomatis', tipe: 'saklar', bawaan: 'true' }, { k: 'EMAIL_MASUK_MENIT', l: 'Interval tarik', tipe: 'pilihan', opsi: [['1', 'Tiap 1 menit'], ['5', 'Tiap 5 menit'], ['10', 'Tiap 10 menit'], ['15', 'Tiap 15 menit']] },
      { k: 'EMAIL_MASUK_QUERY', l: 'Kueri Gmail', mono: true, penuh: true }, { k: 'EMAIL_MASUK_MAKS', l: 'Maks. thread per putaran', tipe: 'angka' }, { k: 'EMAIL_LABEL_SELESAI', l: 'Label setelah ditarik', mono: true },
      { k: 'EMAIL_BALAS_OTOMATIS', l: 'Kirim tanda terima otomatis setelah diarsipkan', tipe: 'saklar', bawaan: 'false' }, { k: 'EMAIL_TANDA_TANGAN', l: 'Penutup email balasan', tipe: 'area', penuh: true }
    ]);
    var uji = document.createElement('div');
    uji.innerHTML = '<div class="card card-pad"><div class="antara"><div><b>Uji kueri</b><div class="muted kecil">Periksa berapa thread Gmail yang cocok dengan kueri saat ini.</div></div><button class="btn btn-soft" id="em-uji" data-muat="Menguji…">' + ik('search', 'sm') + 'Uji Sekarang</button></div><div id="em-uji-hasil" style="margin-top:10px"></div></div>';
    box.appendChild(uji);
    uji.querySelector('#em-uji').addEventListener('click', function () {
      U.sibuk(this, function () { return API.panggil('emailMasukUji', {}).then(function (r) { uji.querySelector('#em-uji-hasil').innerHTML = r.success ? '<div class="pemberitahuan ' + (r.data.cocok ? 'ok' : 'warn') + '">' + ik(r.data.cocok ? 'checkCircle' : 'alert') + '<div>' + esc(r.message) + (r.data.contoh.length ? '<br><span class="kecil">' + r.data.contoh.map(esc).join('<br>') + '</span>' : '') + '</div></div>' : '<div class="pemberitahuan galat">' + esc(r.message) + '</div>'; }); });
    });
    return w;
  }

  // ---------------------------------------------------------------------------
  // Keamanan & rahasia
  // ---------------------------------------------------------------------------
  function tabKeamanan(box) {
    var w = document.createElement('div'); box.appendChild(w);
    w.innerHTML = U.skel(3, 70);
    API.panggil('statusKeamanan', {}).then(function (r) {
      if (!r.success) { w.innerHTML = '<div class="pemberitahuan galat">' + esc(r.message) + '</div>'; return; }
      var d = r.data, rh = d.rahasia || {};
      var urutan = ['GOOGLE_CLIENT_ID', 'WA_TOKEN', 'GEMINI_API_KEY', 'TTE_API_KEY', 'TTE_CLIENT_SECRET', 'VP_URL', 'VP_KODE_APP', 'VP_KUNCI'];
      w.innerHTML = '<div class="pemberitahuan ok" style="margin-bottom:16px">' + ik('shield') + '<div><b>Rahasia hanya di Script Properties.</b> Token, kunci API, secret sesi, hash sandi & PIN tidak pernah disimpan di Sheets, kode, maupun peramban. Panel hanya menampilkan versi tersamar; nilai baru menimpa, tidak bisa dibaca kembali.</div></div>' +
        kartu('Kunci & Token', 'Allowlist — hanya kunci di bawah yang bisa diubah dari panel.', '<div class="tabel-wrap"><table class="tabel responsif"><thead><tr><th>Kunci</th><th>Status</th><th>Nilai (tersamar)</th><th></th></tr></thead><tbody>' + urutan.filter(function (k) { return rh[k]; }).map(function (k) {
          var x = rh[k];
          return '<tr><td data-l="Kunci"><b style="font-weight:600">' + esc(x.label) + '</b><div class="mono kecil muted">' + esc(k) + '</div></td><td data-l="Status">' + (x.ada ? '<span class="badge b-terbit">terisi</span>' : '<span class="badge b-draf">kosong</span>') + '</td><td data-l="Nilai" class="mono kecil" style="word-break:break-all">' + esc(x.samar || '-') + '</td>' +
            '<td data-l=""><div class="baris" style="gap:4px;justify-content:flex-end"><button class="btn btn-soft btn-xs" data-ubah="' + k + '">' + ik('edit', 'sm') + 'Ubah</button>' + (x.ada && k !== 'GOOGLE_CLIENT_ID' ? '<button class="btn btn-ghost btn-xs" data-hapus="' + k + '">' + ik('trash', 'sm') + '</button>' : '') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>') + '<div id="kc-cfg"></div>' +
        kartu('Akses Darurat (sandi)', 'Bawaan mati. Hanya untuk keadaan login Google bermasalah.', '<div class="antara"><div>' + (d.daruratAda ? '<span class="badge b-terbit">kredensial ada</span>' : '<span class="badge b-perbaikan">belum ada — jalankan PASANG_APLIKASI</span>') + ' ' + (d.loginSandiAktif ? '<span class="badge b-ditolak">LOGIN SANDI AKTIF</span>' : '<span class="badge b-draf">login sandi mati</span>') + '</div><button class="btn btn-outline btn-sm" id="kc-sandi">' + ik('key', 'sm') + 'Ganti Sandi Darurat</button></div>') +
        kartu('Sesi', 'Token sesi bertanda tangan HMAC, masa berlaku 12 jam, berakhir bila diam ' + esc(d.idleMenit) + ' menit.', '<button class="btn btn-danger" id="kc-semua">' + ik('shieldX', 'sm') + 'Keluarkan akun saya dari semua perangkat</button>');
      formConfig(w.querySelector('#kc-cfg'), 'Kebijakan Login', '', [
        { k: 'GOOGLE_DOMAIN_IZIN', l: 'Batasi domain email (pisahkan koma)', mono: true, ph: 'stisalwafa.ac.id', bantu: 'Kosong = semua email yang terdaftar di Pengguna boleh masuk.' },
        { k: 'SESI_IDLE_MENIT', l: 'Batas diam sesi (menit, 5–720)', tipe: 'angka' },
        { k: 'LOGIN_SANDI_AKTIF', l: 'Izinkan login sandi darurat', tipe: 'saklar', bawaan: 'false', bantu: 'Matikan kembali setelah keadaan darurat selesai.' }
      ], function () { box.innerHTML = ''; tabKeamanan(box); });
      U.$$('[data-ubah]', w).forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.dataset.ubah, x = rh[k];
          var publik = /^(GOOGLE_CLIENT_ID|VP_URL|VP_KODE_APP)$/.test(k);
          U.minta('Ubah ' + x.label, { label: k, tipe: publik ? 'text' : 'password', placeholder: publik ? '' : 'Tempel nilai baru', nilai: publik ? (x.samar || '') : '', ya: 'Simpan ke Script Properties', bantu: publik ? '' : 'Nilai tidak akan ditampilkan lagi setelah disimpan.' }).then(function (v) {
            if (!v) return;
            API.panggil('rahasiaSimpan', { kunci: k, nilai: v }).then(function (res) { if (U.hasil(res)) { box.innerHTML = ''; tabKeamanan(box); } });
          });
        });
      });
      U.$$('[data-hapus]', w).forEach(function (b) { b.addEventListener('click', function () { U.konfirmasi('Hapus ' + rh[b.dataset.hapus].label + '?', 'Fitur yang memakai kunci ini akan berhenti.', { bahaya: true, ya: 'Hapus' }).then(function (y) { if (y) API.panggil('rahasiaSimpan', { kunci: b.dataset.hapus, nilai: '__HAPUS__' }).then(function (res) { if (U.hasil(res)) { box.innerHTML = ''; tabKeamanan(box); } }); }); }); });
      w.querySelector('#kc-sandi').addEventListener('click', function () {
        U.minta('Ganti sandi darurat', { label: 'Sandi baru (≥ 12 karakter, huruf + angka)', tipe: 'password', min: 12, ya: 'Simpan', bantu: 'Nama pengguna darurat: darurat. Sesi darurat lama dicabut.' }).then(function (v) { if (v) API.panggil('gantiPassword', { sandiBaru: v }).then(function (res) { U.hasil(res); }); });
      });
      w.querySelector('#kc-semua').addEventListener('click', function () { U.konfirmasi('Keluar dari semua perangkat?', 'Semua sesi akun Anda dicabut, termasuk perangkat ini.', { bahaya: true, ya: 'Cabut semua sesi' }).then(function (y) { if (y) A.keluar(true); }); });
    });
  }
})();
