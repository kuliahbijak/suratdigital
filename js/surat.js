/**
 * surat.js — register persuratan & generator dokumen.
 *  • Register: Surat Masuk, Surat Keluar, SK, Berita Acara, MOU, Arsip (filter status/tahun,
 *    cari instan, tabel→kartu di HP, laci detail dengan aksi sesuai status & peran)
 *  • Generator (Surat Keluar/SK/BA/Dokumen): kolom dinamis dari template Doc Engine,
 *    editor naskah kaya, penanda tangan multi-slot, pratinjau A4 instan di peramban,
 *    pratinjau PDF persis template, draf Google Docs, terbit bernomor + QR.
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon, A = window.Admin;

  var DOKM = {
    suratKeluar: { key: 'surat-keluar', modulJenis: 'SURAT_KELUAR', nomor: 'nomorSurat', terbit: 'terbitkanSuratKeluar', judulK: 'perihal', label: 'Surat Keluar', ikon: 'send' },
    sk:          { key: 'sk', modulJenis: 'SK', nomor: 'nomorSK', terbit: 'terbitkanSK', judulK: 'tentang', label: 'Surat Keputusan', ikon: 'stamp' },
    beritaAcara: { key: 'berita-acara', modulJenis: 'BA', nomor: 'nomorDokumen', terbit: 'terbitkanBeritaAcara', judulK: 'agenda', label: 'Berita Acara', ikon: 'clipboard' },
    dokumen:     { key: 'dokumen', modulJenis: 'DOKUMEN', nomor: 'nomor', terbit: 'terbitkanDokumen', judulK: 'judul', label: 'Dokumen & Sertifikat', ikon: 'certificate' }
  };
  var BIDANG_BAWAAN = {
    SURAT_KELUAR: [{ kunci: 'PERIHAL', label: 'Perihal', tipe: 'teks', wajib: true }, { kunci: 'TUJUAN', label: 'Tujuan / Kepada', tipe: 'teks', wajib: true }, { kunci: 'LAMPIRAN', label: 'Lampiran', tipe: 'teks', bawaan: '-' }, { kunci: 'ISI', label: 'Isi Surat', tipe: 'naskah', wajib: true }, { kunci: 'TEMBUSAN', label: 'Tembusan', tipe: 'area' }],
    SK: [{ kunci: 'TENTANG', label: 'Tentang', tipe: 'teks', wajib: true }, { kunci: 'MENIMBANG', label: 'Menimbang', tipe: 'naskah', wajib: true }, { kunci: 'MENGINGAT', label: 'Mengingat', tipe: 'naskah', wajib: true }, { kunci: 'MENETAPKAN', label: 'Menetapkan', tipe: 'naskah', wajib: true }],
    BA: [{ kunci: 'AGENDA', label: 'Agenda', tipe: 'teks', wajib: true }, { kunci: 'TANGGAL_KEGIATAN', label: 'Tanggal Kegiatan', tipe: 'tanggal', wajib: true }, { kunci: 'JAM', label: 'Jam', tipe: 'teks' }, { kunci: 'TEMPAT', label: 'Tempat', tipe: 'teks', wajib: true }, { kunci: 'PIMPINAN_RAPAT', label: 'Pimpinan Rapat', tipe: 'teks' }, { kunci: 'NOTULIS', label: 'Notulis', tipe: 'teks' }, { kunci: 'JUMLAH_PESERTA', label: 'Jumlah Peserta', tipe: 'angka' }, { kunci: 'PESERTA', label: 'Peserta', tipe: 'area' }, { kunci: 'RINGKASAN', label: 'Ringkasan / Hasil', tipe: 'naskah' }],
    DOKUMEN: [{ kunci: 'NAMA_PENERIMA', label: 'Nama Penerima', tipe: 'teks', wajib: true }, { kunci: 'PERIHAL', label: 'Perihal', tipe: 'teks' }]
  };
  var SIFAT = ['Biasa', 'Penting', 'Segera', 'Rahasia'];
  function tahunDari(v) { return String(v || '').slice(0, 4); }

  // ===========================================================================
  // Formulir modal sederhana (Surat Masuk, MOU, Arsip)
  // ===========================================================================
  function inputField(f, v) {
    var id = 'ff-' + f.k, val = v == null || v === '' ? (f.bawaan || '') : v, req = f.wajib ? ' <span class="wajib">*</span>' : '';
    var lbl = '<label for="' + id + '">' + esc(f.l) + req + '</label>', bantu = f.bantu ? '<div class="bantu">' + esc(f.bantu) + '</div>' : '';
    var inp;
    if (f.tipe === 'tanggal' && val) val = String(val).slice(0, 10);
    if (f.tipe === 'area') inp = '<textarea class="textarea" id="' + id + '" name="' + f.k + '">' + esc(val) + '</textarea>';
    else if (f.tipe === 'pilihan') inp = '<select class="select" id="' + id + '" name="' + f.k + '">' + (f.kosong ? '<option value="">' + esc(f.kosong) + '</option>' : '') + f.opsi.map(function (o) { var ov = typeof o === 'string' ? o : o.v, ol = typeof o === 'string' ? o : o.l; return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
    else if (f.tipe === 'berkas') inp = '<input class="input" type="file" id="' + id + '" name="' + f.k + '" accept="' + (f.accept || '.pdf,.jpg,.jpeg,.png') + '">' + (v ? '<div class="bantu">' + ik('clip', 'sm') + ' Sudah ada berkas — pilih baru untuk mengganti.</div>' : '');
    else inp = '<input class="input' + (f.mono ? ' mono' : '') + '" id="' + id + '" name="' + f.k + '" type="' + (f.tipe === 'tanggal' ? 'date' : f.tipe === 'angka' ? 'number' : 'text') + '" value="' + esc(val) + '"' + (f.list ? ' list="dl-' + f.k + '"' : '') + ' autocomplete="off">' + (f.list ? '<datalist id="dl-' + f.k + '">' + f.list.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' : '');
    return '<div class="field' + (f.penuh ? ' penuh' : '') + '">' + lbl + inp + bantu + '</div>';
  }
  /** o: {judul, sub, fields, nilai, ya, simpan(nilai, berkas)→Promise<resp>} */
  function formModal(o) {
    var m = U.modal({ judul: o.judul, sub: o.sub, lebar: 'lebar', ikon: o.ikon ? ik(o.ikon) : '',
      isi: '<form class="grid-form" id="ff">' + o.fields.map(function (f) { return inputField(f, (o.nilai || {})[f.k]); }).join('') + '</form>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" data-simpan data-muat="Menyimpan…">' + ik('save', 'sm') + esc(o.ya || 'Simpan') + '</button>' });
    var f = m.$('#ff');
    m.$('[data-simpan]').addEventListener('click', function () {
      var nilai = {}, berkas = {}, kurang = [];
      o.fields.forEach(function (fd) {
        var el = f.elements[fd.k]; if (!el) return;
        if (fd.tipe === 'berkas') { if (el.files[0]) berkas[fd.k] = el.files[0]; return; }
        nilai[fd.k] = el.value.trim();
        el.classList.toggle('salah', !!(fd.wajib && !nilai[fd.k]));
        if (fd.wajib && !nilai[fd.k]) kurang.push(fd.l);
      });
      if (kurang.length) { U.toast('Lengkapi: ' + kurang.join(', ') + '.', 'galat'); return; }
      U.sibuk(this, function () { return o.simpan(nilai, berkas).then(function (r) { if (r && r.success) m.tutup(); }); });
    });
    return m;
  }

  // ===========================================================================
  // Register generik
  // ===========================================================================
  function halamanRegister(cfg) {
    return {
      judul: cfg.label, modul: [cfg.modul],
      render: function (el, ctx) {
        if (cfg.sub && (ctx.sub === 'baru' || ctx.sub === 'ubah')) return cfg.sub(el, ctx);
        var st = ctx.state, semua = A.rows(cfg.modul);
        if (st.status === undefined) st.status = '';
        var hit = {}; semua.forEach(function (r) { hit[r.status] = (hit[r.status] || 0) + 1; });
        var tahunSet = {}; semua.forEach(function (r) { var t = tahunDari(r[cfg.tgl] || r.dibuat); if (t) tahunSet[t] = 1; });
        var rows = semua.filter(function (r) { return (!st.status || r.status === st.status) && (!st.tahun || tahunDari(r[cfg.tgl] || r.dibuat) === st.tahun); });
        rows = A.saring(rows, st.cari, cfg.cari);
        var p = A.potong(rows, st, 50);
        el.innerHTML = A.kepala({ overline: cfg.overline || 'Persuratan', judul: cfg.label, desk: cfg.desk, aksi: (A.tulis() && cfg.tombol ? cfg.tombol : '') + (cfg.aksiEkstra ? cfg.aksiEkstra() : '') +
          '<button class="btn btn-ghost btn-icon" data-segar title="Segarkan" aria-label="Segarkan">' + ik('refresh') + '</button><button class="btn btn-ghost btn-icon" data-csv title="Ekspor CSV" aria-label="Ekspor CSV">' + ik('download') + '</button>' }) +
          (cfg.atas ? cfg.atas() : '') +
          '<div class="bilah-alat"><div class="cari">' + ik('search') + '<input class="input" data-cari placeholder="' + esc(cfg.placeholder || 'Cari…') + '" value="' + esc(st.cari || '') + '"></div>' +
          '<select class="select" data-tahun style="width:auto"><option value="">Semua tahun</option>' + Object.keys(tahunSet).sort().reverse().map(function (t) { return '<option' + (t === st.tahun ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
          (cfg.status ? '<div style="margin-bottom:14px">' + A.chips([{ v: '', l: 'Semua', n: semua.length }].concat(cfg.status.map(function (s) { return { v: s, l: (U.STATUS[s] || [0, s])[1], n: hit[s] || 0 }; })), st.status) + '</div>' : '') +
          A.infoTerpotong(cfg.modul) +
          A.tabel({ kolom: cfg.kolom, rows: p.tampil, kosong: cfg.kosong || 'Belum ada data.', ikonKosong: cfg.ikon, kaki: A.tombolLagi(p.sisa) });
        var inpCari = el.querySelector('[data-cari]');
        inpCari.addEventListener('input', U.debounce(function () { st.cari = inpCari.value; st.batas = 50; A.renderUlang(); var i = el.querySelector('[data-cari]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250));
        el.querySelector('[data-tahun]').addEventListener('change', function () { st.tahun = this.value; A.renderUlang(); });
        U.$$('[data-chip]', el).forEach(function (b) { b.addEventListener('click', function () { st.status = b.dataset.chip; st.batas = 50; A.renderUlang(); }); });
        var lg = el.querySelector('[data-lagi]'); if (lg) lg.addEventListener('click', function () { st.batas += 50; A.renderUlang(); });
        el.querySelector('[data-segar]').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return A.segarkan([cfg.modul]); }); });
        el.querySelector('[data-csv]').addEventListener('click', function () { U.unduhTeks(cfg.modul + '-' + U.hariIni() + '.csv', U.csv(rows.map(cfg.csv || function (r) { var o = {}; cfg.kolom.forEach(function (c) { o[c.l] = c.k ? r[c.k] : (c.teks ? c.teks(r) : ''); }); return o; }))); });
        A.pasangTabel(el, function (id) { cfg.detail(id); });
        if (cfg.pasang) cfg.pasang(el, ctx);
        if (ctx.q.id && st._qid !== ctx.q.id) { st._qid = ctx.q.id; cfg.detail(ctx.q.id); }
        if (ctx.q.baru && st._qbaru !== ctx.q.baru && cfg.baru && A.tulis()) { st._qbaru = ctx.q.baru; cfg.baru(); }
      }
    };
  }

  function laciDetail(o) {
    return U.laci({ kepala: '<div class="overline">' + esc(o.overline || '') + '</div><h3 style="font-size:18px;margin-top:4px">' + esc(o.judul) + '</h3>' + (o.sub ? '<div class="mono kecil muted" style="margin-top:4px">' + esc(o.sub) + '</div>' : ''),
      isi: o.isi, kaki: o.kaki, onBuka: o.onBuka });
  }
  function ambilRekam(modul, id) {
    var lokal = A.rows(modul).filter(function (r) { return r.id === id; })[0];
    return API.panggil('getRecord', { modul: modul, id: id }).then(function (r) { return r.success ? r.data : (lokal ? Object.assign({ _lokal: true }, lokal) : null); });
  }
  function meta(pairs) { return '<div class="meta-grid">' + pairs.filter(function (p) { return p; }).map(function (p) { return '<div' + (p[2] ? ' style="grid-column:1/-1"' : '') + '><div class="lbl">' + esc(p[0]) + '</div><div class="nil">' + (p[3] ? p[1] : esc(p[1] == null || p[1] === '' ? '-' : p[1])) + '</div></div>'; }).join('') + '</div>'; }
  function riwayatHtml(riw) {
    riw = A.json(riw, []).slice().reverse();
    if (!riw.length) return '';
    return '<div><div class="overline" style="margin:16px 0 10px">Riwayat</div><div class="linimasa">' + riw.map(function (x) { return '<div class="lm-item"><span class="lm-titik">' + ik('clock', 'sm') + '</span><div class="lm-isi"><div class="jdl"><span style="font-weight:600">' + esc(x.aksi || x.status || '') + '</span><span class="wkt">' + esc(U.tglJam(x.w)) + '</span></div><div class="muted kecil">' + esc(x.oleh || '') + '</div></div></div>'; }).join('') + '</div></div>';
  }

  // ===========================================================================
  // SURAT MASUK
  // ===========================================================================
  function fieldSuratMasuk(edit) {
    var tujuan = A.pejabatAktif().map(function (p) { return p.jabatan; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    return [
      { k: 'tanggalTerima', l: 'Tanggal diterima', tipe: 'tanggal', wajib: true, bawaan: U.hariIni() },
      { k: 'tanggalSurat', l: 'Tanggal surat', tipe: 'tanggal' },
      { k: 'asalInstansi', l: 'Asal instansi / pengirim', wajib: true },
      { k: 'nomorSuratAsal', l: 'Nomor surat asal', mono: true },
      { k: 'perihal', l: 'Perihal', wajib: true, penuh: true },
      { k: 'sifat', l: 'Sifat', tipe: 'pilihan', opsi: SIFAT },
      { k: 'tujuanDisposisi', l: 'Disposisi ke', list: tujuan, bantu: 'Kosongkan bila belum didisposisikan.' },
      { k: 'catatanDisposisi', l: 'Catatan disposisi', tipe: 'area', penuh: true },
      edit ? { k: 'status', l: 'Status', tipe: 'pilihan', opsi: ['DICATAT', 'DIDISPOSISI', 'SELESAI'] } : null,
      { k: '_scan', l: 'Scan surat (PDF/JPG/PNG, maks. 5 MB)', tipe: 'berkas', penuh: !edit }
    ].filter(Boolean);
  }
  function formSuratMasuk(rec) {
    formModal({ judul: rec ? 'Ubah Surat Masuk' : 'Catat Surat Masuk', sub: rec ? rec.nomorAgenda : 'Nomor agenda dibuat otomatis.', ikon: 'inbox', fields: fieldSuratMasuk(!!rec), nilai: rec,
      simpan: function (v, berkas) {
        if (rec) v.id = rec.id;
        return API.panggil('simpanRecord', { modul: 'suratMasuk', record: v }).then(async function (r) {
          if (!U.hasil(r)) return r;
          var hasil = r.data;
          if (berkas._scan) {
            var b = await U.bacaBerkas(berkas._scan);
            var s = await API.panggil('lampirkanScan', { modul: 'suratMasuk', id: hasil.id, nama: b.nama, base64: b.base64 });
            if (s.success) hasil = s.data; else U.toast('Data tersimpan, tetapi scan gagal diunggah: ' + s.message, 'galat');
          }
          A.upsertBaris('suratMasuk', hasil); A.renderUlang();
          return r;
        });
      } });
  }
  function detailSuratMasuk(id) {
    ambilRekam('suratMasuk', id).then(function (r) {
      if (!r) { U.toast('Data tidak ditemukan.', 'galat'); return; }
      var tulis = A.tulis();
      var l = laciDetail({ overline: 'Surat masuk · ' + (r.sumber || 'MANUAL'), judul: r.perihal, sub: r.nomorAgenda,
        isi: '<div class="baris" style="margin-bottom:14px">' + U.badge(r.status) + '<span class="badge b-netral tanpa-titik">' + esc(r.sifat || 'Biasa') + '</span>' + (r.dibalas === true || r.dibalas === 'true' ? '<span class="badge b-terbit">Dibalas</span>' : '') + '</div>' +
          meta([['Asal instansi', r.asalInstansi], ['Nomor surat asal', r.nomorSuratAsal], ['Tanggal surat', U.tgl(r.tanggalSurat)], ['Tanggal diterima', U.tgl(r.tanggalTerima)], ['Disposisi', r.tujuanDisposisi], ['Email pengirim', r.emailPengirim], ['Catatan disposisi', r.catatanDisposisi, true]]) +
          (A.json(r.lampiran, []).length ? '<div class="overline" style="margin:16px 0 8px">Lampiran email</div><div class="lampiran-grid">' + A.json(r.lampiran, []).map(function (x) { return '<button class="lp" data-berkas="' + esc(x.id) + '" style="cursor:pointer;text-align:left"><span class="ik">' + ik('file', 'sm') + '</span><span class="nm">' + esc(x.nama) + '</span></button>'; }).join('') + '</div>' : '') +
          riwayatHtml(r.riwayat),
        kaki: (r.fileScanUrl ? '<button class="btn btn-soft" data-a="scan">' + ik('eye', 'sm') + 'Lihat Scan</button>' : '') +
          (r.emailMasukId ? '<a class="btn btn-ghost" href="#/admin/email-masuk?id=' + esc(r.emailMasukId) + '" data-tutup>' + ik('mail', 'sm') + 'Email asal</a>' : '') +
          (tulis ? '<button class="btn btn-outline" data-a="ubah">' + ik('edit', 'sm') + 'Ubah / Disposisi</button><button class="btn btn-soft" data-a="balas">' + ik('reply', 'sm') + 'Buat Surat Balasan</button>' + (r.status !== 'SELESAI' ? '<button class="btn btn-soft" data-a="selesai">' + ik('check', 'sm') + 'Selesai</button>' : '') : '') +
          (A.sa() ? '<button class="btn btn-danger" data-a="hapus">' + ik('trash', 'sm') + '</button>' : '') });
      pasangAksiUmum(l, 'suratMasuk', r, {
        scan: function (b) { A.bukaBerkas(r.fileScanUrl, 'Scan ' + r.nomorAgenda, b); },
        ubah: function () { l.tutup(); formSuratMasuk(r); },
        balas: function () { l.tutup(); location.hash = '#/admin/surat-keluar/baru?sm=' + encodeURIComponent(r.id); },
        selesai: function (b) { U.sibuk(b, function () { return API.panggil('simpanRecord', { modul: 'suratMasuk', record: { id: r.id, perihal: r.perihal, asalInstansi: r.asalInstansi, status: 'SELESAI' } }).then(function (x) { if (U.hasil(x)) { A.upsertBaris('suratMasuk', x.data); l.tutup(); A.renderUlang(); } }); }); }
      });
    });
  }
  function pasangAksiUmum(l, modul, r, peta) {
    U.$$('[data-berkas]', l.el).forEach(function (b) { b.addEventListener('click', function () { A.bukaBerkas(b.dataset.berkas, '', b); }); });
    U.$$('a[data-tutup]', l.el).forEach(function (a) { a.addEventListener('click', function () { l.tutup(); }); });
    U.$$('[data-a]', l.el).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.a === 'hapus') {
          U.konfirmasi('Hapus data ini?', 'Data dihapus permanen dari register. Tindakan ini tercatat di log.', { bahaya: true, ya: 'Hapus' }).then(function (ya) {
            if (!ya) return;
            API.panggil('hapusRecord', { modul: modul, id: r.id }).then(function (x) { if (U.hasil(x)) { A.hapusBaris(modul, r.id); l.tutup(); A.renderUlang(); } });
          });
          return;
        }
        if (peta[b.dataset.a]) peta[b.dataset.a](b);
      });
    });
  }

  A.daftar('surat-masuk', halamanRegister({
    modul: 'suratMasuk', label: 'Surat Masuk', ikon: 'inbox', tgl: 'tanggalTerima', desk: 'Agenda surat masuk dari email (diarsipkan) maupun dicatat manual, lengkap dengan disposisi.',
    tombol: '<button class="btn btn-gold" data-baru>' + ik('plus', 'sm') + 'Catat Surat Masuk</button>', placeholder: 'Cari agenda, perihal, asal, nomor…',
    status: ['DICATAT', 'DIDISPOSISI', 'SELESAI'],
    cari: function (r) { return [r.nomorAgenda, r.perihal, r.asalInstansi, r.nomorSuratAsal, r.tujuanDisposisi, r.emailPengirim]; },
    kolom: [
      { l: 'No. Agenda', k: 'nomorAgenda', kelas: 'mono' }, { l: 'Diterima', f: function (r) { return esc(U.tglPendek(r.tanggalTerima)); } },
      { l: 'Asal', f: function (r) { return esc(r.asalInstansi) + (r.sumber === 'EMAIL' ? ' <span class="badge b-netral tanpa-titik">' + ik('mail', 'sm') + '</span>' : ''); } },
      { l: 'Perihal', f: function (r) { return '<b style="font-weight:600">' + esc(r.perihal) + '</b>' + (r.nomorSuratAsal ? '<div class="mono kecil muted">' + esc(r.nomorSuratAsal) + '</div>' : ''); } },
      { l: 'Sifat', k: 'sifat' }, { l: 'Disposisi', k: 'tujuanDisposisi' }, { l: 'Status', f: function (r) { return U.badge(r.status); } }],
    detail: detailSuratMasuk, baru: function () { formSuratMasuk(null); },
    pasang: function (el) { var b = el.querySelector('[data-baru]'); if (b) b.addEventListener('click', function () { formSuratMasuk(null); }); }
  }));

  // ===========================================================================
  // MOU
  // ===========================================================================
  function sisaHari(t) { var d = U.keTgl(t); return d ? Math.ceil((d - new Date(U.hariIni() + 'T00:00:00')) / 86400000) : null; }
  function formMou(rec) {
    formModal({ judul: rec ? 'Ubah MOU' : 'Catat MOU / Kerja Sama', sub: rec ? rec.nomorMOU : 'Kosongkan nomor untuk penomoran otomatis.', ikon: 'handshake', nilai: rec,
      fields: [{ k: 'nomorMOU', l: 'Nomor MOU', mono: true, bantu: rec ? 'Nomor tidak dapat diubah.' : 'Opsional' }, { k: 'kategori', l: 'Kategori', tipe: 'pilihan', opsi: ['MOU', 'MOA', 'PKS', 'IA', 'Lainnya'] },
        { k: 'pihakTerkait', l: 'Pihak terkait', wajib: true, penuh: true }, { k: 'ruangLingkup', l: 'Ruang lingkup', tipe: 'area', wajib: true, penuh: true },
        { k: 'tanggalMulai', l: 'Tanggal mulai', tipe: 'tanggal', wajib: true }, { k: 'tanggalBerakhir', l: 'Tanggal berakhir', tipe: 'tanggal' },
        { k: 'pic', l: 'PIC' }, { k: 'kontakPic', l: 'Kontak PIC' }, { k: 'status', l: 'Status', tipe: 'pilihan', opsi: ['AKTIF', 'BERAKHIR', 'DIBATALKAN'] },
        { k: '_file', l: 'Berkas MOU (PDF, maks. 10 MB)', tipe: 'berkas', accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx' }],
      simpan: async function (v, berkas) {
        if (rec) v.id = rec.id;
        if (berkas._file) { var up = await A.unggah('mou', berkas._file, 10).catch(function (e) { return { success: false, message: e.message }; }); if (!U.hasil(up, false)) return up; v.fileUrl = up.data.url; }
        var r = await API.panggil('simpanRecord', { modul: 'mou', record: v });
        if (U.hasil(r)) { A.upsertBaris('mou', r.data); A.renderUlang(); }
        return r;
      } });
  }
  function detailMou(id) {
    ambilRekam('mou', id).then(function (r) {
      if (!r) return;
      var s = sisaHari(r.tanggalBerakhir);
      var l = laciDetail({ overline: 'Kerja sama · ' + (r.kategori || 'MOU'), judul: r.pihakTerkait, sub: r.nomorMOU,
        isi: '<div class="baris" style="margin-bottom:14px">' + U.badge(r.status) + (s !== null && r.status === 'AKTIF' ? '<span class="badge ' + (s < 0 ? 'b-ditolak' : s <= 60 ? 'b-menunggu' : 'b-terbit') + '">' + (s < 0 ? 'lewat ' + Math.abs(s) + ' hari' : 'sisa ' + s + ' hari') + '</span>' : '') + '</div>' +
          meta([['Ruang lingkup', r.ruangLingkup, true], ['Mulai', U.tgl(r.tanggalMulai)], ['Berakhir', r.tanggalBerakhir ? U.tgl(r.tanggalBerakhir) : 'Tanpa batas'], ['PIC', r.pic], ['Kontak PIC', r.kontakPic]]),
        kaki: (r.fileUrl ? '<button class="btn btn-soft" data-a="file">' + ik('eye', 'sm') + 'Lihat Berkas</button>' : '') + (A.tulis() ? '<button class="btn btn-outline" data-a="ubah">' + ik('edit', 'sm') + 'Ubah</button>' : '') + (A.sa() ? '<button class="btn btn-danger" data-a="hapus">' + ik('trash', 'sm') + '</button>' : '') });
      pasangAksiUmum(l, 'mou', r, { file: function (b) { A.bukaBerkas(r.fileUrl, r.nomorMOU, b); }, ubah: function () { l.tutup(); formMou(r); } });
    });
  }
  A.daftar('mou', halamanRegister({
    modul: 'mou', label: 'MOU / Kerja Sama', ikon: 'handshake', tgl: 'tanggalMulai', desk: 'Register nota kesepahaman & perjanjian kerja sama beserta masa berlakunya.',
    tombol: '<button class="btn btn-gold" data-baru>' + ik('plus', 'sm') + 'Catat MOU</button>', placeholder: 'Cari nomor, pihak, ruang lingkup…', status: ['AKTIF', 'BERAKHIR'],
    cari: function (r) { return [r.nomorMOU, r.pihakTerkait, r.ruangLingkup, r.pic, r.kategori]; },
    kolom: [{ l: 'Nomor', k: 'nomorMOU', kelas: 'mono' }, { l: 'Kategori', k: 'kategori' }, { l: 'Pihak terkait', f: function (r) { return '<b style="font-weight:600">' + esc(r.pihakTerkait) + '</b><div class="muted kecil">' + esc(String(r.ruangLingkup || '').slice(0, 90)) + '</div>'; } },
      { l: 'Masa berlaku', f: function (r) { return esc(U.tglPendek(r.tanggalMulai)) + ' – ' + esc(r.tanggalBerakhir ? U.tglPendek(r.tanggalBerakhir) : '∞'); } },
      { l: 'Sisa', f: function (r) { var s = sisaHari(r.tanggalBerakhir); return s === null || r.status !== 'AKTIF' ? '-' : '<span class="badge ' + (s < 0 ? 'b-ditolak' : s <= 60 ? 'b-menunggu' : 'b-terbit') + ' tanpa-titik">' + (s < 0 ? 'lewat' : s + ' hari') + '</span>'; } },
      { l: 'Status', f: function (r) { return U.badge(r.status); } }],
    detail: detailMou, baru: function () { formMou(null); },
    pasang: function (el) { var b = el.querySelector('[data-baru]'); if (b) b.addEventListener('click', function () { formMou(null); }); }
  }));

  // ===========================================================================
  // ARSIP DOKUMEN PENTING
  // ===========================================================================
  var KATEGORI_ARSIP = ['Legalitas', 'Akreditasi', 'Sertifikat', 'Aset', 'Kepegawaian', 'Keuangan', 'Kurikulum', 'Lainnya'];
  function formArsip(rec) {
    formModal({ judul: rec ? 'Ubah Arsip' : 'Tambah Arsip Penting', sub: rec ? rec.kodeArsip : 'Kode arsip dibuat otomatis.', ikon: 'archive', nilai: rec,
      fields: [{ k: 'namaDokumen', l: 'Nama dokumen', wajib: true, penuh: true }, { k: 'kategori', l: 'Kategori', tipe: 'pilihan', opsi: KATEGORI_ARSIP, wajib: true },
        { k: 'klasifikasiAkses', l: 'Klasifikasi akses', tipe: 'pilihan', opsi: ['Internal', 'Publik', 'Rahasia'] }, { k: 'lembagaPenerbit', l: 'Lembaga penerbit' },
        { k: 'tahunTerbit', l: 'Tahun terbit', mono: true }, { k: 'nomorLegalitas', l: 'Nomor legalitas', mono: true, penuh: true }, { k: 'keterangan', l: 'Keterangan', tipe: 'area', penuh: true },
        { k: '_file', l: 'Berkas (PDF/gambar, maks. 10 MB)', tipe: 'berkas', penuh: true }],
      simpan: async function (v, berkas) {
        if (rec) v.id = rec.id;
        if (berkas._file) { var up = await A.unggah('arsip', berkas._file, 10).catch(function (e) { return { success: false, message: e.message }; }); if (!U.hasil(up, false)) return up; v.fileUrl = up.data.url; }
        var r = await API.panggil('simpanRecord', { modul: 'arsip', record: v });
        if (U.hasil(r)) { A.upsertBaris('arsip', r.data); A.renderUlang(); }
        return r;
      } });
  }
  function detailArsip(id) {
    ambilRekam('arsip', id).then(function (r) {
      if (!r) return;
      var l = laciDetail({ overline: 'Arsip · ' + r.kategori, judul: r.namaDokumen, sub: r.kodeArsip,
        isi: '<div class="baris" style="margin-bottom:14px"><span class="badge ' + (r.klasifikasiAkses === 'Rahasia' ? 'b-ditolak' : r.klasifikasiAkses === 'Publik' ? 'b-terbit' : 'b-netral') + '">' + esc(r.klasifikasiAkses || 'Internal') + '</span></div>' +
          meta([['Lembaga penerbit', r.lembagaPenerbit], ['Tahun terbit', r.tahunTerbit], ['Nomor legalitas', r.nomorLegalitas, true], ['Keterangan', r.keterangan, true], ['Dicatat', U.tglJam(r.dibuat)]]),
        kaki: (r.fileUrl ? '<button class="btn btn-soft" data-a="file">' + ik('eye', 'sm') + 'Lihat Berkas</button>' : '') + (A.tulis() ? '<button class="btn btn-outline" data-a="ubah">' + ik('edit', 'sm') + 'Ubah</button>' : '') + (A.sa() ? '<button class="btn btn-danger" data-a="hapus">' + ik('trash', 'sm') + '</button>' : '') });
      pasangAksiUmum(l, 'arsip', r, { file: function (b) { A.bukaBerkas(r.fileUrl, r.namaDokumen, b); }, ubah: function () { l.tutup(); formArsip(r); } });
    });
  }
  A.daftar('arsip', halamanRegister({
    modul: 'arsip', label: 'Arsip Dokumen Penting', ikon: 'archive', tgl: 'dibuat', desk: 'Legalitas, akreditasi, sertifikat, dan dokumen penting institusi.',
    tombol: '<button class="btn btn-gold" data-baru>' + ik('plus', 'sm') + 'Tambah Arsip</button>', placeholder: 'Cari kode, nama, nomor legalitas…',
    cari: function (r) { return [r.kodeArsip, r.namaDokumen, r.kategori, r.lembagaPenerbit, r.nomorLegalitas, r.tahunTerbit]; },
    kolom: [{ l: 'Kode', k: 'kodeArsip', kelas: 'mono' }, { l: 'Nama dokumen', f: function (r) { return '<b style="font-weight:600">' + esc(r.namaDokumen) + '</b><div class="muted kecil">' + esc(r.lembagaPenerbit || '') + '</div>'; } },
      { l: 'Kategori', k: 'kategori' }, { l: 'Tahun', k: 'tahunTerbit', kelas: 'mono' }, { l: 'No. legalitas', k: 'nomorLegalitas', kelas: 'mono' },
      { l: 'Akses', f: function (r) { return '<span class="badge b-netral tanpa-titik">' + esc(r.klasifikasiAkses || 'Internal') + '</span>'; } }],
    detail: detailArsip, baru: function () { formArsip(null); },
    pasang: function (el) { var b = el.querySelector('[data-baru]'); if (b) b.addEventListener('click', function () { formArsip(null); }); }
  }));

  // ===========================================================================
  // DOKUMEN KELUAR (Surat Keluar, SK, BA, Dokumen) — register & detail
  // ===========================================================================
  function urlVerif(kode) { var b = String(A.cfg('APP_URL', '') || (location.origin + location.pathname)).replace(/[?#].*$/, '').replace(/\/+$/, ''); return b + '/?v=' + kode; }
  function kolomDok(modul) {
    var D = DOKM[modul];
    var nomor = { l: 'Nomor', f: function (r) { return r[D.nomor] ? '<span class="mono">' + esc(r[D.nomor]) + '</span>' : '<span class="muted kecil">— belum bernomor —</span>'; } };
    var status = { l: 'Status', f: function (r) { return U.badge(r.status); } };
    if (modul === 'suratKeluar') return [nomor, { l: 'Tanggal', f: function (r) { return esc(U.tglPendek(r.tanggal)); } }, { l: 'Jenis', k: 'jenisSurat' }, { l: 'Tujuan', k: 'tujuan' },
      { l: 'Perihal', f: function (r) { return '<b style="font-weight:600">' + esc(r.perihal) + '</b>' + (r.permohonanId ? ' <span class="badge b-netral tanpa-titik" title="Dari permohonan">' + ik('filePlus', 'sm') + '</span>' : ''); } }, { l: 'Penanda tangan', k: 'pejabatNama' }, status];
    if (modul === 'sk') return [nomor, { l: 'Tanggal', f: function (r) { return esc(U.tglPendek(r.tanggal)); } }, { l: 'Tentang', f: function (r) { return '<b style="font-weight:600">' + esc(r.tentang) + '</b>'; } }, { l: 'Pejabat', k: 'pejabatNama' }, status];
    if (modul === 'beritaAcara') return [nomor, { l: 'Tanggal', f: function (r) { return esc(U.tglPendek(r.tanggal)); } }, { l: 'Kategori', k: 'kategori' }, { l: 'Agenda', f: function (r) { return '<b style="font-weight:600">' + esc(r.agenda) + '</b><div class="muted kecil">' + esc(r.lokasi || '') + '</div>'; } }, { l: 'Pimpinan', k: 'pimpinanRapat' }, status];
    return [nomor, { l: 'Judul', f: function (r) { return '<b style="font-weight:600">' + esc(r.judul) + '</b>'; } }, { l: 'Penerima', k: 'penerima' }, { l: 'Massal', f: function (r) { return r.massalId ? '<span class="mono kecil">' + esc(r.massalId) + '</span>' : '-'; } }, { l: 'Dibuat', f: function (r) { return esc(U.tglPendek(r.dibuat)); } }, status];
  }

  function detailDokumen(modul, id) {
    var D = DOKM[modul];
    ambilRekam(modul, id).then(function (r) {
      if (!r) { U.toast('Dokumen tidak ditemukan.', 'galat'); return; }
      var I = A.json(r.dataIsian, {}), ttd = A.json(r.penandatangan, []), tulis = A.tulis(), sa = A.sa();
      var berkas = A.json(r.berkas, []);
      var aksi = [];
      if (r.status === 'TERBIT' || r.status === 'DITARIK') aksi.push('<button class="btn btn-primary" data-a="pdf">' + ik('eye', 'sm') + 'Lihat PDF</button>');
      if (r.status === 'TERBIT' && tulis) aksi.push('<button class="btn btn-soft" data-a="email">' + ik('send', 'sm') + 'Kirim Email</button>', '<button class="btn btn-soft" data-a="scan">' + ik('upload', 'sm') + 'Lampirkan Scan</button>', '<button class="btn btn-danger" data-a="tarik">' + ik('rotate', 'sm') + 'Tarik</button>');
      if (r.fileScanUrl) aksi.push('<button class="btn btn-ghost" data-a="lihatScan">' + ik('image', 'sm') + 'Scan Basah</button>');
      if (r.status === 'DRAF' && tulis) aksi.push('<a class="btn btn-gold" href="#/admin/' + D.key + '/ubah?id=' + esc(r.id) + '" data-tutup>' + ik('edit', 'sm') + 'Lanjutkan</a>', '<button class="btn btn-danger" data-a="hapus">' + ik('trash', 'sm') + '</button>');
      if (r.status === 'MENUNGGU_TTD') { aksi.push('<a class="btn btn-soft" href="#/admin/ttd" data-tutup>' + ik('signature', 'sm') + 'Antrean TTD</a>'); if (sa) aksi.push('<button class="btn btn-outline" data-a="bypass">' + ik('zap', 'sm') + 'Bypass (SA)</button>'); }
      var judul = r[D.judulK] || I.PERIHAL || I.TENTANG || I.AGENDA || '(tanpa judul)';
      var l = laciDetail({ overline: D.label + (r.jenisSurat ? ' · ' + r.jenisSurat : ''), judul: judul, sub: r[D.nomor] || 'Belum bernomor',
        isi: '<div class="baris" style="margin-bottom:14px">' + U.badge(r.status) + (r.tteStatus ? '<span class="badge b-netral tanpa-titik">TTE: ' + esc(r.tteStatus) + '</span>' : '') + (r.permohonanId ? '<a class="badge b-netral tanpa-titik" href="#/admin/permohonan?id=' + esc(r.permohonanId) + '" data-tutup>' + ik('filePlus', 'sm') + ' permohonan</a>' : '') + '</div>' +
          (r.status === 'DITARIK' ? '<div class="pemberitahuan galat" style="margin-bottom:14px">' + ik('alert') + '<div><b>Ditarik:</b> ' + esc(r.alasanTarik || '-') + '</div></div>' : '') +
          meta([['Tanggal', U.tgl(r.tanggal || r.dibuat)], modul === 'suratKeluar' ? ['Tujuan', r.tujuan] : null, modul === 'dokumen' ? ['Penerima', r.penerima] : null, modul === 'beritaAcara' ? ['Lokasi', r.lokasi] : null,
            ['Dibuat oleh', r.dibuatOleh], ['Dibuat', U.tglJam(r.dibuat)]]) +
          (ttd.length ? '<div class="overline" style="margin:16px 0 8px">Penanda tangan</div><div class="tumpuk" style="gap:8px">' + ttd.map(function (p) {
            return '<div class="blok-abu" style="padding:12px"><div class="antara"><div><div class="overline">' + esc(p.label || 'Penanda tangan') + '</div><b>' + esc(p.nama) + '</b><div class="muted kecil">' + esc(p.jabatan || '') + '</div></div>' + U.badge(p.status === 'SETUJU' ? 'TERBIT' : 'MENUNGGU').replace('Terbit', 'Setuju') + '</div>' +
              (p.metode ? '<div class="mono kecil muted" style="margin-top:6px">' + esc(p.metode) + (p.waktu ? ' · ' + esc(U.tglJam(p.waktu)) : '') + '</div>' : '') + '</div>';
          }).join('') + '</div>' : '') +
          (r.kodeVerifikasi ? '<div class="overline" style="margin:16px 0 8px">Verifikasi keaslian</div><div class="blok-abu"><div class="antara"><div><div class="mono tebal" style="font-size:16px;letter-spacing:.04em">' + esc(r.kodeVerifikasi) + '</div><div class="kecil muted" style="word-break:break-all">' + esc(urlVerif(r.kodeVerifikasi)) + '</div></div><div style="width:76px">' + U.qrSvg(urlVerif(r.kodeVerifikasi), 76) + '</div></div>' +
            '<div class="baris" style="margin-top:10px"><button class="btn btn-soft btn-xs" data-a="salinVerif">' + ik('copy', 'sm') + 'Salin tautan</button><a class="btn btn-ghost btn-xs" href="#/verifikasi?kode=' + esc(r.kodeVerifikasi) + '" target="_blank" rel="noopener">' + ik('external', 'sm') + 'Buka halaman verifikasi</a></div>' +
            (r.hashPdf ? '<div class="kotak-hash" style="margin-top:10px">SHA-256 ' + esc(r.hashPdf) + '</div>' : '') + '</div>' : '') +
          (berkas.length > 1 ? '<div class="overline" style="margin:16px 0 8px">Berkas keluaran</div><div class="lampiran-grid">' + berkas.map(function (b) { return '<button class="lp" data-berkas="' + esc(b.id) + '" style="cursor:pointer;text-align:left"><span class="ik">' + ik('file', 'sm') + '</span><div><div class="nm">' + esc(String(b.format).toUpperCase()) + '</div><div class="kecil muted">' + esc(b.nama) + '</div></div></button>'; }).join('') + '</div>' : '') +
          (r.dikirimKe ? '<div class="muted kecil" style="margin-top:12px">' + ik('send', 'sm') + ' Dikirim ke ' + esc(r.dikirimKe) + (r.dikirimPada ? ' · ' + esc(U.tglJam(r.dikirimPada)) : '') + '</div>' : ''),
        kaki: aksi.join('') });
      pasangAksiUmum(l, modul, r, {
        pdf: function (b) { A.bukaBerkas(r.pdfId, r[D.nomor], b); },
        lihatScan: function (b) { A.bukaBerkas(r.fileScanUrl, 'Scan ' + r[D.nomor], b); },
        salinVerif: function () { U.salin(urlVerif(r.kodeVerifikasi)); },
        email: function () { kirimEmailDok(modul, r); },
        scan: function () {
          var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png';
          inp.onchange = function () { if (!inp.files[0]) return; U.bacaBerkas(inp.files[0]).then(function (bk) { return API.panggil('lampirkanScan', { modul: modul, id: r.id, nama: bk.nama, base64: bk.base64 }); }).then(function (x) { if (U.hasil(x)) { A.upsertBaris(modul, x.data); l.tutup(); detailDokumen(modul, id); } }); };
          inp.click();
        },
        tarik: function () {
          U.minta('Tarik kembali ' + (r[D.nomor] || ''), { label: 'Alasan penarikan (tampil di halaman verifikasi publik)', textarea: true, min: 10, bahaya: true, ya: 'Tarik Dokumen', bantu: 'Dokumen akan berstatus DITARIK dan QR menampilkan peringatan.' })
            .then(function (al) { if (!al) return; API.panggil('tarikKembaliDokumen', { modul: modul, id: r.id, alasan: al }).then(function (x) { if (U.hasil(x)) { A.upsertBaris(modul, x.data); l.tutup(); A.renderUlang(); } }); });
        },
        bypass: function () {
          U.minta('Bypass persetujuan tanda tangan', { label: 'Alasan bypass (tercatat & tampil di verifikasi)', textarea: true, min: 5, ya: 'Bypass & Terbitkan', bahaya: true })
            .then(function (al) { if (!al) return; API.panggil('ttdBypass', { modul: modul, id: r.id, alasan: al }, { timeout: 300000 }).then(function (x) { if (U.hasil(x)) { A.upsertBaris(modul, x.data); l.tutup(); A.renderUlang(); } }); });
        }
      });
    });
  }

  function kirimEmailDok(modul, r) {
    var D = DOKM[modul], I = A.json(r.dataIsian, {});
    var saran = r.emailPenerima || I.EMAIL || I.EMAIL_PEMOHON || '';
    var m = U.modal({ judul: 'Kirim ' + D.label + ' via Email', sub: r[D.nomor], ikon: ik('send'),
      isi: '<div class="tumpuk" style="gap:12px"><div class="field"><label>Email tujuan <span class="wajib">*</span></label><input class="input" id="ke-email" value="' + esc(saran) + '" placeholder="pisahkan dengan koma"></div>' +
        '<div class="field"><label>Subjek</label><input class="input" id="ke-subjek" value="' + esc(D.label + ' ' + (r[D.nomor] || '')) + '"></div>' +
        '<div class="field"><label>Pesan</label><textarea class="textarea" id="ke-pesan" placeholder="Kosongkan untuk pesan bawaan beserta tautan verifikasi."></textarea></div><div class="muted kecil">' + ik('clip', 'sm') + ' PDF resmi dilampirkan otomatis.</div></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" data-kirim>' + ik('send', 'sm') + 'Kirim</button>' });
    m.$('[data-kirim]').addEventListener('click', function () {
      var b = this;
      U.sibuk(b, function () { return API.panggil('kirimDokumenEmail', { modul: modul, id: r.id, email: m.$('#ke-email').value, subjek: m.$('#ke-subjek').value, pesan: m.$('#ke-pesan').value }).then(function (x) { if (U.hasil(x)) m.tutup(); }); });
    });
  }

  function halamanDokumen(modul, ekstra) {
    var D = DOKM[modul];
    ekstra = ekstra || {};
    return halamanRegister({
      modul: modul, label: D.label, ikon: D.ikon, tgl: modul === 'dokumen' ? 'dibuat' : 'tanggal', desk: ekstra.desk,
      tombol: '<a class="btn btn-gold" href="#/admin/' + D.key + '/baru">' + ik('plus', 'sm') + 'Buat ' + esc(modul === 'dokumen' ? 'Dokumen' : D.label) + '</a>',
      aksiEkstra: ekstra.aksiEkstra, atas: ekstra.atas, placeholder: 'Cari nomor, perihal, kode verifikasi…', status: ['DRAF', 'MENUNGGU_TTD', 'TERBIT', 'DITARIK'],
      cari: function (r) { return [r[D.nomor], r[D.judulK], r.tujuan, r.penerima, r.kodeVerifikasi, r.pejabatNama, r.jenisSurat, r.lokasi, r.massalId]; },
      kolom: kolomDok(modul),
      detail: function (id) { detailDokumen(modul, id); },
      sub: function (el, ctx) { Generator.render(el, modul, ctx); },
      pasang: ekstra.pasang
    });
  }
  A.daftar('surat-keluar', halamanDokumen('suratKeluar', { desk: 'Generator & register surat keluar bernomor otomatis dengan QR verifikasi.' }));
  A.daftar('sk', halamanDokumen('sk', { desk: 'Surat Keputusan pimpinan — menimbang, mengingat, menetapkan.' }));
  A.daftar('berita-acara', halamanDokumen('beritaAcara', { desk: 'Berita acara rapat/kegiatan; nomor mengikuti tanggal kegiatan.' }));

  // ===========================================================================
  // EDITOR NASKAH (contenteditable + sanitasi tempel)
  // ===========================================================================
  var TAG_BOLEH = { P: 1, DIV: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, OL: 1, UL: 1, LI: 1, TABLE: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, SPAN: 1, H3: 1, H4: 1 };
  function bersihHtml(html) {
    var doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    var akar = doc.body.firstChild;
    (function jalan(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1) { c.remove(); return; }
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|META|LINK|TITLE|HEAD)$/.test(c.tagName)) { c.remove(); return; }
        jalan(c);
        if (!TAG_BOLEH[c.tagName]) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); return; }
        var al = (c.style && c.style.textAlign) || c.getAttribute('align') || '', tipe = c.getAttribute('type'), garis = c.getAttribute('data-garis');
        Array.prototype.slice.call(c.attributes).forEach(function (a) { c.removeAttribute(a.name); });
        if (/^(left|center|right|justify)$/.test(al)) c.setAttribute('style', 'text-align:' + al);
        if (c.tagName === 'OL' && /^[1aAiI]$/.test(tipe || '')) c.setAttribute('type', tipe);
        if (c.tagName === 'TABLE' && garis === '0') c.setAttribute('data-garis', '0');
      });
    })(akar);
    return akar.innerHTML.replace(/(<p>(\s|&nbsp;|<br>)*<\/p>\s*)+$/i, '');
  }
  function teksPolos(html) { var d = document.createElement('div'); d.innerHTML = bersihHtml(html); return (d.innerText || d.textContent || '').trim(); }
  function editorHtml(id, nilai, ph) {
    var t = function (cmd, ikon, judul, ekstra) { return '<button type="button" data-cmd="' + cmd + '"' + (ekstra || '') + ' title="' + judul + '" aria-label="' + judul + '">' + ikon + '</button>'; };
    return '<div class="editor" data-editor="' + id + '"><div class="editor-alat">' +
      t('bold', '<b>B</b>', 'Tebal') + t('italic', '<i>I</i>', 'Miring') + t('underline', '<u>U</u>', 'Garis bawah') + '<span class="pemisah"></span>' +
      t('ol', ik('listOl', 'sm'), 'Daftar bernomor') + '<select data-oltipe title="Gaya penomoran" aria-label="Gaya penomoran"><option value="1">1.</option><option value="a">a.</option><option value="A">A.</option><option value="i">i.</option></select>' +
      t('insertUnorderedList', ik('list', 'sm'), 'Daftar butir') + t('indent', '→', 'Masuk') + t('outdent', '←', 'Keluar') + '<span class="pemisah"></span>' +
      t('justifyLeft', ik('alignLeft', 'sm'), 'Rata kiri') + t('justifyCenter', ik('alignCenter', 'sm'), 'Tengah') + t('justifyRight', ik('alignRight', 'sm'), 'Rata kanan') + t('justifyFull', ik('alignJustify', 'sm'), 'Rata kanan-kiri') + '<span class="pemisah"></span>' +
      t('tabel', ik('table', 'sm'), 'Sisipkan tabel') + t('tabel0', ik('layers', 'sm'), 'Tabel tanpa garis (perataan)') + t('removeFormat', ik('eraser', 'sm'), 'Hapus format') +
      '<span class="hitung" data-hitung>0 kata</span></div><div class="editor-isi" contenteditable="true" data-placeholder="' + esc(ph || 'Tulis naskah…') + '" id="' + id + '">' + bersihHtml(nilai || '') + '</div></div>';
  }
  function pasangEditor(wadah, onUbah) {
    U.$$('[data-editor]', wadah).forEach(function (ed) {
      var isi = ed.querySelector('.editor-isi'), hitung = ed.querySelector('[data-hitung]');
      var perbarui = function () { var n = (isi.innerText || '').trim().split(/\s+/).filter(String).length; hitung.textContent = n + ' kata'; onUbah && onUbah(); };
      ed.querySelectorAll('[data-cmd]').forEach(function (b) {
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () {
          isi.focus();
          var c = b.dataset.cmd;
          if (c === 'ol') { document.execCommand('insertOrderedList'); setOlTipe(ed.querySelector('[data-oltipe]').value); }
          else if (c === 'tabel' || c === 'tabel0') { mintaTabel(isi, c === 'tabel0', perbarui); return; }
          else document.execCommand(c);
          perbarui();
        });
      });
      ed.querySelector('[data-oltipe]').addEventListener('change', function () { isi.focus(); setOlTipe(this.value); perbarui(); });
      isi.addEventListener('input', perbarui);
      isi.addEventListener('paste', function (e) {
        var cd = e.clipboardData; if (!cd) return;
        e.preventDefault();
        var h = cd.getData('text/html'), t = cd.getData('text/plain');
        document.execCommand('insertHTML', false, h ? bersihHtml(h) : esc(t).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>'));
        perbarui();
      });
      perbarui();
    });
    function setOlTipe(v) {
      var s = window.getSelection(); if (!s.rangeCount) return;
      var n = s.anchorNode; while (n && n.nodeName !== 'OL' && !(n.classList && n.classList.contains('editor-isi'))) n = n.parentNode;
      if (n && n.nodeName === 'OL') n.setAttribute('type', v);
    }
  }
  /** Dialog ukuran tabel (tanpa window.prompt); posisi kursor disimpan lalu dipulihkan. */
  function mintaTabel(isi, tanpaGaris, selesai) {
    var sel = window.getSelection(), rentang = sel.rangeCount && isi.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    var m = U.modal({ judul: tanpaGaris ? 'Tabel tanpa garis (perataan)' : 'Sisipkan tabel', ikon: ik('table'),
      isi: '<div class="grid-form"><div class="field"><label>Baris</label><input class="input" type="number" id="tb-b" min="1" max="40" value="' + (tanpaGaris ? 3 : 2) + '"></div><div class="field"><label>Kolom</label><input class="input" type="number" id="tb-k" min="1" max="8" value="' + (tanpaGaris ? 3 : 3) + '"></div></div>' +
        (tanpaGaris ? '<div class="bantu" style="margin-top:8px">Cocok untuk “Nama : …” yang rata. Garis putus-putus hanya tampil di editor, tidak dicetak.</div>' : ''),
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" data-ya>Sisipkan</button>' });
    m.$('[data-ya]').addEventListener('click', function () {
      var bar = Math.max(1, Math.min(40, Number(m.$('#tb-b').value) || 2)), kol = Math.max(1, Math.min(8, Number(m.$('#tb-k').value) || 2));
      m.tutup();
      isi.focus();
      if (rentang) { var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(rentang); }
      var html = '<table' + (tanpaGaris ? ' data-garis="0"' : '') + '>' + new Array(bar + 1).join('<tr>' + new Array(kol + 1).join('<td>&nbsp;</td>') + '</tr>') + '</table><p><br></p>';
      if (!document.execCommand('insertHTML', false, html)) isi.insertAdjacentHTML('beforeend', html);
      selesai();
    });
  }

  // ===========================================================================
  // GENERATOR
  // ===========================================================================
  var Generator = {
    render: function (el, modul, ctx) {
      var D = DOKM[modul], q = ctx.q;
      if (!A.tulis()) { el.innerHTML = '<div class="pemberitahuan warn">' + ik('lock') + '<div>Peran Anda hanya memiliki akses baca.</div></div>'; return; }
      el.innerHTML = A.kepala({ overline: D.label, judul: 'Menyiapkan generator…' }) + U.skel(4, 90);
      var g = { modul: modul, id: '', kodeJenis: '', tanggal: U.hariIni(), isian: {}, ttd: {}, pakaiQr: true, tteAktif: true, tteResmi: false, sifat: 'Biasa', judul: '', penerima: '', emailPenerima: '', kirimEmail: false, permohonanId: '', emailMasukId: '', kirimBalasan: true, isiBalasan: '', info: null, reqTerbit: API.reqIdBaru() };
      var kunciLokal = 'gen_' + modul + '_' + (q.id || q.prm || q.email || q.sm || 'baru');
      var mulai = Promise.resolve();
      if (q.id) {
        mulai = API.panggil('getRecord', { modul: modul, id: q.id }).then(function (r) {
          if (!r.success) throw new Error(r.message);
          isiDariRekam(g, r.data);
          if (r.data.status !== 'DRAF') g.beku = r.data.status;
        });
      } else if (q.prm) {
        mulai = API.panggil('permohonanIsiGenerator', { id: q.prm }).then(function (r) {
          if (!r.success) throw new Error(r.message);
          var d = r.data;
          g.permohonanId = d.permohonanId; g.kodeJenis = d.kodeJenis; g.tanggal = d.tanggal; g.isian = d.isian || {};
          g.info = { tipe: 'prm', noRef: d.noRef, pemohon: d.pemohon };
          if (d.drafId) return API.panggil('getRecord', { modul: modul, id: d.drafId }).then(function (x) { if (x.success) { isiDariRekam(g, x.data); g.info = { tipe: 'prm', noRef: d.noRef, pemohon: d.pemohon }; } });
        });
      } else if (q.email) {
        var e = A.rows('emailMasuk').filter(function (x) { return x.id === q.email; })[0] || {};
        g.emailMasukId = q.email; g.isian = { TUJUAN: e.dariNama || e.dariEmail || '', PERIHAL: e.subjek ? 'Balasan: ' + e.subjek : '' };
        g.info = { tipe: 'email', email: e };
      } else if (q.sm) {
        var s = A.rows('suratMasuk').filter(function (x) { return x.id === q.sm; })[0] || {};
        g.isian = { TUJUAN: s.asalInstansi || '', PERIHAL: s.perihal ? 'Balasan atas surat ' + (s.nomorSuratAsal ? 'nomor ' + s.nomorSuratAsal + ' ' : '') + 'perihal ' + s.perihal : '' };
        if (s.emailMasukId) g.emailMasukId = s.emailMasukId;
        g.info = { tipe: 'sm', sm: s };
      }
      mulai.then(function () {
        var lokal = Simpan.get(kunciLokal, null);
        if (lokal && !g.beku && lokal._w && (!g._diperbarui || lokal._w > g._diperbarui)) { Object.assign(g, lokal, { reqTerbit: g.reqTerbit }); g._pulih = true; }
        if (!g.kodeJenis) { var js = A.jenis(D.modulJenis); if (js.length === 1) g.kodeJenis = js[0].kode; }
        if (!document.body.contains(el)) return;
        tampil(el, g, D, kunciLokal);
      }).catch(function (e) { el.innerHTML = '<div class="pemberitahuan galat">' + ik('alert') + '<div>' + esc(e.message) + ' <a href="#/admin/' + D.key + '">Kembali</a></div></div>'; });
    }
  };

  function isiDariRekam(g, r) {
    g.id = r.id; g.kodeJenis = r.kodeJenis; g.tanggal = String(r.tanggal || U.hariIni()).slice(0, 10);
    g.isian = A.json(r.dataIsian, {}) || {};
    A.json(r.penandatangan, []).forEach(function (p) { g.ttd[p.slot] = p.pejabatId; });
    g.tteAktif = String(r.tteAktif) !== 'false'; g.tteResmi = String(r.tteResmi) === 'true';
    g.sifat = r.sifat || 'Biasa'; g.permohonanId = r.permohonanId || ''; g.emailMasukId = r.emailMasukId || '';
    g.judul = r.judul || ''; g.penerima = r.penerima || ''; g.emailPenerima = r.emailPenerima || '';
    g._diperbarui = Date.parse(r.diperbarui || r.dibuat || '') || 0;
  }

  function skemaUntuk(g, D) {
    var t = g.kodeJenis ? A.templateJenis(g.kodeJenis) : null;
    var bidang = t && t.bidang && t.bidang.length ? t.bidang : (BIDANG_BAWAAN[D.modulJenis] || []);
    var slot = t && t.slotTtd && t.slotTtd.length ? t.slotTtd : [{ slot: 1, label: 'Penanda Tangan', cara: 'pilih', tanda: 'spesimen', urutan: 1 }];
    return { t: t, bidang: bidang, slot: slot };
  }

  function fieldGen(b, v) {
    var id = 'g-' + b.kunci, lbl = '<label for="' + id + '">' + esc(b.label || b.kunci) + (b.wajib ? ' <span class="wajib">*</span>' : '') + ' <span class="mono kecil muted" style="font-weight:400">{{' + esc(b.kunci) + '}}</span></label>';
    var bantu = b.bantu ? '<div class="bantu">' + esc(b.bantu) + '</div>' : '';
    var val = v === undefined || v === null ? (b.bawaan || '') : v;
    if (b.tipe === 'naskah') return '<div class="field penuh">' + lbl + editorHtml(id, val, 'Tulis ' + String(b.label || '').toLowerCase() + '…') + bantu + '</div>';
    if (b.tipe === 'area') return '<div class="field penuh">' + lbl + '<textarea class="textarea" id="' + id + '" data-k="' + esc(b.kunci) + '">' + esc(val) + '</textarea>' + bantu + '</div>';
    if (b.tipe === 'pilihan') return '<div class="field">' + lbl + '<select class="select" id="' + id + '" data-k="' + esc(b.kunci) + '"><option value="">— pilih —</option>' + (b.opsi || []).map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + bantu + '</div>';
    if (b.tipe === 'daftar') {
      var kol = (b.kolom || []).length ? b.kolom : [{ kunci: 'NAMA', label: 'Nama' }];
      var rows = Array.isArray(val) ? val : [];
      return '<div class="field penuh" data-daftar="' + esc(b.kunci) + '">' + lbl + '<div class="tabel-wrap" style="border:1px solid var(--border);border-radius:8px"><table class="tabel"><thead><tr><th style="width:36px">No</th>' + kol.map(function (k) { return '<th>' + esc(k.label || k.kunci) + '</th>'; }).join('') + '<th style="width:40px"></th></tr></thead><tbody>' +
        rows.map(function (r, i) { return barisDaftar(kol, r, i); }).join('') + '</tbody></table></div><div class="baris"><button type="button" class="btn btn-soft btn-xs" data-tambah-baris>' + ik('plus', 'sm') + 'Tambah baris</button><span class="bantu">Baris berulang di tabel template.</span></div>' + bantu + '</div>';
    }
    if (b.tipe === 'gambar') return '<div class="field"><label>' + esc(b.label) + '</label><div class="bantu">' + ik('image', 'sm') + ' Gambar diatur di template (logo/TTD/QR otomatis).</div></div>';
    var tipe = b.tipe === 'tanggal' ? 'date' : b.tipe === 'angka' ? 'number' : 'text';
    return '<div class="field">' + lbl + '<input class="input" id="' + id + '" data-k="' + esc(b.kunci) + '" type="' + tipe + '" value="' + esc(val) + '" autocomplete="off">' + bantu + '</div>';
  }
  function barisDaftar(kol, r, i) {
    r = r || {};
    return '<tr><td class="mono kecil">' + (i + 1) + '</td>' + kol.map(function (k) { var v = r[k.kunci] !== undefined ? r[k.kunci] : r[String(k.kunci).toLowerCase()]; return '<td style="padding:4px"><input class="input" style="min-height:32px;padding:5px 8px" data-kol="' + esc(k.kunci) + '" value="' + esc(v == null ? '' : v) + '"></td>'; }).join('') + '<td style="padding:4px"><button type="button" class="btn btn-ghost btn-xs" data-hapus-baris aria-label="Hapus baris">' + ik('x', 'sm') + '</button></td></tr>';
  }

  function tampil(el, g, D, kunciLokal) {
    var modul = g.modul, js = A.jenis(D.modulJenis), sk = skemaUntuk(g, D);
    var pj = A.pejabatAktif();
    var beku = g.beku;
    var info = '';
    if (g.info && g.info.tipe === 'prm') info = '<div class="info-sinkron">' + ik('filePlus') + '<div><b>Dari permohonan ' + esc(g.info.noRef) + '</b><div class="kecil">Pemohon: ' + esc(g.info.pemohon.nama) + ' · ' + esc(g.info.pemohon.email) + ' · ' + esc(g.info.pemohon.noTelp) + '. Setelah terbit, PDF dikirim otomatis ke pemohon & status permohonan menjadi TERBIT.</div></div></div>';
    if (g.info && g.info.tipe === 'email') info = '<div class="info-sinkron">' + ik('mail') + '<div><b>Balasan untuk email:</b> ' + esc(g.info.email.subjek || '') + '<div class="kecil">' + esc(g.info.email.dariNama || '') + ' &lt;' + esc(g.info.email.dariEmail || '') + '&gt; — PDF dapat dikirim sebagai balasan di thread yang sama.</div></div></div>';
    if (g.info && g.info.tipe === 'sm') info = '<div class="info-sinkron">' + ik('inbox') + '<div><b>Balasan surat masuk ' + esc(g.info.sm.nomorAgenda || '') + '</b><div class="kecil">' + esc(g.info.sm.asalInstansi || '') + ' — ' + esc(g.info.sm.perihal || '') + '</div></div></div>';
    var pakaiDocs = sk.t && sk.t.docId && (!sk.t.engine || sk.t.engine === 'docs');
    var ttePilih = A.cfgBool('TTE_AKTIF', false) && modul !== 'dokumen';
    var wadah = el;
    wadah.innerHTML = '<div class="gen-root"></div>';
    el = wadah.firstChild;
    el.innerHTML = A.kepala({ overline: D.label + (g.id ? ' · draf' : ' · baru'), judul: g.id ? 'Sunting Draf ' + D.label : 'Buat ' + D.label, desk: 'Nomor resmi baru dikunci saat <b>Terbitkan</b>; pratinjau tidak memakai nomor.', aksi: '<a class="btn btn-ghost" href="#/admin/' + D.key + '">' + ik('left', 'sm') + 'Kembali ke daftar</a>' }) +
      (beku ? '<div class="pemberitahuan warn" style="margin-bottom:14px">' + ik('lock') + '<div>Dokumen berstatus <b>' + esc(beku) + '</b> sudah beku dan tidak dapat diubah. Gunakan Tarik kembali lalu buat dokumen baru bila perlu perbaikan.</div></div>' : '') +
      (g._pulih ? '<div class="pemberitahuan" style="margin-bottom:14px" id="gen-pulih">' + ik('rotate') + '<div style="flex:1">Isian yang belum disimpan dipulihkan dari perangkat ini.</div><button class="btn btn-ghost btn-xs" id="gen-buang">Buang</button></div>' : '') + info +
      '<div class="gen"><div class="tumpuk">' +
      '<div class="card"><div class="card-head"><div class="langkah-gen"><span class="no-langkah">1</span><h3>Jenis & Nomor</h3></div></div><div class="card-body"><div class="grid-form">' +
      '<div class="field"><label for="g-jenis">Jenis ' + esc(modul === 'dokumen' ? 'dokumen' : 'surat') + ' <span class="wajib">*</span></label><select class="select" id="g-jenis"' + (g.permohonanId ? ' disabled' : '') + '><option value="">— pilih —</option>' + js.map(function (j) { return '<option value="' + esc(j.kode) + '"' + (j.kode === g.kodeJenis ? ' selected' : '') + '>' + esc(j.nama) + ' (' + esc(j.kode) + ')</option>'; }).join('') + '</select>' + (js.length ? '' : '<div class="galat-teks">Belum ada jenis untuk modul ini. Tambahkan di Pengaturan → Jenis Surat.</div>') + '</div>' +
      '<div class="field"><label for="g-tanggal">Tanggal ' + (modul === 'beritaAcara' ? 'dokumen' : 'surat') + '</label><input class="input" type="date" id="g-tanggal" value="' + esc(g.tanggal) + '"></div>' +
      (modul === 'suratKeluar' ? '<div class="field"><label for="g-sifat">Sifat</label><select class="select" id="g-sifat">' + SIFAT.map(function (s) { return '<option' + (s === g.sifat ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' : '') +
      (modul === 'dokumen' ? '<div class="field"><label for="g-judul">Judul dokumen</label><input class="input" id="g-judul" value="' + esc(g.judul) + '" placeholder="Contoh: Sertifikat Seminar Nasional"></div><div class="field"><label for="g-emailp">Email penerima (opsional)</label><input class="input" type="email" id="g-emailp" value="' + esc(g.emailPenerima) + '"></div>' : '') +
      '<div class="penuh nomor-tetap">' + ik('hash') + '<div style="flex:1;min-width:0"><div class="overline">Nomor berikutnya (perkiraan)</div><div class="mono" id="g-nomor">' + (g.kodeJenis ? 'menghitung…' : 'pilih jenis dulu') + '</div></div><span class="badge b-netral tanpa-titik">' + ik('lock', 'sm') + ' dikunci saat terbit</span></div>' +
      '</div></div></div>' +
      '<div class="card"><div class="card-head"><div class="langkah-gen"><span class="no-langkah">2</span><h3>Isi ' + esc(modul === 'dokumen' ? 'Dokumen' : 'Surat') + '</h3></div>' + (sk.t ? '<span class="badge b-netral tanpa-titik" title="Template">' + ik('layers', 'sm') + ' ' + esc((sk.t.engine || 'docs').toUpperCase()) + ' v' + esc(sk.t.versi || 1) + '</span>' : '<span class="badge b-perbaikan tanpa-titik">tanpa template · format HTML</span>') + '</div>' +
      '<div class="card-body"><div class="grid-form" id="g-bidang">' + sk.bidang.map(function (b) { return fieldGen(b, g.isian[b.kunci]); }).join('') + '</div>' +
      (modul === 'beritaAcara' && A.cfgBool('BA_AI_AKTIF', false) ? '<div class="garis-tipis"></div><div class="antara"><div><b>' + ik('sparkles', 'sm') + ' Notulensi AI</b><div class="muted kecil">Rekam/unggah audio rapat → transkrip → ringkasan otomatis ke kolom Ringkasan.</div></div><button class="btn btn-soft btn-sm" id="g-ai">' + ik('mic', 'sm') + 'Buka</button></div>' : '') +
      '</div></div>' +
      '<div class="card"><div class="card-head"><div class="langkah-gen"><span class="no-langkah">3</span><h3>Penanda Tangan & Keabsahan</h3></div></div><div class="card-body tumpuk" style="gap:14px">' +
      sk.slot.map(function (s) {
        var pilihan = s.cara === 'tetap' ? (A.pejabatById(s.pejabatId) || {}) : null;
        return '<div class="blok-abu" style="padding:14px"><div class="antara" style="margin-bottom:8px"><b>' + esc(s.label || ('Penanda Tangan ' + s.slot)) + '</b><span class="baris" style="gap:6px">' + (s.wajibSetuju ? '<span class="badge b-ttd tanpa-titik">' + ik('key', 'sm') + ' perlu persetujuan Google + PIN</span>' : '') + '<span class="badge b-netral tanpa-titik">' + esc(s.tanda === 'qr' ? 'QR' : s.tanda === 'kosong' ? 'TTD basah' : s.tanda === 'qr+spesimen' ? 'QR + spesimen' : 'Spesimen') + '</span></span></div>' +
          (s.cara === 'tetap' ? '<div>' + esc(pilihan.nama || '(pejabat tetap belum diatur)') + ' <span class="muted kecil">· ' + esc(pilihan.jabatan || '') + '</span></div>'
            : '<select class="select" data-slot="' + s.slot + '"><option value="">' + (s.cara === 'jabatan' ? '(otomatis: ' + esc(s.jabatan || 'sesuai jabatan') + ')' : '— pilih pejabat —') + '</option>' + pj.map(function (p) { return '<option value="' + esc(p.id) + '"' + (String(g.ttd[s.slot] || '') === String(p.id) ? ' selected' : '') + '>' + esc([p.nama, p.gelar].filter(String).join(', ')) + ' — ' + esc(p.jabatan) + '</option>'; }).join('') + '</select>') + '</div>';
      }).join('') +
      '<div class="baris" style="gap:18px"><label class="saklar"><input type="checkbox" id="g-qr"' + (g.pakaiQr ? ' checked' : '') + '><span class="jalur"></span>QR verifikasi</label>' +
      (modul !== 'dokumen' ? '<label class="saklar"><input type="checkbox" id="g-spesimen"' + (g.tteAktif ? ' checked' : '') + '><span class="jalur"></span>Sisipkan spesimen TTD</label>' : '') +
      (ttePilih ? '<label class="saklar"><input type="checkbox" id="g-tte"' + (g.tteResmi ? ' checked' : '') + '><span class="jalur"></span>TTE resmi (' + esc(A.cfg('TTE_NAMA_PENYEDIA', 'PSrE')) + ')</label>' : '') +
      (modul === 'dokumen' ? '<label class="saklar"><input type="checkbox" id="g-kirim"' + (g.kirimEmail ? ' checked' : '') + '><span class="jalur"></span>Kirim ke email penerima</label>' : '') + '</div>' +
      (g.emailMasukId && modul === 'suratKeluar' ? '<div class="blok-abu" style="padding:14px"><label class="saklar"><input type="checkbox" id="g-balas"' + (g.kirimBalasan ? ' checked' : '') + '><span class="jalur"></span>Kirim PDF sebagai balasan email (thread yang sama)</label><textarea class="textarea" id="g-isibalas" style="margin-top:10px" placeholder="Pesan balasan (opsional — kosong = pesan bawaan)">' + esc(g.isiBalasan) + '</textarea></div>' : '') +
      '<div class="muted kecil">' + ik('info', 'sm') + ' Spesimen/QR bukan TTE tersertifikasi; keabsahan dibuktikan lewat halaman verifikasi.' + (A.cfgBool('TTE_AKTIF', false) ? '' : ' TTE resmi dapat diaktifkan di Integrasi.') + '</div>' +
      '</div></div>' +
      '</div><div class="panel-a4"><div class="antara" style="margin-bottom:8px"><span class="overline">Pratinjau cepat · perkiraan tata letak</span><span class="badge b-netral tanpa-titik mono">A4</span></div><div class="a4-wrap"><div class="a4" id="g-a4"></div></div></div></div>' +
      '<div class="bilah-aksi-gen">' + (beku ? '' : '<button class="btn btn-ghost" id="g-simpan" data-muat="Menyimpan…">' + ik('save', 'sm') + 'Simpan Draf</button>' +
        (pakaiDocs ? '<button class="btn btn-soft" id="g-docs" data-muat="Membuat draf…">' + ik('external', 'sm') + 'Sunting di Google Docs</button>' : '') +
        '<button class="btn btn-outline" id="g-pdf" data-muat="Merender PDF…">' + ik('eye', 'sm') + 'Pratinjau PDF</button>' +
        '<button class="btn btn-gold" id="g-terbit" data-muat="Menerbitkan…">' + ik('stamp', 'sm') + 'Terbitkan</button>') + '</div>';

    var $ = function (s) { return el.querySelector(s); };
    var kumpulkan = function () {
      g.kodeJenis = $('#g-jenis').value; g.tanggal = $('#g-tanggal').value || U.hariIni();
      if ($('#g-sifat')) g.sifat = $('#g-sifat').value;
      if ($('#g-judul')) g.judul = $('#g-judul').value.trim();
      if ($('#g-emailp')) g.emailPenerima = $('#g-emailp').value.trim();
      g.pakaiQr = $('#g-qr').checked;
      if ($('#g-spesimen')) g.tteAktif = $('#g-spesimen').checked;
      if ($('#g-tte')) g.tteResmi = $('#g-tte').checked;
      if ($('#g-kirim')) g.kirimEmail = $('#g-kirim').checked;
      if ($('#g-balas')) { g.kirimBalasan = $('#g-balas').checked; g.isiBalasan = $('#g-isibalas').value; }
      U.$$('[data-k]', el).forEach(function (i) { g.isian[i.dataset.k] = i.value; });
      U.$$('.editor-isi', el).forEach(function (ed) { g.isian[ed.id.slice(2)] = bersihHtml(ed.innerHTML); });
      U.$$('[data-daftar]', el).forEach(function (w) {
        g.isian[w.dataset.daftar] = U.$$('tbody tr', w).map(function (tr) { var o = {}; U.$$('[data-kol]', tr).forEach(function (i) { o[i.dataset.kol] = i.value; }); return o; }).filter(function (o) { return Object.keys(o).some(function (k) { return String(o[k]).trim(); }); });
      });
      U.$$('[data-slot]', el).forEach(function (s) { g.ttd[s.dataset.slot] = s.value; });
      return g;
    };
    var payload = function () {
      kumpulkan();
      var isian = {};
      sk.bidang.forEach(function (b) { if (g.isian[b.kunci] !== undefined) isian[b.kunci] = g.isian[b.kunci]; });
      Object.keys(g.isian).forEach(function (k) { if (isian[k] === undefined && /^(NAMA_PEMOHON|EMAIL_PEMOHON|TELP_PEMOHON|INSTANSI_PEMOHON|NO_REF|KEPERLUAN|PERIHAL|TUJUAN)$/.test(k)) isian[k] = g.isian[k]; });
      return { id: g.id, kodeJenis: g.kodeJenis, tanggal: g.tanggal, isian: isian,
        penandatangan: sk.slot.map(function (s) { return { slot: s.slot, pejabatId: g.ttd[s.slot] || '' }; }).filter(function (p) { return p.pejabatId; }),
        pakaiQr: g.pakaiQr, tteAktif: g.tteAktif, tteResmi: g.tteResmi, permohonanId: g.permohonanId, emailMasukId: g.emailMasukId, sifat: g.sifat,
        judul: g.judul, penerima: g.isian.NAMA_PENERIMA || g.penerima, emailPenerima: g.emailPenerima, kirimEmail: g.kirimEmail, kirimBalasan: !!(g.emailMasukId && g.kirimBalasan), isiBalasan: g.isiBalasan };
    };
    var simpanLokal = U.debounce(function () { if (beku) return; kumpulkan(); var o = {}; ['kodeJenis', 'tanggal', 'isian', 'ttd', 'pakaiQr', 'tteAktif', 'tteResmi', 'sifat', 'judul', 'penerima', 'emailPenerima', 'kirimEmail', 'kirimBalasan', 'isiBalasan', 'id', 'permohonanId', 'emailMasukId'].forEach(function (k) { o[k] = g[k]; }); o._w = Date.now(); Simpan.set(kunciLokal, o); }, 900);
    var segarA4 = U.debounce(function () { kumpulkan(); $('#g-a4').innerHTML = renderA4(g, D, sk); }, 160);
    var ubah = function () { segarA4(); simpanLokal(); };

    // nomor berikutnya
    var _nomorKey = '';
    var segarNomor = U.debounce(function () {
      var k = $('#g-jenis').value, t = $('#g-tanggal').value;
      if (!k) { $('#g-nomor').textContent = 'pilih jenis dulu'; g._nomor = ''; return; }
      if (_nomorKey === k + t && g._nomor) return;
      _nomorKey = k + t;
      API.panggil('previewNomor', { kodeJenis: k, tanggal: t }, { senyap: true }).then(function (r) { if (!document.body.contains(el)) return; g._nomor = r.success ? r.data.nomor : ''; var n = $('#g-nomor'); if (n) n.textContent = r.success ? r.data.nomor : r.message; segarA4(); });
    }, 300);

    if (!beku) {
      pasangEditor(el, ubah);
      el.addEventListener('input', ubah);
      el.addEventListener('change', function (e) {
        if (e.target.id === 'g-jenis') { kumpulkan(); tampil(wadah, g, D, kunciLokal); return; }
        if (e.target.id === 'g-tanggal') segarNomor();
        ubah();
      });
      U.$$('[data-daftar]', el).forEach(function (w) {
        var kol = (sk.bidang.filter(function (b) { return b.kunci === w.dataset.daftar; })[0] || {}).kolom || [{ kunci: 'NAMA', label: 'Nama' }];
        w.addEventListener('click', function (e) {
          if (e.target.closest('[data-tambah-baris]')) { var tb = w.querySelector('tbody'); tb.insertAdjacentHTML('beforeend', barisDaftar(kol, {}, tb.children.length)); ubah(); }
          var h = e.target.closest('[data-hapus-baris]'); if (h) { h.closest('tr').remove(); U.$$('tbody tr', w).forEach(function (tr, i) { tr.firstChild.textContent = i + 1; }); ubah(); }
        });
      });
      var pulih = $('#gen-buang'); if (pulih) pulih.addEventListener('click', function () { Simpan.del(kunciLokal); A.renderUlang(); });
      $('#g-simpan').addEventListener('click', function () {
        var b = this; var p = payload();
        if (!p.kodeJenis) { U.toast('Pilih jenis terlebih dahulu.', 'galat'); return; }
        U.sibuk(b, function () { return API.panggil('simpanRecord', { modul: g.modul, record: p }).then(function (r) { if (!U.hasil(r)) return; g.id = r.data.id; A.upsertBaris(g.modul, r.data); Simpan.del(kunciLokal); kunciLokal = 'gen_' + g.modul + '_' + g.id; history.replaceState(null, '', '#/admin/' + D.key + '/ubah?id=' + encodeURIComponent(g.id)); A.rute.q = { id: g.id }; A.rute.sub = 'ubah'; }); });
      });
      $('#g-pdf').addEventListener('click', function () {
        var b = this, p = payload();
        var salah = validasi(p, sk, el, true); if (salah) { U.toast(salah, 'galat'); return; }
        p.modul = g.modul;
        U.sibuk(b, function () { return API.panggil('pratinjauDokumen', p, { timeout: 180000 }).then(function (r) { if (!r.success) { U.toast(r.message, 'galat'); return; } A.lihatBerkas(r.data, 'Pratinjau PDF (tanpa nomor resmi)'); }); });
      });
      var bd = $('#g-docs');
      if (bd) bd.addEventListener('click', function () {
        var b = this, p = payload();
        if (!p.kodeJenis) { U.toast('Pilih jenis terlebih dahulu.', 'galat'); return; }
        var w = window.open('about:blank', '_blank');
        U.sibuk(b, function () { return API.panggil('bukaDrafDocs', Object.assign({ modul: g.modul }, p), { timeout: 180000 }).then(function (r) {
          if (!r.success) { if (w) w.close(); U.toast(r.message, 'galat'); return; }
          g.id = r.data.id; A.upsertBaris(g.modul, { id: r.data.id, status: 'DRAF', draftDocId: r.data.draftDocId, kodeJenis: p.kodeJenis });
          if (w) w.location.href = r.data.url; else window.open(r.data.url, '_blank', 'noopener');
          U.toast(r.message, 'ok', 6000);
        }); });
      });
      $('#g-terbit').addEventListener('click', function () {
        var b = this, p = payload();
        var salah = validasi(p, sk, el, false); if (salah) { U.toast(salah, 'galat'); return; }
        var perluSetuju = sk.slot.some(function (s) { return s.wajibSetuju; });
        U.konfirmasi(perluSetuju ? 'Ajukan untuk ditandatangani?' : 'Terbitkan ' + D.label + '?', perluSetuju ? 'Dokumen dikirim ke pejabat untuk persetujuan (login Google + PIN). Nomor resmi dipakai saat semua slot menyetujui.' : 'Nomor resmi akan dikunci (' + (g._nomor || 'nomor berikutnya') + '), PDF ber-QR dibuat, dan dokumen menjadi beku.', { ya: perluSetuju ? 'Ajukan' : 'Ya, Terbitkan' }).then(function (ya) {
          if (!ya) return;
          U.sibuk(b, function () {
            return API.panggil(D.terbit, p, { reqId: g.reqTerbit, timeout: 300000 }).then(function (r) {
              if (!r.success) { U.toast(r.message, 'galat'); if (r.kode === 'PERMOHONAN_TERKUNCI') g.reqTerbit = API.reqIdBaru(); return; }
              Simpan.del(kunciLokal);
              if (r.data && r.data.id) A.upsertBaris(g.modul, r.data);
              if (g.permohonanId) A.segarkan(['permohonan'], { diam: true, render: false });
              if (r.data.status === 'MENUNGGU_TTD') { U.toast(r.message, 'ok', 6000); location.hash = '#/admin/' + D.key + '?id=' + encodeURIComponent(r.data.id); return; }
              suksesTerbit(g.modul, r);
            });
          });
        });
      });
      var ai = $('#g-ai'); if (ai) ai.addEventListener('click', function () { bukaNotulensiAI(el, ubah); });
      segarNomor();
    } else {
      U.$$('input,select,textarea', el).forEach(function (i) { i.disabled = true; });
      U.$$('.editor-isi', el).forEach(function (i) { i.contentEditable = 'false'; });
    }
    $('#g-a4').innerHTML = renderA4(g, D, sk);
  }

  function validasi(p, sk, el, longgar) {
    if (!p.kodeJenis) return 'Pilih jenis terlebih dahulu.';
    var kurang = [];
    if (!longgar) sk.bidang.forEach(function (b) {
      if (!b.wajib || b.tipe === 'gambar') return;
      var v = p.isian[b.kunci];
      var kosong = b.tipe === 'daftar' ? !(v && v.length) : b.tipe === 'naskah' ? !teksPolos(v) : !String(v == null ? '' : v).trim();
      if (kosong) { kurang.push(b.label || b.kunci); var e = el.querySelector('#g-' + b.kunci); if (e) e.classList.add('salah'); }
    });
    var slotKosong = sk.slot.filter(function (s) { return s.cara !== 'tetap' && s.cara !== 'jabatan' && !p.penandatangan.some(function (x) { return Number(x.slot) === Number(s.slot); }); });
    if (slotKosong.length) kurang.push('pejabat ' + slotKosong.map(function (s) { return s.label || ('slot ' + s.slot); }).join(', '));
    return kurang.length ? 'Lengkapi: ' + kurang.join(', ') + '.' : '';
  }

  function suksesTerbit(modul, r) {
    var D = DOKM[modul], d = r.data;
    var m = U.modal({ judul: D.label + ' Terbit', ikon: ik('checkCircle'), tetap: true,
      isi: '<div class="sukses-box"><div class="cek-besar">' + ik('stamp', 'xl') + '</div><div class="noref-besar" style="font-size:17px">' + esc(d[D.nomor]) + '</div>' +
        '<p class="muted">' + esc(r.message) + '</p>' + (d.kodeVerifikasi ? '<div class="baris" style="justify-content:center;margin-top:10px"><div style="width:96px">' + U.qrSvg(urlVerif(d.kodeVerifikasi), 96) + '</div><div style="text-align:left"><div class="overline">Kode verifikasi</div><div class="mono tebal" style="font-size:18px">' + esc(d.kodeVerifikasi) + '</div></div></div>' : '') + '</div>',
      kaki: '<a class="btn btn-ghost" href="#/admin/' + D.key + '" data-ke>Ke daftar</a><a class="btn btn-soft" href="#/admin/' + D.key + '/baru" data-ke>Buat lagi</a>' + (A.tulis() ? '<button class="btn btn-soft" data-email>' + ik('send', 'sm') + 'Kirim Email</button>' : '') + '<button class="btn btn-primary" data-pdf>' + ik('eye', 'sm') + 'Lihat PDF</button>' });
    U.$$('[data-ke]', m.el).forEach(function (a) { a.addEventListener('click', function () { m.tutup(); }); });
    m.$('[data-pdf]').addEventListener('click', function () { A.bukaBerkas(d.pdfId, d[D.nomor], this); });
    var e = m.$('[data-email]'); if (e) e.addEventListener('click', function () { kirimEmailDok(modul, d); });
    history.replaceState(null, '', '#/admin/' + D.key + '?id=' + encodeURIComponent(d.id));
    A.rute.sub = ''; A.rute.q = {};
    A.state[D.key] = A.state[D.key] || {}; A.state[D.key]._qid = d.id;
    A.renderUlang();
  }

  // ---------------------------------------------------------------------------
  // Pratinjau A4 di peramban (perkiraan; PDF resmi dirender server dari template)
  // ---------------------------------------------------------------------------
  function nil(v, ph) { var s = String(v == null ? '' : v).trim(); return s ? esc(s) : '<span class="kosong-isi">' + esc(ph) + '</span>'; }
  function tglIndo(v) { return v ? U.tgl(v) : ''; }
  function renderA4(g, D, sk) {
    var I = g.isian || {}, inst = (window.Pub && Pub.inst()) || {}, j = A.jenisByKode(g.kodeJenis) || {};
    var nm = function (k, ph) { return nil(I[k], ph || ('[' + k + ']')); };
    var naskah = function (k, ph) { var h = bersihHtml(I[k] || ''); return teksPolos(h) ? h.replace(/<table(?![^>]*data-garis)/g, '<table class="tbl-naskah"') : '<p class="kosong-isi">' + esc(ph || '[' + k + ']') + '</p>'; };
    var logo = inst.logo || (window.Pub && Pub.b().logo) || '';
    var kop = '<div class="kop"><div class="lg">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') + '</div><div class="tk"><div class="y">' + esc(A.cfg('INSTITUSI_YAYASAN', '')) + '</div><div class="i">' + esc(A.cfg('INSTITUSI_NAMA', 'Nama Institusi')) + '</div><div class="al">' + esc([A.cfg('INSTITUSI_ALAMAT', ''), A.cfg('INSTITUSI_TELEPON', '') && 'Telp. ' + A.cfg('INSTITUSI_TELEPON'), A.cfg('INSTITUSI_EMAIL', ''), A.cfg('INSTITUSI_WEBSITE', '')].filter(String).join(' · ')) + '</div></div><div class="lg"></div></div>';
    var nomor = esc(g._nomor || '…/…/…/' + new Date().getFullYear());
    var badan = '';
    var kustom = sk.bidang.filter(function (b) { return ['naskah', 'gambar', 'daftar'].indexOf(b.tipe) < 0 && !/^(PERIHAL|TUJUAN|LAMPIRAN|TEMBUSAN|KEPERLUAN|SIFAT)$/.test(b.kunci); });
    var daftarTbl = function () { return sk.bidang.filter(function (b) { return b.tipe === 'daftar'; }).map(function (b) { var rows = Array.isArray(I[b.kunci]) ? I[b.kunci] : []; var kol = b.kolom || []; return '<table class="tbl-naskah"><tr><td><b>No</b></td>' + kol.map(function (k) { return '<td><b>' + esc(k.label || k.kunci) + '</b></td>'; }).join('') + '</tr>' + (rows.length ? rows : [{}]).map(function (r, i) { return '<tr><td>' + (i + 1) + '</td>' + kol.map(function (k) { return '<td>' + esc(r[k.kunci] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>'; }).join(''); };
    if (D.modulJenis === 'SK') {
      var p1 = A.pejabatById(g.ttd[1]) || {};
      badan = '<div class="judul" style="text-decoration:none">KEPUTUSAN ' + esc(String(p1.jabatan || 'PIMPINAN').toUpperCase()) + '</div><div class="nomor">NOMOR ' + nomor + '</div><div class="judul" style="text-decoration:none;margin-top:0">TENTANG</div><div class="nomor" style="font-weight:700">' + nil(String(I.TENTANG || '').toUpperCase(), '[TENTANG]') + '</div>' +
        '<p><b>Menimbang:</b></p>' + naskah('MENIMBANG') + '<p><b>Mengingat:</b></p>' + naskah('MENGINGAT') + '<div class="judul" style="text-decoration:none">MEMUTUSKAN</div><p><b>Menetapkan:</b></p>' + naskah('MENETAPKAN');
    } else if (D.modulJenis === 'BA') {
      badan = '<div class="judul">BERITA ACARA</div><div class="nomor" style="font-weight:700;margin-bottom:2px">' + nm('AGENDA') + '</div><div class="nomor">Nomor: ' + nomor + '</div>' +
        '<p>Pada hari ini, tanggal ' + nil(tglIndo(I.TANGGAL_KEGIATAN), '[tanggal kegiatan]') + ', pukul ' + nm('JAM', '[jam]') + ', bertempat di ' + nm('TEMPAT', '[tempat]') + ', telah dilaksanakan kegiatan ' + nm('AGENDA', '[agenda]') + ' yang dipimpin oleh ' + nm('PIMPINAN_RAPAT', '[pimpinan]') + ' dan dihadiri ' + nm('JUMLAH_PESERTA', '…') + ' orang peserta.</p>' +
        '<p><b>Peserta:</b> ' + nm('PESERTA', '[peserta]') + '</p><p><b>Hasil / Ringkasan:</b></p>' + naskah('RINGKASAN', '[ringkasan]') + '<p>Demikian berita acara ini dibuat dengan sebenarnya. Notulis: ' + nm('NOTULIS', '[notulis]') + '.</p>';
    } else if (D.modulJenis === 'DOKUMEN') {
      badan = '<div style="text-align:center;margin-top:18%"><div style="font-size:22px;font-weight:700;letter-spacing:.12em">' + esc(String(j.nama || 'SERTIFIKAT').toUpperCase()) + '</div><div class="nomor">Nomor: ' + nomor + '</div><div style="margin-top:12px">diberikan kepada</div><div style="font-size:18px;font-weight:700;margin:6px 0;text-decoration:underline">' + nm('NAMA_PENERIMA', '[NAMA PENERIMA]') + '</div>' +
        kustom.filter(function (b) { return b.kunci !== 'NAMA_PENERIMA'; }).map(function (b) { return '<div>' + esc(b.label) + ': ' + nm(b.kunci) + '</div>'; }).join('') + daftarTbl() + '</div>';
    } else {
      var surat = sk.t ? (sk.t.placeholder || []).indexOf('TUJUAN') >= 0 : true;
      if (surat) {
        badan = '<table class="dt" style="margin-left:0"><tr><td>Nomor</td><td>: ' + nomor + '</td></tr><tr><td>Sifat</td><td>: ' + esc(g.sifat || 'Biasa') + '</td></tr><tr><td>Lampiran</td><td>: ' + nm('LAMPIRAN', '-') + '</td></tr><tr><td>Perihal</td><td>: <b>' + nm('PERIHAL', '[perihal]') + '</b></td></tr></table>' +
          '<p style="margin-top:8px">Kepada Yth.<br><b>' + nm('TUJUAN', '[tujuan]') + '</b><br>di Tempat</p>' + naskah('ISI', '[isi surat]') +
          kustom.map(function (b) { return '<p>' + esc(b.label) + ': ' + nm(b.kunci) + '</p>'; }).join('') + daftarTbl();
      } else {
        var p0 = A.pejabatById(g.ttd[1]) || {};
        badan = '<div class="judul">' + esc(String(j.nama || 'SURAT KETERANGAN').toUpperCase()) + '</div><div class="nomor">Nomor: ' + nomor + '</div>' +
          '<p>Yang bertanda tangan di bawah ini ' + esc(p0.jabatan || '[jabatan]') + ' ' + esc(A.cfg('INSTITUSI_NAMA', '')) + ' menerangkan bahwa:</p>' +
          '<table class="dt">' + kustom.map(function (b) { return '<tr><td>' + esc(b.label) + '</td><td>: ' + (b.tipe === 'tanggal' ? nil(tglIndo(I[b.kunci]), '[' + b.kunci + ']') : nm(b.kunci)) + '</td></tr>'; }).join('') + '</table>' +
          (sk.bidang.some(function (b) { return b.kunci === 'ISI'; }) ? naskah('ISI', '') : '') + daftarTbl() +
          '<p>Surat keterangan ini dibuat untuk keperluan ' + nil(String(I.KEPERLUAN || '').replace(/[.\s]+$/, ''), '[keperluan]') + '. Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.</p>';
      }
    }
    var slots = sk.slot.slice(0, 3);
    var ttd = '<div class="ttd">' + (g.pakaiQr ? '<div class="qr">' + U.qrSvg('PRATINJAU-' + (g.kodeJenis || 'X'), 56) + 'Pindai untuk verifikasi</div>' : '<div></div>') +
      '<div class="kanan" style="' + (slots.length > 1 ? 'width:70%;display:flex;gap:10px' : '') + '">' + slots.map(function (s, i) {
        var p = (s.cara === 'tetap' ? A.pejabatById(s.pejabatId) : A.pejabatById(g.ttd[s.slot])) || {};
        return '<div style="flex:1">' + (i === 0 ? esc(A.cfg('INSTITUSI_KOTA', 'Kota')) + ', ' + esc(U.tgl(g.tanggal)) + '<br>' : '<br>') + esc(p.jabatan || s.label || 'Jabatan') + ',<div class="sp">' + (s.tanda === 'kosong' ? '' : s.tanda === 'qr' ? '<span style="font-size:7px;color:#888">[QR penanda tangan]</span>' : g.tteAktif ? '<span style="font-size:7px;color:#888">[spesimen TTD]</span>' : '') + '</div>' +
          '<div class="nm">' + nil([p.nama, p.gelar].filter(String).join(', '), '[nama pejabat]') + '</div>' + (p.nidn ? '<div>NIDN. ' + esc(p.nidn) + '</div>' : '') + '</div>';
      }).join('') + '</div></div>' +
      (I.TEMBUSAN ? '<p style="margin-top:10px;font-size:9px"><b>Tembusan:</b><br>' + esc(I.TEMBUSAN).replace(/\n/g, '<br>') + '</p>' : '');
    return kop + badan + ttd + '<div class="watermark">PRATINJAU · bukan dokumen resmi</div>';
  }

  // ---------------------------------------------------------------------------
  // Notulensi AI (Berita Acara) — hanya bila BA_AI_AKTIF
  // ---------------------------------------------------------------------------
  function bukaNotulensiAI(el, ubah) {
    var rek = null, potong = [], fileId = '';
    var m = U.modal({ judul: 'Notulensi AI', sub: 'Audio disimpan di Drive institusi; transkrip & ringkasan memakai Gemini.', ikon: ik('sparkles'), lebar: 'lebar',
      isi: '<div class="tumpuk" style="gap:12px"><div class="baris"><button class="btn btn-primary" id="ai-rek">' + ik('mic', 'sm') + 'Mulai Rekam</button><label class="btn btn-soft">' + ik('upload', 'sm') + 'Unggah audio<input type="file" id="ai-file" accept="audio/*" hidden></label><span class="muted kecil" id="ai-status">Belum ada audio.</span></div>' +
        '<div class="field"><label>Transkrip</label><textarea class="textarea" id="ai-teks" style="min-height:200px" placeholder="Transkrip muncul di sini; boleh disunting atau ditempel manual."></textarea></div></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Tutup</button><button class="btn btn-soft" id="ai-transkrip" disabled>' + ik('file', 'sm') + 'Transkripsikan</button><button class="btn btn-gold" id="ai-ringkas">' + ik('sparkles', 'sm') + 'Susun Ringkasan</button>' });
    var status = function (t) { m.$('#ai-status').textContent = t; };
    var unggah = function (blob, nama) {
      status('Mengunggah audio…');
      var fr = new FileReader();
      fr.onload = function () {
        API.panggil('simpanAudioNotulensi', { nama: nama, base64: String(fr.result).split(',')[1] }, { timeout: 180000 }).then(function (r) {
          if (!r.success) { status(r.message); return; }
          fileId = r.data.id; status('Audio tersimpan: ' + r.data.nama); m.$('#ai-transkrip').disabled = false;
        });
      };
      fr.readAsDataURL(blob);
    };
    m.$('#ai-file').addEventListener('change', function () { if (this.files[0]) unggah(this.files[0], this.files[0].name); });
    m.$('#ai-rek').addEventListener('click', function () {
      var b = this;
      if (rek) { rek.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) { U.toast('Perekaman tidak didukung peramban ini; unggah berkas audio.', 'galat'); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
        potong = []; rek = new MediaRecorder(st);
        rek.ondataavailable = function (e) { potong.push(e.data); };
        rek.onstop = function () { st.getTracks().forEach(function (t) { t.stop(); }); b.innerHTML = ik('mic', 'sm') + 'Mulai Rekam'; rek = null; unggah(new Blob(potong, { type: 'audio/webm' }), 'rapat-' + Date.now() + '.webm'); };
        rek.start(); b.innerHTML = ik('stop', 'sm') + 'Hentikan'; status('Merekam…');
      }).catch(function () { U.toast('Izin mikrofon ditolak.', 'galat'); });
    });
    m.$('#ai-transkrip').addEventListener('click', function () { var b = this; U.sibuk(b, function () { return API.panggil('transkripAudioAI', { fileId: fileId }, { timeout: 300000 }).then(function (r) { if (!r.success) { U.toast(r.message, 'galat'); return; } m.$('#ai-teks').value = r.data.transkrip; }); }); });
    m.$('#ai-ringkas').addEventListener('click', function () {
      var b = this, t = m.$('#ai-teks').value.trim();
      if (t.length < 30) { U.toast('Transkrip terlalu pendek.', 'galat'); return; }
      U.sibuk(b, function () { return API.panggil('rapikanTranskripAI', { teks: t }, { timeout: 300000 }).then(function (r) {
        if (!r.success) { U.toast(r.message, 'galat'); return; }
        var ed = el.querySelector('#g-RINGKASAN'); if (ed) { ed.innerHTML = bersihHtml(r.data.ringkasan); ubah(); }
        U.toast('Ringkasan dimasukkan ke kolom Ringkasan. Periksa kembali sebelum terbit.', 'ok'); m.tutup();
      }); });
    });
  }

  window.Surat = { DOKM: DOKM, halamanDokumen: halamanDokumen, detailDokumen: detailDokumen, Generator: Generator, formModal: formModal, laciDetail: laciDetail, meta: meta, bersihHtml: bersihHtml, editorHtml: editorHtml, pasangEditor: pasangEditor, kirimEmailDok: kirimEmailDok, urlVerif: urlVerif, inputField: inputField };
})();
