/**
 * api.js — klien REST ke Google Apps Script (fetch POST text/plain, tanpa preflight CORS).
 *  • Batas waktu (AbortController); baca & aksi idempoten diulang otomatis maks. 2× saat jaringan gagal
 *  • reqId untuk aksi idempoten (sinyal putus tidak menggandakan data)
 *  • Dedupe baca yang sedang berjalan + epoch tulis (skill turbo §4.2)
 *  • Penggabung batch otomatis: beberapa baca di tik yang sama → 1 eksekusi (§4.3)
 *  • drain antrean notifikasi 400 ms setelah respons ber-nq (§4.6), warmup server (§4.7)
 *  • Perf.table() / Perf.summary() di Console
 */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var GAS_URL = String(CFG.GAS_URL || '');

  // ---------------- penyimpanan lokal aman ----------------
  var Simpan = {
    get: function (k, def) { try { var v = localStorage.getItem('sd_' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem('sd_' + k, JSON.stringify(v)); return true; } catch (e) { try { Simpan.bersihkanSnap(); localStorage.setItem('sd_' + k, JSON.stringify(v)); return true; } catch (e2) { return false; } } },
    del: function (k) { try { localStorage.removeItem('sd_' + k); } catch (e) {} },
    bersihkanSnap: function () { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sd_snap_') === 0 || k.indexOf('sd_c_') === 0) localStorage.removeItem(k); }); } catch (e) {} }
  };

  function perangkatId() {
    var id = Simpan.get('perangkat');
    if (!id) { id = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36); Simpan.set('perangkat', id); }
    return id;
  }

  // ---------------- sesi ----------------
  var Sesi = {
    data: Simpan.get('sesi', null),
    token: function () { return Sesi.data && Sesi.data.token; },
    user: function () { return Sesi.data && Sesi.data.user; },
    aktif: function () { return !!(Sesi.data && Sesi.data.token && Sesi.data.exp > Date.now()); },
    set: function (d) { Sesi.data = d; Simpan.set('sesi', d); },
    hapus: function () { Sesi.data = null; Simpan.del('sesi'); }
  };

  // ---------------- pengukur ----------------
  var Perf = {
    log: [],
    catat: function (o) { Perf.log.push(o); if (Perf.log.length > 300) Perf.log.shift(); },
    table: function () { console.table(Perf.log.map(function (x) { return { aksi: x.aksi, total_ms: x.total, server_ms: x.server, jaringan_ms: x.total - (x.server || 0), batch: x.batch || '', ulang: x.ulang || 0, ok: x.ok }; })); },
    summary: function () {
      var g = {};
      Perf.log.forEach(function (x) { var k = x.aksi; g[k] = g[k] || { aksi: k, n: 0, total: 0, server: 0 }; g[k].n++; g[k].total += x.total; g[k].server += x.server || 0; });
      console.table(Object.keys(g).map(function (k) { var x = g[k]; return { aksi: k, panggilan: x.n, rata_total_ms: Math.round(x.total / x.n), rata_server_ms: Math.round(x.server / x.n) }; }));
    }
  };
  window.Perf = Perf;

  var IDEMPOTEN = { permohonanAjukan: 1, permohonanPerbaiki: 1, terbitkanSuratKeluar: 1, terbitkanSK: 1, terbitkanBeritaAcara: 1, terbitkanDokumen: 1, simpanRecord: 1,
    bukaDrafDocs: 1, permohonanProses: 1, emailBalas: 1, emailArsipkan: 1, waBlastBuat: 1, deMassalBuat: 1, ttdSetujui: 1, ttdBypass: 1 };
  var BACA = { ping: 1, bootstrapPublik: 1, infoLogin: 1, permohonanLacak: 1, verifikasiDokumen: 1, bootstrapAdmin: 1, refreshModul: 1, getRecord: 1, getLog: 1,
    previewNomor: 1, permohonanList: 1, permohonanDetail: 1, permohonanIsiGenerator: 1, emailList: 1, hitungDashboard: 1, dataLaporan: 1, notifConfig: 1, notifAntrean: 1,
    waAudiens: 1, waBlastList: 1, crmList: 1, crmStats: 1, crmDetail: 1, crmDuplikat: 1, ttdAntrean: 1, deMassalStatus: 1, statusKeamanan: 1, validateSession: 1 };
  var LAMA = { terbitkanSuratKeluar: 1, terbitkanSK: 1, terbitkanBeritaAcara: 1, terbitkanDokumen: 1, pratinjauDokumen: 1, bukaDrafDocs: 1, emailTarikSekarang: 1,
    migrasiInfo: 1, migrasiJalankan: 1, deMassalProses: 1, waBlastProses: 1, notifProsesSekarang: 1, ttdSetujui: 1, ttdBypass: 1, ttdPratinjau: 1,
    hubungkanTemplateDoc: 1, pindaiTemplateDoc: 1, siapkanTemplateDoc: 1, buatUlangTemplateDoc: 1, transkripAudioAI: 1, rapikanTranskripAI: 1, backupManual: 1,
    permohonanAjukan: 1, permohonanPerbaiki: 1, emailBalas: 1, emailArsipkan: 1, crmSync: 1, waValidasi: 1, uploadBerkas: 1, lampirkanScan: 1, ambilBerkasBase64: 1, emailDetail: 1 };
  var KODE_SESI = { NO_SESSION: 1, SESSION_EXPIRED: 1, SESSION_IDLE: 1 };

  var _inflight = {}, _epochTulis = 0, _berjalan = 0;
  function barSinkron(naik) {
    _berjalan = Math.max(0, _berjalan + naik);
    var b = document.getElementById('bar-sinkron');
    if (b) b.classList.toggle('aktif', _berjalan > 0);
  }

  function reqIdBaru() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

  function konfigurasiSiap() { return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(GAS_URL) && !/GANTI|XXXX/.test(GAS_URL); }

  async function kirim(action, data, opts) {
    opts = opts || {};
    if (!konfigurasiSiap() && !opts.url) return { success: false, kode: 'CONFIG', message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec Apps Script.' };
    var body = { action: action, data: data || {}, perangkatId: perangkatId() };
    var tok = opts.tanpaToken ? null : Sesi.token();
    if (tok) body.token = tok;
    if (opts.diam) body.diam = true;
    if (IDEMPOTEN[action]) body.reqId = opts.reqId || reqIdBaru();
    var bolehUlang = BACA[action] || IDEMPOTEN[action];
    var batas = opts.timeout || (LAMA[action] ? 300000 : 45000);
    var t0 = performance.now(), percobaan = 0, terakhir;
    if (!opts.senyap) barSinkron(1);
    try {
      while (percobaan <= (bolehUlang ? 2 : 0)) {
        var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, batas);
        try {
          var r = await fetch(opts.url || GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow' });
          clearTimeout(timer);
          var teks = await r.text(), res;
          try { res = JSON.parse(teks); }
          catch (e) { res = { success: false, kode: 'BUKAN_JSON', message: 'Server membalas HTTP ' + r.status + ' (bukan JSON). Pastikan URL berakhiran /exec, akses deployment "Anyone", dan sudah New version.' }; }
          Perf.catat({ aksi: action, total: Math.round(performance.now() - t0), server: res.ms, ok: !!res.success, ulang: percobaan, batch: action === 'batch' ? (data.calls || []).map(function (c) { return c.action; }).join('+') : '' });
          if (res.nq > 0) API.jadwalkanDrain();
          if (!res.success && KODE_SESI[res.kode] && tok && API.onSesiHabis) API.onSesiHabis(res.kode, res.message);
          return res;
        } catch (err) {
          clearTimeout(timer);
          terakhir = err;
          percobaan++;
          if (!bolehUlang || percobaan > 2) break;
          await new Promise(function (ok) { setTimeout(ok, 600 * percobaan); });
        }
      }
      var habis = terakhir && terakhir.name === 'AbortError';
      return { success: false, kode: habis ? 'TIMEOUT' : 'JARINGAN', message: habis ? 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
    } finally { if (!opts.senyap) barSinkron(-1); }
  }

  /** Panggilan utama: baca identik di-dedupe; tulis menaikkan epoch (baca sesudahnya tidak menumpang). */
  function panggil(action, data, opts) {
    if (!BACA[action]) { _epochTulis++; return kirim(action, data, opts); }
    var k = _epochTulis + '|' + action + '|' + (Sesi.token() || '') + '|' + JSON.stringify(data || {}) + '|' + !!(opts && opts.diam);
    if (_inflight[k]) return _inflight[k];
    var p = kirim(action, data, opts);
    _inflight[k] = p;
    p.then(function () { delete _inflight[k]; }, function () { delete _inflight[k]; });
    return p;
  }

  // ---------------- penggabung batch (aksi baca di tik yang sama → 1 eksekusi) ----------------
  var Batcher = {
    q: null, opts: null,
    add: function (action, data, opts) {
      var self = this;
      return new Promise(function (res) {
        if (!self.q) { self.q = []; self.opts = opts || {}; setTimeout(function () { self.flush(); }, 0); }
        self.q.push({ action: action, data: data || {}, res: res });
      });
    },
    flush: function () {
      var q = this.q, opts = this.opts; this.q = null; this.opts = null;
      if (!q || !q.length) return;
      var unik = [], peta = {};
      q.forEach(function (it) { var k = it.action + '|' + JSON.stringify(it.data); if (!peta[k]) { peta[k] = []; unik.push(it); } peta[k].push(it); });
      var bagi = [];
      for (var i = 0; i < unik.length; i += 10) bagi.push(unik.slice(i, i + 10));
      bagi.forEach(function (grup) {
        if (grup.length === 1) {
          var g = grup[0];
          panggil(g.action, g.data, opts).then(function (r) { peta[g.action + '|' + JSON.stringify(g.data)].forEach(function (x) { x.res(r); }); });
          return;
        }
        panggil('batch', { calls: grup.map(function (g) { return { action: g.action, data: g.data }; }) }, opts).then(function (r) {
          grup.forEach(function (g, idx) {
            var hasil = r.success ? r.data.results[idx] : r;
            if (r.success && hasil && hasil.success === false && KODE_SESI[hasil.kode] && API.onSesiHabis) API.onSesiHabis(hasil.kode, hasil.message);
            peta[g.action + '|' + JSON.stringify(g.data)].forEach(function (x) { x.res(hasil); });
          });
        });
      });
    }
  };

  // ---------------- drain & warmup ----------------
  var _drainTimer = null, _drainUlang = 0;
  function jadwalkanDrain() {
    clearTimeout(_drainTimer);
    _drainTimer = setTimeout(function () {
      kirim('drain', {}, { senyap: true, tanpaToken: true }).then(function (r) {
        if (r && r.success && r.data && r.data.left > 0 && _drainUlang < 3) { _drainUlang++; jadwalkanDrain(); } else _drainUlang = 0;
      });
    }, 400);
  }

  function warmUp(scope) {
    if (!konfigurasiSiap()) return;
    var k = 'warm_' + scope;
    try { if (Number(sessionStorage.getItem(k) || 0) > Date.now() - 240000) return; sessionStorage.setItem(k, String(Date.now())); } catch (e) {}
    try { fetch(GAS_URL + '?w=' + encodeURIComponent(scope), { mode: 'no-cors' }).catch(function () {}); } catch (e) {}
  }

  var API = {
    panggil: panggil, q: function (a, d, o) { return Batcher.add(a, d, o); }, kirim: kirim,
    jadwalkanDrain: jadwalkanDrain, warmUp: warmUp, konfigurasiSiap: konfigurasiSiap, reqIdBaru: reqIdBaru,
    onSesiHabis: null, gasUrl: function () { return GAS_URL; }
  };
  window.API = API; window.Sesi = Sesi; window.Simpan = Simpan; window.perangkatId = perangkatId;
})();
