/**
 * komunikasi.js — WhatsApp & Notifikasi (saklar kanal, token Fonnte tersamar, matriks event,
 * antrean, blast per batch 10/20/50 + jeda) dan CRM Kontak (sinkron otomatis dari permohonan,
 * email, pengguna, pejabat, MOU; deteksi nomor WA, tag, opt-out, duplikat & gabung, impor/ekspor).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon, A = window.Admin;
  var _cfg = null, _pollBlast = null;

  function waBadge(s) { return s === 'Terdaftar' ? '<span class="wa-badge ya">WA ✓</span>' : s === 'Tidak Terdaftar' ? '<span class="wa-badge tidak">bukan WA</span>' : '<span class="wa-badge belum">belum dicek</span>'; }
  function waFormat(t) { return esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>'); }

  // ===========================================================================
  // WHATSAPP & NOTIFIKASI
  // ===========================================================================
  A.daftar('whatsapp', {
    judul: 'WhatsApp & Notifikasi', tanpaRenderUlang: true,
    render: function (el, ctx) {
      var st = ctx.state; st.tab = ctx.sub || st.tab || 'pengaturan';
      el.innerHTML = '<div class="wa-root">' + A.kepala({ overline: 'Komunikasi', judul: 'WhatsApp & Notifikasi', desk: 'Pesan dikirim lewat antrean — aksi pengguna tidak menunggu WhatsApp/Email. Pekerja latar mengirim tiap menit & sesaat setelah aksi.' }) +
        '<div class="tab-baris" id="wa-tab">' + [['pengaturan', 'Pengaturan & Matriks', 'sliders'], ['antrean', 'Antrean Kirim', 'list'], ['blast', 'Blast WhatsApp', 'send']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (t[0] === st.tab ? 'aktif' : '') + '">' + ik(t[2], 'sm') + t[1] + '</button>'; }).join('') + '</div><div id="wa-isi"></div></div>';
      var R = el.querySelector('.wa-root');
      U.$$('#wa-tab button', R).forEach(function (b) { b.addEventListener('click', function () { st.tab = b.dataset.t; history.replaceState(null, '', '#/admin/whatsapp/' + st.tab); A.rute.sub = st.tab; U.$$('#wa-tab button', R).forEach(function (x) { x.classList.toggle('aktif', x === b); }); tab(R.querySelector('#wa-isi'), st); }); });
      tab(R.querySelector('#wa-isi'), st);
    }
  });
  function tab(box, st) {
    clearTimeout(_pollBlast);
    box.innerHTML = U.skel(3, 90);
    if (st.tab === 'antrean') return tabAntrean(box, st);
    if (st.tab === 'blast') return tabBlast(box, st);
    return tabPengaturan(box);
  }

  function tabPengaturan(box) {
    var gambar = function (c) {
      _cfg = c; var sa = A.sa();
      box.innerHTML = '<div class="grid-2" style="margin-bottom:18px"><div class="card"><div class="card-head"><h3>' + ik('wa', 'sm') + ' WhatsApp (Fonnte)</h3>' + (c.waAktif ? '<span class="badge b-terbit">aktif</span>' : '<span class="badge b-draf">mati</span>') + '</div><div class="card-body tumpuk" style="gap:12px">' +
        '<label class="saklar"><input type="checkbox" id="n-wa"' + (c.waAktif ? ' checked' : '') + (sa ? '' : ' disabled') + '><span class="jalur"></span>Saklar utama WhatsApp</label>' +
        '<div class="field"><label>Token Fonnte</label><div class="baris" style="flex-wrap:nowrap"><input class="input mono" id="n-token" value="' + esc(c.token.samar || '') + '" placeholder="' + (c.token.ada ? '' : 'belum diisi') + '" readonly><button class="btn btn-soft btn-sm" id="n-ubahtoken"' + (sa ? '' : ' disabled') + '>' + ik('key', 'sm') + 'Ganti</button></div><div class="bantu">Disimpan di Script Properties (WA_TOKEN); tidak pernah tampil utuh.</div></div>' +
        '<div class="grid-form"><div class="field"><label>Ukuran batch blast</label><select class="select" id="n-batch"' + (sa ? '' : ' disabled') + '>' + [10, 20, 50].map(function (n) { return '<option' + (n === c.batchDefault ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div><div class="field"><label>Jeda antarpesan (detik)</label><input class="input mono" id="n-jeda" value="' + esc(c.jeda) + '"' + (sa ? '' : ' disabled') + ' placeholder="5 atau 3-8"></div></div>' +
        '<div class="field"><label>Nomor WA admin (notifikasi internal)</label><input class="input mono" id="n-waadmin" value="' + esc(c.waAdmin || '') + '" placeholder="0812…, 0813…"' + (sa ? '' : ' disabled') + '></div>' +
        '<label class="cek"><input type="checkbox" id="n-deteksi"' + (c.deteksiOtomatis ? ' checked' : '') + (sa ? '' : ' disabled') + '> Cek otomatis apakah nomor kontak baru terdaftar di WhatsApp</label>' +
        '<div class="baris"><button class="btn btn-soft btn-sm" id="n-perangkat">' + ik('phone', 'sm') + 'Status perangkat</button>' + (sa ? '<button class="btn btn-soft btn-sm" id="n-teswa">' + ik('send', 'sm') + 'Kirim tes WA</button>' : '') + '</div><div id="n-info-wa"></div></div></div>' +
        '<div class="card"><div class="card-head"><h3>' + ik('mail', 'sm') + ' Email</h3>' + (c.emailAktif ? '<span class="badge b-terbit">aktif</span>' : '<span class="badge b-draf">mati</span>') + '</div><div class="card-body tumpuk" style="gap:12px">' +
        '<label class="saklar"><input type="checkbox" id="n-email"' + (c.emailAktif ? ' checked' : '') + (sa ? '' : ' disabled') + '><span class="jalur"></span>Saklar utama Email</label>' +
        '<div class="field"><label>Nama pengirim</label><input class="input" id="n-nama" value="' + esc(c.namaPengirim || '') + '" placeholder="kosong = nama aplikasi"' + (sa ? '' : ' disabled') + '></div>' +
        '<div class="field"><label>Alamat aplikasi (untuk tautan di pesan)</label><input class="input mono" id="n-appurl" value="' + esc(c.appUrl || '') + '"' + (sa ? '' : ' disabled') + '></div>' +
        '<div class="blok-abu tumpuk" style="gap:6px;font-size:13px"><div class="antara"><span>Sisa kuota email hari ini</span><b class="mono">' + (c.sisaKuotaEmail >= 0 ? U.angka(c.sisaKuotaEmail) : '-') + '</b></div><div class="antara"><span>Pekerja latar</span><b class="mono">' + esc(c.pekerja) + '</b></div><div class="antara"><span>Antrean berisi</span><b>' + (c.antreanAda ? 'ya' : 'kosong') + '</b></div></div>' +
        (sa ? '<button class="btn btn-soft btn-sm" id="n-tesemail" style="align-self:flex-start">' + ik('send', 'sm') + 'Kirim tes email ke saya</button>' : '') + '</div></div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Matriks Notifikasi</h3><div class="muted kecil">Saklar per peristiwa × kanal. Klik ' + ik('edit', 'sm') + ' untuk menyunting templat pesan.</div></div></div><div class="tabel-wrap"><table class="tabel responsif"><thead><tr><th>Peristiwa</th><th>Penerima</th><th>WhatsApp</th><th>Email</th><th></th></tr></thead><tbody>' +
        c.matriks.map(function (m, i) { return '<tr><td data-l="Peristiwa"><b style="font-weight:600">' + esc(m.label) + '</b><div class="mono kecil muted">' + esc(m.kode) + '</div></td><td data-l="Penerima">' + esc(m.penerima) + '</td><td data-l="WhatsApp"><label class="saklar"><input type="checkbox" data-m="' + i + '" data-kanal="wa"' + (m.wa ? ' checked' : '') + (sa ? '' : ' disabled') + '><span class="jalur"></span></label></td><td data-l="Email"><label class="saklar"><input type="checkbox" data-m="' + i + '" data-kanal="email"' + (m.email ? ' checked' : '') + (sa ? '' : ' disabled') + '><span class="jalur"></span></label></td><td data-l=""><button class="btn btn-ghost btn-xs" data-edit="' + i + '"' + (sa ? '' : ' disabled') + ' aria-label="Sunting templat">' + ik('edit', 'sm') + '</button></td></tr>'; }).join('') +
        '</tbody></table></div>' + (sa ? '<div class="card-foot"><button class="btn btn-primary" id="n-simpan" data-muat="Menyimpan…">' + ik('save', 'sm') + 'Simpan Pengaturan</button></div>' : '') + '</div>';
      var $ = function (s) { return box.querySelector(s); };
      U.$$('[data-m]', box).forEach(function (cb) { cb.addEventListener('change', function () { c.matriks[cb.dataset.m][cb.dataset.kanal] = cb.checked; }); });
      U.$$('[data-edit]', box).forEach(function (b) { b.addEventListener('click', function () { suntingTemplat(c.matriks[b.dataset.edit]); }); });
      $('#n-perangkat').addEventListener('click', function () { U.sibuk(this, function () { return API.panggil('waPerangkat', {}).then(function (r) { $('#n-info-wa').innerHTML = r.success ? '<div class="pemberitahuan ok">' + ik('phone') + '<div>Perangkat <b>' + esc(r.data.device || '-') + '</b> · ' + esc(r.data.status || '') + ' · paket ' + esc(r.data.paket || '-') + ' · kuota ' + esc(r.data.kuota || '-') + (r.data.kedaluwarsa ? ' · s.d. ' + esc(r.data.kedaluwarsa) : '') + '</div></div>' : '<div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(r.message) + '</div></div>'; }); }); });
      var tw = $('#n-teswa'); if (tw) tw.addEventListener('click', function () { U.minta('Kirim tes WhatsApp', { label: 'Nomor tujuan', placeholder: '0812xxxxxxx', ya: 'Kirim' }).then(function (n) { if (n) API.panggil('waTes', { nomor: n }).then(function (r) { U.hasil(r); }); }); });
      var te = $('#n-tesemail'); if (te) te.addEventListener('click', function () { U.sibuk(te, function () { return API.panggil('emailTes', {}).then(function (r) { U.hasil(r); }); }); });
      var ut = $('#n-ubahtoken'); if (ut) ut.addEventListener('click', function () { U.minta('Token Fonnte', { label: 'Token perangkat dari dashboard Fonnte', tipe: 'password', ya: 'Simpan ke Script Properties', bantu: 'Kosongkan & batal bila tidak ingin mengubah.' }).then(function (t) { if (t) API.panggil('notifConfigSimpan', { token: t }).then(function (r) { if (U.hasil(r)) gambar(r.data); }); }); });
      var sv = $('#n-simpan');
      if (sv) sv.addEventListener('click', function () {
        var d = { waAktif: $('#n-wa').checked, emailAktif: $('#n-email').checked, batchDefault: Number($('#n-batch').value), jeda: $('#n-jeda').value.trim(), deteksiOtomatis: $('#n-deteksi').checked,
          namaPengirim: $('#n-nama').value.trim(), waAdmin: $('#n-waadmin').value.trim(), appUrl: $('#n-appurl').value.trim(), matriks: c.matriks };
        U.sibuk(sv, function () { return API.panggil('notifConfigSimpan', d).then(function (r) { if (U.hasil(r)) gambar(r.data); }); });
      });
    };
    if (_cfg) gambar(_cfg);
    API.panggil('notifConfig', {}).then(function (r) { if (!document.body.contains(box)) return; if (!r.success) { box.innerHTML = '<div class="pemberitahuan galat">' + esc(r.message) + '</div>'; return; } gambar(r.data); });
  }

  function suntingTemplat(m) {
    var md = U.modal({ judul: 'Templat: ' + m.label, sub: 'Variabel: ' + m.vars + ' {institusi} {app} {link}', lebar: 'lebar', ikon: ik('edit'),
      isi: '<div class="grid-2"><div class="tumpuk" style="gap:12px"><div class="field"><label>Subjek email</label><input class="input" id="t-subjek" value="' + esc(m.subjek) + '"></div><div class="field"><label>Isi pesan (WA: *tebal* _miring_)</label><textarea class="textarea" id="t-pesan" style="min-height:220px">' + esc(m.pesan) + '</textarea></div><button class="btn btn-ghost btn-sm" id="t-reset" style="align-self:flex-start">' + ik('rotate', 'sm') + 'Kembalikan bawaan</button></div>' +
        '<div><div class="overline" style="margin-bottom:8px">Pratinjau WhatsApp</div><div class="wa-preview"><div class="gel" id="t-prev"></div></div></div></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" data-ok>Terapkan</button>' });
    var contoh = { nama: 'Ahmad Fauzi', noRef: 'PRM/2026/10-0012', jenisSurat: 'Surat Keterangan', linkLacak: 'https://…/#/lacak', admin: 'Sekretariat', catatan: 'Lampirkan KTM.', nomorSurat: '012/SKET/STIS-AW/X/2026', linkUnduh: 'https://…', linkVerifikasi: 'https://…/?v=KD82JA9XL1', institusi: A.cfg('INSTITUSI_NAMA', ''), app: A.cfg('APP_NAME', ''), link: A.cfg('APP_URL', ''), pengirim: 'Dinas Pendidikan', subjek: 'Undangan rapat', perihal: 'Undangan', nomorAgenda: 'AGD-2026-0042', jenis: 'Surat Keluar', judul: 'Sertifikat', nomor: 'SERT/001/2026' };
    var prev = function () { md.$('#t-prev').innerHTML = waFormat(md.$('#t-pesan').value.replace(/\{(\w+)\}/g, function (x, k) { return contoh[k] !== undefined ? contoh[k] : x; })); };
    md.$('#t-pesan').addEventListener('input', prev);
    md.$('#t-reset').addEventListener('click', function () { md.$('#t-pesan').value = m.pesanDefault; md.$('#t-subjek').value = m.subjekDefault; prev(); });
    md.$('[data-ok]').addEventListener('click', function () { m.subjek = md.$('#t-subjek').value; m.pesan = md.$('#t-pesan').value; md.tutup(); U.toast('Templat diterapkan — klik Simpan Pengaturan.', 'info'); });
    prev();
  }

  function tabAntrean(box, st) {
    st.f = st.f || {};
    var muat = function () {
      return API.panggil('notifAntrean', { status: st.f.status || '', kanal: st.f.kanal || '' }).then(function (r) {
        if (!document.body.contains(box)) return;
        if (!r.success) { box.innerHTML = '<div class="pemberitahuan galat">' + esc(r.message) + '</div>'; return; }
        var rg = r.data.ringkas;
        box.innerHTML = '<div class="antara" style="margin-bottom:12px;flex-wrap:wrap"><div class="chip-baris">' + [['', 'Semua'], ['Antri', 'Antri'], ['Terkirim', 'Terkirim'], ['Gagal', 'Gagal'], ['Batal', 'Batal']].map(function (s) { return '<button class="chip' + ((st.f.status || '') === s[0] ? ' aktif' : '') + '" data-st="' + s[0] + '">' + s[1] + (s[0] ? '<span class="jml">' + U.angka(rg[s[0]] || 0) + '</span>' : '') + '</button>'; }).join('') + '</div>' +
          '<div class="baris"><select class="select" id="aq-kanal" style="width:auto"><option value="">Semua kanal</option>' + ['WA', 'EMAIL', 'BALAS'].map(function (k) { return '<option' + (st.f.kanal === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select>' +
          '<button class="btn btn-soft btn-sm" id="aq-ulang">' + ik('rotate', 'sm') + 'Ulangi yang gagal</button><button class="btn btn-primary btn-sm" id="aq-proses" data-muat="Mengirim…">' + ik('play', 'sm') + 'Proses Sekarang</button></div></div>' +
          A.tabel({ rows: r.data.rows, klik: false, kosong: 'Antrean kosong.', kolom: [
            { l: 'Waktu', f: function (x) { return '<span class="mono kecil">' + esc(U.tglJam(x.dibuat)) + '</span>' + (x.dikirim ? '<div class="mono kecil muted">→ ' + esc(U.jam(x.dikirim)) + '</div>' : ''); } },
            { l: 'Kanal', f: function (x) { return '<span class="badge b-netral tanpa-titik">' + ik(x.kanal === 'WA' ? 'wa' : 'mail', 'sm') + ' ' + esc(x.kanal) + '</span>'; } },
            { l: 'Tujuan', f: function (x) { return esc(x.nama || '') + '<div class="mono kecil muted">' + esc(x.tujuan) + '</div>'; } },
            { l: 'Peristiwa', f: function (x) { return '<span class="mono kecil">' + esc(x.event) + '</span><div class="kecil muted">' + esc(x.subjek || x.pesan) + '</div>'; } },
            { l: 'Status', f: function (x) { return U.badge(x.status) + (x.respon && x.status !== 'Terkirim' ? '<div class="kecil muted" style="max-width:220px">' + esc(String(x.respon).slice(0, 120)) + '</div>' : ''); } }] });
        U.$$('[data-st]', box).forEach(function (b) { b.addEventListener('click', function () { st.f.status = b.dataset.st; muat(); }); });
        box.querySelector('#aq-kanal').addEventListener('change', function () { st.f.kanal = this.value; muat(); });
        box.querySelector('#aq-proses').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return API.panggil('notifProsesSekarang', {}, { timeout: 120000 }).then(function (x) { U.hasil(x); return muat(); }); }); });
        box.querySelector('#aq-ulang').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return API.panggil('notifUlangiGagal', {}).then(function (x) { U.hasil(x); return muat(); }); }); });
      });
    };
    muat();
  }

  function tabBlast(box, st) {
    var b0 = st.blast = st.blast || { judul: '', pesan: 'Assalamu\'alaikum {nama},\n\n', sumber: 'crm', segmen: '', tag: '', statusWa: '', manual: '', batch: (_cfg && _cfg.batchDefault) || 20, jeda: (_cfg && _cfg.jeda) || '5' };
    var aud = null;
    box.innerHTML = '<div class="grid-3-1"><div class="tumpuk"><div class="card"><div class="card-head"><h3>Buat Blast</h3></div><div class="card-body tumpuk" style="gap:12px">' +
      '<div class="field"><label>Judul kampanye</label><input class="input" id="bl-judul" value="' + esc(b0.judul) + '" placeholder="mis. Undangan Wisuda 2026"></div>' +
      '<div class="field"><label>Pesan</label><textarea class="textarea" id="bl-pesan" style="min-height:160px">' + esc(b0.pesan) + '</textarea><div class="bantu">Variabel: {nama} {institusi} {app} {link}. Format WA: *tebal* _miring_.</div></div>' +
      '<div class="field"><label>Sasaran</label><div class="seg" id="bl-sumber"><button data-v="crm" class="' + (b0.sumber === 'crm' ? 'aktif' : '') + '">Kontak CRM</button><button data-v="manual" class="' + (b0.sumber === 'manual' ? 'aktif' : '') + '">Daftar manual</button></div></div>' +
      '<div id="bl-crm" class="grid-form"' + (b0.sumber === 'crm' ? '' : ' hidden') + '><div class="field"><label>Segmen</label><select class="select" id="bl-segmen"><option value="">Semua segmen</option></select></div><div class="field"><label>Tag</label><input class="input" id="bl-tag" value="' + esc(b0.tag) + '" placeholder="opsional"></div><div class="field"><label>Status WA</label><select class="select" id="bl-swa"><option value="">Semua</option><option value="Terdaftar"' + (b0.statusWa === 'Terdaftar' ? ' selected' : '') + '>Hanya terdaftar WA</option></select></div></div>' +
      '<div id="bl-manual"' + (b0.sumber === 'manual' ? '' : ' hidden') + ' class="field"><label>Nomor (satu per baris: nomor|nama)</label><textarea class="textarea mono" id="bl-daftar" placeholder="081234567890|Ahmad\n081298765432|Siti">' + esc(b0.manual) + '</textarea></div>' +
      '<div class="grid-form"><div class="field"><label>Ukuran batch</label><div class="seg" id="bl-batch">' + [10, 20, 50].map(function (n) { return '<button data-v="' + n + '" class="' + (Number(b0.batch) === n ? 'aktif' : '') + '">' + n + '</button>'; }).join('') + '</div></div><div class="field"><label>Jeda (detik)</label><input class="input mono" id="bl-jeda" value="' + esc(b0.jeda) + '"></div></div>' +
      '<div class="baris"><button class="btn btn-soft" id="bl-cek" data-muat="Menghitung…">' + ik('users', 'sm') + 'Hitung Penerima</button><button class="btn btn-gold" id="bl-kirim" data-muat="Membuat…" disabled>' + ik('send', 'sm') + 'Mulai Blast</button></div><div id="bl-ring"></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>Riwayat Blast</h3><button class="btn btn-ghost btn-icon btn-sm" id="bl-segar" aria-label="Segarkan">' + ik('refresh', 'sm') + '</button></div><div id="bl-riwayat">' + U.skel(2, 60) + '</div></div></div>' +
      '<div class="card card-pad" style="position:sticky;top:80px"><div class="overline" style="margin-bottom:8px">Pratinjau</div><div class="wa-preview"><div class="gel" id="bl-prev"></div></div><div class="muted kecil" style="margin-top:10px">' + ik('info', 'sm') + ' Nomor ganda, tidak valid, dan opt-out dibuang otomatis. Dikirim bertahap per batch dengan jeda acak untuk mengurangi risiko pemblokiran.</div></div></div>';
    var $ = function (s) { return box.querySelector(s); };
    var simpanSt = function () { b0.judul = $('#bl-judul').value; b0.pesan = $('#bl-pesan').value; b0.tag = $('#bl-tag').value; b0.statusWa = $('#bl-swa').value; b0.segmen = $('#bl-segmen').value; b0.manual = $('#bl-daftar').value; b0.jeda = $('#bl-jeda').value; };
    var prev = function () { $('#bl-prev').innerHTML = waFormat($('#bl-pesan').value.replace(/\{nama\}/g, 'Ahmad').replace(/\{institusi\}/g, A.cfg('INSTITUSI_NAMA', '')).replace(/\{app\}/g, A.cfg('APP_NAME', '')).replace(/\{link\}/g, A.cfg('APP_URL', ''))); };
    var basi = function () { aud = null; $('#bl-kirim').disabled = true; $('#bl-ring').innerHTML = ''; simpanSt(); };
    API.panggil('crmStats', {}, { senyap: true }).then(function (r) { if (!r.success || !document.body.contains(box)) return; var s = $('#bl-segmen'); Object.keys(r.data.perSegmen || {}).forEach(function (k) { s.insertAdjacentHTML('beforeend', '<option' + (k === b0.segmen ? ' selected' : '') + ' value="' + esc(k) + '">' + esc(k) + ' (' + r.data.perSegmen[k] + ')</option>'); }); });
    $('#bl-pesan').addEventListener('input', function () { prev(); simpanSt(); });
    ['#bl-judul', '#bl-jeda'].forEach(function (s) { $(s).addEventListener('input', simpanSt); });
    ['#bl-tag', '#bl-swa', '#bl-segmen', '#bl-daftar'].forEach(function (s) { $(s).addEventListener('input', basi); $(s).addEventListener('change', basi); });
    U.$$('#bl-sumber button', box).forEach(function (b) { b.addEventListener('click', function () { b0.sumber = b.dataset.v; U.$$('#bl-sumber button', box).forEach(function (x) { x.classList.toggle('aktif', x === b); }); $('#bl-crm').hidden = b0.sumber !== 'crm'; $('#bl-manual').hidden = b0.sumber !== 'manual'; basi(); }); });
    U.$$('#bl-batch button', box).forEach(function (b) { b.addEventListener('click', function () { b0.batch = Number(b.dataset.v); U.$$('#bl-batch button', box).forEach(function (x) { x.classList.toggle('aktif', x === b); }); }); });
    $('#bl-cek').addEventListener('click', function () {
      simpanSt();
      var d = b0.sumber === 'manual' ? { sumber: 'manual', manual: b0.manual } : { sumber: 'crm', segmen: b0.segmen, tag: b0.tag, statusWa: b0.statusWa };
      U.sibuk(this, function () { return API.panggil('waAudiens', d).then(function (r) {
        if (!r.success) { U.toast(r.message, 'galat'); return; }
        aud = r.data; var g = r.data.ringkas, kirim = r.data.rows.filter(function (x) { return x.valid && !x.ganda && !x.optOut; });
        $('#bl-ring').innerHTML = '<div class="blok-abu"><div class="baris" style="gap:14px;font-size:13px"><span><b>' + U.angka(kirim.length) + '</b> akan dikirim</span><span class="muted">' + U.angka(g.tidakValid) + ' tidak valid</span><span class="muted">' + U.angka(g.ganda) + ' ganda</span><span class="muted">' + U.angka(g.optOut) + ' opt-out</span><span class="muted">' + U.angka(g.terdaftarWA) + ' terdaftar WA</span></div><div class="kecil muted" style="margin-top:6px">≈ ' + Math.ceil(kirim.length / b0.batch) + ' batch × ' + b0.batch + ' pesan</div></div>';
        $('#bl-kirim').disabled = !kirim.length;
      }); });
    });
    $('#bl-kirim').addEventListener('click', function () {
      simpanSt();
      if (!b0.judul.trim() || b0.pesan.trim().length < 5) { U.toast('Isi judul dan pesan.', 'galat'); return; }
      var penerima = (aud ? aud.rows : []).filter(function (x) { return x.valid && !x.ganda && !x.optOut; }).map(function (x) { return { nama: x.nama, hp: x.hp }; });
      var b = this;
      U.konfirmasi('Mulai blast ke ' + penerima.length + ' nomor?', 'Pesan dikirim bertahap per batch ' + b0.batch + ' dengan jeda ' + b0.jeda + ' detik. Dapat dihentikan kapan saja.', { ya: 'Mulai Blast' }).then(function (y) {
        if (!y) return;
        U.sibuk(b, function () { return API.panggil('waBlastBuat', { judul: b0.judul, pesan: b0.pesan, ukuranBatch: b0.batch, jeda: b0.jeda, penerima: penerima, sumber: b0.sumber }).then(function (r) {
          if (!U.hasil(r)) return;
          st.blast = null; tabBlast(box, st);
        }); });
      });
    });
    $('#bl-segar').addEventListener('click', function () { riwayat(true); });
    var riwayat = function (paksa) {
      clearTimeout(_pollBlast);
      API.panggil('waBlastList', {}, { senyap: !paksa }).then(function (r) {
        if (!document.body.contains(box) || !r.success) return;
        var rows = r.data.rows, jalan = rows.filter(function (x) { return x.status === 'Berjalan'; });
        $('#bl-riwayat').innerHTML = rows.length ? '<div class="card-body tumpuk" style="gap:14px">' + rows.slice(0, 20).map(function (x) {
          return '<div><div class="antara"><div><b>' + esc(x.judul) + '</b><div class="mono kecil muted">' + esc(U.tglJam(x.tanggal)) + ' · batch ' + esc(x.ukuranBatch) + ' · jeda ' + esc(x.jedaDetik) + ' dtk</div></div>' + U.badge(x.status) + '</div>' +
            '<div class="progres" style="margin:8px 0"><i style="width:' + x.persen + '%"></i></div><div class="antara kecil"><span class="mono">' + U.angka(x.terkirim) + ' terkirim · ' + U.angka(x.gagal) + ' gagal · ' + U.angka(x.sisa) + ' sisa / ' + U.angka(x.total) + '</span>' +
            (x.status === 'Berjalan' ? '<span class="baris" style="gap:6px"><button class="btn btn-soft btn-xs" data-proses="' + esc(x.id) + '" data-muat="Mengirim…">' + ik('play', 'sm') + 'Kirim batch</button><button class="btn btn-danger btn-xs" data-stop="' + esc(x.id) + '">' + ik('stop', 'sm') + 'Hentikan</button></span>' : '') + '</div></div>';
        }).join('') + '</div>' : U.kosong('Belum ada blast.', 'send');
        U.$$('[data-proses]', box).forEach(function (b) { b.addEventListener('click', function () { U.sibuk(b, function () { return API.panggil('waBlastProses', { blastId: b.dataset.proses }, { timeout: 120000 }).then(function (x) { if (!x.success) U.toast(x.message, 'galat'); riwayat(); }); }); }); });
        U.$$('[data-stop]', box).forEach(function (b) { b.addEventListener('click', function () { U.konfirmasi('Hentikan blast?', 'Pesan yang belum terkirim dibatalkan.', { bahaya: true, ya: 'Hentikan' }).then(function (y) { if (y) API.panggil('waBlastStop', { blastId: b.dataset.stop }).then(function (x) { U.hasil(x); riwayat(); }); }); }); });
        if (jalan.length) _pollBlast = setTimeout(riwayat, 10000);
      });
    };
    prev(); riwayat();
  }

  // ===========================================================================
  // CRM KONTAK
  // ===========================================================================
  A.daftar('crm', {
    judul: 'CRM Kontak', tanpaRenderUlang: true,
    render: function (el, ctx) {
      var st = ctx.state; st.f = st.f || { halaman: 1 }; st.pilih = st.pilih || {};
      el.innerHTML = '<div class="crm-root">' + A.kepala({ overline: 'Komunikasi', judul: 'CRM Kontak', desk: 'Kontak terkumpul otomatis dari permohonan, email masuk, pengguna, pejabat, dan MOU — tanpa entri ganda.',
        aksi: '<button class="btn btn-ghost btn-sm" id="crm-dup">' + ik('merge', 'sm') + 'Duplikat</button><button class="btn btn-ghost btn-sm" id="crm-impor">' + ik('upload', 'sm') + 'Impor CSV</button>' + (A.sa() ? '<button class="btn btn-ghost btn-sm" id="crm-ekspor">' + ik('download', 'sm') + 'Ekspor</button>' : '') + '<button class="btn btn-soft btn-sm" id="crm-sync" data-muat="Sinkron…">' + ik('refresh', 'sm') + 'Sinkron</button><button class="btn btn-gold btn-sm" id="crm-baru">' + ik('plus', 'sm') + 'Kontak</button>' }) +
        '<div class="grid-kpi" id="crm-kpi">' + U.skel(1, 100).repeat(1) + '</div><div class="bilah-alat"><div class="cari">' + ik('search') + '<input class="input" id="crm-cari" placeholder="Cari nama, email, nomor…" value="' + esc(st.f.cari || '') + '"></div>' +
        '<select class="select" id="crm-seg" style="width:auto"><option value="">Semua segmen</option></select><select class="select" id="crm-swa" style="width:auto"><option value="">Status WA</option><option value="Terdaftar">Terdaftar</option><option value="Tidak Terdaftar">Bukan WA</option><option value="belum">Belum dicek</option></select>' +
        '<label class="cek"><input type="checkbox" id="crm-ganda"' + (st.f.duplikat ? ' checked' : '') + '> Duplikat</label><label class="cek"><input type="checkbox" id="crm-opt"' + (st.f.optOut ? ' checked' : '') + '> Opt-out</label></div>' +
        '<div class="card" id="crm-bulk" hidden style="margin-bottom:12px"><div class="card-body baris" style="padding:10px 14px"><b id="crm-npilih">0 dipilih</b><button class="btn btn-soft btn-xs" data-bulk="tag">' + ik('tag', 'sm') + 'Tag</button><button class="btn btn-soft btn-xs" data-bulk="untag">Hapus tag</button><button class="btn btn-soft btn-xs" data-bulk="deteksiWA">' + ik('wa', 'sm') + 'Deteksi WA</button><button class="btn btn-soft btn-xs" data-bulk="optout">' + ik('ban', 'sm') + 'Opt-out</button><button class="btn btn-soft btn-xs" data-bulk="optin">Opt-in</button><button class="btn btn-soft btn-xs" data-bulk="blast">' + ik('send', 'sm') + 'Blast ke terpilih</button><button class="btn btn-danger btn-xs" data-bulk="hapusManual">' + ik('trash', 'sm') + 'Hapus (manual)</button><button class="btn btn-ghost btn-xs" data-bulk="batal">Batal pilih</button></div></div>' +
        '<div id="crm-tabel">' + U.skel(6, 46) + '</div></div>';
      var R = el.querySelector('.crm-root'), $ = function (s) { return R.querySelector(s); };
      var muatStat = function () {
        API.panggil('crmStats', {}).then(function (r) {
          if (!r.success || !document.body.contains(R)) return;
          var s = r.data;
          $('#crm-kpi').innerHTML = [['Total kontak', s.total, s.baru7 + ' baru 7 hari', 'users'], ['WA valid', s.waValid, s.waTerdaftar + ' terdaftar WA', 'wa'], ['Belum dicek WA', s.belumDicek, 'deteksi otomatis', 'search'], ['Email valid', s.emailValid, '', 'mail'], ['Duplikat', s.duplikat, 'perlu digabung', 'merge'], ['Opt-out', s.optOut, s.takTerhubung + ' tak terhubung', 'ban']].map(function (k) { return '<div class="kpi"><div class="judul"><span>' + k[0] + '</span>' + ik(k[3], 'sm') + '</div><div class="angka">' + U.angka(k[1]) + '</div><div class="ket">' + esc(k[2]) + '</div></div>'; }).join('');
          var seg = $('#crm-seg'); if (seg.options.length <= 1) Object.keys(s.perSegmen || {}).forEach(function (k) { seg.insertAdjacentHTML('beforeend', '<option value="' + esc(k) + '"' + (st.f.segmen === k ? ' selected' : '') + '>' + esc(k) + ' (' + s.perSegmen[k] + ')</option>'); });
        });
      };
      var muat = function () {
        var d = Object.assign({}, st.f, { per: 50 });
        return API.panggil('crmList', d).then(function (r) {
          if (!document.body.contains(R)) return;
          if (!r.success) { $('#crm-tabel').innerHTML = '<div class="pemberitahuan galat">' + esc(r.message) + '</div>'; return; }
          var dt = r.data, hal = Math.ceil(dt.total / dt.per) || 1;
          $('#crm-tabel').innerHTML = A.tabel({ rows: dt.rows, cek: true, terpilih: st.pilih, kosong: 'Tidak ada kontak.', kolom: [
            { l: 'Nama', f: function (k) { return '<b style="font-weight:600">' + esc(k.nama) + '</b><div class="muted kecil">' + esc(k.segmen || '') + ' · ' + esc(k.sumber || '') + '</div>'; } },
            { l: 'WhatsApp', f: function (k) { return k.noWa ? '<span class="mono kecil">' + esc(k.noWa) + '</span> ' + waBadge(k.statusWa) : '<span class="muted kecil">—</span>'; } },
            { l: 'Email', f: function (k) { return k.email ? '<span class="kecil">' + esc(k.email) + '</span>' : '<span class="muted kecil">—</span>'; } },
            { l: 'Tag', f: function (k) { return String(k.tag || '').split(',').filter(function (t) { return t.trim() && t.indexOf('merged') < 0; }).map(function (t) { return '<span class="badge b-netral tanpa-titik" style="margin:0 4px 4px 0">' + esc(t.trim()) + '</span>'; }).join('') + (k.bendera && k.bendera.ganda ? '<span class="badge b-perbaikan tanpa-titik">ganda</span>' : '') + (String(k.optOut) === 'true' ? '<span class="badge b-ditolak tanpa-titik">opt-out</span>' : ''); } },
            { l: 'Terakhir', f: function (k) { return '<span class="mono kecil">' + esc(k.terakhirDihubungi ? U.relatif(k.terakhirDihubungi) : '-') + '</span><div class="kecil muted">' + U.angka(k.jumlahPesan || 0) + ' pesan</div>'; } }],
            kaki: '<div class="antara" style="padding:10px 14px"><span class="muted kecil">' + U.angka(dt.total) + ' kontak · sinkron ' + (dt.terakhirSinkron ? esc(U.relatif(new Date(dt.terakhirSinkron).toISOString())) : 'belum') + '</span><div class="baris"><button class="btn btn-ghost btn-xs" data-hal="-1"' + (dt.halaman <= 1 ? ' disabled' : '') + '>' + ik('left', 'sm') + '</button><span class="mono kecil">' + dt.halaman + ' / ' + hal + '</span><button class="btn btn-ghost btn-xs" data-hal="1"' + (dt.halaman >= hal ? ' disabled' : '') + '>' + ik('right', 'sm') + '</button></div></div>' });
          A.pasangTabel($('#crm-tabel'), function (id) { detailKontak(id, muat); }, function (id, on) { st.pilih[id] = on; bulk(); });
          U.$$('[data-hal]', R).forEach(function (b) { b.addEventListener('click', function () { st.f.halaman = Math.max(1, (st.f.halaman || 1) + Number(b.dataset.hal)); muat(); }); });
          bulk();
        });
      };
      var bulk = function () { var ids = Object.keys(st.pilih).filter(function (k) { return st.pilih[k]; }); $('#crm-bulk').hidden = !ids.length; $('#crm-npilih').textContent = ids.length + ' dipilih'; return ids; };
      var cari = U.debounce(function () { st.f.cari = $('#crm-cari').value; st.f.halaman = 1; muat(); }, 300);
      $('#crm-cari').addEventListener('input', cari);
      $('#crm-seg').addEventListener('change', function () { st.f.segmen = this.value; st.f.halaman = 1; muat(); });
      $('#crm-swa').value = st.f.statusWa || ''; $('#crm-swa').addEventListener('change', function () { st.f.statusWa = this.value; st.f.halaman = 1; muat(); });
      $('#crm-ganda').addEventListener('change', function () { st.f.duplikat = this.checked; st.f.halaman = 1; muat(); });
      $('#crm-opt').addEventListener('change', function () { st.f.optOut = this.checked || undefined; st.f.halaman = 1; muat(); });
      U.$$('[data-bulk]', R).forEach(function (b) {
        b.addEventListener('click', function () {
          var a = b.dataset.bulk, ids = bulk();
          if (a === 'batal') { st.pilih = {}; muat(); return; }
          if (a === 'blast') { var bl = (A.state.whatsapp = A.state.whatsapp || {}); bl.blast = null; U.toast('Gunakan Blast → Daftar manual, atau filter CRM dengan tag. Menandai kontak terpilih dengan tag "blast-' + U.hariIni() + '"…', 'info', 5000); API.panggil('crmBulk', { ids: ids, aksi: 'tag', nilai: 'blast-' + U.hariIni() }).then(function (r) { if (r.success) { A.state.whatsapp.blast = { judul: '', pesan: 'Assalamu\'alaikum {nama},\n\n', sumber: 'crm', tag: 'blast-' + U.hariIni(), segmen: '', statusWa: '', manual: '', batch: 20, jeda: '5' }; A.state.whatsapp.tab = 'blast'; location.hash = '#/admin/whatsapp/blast'; } }); return; }
          var jalan = function (nilai) { U.sibuk(b, function () { return API.panggil('crmBulk', { ids: ids, aksi: a, nilai: nilai || '' }, { timeout: 120000 }).then(function (r) { if (U.hasil(r)) { muat(); muatStat(); } }); }); };
          if (a === 'tag' || a === 'untag') return U.minta(a === 'tag' ? 'Tambah tag' : 'Hapus tag', { label: 'Nama tag', placeholder: 'mis. alumni-2025', ya: 'Terapkan' }).then(function (t) { if (t) jalan(t); });
          if (a === 'hapusManual') return U.konfirmasi('Hapus kontak manual terpilih?', 'Hanya kontak bersumber "manual" yang dihapus; kontak hasil sinkron tetap.', { bahaya: true, ya: 'Hapus' }).then(function (y) { if (y) jalan(); });
          jalan();
        });
      });
      $('#crm-sync').addEventListener('click', function () { U.sibuk(this, function () { return API.panggil('crmSync', {}, { timeout: 180000 }).then(function (r) { U.hasil(r); muat(); muatStat(); }); }); });
      $('#crm-baru').addEventListener('click', function () { formKontak(null, function () { muat(); muatStat(); }); });
      $('#crm-impor').addEventListener('click', function () { imporKontak(function () { muat(); muatStat(); }); });
      $('#crm-dup').addEventListener('click', function () { kelolaDuplikat(function () { muat(); muatStat(); }); });
      var ek = $('#crm-ekspor'); if (ek) ek.addEventListener('click', function () { U.sibuk(ek, function () { return API.panggil('crmEkspor', {}, { timeout: 120000 }).then(function (r) { if (!r.success) { U.toast(r.message, 'galat'); return; } U.unduhTeks('crm-kontak-' + U.hariIni() + '.csv', U.csv(r.data.rows)); }); }); });
      muatStat(); muat();
    }
  });

  function formKontak(k, selesai) {
    window.Surat.formModal({ judul: k ? 'Ubah Kontak' : 'Kontak Baru', ikon: 'user', nilai: k ? Object.assign({}, k, { optOut: String(k.optOut) === 'true' ? 'true' : 'false' }) : { segmen: 'Manual', optOut: 'false' },
      fields: [{ k: 'nama', l: 'Nama', wajib: true }, { k: 'segmen', l: 'Segmen' }, { k: 'noWa', l: 'Nomor WhatsApp', mono: true }, { k: 'email', l: 'Email' }, { k: 'tag', l: 'Tag (pisahkan koma)', penuh: true }, { k: 'catatan', l: 'Catatan', tipe: 'area', penuh: true }, { k: 'optOut', l: 'Opt-out (tidak menerima blast)', tipe: 'pilihan', opsi: [{ v: 'false', l: 'Tidak' }, { v: 'true', l: 'Ya' }] }],
      simpan: function (v) { if (k) v.id = k.id; v.optOut = v.optOut === 'true'; return API.panggil('crmSimpan', { kontak: v }).then(function (r) { if (U.hasil(r) && selesai) selesai(r.data); return r; }); } });
  }

  function detailKontak(id, segar) {
    API.panggil('crmDetail', { kontakId: id }).then(function (r) {
      if (!r.success) { U.toast(r.message, 'galat'); return; }
      var k = r.data, info = A.json(k.info, {});
      var l = U.laci({ kepala: '<div class="overline">' + esc(k.segmen || '') + ' · ' + esc(k.sumber || '') + '</div><h3 style="font-size:18px;margin-top:4px">' + esc(k.nama) + '</h3>',
        isi: '<div class="meta-grid" style="margin-bottom:14px"><div><div class="lbl">WhatsApp</div><div class="nil">' + (k.noWa ? '<a href="' + esc(A.waLink(k.noWa)) + '" target="_blank" rel="noopener">' + esc(k.noWa) + '</a> ' + waBadge(k.statusWa) : '-') + '</div></div><div><div class="lbl">Email</div><div class="nil">' + (k.email ? '<a href="mailto:' + esc(k.email) + '">' + esc(k.email) + '</a>' : '-') + '</div></div>' +
          '<div><div class="lbl">Tag</div><div class="nil">' + esc(k.tag || '-') + '</div></div><div><div class="lbl">Pesan terkirim</div><div class="nil">' + U.angka(k.jumlahPesan || 0) + '</div></div>' + (k.catatan ? '<div style="grid-column:1/-1"><div class="lbl">Catatan</div><div class="nil" style="white-space:pre-wrap;font-weight:500">' + esc(k.catatan) + '</div></div>' : '') + (info.manual ? '<div style="grid-column:1/-1" class="muted kecil">' + ik('lock', 'sm') + ' Disunting manual — sinkron otomatis tidak menimpa data ini.</div>' : '') + '</div>' +
          (k.permohonan.length ? '<div class="overline" style="margin:12px 0 6px">Permohonan</div>' + k.permohonan.map(function (p) { return '<a class="antara" style="padding:6px 0;border-bottom:1px solid var(--hairline);color:inherit;text-decoration:none" href="#/admin/permohonan?id=' + esc(p.id) + '" data-tutup><span><span class="mono kecil">' + esc(p.noRef) + '</span> ' + esc(p.jenisSurat) + '</span>' + U.badge(p.status) + '</a>'; }).join('') : '') +
          ((k.emailMasuk || []).length ? '<div class="overline" style="margin:12px 0 6px">Email masuk</div>' + k.emailMasuk.map(function (e) { return '<a class="antara" style="padding:6px 0;border-bottom:1px solid var(--hairline);color:inherit;text-decoration:none" href="#/admin/email-masuk?id=' + esc(e.id) + '" data-tutup><span class="kecil">' + esc(e.subjek) + '</span>' + U.badge(e.status) + '</a>'; }).join('') : '') +
          '<div class="antara" style="margin:16px 0 8px"><span class="overline">Linimasa interaksi</span><button class="btn btn-soft btn-xs" id="kt-catat">' + ik('plus', 'sm') + 'Catat interaksi</button></div><div class="linimasa">' + (k.timeline.length ? k.timeline.map(function (t) { return '<div class="lm-item"><span class="lm-titik ' + (t.arah === 'Masuk' ? 'aktif' : '') + '">' + ik(t.kanal === 'WA' ? 'wa' : t.kanal === 'EMAIL' || t.kanal === 'BALAS' ? 'mail' : 'chat', 'sm') + '</span><div class="lm-isi"><div class="jdl"><span style="font-weight:600;font-size:13px">' + esc(t.kanal) + ' · ' + esc(t.arah) + (t.status ? ' · ' + esc(t.status) : '') + '</span><span class="wkt">' + esc(U.tglJam(t.w)) + '</span></div><div class="kecil" style="color:var(--ink-2)">' + esc(t.ringkasan) + '</div></div></div>'; }).join('') : U.kosong('Belum ada interaksi.', 'chat')) + '</div>',
        kaki: '<button class="btn btn-outline" id="kt-ubah">' + ik('edit', 'sm') + 'Ubah</button>' + (k.noWa ? '<a class="btn btn-soft" href="' + esc(A.waLink(k.noWa)) + '" target="_blank" rel="noopener">' + ik('wa', 'sm') + 'Chat WA</a>' : '') });
      U.$$('a[data-tutup]', l.el).forEach(function (a) { a.addEventListener('click', function () { l.tutup(); }); });
      l.$('#kt-ubah').addEventListener('click', function () { l.tutup(); formKontak(k, function () { segar(); }); });
      l.$('#kt-catat').addEventListener('click', function () {
        window.Surat.formModal({ judul: 'Catat Interaksi', ikon: 'chat', nilai: { kanal: 'Telepon', arah: 'Keluar' }, fields: [{ k: 'kanal', l: 'Kanal', tipe: 'pilihan', opsi: ['Telepon', 'WA Manual', 'Kunjungan', 'Email', 'Catatan'] }, { k: 'arah', l: 'Arah', tipe: 'pilihan', opsi: ['Keluar', 'Masuk'] }, { k: 'ringkasan', l: 'Ringkasan', tipe: 'area', wajib: true, penuh: true }],
          simpan: function (v) { v.kontakId = k.id; return API.panggil('crmInteraksi', v).then(function (x) { if (U.hasil(x)) { l.tutup(); detailKontak(id, segar); } return x; }); } });
      });
    });
  }

  function imporKontak(selesai) {
    var rows = [];
    var m = U.modal({ judul: 'Impor Kontak (CSV)', ikon: ik('upload'), lebar: 'lebar',
      isi: '<div class="tumpuk" style="gap:12px"><div class="pemberitahuan">' + ik('info') + '<div>Kolom: <span class="mono">nama, email, wa, segmen, tag</span>. Baris ganda (nomor/email sudah ada) dilewati otomatis.</div></div><div class="baris"><label class="btn btn-outline">' + ik('upload', 'sm') + 'Pilih CSV<input type="file" id="im-file" accept=".csv,text/csv" hidden></label><button class="btn btn-ghost btn-sm" id="im-contoh">' + ik('download', 'sm') + 'Contoh CSV</button></div><div id="im-prev"></div></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" id="im-ok" disabled data-muat="Mengimpor…">' + ik('upload', 'sm') + 'Impor</button>' });
    m.$('#im-contoh').addEventListener('click', function () { U.unduhTeks('contoh-kontak.csv', U.csv([{ nama: 'Ahmad Fauzi', email: 'ahmad@contoh.id', wa: '081234567890', segmen: 'Alumni', tag: 'wisuda-2025' }])); });
    m.$('#im-file').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      var fr = new FileReader(); fr.onload = function () {
        rows = U.uraiCsv(fr.result).map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k.toLowerCase().trim()] = r[k]; }); return { nama: o.nama, email: o.email, wa: o.wa || o.whatsapp || o.nowa || o.hp, segmen: o.segmen, tag: o.tag }; }).filter(function (r) { return r.nama; });
        m.$('#im-prev').innerHTML = '<b>' + rows.length + ' baris</b> terbaca' + (rows.length > 5000 ? ' (maks. 5.000)' : '') + '.';
        m.$('#im-ok').disabled = !rows.length;
      }; fr.readAsText(f);
    });
    m.$('#im-ok').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return API.panggil('crmImport', { rows: rows.slice(0, 5000) }, { timeout: 180000 }).then(function (r) { if (U.hasil(r)) { m.tutup(); selesai(); } }); }); });
  }

  function kelolaDuplikat(selesai) {
    var m = U.modal({ judul: 'Kontak Ganda', sub: 'Pilih kontak utama; sisanya digabung (tag & catatan ikut, riwayat tetap).', ikon: ik('merge'), lebar: 'lebar', isi: U.skel(3, 60), kaki: '<button class="btn btn-ghost" data-tutup>Tutup</button>' });
    var muat = function () {
      API.panggil('crmDuplikat', {}).then(function (r) {
        if (!r.success) { m.$('.modal-body').innerHTML = esc(r.message); return; }
        var g = r.data.grup;
        m.$('.modal-body').innerHTML = g.length ? g.map(function (x, i) {
          return '<div class="blok-abu" style="margin-bottom:10px" data-g="' + i + '"><div class="antara" style="margin-bottom:8px"><b class="mono kecil">' + esc(x.kunci) + '</b><button class="btn btn-primary btn-xs" data-gabung="' + i + '">' + ik('merge', 'sm') + 'Gabungkan</button></div>' +
            x.kontak.map(function (k, j) { return '<label class="cek" style="display:flex;margin:4px 0"><input type="radio" name="utama' + i + '" value="' + esc(k.id) + '"' + (j === 0 ? ' checked' : '') + '> <b>' + esc(k.nama) + '</b> <span class="muted kecil">' + esc(k.segmen) + ' · ' + esc(k.sumber) + ' · ' + U.angka(k.jumlahPesan || 0) + ' pesan</span></label>'; }).join('') + '</div>';
        }).join('') : U.kosong('Tidak ada kontak ganda. 👍', 'checkCircle');
        U.$$('[data-gabung]', m.el).forEach(function (b) {
          b.addEventListener('click', function () {
            var x = g[b.dataset.gabung], utama = m.el.querySelector('input[name="utama' + b.dataset.gabung + '"]:checked').value;
            U.sibuk(b, function () { return API.panggil('crmMerge', { utama: utama, gabung: x.kontak.map(function (k) { return k.id; }).filter(function (id) { return id !== utama; }) }).then(function (r2) { if (U.hasil(r2)) { muat(); selesai(); } }); });
          });
        });
      });
    };
    muat();
  }
})();
