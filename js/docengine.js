/**
 * docengine.js — modul Doc Engine: Dokumen & Sertifikat (generate massal / mail merge),
 * Tanda Tangan multi-pejabat (login Google + PIN 6 digit, setujui massal, bypass SA),
 * dan pengelolaan template (hubungkan Docs/Sheets/Slides, pindai penanda, atur kolom & slot).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon, A = window.Admin, S = window.Surat;

  // ===========================================================================
  // DOKUMEN & SERTIFIKAT + GENERATE MASSAL
  // ===========================================================================
  var _pollMassal = null;
  A.daftar('dokumen', S.halamanDokumen('dokumen', {
    desk: 'Sertifikat, piagam, undangan, dan dokumen bertemplate — satuan atau massal (mail merge) dengan QR per dokumen.',
    aksiEkstra: function () { return A.tulis() ? '<button class="btn btn-outline" data-massal>' + ik('layers', 'sm') + 'Generate Massal</button>' : ''; },
    atas: function () { return '<div id="panel-massal"></div>'; },
    pasang: function (el) {
      var b = el.querySelector('[data-massal]'); if (b) b.addEventListener('click', bukaMassal);
      muatStatusMassal(el.querySelector('#panel-massal'));
    }
  }));

  function muatStatusMassal(box, paksa) {
    if (!box) return;
    clearTimeout(_pollMassal);
    API.panggil('deMassalStatus', {}, { senyap: true, diam: !paksa }).then(function (r) {
      if (!document.body.contains(box) || !r.success) return;
      var daftar = (r.data.massal || []).filter(function (x) { return x.massalId !== '-'; });
      var aktif = daftar.filter(function (x) { return x.menunggu > 0; });
      var tampil = daftar.slice(0, 3);
      if (!tampil.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>' + ik('layers', 'sm') + ' Generate Massal</h3>' + (aktif.length ? '<span class="badge b-diproses">' + aktif.length + ' berjalan</span>' : '<span class="badge b-terbit">selesai</span>') + '</div><div class="card-body tumpuk" style="gap:12px">' +
        tampil.map(function (m) {
          var persen = m.total ? Math.round((m.selesai + m.gagal) * 100 / m.total) : 0;
          return '<div><div class="antara kecil"><span><b class="mono">' + esc(m.massalId) + '</b> · ' + esc(m.kodeJenis) + ' · ' + esc(U.relatif(m.dibuat)) + '</span><span class="mono">' + m.selesai + '/' + m.total + (m.gagal ? ' · <span style="color:var(--danger)">' + m.gagal + ' gagal</span>' : '') + '</span></div>' +
            '<div class="progres" style="margin:6px 0"><i style="width:' + persen + '%"></i></div>' +
            (m.galat && m.galat.length ? '<div class="galat-teks">' + esc(m.galat[0]) + '</div>' : '') +
            '<div class="baris">' + (m.menunggu > 0 && A.tulis() ? '<button class="btn btn-soft btn-xs" data-proses="' + esc(m.massalId) + '">' + ik('play', 'sm') + 'Proses sekarang</button><span class="muted kecil">Server juga memproses otomatis tiap menit walau halaman ditutup.</span>' : '') +
            '<button class="btn btn-ghost btn-xs" data-lihat="' + esc(m.massalId) + '">' + ik('search', 'sm') + 'Lihat dokumennya</button></div></div>';
        }).join('') + '</div></div>';
      U.$$('[data-proses]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          U.sibuk(b, function () { return API.panggil('deMassalProses', { massalId: b.dataset.proses }, { timeout: 120000 }).then(function (x) { U.hasil(x); A.segarkan(['dokumen'], { diam: true }); muatStatusMassal(box, true); }); });
        });
      });
      U.$$('[data-lihat]', box).forEach(function (b) { b.addEventListener('click', function () { var st = A.state.dokumen = A.state.dokumen || {}; st.cari = b.dataset.lihat; A.renderUlang(); }); });
      if (aktif.length) _pollMassal = setTimeout(function () { A.segarkan(['dokumen'], { diam: true, render: false }); muatStatusMassal(box); }, 15000);
    });
  }

  function bukaMassal() {
    var js = A.jenis('DOKUMEN');
    if (!js.length) { U.toast('Belum ada jenis berjenis DOKUMEN. Tambahkan di Pengaturan → Jenis Surat.', 'galat'); return; }
    var data = { rows: [], sumber: 'csv' };
    var m = U.modal({ judul: 'Generate Massal (Mail Merge)', sub: 'Satu baris data = satu dokumen bernomor & ber-QR. Maks. 500 baris.', ikon: ik('layers'), lebar: 'lebar',
      isi: '<div class="tumpuk" style="gap:16px"><div class="field"><label>Jenis dokumen <span class="wajib">*</span></label><select class="select" id="ms-jenis">' + js.map(function (j) { return '<option value="' + esc(j.kode) + '">' + esc(j.nama) + '</option>'; }).join('') + '</select></div>' +
        '<div class="blok-abu" id="ms-kolom"></div>' +
        '<div><div class="seg" id="ms-sumber"><button class="aktif" data-v="csv">Unggah CSV</button><button data-v="sheet">Google Sheets</button></div></div>' +
        '<div id="ms-csv"><label class="unggah">' + ik('upload', 'lg') + '<div style="margin-top:6px"><b>Pilih berkas CSV</b> (baris pertama = nama kolom)</div><input type="file" id="ms-file" accept=".csv,text/csv" hidden></label><div id="ms-pratinjau" style="margin-top:10px"></div></div>' +
        '<div id="ms-sheet" hidden><div class="grid-form"><div class="field penuh"><label>URL Google Sheets</label><input class="input" id="ms-url" placeholder="https://docs.google.com/spreadsheets/d/…"><div class="bantu">Akun pemilik skrip harus punya akses baca ke sheet ini.</div></div><div class="field"><label>Nama sheet (opsional)</label><input class="input" id="ms-nsheet" placeholder="Sheet1"></div></div></div>' +
        '<div id="ms-ttd"></div><label class="saklar"><input type="checkbox" id="ms-email"><span class="jalur"></span>Kirim ke email penerima (kolom EMAIL)</label></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-gold" id="ms-buat" data-muat="Mengantrekan…">' + ik('play', 'sm') + 'Buat Antrean</button>' });
    var skema = function () { var t = A.templateJenis(m.$('#ms-jenis').value); return { t: t, bidang: (t && t.bidang) || [], slot: (t && t.slotTtd && t.slotTtd.length) ? t.slotTtd : [{ slot: 1, label: 'Penanda Tangan', cara: 'pilih' }] }; };
    var gambar = function () {
      var sk = skema(), kol = sk.bidang.filter(function (b) { return b.tipe !== 'gambar' && b.tipe !== 'naskah'; });
      m.$('#ms-kolom').innerHTML = !sk.t ? '<div class="pemberitahuan warn">' + ik('alert') + '<div>Jenis ini belum punya template. Siapkan di Pengaturan → Template Dokumen.</div></div>' :
        '<div class="antara"><div><b>Kolom yang dibutuhkan</b><div class="mono kecil" style="margin-top:6px">' + kol.map(function (b) { return '<span class="badge ' + (b.wajib ? 'b-perbaikan' : 'b-netral') + ' tanpa-titik" style="margin:0 4px 4px 0">' + esc(b.kunci) + '</span>'; }).join('') + '<span class="badge b-netral tanpa-titik">EMAIL</span></div></div><button class="btn btn-soft btn-sm" id="ms-templat">' + ik('download', 'sm') + 'Templat CSV</button></div>';
      var t = m.$('#ms-templat'); if (t) t.addEventListener('click', function () { var o = {}; kol.forEach(function (b) { o[b.kunci] = ''; }); o.EMAIL = ''; U.unduhTeks('templat-massal-' + m.$('#ms-jenis').value + '.csv', U.csv([o])); });
      var pj = A.pejabatAktif();
      m.$('#ms-ttd').innerHTML = '<div class="overline" style="margin-bottom:8px">Penanda tangan (berlaku untuk semua dokumen)</div><div class="grid-form">' + sk.slot.map(function (s) {
        if (s.cara === 'tetap') { var p = A.pejabatById(s.pejabatId) || {}; return '<div class="field"><label>' + esc(s.label) + '</label><input class="input" readonly value="' + esc(p.nama || '(tetap)') + '"></div>'; }
        return '<div class="field"><label>' + esc(s.label || 'Penanda Tangan') + '</label><select class="select" data-slot="' + s.slot + '"><option value="">' + (s.cara === 'jabatan' ? '(otomatis sesuai jabatan)' : '— pilih —') + '</option>' + pj.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nama) + ' — ' + esc(p.jabatan) + '</option>'; }).join('') + '</select>' + (s.wajibSetuju ? '<div class="bantu">Massal dianggap disetujui (metode MASSAL tercatat).</div>' : '') + '</div>';
      }).join('') + '</div>';
      pratinjau();
    };
    var pratinjau = function () {
      var box = m.$('#ms-pratinjau'); if (!data.rows.length) { box.innerHTML = ''; return; }
      var h = Object.keys(data.rows[0]), wajib = skema().bidang.filter(function (b) { return b.wajib && b.tipe !== 'daftar' && b.tipe !== 'gambar'; }).map(function (b) { return b.kunci; });
      var norm = h.map(function (k) { return String(k).toUpperCase().trim().replace(/\s+/g, '_'); });
      var hilang = wajib.filter(function (k) { return norm.indexOf(k) < 0; });
      box.innerHTML = '<div class="antara kecil" style="margin-bottom:6px"><b>' + U.angka(data.rows.length) + ' baris terbaca</b>' + (hilang.length ? '<span class="galat-teks">Kolom wajib tidak ada: ' + esc(hilang.join(', ')) + '</span>' : '<span style="color:var(--ok)">' + ik('check', 'sm') + ' kolom wajib lengkap</span>') + '</div>' +
        '<div class="tabel-wrap" style="max-height:200px;border:1px solid var(--border);border-radius:8px"><table class="tabel"><thead><tr>' + h.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + data.rows.slice(0, 5).map(function (r) { return '<tr>' + h.map(function (k) { return '<td>' + esc(r[k]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    };
    m.$('#ms-jenis').addEventListener('change', gambar);
    U.$$('#ms-sumber button', m.el).forEach(function (b) { b.addEventListener('click', function () { U.$$('#ms-sumber button', m.el).forEach(function (x) { x.classList.toggle('aktif', x === b); }); data.sumber = b.dataset.v; m.$('#ms-csv').hidden = data.sumber !== 'csv'; m.$('#ms-sheet').hidden = data.sumber !== 'sheet'; }); });
    m.$('#ms-file').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      var fr = new FileReader(); fr.onload = function () { data.rows = U.uraiCsv(fr.result); if (data.rows.length > 500) { U.toast('Maksimal 500 baris; ' + data.rows.length + ' terbaca.', 'galat'); } pratinjau(); }; fr.readAsText(f);
    });
    m.$('#ms-buat').addEventListener('click', function () {
      var b = this, d = { kodeJenis: m.$('#ms-jenis').value, kirimEmail: m.$('#ms-email').checked, penandatangan: U.$$('[data-slot]', m.el).map(function (s) { return { slot: Number(s.dataset.slot), pejabatId: s.value }; }).filter(function (p) { return p.pejabatId; }) };
      if (data.sumber === 'csv') { if (!data.rows.length) { U.toast('Pilih berkas CSV berisi data.', 'galat'); return; } d.rows = data.rows; }
      else { d.sumberUrl = m.$('#ms-url').value.trim(); d.namaSheet = m.$('#ms-nsheet').value.trim(); if (!d.sumberUrl) { U.toast('Isi URL Google Sheets.', 'galat'); return; } }
      U.sibuk(b, function () {
        return API.panggil('deMassalBuat', d, { timeout: 120000 }).then(function (r) {
          if (!r.success) { U.toast(r.message, 'galat'); return; }
          m.tutup();
          U.modal({ judul: 'Antrean dibuat', ikon: ik('checkCircle'), isi: '<p style="margin:0">' + esc(r.message) + '</p>' + ((r.data.peringatan || []).length ? '<div class="pemberitahuan warn" style="margin-top:12px">' + ik('alert') + '<div>' + r.data.peringatan.slice(0, 10).map(esc).join('<br>') + '</div></div>' : ''), kaki: '<button class="btn btn-primary" data-tutup>Mengerti</button>' });
          API.panggil('deMassalProses', { massalId: r.data.massalId }, { senyap: true, timeout: 120000 }).then(function () { A.segarkan(['dokumen'], { diam: true }); muatStatusMassal(document.getElementById('panel-massal')); });
          muatStatusMassal(document.getElementById('panel-massal'), true);
        });
      });
    });
    gambar();
  }

  // ===========================================================================
  // TANDA TANGAN (Google + PIN)
  // ===========================================================================
  function pinModal(judul, sub, o) {
    o = o || {};
    return new Promise(function (selesai) {
      var kotak = function (p) { return '<div class="pin-input" data-pin="' + p + '">' + new Array(7).join('<input inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="Digit PIN">') + '</div>'; };
      var m = U.modal({ judul: judul, sub: sub, ikon: ik('key'),
        isi: '<div class="tumpuk" style="gap:14px;text-align:center">' + (o.lama ? '<div><div class="label" style="margin-bottom:8px">PIN lama</div>' + kotak('lama') + '</div>' : '') +
          '<div><div class="label" style="margin-bottom:8px">' + esc(o.label || 'PIN 6 digit') + '</div>' + kotak('baru') + '</div>' + (o.ulang ? '<div><div class="label" style="margin-bottom:8px">Ulangi PIN baru</div>' + kotak('ulang') + '</div>' : '') +
          (o.catatan ? '<div class="field" style="text-align:left"><label>Catatan (opsional)</label><input class="input" id="pin-cat" maxlength="300"></div>' : '') +
          '<div class="muted kecil">' + ik('shield', 'sm') + ' PIN tidak pernah disimpan di peramban; diverifikasi server bersama akun Google Anda.</div></div>',
        kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" data-ok>' + esc(o.ya || 'Lanjutkan') + '</button>',
        setelahTutup: function (v) { selesai(v && typeof v === 'object' ? v : null); } });
      U.$$('.pin-input', m.el).forEach(function (w) {
        var ins = U.$$('input', w);
        ins.forEach(function (inp, i) {
          inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); });
          inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); if (e.key === 'Enter') m.$('[data-ok]').click(); });
          inp.addEventListener('paste', function (e) { var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!t) return; e.preventDefault(); t.split('').forEach(function (c, k) { if (ins[k]) ins[k].value = c; }); (ins[t.length] || ins[5]).focus(); });
        });
      });
      var nilai = function (p) { var w = m.el.querySelector('[data-pin="' + p + '"]'); return w ? U.$$('input', w).map(function (x) { return x.value; }).join('') : ''; };
      m.$('[data-ok]').addEventListener('click', function () {
        var v = { pin: nilai('baru'), pinLama: nilai('lama'), ulang: nilai('ulang'), catatan: (m.$('#pin-cat') || {}).value || '' };
        if (!/^\d{6}$/.test(v.pin)) { U.toast('PIN harus 6 angka.', 'galat'); return; }
        if (o.ulang && v.pin !== v.ulang) { U.toast('Ulangan PIN tidak sama.', 'galat'); return; }
        if (o.lama && !/^\d{6}$/.test(v.pinLama)) { U.toast('Isi PIN lama 6 angka.', 'galat'); return; }
        m.tutup(v);
      });
      setTimeout(function () { var f = m.el.querySelector('.pin-input input'); if (f) f.focus(); }, 60);
    });
  }

  function aturPin(adaLama) {
    pinModal(adaLama ? 'Ubah PIN Tanda Tangan' : 'Atur PIN Tanda Tangan', 'PIN dipakai setiap kali Anda menyetujui dokumen.', { lama: adaLama, ulang: true, label: 'PIN baru', ya: 'Simpan PIN' }).then(function (v) {
      if (!v) return;
      API.panggil('ttdAturPin', { pinLama: v.pinLama, pinBaru: v.pin }).then(function (r) { if (U.hasil(r)) A.renderUlang(); });
    });
  }

  var _ttdCache = null;
  A.daftar('ttd', {
    judul: 'Tanda Tangan', tanpaRenderUlang: true,
    render: function (el, ctx) {
      var st = ctx.state; st.pilih = st.pilih || {};
      var gambar = function (d) {
        if (!document.body.contains(el)) return;
        var pj = d.pejabat || [], pinOk = pj.some(function (p) { return p.pinAktif; }), saya = d.daftar.filter(function (x) { return x.slotSaya.length; });
        var lain = d.daftar.filter(function (x) { return !x.slotSaya.length; });
        var jmlPilih = Object.keys(st.pilih).filter(function (k) { return st.pilih[k]; }).length;
        el.innerHTML = '<div class="ttd-root">' + A.kepala({ overline: 'Persetujuan pejabat', judul: 'Tanda Tangan Dokumen', desk: 'Setujui dokumen yang menunggu giliran Anda dengan akun Google + PIN. Slot berurutan diproses dari urutan terkecil.',
          aksi: (A.adm() ? '<label class="cek"><input type="checkbox" id="ttd-semua"' + (st.semua ? ' checked' : '') + '> Tampilkan semua antrean</label>' : '') + '<button class="btn btn-ghost btn-icon" id="ttd-segar" aria-label="Segarkan">' + ik('refresh') + '</button>' }) +
          (pj.length ? '<div class="card card-pad" style="margin-bottom:16px"><div class="antara"><div class="baris">' + ik('signature') + '<div><b>' + esc(pj.map(function (p) { return p.nama; }).join(', ')) + '</b><div class="muted kecil">' + esc(pj.map(function (p) { return p.jabatan; }).join(', ')) + '</div></div></div>' +
            (pinOk ? '<div class="baris"><span class="badge b-terbit">PIN aktif</span><button class="btn btn-ghost btn-sm" id="ttd-pin">' + ik('key', 'sm') + 'Ubah PIN</button></div>' : '<button class="btn btn-gold" id="ttd-pin">' + ik('key', 'sm') + 'Atur PIN Sekarang</button>') + '</div>' +
            (pinOk ? '' : '<div class="pemberitahuan warn" style="margin-top:12px">' + ik('alert') + '<div>Anda belum memiliki PIN. Atur PIN 6 digit agar dapat menyetujui dokumen.</div></div>') + '</div>'
            : '<div class="pemberitahuan" style="margin-bottom:16px">' + ik('info') + '<div>Akun <b>' + esc(A.user().email) + '</b> tidak terdaftar sebagai pejabat penanda tangan. ' + (A.adm() ? 'Anda melihat antrean sebagai pemantau.' : 'Minta Super Admin mengisi email Anda di Master Pejabat.') + '</div></div>') +
          (saya.length ? '<div class="antara" style="margin-bottom:10px"><h3 style="font-size:16px">Giliran Anda (' + saya.length + ')</h3><button class="btn btn-primary btn-sm" id="ttd-massal"' + (jmlPilih ? '' : ' disabled') + '>' + ik('check', 'sm') + 'Setujui terpilih (' + jmlPilih + ')</button></div><div class="daftar-kartu" style="margin-bottom:22px">' + saya.map(kartu).join('') + '</div>' : '') +
          (lain.length ? '<h3 style="font-size:16px;margin-bottom:10px">' + (saya.length ? 'Antrean lainnya' : 'Antrean') + ' (' + lain.length + ')</h3><div class="daftar-kartu">' + lain.map(kartu).join('') + '</div>' : '') +
          (!d.daftar.length ? '<div class="card">' + U.kosong('Tidak ada dokumen yang menunggu tanda tangan.', 'checkCircle') + '</div>' : '') + '</div>';
        function kartu(x) {
          var giliran = x.penandatangan.filter(function (p) { return p.status !== 'SETUJU'; }), minU = Math.min.apply(null, giliran.map(function (p) { return Number(p.urutan) || p.slot; }));
          return '<div class="item-kartu" style="cursor:default"><div class="atas"><span class="baris" style="gap:8px">' + (x.slotSaya.length ? '<input type="checkbox" data-pilih="' + esc(x.modul + '|' + x.id) + '"' + (st.pilih[x.modul + '|' + x.id] ? ' checked' : '') + ' aria-label="Pilih">' : '') + '<span class="badge b-ttd tanpa-titik">' + esc(x.label) + '</span>' + (x.massalId ? '<span class="mono kecil muted">' + esc(x.massalId) + '</span>' : '') + '</span><span class="mono kecil muted">' + esc(U.relatif(x.dibuat)) + '</span></div>' +
            '<div class="jdl">' + esc(x.perihal || '(tanpa perihal)') + '</div><div class="sub">' + esc(x.tujuan || '') + (x.dibuatOleh ? ' · diajukan ' + esc(String(x.dibuatOleh).split('@')[0]) : '') + '</div>' +
            '<div class="slot-ttd" style="margin-top:10px">' + x.penandatangan.map(function (p) { var g = p.status !== 'SETUJU' && (Number(p.urutan) || p.slot) === minU; return '<span class="sl ' + (p.status === 'SETUJU' ? 'ok' : g ? 'giliran' : '') + '">' + ik(p.status === 'SETUJU' ? 'check' : 'clock', 'sm') + esc(p.label) + ': ' + esc(p.nama) + '</span>'; }).join('') + '</div>' +
            '<div class="baris" style="margin-top:12px"><button class="btn btn-soft btn-sm" data-pratinjau="' + esc(x.modul + '|' + x.id) + '" data-muat="Merender…">' + ik('eye', 'sm') + 'Pratinjau</button>' +
            (x.slotSaya.length ? '<button class="btn btn-primary btn-sm" data-setuju="' + esc(x.modul + '|' + x.id + '|' + x.slotSaya[0]) + '">' + ik('check', 'sm') + 'Setujui</button><button class="btn btn-danger btn-sm" data-tolak="' + esc(x.modul + '|' + x.id) + '">' + ik('x', 'sm') + 'Kembalikan</button>' : '') +
            (x.bisaBypass ? '<button class="btn btn-ghost btn-sm" data-bypass="' + esc(x.modul + '|' + x.id) + '">' + ik('zap', 'sm') + 'Bypass</button>' : '') + '</div></div>';
        }
        var R = el.querySelector('.ttd-root');
        var pinBtn = R.querySelector('#ttd-pin'); if (pinBtn) pinBtn.addEventListener('click', function () { aturPin(pinOk); });
        var sm = R.querySelector('#ttd-semua'); if (sm) sm.addEventListener('change', function () { st.semua = sm.checked; muat(); });
        R.querySelector('#ttd-segar').addEventListener('click', function () { var b = this; U.sibuk(b, muat); });
        U.$$('[data-pilih]', R).forEach(function (c) { c.addEventListener('change', function () { st.pilih[c.dataset.pilih] = c.checked; var n = Object.keys(st.pilih).filter(function (k) { return st.pilih[k]; }).length; var b = R.querySelector('#ttd-massal'); if (b) { b.disabled = !n; b.innerHTML = ik('check', 'sm') + 'Setujui terpilih (' + n + ')'; } }); });
        U.$$('[data-pratinjau]', R).forEach(function (b) { b.addEventListener('click', function () { var p = b.dataset.pratinjau.split('|'); U.sibuk(b, function () { return API.panggil('ttdPratinjau', { modul: p[0], id: p[1] }, { timeout: 180000 }).then(function (r) { if (r.success) A.lihatBerkas(r.data, 'Pratinjau dokumen (nomor belum resmi)'); else U.toast(r.message, 'galat'); }); }); }); });
        U.$$('[data-setuju]', R).forEach(function (b) {
          b.addEventListener('click', function () {
            if (!pinOk) { aturPin(false); return; }
            var p = b.dataset.setuju.split('|');
            pinModal('Setujui tanda tangan', 'Dokumen terbit otomatis bila Anda penanda tangan terakhir.', { catatan: true, ya: 'Setujui' }).then(function (v) {
              if (!v) return;
              U.sibuk(b, function () { return API.panggil('ttdSetujui', { modul: p[0], id: p[1], slot: Number(p[2]), pin: v.pin, catatan: v.catatan }, { timeout: 300000 }).then(selesaiAksi); });
            });
          });
        });
        U.$$('[data-tolak]', R).forEach(function (b) { b.addEventListener('click', function () { var p = b.dataset.tolak.split('|'); U.minta('Kembalikan ke pembuat', { label: 'Alasan / catatan perbaikan', textarea: true, min: 5, bahaya: true, ya: 'Kembalikan' }).then(function (c) { if (c) API.panggil('ttdTolak', { modul: p[0], id: p[1], catatan: c }).then(selesaiAksi); }); }); });
        U.$$('[data-bypass]', R).forEach(function (b) { b.addEventListener('click', function () { var p = b.dataset.bypass.split('|'); U.minta('Bypass persetujuan', { label: 'Alasan bypass (tercatat & tampil di verifikasi)', textarea: true, min: 5, bahaya: true, ya: 'Bypass & Terbitkan' }).then(function (c) { if (c) U.sibuk(b, function () { return API.panggil('ttdBypass', { modul: p[0], id: p[1], alasan: c }, { timeout: 300000 }).then(selesaiAksi); }); }); }); });
        var bm = R.querySelector('#ttd-massal');
        if (bm) bm.addEventListener('click', function () {
          var items = Object.keys(st.pilih).filter(function (k) { return st.pilih[k]; }).map(function (k) { var p = k.split('|'); return { modul: p[0], id: p[1] }; });
          if (!items.length) return;
          if (!pinOk) { aturPin(false); return; }
          pinModal('Setujui ' + items.length + ' dokumen', 'Satu PIN untuk semua dokumen terpilih. Penerbitan diproses server bertahap.', { ya: 'Setujui Semua' }).then(function (v) {
            if (!v) return;
            U.sibuk(bm, function () { return API.panggil('ttdSetujui', { items: items, pin: v.pin }, { timeout: 300000 }).then(function (r) { st.pilih = {}; selesaiAksi(r); }); });
          });
        });
        if (ctx.q.pin && !st._qpin && pj.length) { st._qpin = 1; aturPin(pinOk); }
      };
      var selesaiAksi = function (r) {
        if (!U.hasil(r)) return;
        if (r.data && r.data.ditolak && r.data.ditolak.length) U.toast(r.data.ditolak.length + ' dilewati: ' + r.data.ditolak.slice(0, 3).join('; '), 'info', 7000);
        muat();
        A.segarkan(['suratKeluar', 'sk', 'beritaAcara', 'dokumen'], { diam: true, render: false });
      };
      var muat = function () {
        return API.panggil('ttdAntrean', { semua: !!st.semua }).then(function (r) {
          if (!r.success) { el.innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
          _ttdCache = r.data; gambar(r.data);
          if (A.data) { A.data.lencana = Object.assign({}, A.data.lencana, { ttd: r.data.daftar.filter(function (x) { return x.slotSaya.length || A.sa(); }).length }); }
        });
      };
      if (_ttdCache) gambar(_ttdCache); else el.innerHTML = A.kepala({ overline: 'Persetujuan pejabat', judul: 'Tanda Tangan Dokumen' }) + U.skel(3, 120);
      muat();
    }
  });

  // ===========================================================================
  // TEMPLATE DOKUMEN (dipanggil dari Pengaturan)
  // ===========================================================================
  var TIPE = [['teks', 'Teks singkat'], ['area', 'Teks panjang'], ['naskah', 'Naskah (editor)'], ['tanggal', 'Tanggal'], ['angka', 'Angka'], ['pilihan', 'Pilihan'], ['daftar', 'Daftar/tabel berulang'], ['gambar', 'Gambar']];
  function renderTemplate(el) {
    var js = A.master('jenisSurat').slice().sort(function (a, b) { return String(a.modul + a.kode).localeCompare(String(b.modul + b.kode)); });
    var w = document.createElement('div');
    w.innerHTML = '<div class="antara" style="margin-bottom:12px;flex-wrap:wrap"><div><h3 style="font-size:17px">Template Dokumen</h3><div class="muted kecil">Template Google Docs/Sheets/Slides dengan penanda <span class="mono">{{KUNCI}}</span>. Master tidak pernah diubah — setiap dokumen dibuat dari salinan.</div></div><button class="btn btn-ghost btn-sm" id="tp-bantu">' + ik('help', 'sm') + 'Panduan penanda</button></div>' +
      A.tabel({ rows: js, kosong: 'Belum ada jenis surat.', kolom: [
        { l: 'Jenis', f: function (j) { return '<b style="font-weight:600">' + esc(j.nama) + '</b><div class="mono kecil muted">' + esc(j.kode) + ' · ' + esc(j.modul) + '</div>'; } },
        { l: 'Template', f: function (j) { if (j.modul === 'MOU') return '<span class="muted kecil">MOU dicatat manual (unggah berkas)</span>'; var t = A.templateJenis(j.kode); return t && t.docId ? '<span class="badge b-terbit tanpa-titik">' + esc((t.engine || 'docs').toUpperCase()) + ' v' + esc(t.versi || 1) + '</span>' + (String(t.aktif) === 'false' ? ' <span class="badge b-draf">nonaktif</span>' : '') + '<div class="kecil muted" style="margin-top:4px">' + esc(t.namaTemplate || '') + '</div>' : '<span class="badge b-perbaikan tanpa-titik">belum ada</span>'; } },
        { l: 'Kolom / Slot', f: function (j) { var t = A.templateJenis(j.kode); return t ? '<span class="mono">' + t.bidang.length + ' kolom · ' + t.slotTtd.length + ' slot</span><div class="kecil muted">' + t.bidang.filter(function (b) { return b.publik; }).length + ' kolom publik</div>' : '-'; } },
        { l: 'Aksi', f: function (j) {
          var t = A.templateJenis(j.kode), k = esc(j.kode);
          if (j.modul === 'MOU') return '-';
          if (!A.tulis()) return t && t.docUrl ? '<a class="btn btn-ghost btn-xs" href="' + esc(t.docUrl) + '" target="_blank" rel="noopener">' + ik('external', 'sm') + 'Buka</a>' : '-';
          return '<div class="baris" style="gap:6px">' + (t && t.docId ? '<button class="btn btn-primary btn-xs" data-tp="atur" data-k="' + k + '">' + ik('sliders', 'sm') + 'Atur</button><button class="btn btn-soft btn-xs" data-tp="pindai" data-k="' + k + '" data-muat="Memindai…">' + ik('refresh', 'sm') + 'Pindai ulang</button><a class="btn btn-ghost btn-xs" href="' + esc(t.docUrl) + '" target="_blank" rel="noopener">' + ik('external', 'sm') + 'Buka di Google</a><button class="btn btn-ghost btn-xs" data-tp="url" data-k="' + k + '">' + ik('link', 'sm') + 'Ganti</button><button class="btn btn-ghost btn-xs" data-tp="ulang" data-k="' + k + '" data-muat="Membuat…">' + ik('rotate', 'sm') + 'Bawaan</button>'
            : '<button class="btn btn-gold btn-xs" data-tp="siapkan" data-k="' + k + '" data-muat="Membuat…">' + ik('plus', 'sm') + 'Siapkan bawaan</button><button class="btn btn-soft btn-xs" data-tp="url" data-k="' + k + '">' + ik('link', 'sm') + 'Hubungkan URL</button>') + '</div>';
        } }], klik: false });
    el.innerHTML = ''; el.appendChild(w);
    w.querySelector('#tp-bantu').addEventListener('click', panduanPenanda);
    U.$$('[data-tp]', w).forEach(function (b) { b.addEventListener('click', function () { aksiTemplate(b.dataset.tp, b.dataset.k, b, el); }); });
  }

  function segarTemplate(el, r) {
    if (r && r.data && r.data.master) { A.setMaster('templateDoc', r.data.master); renderTemplate(el); return Promise.resolve(); }
    return A.segarkan([], { master: ['templateDoc'], render: false }).then(function () { renderTemplate(el); });
  }
  function aksiTemplate(a, kode, btn, el) {
    var hasil = function (r) {
      if (!r.success) { U.toast(r.message, 'galat'); return; }
      U.toast(r.message, 'ok', 7000);
      return segarTemplate(el, r);
    };
    if (a === 'siapkan') return U.sibuk(btn, function () { return API.panggil('siapkanTemplateDoc', { kodeJenis: kode }, { timeout: 180000 }).then(hasil); });
    if (a === 'pindai') return U.sibuk(btn, function () { return API.panggil('pindaiTemplateDoc', { kodeJenis: kode }, { timeout: 180000 }).then(hasil); });
    if (a === 'ulang') return U.konfirmasi('Buat ulang dari bawaan?', 'Template baru dibuat dari desain bawaan dan menggantikan tautan template ' + kode + '. Template lama tetap ada di Drive (versi tersimpan).', { ya: 'Buat ulang' }).then(function (y) { if (y) U.sibuk(btn, function () { return API.panggil('buatUlangTemplateDoc', { kodeJenis: kode }, { timeout: 180000 }).then(hasil); }); });
    if (a === 'url') return U.minta('Hubungkan template ' + kode, { label: 'URL Google Docs / Sheets / Slides (atau .docx di Drive)', placeholder: 'https://docs.google.com/document/d/…', ya: 'Hubungkan', bantu: 'Berkas di luar folder aplikasi akan disalin ke folder Template_Dokumen.' })
      .then(function (u) { if (u) API.panggil('hubungkanTemplateDoc', { kodeJenis: kode, url: u }, { timeout: 180000 }).then(hasil); });
    if (a === 'atur') return aturTemplate(kode, el);
  }

  function aturTemplate(kode, elInduk) {
    var t = A.templateJenis(kode), j = A.jenisByKode(kode) || {};
    if (!t) return;
    var bidang = JSON.parse(JSON.stringify(t.bidang || [])), slot = JSON.parse(JSON.stringify(t.slotTtd || []));
    var keluaran = t.keluaran || ['pdf'], pj = A.master('pejabat');
    var baris = function (b, i) {
      return '<tr data-i="' + i + '"><td><span class="mono kecil">' + esc(b.kunci) + '</span><div class="kecil muted">' + esc(b.kategori || '') + '</div></td>' +
        '<td><input class="input" style="min-height:34px" data-f="label" value="' + esc(b.label || '') + '"></td>' +
        '<td><select class="select" style="min-height:34px;min-width:168px" data-f="tipe">' + TIPE.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === b.tipe ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></td>' +
        '<td style="text-align:center"><input type="checkbox" data-f="wajib"' + (b.wajib ? ' checked' : '') + ' aria-label="Wajib"></td>' +
        '<td style="text-align:center"><input type="checkbox" data-f="publik"' + (b.publik ? ' checked' : '') + (/^(naskah|gambar|daftar)$/.test(b.tipe) ? ' disabled' : '') + ' aria-label="Publik"></td>' +
        '<td><input class="input" style="min-height:34px" data-f="bantu" value="' + esc(b.bantu || '') + '" placeholder="teks bantuan"></td>' +
        '<td><input class="input" style="min-height:34px" data-f="opsi" value="' + esc((b.opsi || []).join(', ')) + '" placeholder="opsi1, opsi2"' + (b.tipe === 'pilihan' ? '' : ' disabled') + '></td>' +
        '<td><input class="input" style="min-height:34px" data-f="bawaan" value="' + esc(b.bawaan || '') + '" placeholder="nilai bawaan"></td></tr>';
    };
    var kartuSlot = function (s, i) {
      return '<div class="blok-abu" data-s="' + i + '" style="padding:14px"><div class="antara" style="margin-bottom:10px"><b>Slot ' + esc(s.slot) + '</b><span class="mono kecil muted">' + esc((s.penanda || []).map(function (p) { return '{{' + p + (s.slot > 1 ? '_' + s.slot : '') + '}}'; }).join(' ')) + '</span></div><div class="grid-form">' +
        '<div class="field"><label>Label</label><input class="input" data-f="label" value="' + esc(s.label || '') + '"></div>' +
        '<div class="field"><label>Cara menentukan pejabat</label><select class="select" data-f="cara"><option value="pilih"' + (s.cara === 'pilih' ? ' selected' : '') + '>Dipilih saat membuat</option><option value="tetap"' + (s.cara === 'tetap' ? ' selected' : '') + '>Pejabat tetap</option><option value="jabatan"' + (s.cara === 'jabatan' ? ' selected' : '') + '>Menurut jabatan pada tanggal dokumen</option></select></div>' +
        '<div class="field"><label>Pejabat (tetap/bawaan)</label><select class="select" data-f="pejabatId"><option value="">—</option>' + pj.map(function (p) { return '<option value="' + esc(p.id) + '"' + (String(p.id) === String(s.pejabatId) ? ' selected' : '') + '>' + esc(p.nama) + ' — ' + esc(p.jabatan) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Jabatan (untuk cara jabatan)</label><input class="input" data-f="jabatan" value="' + esc(s.jabatan || '') + '" placeholder="mis. Ketua"></div>' +
        '<div class="field"><label>Tanda di dokumen</label><select class="select" data-f="tanda">' + [['spesimen', 'Spesimen TTD'], ['qr', 'QR penanda tangan'], ['qr+spesimen', 'QR + spesimen'], ['kosong', 'Kosong (TTD basah)']].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === s.tanda ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Urutan persetujuan</label><input class="input" type="number" min="1" data-f="urutan" value="' + esc(s.urutan || s.slot) + '"></div>' +
        '<label class="cek penuh"><input type="checkbox" data-f="wajibSetuju"' + (s.wajibSetuju ? ' checked' : '') + '> Wajib disetujui pejabat sendiri (login Google + PIN) sebelum terbit</label></div></div>';
    };
    var m = U.modal({ judul: 'Atur Template — ' + (j.nama || kode), sub: (t.engine || 'docs').toUpperCase() + ' · versi ' + (t.versi || 1) + ' · ' + (t.placeholder || []).length + ' penanda', lebar: 'sangat-lebar', ikon: ik('sliders'),
      isi: '<div class="tab-baris" id="at-tab"><button class="aktif" data-t="kolom">' + ik('list', 'sm') + 'Kolom isian (' + bidang.length + ')</button><button data-t="slot">' + ik('signature', 'sm') + 'Penanda tangan (' + slot.length + ')</button><button data-t="keluaran">' + ik('download', 'sm') + 'Keluaran</button></div>' +
        '<div data-p="kolom"><div class="muted kecil" style="margin-bottom:10px">' + ik('info', 'sm') + ' Centang <b>Publik</b> agar kolom muncul di formulir permohonan portal. Kolom sistem (NOMOR, TANGGAL, pejabat, QR) diisi otomatis.</div><div class="tabel-wrap"><table class="tabel" id="at-bidang"><thead><tr><th>Penanda</th><th>Label</th><th>Tipe</th><th>Wajib</th><th>Publik</th><th>Bantuan</th><th>Opsi</th><th>Bawaan</th></tr></thead><tbody>' + bidang.map(baris).join('') + '</tbody></table></div></div>' +
        '<div data-p="slot" hidden class="tumpuk" style="gap:12px">' + slot.map(kartuSlot).join('') + '<label class="cek"><input type="checkbox" id="at-qrper"' + (String(t.qrPerPenandatangan) === 'true' ? ' checked' : '') + '> QR terpisah untuk setiap penanda tangan (kode-1, kode-2 …)</label></div>' +
        '<div data-p="keluaran" hidden class="tumpuk" style="gap:12px"><div class="baris">' + ['pdf', 'docx', 'xlsx', 'png'].map(function (f) { return '<label class="cek"><input type="checkbox" data-kel="' + f + '"' + (keluaran.indexOf(f) >= 0 ? ' checked' : '') + (f === 'pdf' ? ' disabled' : '') + '> ' + f.toUpperCase() + '</label>'; }).join('') + '</div><div class="muted kecil">PDF selalu dibuat (diarsipkan & di-hash). DOCX untuk Docs, XLSX untuk Sheets, PNG untuk Slides.</div>' +
        '<label class="saklar"><input type="checkbox" id="at-aktif"' + (String(t.aktif) !== 'false' ? ' checked' : '') + '><span class="jalur"></span>Template aktif (nonaktif = memakai format HTML cadangan)</label></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" id="at-simpan" data-muat="Menyimpan…">' + ik('save', 'sm') + 'Simpan Setelan</button>' });
    U.$$('#at-tab button', m.el).forEach(function (b) { b.addEventListener('click', function () { U.$$('#at-tab button', m.el).forEach(function (x) { x.classList.toggle('aktif', x === b); }); U.$$('[data-p]', m.el).forEach(function (p) { p.hidden = p.dataset.p !== b.dataset.t; }); }); });
    U.$$('#at-bidang [data-f="tipe"]', m.el).forEach(function (s) { s.addEventListener('change', function () { var tr = s.closest('tr'); tr.querySelector('[data-f="opsi"]').disabled = s.value !== 'pilihan'; var p = tr.querySelector('[data-f="publik"]'); p.disabled = /^(naskah|gambar|daftar)$/.test(s.value); if (p.disabled) p.checked = false; }); });
    m.$('#at-simpan').addEventListener('click', function () {
      U.$$('#at-bidang tbody tr', m.el).forEach(function (tr) {
        var b = bidang[Number(tr.dataset.i)];
        b.label = tr.querySelector('[data-f="label"]').value.trim(); b.tipe = tr.querySelector('[data-f="tipe"]').value;
        b.wajib = tr.querySelector('[data-f="wajib"]').checked; b.publik = tr.querySelector('[data-f="publik"]').checked;
        b.bantu = tr.querySelector('[data-f="bantu"]').value.trim(); b.opsi = tr.querySelector('[data-f="opsi"]').value.split(',').map(function (x) { return x.trim(); }).filter(String);
        b.bawaan = tr.querySelector('[data-f="bawaan"]').value;
      });
      U.$$('[data-s]', m.el).forEach(function (w) {
        var s = slot[Number(w.dataset.s)];
        ['label', 'cara', 'pejabatId', 'jabatan', 'tanda'].forEach(function (k) { s[k] = w.querySelector('[data-f="' + k + '"]').value; });
        s.urutan = Number(w.querySelector('[data-f="urutan"]').value) || s.slot; s.wajibSetuju = w.querySelector('[data-f="wajibSetuju"]').checked;
      });
      var bad = slot.filter(function (s) { return s.cara === 'tetap' && !s.pejabatId; });
      if (bad.length) { U.toast('Pilih pejabat untuk slot berjenis "Pejabat tetap".', 'galat'); return; }
      var kel = ['pdf'].concat(U.$$('[data-kel]', m.el).filter(function (c) { return c.checked && c.dataset.kel !== 'pdf'; }).map(function (c) { return c.dataset.kel; }));
      var b = this;
      U.sibuk(b, function () {
        return API.panggil('simpanBidangTemplate', { kodeJenis: kode, bidang: bidang, slotTtd: slot, keluaran: kel, qrPerPenandatangan: m.$('#at-qrper') ? m.$('#at-qrper').checked : false, aktif: m.$('#at-aktif').checked }).then(function (r) {
          if (!U.hasil(r)) return; m.tutup(); segarTemplate(elInduk, r);
          if (window.Pub) Pub.muat(true);
        });
      });
    });
  }

  function panduanPenanda() {
    var baris = [['{{PERIHAL}}', 'Diganti nilai kolom isian (kolom otomatis terbentuk saat dipindai).'], ['{{NAMA|kapital}}', 'Pengubah: kapital, kecil, judul, rupiah, ribuan, terbilang, tanggal, bawaan:teks.'],
      ['{{NOMOR}} {{TANGGAL}} {{KOTA}}', 'Diisi sistem saat terbit (nomor dikunci, tanggal Indonesia).'], ['{{NAMA_PEJABAT}} {{JABATAN}} {{NIDN}} {{TTE}}', 'Slot penanda tangan 1. Slot berikut: _2, _3 (mis. {{NAMA_PEJABAT_2}} {{TTD_2}}).'],
      ['{{QR}}', 'QR verifikasi dokumen. Tanpa {{QR}} → QR ditaruh di pojok bawah.'], ['{{#PESERTA}} … {{PESERTA.NAMA}}', 'Baris tabel berulang dari kolom tipe Daftar ({{NO}} = nomor urut).'],
      ['{{?CATATAN}} … {{/CATATAN}}', 'Blok tampil hanya bila kolom CATATAN terisi.'], ['{{ISI}} / *_NASKAH', 'Naskah kaya dari editor (tebal, miring, daftar 1/a/A/i, tabel, perataan).'],
      ['{{NAMA_PEMOHON}} {{NO_REF}}', 'Data pemohon otomatis bila surat dibuat dari permohonan portal.']];
    U.modal({ judul: 'Panduan Penanda Template', ikon: ik('help'), lebar: 'lebar', isi: '<table class="tabel"><tbody>' + baris.map(function (b) { return '<tr><td class="mono" style="white-space:nowrap">' + esc(b[0]) + '</td><td>' + esc(b[1]) + '</td></tr>'; }).join('') + '</tbody></table><div class="pemberitahuan" style="margin-top:14px">' + ik('info') + '<div>Setelah menyunting template di Google, klik <b>Pindai ulang</b> agar kolom & slot baru dikenali. Setelan label/tipe yang sudah Anda atur tetap dipertahankan.</div></div>', kaki: '<button class="btn btn-primary" data-tutup>Mengerti</button>' });
  }

  window.DocEngineUI = { renderTemplate: renderTemplate, pinModal: pinModal, aturPin: aturPin };
})();
