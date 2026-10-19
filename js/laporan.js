/**
 * laporan.js — Laporan & Rekap per periode (rekap modul, per jenis surat, waktu layanan
 * permohonan & tanggap email, tabel rinci + ekspor CSV + cetak) dan Log Aktivitas (Super Admin).
 */
(function () {
  'use strict';
  var U = window.UI, esc = U.esc, ik = U.ikon, A = window.Admin;
  var MOD = [['suratMasuk', 'Surat Masuk', 'inbox'], ['suratKeluar', 'Surat Keluar', 'send'], ['sk', 'Surat Keputusan', 'stamp'], ['beritaAcara', 'Berita Acara', 'clipboard'], ['dokumen', 'Dokumen', 'certificate'], ['mou', 'MOU', 'handshake'], ['arsip', 'Arsip', 'archive'], ['permohonan', 'Permohonan', 'filePlus']];
  var _cache = {}, _grafik = null;

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function preset(p) {
    var n = new Date();
    if (p === 'bulan') return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(n)];
    if (p === 'bulanLalu') return [iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), iso(new Date(n.getFullYear(), n.getMonth(), 0))];
    if (p === '30') return [iso(new Date(n.getTime() - 29 * 86400000)), iso(n)];
    if (p === 'semester') return [iso(new Date(n.getFullYear(), n.getMonth() < 6 ? 0 : 6, 1)), iso(n)];
    return [iso(new Date(n.getFullYear(), 0, 1)), iso(n)];
  }
  function jamTeks(j) { if (j === null || j === undefined) return '-'; return j < 1 ? Math.round(j * 60) + ' menit' : j < 48 ? (Math.round(j * 10) / 10) + ' jam' : (Math.round(j / 24 * 10) / 10) + ' hari'; }

  A.daftar('laporan', {
    judul: 'Laporan & Rekap',
    render: function (el, ctx) {
      var st = ctx.state;
      if (!st.dari) { var p = preset('tahun'); st.dari = p[0]; st.sampai = p[1]; st.preset = 'tahun'; st.tab = 'suratMasuk'; }
      var kunci = st.dari + '_' + st.sampai, d = _cache[kunci];
      el.innerHTML = '<div class="lap-root">' + A.kepala({ overline: 'Laporan', judul: 'Laporan & Rekap Persuratan', desk: 'Rekapitulasi per periode untuk pelaporan pimpinan & akreditasi. Ekspor CSV aman dari injeksi rumus.',
        aksi: '<button class="btn btn-soft" id="lp-cetak">' + ik('printer', 'sm') + 'Cetak</button>' }) +
        '<div class="card card-pad no-print" style="margin-bottom:16px"><div class="baris" style="align-items:flex-end"><div class="seg" id="lp-preset">' + [['bulan', 'Bulan ini'], ['bulanLalu', 'Bulan lalu'], ['30', '30 hari'], ['semester', 'Semester'], ['tahun', 'Tahun ini']].map(function (x) { return '<button data-p="' + x[0] + '" class="' + (st.preset === x[0] ? 'aktif' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="field"><label>Dari</label><input class="input" type="date" id="lp-dari" value="' + esc(st.dari) + '"></div><div class="field"><label>Sampai</label><input class="input" type="date" id="lp-sampai" value="' + esc(st.sampai) + '"></div>' +
        '<button class="btn btn-primary" id="lp-muat" data-muat="Menghitung…">' + ik('chart', 'sm') + 'Tampilkan</button></div></div>' +
        '<div id="lp-isi">' + (d ? '' : U.skel(4, 100)) + '</div></div>';
      var R = el.querySelector('.lap-root');
      var muat = function (btn) {
        st.dari = R.querySelector('#lp-dari').value; st.sampai = R.querySelector('#lp-sampai').value;
        if (st.dari > st.sampai) { U.toast('Tanggal awal setelah tanggal akhir.', 'galat'); return; }
        var k = st.dari + '_' + st.sampai;
        var jalan = function () { return API.panggil('dataLaporan', { dari: st.dari, sampai: st.sampai }, { timeout: 120000 }).then(function (r) { if (!r.success) { U.toast(r.message, 'galat'); return; } _cache[k] = r.data; if (document.body.contains(R)) gambar(R.querySelector('#lp-isi'), r.data, st); }); };
        return btn ? U.sibuk(btn, jalan) : jalan();
      };
      U.$$('#lp-preset button', R).forEach(function (b) { b.addEventListener('click', function () { var p = preset(b.dataset.p); st.preset = b.dataset.p; R.querySelector('#lp-dari').value = p[0]; R.querySelector('#lp-sampai').value = p[1]; U.$$('#lp-preset button', R).forEach(function (x) { x.classList.toggle('aktif', x === b); }); muat(); }); });
      ['#lp-dari', '#lp-sampai'].forEach(function (s) { R.querySelector(s).addEventListener('change', function () { st.preset = ''; U.$$('#lp-preset button', R).forEach(function (x) { x.classList.remove('aktif'); }); }); });
      R.querySelector('#lp-muat').addEventListener('click', function () { muat(this); });
      R.querySelector('#lp-cetak').addEventListener('click', function () { window.print(); });
      if (d) gambar(R.querySelector('#lp-isi'), d, st);
      muat();
    }
  });

  function gambar(box, d, st) {
    var rk = d.rekap || {};
    var perJenis = Object.keys(d.perJenis || {}).map(function (k) { return { k: k, n: d.perJenis[k] }; }).sort(function (a, b) { return b.n - a.n; });
    var tab = st.tab || 'suratMasuk', baris = (d.baris || {})[tab] || [];
    var kolom = baris[0] ? Object.keys(baris[0]).filter(function (k) { return k !== 'id'; }) : [];
    box.innerHTML = '<div class="card card-pad" style="margin-bottom:16px"><div class="antara"><div><div class="overline">' + esc(d.institusi || '') + '</div><b style="font-size:17px">Periode ' + esc(U.tgl(d.dari)) + ' – ' + esc(U.tgl(d.sampai)) + '</b></div><span class="mono kecil muted">dihitung ' + esc(U.tglJam(d.dibuat)) + '</span></div></div>' +
      '<div class="grid-kpi empat">' + MOD.map(function (m) { var x = rk[m[0]] || { total: 0, status: {} }; return '<div class="kpi"><div class="judul"><span>' + esc(m[1]) + '</span>' + ik(m[2], 'sm') + '</div><div class="angka">' + U.angka(x.total) + '</div><div class="ket">' + Object.keys(x.status).map(function (s) { return esc((U.STATUS[s] || [0, s])[1]) + ' ' + x.status[s]; }).join(' · ') + '</div></div>'; }).join('') + '</div>' +
      '<div class="grid-2" style="margin-bottom:18px"><div class="card"><div class="card-head"><h3>Surat Keluar per Jenis</h3></div><div class="card-body">' + (perJenis.length ? '<div class="wadah-grafik" style="height:' + Math.max(160, perJenis.length * 36) + 'px"><canvas id="lp-grafik"></canvas></div>' : U.kosong('Tidak ada surat keluar pada periode ini.', 'send')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Kinerja Layanan</h3></div><div class="card-body tumpuk" style="gap:14px">' +
      '<div class="blok-abu antara"><div><div class="overline">Rata-rata waktu layanan permohonan</div><div class="muted kecil">dari diajukan hingga surat terbit · ' + U.angka(d.waktuLayanan.n) + ' permohonan</div></div><b style="font-size:22px">' + esc(jamTeks(d.waktuLayanan.rataJam)) + '</b></div>' +
      '<div class="blok-abu antara"><div><div class="overline">Rata-rata waktu tanggap email</div><div class="muted kecil">email masuk hingga dibalas/diarsipkan · ' + U.angka(d.waktuTanggapEmail.n) + ' email</div></div><b style="font-size:22px">' + esc(jamTeks(d.waktuTanggapEmail.rataJam)) + '</b></div></div></div></div>' +
      '<div class="card"><div class="card-head no-print" style="flex-wrap:wrap"><div class="tab-baris" style="margin:0;border:0" id="lp-tab">' + MOD.map(function (m) { return '<button data-t="' + m[0] + '" class="' + (m[0] === tab ? 'aktif' : '') + '">' + esc(m[1]) + ' <span class="badge b-netral tanpa-titik">' + ((rk[m[0]] || {}).total || 0) + '</span></button>'; }).join('') + '</div>' +
      '<button class="btn btn-soft btn-sm" id="lp-csv">' + ik('download', 'sm') + 'CSV</button></div>' +
      (baris.length ? '<div class="tabel-wrap"><table class="tabel responsif"><thead><tr>' + kolom.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + baris.slice(0, 500).map(function (r) { return '<tr>' + kolom.map(function (k) { var v = r[k]; return '<td data-l="' + esc(k) + '"' + (/nomor|kode|noRef/i.test(k) ? ' class="mono"' : '') + '>' + (k === 'status' ? U.badge(v) : esc(/^(tanggal|dibuat|tanggalTerima|tanggalMulai|tanggalBerakhir)/.test(k) ? U.tglPendek(v) : v == null || v === '' ? '-' : v)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' + (baris.length > 500 ? '<div class="muted kecil" style="padding:10px 14px">Menampilkan 500 dari ' + baris.length + ' baris; unduh CSV untuk semuanya.</div>' : '') : U.kosong('Tidak ada data pada periode ini.', 'inbox')) + '</div>';
    U.$$('#lp-tab button', box).forEach(function (b) { b.addEventListener('click', function () { st.tab = b.dataset.t; gambar(box, d, st); }); });
    box.querySelector('#lp-csv').addEventListener('click', function () { U.unduhTeks('laporan-' + tab + '-' + d.dari + '_' + d.sampai + '.csv', U.csv(baris)); });
    var cv = box.querySelector('#lp-grafik');
    if (cv) U.muatChart().then(function () {
      if (!document.body.contains(cv)) return;
      if (_grafik) { try { _grafik.destroy(); } catch (e) {} }
      var cs = getComputedStyle(document.documentElement);
      _grafik = new Chart(cv, { type: 'bar', data: { labels: perJenis.map(function (x) { return x.k; }), datasets: [{ data: perJenis.map(function (x) { return x.n; }), backgroundColor: cs.getPropertyValue('--primary').trim(), borderRadius: 6, maxBarThickness: 26 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 200 }, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0, color: cs.getPropertyValue('--muted').trim() }, grid: { color: cs.getPropertyValue('--border').trim() } }, y: { ticks: { color: cs.getPropertyValue('--ink-2').trim() }, grid: { display: false } } } } });
    }).catch(function () {});
  }

  // ===========================================================================
  // LOG AKTIVITAS (Super Admin)
  // ===========================================================================
  A.daftar('log', {
    judul: 'Log Aktivitas', tanpaRenderUlang: true,
    render: function (el, ctx) {
      var st = ctx.state;
      el.innerHTML = '<div class="log-root">' + A.kepala({ overline: 'Audit', judul: 'Log Aktivitas', desk: 'Jejak siapa melakukan apa dan kapan. Rahasia (token, sandi, PIN) tidak pernah dicatat.',
        aksi: '<button class="btn btn-soft" id="lg-csv">' + ik('download', 'sm') + 'CSV</button><button class="btn btn-ghost btn-icon" id="lg-segar" aria-label="Segarkan">' + ik('refresh') + '</button>' }) +
        '<div class="bilah-alat"><div class="cari">' + ik('search') + '<input class="input" id="lg-cari" placeholder="Cari email, aksi, modul, detail…" value="' + esc(st.cari || '') + '"></div><select class="select" id="lg-n" style="width:auto">' + [300, 1000, 2000].map(function (n) { return '<option' + (Number(st.n || 300) === n ? ' selected' : '') + ' value="' + n + '">' + n + ' terakhir</option>'; }).join('') + '</select></div><div id="lg-isi">' + U.skel(6, 44) + '</div></div>';
      var R = el.querySelector('.log-root'), rows = [];
      var gambar = function () {
        var q = String(st.cari || '').toLowerCase();
        var t = q ? rows.filter(function (r) { return JSON.stringify(r).toLowerCase().indexOf(q) >= 0; }) : rows;
        R.querySelector('#lg-isi').innerHTML = A.tabel({ rows: t.slice(0, 500), klik: false, kosong: 'Tidak ada log.', kolom: [
          { l: 'Waktu', f: function (r) { return '<span class="mono kecil">' + esc(U.tglJam(r.waktu)) + '</span>'; } },
          { l: 'Pengguna', f: function (r) { return esc(r.nama || '') + '<div class="mono kecil muted">' + esc(r.email || '') + '</div>'; } },
          { l: 'Peran', f: function (r) { return '<span class="badge b-netral tanpa-titik">' + esc(r.peran || '') + '</span>'; } },
          { l: 'Aksi', f: function (r) { return '<span class="mono kecil tebal">' + esc(r.aksi) + '</span>'; } }, { l: 'Modul', k: 'modul' },
          { l: 'Detail', f: function (r) { return '<span class="kecil">' + esc(String(r.detail || '').slice(0, 220)) + '</span>'; } }] });
      };
      var muat = function () { return API.panggil('getLog', { n: Number(st.n || 300) }).then(function (r) { if (!r.success) { U.toast(r.message, 'galat'); return; } rows = r.data.rows; if (document.body.contains(R)) gambar(); }); };
      R.querySelector('#lg-cari').addEventListener('input', U.debounce(function () { st.cari = this.value; gambar(); }, 200));
      R.querySelector('#lg-n').addEventListener('change', function () { st.n = this.value; muat(); });
      R.querySelector('#lg-segar').addEventListener('click', function () { U.sibuk(this, muat); });
      R.querySelector('#lg-csv').addEventListener('click', function () { U.unduhTeks('log-aktivitas-' + U.hariIni() + '.csv', U.csv(rows, ['waktu', 'nama', 'email', 'peran', 'aksi', 'modul', 'detail'])); });
      muat();
    }
  });
})();
