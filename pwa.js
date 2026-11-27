/* PWA: daftarkan service worker + tombol "Pasang" ke layar utama */
(function () {
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }) });
  var btn = document.getElementById('pwaBtn'); if (!btn) return;
  var standalone = function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true };
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var dp = null;
  if (standalone()) return;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); dp = e; btn.hidden = false });
  window.addEventListener('appinstalled', function () { btn.hidden = true; dp = null });
  if (ios) btn.hidden = false;
  btn.onclick = async function () {
    if (dp) { dp.prompt(); try { await dp.userChoice } catch (e) { } dp = null; btn.hidden = true; return }
    alert(ios ? 'Cara pasang di iPhone / iPad:\n1. Buka web ini di Safari.\n2. Ketuk tombol Bagikan (kotak dengan panah ke atas).\n3. Pilih "Tambah ke Layar Utama".'
      : 'Buka menu browser (titik tiga di kanan atas), lalu pilih "Instal aplikasi" atau "Tambahkan ke layar utama".');
  };
})();
