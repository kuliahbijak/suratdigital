/**
 * ui.js — pembantu tampilan: ikon SVG, toast, modal/laci, dialog konfirmasi & isian,
 * lencana status, format tanggal Indonesia, berkas (base64, kompres gambar), CSV aman,
 * pemuat skrip malas (Chart.js / Google Identity), tema terang/gelap.
 */
(function () {
  'use strict';
  var P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    stamp: '<path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13"/>',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 17V9M13 17V5M18 17v-6"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    shieldX: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m14.5 9.5-5 5M9.5 9.5l5 5"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M17 17h4v4h-4"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    building: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m18 15-6-6-6 6"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    reply: '<path d="m9 17-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    filePlus: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    play: '<path d="m6 3 14 9-14 9z"/>', stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
    sparkles: '<path d="m12 3-1.9 5.8L4 10.7l6.1 1.9L12 18.5l1.9-5.9L20 10.7l-6.1-1.9z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    listOl: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    alignLeft: '<path d="M21 6H3M15 12H3M17 18H3"/>', alignCenter: '<path d="M21 6H3M17 12H7M19 18H5"/>',
    alignRight: '<path d="M21 6H3M21 12H9M21 18H7"/>', alignJustify: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7M5 11l9 9"/>',
    wa: '<path d="M3 21l1.65-3.8A9 9 0 1 1 8.4 20.4z"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
    tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    merge: '<path d="m8 6 4-4 4 4M12 2v10.3a4 4 0 0 1-1.17 2.83L4 22M20 22l-5-5"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    signature: '<path d="M3 17c3-3 4-9 6-9s-1 9 1 9 3-5 5-5 1 4 3 4 3-2 3-2"/><path d="M3 21h18"/>',
    certificate: '<rect x="3" y="4" width="18" height="13" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M9.5 17 9 21l3-1.5 3 1.5-.5-4"/>'
  };
  function ikon(n, kelas) { return '<svg class="ikon ' + (kelas || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.info) + '</svg>'; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---------------- toast ----------------
  function toast(pesan, tipe, ms) {
    var w = document.getElementById('toast-wrap'); if (!w) return;
    var t = document.createElement('div');
    t.className = 'toast ' + (tipe || 'ok');
    t.setAttribute('role', tipe === 'galat' ? 'alert' : 'status');
    t.innerHTML = ikon(tipe === 'galat' ? 'alert' : tipe === 'info' ? 'info' : 'checkCircle') + '<div>' + esc(pesan) + '</div>';
    w.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 320); }, ms || (tipe === 'galat' ? 6000 : 3500));
  }
  function hasil(res, pesanOk) {
    if (res && res.success) { if (pesanOk !== false) toast(pesanOk || res.message || 'Berhasil.', 'ok'); return true; }
    toast((res && res.message) || 'Terjadi kesalahan.', 'galat'); return false;
  }

  // ---------------- modal & laci ----------------
  var _tumpukModal = [];
  function modal(o) {
    var root = document.getElementById('modal-root');
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="modal ' + (o.lebar || '') + ' ' + (o.kelas || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.judul) + '">' +
      '<div class="modal-head"><div style="flex:1;min-width:0">' + (o.ikon ? '<div class="baris">' + o.ikon + '<h3>' + esc(o.judul) + '</h3></div>' : '<h3>' + esc(o.judul) + '</h3>') +
      (o.sub ? '<div class="sub">' + esc(o.sub) + '</div>' : '') + '</div><button class="btn btn-ghost btn-sm btn-icon" data-tutup aria-label="Tutup">' + ikon('x') + '</button></div>' +
      (o.atas || '') + '<div class="modal-body">' + (o.isi || '') + '</div>' + (o.kaki !== undefined ? (o.kaki ? '<div class="modal-foot">' + o.kaki + '</div>' : '') : '') + '</div>';
    root.appendChild(ov);
    var el = ov.querySelector('.modal');
    var tutup = function (nilai) { if (!ov.parentNode) return; if (o.sebelumTutup && o.sebelumTutup(nilai) === false) return; ov.remove(); _tumpukModal.pop(); document.body.style.overflow = _tumpukModal.length ? 'hidden' : ''; if (o.setelahTutup) o.setelahTutup(nilai); };
    ov.addEventListener('mousedown', function (e) { if (e.target === ov && !o.tetap) tutup(); });
    el.querySelectorAll('[data-tutup]').forEach(function (b) { b.addEventListener('click', function () { tutup(); }); });
    _tumpukModal.push(tutup);
    document.body.style.overflow = 'hidden';
    var api = { el: el, tutup: tutup, $: function (s) { return el.querySelector(s); }, $$: function (s) { return Array.prototype.slice.call(el.querySelectorAll(s)); } };
    if (o.onBuka) o.onBuka(api);
    setTimeout(function () { if (el.contains(document.activeElement)) return; var f = el.querySelector('[autofocus]') || el.querySelector('.modal-body input:not([type=hidden]):not([readonly]), .modal-body textarea, .modal-body select'); if (f && window.innerWidth > 640) f.focus(); }, 30);
    return api;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && _tumpukModal.length) _tumpukModal[_tumpukModal.length - 1](); });

  function laci(o) {
    var root = document.getElementById('modal-root');
    var ov = document.createElement('div'); ov.className = 'overlay'; ov.style.justifyContent = 'flex-end'; ov.style.padding = '0';
    ov.innerHTML = '<aside class="laci" role="dialog" aria-modal="true"><div class="laci-head"><div style="flex:1;min-width:0">' + (o.kepala || '<h3>' + esc(o.judul) + '</h3>') + '</div>' +
      '<button class="btn btn-ghost btn-sm btn-icon" data-tutup aria-label="Tutup">' + ikon('x') + '</button></div><div class="laci-body">' + (o.isi || '') + '</div>' +
      (o.kaki ? '<div class="laci-foot">' + o.kaki + '</div>' : '') + '</aside>';
    root.appendChild(ov);
    var el = ov.querySelector('.laci');
    var tutup = function () { ov.remove(); _tumpukModal.pop(); document.body.style.overflow = _tumpukModal.length ? 'hidden' : ''; };
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) tutup(); });
    el.querySelectorAll('[data-tutup]').forEach(function (b) { b.addEventListener('click', tutup); });
    _tumpukModal.push(tutup); document.body.style.overflow = 'hidden';
    var api = { el: el, tutup: tutup, $: function (s) { return el.querySelector(s); }, $$: function (s) { return Array.prototype.slice.call(el.querySelectorAll(s)); } };
    if (o.onBuka) o.onBuka(api);
    return api;
  }

  function konfirmasi(judul, pesan, o) {
    o = o || {};
    return new Promise(function (ok) {
      var m = modal({ judul: judul, isi: '<p style="margin:0">' + esc(pesan) + '</p>' + (o.ekstra || ''),
        kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn ' + (o.bahaya ? 'btn-danger' : 'btn-primary') + '" data-ya>' + esc(o.ya || 'Ya, lanjutkan') + '</button>',
        setelahTutup: function (v) { ok(v === true); } });
      m.$('[data-ya]').addEventListener('click', function () { m.tutup(true); });
    });
  }

  /** Dialog isian: o = {label, min, placeholder, textarea, nilai, tipe, ya, bantu} → Promise<string|null> */
  function minta(judul, o) {
    o = o || {};
    return new Promise(function (ok) {
      var input = o.textarea ? '<textarea class="textarea" id="dlg-in" placeholder="' + esc(o.placeholder || '') + '">' + esc(o.nilai || '') + '</textarea>'
        : '<input class="input" id="dlg-in" type="' + (o.tipe || 'text') + '" value="' + esc(o.nilai || '') + '" placeholder="' + esc(o.placeholder || '') + '" autocomplete="off">';
      var m = modal({ judul: judul, sub: o.sub, isi: '<div class="field"><label for="dlg-in">' + esc(o.label || '') + '</label>' + input + (o.bantu ? '<div class="bantu">' + esc(o.bantu) + '</div>' : '') + '<div class="galat-teks" id="dlg-err"></div></div>',
        kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn ' + (o.bahaya ? 'btn-danger' : 'btn-primary') + '" data-ya>' + esc(o.ya || 'Simpan') + '</button>',
        setelahTutup: function (v) { ok(typeof v === 'string' ? v : null); } });
      var go = function () {
        var v = m.$('#dlg-in').value.trim();
        if (o.min && v.length < o.min) { m.$('#dlg-err').textContent = 'Minimal ' + o.min + ' karakter.'; m.$('#dlg-in').classList.add('salah'); return; }
        m.tutup(v);
      };
      m.$('[data-ya]').addEventListener('click', go);
      if (!o.textarea) m.$('#dlg-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  // ---------------- status & format ----------------
  var STATUS = {
    MENUNGGU: ['b-menunggu', 'Menunggu'], DIPROSES: ['b-diproses', 'Diproses'], PERLU_PERBAIKAN: ['b-perbaikan', 'Perlu Perbaikan'],
    TERBIT: ['b-terbit', 'Terbit'], DITOLAK: ['b-ditolak', 'Ditolak'], DIBATALKAN: ['b-draf', 'Dibatalkan'], DITARIK: ['b-ditolak', 'Ditarik'],
    DRAF: ['b-draf', 'Draf'], MENUNGGU_TTD: ['b-ttd', 'Menunggu TTD'], BARU: ['b-baru', 'Baru'], DIBACA: ['b-diproses', 'Dibaca'],
    DIARSIPKAN: ['b-terbit', 'Diarsipkan'], DIABAIKAN: ['b-draf', 'Diabaikan'], DICATAT: ['b-netral', 'Dicatat'], DIDISPOSISI: ['b-diproses', 'Didisposisi'],
    SELESAI: ['b-terbit', 'Selesai'], AKTIF: ['b-terbit', 'Aktif'], BERAKHIR: ['b-draf', 'Berakhir'], Antri: ['b-menunggu', 'Antri'], Terkirim: ['b-terbit', 'Terkirim'],
    Gagal: ['b-ditolak', 'Gagal'], Batal: ['b-draf', 'Batal'], Berjalan: ['b-diproses', 'Berjalan'], Selesai: ['b-terbit', 'Selesai'], Dihentikan: ['b-draf', 'Dihentikan'],
    TERKIRIM: ['b-terbit', 'Terkirim'], ANTRE: ['b-menunggu', 'Antre'], GAGAL: ['b-ditolak', 'Gagal']
  };
  function badge(s) { var x = STATUS[s] || ['b-netral', s || '-']; return '<span class="badge ' + x[0] + '">' + esc(x[1]) + '</span>'; }

  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function keTgl(v) { if (!v) return null; var s = String(v); var d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s); return isNaN(d) ? null : d; }
  function tgl(v) { var d = keTgl(v); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : (v || '-'); }
  function tglPendek(v) { var d = keTgl(v); return d ? d.getDate() + ' ' + BLN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() : (v || '-'); }
  function jam(v) { var d = keTgl(v); return d ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''; }
  function tglJam(v) { var d = keTgl(v); return d ? tglPendek(v) + ', ' + jam(v) + ' WIB' : (v || '-'); }
  function hariTgl(v) { var d = keTgl(v); return d ? HARI[d.getDay()] + ', ' + tgl(v) : '-'; }
  function relatif(v) {
    var d = keTgl(v); if (!d) return '-';
    var s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    if (s < 172800) return 'kemarin'; if (s < 604800) return Math.floor(s / 86400) + ' hari lalu'; return tglPendek(v);
  }
  function hariIni() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function angka(n) { return Number(n || 0).toLocaleString('id-ID'); }
  function ukuran(b) { b = Number(b || 0); return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function inisial(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }

  // ---------------- berkas ----------------
  function bacaBerkas(file) {
    return new Promise(function (ok, gagal) {
      var r = new FileReader();
      r.onload = function () { ok({ nama: file.name, mime: file.type, ukuran: file.size, base64: String(r.result).split(',')[1] }); };
      r.onerror = function () { gagal(new Error('Berkas tidak bisa dibaca.')); };
      r.readAsDataURL(file);
    });
  }
  function kompresGambar(file, maks, tipe) {
    return new Promise(function (ok, gagal) {
      if (/svg/.test(file.type)) { bacaBerkas(file).then(ok, gagal); return; }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, (maks || 512) / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var t = tipe || (file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png');
        var d = c.toDataURL(t, .9); URL.revokeObjectURL(url);
        ok({ nama: file.name.replace(/\.\w+$/, t === 'image/png' ? '.png' : '.jpg'), mime: t, base64: d.split(',')[1], dataUrl: d, ukuran: Math.round(d.length * .75) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('Gambar tidak valid.')); };
      img.src = url;
    });
  }
  function blobDariBase64(b64, mime) { var bin = atob(b64), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime || 'application/octet-stream' }); }
  function bukaBase64(d) { var u = URL.createObjectURL(blobDariBase64(d.base64, d.mime)); var w = window.open(u, '_blank'); if (!w) unduhBase64(d); setTimeout(function () { URL.revokeObjectURL(u); }, 120000); }
  function unduhBase64(d) { var a = document.createElement('a'); a.href = URL.createObjectURL(blobDariBase64(d.base64, d.mime)); a.download = d.nama || 'berkas'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  async function sha256Berkas(file) { var buf = await file.arrayBuffer(); var h = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }

  /** CSV aman dari injeksi rumus (=, +, -, @ di awal sel diberi awalan petik). */
  function csv(rows, kolom) {
    kolom = kolom || (rows[0] ? Object.keys(rows[0]) : []);
    var sel = function (v) { var s = String(v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v)); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    return '﻿' + [kolom.map(sel).join(',')].concat(rows.map(function (r) { return kolom.map(function (k) { return sel(r[k]); }).join(','); })).join('\r\n');
  }
  function unduhTeks(nama, isi, mime) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([isi], { type: mime || 'text/csv;charset=utf-8' })); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  function uraiCsv(teks) {
    var baris = [], sel = '', row = [], q = false;
    teks = String(teks || '').replace(/^﻿/, '');
    var pemisah = (teks.split('\n')[0].match(/;/g) || []).length > (teks.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (var i = 0; i < teks.length; i++) {
      var c = teks[i];
      if (q) { if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; } else if (c === '"') q = false; else sel += c; }
      else if (c === '"') q = true; else if (c === pemisah) { row.push(sel); sel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(sel); baris.push(row); row = []; sel = ''; }
      else sel += c;
    }
    if (sel || row.length) { row.push(sel); baris.push(row); }
    baris = baris.filter(function (r) { return r.join('').trim(); });
    if (!baris.length) return [];
    var h = baris[0].map(function (x) { return x.trim(); });
    return baris.slice(1).map(function (r) { var o = {}; h.forEach(function (k, i) { if (k) o[k] = (r[i] || '').trim(); }); return o; });
  }

  // ---------------- skrip malas ----------------
  var _skrip = {};
  function muatSkrip(url) {
    if (_skrip[url]) return _skrip[url];
    _skrip[url] = new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = url; s.async = true; s.onload = ok; s.onerror = function () { delete _skrip[url]; gagal(new Error('Gagal memuat ' + url)); }; document.head.appendChild(s); });
    return _skrip[url];
  }
  function muatChart() { return window.Chart ? Promise.resolve() : muatSkrip('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'); }

  async function sibuk(btn, fn) {
    if (!btn || btn.disabled) return;
    var asal = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + (btn.dataset.muat ? esc(btn.dataset.muat) : '');
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = asal; }
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 300); }; }
  function salin(teks) {
    var ok = function () { toast('Disalin ke papan klip.', 'ok', 1800); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(teks).then(ok, function () {});
    var t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) {} t.remove();
  }
  function qrSvg(teks, ukuranPx) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode(0, 'M'); q.addData(String(teks)); q.make();
    return q.createSvgTag({ cellSize: Math.max(2, Math.floor((ukuranPx || 120) / (q.getModuleCount() + 4))), margin: 2, scalable: true });
  }
  function kosong(pesan, ik) { return '<div class="kosong">' + ikon(ik || 'inbox') + '<div>' + esc(pesan || 'Belum ada data.') + '</div></div>'; }
  function skel(n, tinggi) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="skel" style="height:' + (tinggi || 64) + 'px;margin-bottom:10px"></div>'; return s; }

  // ---------------- tema ----------------
  function terapkanTema(mode) {
    var gelap = mode === 'gelap' || (mode !== 'terang' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', gelap ? 'dark' : 'light');
  }
  function setTema(mode) { Simpan.set('tema', mode); terapkanTema(mode); }
  function warnaBrand(utama, aksen) {
    var r = document.documentElement.style;
    if (/^#[0-9a-f]{6}$/i.test(utama || '') && document.documentElement.getAttribute('data-theme') !== 'dark') { r.setProperty('--primary', utama); r.setProperty('--sidebar', gelapkan(utama, .25)); r.setProperty('--sidebar-active', terangkan(utama, .08)); }
    else { r.removeProperty('--primary'); r.removeProperty('--sidebar'); r.removeProperty('--sidebar-active'); }
    if (/^#[0-9a-f]{6}$/i.test(aksen || '')) r.setProperty('--accent', aksen); else r.removeProperty('--accent');
  }
  function geser(hex, f) { var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (x) { return Math.max(0, Math.min(255, Math.round(f(x)))); }); return '#' + c.map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function gelapkan(h, a) { return geser(h, function (x) { return x * (1 - a); }); }
  function terangkan(h, a) { return geser(h, function (x) { return x + (255 - x) * a; }); }

  window.UI = { ikon: ikon, esc: esc, $: $, $$: $$, toast: toast, hasil: hasil, modal: modal, laci: laci, konfirmasi: konfirmasi, minta: minta, badge: badge, STATUS: STATUS,
    tgl: tgl, tglPendek: tglPendek, tglJam: tglJam, jam: jam, hariTgl: hariTgl, relatif: relatif, hariIni: hariIni, angka: angka, ukuran: ukuran, inisial: inisial, keTgl: keTgl, BLN: BLN,
    bacaBerkas: bacaBerkas, kompresGambar: kompresGambar, bukaBase64: bukaBase64, unduhBase64: unduhBase64, blobDariBase64: blobDariBase64, sha256Berkas: sha256Berkas,
    csv: csv, unduhTeks: unduhTeks, uraiCsv: uraiCsv, muatSkrip: muatSkrip, muatChart: muatChart, sibuk: sibuk, debounce: debounce, salin: salin, qrSvg: qrSvg,
    kosong: kosong, skel: skel, setTema: setTema, terapkanTema: terapkanTema, warnaBrand: warnaBrand };
})();
