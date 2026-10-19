/**
 * emailmasuk.js — Kotak Masuk Email (surat masuk via Gmail berlabel SURAT-MASUK).
 * Split view, isi HTML dalam iframe sandbox (tanpa skrip), lampiran, arsipkan → Surat Masuk
 * bernomor agenda, balas di thread yang sama (templat balasan + lampiran / surat keluar), abaikan.
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon, A = window.Admin;
  var STATUS = [['BARU', 'Baru'], ['DIBACA', 'Dibaca'], ['DIARSIPKAN', 'Diarsipkan'], ['DIABAIKAN', 'Diabaikan'], ['', 'Semua']];
  var _detail = {};

  A.daftar('email-masuk', {
    judul: 'Email Masuk', modul: ['emailMasuk'],
    render: function (el, ctx) {
      var st = ctx.state;
      if (st.status === undefined) st.status = 'BARU';
      if (ctx.q.id && st._qid !== ctx.q.id) { st._qid = ctx.q.id; st.pilih = ctx.q.id; st.status = ''; }
      var semua = A.rows('emailMasuk'), hit = {};
      semua.forEach(function (r) { hit[r.status] = (hit[r.status] || 0) + 1; });
      if (st.status === 'BARU' && !hit.BARU && !st._auto) { st._auto = 1; st.status = hit.DIBACA ? 'DIBACA' : ''; }
      var rows = semua.filter(function (r) { return !st.status || r.status === st.status; });
      rows = A.saring(rows, st.cari, function (r) { return [r.subjek, r.dariNama, r.dariEmail, r.cuplikan]; });
      rows = rows.slice().sort(function (a, b) { return String(b.tanggalEmail || b.dibuat).localeCompare(String(a.tanggalEmail || a.dibuat)); });
      var p = A.potong(rows, st, 40);
      el.innerHTML = A.kepala({ overline: 'Surat masuk elektronik', judul: 'Kotak Masuk Email', desk: 'Email berlabel <span class="mono">SURAT-MASUK</span> ditarik otomatis tiap ' + esc(A.cfg('EMAIL_MASUK_MENIT', 5)) + ' menit. Arsipkan menjadi Surat Masuk atau balas langsung di thread yang sama.',
        aksi: (A.tulis() ? '<button class="btn btn-ghost btn-sm" id="em-templat">' + ik('file', 'sm') + 'Templat Balasan</button><button class="btn btn-primary" id="em-tarik" data-muat="Menarik…">' + ik('download', 'sm') + 'Tarik Sekarang</button>' : '') + '<button class="btn btn-ghost btn-icon" id="em-segar" aria-label="Segarkan">' + ik('refresh') + '</button>' }) +
        '<div class="bilah-alat"><div class="cari">' + ik('search') + '<input class="input" id="em-cari" placeholder="Cari subjek, pengirim…" value="' + esc(st.cari || '') + '"></div></div>' +
        '<div style="margin-bottom:14px">' + A.chips(STATUS.map(function (s) { return { v: s[0], l: s[1], n: s[0] ? hit[s[0]] || 0 : semua.length }; }), st.status) + '</div>' + A.infoTerpotong('emailMasuk') +
        '<div class="belah"><div class="daftar-kartu">' + (p.tampil.length ? p.tampil.map(function (r) {
          var lamp = A.json(r.lampiran, []);
          return '<div class="item-kartu' + (r.status === 'BARU' ? ' belum-baca' : '') + (st.pilih === r.id ? ' pilih' : '') + '" data-id="' + esc(r.id) + '" tabindex="0" role="button"><div class="atas"><span class="baris" style="gap:8px;min-width:0"><span class="avatar" style="width:28px;height:28px;font-size:11px">' + esc(U.inisial(r.dariNama || r.dariEmail)) + '</span><b style="font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.dariNama || r.dariEmail) + '</b></span>' + U.badge(r.status) + '</div>' +
            '<div class="jdl">' + esc(r.subjek || '(tanpa subjek)') + '</div><div class="sub" style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(r.cuplikan || '') + '</div>' +
            '<div class="bawah"><span>' + ik('clock', 'sm') + ' ' + esc(U.relatif(r.tanggalEmail || r.dibuat)) + '</span><span>' + (lamp.length ? ik('clip', 'sm') + ' ' + lamp.length : '') + (String(r.dibalas) === 'true' ? ' · ' + ik('reply', 'sm') + ' ' + esc(r.jumlahBalasan || '') : '') + '</span></div></div>';
        }).join('') + A.tombolLagi(p.sisa) : '<div class="card">' + U.kosong(st.status === 'BARU' ? 'Tidak ada email baru.' : 'Tidak ada email.', 'mail') + '</div>') + '</div>' +
        '<div class="card panel-detail" id="em-detail">' + (st.pilih ? U.skel(5, 50) : U.kosong('Pilih email untuk membaca.', 'mail')) + '</div></div>';
      var cari = el.querySelector('#em-cari');
      cari.addEventListener('input', U.debounce(function () { st.cari = cari.value; st.batas = 40; A.renderUlang(); var i = document.getElementById('em-cari'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250));
      U.$$('[data-chip]', el).forEach(function (b) { b.addEventListener('click', function () { st.status = b.dataset.chip; st.batas = 40; A.renderUlang(); }); });
      var lg = el.querySelector('[data-lagi]'); if (lg) lg.addEventListener('click', function () { st.batas += 50; A.renderUlang(); });
      U.$$('.item-kartu', el).forEach(function (c) {
        var buka = function () { st.pilih = c.dataset.id; U.$$('.item-kartu', el).forEach(function (x) { x.classList.toggle('pilih', x === c); }); c.classList.remove('belum-baca'); bacaEmail(el.querySelector('#em-detail'), c.dataset.id); if (innerWidth <= 960) el.querySelector('#em-detail').scrollIntoView({ behavior: 'smooth' }); };
        c.addEventListener('click', buka); c.addEventListener('keydown', function (e) { if (e.key === 'Enter') buka(); });
      });
      el.querySelector('#em-segar').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return A.segarkan(['emailMasuk']); }); });
      var tarik = el.querySelector('#em-tarik');
      if (tarik) tarik.addEventListener('click', function () { U.sibuk(tarik, function () { return API.panggil('emailTarikSekarang', {}, { timeout: 120000 }).then(function (r) { U.hasil(r); return A.segarkan(['emailMasuk']); }); }); });
      var tp = el.querySelector('#em-templat'); if (tp) tp.addEventListener('click', kelolaTemplat);
      if (st.pilih) bacaEmail(el.querySelector('#em-detail'), st.pilih);
    }
  });

  function bacaEmail(box, id) {
    if (_detail[id]) gambarEmail(box, _detail[id]);
    API.panggil('emailDetail', { id: id }, { timeout: 60000 }).then(function (r) {
      if (!document.body.contains(box)) return;
      if (!r.success) { box.innerHTML = '<div class="card-body"><div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(r.message) + '</div></div></div>'; return; }
      var beda = JSON.stringify(r.data) !== JSON.stringify(_detail[id]);
      _detail[id] = r.data;
      if (r.data.status !== 'BARU') { var baris = A.rows('emailMasuk').filter(function (x) { return x.id === id; })[0]; if (baris && baris.status === 'BARU') { A.upsertBaris('emailMasuk', { id: id, status: r.data.status }); var bk = document.querySelector('.item-kartu[data-id="' + id + '"] .atas > .badge'); if (bk) bk.outerHTML = U.badge(r.data.status); if (A.data.lencana) { A.data.lencana.emailMasuk = Math.max(0, (A.data.lencana.emailMasuk || 1) - 1); } } }
      if (beda) gambarEmail(box, r.data);
    });
  }

  function gambarEmail(box, e) {
    var lamp = A.json(e.lampiran, []), tulis = A.tulis();
    var aksi = [];
    if (tulis) {
      if (e.status !== 'DIARSIPKAN') aksi.push('<button class="btn btn-primary" data-a="arsip">' + ik('archive', 'sm') + 'Arsipkan sbg Surat Masuk</button>');
      aksi.push('<button class="btn btn-soft" data-a="balas">' + ik('reply', 'sm') + 'Balas</button>', '<a class="btn btn-soft" href="#/admin/surat-keluar/baru?email=' + encodeURIComponent(e.id) + '">' + ik('filePlus', 'sm') + 'Buat Surat Balasan</a>');
      if (e.status === 'DIABAIKAN') aksi.push('<button class="btn btn-ghost" data-a="pulihkan">' + ik('rotate', 'sm') + 'Pulihkan</button>');
      else if (e.status !== 'DIARSIPKAN') aksi.push('<button class="btn btn-ghost" data-a="abaikan" title="Bukan surat">' + ik('ban', 'sm') + 'Bukan surat</button>', '<button class="btn btn-ghost btn-icon" data-a="belum" title="Tandai belum dibaca" aria-label="Tandai belum dibaca">' + ik('eyeOff', 'sm') + '</button>');
    }
    box.innerHTML = '<div class="kepala-detail"><div class="antara"><span class="overline">' + esc(U.tglJam(e.tanggalEmail)) + '</span>' + U.badge(e.status) + '</div><h3 style="font-size:18px;margin:6px 0 8px">' + esc(e.subjek || '(tanpa subjek)') + '</h3>' +
      '<div class="baris kecil"><span class="avatar" style="width:30px;height:30px;font-size:11px">' + esc(U.inisial(e.dariNama || e.dariEmail)) + '</span><div><b>' + esc(e.dariNama || '') + '</b> <span class="muted">&lt;' + esc(e.dariEmail) + '&gt;</span><div class="muted">kepada ' + esc(e.kepada || '-') + '</div></div></div></div>' +
      '<div class="gulir"><div class="card-body tumpuk" style="gap:14px">' +
      (e.suratMasuk && e.suratMasuk.id ? '<a class="nomor-tetap" style="color:inherit;text-decoration:none" href="#/admin/surat-masuk?id=' + esc(e.suratMasuk.id) + '">' + ik('inbox') + '<div><div class="overline">Diarsipkan sebagai surat masuk</div><div class="mono">' + esc(e.suratMasuk.nomorAgenda) + '</div></div>' + ik('right', 'sm') + '</a>' : '') +
      (e.html ? '<iframe class="baca-email" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" title="Isi email"></iframe>' : '<div class="blok-abu" style="white-space:pre-wrap;font-size:13.5px">' + esc(e.isiTeks || e.cuplikan || '(isi kosong)') + '</div>') +
      (lamp.length ? '<div><div class="overline" style="margin-bottom:8px">Lampiran (' + lamp.length + ')</div><div class="lampiran-grid">' + lamp.map(function (l) {
        return l.id ? '<button class="lp" data-berkas="' + esc(l.id) + '" data-nama="' + esc(l.nama) + '" style="cursor:pointer;text-align:left"><span class="ik">' + ik(/image/.test(l.mime) ? 'image' : 'file', 'sm') + '</span><div style="min-width:0"><div class="nm">' + esc(l.nama) + '</div><div class="mono kecil muted">' + U.ukuran(l.ukuran) + '</div></div></button>'
          : '<div class="lp"><span class="ik">' + ik('alert', 'sm') + '</span><div><div class="nm">' + esc(l.nama) + '</div><div class="kecil muted">' + esc(l.dilewati || '') + '</div></div></div>';
      }).join('') + '</div></div>' : '') +
      ((e.balasan || []).length ? '<div><div class="overline" style="margin-bottom:8px">Balasan terkirim</div>' + e.balasan.map(function (b) { return '<div class="blok-abu" style="margin-bottom:8px"><div class="antara kecil"><b>' + esc(b.subjek) + '</b>' + U.badge(b.status) + '</div><div class="muted kecil">' + esc(b.dikirimOleh || '') + ' · ' + esc(U.tglJam(b.dikirimPada || '')) + '</div><div style="white-space:pre-wrap;margin-top:6px;font-size:13px">' + esc(String(b.isi || '').slice(0, 600)) + '</div></div>'; }).join('') + '</div>' : '') +
      '</div></div>' + (aksi.length ? '<div class="bilah">' + aksi.join('') + '</div>' : '');
    var fr = box.querySelector('iframe.baca-email');
    if (fr) {
      fr.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: https: cid:; style-src \'unsafe-inline\'; font-src https: data:"><base target="_blank"><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#1f2937;margin:12px;word-wrap:break-word}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>' + e.html + '</body></html>';
      fr.addEventListener('load', function () { try { fr.style.height = Math.min(1600, Math.max(260, fr.contentDocument.body.scrollHeight + 30)) + 'px'; } catch (x) {} });
    }
    U.$$('[data-berkas]', box).forEach(function (b) { b.addEventListener('click', function () { A.bukaBerkas(b.dataset.berkas, b.dataset.nama, b); }); });
    U.$$('[data-a]', box).forEach(function (b) { b.addEventListener('click', function () { aksiEmail(b.dataset.a, e, b, box); }); });
  }

  function perbaruiSetelah(e, box, rec) {
    if (rec) { A.upsertBaris('emailMasuk', rec); _detail[e.id] = Object.assign({}, _detail[e.id], rec); }
    A.renderUlang();
    API.panggil('refreshModul', { modul: [] }, { senyap: true, diam: true }).then(function (x) { if (x.success) A.gabung(x.data); });
  }

  function aksiEmail(a, e, btn, box) {
    if (a === 'abaikan' || a === 'pulihkan') return U.sibuk(btn, function () { return API.panggil('emailAbaikan', { id: e.id, abaikan: a === 'abaikan' }).then(function (r) { if (U.hasil(r)) perbaruiSetelah(e, box, r.data); }); });
    if (a === 'belum') return U.sibuk(btn, function () { return API.panggil('emailTandaiBaca', { id: e.id, baca: false }).then(function (r) { if (r.success) { U.toast('Ditandai belum dibaca.', 'ok'); perbaruiSetelah(e, box, r.data); } }); });
    if (a === 'arsip') return arsipkan(e, box);
    if (a === 'balas') return balas(e, box);
  }

  function arsipkan(e, box) {
    var tujuan = A.pejabatAktif().map(function (p) { return p.jabatan; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    var domain = String(e.dariEmail || '').split('@')[1] || '';
    S().formModal({ judul: 'Arsipkan sebagai Surat Masuk', sub: 'Lampiran email ikut tersimpan; nomor agenda dibuat otomatis.', ikon: 'archive', ya: 'Arsipkan',
      nilai: { asalInstansi: e.dariNama || domain, perihal: e.subjek, tanggalTerima: String(e.tanggalEmail || '').slice(0, 10) || U.hariIni(), sifat: 'Biasa' },
      fields: [{ k: 'asalInstansi', l: 'Asal instansi / pengirim', wajib: true }, { k: 'nomorSuratAsal', l: 'Nomor surat asal', mono: true }, { k: 'perihal', l: 'Perihal', wajib: true, penuh: true },
        { k: 'tanggalSurat', l: 'Tanggal surat', tipe: 'tanggal' }, { k: 'tanggalTerima', l: 'Tanggal diterima', tipe: 'tanggal' }, { k: 'sifat', l: 'Sifat', tipe: 'pilihan', opsi: ['Biasa', 'Penting', 'Segera', 'Rahasia'] },
        { k: 'tujuanDisposisi', l: 'Disposisi ke', list: tujuan }, { k: 'catatanDisposisi', l: 'Catatan disposisi', tipe: 'area', penuh: true }],
      simpan: function (v) {
        v.id = e.id;
        return API.panggil('emailArsipkan', v, { timeout: 90000 }).then(function (r) {
          if (!U.hasil(r)) return r;
          A.upsertBaris('suratMasuk', r.data.suratMasuk);
          perbaruiSetelah(e, box, { id: e.id, status: 'DIARSIPKAN', suratMasukId: r.data.suratMasuk.id });
          return r;
        });
      } });
  }
  function S() { return window.Surat; }

  function isiTemplat(t, e) {
    return String(t || '').replace(/\{(\w+)\}/g, function (m, k) {
      var v = { nama: e.dariNama || 'Bapak/Ibu', perihal: e.subjek || '', institusi: A.cfg('INSTITUSI_NAMA', ''), app: A.cfg('APP_NAME', ''), tanggal: U.tgl(U.hariIni()), nomorAgenda: (e.suratMasuk && e.suratMasuk.nomorAgenda) || '' }[k];
      return v === undefined ? m : v;
    });
  }

  function balas(e, box) {
    var tpl = A.master('templatBalasan').filter(function (t) { return String(t.aktif) !== 'false'; }).sort(function (a, b) { return (Number(a.urutan) || 9) - (Number(b.urutan) || 9); });
    var terbit = A.rows('suratKeluar').filter(function (s) { return s.status === 'TERBIT'; }).slice(0, 80);
    var berkas = [];
    var m = U.modal({ judul: 'Balas Email', sub: 'Dikirim di thread yang sama ke ' + e.dariEmail, ikon: ik('reply'), lebar: 'lebar',
      isi: '<div class="tumpuk" style="gap:12px">' + (tpl.length ? '<div class="field"><label>Templat balasan</label><select class="select" id="bl-tpl"><option value="">— tulis sendiri —</option>' + tpl.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.nama) + '</option>'; }).join('') + '</select><div class="bantu">Variabel: {nama} {perihal} {institusi} {tanggal} {nomorAgenda}</div></div>' : '') +
        '<div class="field"><label>Subjek</label><input class="input" id="bl-subjek" value="' + esc('Re: ' + String(e.subjek || '').replace(/^re:\s*/i, '')) + '"></div>' +
        '<div class="field"><label>Isi balasan <span class="wajib">*</span></label><textarea class="textarea" id="bl-isi" style="min-height:180px" placeholder="Yth. ' + esc(e.dariNama || 'Bapak/Ibu') + ', …"></textarea><div class="bantu">Penutup email (' + esc(String(A.cfg('EMAIL_TANDA_TANGAN', '')).split('\n')[0]) + '…) ditambahkan otomatis.</div></div>' +
        (terbit.length ? '<div class="field"><label>Lampirkan surat keluar terbit (opsional)</label><select class="select" id="bl-surat"><option value="">— tidak ada —</option>' + terbit.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.nomorSurat) + ' — ' + esc(String(s.perihal || '').slice(0, 60)) + '</option>'; }).join('') + '</select></div>' : '') +
        '<div class="field"><label>Lampiran lain (maks. 5, 10 MB)</label><input type="file" id="bl-file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"><div class="daftar-berkas" id="bl-daftar"></div></div></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" id="bl-kirim" data-muat="Mengirim…">' + ik('send', 'sm') + 'Kirim Balasan</button>' });
    var sel = m.$('#bl-tpl');
    if (sel) sel.addEventListener('change', function () { var t = tpl.filter(function (x) { return x.id === sel.value; })[0]; if (!t) return; m.$('#bl-isi').value = isiTemplat(t.isi, e); if (t.subjek) m.$('#bl-subjek').value = isiTemplat(t.subjek, e); });
    m.$('#bl-file').addEventListener('change', async function () {
      var f = this.files;
      for (var i = 0; i < f.length && berkas.length < 5; i++) { if (f[i].size > 10 * 1048576) { U.toast(f[i].name + ' > 10 MB', 'galat'); continue; } berkas.push(await U.bacaBerkas(f[i])); }
      this.value = '';
      m.$('#bl-daftar').innerHTML = berkas.map(function (b) { return '<div class="bk">' + ik('clip', 'sm') + '<span class="nm">' + esc(b.nama) + '</span><span class="mono kecil">' + U.ukuran(b.ukuran) + '</span></div>'; }).join('');
    });
    m.$('#bl-kirim').addEventListener('click', function () {
      var isi = m.$('#bl-isi').value.trim();
      if (isi.length < 3) { U.toast('Isi balasan masih kosong.', 'galat'); return; }
      var b = this;
      U.sibuk(b, function () {
        return API.panggil('emailBalas', { id: e.id, subjek: m.$('#bl-subjek').value, isi: isi, suratKeluarId: m.$('#bl-surat') ? m.$('#bl-surat').value : '', lampiran: berkas.map(function (x) { return { nama: x.nama, base64: x.base64 }; }) }, { timeout: 120000 }).then(function (r) {
          if (!U.hasil(r)) return;
          m.tutup(); delete _detail[e.id];
          perbaruiSetelah(e, box, { id: e.id, dibalas: true, jumlahBalasan: Number(e.jumlahBalasan || 0) + 1 });
        });
      });
    });
  }

  function kelolaTemplat() {
    var gambar = function (m) {
      var tpl = A.master('templatBalasan');
      m.$('.modal-body').innerHTML = (tpl.length ? '<div class="daftar-kartu">' + tpl.map(function (t) {
        return '<div class="item-kartu" style="cursor:default"><div class="atas"><b>' + esc(t.nama) + '</b><span class="baris" style="gap:6px">' + (String(t.aktif) === 'false' ? '<span class="badge b-draf">nonaktif</span>' : '') + '<button class="btn btn-ghost btn-xs" data-ubah="' + esc(t.id) + '">' + ik('edit', 'sm') + '</button><button class="btn btn-ghost btn-xs" data-hapus="' + esc(t.id) + '">' + ik('trash', 'sm') + '</button></span></div><div class="sub" style="white-space:pre-wrap;margin-top:6px">' + esc(String(t.isi || '').slice(0, 220)) + '</div></div>';
      }).join('') + '</div>' : U.kosong('Belum ada templat balasan.', 'file'));
      U.$$('[data-ubah]', m.el).forEach(function (b) { b.addEventListener('click', function () { form(tpl.filter(function (t) { return t.id === b.dataset.ubah; })[0], m); }); });
      U.$$('[data-hapus]', m.el).forEach(function (b) { b.addEventListener('click', function () { U.konfirmasi('Hapus templat?', 'Templat dihapus permanen.', { bahaya: true, ya: 'Hapus' }).then(function (y) { if (y) API.panggil('templatBalasanHapus', { id: b.dataset.hapus }).then(function (r) { if (U.hasil(r)) { A.setMaster('templatBalasan', r.data); gambar(m); } }); }); }); });
    };
    var form = function (t, induk) {
      S().formModal({ judul: t ? 'Ubah Templat' : 'Templat Balasan Baru', nilai: t || { aktif: 'true', urutan: 1 }, ya: 'Simpan',
        fields: [{ k: 'nama', l: 'Nama templat', wajib: true }, { k: 'urutan', l: 'Urutan', tipe: 'angka' }, { k: 'subjek', l: 'Subjek (opsional)', penuh: true }, { k: 'isi', l: 'Isi (variabel {nama} {perihal} {institusi} {tanggal} {nomorAgenda})', tipe: 'area', wajib: true, penuh: true }, { k: 'aktif', l: 'Aktif', tipe: 'pilihan', opsi: [{ v: 'true', l: 'Ya' }, { v: 'false', l: 'Tidak' }] }],
        simpan: function (v) { if (t) v.id = t.id; return API.panggil('templatBalasanSimpan', { record: v }).then(function (r) { if (U.hasil(r)) { A.setMaster('templatBalasan', r.data); gambar(induk); } return r; }); } });
    };
    var m = U.modal({ judul: 'Templat Balasan Email', ikon: ik('file'), lebar: 'lebar', isi: '', kaki: '<button class="btn btn-ghost" data-tutup>Tutup</button><button class="btn btn-primary" data-baru>' + ik('plus', 'sm') + 'Templat Baru</button>' });
    m.$('[data-baru]').addEventListener('click', function () { form(null, m); });
    gambar(m);
  }
})();
