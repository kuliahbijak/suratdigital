/**
 * permohonan.js — formulir permohonan surat (popup portal publik).
 * Bar kelengkapan, draf otomatis di peramban (tanpa lampiran), lampiran seret-lepas
 * (gambar dikompres), honeypot anti-bot, reqId idempoten (klik ganda tidak menggandakan).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon;
  var KUNCI_DRAF = 'draf_mohon';

  function jenisList() { return ((window.Pub && Pub.data) || {}).jenisSurat || []; }
  function batas() { return ((window.Pub && Pub.data) || {}).batas || { uploadMaxMb: 2, uploadFormat: 'pdf,jpg,jpeg,png,doc,docx' }; }

  function inputKolom(k, nilai) {
    var nm = 'i_' + k.kunci, v = esc(nilai || ''), req = k.wajib ? ' data-wajib="1"' : '';
    var lbl = '<label for="' + nm + '">' + esc(k.label) + (k.wajib ? ' <span class="wajib">*</span>' : '') + '</label>';
    var bantu = k.bantu ? '<div class="bantu">' + esc(k.bantu) + '</div>' : '';
    if (k.tipe === 'area') return '<div class="field penuh">' + lbl + '<textarea class="textarea" id="' + nm + '" name="' + nm + '"' + req + ' maxlength="2000">' + v + '</textarea>' + bantu + '</div>';
    if (k.tipe === 'pilihan' && (k.opsi || []).length) return '<div class="field">' + lbl + '<select class="select" id="' + nm + '" name="' + nm + '"' + req + '><option value="">— pilih —</option>' + k.opsi.map(function (o) { return '<option' + (o === nilai ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + bantu + '</div>';
    var tipe = k.tipe === 'tanggal' ? 'date' : k.tipe === 'angka' ? 'number' : 'text';
    return '<div class="field">' + lbl + '<input class="input" id="' + nm + '" name="' + nm + '" type="' + tipe + '"' + req + ' value="' + v + '" maxlength="300">' + bantu + '</div>';
  }

  function buka(kodeAwal) {
    var d = (window.Pub && Pub.data) || null;
    if (!d) { U.toast('Memuat data portal…', 'info'); Pub.muat(true).then(function (x) { if (x) buka(kodeAwal); }); return; }
    if (!d.portal.permohonanAktif) {
      U.modal({ judul: 'Portal permohonan ditutup', ikon: ik('lock'), isi: '<p style="margin:0">Layanan permohonan surat sedang ditutup sementara oleh sekretariat. Silakan coba lagi nanti atau hubungi sekretariat.</p>', kaki: '<button class="btn btn-primary" data-tutup>Mengerti</button>' });
      return;
    }
    var jenis = jenisList();
    if (!jenis.length) { U.toast('Belum ada jenis surat yang dibuka untuk publik.', 'info'); return; }
    var draf = Simpan.get(KUNCI_DRAF, null) || {};
    var kode = String(kodeAwal || draf.kodeJenis || '').toUpperCase();
    if (!jenis.some(function (j) { return j.kode === kode; })) kode = jenis.length === 1 ? jenis[0].kode : '';
    var reqId = API.reqIdBaru(), berkas = [];
    var B = batas(), FORMAT = String(B.uploadFormat || '').toLowerCase().split(/[,\s]+/).filter(String);

    var m = U.modal({
      judul: 'Formulir Permohonan Surat', sub: 'Isi data dengan benar. Nomor referensi dikirim ke email & WhatsApp Anda.', lebar: 'lebar', kelas: 'form-mohon', ikon: ik('filePlus'), tetap: true,
      atas: '<div class="bar-lengkap"><span>' + ik('info', 'sm') + '</span><span id="pm-lengkap-teks">Kelengkapan 0%</span><span class="trek"><i id="pm-trek" style="width:0%"></i></span></div>',
      isi: '<form id="f-mohon" novalidate autocomplete="on">' +
        '<div class="seksi-form"><div class="jdl">1 · Jenis surat</div><div class="field"><label for="pm-jenis">Jenis surat yang dimohon <span class="wajib">*</span></label>' +
        '<select class="select" id="pm-jenis" name="kodeJenis" data-wajib="1"><option value="">— pilih jenis surat —</option>' + jenis.map(function (j) { return '<option value="' + esc(j.kode) + '"' + (j.kode === kode ? ' selected' : '') + '>' + esc(j.nama) + '</option>'; }).join('') + '</select>' +
        '<div class="bantu" id="pm-desk"></div></div></div>' +
        '<div class="seksi-form"><div class="jdl">2 · Data pemohon</div><div class="grid-form">' +
        '<div class="field penuh"><label for="pm-nama">Nama lengkap <span class="wajib">*</span></label><input class="input" id="pm-nama" name="nama" data-wajib="1" maxlength="80" autocomplete="name" value="' + esc(draf.nama || '') + '" placeholder="Sesuai identitas"></div>' +
        '<div class="field"><label for="pm-email">Email aktif <span class="wajib">*</span></label><input class="input" id="pm-email" name="email" type="email" data-wajib="1" autocomplete="email" value="' + esc(draf.email || '') + '" placeholder="nama@email.com"></div>' +
        '<div class="field"><label for="pm-email2">Ketik ulang email <span class="wajib">*</span></label><input class="input" id="pm-email2" name="emailUlang" type="email" data-wajib="1" autocomplete="off" value="' + esc(draf.emailUlang || '') + '" placeholder="Ulangi email"><div class="galat-teks" id="pm-email-cek"></div></div>' +
        '<div class="field"><label for="pm-hp">Nomor WhatsApp <span class="wajib">*</span></label><div class="grup-input"><span class="awalan">' + ik('phone', 'sm') + '</span><input class="input" id="pm-hp" name="noTelp" inputmode="tel" data-wajib="1" autocomplete="tel" value="' + esc(draf.noTelp || '') + '" placeholder="0812xxxxxxx" maxlength="16"></div><div class="bantu">10–15 digit, untuk notifikasi status.</div></div>' +
        '<div class="field"><label for="pm-inst">Instansi / asal (opsional)</label><input class="input" id="pm-inst" name="instansi" maxlength="150" value="' + esc(draf.instansi || '') + '" placeholder="Program studi, instansi, dll."></div>' +
        '</div></div>' +
        '<div class="seksi-form" id="pm-seksi-isian" hidden><div class="jdl">3 · Data surat</div><div class="grid-form" id="pm-isian"></div></div>' +
        '<div class="seksi-form"><div class="jdl">4 · Keperluan</div><div class="field"><label for="pm-kep">Keperluan surat <span class="wajib">*</span></label><textarea class="textarea" id="pm-kep" name="keperluan" data-wajib="1" maxlength="1000" placeholder="Contoh: persyaratan pendaftaran beasiswa …">' + esc(draf.keperluan || '') + '</textarea><div class="antara"><span class="bantu">10–1.000 karakter.</span><span class="bantu mono" id="pm-kep-n">0/1000</span></div></div></div>' +
        '<div class="seksi-form" id="pm-seksi-lamp"><div class="jdl">5 · Lampiran <span id="pm-lamp-ket" class="muted" style="text-transform:none;letter-spacing:0;font-weight:500"></span></div>' +
        '<label class="unggah" id="pm-unggah" tabindex="0">' + ik('upload', 'lg') + '<div style="margin-top:6px"><b>Seret berkas ke sini</b> atau klik untuk memilih</div><div class="kecil">Maks. 5 berkas · ' + esc(B.uploadMaxMb) + ' MB/berkas · ' + esc(FORMAT.join(', ').toUpperCase()) + '</div>' +
        '<input type="file" id="pm-file" multiple hidden accept="' + FORMAT.map(function (f) { return '.' + f; }).join(',') + '"></label><div class="daftar-berkas" id="pm-berkas"></div></div>' +
        '<div style="position:absolute;left:-9999px" aria-hidden="true"><label>Situs web<input name="situs" tabindex="-1" autocomplete="off"></label></div>' +
        '<label class="cek" style="margin-top:14px"><input type="checkbox" id="pm-setuju"> Saya menyatakan data yang diisi benar dan dapat dipertanggungjawabkan.</label>' +
        '</form>',
      kaki: '<span class="muted kecil" style="margin-right:auto">' + ik('lock', 'sm') + ' Data Anda hanya dipakai untuk layanan persuratan.</span><button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-gold" id="pm-kirim" data-muat="Mengirim…">' + ik('send', 'sm') + 'Kirim Permohonan</button>',
      setelahTutup: function (v) { if (v !== 'paksa' && formKotor() && !terkirim) U.toast('Isian disimpan sebagai draf di perangkat ini.', 'info', 2500); }
    });
    var f = m.$('#f-mohon'), terkirim = false;
    var formKotor = function () { return !!(f.nama.value || f.keperluan.value); };

    function jenisAktif() { return jenis.filter(function (j) { return j.kode === f.kodeJenis.value; })[0]; }
    function gambarIsian() {
      var j = jenisAktif(), box = m.$('#pm-isian'), seksi = m.$('#pm-seksi-isian');
      m.$('#pm-desk').textContent = j ? (j.deskripsi || '') : '';
      var kol = j ? j.kolom || [] : [];
      seksi.hidden = !kol.length;
      var lama = draf.isian || {};
      box.innerHTML = kol.map(function (k) { return inputKolom(k, lama[k.kunci]); }).join('');
      var lp = j ? j.lampiranPublik : 'opsional';
      m.$('#pm-seksi-lamp').hidden = lp === 'tidak';
      m.$('#pm-lamp-ket').textContent = lp === 'wajib' ? '(wajib)' : '(opsional)';
      hitung();
    }
    function nilai() {
      var j = jenisAktif(), isian = {};
      (j ? j.kolom : []).forEach(function (k) { var el = f.elements['i_' + k.kunci]; if (el) isian[k.kunci] = el.value.trim(); });
      return { kodeJenis: f.kodeJenis.value, nama: f.nama.value.trim(), email: f.email.value.trim(), emailUlang: f.emailUlang.value.trim(), noTelp: f.noTelp.value.trim(), instansi: f.instansi.value.trim(), keperluan: f.keperluan.value.trim(), isian: isian };
    }
    function hpNormal(h) { h = String(h || '').replace(/[^\d+]/g, ''); if (h.indexOf('+62') === 0) h = '0' + h.slice(3); else if (h.indexOf('62') === 0) h = '0' + h.slice(2); return h; }
    function cek(tampil) {
      var v = nilai(), salah = [];
      var tanda = function (el, buruk) { if (!el) return; el.classList.toggle('salah', !!(buruk && tampil)); if (buruk) salah.push(el); };
      tanda(f.kodeJenis, !v.kodeJenis);
      tanda(f.nama, v.nama.length < 3);
      tanda(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email));
      var beda = v.emailUlang && v.emailUlang.toLowerCase() !== v.email.toLowerCase();
      tanda(f.emailUlang, !v.emailUlang || beda);
      m.$('#pm-email-cek').textContent = beda ? 'Email tidak sama.' : '';
      tanda(f.noTelp, !/^0\d{9,14}$/.test(hpNormal(v.noTelp)));
      tanda(f.keperluan, v.keperluan.length < 10);
      U.$$('[data-wajib]', m.$('#pm-isian')).forEach(function (el) { tanda(el, !el.value.trim()); });
      var j = jenisAktif();
      if (j && j.lampiranPublik === 'wajib' && !berkas.length) salah.push(m.$('#pm-unggah'));
      return salah;
    }
    function hitung() {
      var semua = U.$$('[data-wajib]', f).length + ((jenisAktif() || {}).lampiranPublik === 'wajib' ? 1 : 0) + 1;
      var salah = cek(false).length + (m.$('#pm-setuju').checked ? 0 : 1);
      var p = Math.max(0, Math.round((semua - salah) * 100 / semua));
      m.$('#pm-trek').style.width = p + '%';
      m.$('#pm-lengkap-teks').textContent = 'Kelengkapan ' + p + '%';
      m.$('#pm-kep-n').textContent = f.keperluan.value.length + '/1000';
    }
    var simpanDraf = U.debounce(function () { var v = nilai(); Simpan.set(KUNCI_DRAF, v); draf = v; }, 500);
    f.addEventListener('input', function () { hitung(); simpanDraf(); });
    f.addEventListener('change', function (e) { if (e.target === f.kodeJenis) { draf.isian = {}; gambarIsian(); } hitung(); simpanDraf(); });
    m.$('#pm-setuju').addEventListener('change', hitung);

    // ---- lampiran ----
    function gambarBerkas() {
      m.$('#pm-berkas').innerHTML = berkas.map(function (b, i) {
        return '<div class="bk">' + ik(/image/.test(b.mime) ? 'image' : 'file', 'sm') + '<span class="nm">' + esc(b.nama) + '</span><span class="mono kecil muted">' + U.ukuran(b.ukuran) + '</span><button type="button" class="btn btn-ghost btn-xs" data-hapus="' + i + '" aria-label="Hapus">' + ik('x', 'sm') + '</button></div>';
      }).join('');
      U.$$('[data-hapus]', m.el).forEach(function (b) { b.addEventListener('click', function () { berkas.splice(Number(b.dataset.hapus), 1); gambarBerkas(); hitung(); }); });
    }
    async function tambahBerkas(files) {
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (berkas.length >= 5) { U.toast('Maksimal 5 lampiran.', 'galat'); break; }
        var ext = (file.name.split('.').pop() || '').toLowerCase();
        if (FORMAT.indexOf(ext) < 0) { U.toast(file.name + ': format tidak diizinkan.', 'galat'); continue; }
        try {
          var b = /^image\/(jpeg|png|webp)$/.test(file.type) && file.size > 400 * 1024 ? await U.kompresGambar(file, 1800, 'image/jpeg') : await U.bacaBerkas(file);
          if (b.ukuran > B.uploadMaxMb * 1048576) { U.toast(file.name + ': lebih dari ' + B.uploadMaxMb + ' MB.', 'galat'); continue; }
          berkas.push(b);
        } catch (e) { U.toast(e.message, 'galat'); }
      }
      gambarBerkas(); hitung();
    }
    var zona = m.$('#pm-unggah'), inp = m.$('#pm-file');
    inp.addEventListener('change', function () { tambahBerkas(inp.files); inp.value = ''; });
    zona.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    ['dragenter', 'dragover'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('seret'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('seret'); }); });
    zona.addEventListener('drop', function (e) { tambahBerkas(e.dataTransfer.files); });

    // ---- kirim ----
    var btn = m.$('#pm-kirim');
    btn.addEventListener('click', function () {
      var salah = cek(true);
      if (!m.$('#pm-setuju').checked) salah.push(m.$('#pm-setuju'));
      if (salah.length) {
        U.toast('Lengkapi isian yang ditandai merah' + (salah.indexOf(m.$('#pm-unggah')) >= 0 ? ' (lampiran wajib)' : '') + (salah.indexOf(m.$('#pm-setuju')) >= 0 ? ' dan centang pernyataan' : '') + '.', 'galat');
        if (salah[0] && salah[0].focus) { salah[0].focus(); salah[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return;
      }
      var v = nilai(); v.noTelp = hpNormal(v.noTelp); v.situs = f.situs.value; v.lampiran = berkas.map(function (b) { return { nama: b.nama, base64: b.base64 }; });
      U.sibuk(btn, function () {
        return API.panggil('permohonanAjukan', v, { reqId: reqId, tanpaToken: true, timeout: 120000 }).then(function (r) {
          if (!r.success) { U.toast(r.message, 'galat'); return; }
          Simpan.del(KUNCI_DRAF);
          Simpan.set('lacak_terakhir', { ref: r.data.noRef, email: v.email.toLowerCase() });
          tampilSukses(r);
        });
      });
    });

    function tampilSukses(r) {
      var d0 = r.data, v0kode = f.kodeJenis.value;
      terkirim = true;
      m.el.querySelector('.bar-lengkap') && m.el.querySelector('.bar-lengkap').remove();
      m.$('.modal-body').innerHTML = '<div class="sukses-box"><div class="cek-besar">' + ik('checkCircle', 'xl') + '</div><h3 style="font-size:20px">Permohonan Terkirim</h3>' +
        '<p class="muted" style="max-width:460px;margin:8px auto 0">' + esc(r.message || 'Permohonan Anda kami terima.') + '</p>' +
        '<div class="noref-besar">' + esc(d0.noRef) + ' <button class="btn btn-ghost btn-xs" id="pm-salin">' + ik('copy', 'sm') + '</button></div>' +
        '<p class="kecil muted">Jenis: <b>' + esc(d0.jenisSurat || '') + '</b> · Konfirmasi dikirim ke <b>' + esc(d0.email || '') + '</b></p>' +
        '<div class="pemberitahuan" style="text-align:left;margin-top:14px">' + ik('info') + '<div>Simpan nomor referensi ini. Gunakan bersama email Anda untuk melacak status dan mengunduh surat setelah terbit.</div></div></div>';
      m.$('.modal-foot').innerHTML = '<button class="btn btn-ghost" id="pm-baru">Ajukan lagi</button><a class="btn btn-primary" href="#/lacak?ref=' + encodeURIComponent(d0.noRef) + '" id="pm-lacak">' + ik('search', 'sm') + 'Lacak Status</a>';
      m.$('#pm-salin').addEventListener('click', function () { U.salin(d0.noRef); });
      m.$('#pm-lacak').addEventListener('click', function () { berkas = []; m.tutup('paksa'); });
      m.$('#pm-baru').addEventListener('click', function () { berkas = []; m.tutup('paksa'); setTimeout(function () { buka(v0kode); }, 50); });
    }

    gambarIsian();
    gambarBerkas();
    if (draf.nama || draf.keperluan) {
      var info = document.createElement('div');
      info.className = 'pemberitahuan'; info.style.margin = '12px 0 0';
      info.innerHTML = ik('rotate') + '<div style="flex:1">Draf isian sebelumnya dipulihkan dari perangkat ini.</div><button type="button" class="btn btn-ghost btn-xs" id="pm-buang">Kosongkan</button>';
      f.insertBefore(info, f.firstChild);
      info.querySelector('#pm-buang').addEventListener('click', function () { Simpan.del(KUNCI_DRAF); draf = {}; m.tutup('paksa'); setTimeout(function () { buka(kode); }, 30); });
    }
  }

  window.Permohonan = { buka: buka };
})();
