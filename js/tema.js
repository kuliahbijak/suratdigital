/* tema.js — diterapkan sebelum render pertama (tanpa kedip), dimuat sinkron di <head>. */
(function () { try { var t = JSON.parse(localStorage.getItem('sd_tema') || '"otomatis"'); var g = t === 'gelap' || (t !== 'terang' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.setAttribute('data-theme', g ? 'dark' : 'light'); } catch (e) {} })();
