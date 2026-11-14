const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const SRC = ['Kode A', 'Kode B', 'Aling', 'Kode AG', 'Kode BG'];
const TAHAP_MAX = 10;
const thLbl = n => n ? 'Tahap ' + n : '-';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sw = (c, n) => c ? `<span class="sw" title="${esc(n || '')}" style="background:${c}"></span>` : '-';
const p2 = n => String(n).padStart(2, '0');
const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) };
const hm = t => p2(new Date(t).getHours()) + ':' + p2(new Date(t).getMinutes());
const fmt = t => new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const tm = t => '<div class="tm">' + hm(t) + '</div>'; // jam di bawah tanggal
const tsFmt = t => ymd(t).split('-').reverse().join('-') + ' ' + hm(t); // 31-10-2026 14:05 (untuk export)
const dtv = (s, end) => s ? new Date(s).getTime() + (end ? 59999 : 0) : null; // nilai input datetime-local -> timestamp
const T24 = /^([01]\d|2[0-3]):[0-5]\d$/; // jam 24 jam HH:MM
const dtVal = (id, end) => { // gabungan kolom tanggal (id+'D') dan jam 24 jam (id+'T') -> 'YYYY-MM-DDTHH:MM'
  const d = $(id + 'D').value; if (!d) return '';
  const t = $(id + 'T').value.trim();
  return d + 'T' + (T24.test(t) ? t : end ? '23:59' : '00:00');
};
function time24(el) { // kolom jam selalu format 24 jam (00:00 - 23:59), tidak tergantung pengaturan browser
  el.addEventListener('input', () => { const d = el.value.replace(/\D/g, '').slice(0, 4); el.value = d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d });
  el.addEventListener('blur', () => {
    const d = el.value.replace(/\D/g, ''); if (!d) { el.value = ''; return }
    const h = Math.min(+(d.length <= 2 ? d : d.slice(0, 2)), 23), m = Math.min(+(d.length <= 2 ? '0' : d.slice(2, 4).padEnd(2, '0')), 59);
    el.value = p2(h) + ':' + p2(m); el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const fDT = s => s ? s.split('T')[0].split('-').reverse().join('-') + ' ' + (s.split('T')[1] || '') : '';
const normName = s => String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toUpperCase();
function caps(el) { // kolom selalu HURUF KAPITAL
  el.style.textTransform = 'uppercase';
  el.addEventListener('input', () => { const s = el.selectionStart; el.value = el.value.toUpperCase(); try { el.setSelectionRange(s, s) } catch (e) { } });
}
const dayWIB = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const dayLbl = d => HARI[new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).getUTCDay()] + ', ' + (+d.slice(8, 10)) + ' ' + BLN[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4);
// kelompokkan per tanggal (terbaru di atas) menjadi panah harian di dalam bulan
const dayBlocks = (list, dayFn, pre, isOpen, dflt, tblFn) => { const o = {}; list.forEach(r => { const d = dayFn(r.ts); (o[d] = o[d] || []).push(r) });
  return Object.keys(o).sort().reverse().map(d => { const k = pre + d; return `<details class="dy" data-k="${k}" ${isOpen(k, dflt(d)) ? 'open' : ''}><summary>${dayLbl(d)} <span class="tag">${o[d].length} data</span></summary>${tblFn(o[d])}</details>` }).join('') };
const stat = (a, m) => a === m ? '<b class="okc">✓</b>' : '<b class="badc">✕</b>';
const msg = (id, t, ok) => { const m = $(id); m.textContent = t; m.className = 'msg' + (ok ? ' ok' : '') };

/* ---------- helper ringkasan & total (dipakai di semua menu) ---------- */
const NF = n => Number(n || 0).toLocaleString('id-ID');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const stag = (l, v, c) => `<span class="tag${c ? ' ' + c : ''}">${l}: <b>${v}</b></span>`;
const sumBar = a => '<div class="gdsum">' + a.filter(Boolean).join('') + '</div>';
const uniq = a => new Set(a).size;
const countBy = (a, f) => { const m = {}; a.forEach(x => { const k = f(x) || '-'; m[k] = (m[k] || 0) + 1 }); return m };
const cTags = (m, pre) => Object.keys(m).sort().map(k => stag((pre || '') + esc(k), NF(m[k])));
const sumK2 = (a, f) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
// penerimaan purchase menyimpan jumlah kumulatif per pengajuan: untuk total ambil yang terbesar per pengajuan agar tidak dihitung ganda
const latestRec = list => { const m = {}, loose = []; list.forEach(r => { if (r.rid) { const o = m[r.rid]; if (!o || (Number(r.ada) || 0) > (Number(o.ada) || 0) || ((Number(r.ada) || 0) === (Number(o.ada) || 0) && r.ts > o.ts)) m[r.rid] = r } else loose.push(r) }); return Object.values(m).concat(loose) };
const sumPg = L => sumBar([stag('Total data', NF(L.length)), stag('Total item', NF(sumK2(L, r => r.min)) + ' pcs')]);
const pgFoot = () => '', puFoot = () => '';
const sumPu = rows => sumBar([stag('Total data', NF(rows.length)), stag('Total item', NF(sumK2(latestRec(rows), r => r.ada)) + ' pcs')]);
const sumDl = L => sumBar([stag('Total data', NF(L.length))]);
const sumRw = L => sumBar([stag('Total data', NF(L.length))]);
const sumBd = L => sumBar([stag('Total data', NF(L.length))]);
const sumIn = rs => sumBar([stag('Total data', NF(rs.length)), stag('Total item', NF(sumK2(rs, r => r.min)) + ' pcs')]);
const pdSum = L => sumBar([stag('Total data', NF(L.length)), stag('Total item', NF(sumK2(L, p => (p.variants || []).length)) + ' varian')]);
const stSum = (G, L) => sumBar([stag('Total data', NF(G.length)), stag('Total item', NF(sumK2(L, g => g.qty)) + ' pcs')]);

/* ---------- penyimpanan: Firebase (sinkron semua perangkat) atau lokal ---------- */
// Isi dengan config Firebase Anda agar data tersinkron di semua perangkat (HP, tablet, PC).
// Biarkan null untuk mode lokal (data hanya tersimpan di browser ini).
// Contoh: const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };
const FIREBASE_PROJECTS = {
  lama: {
    apiKey: "AIzaSyCkY5k8tAa4a6s6Sh8zEzhiZU0GgQ4zFSM",
    authDomain: "purchase-eko.firebaseapp.com",
    projectId: "purchase-eko",
    storageBucket: "purchase-eko.firebasestorage.app",
    messagingSenderId: "306713086751",
    appId: "1:306713086751:web:3aad1af4d0dbd89f727e2a"
  },
  baru: {
    apiKey: "AIzaSyDvTTnOG_1OeyQom8F5omqY2RhkFHn5a0U",
    authDomain: "purchase-eko-2.firebaseapp.com",
    projectId: "purchase-eko-2",
    storageBucket: "purchase-eko-2.firebasestorage.app",
    messagingSenderId: "1040272792195",
    appId: "1:1040272792195:web:eb29be8c86e0517f7299b6"
  }
};
// project aktif disimpan per perangkat; bawaan: BARU
const PROJ = (() => { try { const p = localStorage.getItem('pp_proj'); return FIREBASE_PROJECTS[p] ? p : 'baru' } catch (e) { return 'baru' } })();
const FIREBASE_CONFIG = FIREBASE_PROJECTS[PROJ];
const SESS = 'pp_session_' + PROJ; // sesi login dipisah per project

let db = null, products = [], reqs = [], records = [], downloads = [], hlog = [], returns = [], rgoods = [], pstock = [], photos = {}, admins = [], me = null; // me: {username, name} atau null (tamu)
const sk = k => k === 'pp_session' ? SESS : k; // sesi login terpisah per project
const store = {
  get(k, d) { try { const v = localStorage.getItem(sk(k)); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(sk(k), JSON.stringify(v)); return true } catch (e) { return false } }
};
function setSync(s) {
  const e = $('#sync'); e.className = 'sync ' + s;
  e.querySelector('span').textContent = { ok: 'Tersinkron', err: 'Gagal sinkron', loc: 'Mode lokal', wait: 'Menunggu server...' }[s];
}
function loadLocal() {
  products = store.get('pp_products', null) || [
    { id: 'p1', name: 'Kaos Polos', variants: [{ n: 'Biru', c: '#3b82f6' }, { n: 'Merah', c: '#ef4444' }, { n: 'Hitam', c: '#1f2937' }] },
    { id: 'p2', name: 'Tas Kanvas', variants: [] }
  ];
  reqs = store.get('pp_requests', []); records = store.get('pp_records', []); photos = store.get('pp_photos', {});
  admins = Object.values(store.get('pp_admins', {})); downloads = store.get('pp_downloads', []); hlog = store.get('pp_hlog', []); returns = store.get('pp_returns', []); rgoods = store.get('pp_rgoods', []); pstock = store.get('pp_pstock', []); rolesCfg = store.get('pp_roles', null);
  [['requests', reqs], ['records', records], ['downloads', downloads], ['hlog', hlog], ['returns', returns], ['rgoods', rgoods], ['pstock', pstock], ['admins', admins]].forEach(([c, a]) => fixAdm(c, a, true));
}
// ---- nama admin diseragamkan: HURUF KAPITAL
const UN = t => String(t == null ? '' : t).trim().replace(/\s+/g, ' ').toUpperCase();
const UC = t => String(t == null ? '' : t).trim().toUpperCase();
let admFixN = 0; const fixSent = new Set();
function fixAdm(c, arr, cache) { // data lama berhuruf kecil ikut dikapitalkan; ditulis balik ke server hanya jika data bukan dari cache
  const key = c === 'admins' ? 'name' : 'adm', ch = [];
  arr.forEach(d => { if (d[key] && d[key] !== UN(d[key])) { d[key] = UN(d[key]); const k = c + ':' + (d.id || d.username); if (!fixSent.has(k)) { fixSent.add(k); ch.push([c, 'set', d]) } } });
  admFixN += ch.length;
  if (ch.length && db && !cache) setTimeout(() => commit(ch), 0);
  return arr;
}
// ops: [['koleksi','set',objek] | ['koleksi','del',id]]
function commit(ops = []) {
  if (!db) {
    const used = new Set(records.map(r => r.pid).concat(...hlog.map(h => h.pids || [])));
    Object.keys(photos).forEach(k => { if (!used.has(k)) delete photos[k] });
    const ok = store.set('pp_products', products) && store.set('pp_requests', reqs) && store.set('pp_records', records) && store.set('pp_photos', photos) && store.set('pp_downloads', downloads) && store.set('pp_hlog', hlog) && store.set('pp_returns', returns) && store.set('pp_rgoods', rgoods) && store.set('pp_pstock', pstock) && store.set('pp_roles', rolesCfg);
    if (!ok) loadLocal();
    return ok;
  }
  for (let i = 0; i < ops.length; i += 300) {
    const b = db.batch();
    ops.slice(i, i + 300).forEach(([c, k, v]) => {
      const ref = db.collection(c).doc(k === 'del' ? v : v[c === 'admins' ? 'username' : 'id']);
      k === 'del' ? b.delete(ref) : b.set(ref, v);
    });
    const t = setTimeout(() => failSync({ message: 'tidak ada respon dari server, data belum terkirim' }), 12000);
    b.commit().then(() => { clearTimeout(t); setSync('ok') }).catch(e => { clearTimeout(t); failSync(e) });
  }
  return true;
}
let failShown = false;
const isQuota = e => /resource-exhausted/.test((e && e.code) || '') || /quota/i.test((e && e.message) || '');
const QUOTA_MSG = 'KUOTA GRATIS FIREBASE HABIS. Paket Spark hanya mengizinkan 50.000 pembacaan & 20.000 penulisan per hari. Selama kuota habis, data tidak bisa dibaca/disimpan di server. Kuota pulih otomatis tiap hari sekitar pukul 15.00 WIB. Agar tidak terulang: upgrade ke paket Blaze (tetap gratis selama di bawah kuota, tapi tidak terblokir) di Firebase Console > Usage and billing.';
let persistOK = false; // true jika cache lokal Firestore aktif: data yang belum terkirim tetap aman di perangkat
// Cek langsung ke server Firestore lewat REST (tanpa SDK). SDK Firebase diam-diam mengulang koneksi saat kuota habis / jaringan bermasalah,
// jadi tanpa cek ini penyebab sebenarnya tidak pernah terlihat.
async function probeServer() {
  const c = FIREBASE_CONFIG; if (!c) return { k: 'none' };
  try {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 10000);
    const r = await fetch('https://firestore.googleapis.com/v1/projects/' + c.projectId + '/databases/(default)/documents/_diag/ping?key=' + encodeURIComponent(c.apiKey), { signal: ctl.signal });
    clearTimeout(tm);
    if (r.ok) return { k: 'ok' };
    const j = await r.json().catch(() => ({})), er = j.error || {}, st = String(er.status || r.status), m = er.message || '';
    if (st === 'NOT_FOUND' && /^document/i.test(m)) return { k: 'ok' }; // "Document ... not found" = dokumen tes belum ada, berarti server terjangkau; "The database ... does not exist" = database belum dibuat
    return { k: st, m };
  } catch (x) { return { k: 'net' } }
}
function whyText(p) {
  const k = p.k, m = p.m ? '\n(Pesan server: ' + p.m + ')' : '';
  if (k === 'RESOURCE_EXHAUSTED' || k === '429') return 'PENYEBAB: ' + QUOTA_MSG;
  if (k === 'PERMISSION_DENIED' || k === '403') return 'PENYEBAB: Firebase menolak akses. Buka Firestore Database > Rules, isi allow read, write: if true; lalu klik Publish. Jika Rules sudah benar, cek pembatasan API key di Google Cloud Console.' + m;
  if (k === 'NOT_FOUND' || k === '404') return 'PENYEBAB: Firestore Database belum dibuat atau Database ID bukan "(default)". Buat database di Firebase Console > Firestore Database.' + m;
  if (k === 'net') return 'PENYEBAB: perangkat ini tidak bisa menjangkau server Firebase. Periksa internet, VPN, ad-blocker, atau jaringan kantor yang memblokir firestore.googleapis.com.';
  if (k === 'ok') return 'Server Firebase dapat dijangkau dan kuota masih normal, tetapi koneksi realtime tertahan (jaringan lambat/diblokir). Tunggu beberapa detik; jika status tidak berubah jadi "Tersinkron", coba ganti jaringan (Wi-Fi/data seluler) atau nonaktifkan ad-blocker, lalu refresh.';
  return 'Status server: ' + k + m;
}
async function failSync(e) {
  setSync('err');
  if (failShown) return; failShown = true; setTimeout(() => failShown = false, 20000);
  const c = (e && e.code) || '';
  let why;
  if (isQuota(e)) why = 'PENYEBAB: ' + QUOTA_MSG;
  else if (c.includes('permission')) why = whyText({ k: 'PERMISSION_DENIED' });
  else why = whyText(await probeServer());
  alert('Data GAGAL tersinkron.\n\n' + why + (persistOK ? '\n\nData yang sudah Anda input tetap tersimpan di perangkat ini dan akan terkirim otomatis begitu server bisa dihubungi.' : ''));
}
const hint = e => {
  const c = (e && e.code) || '';
  if (isQuota(e)) return QUOTA_MSG;
  if (c.includes('permission')) return 'Penyebab: Rules Firestore menolak. Buka Firestore Database > Rules, isi allow read, write: if true; lalu klik Publish.';
  return 'Penyebab paling umum: (1) Firestore Database belum dibuat, atau dibuat dengan Database ID selain "(default)", atau dengan edisi "Enterprise" (pilih edisi Standard); (2) koneksi ke Firebase diblokir ad-blocker/VPN/jaringan kantor; (3) Rules belum di-Publish.';
};
async function diagnose() {
  if (!db) return alert('MODE LOKAL: config Firebase tidak terbaca atau library Firebase gagal dimuat (perlu internet). Data hanya tersimpan di browser ini.');
  setSync('wait');
  try {
    const ref = db.collection('_diag').doc('ping');
    await Promise.race([ref.set({ t: Date.now() }), new Promise((_, no) => setTimeout(() => no({ code: 'timeout', message: 'server tidak merespon dalam 10 detik' }), 10000))]);
    await ref.get({ source: 'server' });
    // (tidak lagi membaca seluruh koleksi dari server: itu memakai ribuan kuota baca setiap kali tombol ini diklik)
    setSync('ok');
    alert('BERHASIL: koneksi ke server Firebase normal.\n\nData di layar aplikasi:\n- Produk: ' + products.length + '\n- Pengajuan: ' + reqs.length + '\n- Purchase: ' + records.length);
  } catch (e) {
    setSync('err');
    const why = isQuota(e) || (e.code || '').includes('permission') ? hint(e) : whyText(await probeServer());
    alert('GAGAL' + (e.code && e.code !== 'timeout' ? ' (' + e.code + ')' : '') + ': ' + (e.message || e) + '\n\n' + why);
  }
}
$('#sync').onclick = diagnose; $('#sync').title = 'Klik untuk tes koneksi Firebase';
$('#projBtn').textContent = '🗄️ Data ' + (PROJ === 'lama' ? 'LAMA' : 'BARU');
$('#projBtn').title = 'Klik untuk pindah ke data ' + (PROJ === 'lama' ? 'BARU' : 'LAMA');
$('#projBtn').onclick = () => {
  const to = PROJ === 'lama' ? 'baru' : 'lama';
  if (!confirm('Pindah ke data ' + to.toUpperCase() + '? Halaman akan dimuat ulang. Data di kedua project tetap aman dan tidak ada yang dihapus.')) return;
  try { localStorage.setItem('pp_proj', to) } catch (e) {}
  location.reload();
};
function refresh() {
  fillAdm(); renderReqs(); renderProducts(); renderAuto();
  if ($('#pr').classList.contains('on')) { renderStock(); brLists(normName($('#usName').value)) }
  if ($('#gd').classList.contains('on')) renderGd();
  if (!$('#gdmdl').hidden) renderGdDetail();
  if ($('#br').classList.contains('on')) { brLists(); renderBr() }
  if ($('#pu').classList.contains('on')) renderTable();
  if ($('#dl').classList.contains('on')) renderDl();
  if ($('#ow').classList.contains('on') && !(owTab === 'role' && roleDirty)) renderOw();
  if ($('#rw').classList.contains('on')) renderRw();
  if ($('#bd').classList.contains('on')) renderBd();
  renderNotif();
}
function startSync() {
  if (!FIREBASE_CONFIG || !window.firebase) { loadLocal(); setSync('loc'); refresh(); return }
  try {
    firebase.initializeApp(FIREBASE_CONFIG); db = firebase.firestore(); db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); setSync('wait');
    // cache lokal (IndexedDB): saat halaman dibuka ulang, data yang tidak berubah dibaca dari perangkat, bukan dari server -> hemat kuota baca
    try { db.enablePersistence({ synchronizeTabs: true }).then(() => persistOK = true).catch(() => {}) } catch (e) {}
    const on = (c, fn) => db.collection(c).onSnapshot(s => { try { fn(s.docs.map(d => d.data()), s.metadata.fromCache) } catch (e) { console.error(c, e) } setSync(s.metadata.fromCache || s.metadata.hasPendingWrites ? 'wait' : 'ok'); refresh() }, e => failSync(e));
    on('products', a => products = a.sort((x, y) => String(x.name || '').localeCompare(String(y.name || ''))));
    on('requests', (a, fc) => reqs = fixAdm('requests', a, fc).sort((x, y) => y.ts - x.ts));
    on('records', (a, fc) => records = fixAdm('records', a, fc).sort((x, y) => y.ts - x.ts));
    // foto TIDAK lagi dibaca semua sekaligus (satu dokumen foto besar & banyak); diambil satu per satu saat dilihat/diedit (lihat photoLoad)
    db.collection('admins').onSnapshot(sn => { // dokumen akun harus ber-ID username; salinan berID acak (sisa bug) dihapus otomatis
      try {
        if (!sn.metadata.fromCache && me && me.username && !sn.docs.some(d => d.id === me.username)) forceLogout('Akses akun ini telah dihapus oleh pemilik.'); // akun yang dihapus langsung dikeluarkan
        const docs = sn.docs.map(d => ({ id: d.id, data: d.data() })), have = new Set(docs.map(x => x.id));
        const dup = docs.filter(x => x.data.username && x.id !== x.data.username && have.has(x.data.username));
        if (dup.length && !sn.metadata.fromCache) setTimeout(() => commit(dup.map(x => ['admins', 'del', x.id])), 0);
        admins = fixAdm('admins', docs.filter(x => !dup.includes(x)).map(x => x.data), sn.metadata.fromCache); syncMe();
        if (!sn.metadata.fromCache) ensureSuper();
      } catch (e) { console.error('admins', e) }
      setSync(sn.metadata.fromCache || sn.metadata.hasPendingWrites ? 'wait' : 'ok'); refresh();
    }, e => failSync(e));
    on('returns', (a, fc) => returns = fixAdm('returns', a, fc).sort((x, y) => y.ts - x.ts));
    on('rgoods', (a, fc) => rgoods = fixAdm('rgoods', a, fc).sort((x, y) => y.ts - x.ts));
    on('pstock', (a, fc) => pstock = fixAdm('pstock', a, fc).sort((x, y) => y.ts - x.ts));
    on('settings', a => { rolesCfg = a.find(x => x.id === 'roles') || null; const w = a.find(x => x.id === 'wa'); if (w && Array.isArray(w.nums)) { waNums = w.nums; store.set('pp_wa', waNums) } applyRole() });
    on('downloads', (a, fc) => downloads = fixAdm('downloads', a, fc).sort((x, y) => y.ts - x.ts));
    on('hlog', (a, fc) => hlog = fixAdm('hlog', a, fc).sort((x, y) => y.ts - x.ts));
  } catch (e) { db = null; loadLocal(); setSync('err'); refresh() }
}

/* ---------- menu & hamburger ---------- */
const TT = { pg: ['Pengajuan', 'Hari ini tampil di atas; hari sebelumnya masuk riwayat per bulan (ganti hari pukul 00.00 WIB)'], in: ['Input Barang Masuk', 'Catat barang yang diterima berdasarkan pengajuan'], pu: ['Purchase', 'Riwayat penerimaan barang'], rt: ['Input Retur', 'Form retur / pengembalian barang'], bd: ['Laporan Retur', 'Hasil input retur marketplace, bisa diedit'], rw: ['Riwayat', 'Riwayat edit & hapus; data lama bisa dipulihkan'], ow: ['Dashboard Khusus', 'Kontrol admin & analisa pemasaran (khusus pemilik)'], dl: ['Download', 'Riwayat export Excel / PDF, bisa difilter dan diexport gabungan'], pr: ['Database Produk', 'Stok produk (Purchase, Barang Retur, upload manual / massal); kelola produk dan varian warna'], gd: ['Barang Gudang', 'Cek barang retur / cancel yang tersedia sebelum mengajukan lagi'], br: ['Barang Retur', 'Input barang retur; otomatis masuk ke Barang Gudang'] };
function go(t) {
  if (!can(t)) { t = firstPage(); if (!t) return }
  $$('nav button[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  $$('.ng').forEach(g => { g.classList.remove('open'); g.firstElementChild.classList.toggle('on', g.dataset.p.split(',').includes(t)) });
  $$('.sec').forEach(s => s.classList.toggle('on', s.id === t));
  $('#nav').classList.remove('open'); $('#pt').textContent = TT[t][0]; $('#ps').textContent = TT[t][1];
  if (t === 'pu') renderTable();
  if (t === 'dl') renderDl();
  if (t === 'ow') renderOw();
  if (t === 'rw') renderRw();
  if (t === 'bd') renderBd();
  if (t === 'pr') { renderStock(); brLists(normName($('#usName').value)) }
  if (t === 'gd') renderGd();
  if (t === 'br') { brLists(); renderBr() }
  if (t === 'pg') renderReqs();
  if (t === 'in') refreshBlocks();
}
$$('nav button[data-t]').forEach(b => b.onclick = () => go(b.dataset.t));
$$('.ng > button').forEach(b => b.onclick = e => { e.stopPropagation(); const g = b.parentElement, was = g.classList.contains('open'); $$('.ng').forEach(x => x.classList.remove('open')); g.classList.toggle('open', !was) });
$('#burger').onclick = e => { e.stopPropagation(); $('#nav').classList.toggle('open') };
document.addEventListener('click', e => { if (!e.target.closest('#nav')) $('#nav').classList.remove('open'); if (!e.target.closest('.ng')) $$('.ng').forEach(g => g.classList.remove('open')) });
$$('select[data-th]').forEach(s => { // dropdown Tahap 1 - Tahap 10
  s.innerHTML = `<option value="">${s.dataset.th}</option>` + Array.from({ length: TAHAP_MAX }, (_, i) => `<option value="${i + 1}">Tahap ${i + 1}</option>`).join('');
});
$$('select[data-src]').forEach(s => {
  s.innerHTML = `<option value="">${s.dataset.src}</option>` + SRC.map(x => `<option>${x}</option>`).join('');
});
// pembatasan data per admin: hanya Owner & Retur yang boleh melihat data semua admin; role lain hanya melihat data miliknya sendiri
const seeAll = () => { const r = roleName(); return r === 'Owner' || r === 'Retur' };
const mine = x => seeAll() || (x.adm || '') === (me ? me.name : '');
const admF = id => roleName() === 'Owner' ? $(id).value : ''; // filter Nama Admin hanya berlaku untuk Owner
function fillAdm() { // daftar nama admin = akun terdaftar + nama yang sudah tercatat di data (non-Owner/Retur: hanya namanya sendiri)
  const names = seeAll() ? [...new Set(admins.map(a => a.name).concat(reqs.map(r => r.adm), records.map(r => r.adm), downloads.map(r => r.adm), hlog.map(r => r.adm), returns.map(r => r.adm), rgoods.map(r => r.adm)).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : (me && me.name ? [me.name] : []);
  $$('.ownadm').forEach(w => w.hidden = roleName() !== 'Owner');
  $$('select[data-adm]').forEach(s => {
    const v = s.value;
    s.innerHTML = `<option value="">${s.dataset.adm}</option>` + names.map(x => `<option>${esc(x)}</option>`).join('');
    s.value = v;
  });
}
/* ---------- tombol x (hapus teks) pada kolom pencarian ---------- */
function addClear(inp) {
  const w = document.createElement('span'); w.className = 'clrw';
  inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'clrx'; b.textContent = '×'; b.hidden = !inp.value;
  b.setAttribute('aria-label', 'Hapus teks'); w.appendChild(b);
  const upd = inp._upd = () => { b.hidden = !inp.value };
  inp.addEventListener('input', upd);
  b.onclick = () => { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus() };
  return upd;
}

/* ---------- komponen: pencarian produk ---------- */
function psearch(box, opts, onPick, onText) { // onText: aktifkan mode ketik produk baru (HURUF KAPITAL)
  box.classList.add('pop');
  box.innerHTML = '<input placeholder="Cari produk..." autocomplete="off"><div class="list sug"></div>';
  const i = box.querySelector('input'), l = box.querySelector('.sug'), upd = addClear(i);
  const show = () => {
    const q = i.value.trim().toLowerCase();
    const m = opts().filter(p => p.name.toLowerCase().includes(q));
    l.innerHTML = m.length ? m.map(p => `<div data-id="${p.id}">${esc(p.name)}</div>`).join('') : '<em>' + (onText ? 'Tidak ditemukan. Produk baru akan ditambahkan saat disimpan.' : 'Produk tidak ditemukan') + '</em>';
    l.classList.add('open');
  };
  let pick = null;
  if (onText) { i.style.textTransform = 'uppercase'; i.placeholder = 'Cari / ketik nama produk...' }
  i.oninput = () => {
    if (onText) { const s = i.selectionStart; i.value = i.value.toUpperCase(); i.setSelectionRange(s, s) }
    pick = null; onPick(null); if (onText) onText(i.value.trim()); show();
  };
  i.onfocus = show;
  i.enterKeyHint = 'next';
  l.addEventListener('mousedown', e => e.preventDefault()); // memilih saran tidak menghilangkan fokus
  i.addEventListener('blur', () => setTimeout(() => l.classList.remove('open'), 150)); // daftar tertutup saat pindah kolom
  i.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault(); l.classList.remove('open');
    const nx = box.dataset.next && $(box.dataset.next);
    nx && !nx.closest('[hidden]') ? nx.focus() : i.blur();
  });
  l.onclick = e => {
    const id = e.target.dataset.id; if (!id) return;
    pick = opts().find(x => String(x.id) === id);
    i.value = pick.name; upd(); l.classList.remove('open'); onPick(pick);
  };
  document.addEventListener('click', e => { if (!box.contains(e.target)) l.classList.remove('open') });
  return { get: () => pick, text: () => i.value.trim(), set(v) { i.value = v; upd(); pick = null }, reset() { i.value = ''; upd(); pick = null; onPick(null) } };
}

/* ---------- PENGAJUAN ---------- */
let pgProd = null, pgVar = null;
let pgNew = false, pgAdd = false;
const pgSearch = psearch($('#pgSearch'), () => products, p => { pgProd = p; pgVar = null; pgAdd = false; pgNewUI(); pgVarUI() }, t => {
  const p = products.find(x => normName(x.name) === normName(t));
  pgProd = p || null; pgVar = null; pgAdd = false; pgNewUI(); pgVarUI();
});
$('#pgSearch').dataset.next = '#pgVarName';
function pgNewUI() { // isian warna manual: untuk produk baru, atau varian baru pada produk yang sudah ada
  if (!pgProd) pgAdd = false;
  pgNew = (!pgProd && pgSearch.text() !== '') || (!!pgProd && (pgAdd || !pgProd.variants.length)); // warna wajib: produk tanpa varian harus isi warna
  $('#pgNew').hidden = !pgNew; $('#pgVarWrap').hidden = pgNew;
  $('#pgToggle').hidden = !pgProd || !pgProd.variants.length; $('#pgToggle').textContent = pgAdd ? 'Pilih dari daftar warna' : '+ Warna baru';
}
$('#pgToggle').onclick = () => { pgAdd = !pgAdd; pgVar = null; pgNewUI(); pgVarUI() };
$('#pgVarName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#pgMin').focus() } });
$('#pgVarName').oninput = e => {
  const s = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(s, s);
  const c = toHex(e.target.value); if (c) $('#pgVarCol').value = c; // MERAH -> warna merah otomatis
};
function pgVarUI() {
  const b = $('#pgVar'), L = $('#pgVarList'), s = b.querySelector('.sw');
  L.classList.remove('open');
  if (pgVar) { s.style.cssText = `background:${pgVar.c}`; $('#pgVarTxt').textContent = '' }
  else {
    s.style.cssText = 'background:transparent;border-style:dashed';
    $('#pgVarTxt').textContent = pgProd && !pgProd.variants.length ? 'Tidak ada varian' : 'Pilih warna';
  }
  if (pgProd && pgProd.variants.length) {
    b.disabled = false;
    L.innerHTML = pgProd.variants.map((v, i) => `<span class="sw" data-i="${i}" title="${esc(v.n)}" style="background:${v.c}"></span>`).join('');
  } else { b.disabled = true; L.innerHTML = '' }
  gdHint();
}
$('#pgVar').onclick = () => $('#pgVarList').classList.toggle('open');
$('#pgVarList').onclick = e => {
  const i = e.target.dataset.i; if (i === undefined) return;
  pgVar = pgProd.variants[i]; pgVarUI();
};
document.addEventListener('click', e => { if (!e.target.closest('#pgVar,#pgVarList')) $('#pgVarList').classList.remove('open') });

$('#pgSubmit').onclick = () => {
  const typed = normName(pgSearch.text());
  let prod = pgProd, vr = pgVar;
  if (!prod && !typed) return msg('#pgMsg', 'Pilih produk dari hasil pencarian atau ketik nama produk baru.');
  if (prod && prod.variants.length && !pgAdd && !vr) return msg('#pgMsg', 'Warna wajib diisi. Pilih varian warna.');
  const m = parseInt($('#pgMin').value, 10), src = $('#pgSrc').value, adm = me ? me.name : ''; // nama admin otomatis dari akun yang login (tamu: kosong)
  if (!(m >= 1)) return msg('#pgMsg', 'Isi jumlah barang diminta (angka).');
  if (!src) return msg('#pgMsg', 'Pilih asal barang.');
  const th = parseInt($('#pgTh').value, 10);
  if (!(th >= 1 && th <= TAHAP_MAX)) return msg('#pgMsg', 'Pilih tahap pengajuan (wajib).');
  if (!tahapOk(th, adm, dayWIB(Date.now()))) return msg('#pgMsg', tahapErr(th));
  const ops = []; let np = null, nvAdded = null;
  if (!prod) { // produk baru: langsung masuk ke database produk
    np = prod = { id: uid(), name: typed, variants: [] }; products.push(np);
  }
  if (pgNew) { // warna diketik: pakai varian yang sama jika sudah ada, kalau belum tambahkan ke produk yang sama
    const vt = normName($('#pgVarName').value);
    if (!vt) { if (np) products.pop(); return msg('#pgMsg', 'Warna wajib diisi. Ketik nama warna, mis. MERAH.') }
    vr = prod.variants.find(v => normName(v.n) === vt);
    if (!vr) { vr = { n: vt, c: $('#pgVarCol').value }; prod.variants.push(vr); nvAdded = vt }
  }
  if (np || nvAdded) ops.push(['products', 'set', prod]);
  const vn = vr ? vr.n : '', vc = vr ? vr.c : '';
  // produk + warna + asal yang sama (hari ini) digabung, jumlah diminta dijumlahkan
  const ex = np ? null : todayReqs().find(r => String(r.pid) === String(prod.id) && r.vn === vn && r.vc === vc && r.src === src && (r.adm || '') === adm && (r.tahap || 0) === th);
  const now = Date.now();
  if (ex) {
    ex.hist = reqHist(ex).concat({ ts: now, n: m }); // catat jam input tambahan
    ex.min += m; ops.push(['requests', 'set', ex]);
    records.filter(x => x.rid === ex.id).forEach(x => { x.min = ex.min; ops.push(['records', 'set', x]) });
  } else {
    const q = { id: uid(), ts: now, pid: prod.id, prod: prod.name, vn, vc, min: m, ada: 0, src, adm, tahap: th, hist: [{ ts: now, n: m }] };
    reqs.unshift(q); ops.push(['requests', 'set', q]);
  }
  if (!commit(ops)) return msg('#pgMsg', 'Penyimpanan penuh.');
  pgSearch.reset(); $('#pgMin').value = ''; $('#pgSrc').value = ''; $('#pgVarName').value = ''; $('#pgVarCol').value = '#4a7bd0';
  msg('#pgMsg', ex ? 'Digabung dengan pengajuan yang sama. Total diminta: ' + ex.min + ' pcs.'
    : np ? 'Produk baru "' + np.name + '" masuk ke database produk, pengajuan tersimpan.'
    : nvAdded ? 'Varian "' + nvAdded + '" ditambahkan ke produk ' + prod.name + ', pengajuan tersimpan.' : 'Pengajuan tersimpan.', true);
  renderReqs(); renderProducts();
};
const tahapOk = (n, adm, day, selfId) => n <= 1 || reqs.some(x => x.id !== selfId && (x.adm || '') === (adm || '') && dayWIB(x.ts) === day && x.tahap === n - 1);
const tahapErr = n => 'Tahap ' + n + ' ditolak: belum ada pengajuan Tahap ' + (n - 1) + ' hari ini. Ajukan Tahap ' + (n - 1) + ' dulu (Tahap 1 boleh langsung, dan Tahap yang sama boleh diajukan berulang).';
const todayReqs = () => reqs.filter(r => mine(r) && dayWIB(r.ts) === dayWIB(Date.now()));
const openHist = {}; // id pengajuan -> daftar jam input sedang dibuka
const histLab = (r, x) => ymd(x.ts) === ymd(r.ts) ? hm(x.ts) : tsFmt(x.ts);
const histBtn = r => { const h = reqHist(r); return h.length > 1 ? `<button type="button" class="arw${openHist[r.id] ? ' on' : ''}" data-hist="${r.id}" title="Lihat jam input">${h.length}×</button>` : '' };
const histRow = r => {
  const h = reqHist(r); if (h.length < 2) return '';
  return `<tr class="hrow" data-for="${r.id}"${openHist[r.id] ? '' : ' hidden'}><td></td><td colspan="9"><table class="mt"><thead><tr><th>Produk</th><th>Varian</th><th>Ada / Diajukan</th><th>Waktu input</th><th></th></tr></thead><tbody>`
    + reqEntries(r).map(x => `<tr><td>${esc(r.prod)}</td><td>${r.vc ? sw(r.vc, r.vn) + ' ' : ''}${esc(r.vn || '-')}</td><td>${x.a} / ${x.n} pcs</td><td>${tsFmt(x.ts)}</td><td class="nw"><button class="btn ghost sm" data-hedit="${r.id}" data-ts="${x.ts}">Edit</button> <button class="btn ghost sm" data-hdel="${r.id}" data-ts="${x.ts}">Hapus</button></td></tr>`).join('') + '</tbody></table></td></tr>';
};
const pgRow = (r, n) => `<tr>
    <td>${n + 1}</td><td>${fmt(r.ts)}${tm(r.ts)}${histBtn(r)}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${r.ada} / ${r.min} pcs${r.part ? '<div class="tm">sesuai filter · total ' + r.tot + ' pcs</div>' : ''}</td><td><span class="tag">${esc(r.src)}</span></td><td>${thLbl(r.tahap)}</td><td>${esc(r.adm || '-')}</td>
    <td>${reqStat(r)}</td>
    <td class="nw"><button class="btn ghost sm" data-redit="${r.id}">Edit</button> <button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>${histRow(r)}`;
const pgTbl = list => { // satu hari -> grup per tahap + asal barang; tiap grup punya tombol Download & Edit
  const gs = new Map();
  list.forEach(r => { const k = igKey(r); (gs.get(k) || gs.set(k, []).get(k)).push(r) });
  return [...gs.entries()].sort((x, y) => (x[1][0].tahap || 99) - (y[1][0].tahap || 99) || String(x[1][0].src).localeCompare(String(y[1][0].src))).map(([k, L]) => {
    L = L.slice().sort((p, q) => p.ts - q.ts || (p.id < q.id ? -1 : 1));
    const R = igRange(L), st = igStat(L), kk = 'ig' + k;
    return `<details class="gp" data-k="${esc(kk)}" ${openState[kk] ? 'open' : ''}><summary>
      <span class="gi"><span class="gn"><b>Pengajuan</b> <span class="gjm">${R.txt}</span></span><small class="gtm gdt">${igLong(L[0].ts)}</small>
        <span class="gt">${L[0].tahap ? '<span class="tag">' + thLbl(L[0].tahap) + '</span>' : ''}<span class="tag">${esc(L[0].src)}</span><span class="tag">${L.length} barang · ${NF(sumK2(L, r => r.min))} pcs</span><span class="tag">${esc(admList(L).join(', ') || '-')}</span><span class="tag ${st === 'Selesai' ? 'in' : 'out'}">${st}</span></span></span>
      <span class="ga"><button class="btn ghost sm" data-igxls="${esc(k)}" type="button" title="Download grup ini sebagai Excel">Download Excel</button><button class="btn ghost sm" data-igpdf="${esc(k)}" type="button" title="Download grup ini sebagai PDF">Download PDF</button><button class="btn ghost sm" data-igedit="${esc(k)}" type="button">Edit</button></span></summary>
      <div class="gpb"><div class="tw"><table><thead><tr><th>No</th><th>Tanggal</th><th>Produk</th><th>Varian</th><th>Ada / Diminta</th><th>Asal</th><th>Pengajuan</th><th>Admin</th><th>Status</th><th></th></tr></thead><tbody>${L.map(pgRow).join('')}</tbody>${pgFoot(L)}</table></div></div></details>`;
  }).join('');
};
function renderReqs() { // hari ini tampil di atas; hari-hari sebelumnya otomatis masuk riwayat per tahun > bulan (tertutup)
  const all = pgFiltered(), today = dayWIB(Date.now()), filt = PGF.some(x => $(x).value);
  const tr = all.filter(r => dayWIB(r.ts) === today), hr = all.filter(r => dayWIB(r.ts) !== today), g = {};
  hr.forEach(r => { const d = dayWIB(r.ts), y = d.slice(0, 4), m = d.slice(5, 7); ((g[y] = g[y] || {})[m] = g[y][m] || []).push(r) });
  const isOpen = (k, dflt) => k in openState ? openState[k] : (filt || dflt);
  let html = sumPg(all) + '<div class="dayh">Hari ini <span class="tag">' + tr.length + ' data</span></div>' + (tr.length ? pgTbl(tr) : '<div class="empty">Belum ada pengajuan hari ini.</div>');
  if (hr.length) {
    html += '<div class="dayh" style="margin-top:24px">Riwayat <span class="tag">' + hr.length + ' data</span></div>' + Object.keys(g).sort().reverse().map(y => {
      const ms = Object.keys(g[y]).sort().reverse(), cnt = ms.reduce((s, m) => s + g[y][m].length, 0), ky = 'ry' + y;
      return `<details class="yr" data-k="${ky}" ${isOpen(ky, y === today.slice(0, 4)) ? 'open' : ''}><summary>${y} <span class="tag">${cnt} data</span></summary>` +
        ms.map(m => { const km = 'rm' + y + m; return `<details class="mo" data-k="${km}" ${isOpen(km, false) ? 'open' : ''}><summary>${BLN[+m - 1]} ${y} <span class="tag">${g[y][m].length} data</span></summary>${dayBlocks(g[y][m], dayWIB, 'rd', isOpen, d => false, pgTbl)}</details>` }).join('') + '</details>';
    }).join('');
  }
  $('#pgGrp').innerHTML = html;
}
$('#pgGrp').addEventListener('click', e => { if (e.target.closest('button')) return; const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open } });
$('#pgGrp').onclick = e => {
  const gb = e.target.closest('[data-igxls],[data-igpdf],[data-igedit]');
  if (gb) return gb.dataset.igxls ? igExcel(gb.dataset.igxls) : gb.dataset.igpdf ? igPdf(gb.dataset.igpdf) : openIgEdit(gb.dataset.igedit);
  const hb = e.target.closest('[data-hist]');
  if (hb) { // buka/tutup daftar jam input produk yang sama
    const id = hb.dataset.hist; openHist[id] = !openHist[id];
    const row = $('#pgGrp').querySelector('tr.hrow[data-for="' + id + '"]'); if (row) row.hidden = !openHist[id];
    hb.classList.toggle('on', !!openHist[id]); return;
  }
  const he = e.target.closest('[data-hedit]'); if (he) return openHEdit(he.dataset.hedit, +he.dataset.ts);
  const hd = e.target.closest('[data-hdel]'); if (hd) return delHEntry(hd.dataset.hdel, +hd.dataset.ts);
  if (e.target.dataset.redit) return openREdit(e.target.dataset.redit);
  const id = e.target.dataset.del; if (!id) return;
  const r0 = reqs.find(r => r.id === id); if (!r0) return;
  askYN('Yakin menghapus pengajuan ' + r0.prod + (r0.vn ? ' · ' + r0.vn : '') + ' (' + r0.min + ' pcs)?', () => {
    const r = reqs.find(x => x.id === id); if (!r) return;
    const lop = logH('PENGAJUAN', 'hapus', r.prod + (r.vn ? ' · ' + r.vn : '') + ' · ' + r.min + ' pcs · ' + r.src, [{ c: 'requests', b: cl(r), a: null }]);
    reqs = reqs.filter(x => x.id !== id); commit([['requests', 'del', id], lop]); renderReqs();
  });
};

/* ---------- edit pengajuan (popup) ---------- */
let rRec = null, rList = [], rAddNew = false;
const rSwatch = () => { const v = rList[$('#rVar').value]; $('#rSw').style.background = v ? v.c : 'transparent' };
function fillRVar(name, vn, vc) {
  const p = products.find(x => x.name === name);
  rList = p ? p.variants.slice() : [];
  let idx = rList.findIndex(v => v.n === vn && v.c === vc);
  if (vn && idx < 0) { rList.unshift({ n: vn, c: vc }); idx = 0 }
  $('#rVar').innerHTML = '<option value="">— tanpa varian —</option>' + rList.map((v, i) => `<option value="${i}">${esc(v.n)}</option>`).join('');
  $('#rVar').value = idx >= 0 ? idx : ''; rSwatch();
}
function openREdit(id) {
  const r = rRec = reqs.find(x => x.id === id); if (!r) return;
  rSearch.set(r.prod);
  fillRVar(r.prod, r.vn, r.vc);
  $('#rAda').value = r.ada; $('#rMin').value = r.min; $('#rSrc').value = r.src; $('#rAdm').value = r.adm || ''; $('#rTh').value = r.tahap || '';
  rAddNew = false; $('#rVarName').value = ''; $('#rVarCol').value = '#4a7bd0'; rNewUI();
  const nh = reqHist(r).length;
  $('#rD').value = ymd(r.ts); $('#rT').value = hm(r.ts); $('#rD').disabled = $('#rT').disabled = nh > 1; $('#rCode').value = '';
  $('#rDTHint').textContent = nh > 1 ? 'Produk ini digabung dari ' + nh + ' input. Ubah tanggal / jam per input lewat tombol ' + nh + '× lalu Edit.' : 'Mengubah tanggal / jam wajib memasukkan kode 6 digit.';
  msg('#rMsg', ''); $('#rmdl').hidden = false;
}
function rNewUI() { // isian warna ketik <-> pilih dari daftar warna (produk baru / tanpa varian: wajib ketik warna)
  const p = rProdObj(), forced = !p || !p.variants.length, typed = forced || rAddNew;
  $('#rNew').hidden = !typed; $('#rVsel').hidden = typed; $('#rToggle').hidden = forced;
  $('#rToggle').textContent = rAddNew ? 'Pilih dari daftar warna' : '+ Warna baru';
}
const rProdObj = () => products.find(x => normName(x.name) === normName(rSearch.text()));
function rSelChanged() { // nama produk berubah (ketik / pilih saran)
  const p = rProdObj(); rAddNew = false;
  if (p) { const same = rRec && p.name === rRec.prod; fillRVar(p.name, same ? rRec.vn : '', same ? rRec.vc : '') }
  else { rList = []; $('#rVar').innerHTML = ''; rSwatch() }
  rNewUI();
}
const rSearch = psearch($('#rProdBox'), () => products, p => { if (p) rSelChanged() }, () => rSelChanged());
$('#rToggle').onclick = () => { rAddNew = !rAddNew; rNewUI() };
$('#rVarName').oninput = e => {
  const s = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(s, s);
  const c = toHex(e.target.value); if (c) $('#rVarCol').value = c;
};
const closeREdit = () => { $('#rmdl').hidden = true; rRec = null };
$('#rVar').onchange = rSwatch;
$('#rCancel').onclick = closeREdit;
$('#rmdl').onclick = e => { if (e.target.id === 'rmdl') closeREdit() };
$('#rSave').onclick = () => {
  const r = reqs.find(x => x.id === rRec.id) || rRec, m = parseInt($('#rMin').value, 10), name = normName(rSearch.text());
  if (!name) return msg('#rMsg', 'Isi nama produk.');
  if (!(m >= 1)) return msg('#rMsg', 'Isi jumlah diminta dengan angka.');
  const rth = parseInt($('#rTh').value, 10);
  if (r.tahap && !rth) return msg('#rMsg', 'Pilih tahap pengajuan (wajib).');
  if (rth && (rth !== r.tahap || $('#rAdm').value !== (r.adm || '')) && !tahapOk(rth, $('#rAdm').value, dayWIB(r.ts), r.id)) return msg('#rMsg', tahapErr(rth).replace('hari ini', 'pada hari pengajuan ini'));
  if (m < r.ada) return msg('#rMsg', 'Jumlah diminta tidak boleh kurang dari barang yang sudah ada (' + r.ada + ').');
  if (!$('#rSrc').value) return msg('#rMsg', 'Pilih asal barang.');
  const bR = cl(r), bRec = records.filter(x => x.rid === r.id).map(cl), rT = $('#rT').value.trim();
  const dtCh = !$('#rD').disabled && ($('#rD').value !== ymd(r.ts) || rT !== hm(r.ts));
  if (dtCh) {
    if (!$('#rD').value || !T24.test(rT)) return msg('#rMsg', 'Isi tanggal dan jam (format 24 jam, mis. 14:30).');
    if (!codeOk('#rCode')) return msg('#rMsg', 'Mengubah tanggal / jam wajib memakai kode 6 digit yang benar.');
  }
  let p = rProdObj(), v = null, np = null;
  const ops = [];
  if (!p || !p.variants.length || rAddNew) { // warna diketik
    const vt = normName($('#rVarName').value);
    if (!vt) return msg('#rMsg', 'Warna wajib diisi: ketik nama warna.');
    if (!p) np = p = { id: uid(), name, variants: [] }; // nama produk baru (belum ada di database)
    v = p.variants.find(x => normName(x.n) === vt);
    if (!v) { v = { n: vt, c: $('#rVarCol').value }; p.variants.push(v); ops.push(['products', 'set', p]) }
  } else {
    v = rList[$('#rVar').value];
    if (!v) return msg('#rMsg', 'Warna wajib diisi: pilih dari daftar atau klik "+ Warna baru".');
  }
  if (np) products.push(np);
  Object.assign(r, { pid: p.id, prod: p.name, vn: v.n, vc: v.c, min: m, src: $('#rSrc').value, adm: $('#rAdm').value }); if (rth) r.tahap = rth;
  if (dtCh) { r.ts = new Date($('#rD').value + 'T' + rT).getTime(); if (Array.isArray(r.hist) && r.hist.length === 1) r.hist = [{ ts: r.ts, n: r.min }] }
  ops.push(['requests', 'set', r]);
  records.filter(x => x.rid === r.id).forEach(x => { Object.assign(x, { prod: r.prod, vn: r.vn, vc: r.vc, min: r.min, src: r.src, adm: r.adm }); if (r.tahap) x.tahap = r.tahap; ops.push(['records', 'set', x]) });
  ops.push(logH('PENGAJUAN', 'edit', bR.prod + (bR.vn ? ' · ' + bR.vn : ''), histDocs(bR, bRec, r)));
  if (!commit(ops)) return msg('#rMsg', 'Penyimpanan penuh.');
  closeREdit(); renderReqs(); renderProducts();
};

/* ---------- edit / hapus per input (jam input produk yang sama) ---------- */
// n === null: hapus input; selain itu ubah jumlah (n) dan waktu (nts). Mengembalikan {err} atau {ops}.
function histApply(r, ts, n, nts) {
  const E = reqEntries(r).map(x => ({ ts: x.ts, n: x.n })), i = E.findIndex(x => x.ts === ts);
  if (i < 0) return { err: 'Input tidak ditemukan.' };
  if (n === null) { if (E.length < 2) return { err: 'Ini satu-satunya input. Gunakan tombol Hapus pada baris pengajuan.' }; E.splice(i, 1) }
  else { if (E.some((x, k) => k !== i && x.ts === nts)) return { err: 'Waktu itu sudah dipakai input lain, ubah menitnya.' }; E[i] = { ts: nts, n } }
  E.sort((a, b) => a.ts - b.ts);
  const total = E.reduce((s, x) => s + x.n, 0);
  if (total < r.ada) return { err: 'Total diminta menjadi ' + total + ' pcs, lebih kecil dari barang yang sudah ada (' + r.ada + ').' };
  r.hist = E; r.min = total; r.ts = E[0].ts;
  const ops = [['requests', 'set', r]];
  records.forEach(x => { if (x.rid === r.id) { x.min = total; ops.push(['records', 'set', x]) } });
  return { ops };
}
let hRef = null;
function openHEdit(id, ts) {
  const r = reqs.find(x => x.id === id), h = r && reqEntries(r).find(x => x.ts === ts); if (!h) return;
  hRef = { id, ts };
  $('#hInfo').textContent = r.prod + (r.vn ? ' · ' + r.vn : '') + ' · asal ' + r.src;
  $('#hN').value = h.n; $('#hD').value = ymd(h.ts); $('#hT').value = hm(h.ts);
  $('#hCode').value = ''; msg('#hMsg', ''); $('#hmdl').hidden = false;
}
const closeH = () => { $('#hmdl').hidden = true; hRef = null };
$('#hCancel').onclick = closeH;
$('#hmdl').onclick = e => { if (e.target.id === 'hmdl') closeH() };
$('#hSave').onclick = () => {
  const r = reqs.find(x => x.id === hRef.id); if (!r) return closeH();
  const n = parseInt($('#hN').value, 10), d = $('#hD').value, t = $('#hT').value.trim();
  if (!(n >= 1)) return msg('#hMsg', 'Isi jumlah diajukan dengan angka.');
  if (!d || !T24.test(t)) return msg('#hMsg', 'Isi tanggal dan jam (format 24 jam, mis. 14:30).');
  const hCh = d !== ymd(hRef.ts) || t !== hm(hRef.ts), nts = hCh ? new Date(d + 'T' + t).getTime() : hRef.ts;
  if (hCh && !codeOk('#hCode')) return msg('#hMsg', 'Mengubah tanggal / jam wajib memakai kode 6 digit yang benar.');
  const bR = cl(r), bRec = records.filter(x => x.rid === r.id).map(cl);
  const res = histApply(r, hRef.ts, n, nts);
  if (res.err) return msg('#hMsg', res.err);
  res.ops.push(logH('PENGAJUAN', 'edit', r.prod + (r.vn ? ' · ' + r.vn : '') + ' · input ' + tsFmt(hRef.ts), histDocs(bR, bRec, r)));
  if (!commit(res.ops)) return msg('#hMsg', 'Penyimpanan penuh.');
  closeH(); renderReqs();
};
function delHEntry(id, ts) {
  const r = reqs.find(x => x.id === id), h = r && reqEntries(r).find(x => x.ts === ts); if (!h) return;
  askYN('Yakin menghapus input ' + tsFmt(ts) + ' (' + h.n + ' pcs)? Total diminta berkurang ' + h.n + ' pcs.', () => {
    const r2 = reqs.find(x => x.id === id); if (!r2) return;
    const bR = cl(r2), bRec = records.filter(x => x.rid === r2.id).map(cl);
    const res = histApply(r2, ts, null); if (res.err) return alert(res.err);
    res.ops.push(logH('PENGAJUAN', 'hapus', r2.prod + (r2.vn ? ' · ' + r2.vn : '') + ' · input ' + tsFmt(ts) + ' (' + h.n + ' pcs)', histDocs(bR, bRec, r2)));
    commit(res.ops); renderReqs();
  });
}

/* ---------- export pengajuan ---------- */
const SL = '\u00A0'.repeat(8) + '/ '; // kolom Ada dikosongkan, garis miring tetap ada
// urutan export: abjad A-Z menurut nama produk, lalu varian (warna), lalu waktu
const azSort = (a, b) => String(a.prod).localeCompare(String(b.prod), 'id', { sensitivity: 'base', numeric: true })
  || String(a.vn || '').localeCompare(String(b.vn || ''), 'id', { sensitivity: 'base', numeric: true }) || a.ts - b.ts;
// riwayat jam input pengajuan: setiap submit (termasuk yang digabung) dicatat {ts, n}. Data lama: hanya waktu pertama.
const reqHist = r => (r.hist && r.hist.length) ? r.hist : [{ ts: r.ts, n: r.min }];
// entri per input: {ts, n: jumlah diajukan, a: jumlah ada}. "Ada" dialokasikan berurutan dari input terlama; jika jumlah diminta diedit, selisih dimasukkan ke input terakhir.
function reqEntries(r) {
  const E = reqHist(r).map(h => ({ ts: h.ts, n: h.n })), sum = E.reduce((s, h) => s + h.n, 0);
  E[E.length - 1].n = Math.max(0, E[E.length - 1].n + (r.min - sum));
  let left = r.ada || 0;
  return E.map(h => { const a = Math.min(h.n, left); left -= a; return { ts: h.ts, n: h.n, a } });
}
// tampilan pengajuan sesuai filter tanggal & jam: jika produk diajukan lebih dari sekali, hanya input yang masuk rentang yang diambil
function pgView(r, f, t) {
  if (f === null && t === null) return r;
  const E = reqEntries(r), M = E.filter(h => (f === null || h.ts >= f) && (t === null || h.ts <= t));
  if (!M.length) return null;
  if (M.length === E.length) return r;
  return Object.assign({}, r, { ts: M[0].ts, min: M.reduce((s, h) => s + h.n, 0), ada: M.reduce((s, h) => s + h.a, 0), hist: M.map(h => ({ ts: h.ts, n: h.n })), part: true, tot: r.min });
}
const inTime = (r, f, t) => reqHist(r).some(h => (f === null || h.ts >= f) && (t === null || h.ts <= t)); // salah satu jam input masuk rentang filter
const reqStat = r => r.ada >= r.min ? 'Selesai' : r.ada ? 'Sebagian' : 'Menunggu';
function pgFiltered() { // dipakai oleh daftar di layar DAN export
  const f = dtv(dtVal('#xFrom')), t = dtv(dtVal('#xTo', true), true), s = $('#xSrc').value, th = $('#xTh').value, am = admF('#xAdm'),
    q = $('#xProd').value.trim().toLowerCase(), st = $('#xSt').value, out = [];
  reqs.forEach(r => {
    if (!mine(r) || (s && r.src !== s) || (am && (r.adm || '') !== am) || (th && String(r.tahap) !== th) || (q && !String(r.prod).toLowerCase().includes(q))) return;
    const v = pgView(r, f, t); // filter tanggal & jam: hanya input yang sesuai rentang
    if (v && (!st || reqStat(v) === st)) out.push(v);
  });
  return out.sort((x, y) => x.ts - y.ts);
}
// nama admin untuk header & nama file: sesuai filter, atau nama admin yang ada di data
const admList = rows => [...new Set(rows.map(r => r.adm).filter(Boolean))];
const admHead = rows => admList(rows).join(', ') || '-';
function fileName(asal, adm, form, ext) { // KODE ASAL BARANG (tanpa filter: REPORT)-NAMA ADMIN-DDMMYY-FORM DOWNLOAD-JJ.MM
  const d = dayWIB(Date.now()).split('-');
  const jam = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.'); // jam export (WIB), mis. 15.00
  return [asal || 'REPORT', adm || 'SEMUA', d[2] + d[1] + d[0].slice(2), form, jam].join('-').toUpperCase().replace(/[\\/:*?"<>|]+/g, '') + '.' + ext;
}
const admFile = rows => { const l = admList(rows); return l.length === 1 ? l[0] : 'SEMUA' };
function pgHead(rows) {
  const f = dtVal('#xFrom'), t = dtVal('#xTo', true);
  const tgl = !f && !t ? 'Semua tanggal' : f && t ? fDT(f) + ' s/d ' + fDT(t) : f ? 'Mulai ' + fDT(f) : 'Sampai ' + fDT(t);
  return { title: 'Permintaan Pengajuan Barang', tgl: 'Tanggal & Jam Pengajuan: ' + tgl, asal: 'Asal Barang: ' + ($('#xSrc').value || 'Semua'), adm: 'Nama Admin: ' + admHead(rows || []) };
}
$('#pgXls').onclick = () => {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const rows = pgFiltered().sort(azSort);
  if (!rows.length) return alert('Tidak ada pengajuan pada filter itu.');
  const H = pgHead(rows);
  const aoa = [[H.title], [H.tgl], [H.asal], [H.adm], [], ['No', 'Tanggal', 'Produk', 'Varian', 'Ada / Diminta', 'Asal', 'Pengajuan', 'Status']]
    .concat(rows.map((r, i) => [i + 1, tsFmt(r.ts), r.prod, r.vn || '-', SL + r.min + ' pcs', r.src, thLbl(r.tahap), '\u2610']));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 7 } }));
  ws['!cols'] = [5, 17, 28, 16, 18, 10, 11, 8].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Pengajuan');
  const fn = fileName($('#xSrc').value, admFile(rows), 'PENGAJUAN', 'xlsx'); XLSX.writeFile(wb, fn);
  logDl({ form: 'PENGAJUAN', fmt: 'Excel', fname: fn, src: $('#xSrc').value, th: $('#xTh').value, subs: rows.map(r => reqHist(r).length > 1 ? reqEntries(r).map(x => [tsFmt(x.ts), x.a, x.n]) : null), title: H.title, tgl: H.tgl, cols: aoa[5], rows: aoa.slice(6) });
};
$('#pgPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const rows = pgFiltered().sort(azSort); if (!rows.length) return alert('Tidak ada pengajuan pada filter itu.');
  const H = pgHead(rows);
  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16); doc.text(H.title, 14, 15);
  doc.setFontSize(10); doc.text(H.tgl, 14, 22); doc.text(H.asal + '     ' + H.adm, 14, 28);
  doc.autoTable({
    startY: 33, headStyles: { fillColor: [74, 123, 208] },
    head: [['No', 'Tanggal', 'Produk', 'Varian', 'Ada / Diminta', 'Asal', 'Pengajuan', 'Status']],
    body: rows.map((r, i) => [i + 1, tsFmt(r.ts), r.prod, r.vn || '-', SL + r.min + ' pcs', r.src, thLbl(r.tahap), '']),
    didDrawCell: d => {
      if (d.section !== 'body') return;
      if (d.column.index === 7) { // kotak centang kosong
        const s = 4.5; doc.setDrawColor(60); doc.setLineWidth(.3);
        doc.rect(d.cell.x + (d.cell.width - s) / 2, d.cell.y + (d.cell.height - s) / 2, s, s);
      }
    }
  });
  const fn = fileName($('#xSrc').value, admFile(rows), 'PENGAJUAN', 'pdf'); doc.save(fn);
  logDl({ form: 'PENGAJUAN', fmt: 'PDF', fname: fn, src: $('#xSrc').value, th: $('#xTh').value, subs: rows.map(r => reqHist(r).length > 1 ? reqEntries(r).map(x => [tsFmt(x.ts), x.a, x.n]) : null), title: H.title, tgl: H.tgl, cols: ['No', 'Tanggal', 'Produk', 'Varian', 'Ada / Diminta', 'Asal', 'Pengajuan', 'Status'], rows: rows.map((r, i) => [i + 1, tsFmt(r.ts), r.prod, r.vn || '-', SL + r.min + ' pcs', r.src, thLbl(r.tahap), '\u2610']) });
};
const PGF = ['#xFromD', '#xFromT', '#xToD', '#xToT', '#xSrc', '#xAdm', '#xTh', '#xProd', '#xSt'];
function setPgToday() { $('#xFromD').value = $('#xToD').value = $('#xFromT').value = $('#xToT').value = '' } // filter tanggal kosong = semua data
setPgToday();
PGF.forEach(x => { $(x).addEventListener('input', renderReqs); $(x).addEventListener('change', renderReqs) });
$('#xReset').onclick = () => {
  setPgToday(); ['#xSrc', '#xAdm', '#xTh', '#xProd', '#xSt'].forEach(x => $(x).value = '');
  $('#xProd')._upd && $('#xProd')._upd(); renderReqs();
};

/* ---------- GRUP PENGAJUAN di bawah form Input: per hari > per tahap; hari yang lewat otomatis masuk Riwayat ---------- */
const igKey = r => dayWIB(r.ts) + '|' + (r.tahap || 0) + '|' + (r.src || '');
const igItems = k => reqs.filter(r => mine(r) && igKey(r) === k);
const igLong = t => { const d = dayWIB(t).split('-'); return +d[2] + ' ' + BLN[+d[1] - 1] + ' ' + d[0] };
const igRange = L => { const a = Math.min(...L.map(r => r.ts)), b = Math.max(...L.map(r => r.ts)); return { a, b, txt: hm(a) === hm(b) ? hm(a) : hm(a) + ' – ' + hm(b) } };
const igStat = L => L.every(r => r.ada >= r.min) ? 'Selesai' : L.some(r => r.ada > 0) ? 'Sebagian' : 'Menunggu';
// export per grup: satu header + satu tabel (format sama dengan export menu Pengajuan)
const IG_COLS = ['No', 'Tanggal', 'Produk', 'Varian', 'Ada / Diminta', 'Asal', 'Pengajuan', 'Status'];
function igData(k) {
  const L = igItems(k).sort(azSort); if (!L.length) return null;
  const R = igRange(L), srcs = [...new Set(L.map(r => r.src))];
  return { L, src: srcs.length === 1 ? srcs[0] : '', th: L[0].tahap ? String(L[0].tahap) : '',
    head: ['Permintaan Pengajuan Barang', 'Tanggal & Jam: ' + igLong(R.a) + '   ' + R.txt.replace(' – ', ' - '), 'Asal Barang: ' + srcs.join(', ') + '     Nama Admin: ' + admHead(L), 'Pengajuan : ' + (L[0].tahap ? thLbl(L[0].tahap) : '-')],
    rows: L.map((r, i) => [i + 1, tsFmt(r.ts), r.prod, r.vn || '-', SL + r.min + ' pcs', r.src, thLbl(r.tahap), '\u2610']),
    subs: L.map(r => reqHist(r).length > 1 ? reqEntries(r).map(x => [tsFmt(x.ts), x.a, x.n]) : null) };
}
function igLog(D, fm, fn) { logDl({ form: 'PENGAJUAN', fmt: fm, fname: fn, src: D.src, th: D.th, subs: D.subs, title: D.head[0], tgl: D.head[1] + ' | ' + D.head[3], cols: IG_COLS, rows: D.rows }) }
function igExcel(k) {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const D = igData(k); if (!D) return;
  const aoa = D.head.map(h => [h]).concat([IG_COLS], D.rows), ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 7 } })); ws['!cols'] = [5, 17, 28, 16, 18, 10, 11, 8].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Pengajuan');
  const fn = fileName(D.src, admFile(D.L), 'PENGAJUAN', 'xlsx'); XLSX.writeFile(wb, fn); igLog(D, 'Excel', fn);
}
function igPdf(k) {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const D = igData(k); if (!D) return;
  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16); doc.text(D.head[0], 14, 15);
  doc.setFontSize(10); doc.text(D.head[1], 14, 22); doc.text(D.head[2], 14, 28); doc.text(D.head[3], 14, 34);
  doc.autoTable({ startY: 39, headStyles: { fillColor: [74, 123, 208] }, head: [IG_COLS], body: D.rows.map(x => x.slice(0, 7).concat('')),
    didDrawCell: d => { if (d.section === 'body' && d.column.index === 7) { const s = 4.5; doc.setDrawColor(60); doc.setLineWidth(.3); doc.rect(d.cell.x + (d.cell.width - s) / 2, d.cell.y + (d.cell.height - s) / 2, s, s) } } });
  const fn = fileName(D.src, admFile(D.L), 'PENGAJUAN', 'pdf'); doc.save(fn); igLog(D, 'PDF', fn);
}
// Edit grup: daftar barang pada grup itu; tiap barang diedit lewat popup edit pengajuan yang sudah ada
let igEd = null;
function openIgEdit(k) {
  const L = igItems(k).sort((a, b) => a.ts - b.ts); if (!L.length) return;
  igEd = k; $('#igInfo').textContent = 'Pengajuan ' + (L[0].tahap ? thLbl(L[0].tahap) + ' · ' : '') + L[0].src + ' · ' + igLong(L[0].ts) + ' · ' + L.length + ' barang. Pilih barang yang ingin diedit.';
  $('#igList').innerHTML = L.map(r => `<div class="gpi"><span>${r.vc ? sw(r.vc, r.vn) + ' ' : ''}<b>${esc(r.prod)}</b>${r.vn ? ' · ' + esc(r.vn) : ''} · ${r.ada} / ${r.min} pcs <small class="tm">${hm(r.ts)}</small></span><button class="btn ghost sm" data-ige="${r.id}" type="button">Edit barang</button></div>`).join('');
  $('#igmdl').hidden = false;
}
const closeIgEdit = () => { $('#igmdl').hidden = true; igEd = null };
$('#igClose').onclick = closeIgEdit;
$('#igmdl').onclick = e => { if (e.target.id === 'igmdl') closeIgEdit(); const b = e.target.closest('[data-ige]'); if (b) { const id = b.dataset.ige; closeIgEdit(); openREdit(id) } };
/* ---------- INPUT ---------- */
let blocks = [], photo = '';
// cakupan pengajuan di menu Input: bawaan hanya hari ini (WIB). Jika filter tanggal & jam diisi, pengajuan pada rentang itu muncul lagi.
const IN_DT = ['#iFromD', '#iFromT', '#iToD', '#iToT'];
const inRange = () => ({ f: dtv(dtVal('#iFrom')), t: dtv(dtVal('#iTo', true), true) });
const inDateOn = () => { const { f, t } = inRange(); return f !== null || t !== null };
const inReqs = () => { const { f, t } = inRange(); return f === null && t === null ? todayReqs() : reqs.filter(r => mine(r) && inTime(r, f, t)) };
const inInfo = r => { const h = reqHist(r); return (r.tahap ? ' · Tahap ' + r.tahap : '') + (inDateOn() ? ' · ' + tsFmt(r.ts) : '') + (h.length > 1 ? ' · Diinput ' + h.length + '× (' + h.map(x => hm(x.ts)).join(' → ') + ')' : '') };
const openProducts = () => [...new Map(inReqs().filter(r => r.ada < r.min).map(r => [r.pid, { id: r.pid, name: r.prod }])).values()];

function addBlock() {
  const el = document.createElement('div'); el.className = 'blk';
  el.innerHTML = '<div class="bh"><label>Cari Produk (dari menu Pengajuan)</label><button class="btn ghost sm x" type="button">Hapus</button></div><div class="ps"></div><div class="rows"></div>';
  $('#blocks').appendChild(el);
  const b = { el, prod: null };
  b.s = psearch(el.querySelector('.ps'), openProducts, p => {
    if (p && blocks.some(o => o !== b && o.prod && String(o.prod.id) === String(p.id))) {
      b.s.reset(); return msg('#inMsg', 'Produk itu sudah dipilih di blok lain.');
    }
    b.prod = p; msg('#inMsg', ''); b.render();
  });
  b.render = () => {
    const R = el.querySelector('.rows');
    if (!b.prod) { R.innerHTML = ''; return }
    const rs = inReqs().filter(r => String(r.pid) === String(b.prod.id) && r.ada < r.min);
    R.innerHTML = rs.length ? rs.map(r => `<div class="ln" data-id="${r.id}">
      ${r.vc ? sw(r.vc, r.vn) : ''}
      <div class="inf">${r.vn ? '' : '<b>Satuan (tanpa varian)</b>'}
        <span>Diajukan <b>${r.min}</b> pcs · sudah ada ${r.ada} · <span class="tag">${esc(r.src)}</span> · Admin: <b>${esc(r.adm || '-')}</b>${inInfo(r)}</span></div>
      <input type="number" min="0" max="${r.min - r.ada}" inputmode="numeric" placeholder="Ada (0 boleh)">
      <div class="st">-</div></div>`).join('')
      : '<div class="empty">Tidak ada pengajuan terbuka untuk produk ini.</div>';
  };
  el.querySelector('.rows').oninput = lineInput;
  el.querySelector('.x').onclick = () => {
    el.remove(); blocks = blocks.filter(o => o !== b); if (!blocks.length) addBlock();
  };
  blocks.push(b);
}
function refreshBlocks() {
  blocks.forEach(b => {
    if (b.prod && !openProducts().some(p => String(p.id) === String(b.prod.id))) b.s.reset(); else b.render();
  });
  renderAuto();
}
$('#addBlk').onclick = addBlock;

/* input angka "Ada" pada satu baris pengajuan (dipakai mode cari produk dan mode filter admin/asal) */
let autoVals = {}, autoSig = '';
function setLnStatus(ln, r, v) {
  const s = ln.querySelector('.st');
  if (v === '' || v == null) { s.className = 'st'; s.textContent = '-'; return }
  const ok = r.ada + v === r.min;
  s.className = 'st ' + (ok ? 'ok' : 'bad'); s.textContent = ok ? '✓' : '✕';
}
function lineInput(e) {
  const ln = e.target.closest('.ln'); if (!ln) return;
  const r = reqs.find(x => x.id === ln.dataset.id), i = e.target, auto = !!ln.closest('#auto');
  if (!r) return;
  if (i.value === '') { if (auto) delete autoVals[r.id]; setLnStatus(ln, r, ''); return }
  let v = parseInt(i.value, 10); if (isNaN(v) || v < 0) v = 0;
  v = Math.min(v, r.min - r.ada); i.value = v;
  if (auto) autoVals[r.id] = v;
  setLnStatus(ln, r, v);
}

/* mode filter: pilih nama admin dan/atau asal barang -> semua pengajuan hari ini tampil sebagai daftar isian */
const autoMode = () => !!($('#inTh').value || $('#inSrc').value || admF('#inAdm') || inDateOn());
const autoReqs = () => {
  const a = $('#inTh').value, s = $('#inSrc').value, am = admF('#inAdm');
  return inReqs().filter(r => r.ada < r.min && (!a || String(r.tahap) === a) && (!s || r.src === s) && (!am || (r.adm || '') === am))
    .sort((x, y) => x.ts - y.ts || (x.id < y.id ? -1 : 1)); // urut sesuai waktu pengisian form pengajuan (terlama di atas)
};
function renderAuto(force) {
  const on = autoMode();
  $('#auto').hidden = !on; $('#autoQBox').hidden = !on; $('#blocks').hidden = on; $('#addBlk').hidden = on;
  if (!on) { autoSig = ''; $('#autoQ').value = ''; $('#autoQ')._upd && $('#autoQ')._upd(); return }
  const rs = autoReqs(), sig = $('#inTh').value + '|' + $('#inSrc').value + '|' + admF('#inAdm') + '|' + inDateOn() + '|' + JSON.stringify(rs.map(r => [r.id, r.ada, r.min]));
  if (!force && sig === autoSig) return; // tidak ada perubahan data: jangan hapus isian yang sedang diketik
  autoSig = sig;
  $('#auto').innerHTML = rs.length
    ? '<div class="hint">' + rs.length + ' barang diajukan ' + (inDateOn() ? 'pada rentang tanggal & jam yang dipilih' : 'hari ini') + '. Isi jumlah "Ada" (boleh 0), kolom yang dikosongkan akan dilewati.</div>' + sumIn(rs) + rs.map(r => `<div class="ln" data-id="${r.id}">
      ${r.vc ? sw(r.vc, r.vn) : ''}
      <div class="inf"><b class="pn">${esc(r.prod)}${r.vn ? ' · ' + esc(r.vn) : ''}</b>
        <span>Diajukan <b>${r.min}</b> pcs · sudah ada ${r.ada} · <span class="tag">${esc(r.src)}</span> · Admin: <b>${esc(r.adm || '-')}</b>${inInfo(r)}</span></div>
      <input type="number" min="0" max="${r.min - r.ada}" inputmode="numeric" placeholder="Ada (0 boleh)" value="${autoVals[r.id] != null ? Math.min(autoVals[r.id], r.min - r.ada) : ''}">
      <div class="st">-</div></div>`).join('')
    : '<div class="empty">Tidak ada pengajuan terbuka ' + (inDateOn() ? 'pada rentang tanggal & jam itu' : 'hari ini') + ' untuk filter ini.</div>';
  $('#auto').querySelectorAll('.ln').forEach(ln => {
    const r = reqs.find(x => x.id === ln.dataset.id), raw = ln.querySelector('input').value;
    if (r && raw !== '') setLnStatus(ln, r, parseInt(raw, 10));
  });
  applyAutoQ();
}
$('#auto').addEventListener('input', lineInput);
$('#inTh').onchange = $('#inSrc').onchange = $('#inAdm').onchange = () => { msg('#inMsg', ''); renderAuto(true) };
// cari produk di dalam daftar hasil filter (baris yang tidak cocok disembunyikan; isian yang sudah diketik tetap tersimpan & ikut ter-submit)
function applyAutoQ() {
  const q = $('#autoQ').value.trim().toLowerCase(), lns = $('#auto').querySelectorAll('.ln');
  let vis = 0;
  lns.forEach(ln => { const ok = !q || ln.querySelector('.pn').textContent.toLowerCase().includes(q); ln.hidden = !ok; if (ok) vis++ });
  $('#autoCnt').textContent = !lns.length || !q ? '' : vis ? vis + ' dari ' + lns.length + ' barang cocok.' : 'Tidak ada barang yang cocok dengan pencarian.';
}
caps($('#autoQ')); addClear($('#autoQ')); $('#autoQ').addEventListener('input', applyAutoQ);
const onInDate = () => { msg('#inMsg', ''); refreshBlocks() };
IN_DT.forEach(x => { $(x).addEventListener('input', onInDate); $(x).addEventListener('change', onInDate) });
$('#inReset').onclick = () => { // reset filter admin, asal, tanggal & jam (isian jumlah yang sudah diketik tidak dihapus)
  $('#inTh').value = ''; $('#inSrc').value = ''; $('#inAdm').value = ''; IN_DT.forEach(x => $(x).value = ''); msg('#inMsg', ''); refreshBlocks(); renderAuto(true);
};

function compress(f, cb) {
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = im.width * k; c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .65));
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}
/* komponen foto: kamera + upload */
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
let camStream = null;
function stopCam() { if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; $('#cam').hidden = true }
$('#camClose').onclick = stopCam;
function webcam(done) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('Kamera tidak tersedia di browser ini. Gunakan tombol Upload.');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(s => {
    camStream = s; const v = $('#camV'); v.srcObject = s; $('#cam').hidden = false;
    $('#camSnap').onclick = () => {
      if (!v.videoWidth) return;
      const k = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement('canvas');
      c.width = v.videoWidth * k; c.height = v.videoHeight * k; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/jpeg', .65); stopCam(); done(d);
    };
  }).catch(() => alert('Kamera tidak bisa diakses (izin ditolak atau kamera tidak ada). Gunakan tombol Upload.'));
}
function photoField(root, cb) {
  const pv = root.querySelector('.pv'), clr = root.querySelector('[data-clr]'), cam = root.querySelector('.fCam'), up = root.querySelector('.fUp');
  const set = d => { pv.src = d || ''; pv.style.display = d ? 'block' : 'none'; clr.hidden = !d };
  const got = e => { const f = e.target.files[0]; e.target.value = ''; if (f) compress(f, d => { set(d); cb(d) }) };
  cam.onchange = up.onchange = got;
  root.querySelector('[data-up]').onclick = () => up.click();
  root.querySelector('[data-cam]').onclick = () => isMobile ? cam.click() : webcam(d => { set(d); cb(d) });
  clr.onclick = () => { set(''); cb('') };
  return { set };
}
const inPF = photoField($('#in'), d => { photo = d });
function resetInput() {
  $('#sj').value = ''; photo = ''; inPF.set('');
  $('#blocks').innerHTML = ''; blocks = []; addBlock(); msg('#inMsg', '');
  autoVals = {}; renderAuto(true);
}
$('#inSubmit').onclick = () => {
  const lines = [], roots = autoMode() ? [$('#auto')] : blocks.map(b => b.el), scope = new Set(inReqs().map(x => x.id)); // mode filter: ambil dari daftar otomatis
  roots.forEach(root => root.querySelectorAll('.ln').forEach(ln => {
    const r = reqs.find(x => x.id === ln.dataset.id), raw = ln.querySelector('input').value.trim();
    if (raw === '') return; // kosong = dilewati; angka 0 tetap dicatat (barang tidak ada)
    const v = Math.max(0, Math.min(parseInt(raw, 10) || 0, r ? r.min - r.ada : 0));
    if (r && scope.has(r.id)) lines.push([r, v]);
  }));
  if (!lines.length) return msg('#inMsg', 'Isi jumlah barang ada (boleh 0) minimal pada satu produk/varian.');
  const ts = Date.now(), sj = $('#sj').value.trim(), pid = photo ? uid() : '', gid = uid(), ops = []; // gid = penanda satu kali submit Input (dikelompokkan di menu Purchase)
  if (pid) { photos[pid] = photo; ops.push(['photos', 'set', { id: pid, d: photo }]) }
  lines.forEach(([r, v]) => {
    r.ada += v;
    const rec = { id: uid(), ts, sj, prod: r.prod, vn: r.vn, vc: r.vc, ada: r.ada, min: r.min, src: r.src, adm: r.adm || '', pid, rid: r.id, got: v, tahap: r.tahap || 0, gid }; // got = jumlah yang diterima pada input ini (boleh 0); ada = total kumulatif
    records.unshift(rec); ops.push(['requests', 'set', r], ['records', 'set', rec]);
  });
  if (!commit(ops)) return msg('#inMsg', 'Penyimpanan penuh. Coba tanpa foto atau hapus data lama.');
  resetInput(); go('pu');
};

/* ---------- PURCHASE ---------- */
const FIL = ['#dFromD', '#dFromT', '#dToD', '#dToT', '#fqSj', '#fqProd', '#fqSrc', '#fqAdm', '#fqSt', '#fqVar', '#fqTh'];
function filtered() {
  puInfo();
  const f = dtv(dtVal('#dFrom')), t = dtv(dtVal('#dTo', true), true), j = $('#fqSj').value.toLowerCase(), q = $('#fqProd').value.toLowerCase(),
    s = $('#fqSrc').value, st = $('#fqSt').value, v = $('#fqVar').value, th = $('#fqTh').value, am = admF('#fqAdm');
  return records.filter(r => mine(r) && (f === null || r.ts >= f) && (t === null || r.ts <= t) &&
    (!j || (r.sj || '').toLowerCase().includes(j)) && (!q || r.prod.toLowerCase().includes(q)) &&
    (!s || r.src === s) && (!am || (r.adm || '') === am) && (!th || String(r.tahap) === th) && (!v || r.vc === v) && (!st || (st === 'ok') === isFull(r)));
}
const openState = {};
// Kolom "ada" di data purchase menyimpan jumlah KUMULATIF per pengajuan. Untuk tampilan & export dipakai jumlah masuk per input
// (mis. 3 lalu 7 dari 10 -> tulis 3 / 10 dan 7 / 10, bukan 3 / 10 lalu 10 / 10), dan status Lengkap bila total seluruh input sudah mencapai jumlah diminta.
let PI = null;
function puInfo() {
  const by = {}, got = {}, full = {};
  records.forEach(r => { if (r.rid) (by[r.rid] = by[r.rid] || []).push(r) });
  Object.keys(by).forEach(k => {
    const L = by[k].slice().sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1)); let prev = 0, mx = 0;
    L.forEach(r => { const a = Number(r.ada) || 0; got[r.id] = Math.max(0, a - prev); prev = a; mx = Math.max(mx, a) });
    L.forEach(r => { full[r.id] = mx >= (Number(r.min) || 0) });
  });
  return PI = { got, full };
}
const gotOf = r => { const p = PI || puInfo(); return r.id in p.got ? p.got[r.id] : (Number(r.ada) || 0) };
const isFull = r => { const p = PI || puInfo(); return r.id in p.full ? p.full[r.id] : r.ada === r.min };
// kunci grup Purchase: hari + tahap + asal barang, jadi input satu-satu pada hari yang sama tetap masuk satu grup
const gKey = r => dayWIB(r.ts) + '|' + (r.tahap || 0) + '|' + (r.src || '');
const gItems = k => records.filter(r => mine(r) && gKey(r) === k);
// nomor urut per BULAN berdasarkan urutan masuk (terlama = 1), mulai dari 1 lagi setiap ganti bulan; tidak berubah oleh filter
const seqMap = () => {
  const m = {}, c = {};
  records.filter(mine).sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1)).forEach(r => { const k = ymd(r.ts).slice(0, 7); m[r.id] = c[k] = (c[k] || 0) + 1 });
  return m;
};
function renderTable() {
  puInfo();
  const seq = seqMap();
  const cols = [...new Map(records.filter(r => r.vc && mine(r)).map(r => [r.vc, r.vn])).entries()], cur = $('#fqVar').value;
  $('#fqVar').innerHTML = '<option value="">Semua</option>' + cols.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
  $('#fqVar').value = cur;
  const rows = filtered(), filt = FIL.some(s => $(s).value), now = ymd(Date.now());
  const photoCell = pid => !pid || photos[pid] === '' ? '-' : photos[pid] ? `<img class="thumb" src="${photos[pid]}" alt="Surat jalan">` : `<button class="btn ghost sm" data-photo="${esc(pid)}" type="button">📷 Lihat</button>`;
  const rowHtml = r => `<tr>
    <td>${seq[r.id]}</td><td class="nw">${hm(r.ts)}</td><td>${esc(r.sj || '-')}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${gotOf(r)} / ${r.min} pcs</td><td>${stat(isFull(r) ? 1 : 0, 1)}</td><td><span class="tag">${esc(r.src)}</span></td>
    <td class="nw"><button class="btn ghost sm" data-edit="${r.id}" type="button">Edit</button> <button class="btn ghost sm dng" data-del="${r.id}" type="button" title="Hapus satu barang ini saja">Hapus barang</button></td></tr>`;
  const tbl = list => { // satu kali Input (satu tahap) = satu grup; klik untuk membuka daftar barangnya
    const gs = new Map();
    list.forEach(r => { const k = gKey(r); (gs.get(k) || gs.set(k, []).get(k)).push(r) });
    return [...gs.entries()].sort((a, b) => Math.min(...b[1].map(r => r.ts)) - Math.min(...a[1].map(r => r.ts))).map(([k, L]) => {
      L = L.slice().sort((a, b) => seq[a.id] - seq[b.id]);
      const ts0 = Math.min(...L.map(r => r.ts)), srcs = [...new Set(L.map(r => r.src))], adms = admList(L), pid = (L.find(r => r.pid) || {}).pid || '', sjs = [...new Set(L.map(r => r.sj).filter(Boolean))];
      const full = L.every(isFull), tot = sumK2(L, gotOf), kk = 'g' + k;
      return `<details class="gp" data-k="${esc(kk)}" ${openState[kk] ? 'open' : ''}><summary>
        <span class="gi"><span class="gn"><b>Purchase</b> <small class="gtm">${hm(ts0) === hm(Math.max(...L.map(r => r.ts))) ? hm(ts0) : hm(ts0) + ' – ' + hm(Math.max(...L.map(r => r.ts)))}</small></span> · ${L.length} barang · ${NF(tot)} pcs
          <span class="gt">${sjs.length ? '<span class="tag">SJ ' + esc(sjs.join(', ')) + '</span>' : ''}${L[0].tahap ? '<span class="tag">' + thLbl(L[0].tahap) + '</span>' : ''}${srcs.map(s => '<span class="tag">' + esc(s) + '</span>').join('')}<span class="tag">${esc(adms.join(', ') || '-')}</span><span class="tag ${full ? 'in' : 'out'}">${full ? 'Lengkap' : 'Kurang'}</span></span></span>
        <span class="ga"><button class="btn ghost sm" data-gdl="${esc(k)}" type="button" title="Download grup ini sebagai Excel">Download Excel</button><button class="btn ghost sm" data-gpdf="${esc(k)}" type="button" title="Download grup ini sebagai PDF">Download PDF</button><button class="btn ghost sm" data-gedit="${esc(k)}" type="button">Edit</button><button class="btn sm dng gsep" data-gdel="${esc(k)}" type="button" title="Hapus SEMUA barang dalam grup ini">Hapus grup</button></span></summary>
        <div class="gpb"><div class="gph">Foto surat jalan: ${(() => { const ps = [...new Set(L.map(r => r.pid).filter(Boolean))]; return ps.length ? ps.map(p => '<span>' + esc((L.find(r => r.pid === p) || {}).sj || '') + ' ' + photoCell(p) + '</span>').join(' ') : '-' })()}</div>
        <div class="tw"><table><thead><tr><th>No</th><th>Jam</th><th>No. SJ</th><th>Produk</th><th>Varian</th><th>Ada / Diminta</th><th>Status</th><th>Asal</th><th></th></tr></thead><tbody>${L.map(rowHtml).join('')}</tbody></table></div></div></details>`;
    }).join('');
  };
  const isOpen = (k, cur) => k in openState ? openState[k] : (filt || cur);
  const g = {};
  rows.forEach(r => { const d = ymd(r.ts), y = d.slice(0, 4), m = d.slice(5, 7); ((g[y] = g[y] || {})[m] = g[y][m] || []).push(r) });
  $('#grp').innerHTML = (rows.length ? sumBar([stag('Total grup', NF(new Set(rows.map(gKey)).size)), stag('Total data', NF(rows.length)), stag('Total item', NF(sumK2(latestRec(rows), r => r.ada)) + ' pcs')]) : '') + (rows.length ? Object.keys(g).sort().reverse().map(y => {
    const ms = Object.keys(g[y]).sort().reverse(), cnt = ms.reduce((s, m) => s + g[y][m].length, 0), ky = 'y' + y;
    return `<details class="yr" data-k="${ky}" ${isOpen(ky, y === now.slice(0, 4)) ? 'open' : ''}><summary>${y} <span class="tag">${cnt} data</span></summary>` +
      ms.map(m => { const km = 'm' + y + m; return `<details class="mo" data-k="${km}" ${isOpen(km, y + '-' + m === now.slice(0, 7)) ? 'open' : ''}><summary>${BLN[+m - 1]} ${y} <span class="tag">${g[y][m].length} data</span></summary>${dayBlocks(g[y][m], ymd, 'd', isOpen, d => d === now, tbl)}</details>` }).join('') + '</details>';
  }).join('') : '<div class="empty">Belum ada data purchase.</div>');
}
$('#grp').addEventListener('click', e => { if (e.target.closest('button')) return; const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open } });
FIL.forEach(s => $(s).oninput = renderTable);
$('#fToggle').onclick = () => $('#fl').classList.toggle('open');
$('#reset').onclick = () => { FIL.forEach(s => $(s).value = ''); [$('#fqProd'), $('#fqSj')].forEach(i => i._upd && i._upd()); renderTable() };
$('#grp').onclick = e => {
  const t = e.target.closest('button') || e.target;
  if (t.dataset.gdl) return puExcel(gItems(t.dataset.gdl));
  if (t.dataset.gpdf) return puPdf(gItems(t.dataset.gpdf));
  if (t.dataset.gedit) return openGEdit(t.dataset.gedit);
  if (t.dataset.gdel) return delGroup(t.dataset.gdel);
  if (t.dataset.edit) openEdit(t.dataset.edit);
  if (t.dataset.del) {
    const id0 = t.dataset.del, r0 = records.find(x => x.id === id0); if (!r0) return;
    askYN('Yakin menghapus data purchase ' + r0.prod + (r0.vn ? ' · ' + r0.vn : '') + ' (' + r0.ada + ' pcs)?', () => {
      const r = records.find(x => x.id === id0); if (!r) return;
      const lop = logH('PURCHASE', 'hapus', r.prod + (r.vn ? ' · ' + r.vn : '') + ' · ' + r.ada + ' / ' + r.min + ' pcs · ' + r.src + (r.sj ? ' · SJ ' + r.sj : ''), [{ c: 'records', b: cl(r), a: null }]);
      records = records.filter(x => x !== r);
      const ops = [['records', 'del', r.id], lop];
      if (r.pid && !records.some(x => x.pid === r.pid) && !hKeep(r.pid)) { ops.push(['photos', 'del', r.pid]); delete photos[r.pid] }
      commit(ops); renderTable();
    });
  }
  if (t.classList.contains('thumb')) { $('#lb img').src = t.src; $('#lb').hidden = false }
  const pb = t.closest && t.closest('[data-photo]');
  if (pb) { // foto diambil dari server hanya saat diminta (hemat kuota baca)
    const pid = pb.dataset.photo; pb.disabled = true; pb.textContent = 'Memuat...';
    photoLoad(pid, d => { if (d) { $('#lb img').src = d; $('#lb').hidden = false; renderTable() } else { pb.disabled = false; pb.textContent = 'Foto tidak ditemukan' } });
  }
};
$('#lb').onclick = () => $('#lb').hidden = true;

/* ---------- aksi per grup Purchase: Download / Edit / Hapus ---------- */
const gLab = L => L.length + ' barang (' + L.slice(0, 3).map(r => r.prod + (r.vn ? ' · ' + r.vn : '')).join(', ') + (L.length > 3 ? ', dst.' : '') + ')';
function delGroup(k) {
  const L0 = gItems(k); if (!L0.length) return; puInfo();
  askYN('HAPUS SEMUA BARANG DALAM GRUP INI? ' + L0.length + ' barang akan terhapus sekaligus: ' + L0.map(r => r.prod + (r.vn ? ' · ' + r.vn : '') + ' (' + gotOf(r) + ' pcs)').join('; ') + '. Untuk menghapus satu barang saja, buka grupnya lalu pakai tombol "Hapus barang".', () => {
    const L = gItems(k); if (!L.length) return;
    const lop = logH('PURCHASE', 'hapus', 'Grup input · ' + gLab(L) + (L[0].sj ? ' · SJ ' + L[0].sj : ''), L.map(r => ({ c: 'records', b: cl(r), a: null })));
    const ids = new Set(L.map(r => r.id)), pids = [...new Set(L.map(r => r.pid).filter(Boolean))], ops = L.map(r => ['records', 'del', r.id]);
    ops.push(lop); records = records.filter(r => !ids.has(r.id));
    pids.forEach(p => { if (!records.some(x => x.pid === p) && !hKeep(p)) { ops.push(['photos', 'del', p]); delete photos[p] } });
    commit(ops); renderTable();
  });
}
let gEd = null;
function gpItems() {
  if (!gEd) return;
  puInfo();
  const L = gItems(gEd.k).sort((a, b) => a.ts - b.ts || a.prod.localeCompare(b.prod, 'id'));
  $('#gpList').innerHTML = L.map(r => `<div class="gpi"><span>${r.vc ? sw(r.vc, r.vn) + ' ' : ''}<b>${esc(r.prod)}</b>${r.vn ? ' · ' + esc(r.vn) : ''} · ${gotOf(r)} / ${r.min} pcs <small class="tm">${hm(r.ts)}${r.sj ? ' · SJ ' + esc(r.sj) : ''}</small></span><button class="btn ghost sm" data-gpe="${r.id}" type="button">Edit barang</button></div>`).join('');
}
function openGEdit(k) {
  const L = gItems(k); if (!L.length) return;
  gEd = { k };
  $('#gpInfo').textContent = 'Purchase ' + (L[0].tahap ? thLbl(L[0].tahap) + ' · ' : '') + L[0].src + ' · ' + dLong(L[0].ts) + ' · ' + L.length + ' barang. Pilih barang yang ingin diedit (jumlah, No. Surat Jalan, tanggal / jam, foto).';
  gpItems(); $('#gpmdl').hidden = false;
}
const closeGEdit = () => { $('#gpmdl').hidden = true; gEd = null };
$('#gpCancel').onclick = closeGEdit;
$('#gpmdl').onclick = e => { if (e.target.id === 'gpmdl') closeGEdit(); const b = e.target.closest('[data-gpe]'); if (b) { const id = b.dataset.gpe; closeGEdit(); openEdit(id) } };

/* ---------- edit (popup) ---------- */
let eRec = null, eFoto, eList = [];
const photoWait = {}; // foto satu per satu: photos[pid] === undefined (belum diambil), '' (tidak ada), atau data gambar
function photoLoad(pid, cb) {
  if (!pid) return cb('');
  if (photos[pid] !== undefined) return cb(photos[pid]);
  if (!db) return cb('');
  (photoWait[pid] = photoWait[pid] || []).push(cb); if (photoWait[pid].length > 1) return;
  db.collection('photos').doc(pid).get().then(s => s.exists ? s.data().d || '' : '').catch(e => { failSync(e); return null })
    .then(d => { const q = photoWait[pid]; delete photoWait[pid]; if (d !== null) photos[pid] = d; q.forEach(f => f(d || '')) });
}
const eSwatch = () => { const v = eList[$('#eVar').value]; $('#eSw').style.background = v ? v.c : 'transparent' };
function fillEVar(name, vn, vc) {
  const p = products.find(x => x.name === name);
  eList = p ? p.variants.slice() : [];
  let idx = eList.findIndex(v => v.n === vn && v.c === vc);
  if (vn && idx < 0) { eList.unshift({ n: vn, c: vc }); idx = 0 }
  $('#eVar').innerHTML = '<option value="">— tanpa varian —</option>' + eList.map((v, i) => `<option value="${i}">${esc(v.n)}</option>`).join('');
  $('#eVar').value = idx >= 0 ? idx : ''; eSwatch();
}
function openEdit(id) {
  const r = eRec = records.find(x => x.id === id); eFoto = undefined;
  const names = products.map(p => p.name); if (!names.includes(r.prod)) names.unshift(r.prod);
  $('#eProd').innerHTML = names.map(n => `<option>${esc(n)}</option>`).join(''); $('#eProd').value = r.prod;
  fillEVar(r.prod, r.vn, r.vc);
  $('#eDate').value = ymd(r.ts); $('#eTime').value = hm(r.ts); $('#eAdm').value = r.adm || ''; $('#eSj').value = r.sj || ''; $('#eAda').value = r.ada; $('#eMin').value = r.min; $('#eSrc').value = r.src;
  ePF.set(photos[r.pid]);
  if (r.pid && photos[r.pid] === undefined) photoLoad(r.pid, d => { if (eRec === r && eFoto === undefined && !$('#mdl').hidden) ePF.set(d) });
  $('#eCode').value = ''; msg('#eMsg', ''); $('#mdl').hidden = false;
}
$('#eProd').onchange = () => fillEVar($('#eProd').value, '', '');
$('#eVar').onchange = eSwatch;
const ePF = photoField($('#mdl'), d => { eFoto = d });
const closeEdit = () => { $('#mdl').hidden = true; eRec = null };
$('#eCancel').onclick = closeEdit;
$('#eSave').onclick = () => {
  const a = parseInt($('#eAda').value, 10), m = parseInt($('#eMin').value, 10), d = $('#eDate').value;
  if (!d) return msg('#eMsg', 'Isi tanggal.');
  if ($('#eTime').value && !T24.test($('#eTime').value)) return msg('#eMsg', 'Isi jam dengan format 24 jam, mis. 14:30.');
  if (isNaN(a) || a < 0 || !(m >= 1)) return msg('#eMsg', 'Isi quantity dengan angka yang benar.');
  if (a > m) return msg('#eMsg', 'Barang ada tidak boleh melebihi barang diminta.');
  const r = records.find(x => x.id === eRec.id) || eRec, v = eList[$('#eVar').value], old = r.pid, ops = [];
  const sibs = records.filter(x => x.rid && x.rid === r.rid && x.id !== r.id), mx = Math.max(a, ...sibs.map(x => x.ada));
  if (r.rid && m < mx) return msg('#eMsg', 'Diminta tidak boleh kurang dari barang ada pada penerimaan terkait (' + mx + ').');
  if ((d !== ymd(r.ts) || ($('#eTime').value.trim() || hm(r.ts)) !== hm(r.ts)) && !codeOk('#eCode')) return msg('#eMsg', 'Mengubah tanggal / jam wajib memakai kode 6 digit yang benar.');
  const bRec = cl(r), bRq = cl(r.rid && reqs.find(x => x.id === r.rid)), bSib = sibs.map(cl);
  Object.assign(r, { ts: new Date(d + 'T' + ($('#eTime').value || hm(r.ts))).getTime(), sj: $('#eSj').value.trim(), prod: $('#eProd').value, vn: v ? v.n : '', vc: v ? v.c : '', ada: a, min: m, src: $('#eSrc').value, adm: $('#eAdm').value });
  if (a !== bRec.ada) delete r.got;
  const rq = r.rid && reqs.find(x => x.id === r.rid);
  if (rq) { // sinkron ke form Pengajuan
    const f = { prod: r.prod, vn: r.vn, vc: r.vc, min: r.min, src: r.src, adm: r.adm }, pp = products.find(x => x.name === r.prod);
    Object.assign(rq, f, { ada: mx }); if (pp) rq.pid = pp.id; ops.push(['requests', 'set', rq]);
    sibs.forEach(x => { Object.assign(x, f); ops.push(['records', 'set', x]) });
  }
  if (eFoto !== undefined) {
    if (eFoto) { r.pid = uid(); photos[r.pid] = eFoto; ops.push(['photos', 'set', { id: r.pid, d: eFoto }]) } else r.pid = '';
  }
  ops.push(['records', 'set', r]);
  ops.push(logH('PURCHASE', 'edit', bRec.prod + (bRec.vn ? ' · ' + bRec.vn : '') + (bRec.sj ? ' · SJ ' + bRec.sj : ''),
    [{ c: 'records', b: bRec, a: cl(r) }].concat(bRq ? [{ c: 'requests', b: bRq, a: cl(reqs.find(x => x.id === bRq.id)) }] : [], bSib.map(b => ({ c: 'records', b, a: cl(records.find(x => x.id === b.id)) })))));
  if (old && old !== r.pid && !records.some(x => x.pid === old) && !hKeep(old)) { ops.push(['photos', 'del', old]); delete photos[old] }
  if (!commit(ops)) return msg('#eMsg', 'Penyimpanan penuh. Coba foto yang lebih kecil.');
  closeEdit(); renderTable(); renderReqs();
};
$('#mdl').onclick = e => { if (e.target.id === 'mdl') closeEdit() };

/* ---------- export ---------- */
const stDesc = r => isFull(r) ? 'Lengkap' : 'Kurang';
function puHead(rows) {
  const f = dtVal('#dFrom'), t = dtVal('#dTo', true);
  const tgl = !f && !t ? 'Semua tanggal' : f && t ? fDT(f) + ' s/d ' + fDT(t) : f ? 'Mulai ' + fDT(f) : 'Sampai ' + fDT(t);
  return { title: 'Laporan Purchase', tgl: 'Tanggal & Jam: ' + tgl, asal: 'Asal Barang: ' + ($('#fqSrc').value || 'Semua'), adm: 'Nama Admin: ' + admHead(rows) };
}
// Export Purchase: SETIAP GRUP (satu kali Input) = satu header + satu tabel sendiri; antar tabel diberi jarak 5 baris kosong
const PU_COLS = ['No.', 'Tanggal', 'No. Surat Jalan', 'Nama Produk', 'Varian', 'Ada / Diminta', 'Status', 'Asal'];
const dLong = t => { const d = new Date(t); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() };
function puSections(rows) {
  puInfo();
  const m = new Map(); rows.forEach(r => { const k = gKey(r); (m.get(k) || m.set(k, []).get(k)).push(r) });
  return [...m.values()].map(L => {
    L = L.slice().sort(azSort);
    const t0 = Math.min(...L.map(r => r.ts)), t1 = Math.max(...L.map(r => r.ts)), srcs = [...new Set(L.map(r => r.src))];
    return { t0, src: srcs.length === 1 ? srcs[0] : '', th: L[0].tahap ? String(L[0].tahap) : '',
      head: ['Laporan Purchase', 'Tanggal & Jam: ' + dLong(t0) + ' - ' + dLong(t1), 'Asal Barang: ' + srcs.join(', ') + '     Nama Admin: ' + admHead(L), 'Pengajuan : ' + (L[0].tahap ? thLbl(L[0].tahap) : '-')],
      rows: L.map((r, i) => [i + 1, tsFmt(r.ts), r.sj || '-', r.prod, r.vn || '-', gotOf(r) + ' / ' + r.min + ' pcs', stDesc(r), r.src]) };
  }).sort((a, b) => a.t0 - b.t0);
}
function puLog(rows, S, fmtName, fn) {
  const srcs = [...new Set(rows.map(r => r.src))], ths = [...new Set(S.map(s => s.th))];
  logDl({ form: 'PURCHASE', fmt: fmtName, fname: fn, src: srcs.length === 1 ? srcs[0] : '', th: ths.length === 1 ? ths[0] : '', title: 'Laporan Purchase', tgl: S.length + ' grup · ' + dLong(S[0].t0) + ' - ' + dLong(Math.max(...rows.map(r => r.ts))), cols: PU_COLS, rows: S.reduce((a, s) => a.concat(s.rows), []) });
}
const puFn = (rows, ext) => { const srcs = [...new Set(rows.map(r => r.src))]; return fileName(srcs.length === 1 ? srcs[0] : '', admFile(rows), 'PURCHASE', ext) };
function puExcel(rows) {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const S = puSections(rows), aoa = [], merges = [];
  S.forEach((s, i) => {
    if (i) for (let n = 0; n < 5; n++) aoa.push([]);
    s.head.forEach(h => { merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: 7 } }); aoa.push([h]) });
    aoa.push(PU_COLS); s.rows.forEach(x => aoa.push(x));
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges; ws['!cols'] = [6, 18, 20, 30, 16, 16, 10, 10].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Purchase');
  const fn = puFn(rows, 'xlsx'); XLSX.writeFile(wb, fn); puLog(rows, S, 'Excel', fn);
}
function puPdf(rows) {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const S = puSections(rows), doc = new jspdf.jsPDF({ orientation: 'landscape' }), H = doc.internal.pageSize.getHeight();
  let y = 15;
  S.forEach((s, i) => {
    if (i) y += 30; // jarak 5 baris
    if (y + 50 > H - 10) { doc.addPage(); y = 15 }
    doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text(s.head[0], 14, y);
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    s.head.slice(1).forEach((h, j) => doc.text(h, 14, y + 7 + j * 6));
    doc.autoTable({ startY: y + 7 + 3 * 6 + 3, headStyles: { fillColor: [74, 123, 208] }, head: [PU_COLS], body: s.rows });
    y = doc.lastAutoTable.finalY;
  });
  const fn = puFn(rows, 'pdf'); doc.save(fn); puLog(rows, S, 'PDF', fn);
}
$('#xXls').onclick = () => puExcel(filtered());
$('#xPdf').onclick = () => puPdf(filtered());

/* ---------- DOWNLOAD (riwayat export) ---------- */
// Setiap export dicatat beserta isi datanya (snapshot). Tabel berlapis disimpan sebagai teks JSON karena Firestore tidak menerima array di dalam array.
function logDl(o) {
  try {
    const rec = { id: uid(), ts: Date.now(), fname: o.fname, fmt: o.fmt, form: o.form, adm: me ? me.name : '', src: o.src || 'Semua', th: o.th || '',
      data: JSON.stringify({ title: o.title, tgl: o.tgl, cols: o.cols, rows: o.rows, subs: o.subs }) };
    downloads.unshift(rec); commit([['downloads', 'set', rec]]);
    if ($('#dl').classList.contains('on')) renderDl();
  } catch (e) { console.error('catat download', e) }
}
const DLF = ['#dlFromD', '#dlFromT', '#dlToD', '#dlToT', '#dlTh', '#dlSrc', '#dlAdm', '#dlFmt', '#dlForm', '#dlFile'];
function dlFiltered() { // dipakai oleh daftar di layar DAN export; terbaru di atas
  const f = dtv(dtVal('#dlFrom')), t = dtv(dtVal('#dlTo', true), true), th = $('#dlTh').value, s = $('#dlSrc').value, am = admF('#dlAdm'),
    m = $('#dlFmt').value, fm = $('#dlForm').value, q = $('#dlFile').value.trim().toLowerCase();
  return downloads.filter(r => mine(r) && (f === null || r.ts >= f) && (t === null || r.ts <= t) && (!th || r.th === th) && (!s || r.src === s) && (!am || (r.adm || '') === am)
    && (!m || r.fmt === m) && (!fm || r.form === fm) && (!q || String(r.fname).toLowerCase().includes(q))).sort((x, y) => y.ts - x.ts);
}
const dlTbl = list => `<div class="tw"><table><thead><tr><th>No</th><th>Waktu Download</th><th>Nama File</th><th>Format</th><th>Admin</th><th>Asal</th><th></th></tr></thead><tbody>${list.map((r, i) => `<tr>
    <td>${i + 1}</td><td>${fmt(r.ts)}${tm(r.ts)}</td><td>${esc(r.fname)}</td><td><span class="tag">${esc(r.fmt)}</span></td><td>${esc(r.adm || '-')}</td><td><span class="tag">${esc(r.src)}</span></td><td class="nw"><button class="btn ghost sm" data-dledit="${r.id}">Edit</button> <button class="btn ghost sm" data-dldel="${r.id}">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
function renderDl() { // hari ini di atas; hari sebelumnya masuk Riwayat per tahun > bulan > tanggal (tertutup)
  const all = dlFiltered(), today = dayWIB(Date.now()), filt = DLF.some(x => $(x).value);
  const tr = all.filter(r => dayWIB(r.ts) === today), hr = all.filter(r => dayWIB(r.ts) !== today), g = {};
  hr.forEach(r => { const d = dayWIB(r.ts), y = d.slice(0, 4), m = d.slice(5, 7); ((g[y] = g[y] || {})[m] = g[y][m] || []).push(r) });
  const isOpen = (k, dflt) => k in openState ? openState[k] : (filt || dflt);
  let html = sumDl(all) + '<div class="dayh">Hari ini <span class="tag">' + tr.length + ' data</span></div>' + (tr.length ? dlTbl(tr) : '<div class="empty">Belum ada download hari ini.</div>');
  if (hr.length) {
    html += '<div class="dayh" style="margin-top:24px">Riwayat <span class="tag">' + hr.length + ' data</span></div>' + Object.keys(g).sort().reverse().map(y => {
      const ms = Object.keys(g[y]).sort().reverse(), cnt = ms.reduce((s, m) => s + g[y][m].length, 0), ky = 'ly' + y;
      return `<details class="yr" data-k="${ky}" ${isOpen(ky, y === today.slice(0, 4)) ? 'open' : ''}><summary>${y} <span class="tag">${cnt} data</span></summary>` +
        ms.map(m => { const km = 'lm' + y + m; return `<details class="mo" data-k="${km}" ${isOpen(km, false) ? 'open' : ''}><summary>${BLN[+m - 1]} ${y} <span class="tag">${g[y][m].length} data</span></summary>${dayBlocks(g[y][m], dayWIB, 'ld', isOpen, d => false, dlTbl)}</details>` }).join('') + '</details>';
    }).join('');
  }
  $('#dlGrp').innerHTML = html;
}
$('#dlGrp').addEventListener('click', e => { const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open } });
DLF.forEach(x => { $(x).addEventListener('input', renderDl); $(x).addEventListener('change', renderDl) });
$('#dlReset').onclick = () => { DLF.forEach(x => $(x).value = ''); $('#dlFile')._upd && $('#dlFile')._upd(); renderDl() };
// hapus riwayat download: wajib kode verifikasi
const DL_CODE = '030201';
let dDel = null;
const closeD = () => { $('#dmdl').hidden = true; dDel = null };
$('#dlGrp').addEventListener('click', e => {
  const ed = e.target.closest('[data-dledit]'); if (ed) return openLEdit(ed.dataset.dledit);
  const b = e.target.closest('[data-dldel]'); if (!b) return;
  const r = downloads.find(x => x.id === b.dataset.dldel); if (!r) return;
  dDel = r.id; $('#dInfo').textContent = r.fname; $('#dCode').value = ''; msg('#dMsg', ''); $('#dmdl').hidden = false; $('#dCode').focus();
});
function doDelDl() {
  if (!dDel) return;
  if ($('#dCode').value.trim() !== DL_CODE) return msg('#dMsg', 'Kode verifikasi salah.');
  const id = dDel, r0 = downloads.find(x => x.id === id), ops = [['downloads', 'del', id]];
  if (r0) ops.push(logH('DOWNLOAD', 'hapus', r0.fname + ' (' + r0.fmt + ')', [{ c: 'downloads', b: cl(r0), a: null }]));
  downloads = downloads.filter(x => x.id !== id);
  commit(ops); closeD(); renderDl();
}
$('#dOk').onclick = doDelDl; $('#dCancel').onclick = closeD;
$('#dCode').addEventListener('keydown', e => { if (e.key === 'Enter') doDelDl() });
$('#dmdl').addEventListener('mousedown', e => { if (e.target === $('#dmdl')) closeD() });
const dlData = r => { try { return JSON.parse(r.data) || {} } catch (e) { return {} } };
// header tiap file: Nama Admin & Asal Barang, lalu info file
const dlHead = (r, d) => ['Nama Admin: ' + (r.adm || '-'), 'Asal Barang: ' + r.src, 'File: ' + r.fname + ' (' + r.fmt + ') - diunduh ' + tsFmt(r.ts), (d.title || '') + (d.tgl ? ' - ' + d.tgl : '')];
// export gabungan: file terlama -> terbaru; tiap file = header + isi data file tersebut, lalu terpotong ke file berikutnya
// baris isi + baris data yang termerge (jam input) tepat di bawah baris induknya
const dlRows = (d, pre) => {
  const out = [];
  (d.rows || []).forEach((x, i) => {
    out.push({ v: x, sub: false });
    ((d.subs || [])[i] || []).forEach(z => out.push({ v: x.map((_, c) => c === 1 ? z[0] : c === 2 ? pre + x[2] : c === 3 ? x[3] : c === 4 ? z[1] + ' / ' + z[2] + ' pcs' : c === 5 ? x[5] : c === 6 ? x[6] : ''), sub: true }));
  });
  return out;
};
async function dlExcelJS(rows, fn) { // Excel bergaya: data termerge berwarna & berukuran 2/3
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('Riwayat Download'), wd = [];
  const SF = { name: 'Calibri', size: 7.5, color: { argb: 'FF3A66B4' } }, FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEBF9' } };
  rows.forEach((r, i) => {
    const d = dlData(r), cols = d.cols || [], n = Math.max(1, cols.length);
    if (i) { ws.addRow([]); ws.addRow([]) }
    dlHead(r, d).forEach(t => { const w = ws.addRow([t]); if (n > 1) ws.mergeCells(w.number, 1, w.number, n); w.font = { bold: true } });
    ws.addRow([]);
    const hr = ws.addRow(cols); hr.font = { bold: true }; hr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EBF9' } } });
    const fl = dlRows(d, '\u21B3 ');
    [{ v: cols }].concat(fl).forEach(o => o.v.forEach((v, c) => { wd[c] = Math.min(40, Math.max(wd[c] || 6, String(v == null ? '' : v).length + 2)) }));
    fl.forEach(o => {
      const w = ws.addRow(o.v);
      if (o.sub) { w.height = 12; w.eachCell({ includeEmpty: true }, (c, k) => { if (k <= n) { c.fill = FILL; c.font = SF } }) }
    });
  });
  wd.forEach((w, c) => ws.getColumn(c + 1).width = w);
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a'); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}
$('#dlXls').onclick = async () => {
  const rows = dlFiltered().reverse();
  if (!rows.length) return alert('Tidak ada riwayat download pada filter itu.');
  const fn = fileName($('#dlSrc').value, '', 'RIWAYAT DOWNLOAD', 'xlsx');
  if (window.ExcelJS) { try { return await dlExcelJS(rows, fn) } catch (e) { console.error(e); alert('Export bergaya gagal, memakai format Excel biasa (tanpa warna).') } }
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const aoa = [], merges = [], wd = [];
  rows.forEach((r, i) => { // cadangan: tanpa warna/ukuran
    const d = dlData(r), cols = d.cols || [], n = Math.max(1, cols.length), fl = dlRows(d, '\u21B3 ');
    if (i) aoa.push([], []);
    dlHead(r, d).forEach(t => { if (n > 1) merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: n - 1 } }); aoa.push([t]) });
    aoa.push([], cols);
    [{ v: cols }].concat(fl).forEach(o => o.v.forEach((v, c) => { wd[c] = Math.min(40, Math.max(wd[c] || 6, String(v == null ? '' : v).length + 2)) }));
    fl.forEach(o => aoa.push(o.v));
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges; ws['!cols'] = wd.map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Download');
  XLSX.writeFile(wb, fn);
};
$('#dlPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const rows = dlFiltered().reverse(); if (!rows.length) return alert('Tidak ada riwayat download pada filter itu.');
  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  rows.forEach((r, i) => {
    const d = dlData(r), H = dlHead(r, d), fl = dlRows(d, '- ');
    if (i) doc.addPage();
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(H[0] + '     ' + H[1], 14, 15);
    doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.text(H[2], 14, 22); doc.text(H[3], 14, 28);
    doc.autoTable({
      startY: 33, headStyles: { fillColor: [74, 123, 208] },
      head: [d.cols || []], body: fl.map(o => o.v.map(v => v === '\u2610' ? '' : v)),
      didParseCell: c => { // data termerge: warna beda, ukuran 2/3 dari baris induk
        if (c.section === 'body' && fl[c.row.index] && fl[c.row.index].sub) { c.cell.styles.fontSize = 10 * 2 / 3; c.cell.styles.textColor = [58, 102, 180]; c.cell.styles.fillColor = [220, 235, 249]; c.cell.styles.cellPadding = 1.2 }
      },
      didDrawCell: c => {
        if (c.section !== 'body' || ((fl[c.row.index] || { v: [] }).v[c.column.index]) !== '\u2610') return;
        const z = 4.5; doc.setDrawColor(60); doc.setLineWidth(.3);
        doc.rect(c.cell.x + (c.cell.width - z) / 2, c.cell.y + (c.cell.height - z) / 2, z, z);
      }
    });
  });
  doc.save(fileName($('#dlSrc').value, '', 'RIWAYAT DOWNLOAD', 'pdf'));
};

/* ---------- RIWAYAT (edit & hapus, bisa dipulihkan) ---------- */
const EDIT_CODE = '030201';
const codeOk = id => $(id).value.trim() === EDIT_CODE;
const cl = o => o ? JSON.parse(JSON.stringify(o)) : null;
const hKeep = pid => hlog.some(h => (h.pids || []).includes(pid)); // foto yang masih dipakai riwayat jangan dihapus
const FLD = { ts: 'Waktu', prod: 'Produk', vn: 'Varian', min: 'Diminta', ada: 'Ada', src: 'Asal', tahap: 'Tahap', adm: 'Admin', sj: 'No. SJ', pid: 'Foto', hist: 'Rincian input', fname: 'Nama file', resi: 'Resi', oid: 'ID Pesanan', tiket: 'No Tiket', desk: 'Deskripsi', dueT: 'Tipe due', due: 'Due Date', status: 'Status', toko: 'Toko', mp: 'Marketplace', ket: 'Keterangan', name: 'Nama', qty: 'Qty', cond: 'Kondisi', note: 'Catatan' };
const fv = (k, v) => v == null || v === '' ? '-' : k === 'ts' ? tsFmt(v) : k === 'pid' ? 'ada' : typeof v === 'object' ? '' : String(v);
function diffTxt(b, a) { // ringkasan perubahan: "Diminta: 10 → 15; Waktu: ... → ..."
  const out = [];
  Object.keys(FLD).forEach(k => { if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out.push(k === 'hist' ? 'Rincian input diubah' : FLD[k] + ': ' + fv(k, b[k]) + ' → ' + fv(k, a[k])) });
  return out.join('; ');
}
// docs: [{c: koleksi, b: kondisi sebelum (atau null), a: kondisi sesudah (atau null jika dihapus)}]. Mengembalikan op untuk dimasukkan ke commit().
function logH(menu, act, label, docs) {
  docs = docs.filter(d => d && (d.b || d.a));
  const m = docs[0], e = { id: uid(), ts: Date.now(), menu, act, adm: me ? me.name : '', label, th: String(((m && (m.b || m.a)) || {}).tahap || ''), diff: m && m.b && m.a ? diffTxt(m.b, m.a) : '', docs: JSON.stringify(docs), rest: 0,
    pids: docs.filter(d => d.c === 'records' && d.b && d.b.pid).map(d => d.b.pid) };
  hlog.unshift(e);
  return ['hlog', 'set', e];
}
const histDocs = (bR, bRec, r) => [{ c: 'requests', b: bR, a: cl(r) }].concat(bRec.map(b => ({ c: 'records', b, a: cl(records.find(x => x.id === b.id)) })));
// popup Yakin / Batal
let yCb = null;
function askYN(text, cb) { $('#yText').textContent = text; yCb = cb; $('#ymdl').hidden = false }
$('#yYes').onclick = () => { $('#ymdl').hidden = true; const f = yCb; yCb = null; f && f() };
$('#yNo').onclick = () => { $('#ymdl').hidden = true; yCb = null };
$('#ymdl').addEventListener('mousedown', e => { if (e.target === $('#ymdl')) { $('#ymdl').hidden = true; yCb = null } });
// popup kode 6 digit
let kCb = null;
function askCode(title, info, cb) { $('#kTitle').textContent = title; $('#kInfo').textContent = info; $('#kCode').value = ''; msg('#kMsg', ''); kCb = cb; $('#kmdl').hidden = false; $('#kCode').focus() }
function kGo() { if (!codeOk('#kCode')) return msg('#kMsg', 'Kode salah.'); $('#kmdl').hidden = true; const f = kCb; kCb = null; f && f() }
$('#kOk').onclick = kGo; $('#kCancel').onclick = () => { $('#kmdl').hidden = true; kCb = null };
$('#kCode').addEventListener('keydown', e => { if (e.key === 'Enter') kGo() });
// edit waktu download
let lEd = null;
function openLEdit(id) {
  const r = downloads.find(x => x.id === id); if (!r) return;
  lEd = id; $('#lInfo').textContent = r.fname; $('#lD').value = ymd(r.ts); $('#lT').value = hm(r.ts); $('#lCode').value = ''; msg('#lMsg', ''); $('#lmdl').hidden = false;
}
const closeL = () => { $('#lmdl').hidden = true; lEd = null };
$('#lCancel').onclick = closeL; $('#lmdl').addEventListener('mousedown', e => { if (e.target === $('#lmdl')) closeL() });
$('#lSave').onclick = () => {
  const r = downloads.find(x => x.id === lEd); if (!r) return closeL();
  const d = $('#lD').value, t = $('#lT').value.trim();
  if (!d || !T24.test(t)) return msg('#lMsg', 'Isi tanggal dan jam (format 24 jam, mis. 14:30).');
  if (d === ymd(r.ts) && t === hm(r.ts)) return closeL();
  if (!codeOk('#lCode')) return msg('#lMsg', 'Mengubah tanggal / jam wajib memakai kode 6 digit yang benar.');
  const b = cl(r); r.ts = new Date(d + 'T' + t).getTime();
  commit([['downloads', 'set', r], logH('DOWNLOAD', 'edit', r.fname, [{ c: 'downloads', b, a: cl(r) }])]); closeL(); renderDl();
};
// halaman Riwayat
const RWF = ['#rwFromD', '#rwFromT', '#rwToD', '#rwToT', '#rwMenu', '#rwAct', '#rwTh', '#rwSt', '#rwQ'];
function rwFiltered() {
  const f = dtv(dtVal('#rwFrom')), t = dtv(dtVal('#rwTo', true), true), m = $('#rwMenu').value, a = $('#rwAct').value, th = $('#rwTh').value, st = $('#rwSt').value, q = $('#rwQ').value.trim().toLowerCase();
  return hlog.filter(h => mine(h) && (f === null || h.ts >= f) && (t === null || h.ts <= t) && (!m || h.menu === m) && (!a || h.act === a) && (!th || h.th === th)
    && (!st || (st === 'pulih' ? !!h.rest : !h.rest)) && (!q || (h.label + ' ' + (h.diff || '')).toLowerCase().includes(q))).sort((x, y) => y.ts - x.ts);
}
const rwTbl = list => `<div class="tw"><table><thead><tr><th>No</th><th>Waktu</th><th>Menu</th><th>Aksi</th><th>Admin</th><th>Rincian</th><th>Status</th><th></th></tr></thead><tbody>${list.map((h, i) => `<tr>
  <td>${i + 1}</td><td>${fmt(h.ts)}${tm(h.ts)}</td><td><span class="tag">${esc(h.menu)}</span></td><td><span class="tag ${h.act === 'hapus' ? 'del' : 'ed'}">${h.act === 'hapus' ? 'Dihapus' : 'Diedit'}</span></td><td>${esc(h.adm || '-')}</td>
  <td><b>${esc(h.label)}</b>${h.diff ? '<div class="tm">' + esc(h.diff) + '</div>' : ''}</td><td>${h.rest ? '<span class="tag">Dipulihkan ' + fmt(h.rest) + '</span>' : '-'}</td>
  <td class="nw">${h.rest ? '' : `<button class="btn ghost sm" data-rwrest="${h.id}">Pulihkan</button> `}<button class="btn ghost sm" data-rwdel="${h.id}">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
function renderRw() {
  const all = rwFiltered(), today = dayWIB(Date.now()), filt = RWF.some(x => $(x).value);
  const tr = all.filter(r => dayWIB(r.ts) === today), hr = all.filter(r => dayWIB(r.ts) !== today), g = {};
  hr.forEach(r => { const d = dayWIB(r.ts), y = d.slice(0, 4), m = d.slice(5, 7); ((g[y] = g[y] || {})[m] = g[y][m] || []).push(r) });
  const isOpen = (k, dflt) => k in openState ? openState[k] : (filt || dflt);
  let html = sumRw(all) + '<div class="dayh">Hari ini <span class="tag">' + tr.length + ' data</span></div>' + (tr.length ? rwTbl(tr) : '<div class="empty">Belum ada perubahan / penghapusan hari ini.</div>');
  if (hr.length) {
    html += '<div class="dayh" style="margin-top:24px">Riwayat <span class="tag">' + hr.length + ' data</span></div>' + Object.keys(g).sort().reverse().map(y => {
      const ms = Object.keys(g[y]).sort().reverse(), cnt = ms.reduce((s, m) => s + g[y][m].length, 0), ky = 'wy' + y;
      return `<details class="yr" data-k="${ky}" ${isOpen(ky, y === today.slice(0, 4)) ? 'open' : ''}><summary>${y} <span class="tag">${cnt} data</span></summary>` +
        ms.map(m => { const km = 'wm' + y + m; return `<details class="mo" data-k="${km}" ${isOpen(km, false) ? 'open' : ''}><summary>${BLN[+m - 1]} ${y} <span class="tag">${g[y][m].length} data</span></summary>${dayBlocks(g[y][m], dayWIB, 'wd', isOpen, d => false, rwTbl)}</details>` }).join('') + '</details>';
    }).join('');
  }
  $('#rwGrp').innerHTML = html;
}
function applyDocs(docs) { // kembalikan tiap dokumen ke kondisi "sebelum"
  const ops = [];
  docs.forEach(d => {
    const arr = d.c === 'requests' ? reqs : d.c === 'records' ? records : d.c === 'downloads' ? downloads : d.c === 'returns' ? returns : d.c === 'pstock' ? pstock : d.c === 'rgoods' ? rgoods : null; if (!arr) return;
    if (!d.b) { if (d.a) { const j = arr.findIndex(x => x.id === d.a.id); if (j >= 0) arr.splice(j, 1); ops.push([d.c, 'del', d.a.id]) } return } // data yang dibuat oleh perubahan itu dibatalkan
    const i = arr.findIndex(x => x.id === d.b.id), o = cl(d.b);
    i >= 0 ? arr[i] = o : arr.push(o); ops.push([d.c, 'set', o]);
  });
  return ops;
}
function restoreH(id) {
  const h = hlog.find(x => x.id === id); if (!h || h.rest) return;
  let docs; try { docs = JSON.parse(h.docs) } catch (e) { return alert('Data riwayat rusak, tidak bisa dipulihkan.') }
  const ops = applyDocs(docs); h.rest = Date.now(); ops.push(['hlog', 'set', h]);
  commit(ops); renderRw(); renderReqs(); renderTable(); renderDl(); renderBd(); refresh();
}
function purgeH(id) {
  const h = hlog.find(x => x.id === id); if (!h) return;
  hlog = hlog.filter(x => x.id !== id);
  const ops = [['hlog', 'del', id]];
  (h.pids || []).forEach(p => { if (p && !records.some(x => x.pid === p) && !hKeep(p)) { ops.push(['photos', 'del', p]); delete photos[p] } });
  commit(ops); renderRw();
}
$('#rwGrp').addEventListener('click', e => {
  const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open; return }
  const r = e.target.closest('[data-rwrest]'), d = e.target.closest('[data-rwdel]');
  const h = hlog.find(x => x.id === (r ? r.dataset.rwrest : d && d.dataset.rwdel)); if (!h) return;
  if (r) askCode('Pulihkan data', (h.act === 'hapus' ? 'Data yang dihapus akan dikembalikan: ' : 'Data dikembalikan ke kondisi sebelum diedit (perubahan setelahnya tertimpa): ') + h.label, () => restoreH(h.id));
  if (d) askCode('Hapus riwayat', 'Riwayat ini dihapus permanen dan tidak bisa dipulihkan lagi: ' + h.label, () => purgeH(h.id));
});
RWF.forEach(x => { $(x).addEventListener('input', renderRw); $(x).addEventListener('change', renderRw) });
$('#rwReset').onclick = () => { RWF.forEach(x => $(x).value = ''); $('#rwQ')._upd && $('#rwQ')._upd(); renderRw() };
$$('[data-rwgo]').forEach(b => b.onclick = () => { RWF.forEach(x => $(x).value = ''); $('#rwMenu').value = b.dataset.rwgo; go('rw') });

/* ---------- RETUR (form) & LAPORAN RETUR ---------- */
const stCls = t => ({ 'On Progress': 'prog', Failed: 'fail', Done: 'done', Review: 'rev' }[t] || 'prog');
const dueTxt = r => r.dueT === 'Tanggal' && r.due ? r.due.split('-').reverse().join('-') : 'Cek Berkala';
const dueLate = r => r.dueT === 'Tanggal' && r.due && r.due < dayWIB(Date.now()) && r.status !== 'Done' && r.status !== 'Failed';
const showDue = (sel, wrap, inp, focus) => { const on = $(sel).value === 'Tanggal'; $(wrap).hidden = !on; if (!on) $(inp).value = ''; else if (focus) { $(inp).focus(); try { $(inp).showPicker() } catch (e) { } } };
$('#tDueT').onchange = () => showDue('#tDueT', '#tDueW', '#tDue', true);
$('#tmDueT').onchange = () => showDue('#tmDueT', '#tmDueW', '#tmDue', true);
$('#tSubmit').onclick = () => {
  const resi = UC($('#tResi').value), oid = UC($('#tOid').value), dueT = $('#tDueT').value, due = $('#tDue').value;
  if (!resi) return msg('#tMsg', 'RESI PENGEMBALIAN wajib diisi.');
  if (!oid) return msg('#tMsg', 'ID PESANAN wajib diisi.');
  if (dueT === 'Tanggal' && !due) return msg('#tMsg', 'Pilih tanggal due date.');
  if (returns.some(x => x.resi === resi && x.oid === oid)) return msg('#tMsg', 'Resi dan ID pesanan ini sudah pernah diinput (lihat Laporan Retur).');
  const rec = { id: uid(), ts: Date.now(), resi, oid, tiket: UC($('#tTiket').value), desk: $('#tDesk').value.trim(), dueT, due: dueT === 'Tanggal' ? due : '',
    status: $('#tStatus').value, toko: $('#tToko').value.trim(), mp: $('#tMp').value, ket: $('#tKet').value.trim(), adm: me ? me.name : '' };
  returns.unshift(rec);
  if (!commit([['returns', 'set', rec]])) return msg('#tMsg', 'Penyimpanan penuh.');
  ['#tResi', '#tOid', '#tTiket', '#tDesk', '#tToko', '#tKet', '#tDue'].forEach(x => $(x).value = '');
  $('#tDueT').value = 'Cek Berkala'; $('#tStatus').value = 'On Progress'; $('#tMp').value = ''; showDue('#tDueT', '#tDueW', '#tDue');
  msg('#tMsg', 'Tersimpan: ' + resi + ' sudah masuk ke menu Laporan Retur.', true); renderBd();
};
/* ---------- input massal retur (Excel / CSV) ---------- */
$('#tTpl').onclick = () => {
  const csv = 'Resi,ID Pesanan,No Tiket,Marketplace,Due Date,Status,Nama Toko,Deskripsi,Keterangan\n'
    + 'SPXID0001,2611ABCDE1,,Shopee,2026-11-20,On Progress,Toko Contoh,Barang rusak,Menunggu konfirmasi seller\n'
    + 'JNT0002,2611ABCDE2,TKT-123,Tiktokshop,Cek Berkala,Review,Toko Contoh,,\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'template-retur.csv'; a.click();
};
const MPS = ['Shopee', 'Tiktokshop', 'Lazada'], STS = ['On Progress', 'Failed', 'Done', 'Review'];
const MON = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12 };
const impStr = v => v instanceof Date ? ymd(v.getTime() + 12 * 36e5) : String(v == null ? '' : v).trim();
const impClean = v => { const s = impStr(v); return /^[-–—]+$/.test(s) ? '' : s }; // "-" dianggap kosong
function impDue(v) { // -> {dueT, due} atau null bila format tidak dikenali
  const mk = (y, mo, d) => { const t = new Date(Date.UTC(y, mo - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { dueT: 'Tanggal', due: y + '-' + p2(mo) + '-' + p2(d) } : null };
  if (v instanceof Date) return { dueT: 'Tanggal', due: ymd(v.getTime() + 12 * 36e5) };
  if (typeof v === 'number') return { dueT: 'Tanggal', due: new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10) }; // nomor seri Excel
  const s = String(v == null ? '' : v).trim();
  if (!s || /^[-–—]+$/.test(s) || /cek\s*berkala/i.test(s)) return { dueT: 'Cek Berkala', due: '' };
  let m = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); if (m) return mk(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/); if (m) return mk(+m[3], +m[2], +m[1]);
  m = s.match(/(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})/); // mis. "Monday, 09 November 2026" / "9 Nov 2026"
  if (m && MON[m[2].toLowerCase()]) return mk(+m[3], MON[m[2].toLowerCase()], +m[1]);
  return null;
}
function impStatus(v) { // kotak centang Excel: dicentang (TRUE) = Done, kosong (FALSE) = On Progress
  if (v === true) return 'Done'; if (v === false) return 'On Progress';
  const s = impStr(v).toLowerCase().replace(/\s+/g, ' ');
  if (!s || s === 'false') return 'On Progress';
  if (s === 'true' || s === 'v' || s === '✓' || s === 'selesai') return 'Done';
  return STS.find(x => x.toLowerCase() === s) || null;
}
function impCols(hdr) { // judul kolom dicocokkan longgar (huruf besar/kecil & variasi nama tidak masalah)
  const idx = {};
  hdr.forEach((h, i) => {
    const n = String(h == null ? '' : h).trim().toLowerCase().replace(/\s+/g, ' '); if (!n) return;
    const set = k => { if (idx[k] === undefined) idx[k] = i };
    if (/resi/.test(n)) set('resi');
    else if (/id\s*pesanan|order\s*id|id\s*order|^oid$/.test(n)) set('oid');
    else if (/tiket/.test(n)) set('tiket');
    else if (/marketplace/.test(n)) set('mp');
    else if (/due/.test(n)) set('due');
    else if (/status/.test(n)) set('st');
    else if (/toko/.test(n)) set('toko');
    else if (/deskripsi/.test(n)) set('desk');
    else if (/keterangan/.test(n)) set('ket');
  });
  return idx;
}
$('#tImpFile').onchange = e => {
  const inp = e.target, f = inp.files[0]; if (!f) return;
  if (!window.XLSX) { inp.value = ''; return msg('#tImpMsg', 'Library Excel gagal dimuat. Pastikan terhubung ke internet.') }
  msg('#tImpMsg', 'Membaca file...', true);
  const rd = new FileReader();
  rd.onerror = () => { inp.value = ''; msg('#tImpMsg', 'File tidak bisa dibuka oleh browser.') };
  rd.onload = () => {
    try {
      const wb = XLSX.read(rd.result, { type: 'array', cellDates: true });
      const all = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', blankrows: false });
      let hi = -1, idx = {};
      for (let i = 0; i < Math.min(all.length, 15); i++) { const c = impCols(all[i]); if (c.resi !== undefined && c.oid !== undefined) { hi = i; idx = c; break } }
      if (hi < 0) throw new Error('Judul kolom "Resi" dan "ID Pesanan" tidak ditemukan di 15 baris pertama sheet pertama');
      const body = all.slice(hi + 1);
      let tokoNote = '';
      if (idx.toko === undefined) { // kolom tanpa judul yang berisi nama toko (kolom "SEND" diabaikan)
        const used = new Set(Object.values(idx)), cand = [];
        for (let c = 0; c < all[hi].length; c++) {
          if (used.has(c)) continue;
          const vals = body.map(r => impStr(r[c])).filter(Boolean); if (!vals.length) continue;
          if (vals.filter(v => /^send$/i.test(v)).length >= vals.length * .8) continue;
          cand.push([c, vals.length]);
        }
        if (cand.length) { cand.sort((a, b) => b[1] - a[1]); idx.toko = cand[0][0]; tokoNote = ' Kolom tanpa judul dipakai sebagai Nama Toko.' }
      }
      const defMp = $('#tImpMp').value, g = (r, k) => idx[k] === undefined ? '' : r[idx[k]];
      const have = new Set(returns.map(x => x.resi + '|' + x.oid)), now = Date.now(), recs = [], bad = [];
      let dup = 0;
      body.forEach((r, i) => {
        const resi = UC(impClean(g(r, 'resi'))), oid = UC(impClean(g(r, 'oid'))), tiket = UC(impClean(g(r, 'tiket')));
        const toko = impClean(g(r, 'toko')).slice(0, 60), desk = impClean(g(r, 'desk')), ket = impClean(g(r, 'ket'));
        if (!resi && !oid && !tiket && !desk && !ket && !toko) return; // baris kosong
        const ln = 'baris ' + (hi + i + 2);
        if (!resi || !oid) return bad.push(ln + ': Resi / ID Pesanan kosong');
        const mpRaw = impClean(g(r, 'mp')), mp = mpRaw ? MPS.find(x => x.toLowerCase() === mpRaw.toLowerCase().replace(/\s+/g, '')) : defMp;
        if (mpRaw && !mp) return bad.push(ln + ': marketplace "' + mpRaw + '" tidak dikenal');
        const st = impStatus(g(r, 'st')); if (!st) return bad.push(ln + ': status "' + impStr(g(r, 'st')) + '" tidak dikenal');
        const dd = impDue(g(r, 'due')); if (!dd) return bad.push(ln + ': due date "' + impStr(g(r, 'due')) + '" tidak terbaca');
        const key = resi + '|' + oid; if (have.has(key)) { dup++; return } have.add(key);
        recs.push({ id: uid(), ts: now + recs.length, resi, oid, tiket, desk, dueT: dd.dueT, due: dd.due, status: st, toko, mp: mp || '', ket, adm: me ? me.name : '' });
      });
      const extra = (dup ? ', ' + dup + ' dilewati (resi + ID pesanan sudah ada)' : '') + (bad.length ? ', ' + bad.length + ' baris ditolak' : '');
      const badTxt = bad.length ? ' ' + bad.slice(0, 4).join('; ') + (bad.length > 4 ? '; dst.' : '') : '';
      if (!recs.length) { inp.value = ''; return msg('#tImpMsg', 'Tidak ada data baru yang bisa diimpor' + extra + '.' + badTxt + tokoNote) }
      const nDone = recs.filter(x => x.status === 'Done').length;
      if (!confirm('Impor ' + recs.length + ' retur ke Laporan Retur?\n\n' + nDone + ' berstatus Done, ' + (recs.length - nDone) + ' On Progress' + (defMp ? '\nMarketplace diisi: ' + defMp : '') + (dup ? '\n' + dup + ' dilewati (sudah ada)' : '') + (bad.length ? '\n' + bad.length + ' baris ditolak' : ''))) { inp.value = ''; return msg('#tImpMsg', 'Impor dibatalkan.') }
      returns = recs.slice().reverse().concat(returns); // mode lokal menyimpan array `returns`, jadi perbarui dulu baru commit
      if (!commit(recs.map(x => ['returns', 'set', x]))) { inp.value = ''; return msg('#tImpMsg', 'Penyimpanan penuh.') }
      renderBd();
      msg('#tImpMsg', recs.length + ' retur berhasil diimpor ke Laporan Retur' + extra + '.' + badTxt + tokoNote, !bad.length);
    } catch (err) { console.error(err); msg('#tImpMsg', 'Gagal memproses file: ' + (err && err.message || err)) }
    inp.value = '';
  };
  rd.readAsArrayBuffer(f);
};
// Laporan Retur
const BDF = ['#bdFromD', '#bdFromT', '#bdToD', '#bdToT', '#bdSt', '#bdMp', '#bdDue', '#bdDueFrom', '#bdDueTo', '#bdToko', '#bdQ'];
function bdFiltered() {
  const f = dtv(dtVal('#bdFrom')), t = dtv(dtVal('#bdTo', true), true), st = $('#bdSt').value, mp = $('#bdMp').value, du = $('#bdDue').value, df = $('#bdDueFrom').value, dto = $('#bdDueTo').value,
    tk = $('#bdToko').value.trim().toLowerCase(), q = $('#bdQ').value.trim().toLowerCase();
  return returns.filter(r => mine(r) && (f === null || r.ts >= f) && (t === null || r.ts <= t) && (!st || r.status === st) && (!mp || r.mp === mp) && (!du || r.dueT === du) && ((!df && !dto) || (r.dueT === 'Tanggal' && r.due && (!df || r.due >= df) && (!dto || r.due <= dto)))
    && (!tk || (r.toko || '').toLowerCase().includes(tk)) && (!q || [r.resi, r.oid, r.tiket, r.desk, r.ket].join(' ').toLowerCase().includes(q))).sort((x, y) => y.ts - x.ts);
}
const bdTbl = list => `<div class="tw"><table style="min-width:1300px"><thead><tr><th>No</th><th>Tanggal Input</th><th>Resi Pengembalian</th><th>ID Pesanan</th><th>No Tiket</th><th>Deskripsi</th><th>Due Date</th><th>Status</th><th>Nama Toko</th><th>Marketplace</th><th>Keterangan</th><th>Admin</th><th></th></tr></thead><tbody>${list.map((r, i) => `<tr data-bdrow="${r.id}" title="Klik untuk melihat detail">
  <td>${i + 1}</td><td class="nw">${fmt(r.ts)}${tm(r.ts)}</td><td><b>${esc(r.resi)}</b></td><td>${esc(r.oid)}</td><td>${esc(r.tiket || '-')}</td><td><div class="wrapc">${esc(r.desk || '-')}</div></td>
  <td class="nw${dueLate(r) ? ' late' : ''}">${esc(dueTxt(r))}${dueLate(r) ? '<div class="tm late">lewat jatuh tempo</div>' : ''}</td><td><span class="sb ${stCls(r.status)}">${esc(r.status)}</span></td><td>${esc(r.toko || '-')}</td>
  <td>${r.mp ? '<span class="tag">' + esc(r.mp) + '</span>' : '-'}</td><td><div class="wrapc">${esc(r.ket || '-')}</div></td><td>${esc(r.adm || '-')}</td>
  <td class="nw"><button class="btn ghost sm" data-bdedit="${r.id}">Edit</button> <button class="btn ghost sm" data-bddel="${r.id}">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
function renderBd() {
  const all = bdFiltered(), today = dayWIB(Date.now()), filt = BDF.some(x => $(x).value);
  const tr = all.filter(r => dayWIB(r.ts) === today), hr = all.filter(r => dayWIB(r.ts) !== today), g = {};
  hr.forEach(r => { const d = dayWIB(r.ts), y = d.slice(0, 4), m = d.slice(5, 7); ((g[y] = g[y] || {})[m] = g[y][m] || []).push(r) });
  const isOpen = (k, dflt) => k in openState ? openState[k] : (filt || dflt);
  let html = sumBd(all) + '<div class="dayh">Hari ini <span class="tag">' + tr.length + ' data</span></div>' + (tr.length ? bdTbl(tr) : '<div class="empty">Belum ada retur yang diinput hari ini.</div>');
  if (hr.length) {
    html += '<div class="dayh" style="margin-top:24px">Riwayat <span class="tag">' + hr.length + ' data</span></div>' + Object.keys(g).sort().reverse().map(y => {
      const ms = Object.keys(g[y]).sort().reverse(), cnt = ms.reduce((s, m) => s + g[y][m].length, 0), ky = 'by' + y;
      return `<details class="yr" data-k="${ky}" ${isOpen(ky, y === today.slice(0, 4)) ? 'open' : ''}><summary>${y} <span class="tag">${cnt} data</span></summary>` +
        ms.map(m => { const km = 'bm' + y + m; return `<details class="mo" data-k="${km}" ${isOpen(km, false) ? 'open' : ''}><summary>${BLN[+m - 1]} ${y} <span class="tag">${g[y][m].length} data</span></summary>${dayBlocks(g[y][m], dayWIB, 'bk', isOpen, d => false, bdTbl)}</details>` }).join('') + '</details>';
    }).join('');
  }
  $('#bdGrp').innerHTML = html;
  renderNotif();
}
BDF.forEach(x => { $(x).addEventListener('input', renderBd); $(x).addEventListener('change', renderBd) });
$('#bdReset').onclick = () => { BDF.forEach(x => $(x).value = ''); [$('#bdQ'), $('#bdToko')].forEach(i => i._upd && i._upd()); renderBd() };
/* saran ketikan: pencarian (resi / ID pesanan / tiket / deskripsi / keterangan) dan nama toko */
function bdSuggest(inp, items) { // items(q) -> [{l: label, t: teks}]
  const l = document.createElement('div'); l.className = 'list sug'; inp.parentNode.appendChild(l);
  let cur = [];
  const show = () => {
    cur = items(inp.value.trim().toLowerCase());
    l.innerHTML = cur.map((x, i) => `<div data-i="${i}">${x.l ? '<span class="tag sl">' + esc(x.l) + '</span>' : ''}${esc(x.t.length > 70 ? x.t.slice(0, 70) + '…' : x.t)}</div>`).join('');
    l.classList.toggle('open', cur.length > 0);
  };
  inp.addEventListener('input', show); inp.addEventListener('focus', show);
  inp.addEventListener('blur', () => setTimeout(() => l.classList.remove('open'), 150));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') l.classList.remove('open') });
  l.addEventListener('mousedown', e => e.preventDefault()); // memilih saran tidak menghilangkan fokus
  l.addEventListener('click', e => {
    const d = e.target.closest('[data-i]'); if (!d) return;
    inp.value = cur[+d.dataset.i].t; inp.dispatchEvent(new Event('input', { bubbles: true })); l.classList.remove('open');
  });
}
function bdQItems(q) {
  if (!q) return [];
  const F = [['resi', 'Resi'], ['oid', 'ID Pesanan'], ['tiket', 'Tiket'], ['desk', 'Deskripsi'], ['ket', 'Keterangan']], out = [], seen = new Set();
  for (const r of returns.slice().sort((a, b) => b.ts - a.ts)) {
    for (const [k, lb] of F) { const v = String(r[k] || ''); if (v && v.toLowerCase().includes(q) && !seen.has(lb + v)) { seen.add(lb + v); out.push({ l: lb, t: v }) } }
    if (out.length >= 10) break;
  }
  return out.slice(0, 10);
}
function bdTokoItems(q) {
  const m = new Map(); returns.forEach(r => { const t = (r.toko || '').trim(); if (t && !m.has(t.toLowerCase())) m.set(t.toLowerCase(), t) });
  return [...m.values()].filter(t => t.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b)).slice(0, 30).map(t => ({ l: '', t }));
}
// edit & hapus
let tEd = null;
function openTEdit(id) {
  const r = returns.find(x => x.id === id); if (!r) return; tEd = id;
  $('#tmD').value = ymd(r.ts); $('#tmT').value = hm(r.ts); $('#tmCode').value = ''; $('#tmResi').value = r.resi; $('#tmOid').value = r.oid; $('#tmTiket').value = r.tiket || '';
  $('#tmDesk').value = r.desk || ''; $('#tmDueT').value = r.dueT || 'Cek Berkala'; $('#tmDue').value = r.due || ''; showDue('#tmDueT', '#tmDueW', '#tmDue');
  $('#tmSt').value = r.status; $('#tmToko').value = r.toko || ''; $('#tmMp').value = r.mp || ''; $('#tmKet').value = r.ket || ''; msg('#tmMsg', ''); $('#tmdl').hidden = false;
}
const closeT = () => { $('#tmdl').hidden = true; tEd = null };
$('#tmCancel').onclick = closeT; $('#tmdl').addEventListener('mousedown', e => { if (e.target === $('#tmdl')) closeT() });
$('#tmSave').onclick = () => {
  const r = returns.find(x => x.id === tEd); if (!r) return closeT();
  const resi = UC($('#tmResi').value), oid = UC($('#tmOid').value), dueT = $('#tmDueT').value, due = $('#tmDue').value, d = $('#tmD').value, t = $('#tmT').value.trim();
  if (!resi) return msg('#tmMsg', 'RESI PENGEMBALIAN wajib diisi.');
  if (!oid) return msg('#tmMsg', 'ID PESANAN wajib diisi.');
  if (dueT === 'Tanggal' && !due) return msg('#tmMsg', 'Pilih tanggal due date.');
  if (!d || !T24.test(t)) return msg('#tmMsg', 'Isi tanggal dan jam (format 24 jam, mis. 14:30).');
  if (returns.some(x => x.id !== r.id && x.resi === resi && x.oid === oid)) return msg('#tmMsg', 'Resi dan ID pesanan yang sama sudah ada.');
  const dtCh = d !== ymd(r.ts) || t !== hm(r.ts);
  if (dtCh && !codeOk('#tmCode')) return msg('#tmMsg', 'Mengubah tanggal / jam wajib memakai kode 6 digit yang benar.');
  const b = cl(r);
  Object.assign(r, { resi, oid, tiket: UC($('#tmTiket').value), desk: $('#tmDesk').value.trim(), dueT, due: dueT === 'Tanggal' ? due : '', status: $('#tmSt').value, toko: $('#tmToko').value.trim(), mp: $('#tmMp').value, ket: $('#tmKet').value.trim() });
  if (dtCh) r.ts = new Date(d + 'T' + t).getTime();
  if (!commit([['returns', 'set', r], logH('RETUR', 'edit', b.resi + ' · ' + b.oid, [{ c: 'returns', b, a: cl(r) }])])) return msg('#tmMsg', 'Penyimpanan penuh.');
  closeT(); renderBd();
};
$('#bdGrp').addEventListener('click', e => {
  const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open; return }
  const ed = e.target.closest('[data-bdedit]'), dl = e.target.closest('[data-bddel]');
  if (ed) return openTEdit(ed.dataset.bdedit);
  if (dl) {
    const id = dl.dataset.bddel, r0 = returns.find(x => x.id === id); if (!r0) return;
    askYN('Yakin menghapus retur ' + r0.resi + ' (ID pesanan ' + r0.oid + ')?', () => {
      const r = returns.find(x => x.id === id); if (!r) return;
      const lop = logH('RETUR', 'hapus', r.resi + ' · ' + r.oid + (r.toko ? ' · ' + r.toko : ''), [{ c: 'returns', b: cl(r), a: null }]);
      returns = returns.filter(x => x.id !== id); commit([['returns', 'del', id], lop]); renderBd();
    });
  }
  const row = e.target.closest('tr[data-bdrow]'); // klik baris (di luar tombol) -> popup detail
  if (row && !e.target.closest('button')) openTDetail(row.dataset.bdrow);
});
// popup detail retur: tampilan detail semua kolom, pilihan Edit atau Keluar
let tdId = null;
function openTDetail(id) {
  const r = returns.find(x => x.id === id); if (!r) return; tdId = id;
  const late = dueLate(r);
  const rows = [
    ['Tanggal Input', esc(tsFmt(r.ts))], ['Resi Pengembalian', '<b>' + esc(r.resi) + '</b>'], ['ID Pesanan', esc(r.oid)], ['No Tiket', esc(r.tiket || '-')],
    ['Marketplace', r.mp ? '<span class="tag">' + esc(r.mp) + '</span>' : '-'], ['Nama Toko', esc(r.toko || '-')],
    ['Due Date', '<span class="' + (late ? 'late' : '') + '">' + esc(dueTxt(r)) + (late ? ' (lewat jatuh tempo)' : '') + '</span>'],
    ['Status', '<span class="sb ' + stCls(r.status) + '">' + esc(r.status) + '</span>'],
    ['Deskripsi', esc(r.desk || '-')], ['Keterangan', esc(r.ket || '-')], ['Admin', esc(r.adm || '-')]
  ];
  $('#tdBody').innerHTML = '<div class="dl2">' + rows.map(([k, v]) => '<div class="k">' + k + '</div><div class="v">' + v + '</div>').join('') + '</div>';
  $('#tdWa').hidden = roleName() !== 'Owner'; // tombol reminder WhatsApp hanya untuk Owner
  $('#tdmdl').hidden = false;
}
const closeTD = () => { $('#tdmdl').hidden = true; tdId = null };
$('#tdClose').onclick = closeTD;
$('#tdmdl').addEventListener('mousedown', e => { if (e.target === $('#tdmdl')) closeTD() });
$('#tdEdit').onclick = () => { const id = tdId; closeTD(); if (id) openTEdit(id) };

/* ---------- notifikasi due date (khusus role Retur & Owner) ---------- */
// H-2 kuning, H-1 merah, hari H merah pekat. Retur yang sudah Done / Failed tidak diingatkan. Klik notifikasi -> popup detail retur tersebut.
const ntHide = new Set(); // notifikasi yang ditutup (silang) sampai halaman dimuat ulang
const dueDiff = r => { // selisih hari (WIB) antara due date dan hari ini; null bila bukan due date bertanggal
  if (r.dueT !== 'Tanggal' || !r.due) return null;
  const t = dayWIB(Date.now());
  return Math.round((Date.UTC(+r.due.slice(0, 4), +r.due.slice(5, 7) - 1, +r.due.slice(8, 10)) - Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10))) / 864e5);
};
function renderNotif() {
  const box = $('#notif'); if (!box) return;
  const rl = roleName();
  if (rl !== 'Retur' && rl !== 'Owner') { box.innerHTML = ''; return }
  const L = returns.filter(r => r.status !== 'Done' && r.status !== 'Failed').map(r => ({ r, d: dueDiff(r) }))
    .filter(x => x.d !== null && x.d >= 0 && x.d <= 2 && !ntHide.has(x.r.id + ':' + x.d)).sort((a, b) => a.d - b.d || a.r.ts - b.r.ts);
  box.innerHTML = L.map(({ r, d }) => `<div class="nt ${d === 2 ? 'y' : d === 1 ? 'r' : 'rr'}" data-nt="${r.id}"><div class="ntt"><b>${d === 0 ? 'HARI H · Deadline hari ini' : 'H-' + d + ' · Deadline ' + (d === 1 ? 'besok' : '2 hari lagi')}</b><span>${esc(r.toko || '-')} · Resi ${esc(r.resi)} · ID ${esc(r.oid)} · ${esc(dueTxt(r))}</span></div><button class="ntx" data-ntx="${r.id}:${d}" type="button" aria-label="Tutup notifikasi">×</button></div>`).join('');
}
$('#notif').addEventListener('click', e => {
  const x = e.target.closest('[data-ntx]'); if (x) { ntHide.add(x.dataset.ntx); return renderNotif() }
  const n = e.target.closest('[data-nt]'); if (n) openTDetail(n.dataset.nt);
});

/* ---------- reminder WhatsApp (khusus Owner) ---------- */
let waNums = store.get('pp_wa', []); // nomor yang pernah dipakai, terbaru di depan; tersinkron lewat dokumen settings/wa bila memakai Firebase
let waId = null;
const waNorm = s => { let d = String(s || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '62' + d.slice(1); else if (d.startsWith('8')) d = '62' + d; return d };
function waSave(list) { waNums = list.slice(0, 10); store.set('pp_wa', waNums); if (db) commit([['settings', 'set', { id: 'wa', nums: waNums, upd: Date.now() }]]) }
function waChips() {
  $('#waChips').innerHTML = waNums.length ? '<div class="hint2">Nomor yang pernah dipakai (klik untuk memakai):</div><div class="wch">' + waNums.map(n => `<span class="wc"><button type="button" data-wan="${n}">+${n}</button><button type="button" class="wcx" data-wadel="${n}" aria-label="Hapus nomor">×</button></span>`).join('') + '</div>' : '';
  $('#waList').innerHTML = waNums.map(n => `<option value="+${n}">`).join('');
}
const waText = r => ['Reminder Banding', '', 'Nama Toko : ' + (r.toko || '-'), 'ID Pesanan : ' + r.oid, 'No. Tiket Pelaporan : ' + (r.tiket || '-'), 'No Resi : ' + r.resi, 'Deskripsi : ' + (r.desk || '-'), 'Deadline : ' + dueTxt(r)].join('\n');
$('#tdWa').onclick = () => {
  if (roleName() !== 'Owner') return;
  const r = returns.find(x => x.id === tdId); if (!r) return;
  waId = r.id; $('#waNum').value = ''; msg('#waMsg', ''); waChips(); $('#wamdl').hidden = false; $('#waNum').focus();
};
const closeWa = () => { $('#wamdl').hidden = true; waId = null };
$('#waCancel').onclick = closeWa;
$('#wamdl').addEventListener('mousedown', e => { if (e.target === $('#wamdl')) closeWa() });
$('#waChips').addEventListener('click', e => {
  const n = e.target.closest('[data-wan]'), d = e.target.closest('[data-wadel]');
  if (n) $('#waNum').value = '+' + n.dataset.wan;
  if (d) { waSave(waNums.filter(x => x !== d.dataset.wadel)); waChips() }
});
function waGo() {
  if (roleName() !== 'Owner') return;
  const r = returns.find(x => x.id === waId); if (!r) return closeWa();
  const n = waNorm($('#waNum').value);
  if (!/^\d{9,15}$/.test(n)) return msg('#waMsg', 'Masukkan nomor WhatsApp yang benar, mis. 0812xxxxxxxx atau +62812xxxxxxxx.');
  waSave([n].concat(waNums.filter(x => x !== n)));
  window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(waText(r)), '_blank');
  closeWa();
}
$('#waOk').onclick = waGo;
$('#waNum').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); waGo() } });
// export Laporan Retur
function bdHead(rows) {
  const f = dtVal('#bdFrom'), t = dtVal('#bdTo', true);
  const tgl = !f && !t ? 'Semua tanggal' : f && t ? fDT(f) + ' s/d ' + fDT(t) : f ? 'Mulai ' + fDT(f) : 'Sampai ' + fDT(t);
  return { title: 'Laporan Retur', tgl: 'Tanggal & Jam Input: ' + tgl, asal: 'Marketplace: ' + ($('#bdMp').value || 'Semua'), adm: 'Nama Admin: ' + admHead(rows || []) };
}
const bdAsc = () => bdFiltered().sort((a, b) => a.ts - b.ts);
$('#bdXls').onclick = () => {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const rows = bdAsc(); if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const H = bdHead(rows);
  const aoa = [[H.title], [H.tgl], [H.asal], [H.adm], [], ['No', 'Tanggal', 'Jam', 'Resi Pengembalian', 'ID Pesanan', 'No Tiket', 'Deskripsi', 'Due Date', 'Status', 'Nama Toko', 'Marketplace', 'Keterangan', 'Admin']]
    .concat(rows.map((r, i) => [i + 1, ymd(r.ts), hm(r.ts), r.resi, r.oid, r.tiket || '', r.desk || '', dueTxt(r), r.status, r.toko || '', r.mp || '', r.ket || '', r.adm || '']));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 12 } }));
  ws['!cols'] = [5, 12, 8, 20, 20, 16, 30, 14, 12, 18, 13, 36, 14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Laporan Retur');
  const fn = fileName($('#bdMp').value, admFile(rows), 'LAPORAN RETUR', 'xlsx'); XLSX.writeFile(wb, fn);
  logDl({ form: 'BANDING', fmt: 'Excel', fname: fn, src: $('#bdMp').value, title: H.title, tgl: H.tgl, cols: aoa[5], rows: aoa.slice(6) });
};
$('#bdPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const rows = bdAsc(); if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const H = bdHead(rows), doc = new jspdf.jsPDF({ orientation: 'landscape' });
  const cols = ['No', 'Tanggal', 'Resi', 'ID Pesanan', 'No Tiket', 'Deskripsi', 'Due Date', 'Status', 'Toko', 'Marketplace', 'Keterangan', 'Admin'];
  const body = rows.map((r, i) => [i + 1, tsFmt(r.ts), r.resi, r.oid, r.tiket || '-', r.desk || '-', dueTxt(r), r.status, r.toko || '-', r.mp || '-', r.ket || '-', r.adm || '-']);
  doc.setFontSize(16); doc.text(H.title, 14, 15);
  doc.setFontSize(10); doc.text(H.tgl, 14, 22); doc.text(H.asal + '     ' + H.adm, 14, 28);
  doc.autoTable({ startY: 33, styles: { fontSize: 7 }, headStyles: { fillColor: [74, 123, 208] }, head: [cols], body });
  const fn = fileName($('#bdMp').value, admFile(rows), 'LAPORAN RETUR', 'pdf'); doc.save(fn);
  logDl({ form: 'BANDING', fmt: 'PDF', fname: fn, src: $('#bdMp').value, title: H.title, tgl: H.tgl, cols, rows: body });
};

/* ---------- PRODUK ---------- */
function addVRow(n = '', c = '#4a7bd0') {
  const d = document.createElement('div'); d.className = 'vrow';
  d.innerHTML = `<input type="color" value="${c}"><input placeholder="Nama warna (mis. Biru)" value="${esc(n)}"><button class="btn ghost sm" type="button">Hapus</button>`;
  d.querySelector('button').onclick = () => d.remove(); caps(d.querySelector('input:not([type=color])')); $('#vBox').appendChild(d);
}
$('#addV').onclick = () => addVRow();
$('#saveP').onclick = () => {
  const name = normName($('#pName').value);
  if (!name) return msg('#pMsg', 'Isi nama produk.');
  const variants = [...$$('.vrow')].map(r => {
    const c = r.querySelector('input[type=color]').value;
    return { c, n: normName(r.querySelector('input:not([type=color])').value) || c.toUpperCase() };
  });
  const ex = products.find(p => normName(p.name) === name);
  const p = ex || { id: uid(), name, variants: [] };
  let added = 0;
  variants.forEach(v => { if (!p.variants.some(x => normName(x.n) === normName(v.n))) { p.variants.push(v); added++ } });
  if (ex && !added) return msg('#pMsg', 'Produk sudah ada dan tidak ada varian baru untuk ditambahkan.');
  if (!ex) products.push(p);
  if (!commit([['products', 'set', p]])) return msg('#pMsg', 'Penyimpanan penuh.');
  $('#pName').value = ''; $('#vBox').innerHTML = '';
  msg('#pMsg', ex ? 'Digabung ke produk yang sama: ' + added + ' varian ditambahkan.' : 'Produk tersimpan.', true); renderProducts();
};
/* ---------- STOK PRODUK (Database Produk) ---------- */
// Qty = jumlah barang "ada" yang sudah tercatat di Purchase. Tiap penerimaan menyimpan jumlah kumulatif pengajuannya, jadi ambil yang terbaru per pengajuan.
function stockRows() {
  const byRid = {}, loose = [];
  records.forEach(r => { if (r.rid) { const o = byRid[r.rid]; if (!o || (Number(r.ada) || 0) > (Number(o.ada) || 0) || ((Number(r.ada) || 0) === (Number(o.ada) || 0) && r.ts > o.ts)) byRid[r.rid] = r } else loose.push(r) });
  const m = new Map();
  const add = (prod, vn0, vc, qty, ts) => { const pn = normName(prod), vn = normName(vn0), k = pn + '|' + vn, g = m.get(k) || { prod: pn, vn, vc, qty: 0, last: 0 }; g.qty += Number(qty) || 0; g.last = Math.max(g.last, ts || 0); if (!g.vc) g.vc = vc; m.set(k, g) };
  Object.values(byRid).concat(loose).forEach(r => add(r.prod, r.vn, r.vc, r.ada, r.ts));
  pstock.forEach(e => add(e.prod, e.vn, e.vc, e.qty, e.ts)); // stok yang diupload manual / massal
  rgoods.forEach(e => { if (gdUse(e)) add(e.name, e.vn, gdColor(e.name, normName(e.vn)), e.qty, e.ts) }); // barang retur Baik / Kurang (dan pengambilannya dari gudang)
  return [...m.values()].sort((a, b) => a.prod.localeCompare(b.prod) || a.vn.localeCompare(b.vn));
}
const tokOk = (text, q) => normName(q).split(' ').filter(Boolean).every(t => text.includes(t));
const nfm = n => Number(n || 0).toLocaleString('id-ID');
const stOpen = {}; // produk (nama) -> daftar varian sedang dibuka
function renderStock() { // satu baris per produk (varian digabung); panah membuka varian & qty-nya
  const q = $('#stSearch').value, all = stockRows(), L = all.filter(g => tokOk(g.prod + ' ' + g.vn, q)), m = new Map();
  L.forEach(g => { let o = m.get(g.prod); if (!o) m.set(g.prod, o = { prod: g.prod, qty: 0, vs: [] }); o.qty += g.qty; o.vs.push(g) });
  const G = [...m.values()], vcell = g => g.vn ? sw(g.vc, g.vn) + ' ' + esc(g.vn) : 'Tanpa varian';
  $('#stList').innerHTML = stSum(G, L) + (G.length
    ? `<div class="tw"><table style="min-width:520px"><thead><tr><th>No</th><th>Nama Produk</th><th>Qty</th></tr></thead><tbody>${G.map((o, i) => {
      const many = o.vs.length > 1, k = encodeURIComponent(o.prod), open = k in stOpen ? stOpen[k] : !!q.trim();
      return `<tr><td>${i + 1}</td><td><b>${esc(o.prod)}</b>${many ? `<button type="button" class="arw${open ? ' on' : ''}" data-stk="${k}" title="Lihat varian dan Qty">${o.vs.length} varian</button>` : o.vs[0].vn ? `<div class="tm">${vcell(o.vs[0])}</div>` : ''}</td><td><b>${nfm(o.qty)}</b> pcs</td></tr>`
        + (many ? `<tr class="hrow" data-stfor="${k}"${open ? '' : ' hidden'}><td></td><td colspan="2"><table class="mt"><thead><tr><th>Varian</th><th>Qty</th></tr></thead><tbody>${o.vs.map(g => `<tr><td>${vcell(g)}</td><td><b>${nfm(g.qty)}</b> pcs</td></tr>`).join('')}</tbody></table></td></tr>` : '');
    }).join('')}</tbody></table></div>`
    : '<div class="empty">' + (all.length ? 'Produk tidak ditemukan.' : 'Belum ada stok. Stok berasal dari Purchase, Barang Retur (Baik / Kurang), atau Upload Stok.') + '</div>');
  renderUs();
}
caps($('#stSearch')); $('#stSearch').addEventListener('input', renderStock);
$('#stList').addEventListener('click', e => {
  const b = e.target.closest('[data-stk]'); if (!b) return;
  const k = b.dataset.stk, open = !(k in stOpen ? stOpen[k] : !!$('#stSearch').value.trim());
  stOpen[k] = open; const row = $('#stList').querySelector('tr.hrow[data-stfor="' + k + '"]'); if (row) row.hidden = !open; b.classList.toggle('on', open);
});

/* ---------- UPLOAD STOK (manual & massal) + edit/hapus ---------- */
// pastikan produk & varian ada di database produk (dibuat otomatis jika belum); changed = produk perlu disimpan
function ensureProd(name, vn, col) {
  let p = products.find(x => normName(x.name) === name), changed = false, v = null;
  if (!p) { p = { id: uid(), name, variants: [] }; products.push(p); changed = true }
  if (vn) { v = p.variants.find(x => normName(x.n) === vn); if (!v) { v = { n: vn, c: col || toHex(vn) || '#4a7bd0' }; p.variants.push(v); changed = true } }
  return { p, vc: v ? v.c : '', changed };
}
caps($('#usName')); caps($('#usVar')); caps($('#sgName')); caps($('#sgVar')); caps($('#usSearch')); addClear($('#usSearch'));
$('#usName').addEventListener('input', () => brLists(normName($('#usName').value)));
$('#sgName').addEventListener('input', () => brLists(normName($('#sgName').value)));
$('#usSubmit').onclick = () => {
  const name = normName($('#usName').value), vn = normName($('#usVar').value), q = parseInt($('#usQty').value, 10);
  if (!name) return msg('#usMsg', 'Nama Produk wajib diisi.');
  if (!(q >= 1)) return msg('#usMsg', 'Qty minimal 1.');
  const pr = ensureProd(name, vn), e = { id: uid(), ts: Date.now(), prod: name, vn, vc: pr.vc, qty: q, ket: $('#usKet').value.trim(), adm: me ? me.name : '' }, ops = [['pstock', 'set', e]];
  if (pr.changed) ops.push(['products', 'set', pr.p]);
  pstock.unshift(e);
  if (!commit(ops)) return msg('#usMsg', 'Penyimpanan penuh.');
  ['#usName', '#usVar', '#usQty', '#usKet'].forEach(x => $(x).value = '');
  msg('#usMsg', 'Tersimpan: ' + q + ' pcs ' + name + (vn ? ' · ' + vn : '') + ' masuk ke stok.', true); renderStock(); renderProducts(); brLists('');
};
$('#usTpl').onclick = () => {
  const csv = 'Produk,Varian,Warna,Qty,Keterangan\nKaos Polos,Biru,#3b82f6,10,Stok awal\nKaos Polos,Merah,#ef4444,5,\nTas Kanvas,,,20,\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'template-stok.csv'; a.click();
};
$('#usFile').onchange = e => {
  const inp = e.target, f = inp.files[0]; if (!f) return;
  if (!window.XLSX) { inp.value = ''; return msg('#usImpMsg', 'Library Excel gagal dimuat. Pastikan terhubung ke internet.') }
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const wb = XLSX.read(rd.result, { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }), items = [];
      let bad = 0;
      rows.forEach(row => {
        const k = {}; Object.keys(row).forEach(x => k[x.trim().toLowerCase()] = row[x]);
        const name = normName(k.produk || k['nama produk'] || k['nama barang'] || k.nama || ''), qv = [k.qty, k.jumlah, k.stok].find(v => v !== undefined && v !== ''), q = parseInt(qv, 10);
        if (!name && qv === undefined) return; // baris kosong
        if (!name || !(q >= 1)) { bad++; return }
        const vr = String(k.varian || '').trim(), col = String(k.warna || '').trim();
        items.push({ name, vn: normName(vr || col), c: toHex(col || vr) || '', q, ket: String(k.keterangan || '').trim() });
      });
      if (!items.length) { inp.value = ''; return msg('#usImpMsg', 'Tidak ada baris yang bisa diimpor' + (bad ? ' (' + bad + ' baris dilewati: produk kosong / Qty bukan angka ≥ 1)' : '') + '.') }
      const tot = items.reduce((s, x) => s + x.q, 0);
      if (!confirm('Tambahkan ' + items.length + ' baris stok (total ' + tot + ' pcs) ke Database Produk?' + (bad ? '\n' + bad + ' baris dilewati.' : ''))) { inp.value = ''; return msg('#usImpMsg', 'Upload dibatalkan.') }
      const now = Date.now(), touched = new Set(), recs = items.map((x, i) => {
        const pr = ensureProd(x.name, x.vn, x.c); if (pr.changed) touched.add(pr.p);
        return { id: uid(), ts: now + i, prod: x.name, vn: x.vn, vc: pr.vc, qty: x.q, ket: x.ket, adm: me ? me.name : '' };
      });
      pstock = recs.slice().reverse().concat(pstock);
      if (!commit(recs.map(x => ['pstock', 'set', x]).concat([...touched].map(p => ['products', 'set', p])))) { inp.value = ''; return msg('#usImpMsg', 'Penyimpanan penuh.') }
      renderStock(); renderProducts();
      msg('#usImpMsg', recs.length + ' baris stok (' + tot + ' pcs) berhasil diupload' + (bad ? ', ' + bad + ' baris dilewati.' : '.'), !bad);
    } catch (err) { console.error(err); msg('#usImpMsg', 'File tidak bisa dibaca. Gunakan format .xlsx atau .csv.') }
    inp.value = '';
  };
  rd.readAsArrayBuffer(f);
};
function renderUs() {
  const q = $('#usSearch').value, L = pstock.filter(e => mine(e) && tokOk(e.prod + ' ' + (e.vn || '') + ' ' + String(e.ket || '').toUpperCase(), q)).sort((a, b) => b.ts - a.ts), V = L.slice(0, 200);
  const usT = sumK2(L, e => e.qty);
  $('#usList').innerHTML = sumBar([stag('Total data', NF(L.length)), stag('Total item', NF(usT) + ' pcs')]) + (V.length
    ? `<div class="tw"><table style="min-width:760px"><thead><tr><th>No</th><th>Waktu</th><th>Produk</th><th>Varian</th><th>Qty</th><th>Keterangan</th><th>Admin</th><th></th></tr></thead><tbody>${V.map((e, i) => `<tr>
      <td>${i + 1}</td><td class="nw">${fmt(e.ts)}${tm(e.ts)}</td><td><b>${esc(e.prod)}</b></td><td>${e.vn ? sw(e.vc, e.vn) + ' ' + esc(e.vn) : '-'}</td><td>${nfm(e.qty)} pcs</td><td><div class="wrapc">${esc(e.ket || '-')}</div></td><td>${esc(e.adm || '-')}</td>
      <td class="nw"><button class="btn ghost sm" data-usedit="${e.id}" type="button">Edit</button> <button class="btn ghost sm" data-usdel="${e.id}" type="button">Hapus</button></td></tr>`).join('')}</tbody></table></div>` + (L.length > V.length ? '<div class="hint2">Menampilkan 200 terbaru dari ' + nfm(L.length) + ' data. Gunakan pencarian untuk mempersempit.</div>' : '')
    : '<div class="empty">' + (pstock.length ? 'Data tidak ditemukan.' : 'Belum ada stok yang diupload.') + '</div>');
}
$('#usSearch').addEventListener('input', renderUs);
$('#usList').addEventListener('click', e => {
  const ed = e.target.closest('[data-usedit]'), dl = e.target.closest('[data-usdel]');
  if (ed) return openSg('pstock', ed.dataset.usedit);
  if (dl) {
    const id = dl.dataset.usdel, r0 = pstock.find(x => x.id === id); if (!r0) return;
    askYN('Yakin menghapus upload stok ' + r0.prod + (r0.vn ? ' · ' + r0.vn : '') + ' (' + r0.qty + ' pcs)? Qty di Stok Produk berkurang sebesar itu.', () => {
      const r = pstock.find(x => x.id === id); if (!r) return;
      const lop = logH('UPLOAD STOK', 'hapus', r.prod + (r.vn ? ' · ' + r.vn : '') + ' · ' + r.qty + ' pcs', [{ c: 'pstock', b: cl(r), a: null }]);
      pstock = pstock.filter(x => x.id !== id); commit([['pstock', 'del', id], lop]); refresh();
    });
  }
});
// popup edit bersama: kind 'pstock' (upload stok) atau 'rgoods' (barang retur)
let sgCur = null;
function openSg(kind, id) {
  const r = (kind === 'pstock' ? pstock : rgoods).find(x => x.id === id); if (!r) return;
  sgCur = { kind, id, out: kind === 'rgoods' && r.qty < 0 };
  $('#sgTitle').textContent = kind === 'pstock' ? 'Edit Upload Stok' : sgCur.out ? 'Edit Pengeluaran Gudang' : 'Edit Barang Masuk Gudang';
  $('#sgName').value = kind === 'pstock' ? r.prod : r.name; $('#sgVar').value = r.vn || ''; $('#sgQty').value = Math.abs(r.qty); $('#sgName').disabled = $('#sgVar').disabled = sgCur.out;
  $('#sgCondW').hidden = kind === 'pstock' || sgCur.out; $('#sgCond').value = r.cond || 'Baik'; $('#sgKet').value = (sgCur.out ? r.note : r.ket) || '';
  brLists(normName($('#sgName').value)); msg('#sgMsg', ''); $('#sgmdl').hidden = false;
}
const closeSg = () => { $('#sgmdl').hidden = true; sgCur = null };
$('#sgCancel').onclick = closeSg; $('#sgmdl').addEventListener('mousedown', e => { if (e.target === $('#sgmdl')) closeSg() });
$('#sgSave').onclick = () => {
  if (!sgCur) return;
  const isP = sgCur.kind === 'pstock', r = (isP ? pstock : rgoods).find(x => x.id === sgCur.id); if (!r) return closeSg();
  const name = normName($('#sgName').value), vn = normName($('#sgVar').value), q = parseInt($('#sgQty').value, 10), ket = $('#sgKet').value.trim(), cond = $('#sgCond').value;
  if (!name) return msg('#sgMsg', 'Nama wajib diisi.');
  if (!(q >= 1)) return msg('#sgMsg', 'Qty minimal 1.');
  const ops = [], b0 = cl(r);
  if (isP) {
    const pr = ensureProd(name, vn); if (pr.changed) ops.push(['products', 'set', pr.p]);
    Object.assign(r, { prod: name, vn, vc: pr.vc, qty: q, ket }); ops.push(['pstock', 'set', r]);
  } else if (sgCur.out) { // pengeluaran: hanya qty & keterangan
    const sim = rgoods.map(x => x.id === r.id ? Object.assign({}, x, { qty: -q }) : x);
    if (gdAvail(sim, r.name, r.vn || '') < 0) return msg('#sgMsg', 'Qty pengeluaran melebihi stok yang tersedia di gudang.');
    Object.assign(r, { qty: -q, note: ket }); ops.push(['rgoods', 'set', r]);
  } else {
    const oName = r.name, oVn = r.vn || '', sim = rgoods.map(x => x.id === r.id ? Object.assign({}, x, { name, vn, qty: q, cond }) : x); // jangan sampai stok gudang jadi minus
    if (gdAvail(sim, oName, oVn) < 0 || gdAvail(sim, name, vn) < 0) return msg('#sgMsg', 'Perubahan ini membuat stok gudang minus karena sebagian barang sudah dikeluarkan.');
    if (!RBAD.includes(cond)) { const pr = ensureProd(name, vn); if (pr.changed) ops.push(['products', 'set', pr.p]) }
    Object.assign(r, { name, vn, qty: q, cond, ket }); ops.push(['rgoods', 'set', r]);
  }
  ops.push(logH(isP ? 'UPLOAD STOK' : 'BARANG GUDANG', 'edit', (!isP && b0.qty < 0 ? 'Pengeluaran ' : '') + (isP ? b0.prod : b0.name) + (b0.vn ? ' · ' + b0.vn : '') + ' · ' + Math.abs(b0.qty) + ' pcs', [{ c: isP ? 'pstock' : 'rgoods', b: b0, a: cl(r) }]));
  if (!commit(ops)) return msg('#sgMsg', 'Penyimpanan penuh.');
  closeSg(); refresh(); renderProducts();
};

/* ---------- BARANG RETUR (form) & BARANG GUDANG ---------- */
// rgoods = riwayat gerak barang: qty positif = masuk (form Barang Retur), qty negatif = keluar (diambil dari gudang)
const RBAD = ['Rusak', 'Lecet']; // kondisi ini hanya masuk Barang Retur (tidak ke Barang Gudang & Database Produk)
const gdUse = e => e.qty < 0 || !RBAD.includes(e.cond); // data lama tanpa kondisi dianggap layak pakai
const gdAvail = (list, name, vn) => list.filter(e => e.name === name && (e.vn || '') === (vn || '') && gdUse(e)).reduce((s, e) => s + (Number(e.qty) || 0), 0);
function gdStock() {
  const m = new Map();
  rgoods.filter(gdUse).forEach(e => { const k = e.name + '|' + (e.vn || ''), g = m.get(k) || { name: e.name, vn: e.vn || '', qty: 0, last: 0 }; g.qty += Number(e.qty) || 0; g.last = Math.max(g.last, e.ts); m.set(k, g) });
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name) || a.vn.localeCompare(b.vn));
}
const gdColor = (name, vn) => { const p = products.find(x => normName(x.name) === name), v = p && (p.variants || []).find(x => normName(x.n) === vn); return v ? v.c : '' };
function brLists(nm) { // saran nama & varian saat mengetik (form Barang Retur, Upload Stok, popup edit)
  const names = [...new Set(products.map(p => normName(p.name)).concat(rgoods.map(e => e.name), pstock.map(e => normName(e.prod))))].sort();
  $('#brNames').innerHTML = names.map(n => `<option value="${esc(n)}">`).join('');
  nm = typeof nm === 'string' ? nm : normName($('#brName').value); const p = products.find(x => normName(x.name) === nm);
  const vs = [...new Set((p ? p.variants.map(v => normName(v.n)) : []).concat(rgoods.filter(e => e.name === nm && e.vn).map(e => e.vn), pstock.filter(e => normName(e.prod) === nm && e.vn).map(e => e.vn)))].sort();
  $('#brVars').innerHTML = vs.map(v => `<option value="${esc(v)}">`).join('');
}
caps($('#brName')); caps($('#brVar')); $('#brName').addEventListener('input', () => brLists());
function brCondHint() {
  const c = $('#brCond').value;
  $('#brCondHint').textContent = !c ? '' : RBAD.includes(c) ? 'Kondisi ' + c + ': hanya masuk ke Barang Retur (tidak masuk Barang Gudang dan Database Produk).' : 'Kondisi ' + c + ': masuk ke Barang Retur, Barang Gudang, dan Database Produk.';
}
$('#brCond').addEventListener('change', brCondHint);
$('#brSubmit').onclick = () => {
  const name = normName($('#brName').value), vn = normName($('#brVar').value), q = parseInt($('#brQty').value, 10);
  if (!name) return msg('#brMsg', 'Nama Barang wajib diisi.');
  if (!(q >= 1)) return msg('#brMsg', 'Qty minimal 1.');
  const cond = $('#brCond').value, ket = $('#brKet').value.trim();
  if (!cond) return msg('#brMsg', 'Pilih kondisi produk.');
  const bad = RBAD.includes(cond), e = { id: uid(), ts: Date.now(), name, vn, qty: q, kind: 'in', cond, ket, note: '', adm: me ? me.name : '' }, ops = [['rgoods', 'set', e]];
  if (!bad) { const pr = ensureProd(name, vn); if (pr.changed) ops.push(['products', 'set', pr.p]) } // Baik / Kurang: produk & varian juga masuk database produk
  rgoods.unshift(e);
  if (!commit(ops)) return msg('#brMsg', 'Penyimpanan penuh.');
  ['#brName', '#brVar', '#brQty', '#brKet'].forEach(x => $(x).value = ''); $('#brCond').selectedIndex = 0; brCondHint(); brLists(''); renderBr(); // form kosong lagi, dropdown kembali ke default
  msg('#brMsg', 'Tersimpan: ' + q + ' pcs ' + name + (vn ? ' · ' + vn : '') + ' (' + cond + ') ' + (bad ? 'masuk ke Barang Retur saja.' : 'masuk ke Barang Retur, Barang Gudang, dan Database Produk.'), true);
};

/* ---------- BARANG RETUR BERMASALAH (daftar + filter, edit, hapus) ---------- */
const BRF = ['#brFromD', '#brFromT', '#brToD', '#brToT', '#brFCond', '#brFQ'];
const brCondOf = e => e.cond || 'Baik'; // data lama tanpa kondisi dianggap layak pakai
function brFiltered() {
  const f = dtv(dtVal('#brFrom')), t = dtv(dtVal('#brTo', true), true), c = $('#brFCond').value, q = $('#brFQ').value;
  return rgoods.filter(e => e.qty > 0 && mine(e) && (f === null || e.ts >= f) && (t === null || e.ts <= t) && (!c || brCondOf(e) === c)
    && (!q.trim() || tokOk(e.name + ' ' + (e.vn || '') + ' ' + String(e.ket || '').toUpperCase(), q))).sort((x, y) => y.ts - x.ts);
}
function renderBr() {
  const L = brFiltered(), V = L.slice(0, 200), bad = L.filter(e => RBAD.includes(brCondOf(e)));
  $('#brList').innerHTML = sumBar([stag('Total data', NF(L.length)), stag('Total item', NF(sumK2(L, e => e.qty)) + ' pcs')]) + (V.length
    ? `<div class="tw"><table style="min-width:860px"><thead><tr><th>No</th><th>Waktu</th><th>Nama Barang</th><th>Varian</th><th>Qty</th><th>Kondisi</th><th>Keterangan</th><th>Admin</th><th></th></tr></thead><tbody>${V.map((e, i) => `<tr>
      <td>${i + 1}</td><td class="nw">${fmt(e.ts)}${tm(e.ts)}</td><td><b>${esc(e.name)}</b></td><td>${e.vn ? sw(gdColor(e.name, e.vn), e.vn) + ' ' + esc(e.vn) : '-'}</td><td>${nfm(e.qty)} pcs</td>
      <td><span class="tag ${RBAD.includes(brCondOf(e)) ? 'out' : 'in'}">${esc(brCondOf(e))}</span></td><td><div class="wrapc">${esc(e.ket || '-')}</div></td><td>${esc(e.adm || '-')}</td>
      <td class="nw"><button class="btn ghost sm" data-bredit="${e.id}" type="button">Edit</button> <button class="btn ghost sm" data-brdel="${e.id}" type="button">Hapus</button></td></tr>`).join('')}</tbody></table></div>` + (L.length > V.length ? '<div class="hint2">Menampilkan 200 terbaru dari ' + nfm(L.length) + ' data. Gunakan filter untuk mempersempit.</div>' : '')
    : '<div class="empty">' + (rgoods.some(e => e.qty > 0) ? 'Data tidak ditemukan.' : 'Belum ada barang retur yang diinput.') + '</div>');
}
caps($('#brFQ')); addClear($('#brFQ'));
BRF.forEach(x => { $(x).addEventListener('input', renderBr); $(x).addEventListener('change', renderBr) });
$('#brFReset').onclick = () => { BRF.forEach(x => $(x).value = ''); $('#brFQ')._upd && $('#brFQ')._upd(); renderBr() };
$('#brList').addEventListener('click', e => {
  const ed = e.target.closest('[data-bredit]'), dl = e.target.closest('[data-brdel]');
  if (ed) return openSg('rgoods', ed.dataset.bredit);
  if (dl) {
    const id = dl.dataset.brdel, r0 = rgoods.find(x => x.id === id); if (!r0) return;
    askYN('Yakin menghapus barang retur ' + r0.name + (r0.vn ? ' · ' + r0.vn : '') + ' (' + r0.qty + ' pcs, ' + brCondOf(r0) + ')?' + (gdUse(r0) ? ' Stok di Barang Gudang dan Database Produk ikut berkurang.' : ''), () => {
      const r = rgoods.find(x => x.id === id); if (!r) return;
      const left = rgoods.filter(x => x.id !== id);
      if (gdAvail(left, r.name, r.vn || '') < 0) return alert('Tidak bisa dihapus: sebagian barang ini sudah dikeluarkan dari gudang, stok akan menjadi minus. Hapus / ubah pengeluarannya dulu.');
      const lop = logH('BARANG GUDANG', 'hapus', 'Barang retur ' + r.name + (r.vn ? ' · ' + r.vn : '') + ' · ' + r.qty + ' pcs · ' + brCondOf(r), [{ c: 'rgoods', b: cl(r), a: null }]);
      rgoods = left; commit([['rgoods', 'del', id], lop]); refresh();
    });
  }
});
function renderGd() {
  const q = $('#gdSearch').value, showAll = $('#gdAll').checked, all = gdStock();
  const L = all.filter(g => (showAll || g.qty > 0) && tokOk(g.name + ' ' + g.vn, q));
  const sum = sumBar([stag('Total data', NF(L.length)), stag('Total item', NF(L.reduce((s, g) => s + Math.max(0, g.qty), 0)) + ' pcs')]);
  const found = q.trim() && L.some(g => g.qty > 0) ? '<div class="gdhint">✅ Ada barang retur yang cocok. Pakai stok ini dulu sebelum mengajukan barang baru. Klik barisnya untuk mengambil.</div>' : '';
  const none = q.trim() && !L.some(g => g.qty > 0) ? '<div class="gdhint warn">Tidak ada stok retur yang cocok dengan pencarian ini. Silakan ajukan barang baru.</div>' : '';
  $('#gdList').innerHTML = sum + found + none + (L.length
    ? `<div class="tw"><table style="min-width:720px"><thead><tr><th>No</th><th>Nama Barang</th><th>Varian</th><th>Qty Tersedia</th><th>Update Terakhir</th><th></th></tr></thead><tbody>${L.map((g, i) => `<tr data-gdk="${encodeURIComponent(g.name + '|' + g.vn)}">
      <td>${i + 1}</td><td><b>${esc(g.name)}</b></td><td>${g.vn ? sw(gdColor(g.name, g.vn), g.vn) + ' ' + esc(g.vn) : '-'}</td><td><span class="tag ${g.qty > 0 ? 'in' : 'out'}">${nfm(g.qty)} pcs</span></td><td class="nw">${fmt(g.last)}${tm(g.last)}</td><td class="nw"><button class="btn ghost sm" data-gdgedit="${encodeURIComponent(g.name + '|' + g.vn)}" type="button">Edit</button> <button class="btn ghost sm" data-gdgdel="${encodeURIComponent(g.name + '|' + g.vn)}" type="button">Hapus</button></td></tr>`).join('')}</tbody></table></div>`
    : (q.trim() ? '' : '<div class="empty">Belum ada barang di gudang. Barang retur yang diinput lewat menu Barang Retur akan muncul di sini.</div>'));
}
caps($('#gdSearch')); $('#gdSearch').addEventListener('input', renderGd); $('#gdAll').addEventListener('change', renderGd);
let gdCur = null;
$('#gdList').addEventListener('click', e => {
  const be = e.target.closest('[data-gdgedit]'), bd = e.target.closest('[data-gdgdel]');
  if (be) return openGe(decodeURIComponent(be.dataset.gdgedit));
  if (bd) return delGe(decodeURIComponent(bd.dataset.gdgdel));
  const tr = e.target.closest('tr[data-gdk]'); if (!tr) return;
  const [name, vn] = decodeURIComponent(tr.dataset.gdk).split('|'); gdCur = { name, vn }; $('#gdOutQty').value = ''; $('#gdOutNote').value = ''; msg('#gdMsg', ''); renderGdDetail(); $('#gdmdl').hidden = false;
});
// edit / hapus satu barang gudang secara keseluruhan (semua catatan nama + varian itu)
let geCur = null;
const geEntries = c => rgoods.filter(e => e.name === c.name && (e.vn || '') === c.vn);
function openGe(key) {
  const [name, vn] = key.split('|'); geCur = { name, vn };
  $('#geName').value = name; $('#geVar').value = vn; $('#geQty').value = Math.max(0, gdAvail(rgoods, name, vn));
  brLists(name); msg('#geMsg', ''); $('#gemdl').hidden = false;
}
const closeGe = () => { $('#gemdl').hidden = true; geCur = null };
$('#geCancel').onclick = closeGe; $('#gemdl').addEventListener('mousedown', e => { if (e.target === $('#gemdl')) closeGe() });
caps($('#geName')); caps($('#geVar')); $('#geName').addEventListener('input', () => brLists(normName($('#geName').value)));
$('#geSave').onclick = () => {
  if (!geCur) return;
  const name = normName($('#geName').value), vn = normName($('#geVar').value), q = parseInt($('#geQty').value, 10);
  if (!name) return msg('#geMsg', 'Nama barang wajib diisi.');
  if (isNaN(q) || q < 0) return msg('#geMsg', 'Qty tersedia harus angka 0 atau lebih.');
  const ops = [], renamed = name !== geCur.name || vn !== geCur.vn;
  const ldocs = [], oldLbl = geCur.name + (geCur.vn ? ' · ' + geCur.vn : '');
  if (renamed) geEntries(geCur).forEach(e => { const b = cl(e); e.name = name; e.vn = vn; ops.push(['rgoods', 'set', e]); ldocs.push({ c: 'rgoods', b, a: cl(e) }) }); // nama / varian diganti di semua catatan
  const diff = q - gdAvail(rgoods, name, vn); // selisih qty dicatat sebagai koreksi stok
  if (diff) {
    const e = diff > 0 ? { id: uid(), ts: Date.now(), name, vn, qty: diff, kind: 'in', cond: 'Baik', ket: 'Koreksi stok', note: '', adm: me ? me.name : '' } : { id: uid(), ts: Date.now(), name, vn, qty: diff, kind: 'out', note: 'Koreksi stok', adm: me ? me.name : '' };
    rgoods.unshift(e); ops.push(['rgoods', 'set', e]); ldocs.push({ c: 'rgoods', b: null, a: cl(e) });
  }
  if (!ops.length) return closeGe();
  ops.push(logH('BARANG GUDANG', 'edit', oldLbl + (renamed ? ' → ' + name + (vn ? ' · ' + vn : '') : '') + (diff ? ' · koreksi qty ' + (diff > 0 ? '+' : '') + diff : ''), ldocs));
  if (q > 0 && (renamed || diff > 0)) { const pr = ensureProd(name, vn); if (pr.changed) ops.push(['products', 'set', pr.p]) }
  if (!commit(ops)) return msg('#geMsg', 'Penyimpanan penuh.');
  closeGe(); refresh(); renderProducts();
};
function delGe(key) {
  const [name, vn] = key.split('|'), c = { name, vn }, all = geEntries(c); if (!all.length) return;
  askYN('Yakin menghapus SELURUH data barang gudang ' + name + (vn ? ' · ' + vn : '') + ' (' + nfm(Math.max(0, gdAvail(rgoods, name, vn))) + ' pcs tersedia, ' + all.length + ' catatan)? Stok di Database Produk dari barang ini juga hilang dan tidak bisa dipulihkan.', () => {
    const ids = new Set(all.map(e => e.id)), lop = logH('BARANG GUDANG', 'hapus', name + (vn ? ' · ' + vn : '') + ' · seluruh barang (' + all.length + ' catatan)', all.map(e => ({ c: 'rgoods', b: cl(e), a: null })));
    rgoods = rgoods.filter(e => !ids.has(e.id));
    commit([...ids].map(id => ['rgoods', 'del', id]).concat([lop])); if (gdCur && gdCur.name === name && gdCur.vn === vn) closeGd(); refresh();
  });
}
function renderGdDetail() {
  if (!gdCur) return;
  const ev = rgoods.filter(e => e.name === gdCur.name && (e.vn || '') === gdCur.vn && gdUse(e)).sort((a, b) => b.ts - a.ts), qty = ev.reduce((s, e) => s + (Number(e.qty) || 0), 0);
  $('#gdTitle').textContent = gdCur.name + (gdCur.vn ? ' · ' + gdCur.vn : ''); $('#gdQty').textContent = nfm(qty);
  $('#gdInT').textContent = nfm(ev.filter(e => e.qty > 0).reduce((s, e) => s + e.qty, 0)); $('#gdOutT').textContent = nfm(-ev.filter(e => e.qty < 0).reduce((s, e) => s + e.qty, 0)); $('#gdNum').textContent = nfm(ev.length);
  if (!ev.length) return closeGd();
  $('#gdHist').innerHTML = `<table style="min-width:640px"><thead><tr><th>Waktu</th><th>Jenis</th><th>Qty</th><th>Kondisi</th><th>Admin</th><th>Keterangan</th><th></th></tr></thead><tbody>${ev.map(e => `<tr><td class="nw">${fmt(e.ts)}${tm(e.ts)}</td><td><span class="tag ${e.qty > 0 ? 'in' : 'out'}">${e.qty > 0 ? 'Masuk' : 'Keluar'}</span></td><td>${e.qty > 0 ? '+' : ''}${nfm(e.qty)}</td><td>${e.qty > 0 && e.cond ? esc(e.cond) : '-'}</td><td>${esc(e.adm || '-')}</td><td><div class="wrapc">${esc((e.qty > 0 ? e.ket : e.note) || '-')}</div></td><td class="nw"><button class="btn ghost sm" data-gdedit="${e.id}" type="button">Edit</button> <button class="btn ghost sm" data-gddel="${e.id}" type="button">Hapus</button></td></tr>`).join('')}</tbody></table>`;
  $('#gdOut').disabled = $('#gdOutQty').disabled = qty <= 0;
}
const closeGd = () => { $('#gdmdl').hidden = true; gdCur = null };
$('#gdHist').addEventListener('click', e => { // edit / hapus riwayat gerak barang langsung dari popup
  const ed = e.target.closest('[data-gdedit]'), dl = e.target.closest('[data-gddel]');
  if (ed) return openSg('rgoods', ed.dataset.gdedit);
  if (dl) {
    const id = dl.dataset.gddel, r0 = rgoods.find(x => x.id === id); if (!r0) return;
    askYN('Yakin menghapus ' + (r0.qty > 0 ? 'barang masuk ' : 'pengeluaran ') + r0.name + (r0.vn ? ' · ' + r0.vn : '') + ' (' + Math.abs(r0.qty) + ' pcs)?', () => {
      const left = rgoods.filter(x => x.id !== id);
      if (gdAvail(left, r0.name, r0.vn || '') < 0) return alert('Tidak bisa dihapus: sebagian barang ini sudah dikeluarkan dari gudang, stok akan menjadi minus. Hapus / ubah pengeluarannya dulu.');
      const lop = logH('BARANG GUDANG', 'hapus', (r0.qty > 0 ? 'Barang masuk ' : 'Pengeluaran ') + r0.name + (r0.vn ? ' · ' + r0.vn : '') + ' · ' + Math.abs(r0.qty) + ' pcs', [{ c: 'rgoods', b: cl(r0), a: null }]);
      rgoods = left; commit([['rgoods', 'del', id], lop]); refresh();
    });
  }
});
$('#gdClose').onclick = closeGd; $('#gdmdl').addEventListener('mousedown', e => { if (e.target === $('#gdmdl')) closeGd() });
$('#gdOut').onclick = () => {
  if (!gdCur) return;
  const avail = () => rgoods.filter(e => e.name === gdCur.name && (e.vn || '') === gdCur.vn && gdUse(e)).reduce((s, e) => s + (Number(e.qty) || 0), 0), q = parseInt($('#gdOutQty').value, 10);
  if (!(q >= 1)) return msg('#gdMsg', 'Isi jumlah yang diambil (minimal 1).');
  if (q > avail()) return msg('#gdMsg', 'Stok hanya tersedia ' + avail() + ' pcs.');
  const { name, vn } = gdCur;
  askYN('Yakin mengeluarkan ' + q + ' pcs ' + name + (vn ? ' · ' + vn : '') + ' dari Barang Gudang?', () => {
    if (q > avail()) return msg('#gdMsg', 'Stok sudah berubah, hanya tersedia ' + avail() + ' pcs.');
    const e = { id: uid(), ts: Date.now(), name, vn, qty: -q, kind: 'out', note: $('#gdOutNote').value.trim(), adm: me ? me.name : '' };
    rgoods.unshift(e); commit([['rgoods', 'set', e]]); $('#gdOutQty').value = ''; $('#gdOutNote').value = ''; msg('#gdMsg', q + ' pcs dikeluarkan dari gudang.', true); renderGdDetail(); renderGd();
  });
};
// pengajuan: ingatkan jika barang yang sama masih ada di Barang Gudang
function gdHint() {
  const el = $('#pgGd'); if (!el) return;
  const nm = pgProd ? normName(pgProd.name) : normName(pgSearch.text()), vn = pgVar ? normName(pgVar.n) : '';
  let L = nm && (pgProd || nm.length >= 3) ? gdStock().filter(g => g.qty > 0 && (pgProd ? g.name === nm : g.name.includes(nm)) && (!vn || g.vn === vn)) : [];
  if (!L.length) { el.hidden = true; return }
  el.innerHTML = '📦 Barang retur masih tersedia di Barang Gudang: ' + L.slice(0, 6).map(g => '<b>' + esc(g.name) + (g.vn ? ' · ' + esc(g.vn) : '') + '</b> ' + nfm(g.qty) + ' pcs').join('; ') + (L.length > 6 ? ' dan lainnya' : '') + '.' + (can('gd') ? ' <button type="button" class="lnk" data-gdgo="' + esc(nm) + '">Cek Barang Gudang</button>' : '');
  el.hidden = false;
}
$('#pgGd').onclick = e => { const b = e.target.closest('[data-gdgo]'); if (b) { $('#gdSearch').value = b.dataset.gdgo; go('gd') } };

function renderProducts() {
  const q = $('#pSearch').value.trim().toLowerCase();
  const L = products.filter(p => !q || p.name.toLowerCase().includes(q) || p.variants.some(v => v.n.toLowerCase().includes(q)));
  $('#pList').innerHTML = pdSum(L) + '<label>Daftar Produk (' + (q ? L.length + ' dari ' : '') + products.length + ')</label>' + (L.length ? L.map(p => `<div class="pl">
    <div><b>${esc(p.name)}</b><div style="margin-top:6px">${p.variants.length ? p.variants.map(v => sw(v.c, v.n)).join(' ') : '<span style="color:var(--mute);font-size:13px">Tanpa varian</span>'}</div></div>
    <div class="nw"><button class="btn ghost sm" data-pe="${p.id}">Edit</button> <button class="btn ghost sm" data-p="${p.id}">Hapus</button></div></div>`).join('') : '<div class="empty">' + (products.length ? 'Produk tidak ditemukan.' : 'Belum ada produk.') + '</div>');
}
$('#pSearch').oninput = renderProducts;
caps($('#pSearch')); caps($('#pName'));
$('#pFix').onclick = () => {
  if (!confirm('Seragamkan semua nama produk & varian menjadi HURUF KAPITAL dan gabungkan produk yang namanya sama persis? Pengajuan dan Purchase lama ikut diseragamkan.')) return;
  const keep = {}, idMap = {}, out = [], ops = [];
  products.forEach(p => {
    const key = normName(p.name);
    const k = keep[key] || (keep[key] = { id: p.id, name: key, variants: [] });
    if (k.id === p.id && !out.includes(k)) out.push(k);
    idMap[p.id] = k.id;
    (p.variants || []).forEach(v => { const vn = normName(v.n); if (!k.variants.some(x => x.n === vn)) k.variants.push({ n: vn, c: v.c }) });
  });
  const lost = products.length - out.length;
  products.forEach(p => { if (idMap[p.id] !== p.id) ops.push(['products', 'del', p.id]) });
  out.forEach(k => ops.push(['products', 'set', k]));
  reqs.forEach(r => { r.pid = idMap[r.pid] || r.pid; r.prod = normName(r.prod); r.vn = normName(r.vn); ops.push(['requests', 'set', r]) });
  records.forEach(r => { r.prod = normName(r.prod); r.vn = normName(r.vn); ops.push(['records', 'set', r]) });
  products = out; commit(ops); renderProducts(); renderReqs();
  alert('Selesai. ' + lost + ' produk dobel digabung, semua nama menjadi huruf kapital.');
};
$('#pList').onclick = e => {
  if (e.target.dataset.pe) return openPEdit(e.target.dataset.pe);
  const id = e.target.dataset.p;
  if (!id || !confirm('Hapus produk ini? Data pengajuan dan purchase lama tetap tersimpan.')) return;
  products = products.filter(p => String(p.id) !== id); commit([['products', 'del', id]]); renderProducts();
};

/* ---------- edit produk (popup) ---------- */
// terapkan hasil edit ke produk + pengajuan + purchase yang terkait (nama produk & varian tersimpan di tiap data); kembalikan ops
function applyProductEdit(p, name, rows) {
  const oldName = p.name, oldVars = p.variants.slice(), map = {}, ops = [['products', 'set', p]];
  rows.forEach(r => { if (r.orig !== '') map[r.orig] = { n: r.n, c: r.c } });
  p.name = name; p.variants = rows.map(r => ({ n: r.n, c: r.c }));
  const fix = x => {
    let i = oldVars.findIndex(v => v.n === x.vn && v.c === x.vc); if (i < 0) i = oldVars.findIndex(v => v.n === x.vn);
    const nv = i >= 0 ? map[String(i)] : null, before = x.prod + '|' + x.vn + '|' + x.vc;
    x.prod = name; if (nv) { x.vn = nv.n; x.vc = nv.c }
    return before !== x.prod + '|' + x.vn + '|' + x.vc;
  };
  const ids = new Set();
  reqs.forEach(x => { if (String(x.pid) === String(p.id)) { ids.add(x.id); if (fix(x)) ops.push(['requests', 'set', x]) } });
  records.forEach(x => { if (ids.has(x.rid) || (!reqs.some(q => q.id === x.rid) && x.prod === oldName)) { if (fix(x)) ops.push(['records', 'set', x]) } });
  return ops;
}
let pERec = null;
function pEVarRow(n, c, orig) {
  const d = document.createElement('div'); d.className = 'vrow'; d.dataset.orig = orig;
  d.innerHTML = `<input type="color" value="${c}"><input placeholder="Nama warna" value="${esc(n)}"><button class="btn ghost sm" type="button">Hapus</button>`;
  const ni = d.querySelector('input:not([type=color])'), ci = d.querySelector('input[type=color]');
  caps(ni); if (orig === '') ni.addEventListener('input', () => { const h = toHex(ni.value); if (h) ci.value = h }); // warna baru: warna terisi otomatis dari nama
  d.querySelector('button').onclick = () => d.remove(); $('#pEVars').appendChild(d);
}
function openPEdit(id) {
  const p = products.find(x => String(x.id) === String(id)); if (!p) return;
  pERec = p.id; $('#pEName').value = p.name; $('#pEVars').innerHTML = '';
  p.variants.forEach((v, i) => pEVarRow(v.n, v.c, String(i)));
  msg('#pEMsg', ''); $('#pmdl').hidden = false;
}
const closePE = () => { $('#pmdl').hidden = true; pERec = null };
caps($('#pEName'));
$('#pEAdd').onclick = () => pEVarRow('', '#4a7bd0', '');
$('#pECancel').onclick = closePE;
$('#pmdl').onclick = e => { if (e.target.id === 'pmdl') closePE() };
$('#pESave').onclick = () => {
  const p = products.find(x => String(x.id) === String(pERec)); if (!p) return closePE();
  const name = normName($('#pEName').value);
  if (!name) return msg('#pEMsg', 'Isi nama produk.');
  if (products.some(x => x !== p && normName(x.name) === name)) return msg('#pEMsg', 'Sudah ada produk lain dengan nama itu. Untuk menggabungkan, pakai tombol "Rapikan & gabungkan produk lama".');
  const rows = [...$$('#pEVars .vrow')].map(r => ({ orig: r.dataset.orig, c: r.querySelector('input[type=color]').value, n: normName(r.querySelector('input:not([type=color])').value) }));
  if (rows.some(r => !r.n)) return msg('#pEMsg', 'Nama warna tidak boleh kosong.');
  const seen = new Set(); for (const r of rows) { if (seen.has(r.n)) return msg('#pEMsg', 'Nama warna kembar: ' + r.n); seen.add(r.n) }
  const ops = applyProductEdit(p, name, rows);
  if (!commit(ops)) return msg('#pEMsg', 'Penyimpanan penuh.');
  closePE(); renderProducts(); renderReqs(); renderTable();
};

/* input massal */
const CN = { merah: 'red', biru: 'blue', hijau: 'green', kuning: 'yellow', hitam: 'black', putih: 'white', abu: 'gray', 'abu-abu': 'gray', oranye: 'orange', jingga: 'orange', ungu: 'purple', coklat: 'brown', cokelat: 'brown', 'hijau tua': 'darkgreen', 'biru tua': 'navy', 'biru muda': 'lightblue', 'merah muda': 'pink', 'abu abu': 'gray', emas: 'gold', perak: 'silver', krem: '#f5f0dc', tosca: 'turquoise', army: '#4b5320', mocca: '#8b6b4a' };
function toHex(s) {
  s = String(s || '').trim().toLowerCase(); if (!s) return null; s = CN[s] || s;
  const x = document.createElement('canvas').getContext('2d');
  x.fillStyle = '#010203'; x.fillStyle = s;
  return x.fillStyle === '#010203' && s !== '#010203' ? null : x.fillStyle;
}
$('#tpl').onclick = () => {
  const csv = 'Produk,Varian,Warna\nKaos Polos,Biru,#3b82f6\nKaos Polos,Merah,#ef4444\nTas Kanvas,,\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'template-produk.csv'; a.click();
};
$('#impFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  if (!window.XLSX) return msg('#impMsg', 'Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const wb = XLSX.read(rd.result, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      let np = 0, nv = 0, bad = 0; const touched = new Set();
      rows.forEach(row => {
        const k = {}; Object.keys(row).forEach(x => k[x.trim().toLowerCase()] = row[x]);
        const name = normName(k.produk || k['nama produk'] || k.nama || '');
        if (!name) { bad++; return }
        let p = products.find(x => normName(x.name) === name);
        if (!p) { p = { id: uid(), name, variants: [] }; products.push(p); np++ }
        touched.add(p);
        const vn = String(k.varian || '').trim(), col = String(k.warna || '').trim();
        if (!vn && !col) return;
        const c = toHex(col || vn), nm = normName(vn || col);
        if (!c) { bad++; return }
        if (!p.variants.some(v => normName(v.n) === nm)) { p.variants.push({ n: nm, c }); nv++ }
      });
      if (!commit([...touched].map(p => ['products', 'set', p]))) return msg('#impMsg', 'Penyimpanan penuh.');
      renderProducts();
      msg('#impMsg', `${np} produk baru, ${nv} varian ditambahkan` + (bad ? `, ${bad} baris dilewati (nama/warna tidak valid).` : '.'), true);
    } catch (err) { msg('#impMsg', 'File tidak bisa dibaca. Gunakan format .xlsx atau .csv.') }
    $('#impFile').value = '';
  };
  rd.readAsArrayBuffer(f);
};

/* ---------- mulai ---------- */
[$('#pSearch'), $('#fqProd'), $('#fqSj'), $('#xProd'), $('#dlFile'), $('#rwQ'), $('#bdQ'), $('#bdToko')].forEach(addClear);
$$('.tm24').forEach(time24);
bdSuggest($('#bdQ'), bdQItems); bdSuggest($('#bdToko'), bdTokoItems);
let curDay = dayWIB(Date.now());
const dayCheck = () => {
  const d = dayWIB(Date.now());
  if (d !== curDay) { // ganti hari: filter tanggal yang masih di "hari kemarin" ikut pindah ke hari baru
    if ($('#xFromD').value === curDay) $('#xFromD').value = d;
    if ($('#xToD').value === curDay) $('#xToD').value = d;
    curDay = d; renderReqs(); refreshBlocks(); renderNotif(); if ($('#dl').classList.contains('on')) renderDl();
  }
};
setInterval(dayCheck, 30000); document.addEventListener('visibilitychange', dayCheck);
/* ---------- login admin ---------- */
function sha256(str) { // hash password (SHA-256, JavaScript murni, sama di semua perangkat)
  const b = unescape(encodeURIComponent(str)), K = [], H = []; let n = 2;
  while (K.length < 64) { let p = true; for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break }
    if (p) { if (H.length < 8) H.push(Math.floor(Math.pow(n, .5) % 1 * 4294967296) | 0); K.push(Math.floor(Math.pow(n, 1 / 3) % 1 * 4294967296) | 0) } n++ }
  const l = b.length, w = new Array((((l + 8) >> 6) + 1) * 16).fill(0), R = (x, c) => (x >>> c) | (x << (32 - c));
  for (let i = 0; i < l; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
  w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[w.length - 1] = l * 8;
  for (let j = 0; j < w.length; j += 16) {
    const W = w.slice(j, j + 16); let [a, b2, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      if (i >= 16) { const x = W[i - 15], y = W[i - 2]; W[i] = (W[i - 16] + (R(x, 7) ^ R(x, 18) ^ (x >>> 3)) + W[i - 7] + (R(y, 17) ^ R(y, 19) ^ (y >>> 10))) | 0 }
      const t1 = (h + (R(e, 6) ^ R(e, 11) ^ R(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0, t2 = ((R(a, 2) ^ R(a, 13) ^ R(a, 22)) + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
    }
    [a, b2, c, d, e, f, g, h].forEach((v, i) => H[i] = (H[i] + v) | 0);
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
const pwHash = (u, p) => sha256('pp1:' + u + ':' + p);
// Akun khusus pemilik: role Owner (akses ke semua halaman), dibuat otomatis jika belum ada, tidak bisa dihapus / diganti rolenya lewat menu.
// Yang disimpan di sini hanya hash password awal; segera ganti password setelah login pertama (gembok > Admin & Akses > Reset password).
const SUPER = { username: 'rievvv__', name: 'ARIEF', pass: '3c98a7738fcda20074e51df572e6d78ca2fe7a29112dd25b6cb97f44c60d9fea' };
const SUPER_OLD = ['riev_']; // akun khusus versi sebelumnya: dihapus otomatis (passwordnya sudah tidak aman)
const withTimeout = (p, ms = 12000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no({ code: 'timeout', message: 'server tidak merespon' }), ms))]);
async function adminGet(u) {
  if (db) { const s = await withTimeout(db.collection('admins').doc(u).get({ source: 'server' })); return s.exists ? s.data() : null }
  return store.get('pp_admins', {})[u] || null;
}
async function adminCreate(rec) {
  if (db) { // tanpa transaction (transaction sering gagal di jaringan yang membatasi koneksi Firestore)
    const ref = db.collection('admins').doc(rec.username);
    if ((await withTimeout(ref.get({ source: 'server' }))).exists) throw new Error('exists');
    await withTimeout(ref.set(rec));
  } else {
    const a = store.get('pp_admins', {}); if (a[rec.username]) throw new Error('exists');
    a[rec.username] = rec; store.set('pp_admins', a); admins.push(rec);
  }
}
/* ---------- ROLE & HAK AKSES ---------- */
const ROLES = ['Admin', 'Gudang', 'Picker', 'Packing', 'Owner', 'Retur', 'Tamu']; // Tamu = masuk tanpa akun
const PAGES = { pg: 'Pengajuan', in: 'Input Barang Masuk', pu: 'Purchase', dl: 'Download', rw: 'Riwayat', pr: 'Database Produk', gd: 'Barang Gudang', rt: 'Input Retur', bd: 'Laporan Retur', br: 'Barang Retur', ow: 'Dashboard Khusus (gembok)' };
const DEF_PERMS = {
  Admin: ['pg', 'in', 'pu', 'dl', 'rw', 'pr', 'gd', 'rt', 'bd', 'br', 'ow'],
  Gudang: ['in', 'pu', 'pr', 'gd'],
  Picker: ['pg', 'gd'],
  Packing: ['pu', 'gd'],
  Owner: ['pg', 'in', 'pu', 'dl', 'rw', 'pr', 'gd', 'rt', 'bd', 'br', 'ow'],
  Retur: ['rt', 'bd', 'br', 'gd'],
  Tamu: ['pg', 'in', 'pu', 'dl', 'rw', 'pr', 'gd']
};
const OLD_KEYS = ['pg', 'in', 'pu', 'dl', 'rw', 'pr', 'rt', 'bd', 'ow']; // halaman yang sudah ada saat pengaturan role lama disimpan
const DEF_DESC = {
  Admin: 'Mengelola seluruh data: pengajuan, input barang masuk, purchase, download, riwayat, dan produk.',
  Gudang: 'Menerima barang masuk dan mencatat purchase; mengelola database produk dan barang gudang.',
  Picker: 'Mengambil barang sesuai pengajuan; hanya melihat dan menginput pengajuan.',
  Packing: 'Mengecek hasil penerimaan barang (purchase) sebelum dikemas.',
  Owner: 'Pemilik: akses penuh termasuk Dashboard Khusus (kontrol admin, role, dan analisa).',
  Retur: 'Menginput retur / pengembalian, mencatat barang retur ke gudang, dan memantau Laporan Retur marketplace.',
  Tamu: 'Masuk tanpa akun; nama admin tidak tercatat.'
};
let rolesCfg = null, roleDirty = false; // pengaturan role yang disimpan pemilik (menimpa default)
const permsOf = r => { // halaman baru (belum ada saat pengaturan disimpan) ikut aturan default role sampai pemilik menyimpan ulang
  const c = rolesCfg && rolesCfg.perms && rolesCfg.perms[r]; if (!c) return DEF_PERMS[r] || [];
  const seen = rolesCfg.seen || OLD_KEYS; return c.concat((DEF_PERMS[r] || []).filter(k => !seen.includes(k) && !c.includes(k)));
};
const descOf = r => (rolesCfg && rolesCfg.desc && rolesCfg.desc[r]) || DEF_DESC[r] || '';
const defRole = () => (rolesCfg && rolesCfg.defRole) || 'Admin';
const roleName = () => { if (!me) return 'Tamu'; if (me.username === SUPER.username) return 'Owner'; const a = admins.find(x => x.username === me.username); return (a && a.role) || me.role || 'Admin' };
const can = k => roleName() === 'Owner' || permsOf(roleName()).includes(k); // Owner selalu boleh semua halaman
const firstPage = () => ['pg', 'in', 'pu', 'rt', 'bd', 'br', 'dl', 'rw', 'pr', 'gd'].find(can);
let superDone = false;
async function ensureSuper() { // dibuat sekali per sesi bila belum ada; bila ada, dipastikan tetap Owner (password yang sudah diganti tidak ditimpa)
  if (superDone) return; superDone = true;
  const rec = { username: SUPER.username, name: SUPER.name, pass: SUPER.pass, ts: Date.now(), role: 'Owner', sys: true };
  try {
    const cur = admins.find(a => a.username === SUPER.username);
    const old = admins.filter(a => SUPER_OLD.includes(a.username) && a.sys);
    if (db) {
      for (const o of old) await withTimeout(db.collection('admins').doc(o.username).delete());
      const ref = db.collection('admins').doc(SUPER.username);
      if (!cur || !cur.sys) await withTimeout(ref.set(rec)); // belum ada, atau username-nya sempat didaftarkan orang lain: ambil alih
      else if (cur.role !== 'Owner' || cur.name !== SUPER.name) await withTimeout(ref.set(Object.assign({}, cur, { role: 'Owner', name: SUPER.name })));
    } else {
      const o = store.get('pp_admins', {}), c = o[SUPER.username];
      old.forEach(x => delete o[x.username]);
      if (!c || !c.sys) o[SUPER.username] = rec; else { c.role = 'Owner'; c.name = SUPER.name }
      store.set('pp_admins', o); admins = Object.values(o);
    }
  } catch (e) { console.error('akun khusus', e); superDone = false }
}
function syncMe() { // data akun berubah (mis. role diganti pemilik) -> ikut diperbarui di perangkat ini
  if (me) { const a = admins.find(x => x.username === me.username); if (a) { me.name = UN(a.name); me.role = a.role || 'Admin' } }
  applyRole();
}
function applyRole() {
  $$('nav button[data-t]').forEach(b => b.style.display = can(b.dataset.t) ? '' : 'none');
  $$('.ng').forEach(g => g.style.display = g.dataset.p.split(',').some(can) ? '' : 'none');
  $('#lockBtn').style.display = can('ow') ? '' : 'none';
  renderWho(); renderNotif();
  const cur = ($('.sec.on') || {}).id;
  if (!cur || !can(cur)) { const f = firstPage(); if (f) go(f); else { $$('.sec').forEach(x => x.classList.remove('on')); $('#pt').textContent = 'Tidak ada akses'; $('#ps').textContent = 'Role kamu belum diberi halaman. Hubungi pemilik.' } }
}

const authMsg = (t, ok) => msg('#aMsg', t, ok);
function authErr(e, base) { // tampilkan penyebab sebenarnya, bukan selalu "periksa internet"
  const c = (e && e.code) || '';
  if (c.includes('permission')) return base + ' Ditolak Rules Firestore: di Firebase Console > Firestore > Rules, izinkan koleksi "admins" (allow read, write: if true;) lalu Publish.';
  if (c === 'timeout' || c.includes('unavailable')) return base + ' Server Firebase tidak merespon (cek internet, VPN/ad-blocker, atau Firestore Database belum dibuat).';
  if (c.includes('not-found')) return base + ' Firestore Database belum dibuat di project Firebase.';
  return base + ' Detail: ' + (c || (e && e.message) || 'tidak diketahui');
}
function authTab(t) {
  $$('.atabs button').forEach(b => b.classList.toggle('on', b.dataset.a === t));
  $('#fLogin').hidden = t !== 'in'; $('#fSignup').hidden = t !== 'up'; authMsg('');
}
function showAuth(t) { $('#auth').hidden = false; authTab(t || 'in') }
function renderWho() {
  $('#who').textContent = me ? '👤 ' + me.name + ' · ' + roleName() : '👤 Tamu';
  $('#who').title = (me ? 'Role ' + roleName() + ': ' : 'Tamu: ') + descOf(roleName()) + (me ? ' (klik untuk keluar)' : ' (klik untuk masuk / daftar)');
}
function setMe(m) { me = m; store.set('pp_session', m ? { username: m.username, name: m.name, role: m.role } : { guest: true }); $('#auth').hidden = true; renderWho(); applyRole(); refresh() }
$$('.atabs button').forEach(b => b.onclick = () => authTab(b.dataset.a));
$('#who').onclick = () => {
  if (!me) return showAuth('in');
  if (!confirm('Keluar dari akun ' + me.name + '?')) return;
  store.set('pp_session', null); me = null; renderWho(); refresh(); showAuth('in');
};
$('#guestBtn').onclick = () => setMe(null); // masuk tanpa akun: nama admin tidak terisi
$('#fLogin').onsubmit = async e => {
  e.preventDefault();
  const u = $('#lUser').value.trim().toLowerCase(), p = $('#lPass').value;
  if (!u || !p) return authMsg('Isi username dan password.');
  try {
    if (u === SUPER.username && db) { // akun khusus: dibuat saat itu juga bila belum ada (password yang sudah diganti tidak ditimpa)
      const ref = db.collection('admins').doc(u), sn = await withTimeout(ref.get({ source: 'server' }));
      if (!sn.exists || !sn.data().sys) await withTimeout(ref.set({ username: SUPER.username, name: SUPER.name, pass: SUPER.pass, ts: Date.now(), role: 'Owner', sys: true }));
    }
    const a = await adminGet(u);
    if (!a || a.pass !== pwHash(u, p)) return authMsg('Username atau password salah.');
    $('#lPass').value = ''; setMe({ username: a.username, name: UN(a.name), role: a.role || 'Admin' });
  } catch (err) { console.error('login', err); authMsg(authErr(err, 'Tidak bisa terhubung ke server.')) }
};
$('#fSignup').onsubmit = async e => {
  e.preventDefault();
  const name = UN($('#sName').value), u = $('#sUser').value.trim().toLowerCase(), p = $('#sPass').value;
  if (!name) return authMsg('Isi nama.');
  if (!/^[a-z0-9._-]{3,20}$/.test(u)) return authMsg('Username 3-20 karakter: huruf kecil, angka, titik, strip, atau garis bawah.');
  if (p.length < 4) return authMsg('Password minimal 4 karakter.');
  if (u === SUPER.username) return authMsg('Username sudah dipakai, pilih yang lain.');
  try {
    const role = defRole();
    await adminCreate({ username: u, name, pass: pwHash(u, p), ts: Date.now(), role });
    $('#sPass').value = ''; setMe({ username: u, name, role });
  } catch (err) {
    console.error('signup', err);
    authMsg(err && err.message === 'exists' ? 'Username sudah dipakai, pilih yang lain.' : authErr(err, 'Gagal mendaftar.'));
  }
};
{ const s = store.get('pp_session', null);
  if (s && s.username) me = { username: s.username, name: UN(s.name), role: s.role };
  renderWho(); if (!s) showAuth('in'); }

/* ---------- DASHBOARD KHUSUS PEMILIK (ikon gembok) ---------- */
const OW_CODE = '030201';
let owOk = false, owTab = 'sum', owMore = {}, owSort = 'pcs';
const nf = n => Number(n || 0).toLocaleString('id-ID');
const pc = (a, b) => b ? Math.round(a / b * 100) : 0;
const tone = p => p >= 80 ? 'ok' : p >= 50 ? 'mid' : 'bad';
const pbar = p => `<div class="pb ${tone(p)}"><i style="width:${Math.min(100, p)}%"></i></div>`;
const kpi = (l, v, s, t) => `<div class="kc ${t || ''}"><span>${l}</span><b>${v}</b><small>${s || ''}</small></div>`;
const sumK = (a, k) => a.reduce((s, x) => s + (x[k] || 0), 0);
const dayTxt = d => d == null ? '-' : d < 1 ? '< 1 hari' : d.toFixed(1).replace('.', ',') + ' hari';
const avgL = g => g.L.length ? g.L.reduce((a, b) => a + b, 0) / g.L.length : null;
const NO_ADM = '(Tamu / tanpa nama)';

function owRange() {
  const p = $('#owPer').value, now = Date.now();
  $('#owFromW').hidden = $('#owToW').hidden = p !== 'custom';
  if (p === '7') return [now - 7 * 864e5, null];
  if (p === '30') return [now - 30 * 864e5, null];
  if (p === 'month') { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), null] }
  if (p === 'custom') { const a = $('#owFrom').value, b = $('#owTo').value; return [a ? new Date(a + 'T00:00:00').getTime() : null, b ? new Date(b + 'T23:59:59.999').getTime() : null] }
  return [null, null];
}
const inR = (ts, f, t) => (f === null || ts >= f) && (t === null || ts <= t);
function owData() {
  const [f, t] = owRange(), s = $('#owSrc').value, now = Date.now();
  const rs = reqs.filter(r => !s || r.src === s);
  const R = rs.map(r => pgView(r, f, t)).filter(Boolean);
  const E = []; // satu entri per input pengajuan yang masuk periode
  rs.forEach(r => reqEntries(r).forEach(e => { if (inR(e.ts, f, t)) E.push(Object.assign({ r }, e)) }));
  const recMax = {}; records.forEach(x => { if (x.rid && (!recMax[x.rid] || x.ts > recMax[x.rid])) recMax[x.rid] = x.ts });
  const lead = r => r.ada >= r.min && recMax[r.id] ? Math.max(0, (recMax[r.id] - r.ts) / 864e5) : null;
  return { f, t, s, now, rs, R, E, lead };
}
function grp(R, keyFn, lead, init) {
  const m = new Map();
  R.forEach(r => {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, Object.assign({ k, n: 0, freq: 0, min: 0, ada: 0, done: 0, L: [] }, init ? init(r) : {}));
    const g = m.get(k), l = lead(r);
    g.n++; g.freq += reqHist(r).length; g.min += r.min; g.ada += r.ada; if (r.ada >= r.min) g.done++; if (l != null) g.L.push(l);
  });
  return [...m.values()];
}
function trendSvg(E, f, t) {
  const end = t || Date.now(); let start = f !== null ? f : (E.length ? Math.min(...E.map(e => e.ts)) : end - 29 * 864e5);
  start = Math.max(start, end - 44 * 864e5);
  const days = [], last = new Date(dayWIB(end) + 'T00:00:00Z').getTime();
  for (let d = new Date(dayWIB(start) + 'T00:00:00Z').getTime(); d <= last; d += 864e5) days.push(new Date(d).toISOString().slice(0, 10));
  const m = {}; days.forEach(d => m[d] = { n: 0, a: 0 });
  E.forEach(e => { const d = dayWIB(e.ts); if (m[d]) { m[d].n += e.n; m[d].a += e.a } });
  const mx = Math.max(1, ...days.map(d => m[d].n)), W = 700, H = 200, pl = 40, pb = 24, ph = H - pb - 8, bw = (W - pl) / days.length, st = Math.ceil(days.length / 9);
  let g = [0, .5, 1].map(k => { const y = 8 + ph - ph * k; return `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" class="gl"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end" class="tx">${nf(Math.round(mx * k))}</text>` }).join('');
  days.forEach((d, i) => {
    const x = pl + i * bw + 1, w = Math.max(2, bw - 2), hn = ph * m[d].n / mx, ha = ph * m[d].a / mx;
    g += `<g><title>${d.split('-').reverse().join('-')}: diajukan ${nf(m[d].n)} pcs, terpenuhi ${nf(m[d].a)} pcs</title><rect x="${x}" y="${8 + ph - hn}" width="${w}" height="${hn}" class="bn"/><rect x="${x}" y="${8 + ph - ha}" width="${w}" height="${ha}" class="ba"/></g>`;
    if (i % st === 0) g += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle" class="tx">${d.slice(8)}/${d.slice(5, 7)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img" aria-label="Grafik pengajuan harian">${g}</svg>`;
}
const WD = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const wdOf = ts => new Date(dayWIB(ts) + 'T00:00:00Z').getUTCDay();
function momentum(D) { // 7 hari terakhir vs 7 hari sebelumnya (tidak terpengaruh filter periode)
  const m = {};
  D.rs.forEach(r => reqEntries(r).forEach(e => {
    const age = D.now - e.ts; if (age < 0 || age >= 14 * 864e5) return;
    const o = m[r.prod] = m[r.prod] || { k: r.prod, cur: 0, prev: 0 };
    age < 7 * 864e5 ? o.cur += e.n : o.prev += e.n;
  }));
  return Object.values(m);
}
function tabSum(D) {
  const { R, E, lead, f, t } = D, min = sumK(R, 'min'), ada = sumK(R, 'ada'), lines = R.length;
  const done = R.filter(r => r.ada >= r.min).length, part = R.filter(r => r.ada > 0 && r.ada < r.min).length, wait = R.filter(r => !r.ada).length;
  const L = R.map(lead).filter(x => x != null), al = L.length ? L.reduce((a, b) => a + b, 0) / L.length : null;
  const nProd = new Set(R.map(r => r.prod)).size, dl = downloads.filter(x => inR(x.ts, f, t)).length, fr = pc(ada, min);
  const wd = [0, 0, 0, 0, 0, 0, 0]; E.forEach(e => wd[wdOf(e.ts)] += e.n);
  const wmx = Math.max(1, ...wd), S = grp(R, r => r.src, lead).sort((a, b) => b.min - a.min);
  return `<div class="kpis">${kpi('Total diajukan', nf(min) + ' pcs', lines + ' baris pengajuan · ' + nProd + ' produk')}${kpi('Terpenuhi', nf(ada) + ' pcs', fr + '% dari yang diajukan', tone(fr))}${kpi('Belum terpenuhi', nf(min - ada) + ' pcs', 'backlog pengadaan', min - ada ? 'bad' : 'ok')}${kpi('Pengajuan lengkap', nf(done) + ' / ' + nf(lines), pc(done, lines) + '% baris selesai', tone(pc(done, lines)))}${kpi('Rata-rata waktu penuhi', dayTxt(al), L.length + ' pengajuan selesai')}${kpi('Download file', nf(dl), 'Excel / PDF pada periode ini')}</div>
  <div class="card"><h3>Status pengajuan</h3><div class="stk"><i class="ok" style="flex:${done}" title="Selesai"></i><i class="mid" style="flex:${part}" title="Sebagian"></i><i class="bad" style="flex:${wait}" title="Menunggu"></i></div>
  <div class="lg"><span><i class="ok"></i>Selesai ${nf(done)}</span><span><i class="mid"></i>Sebagian ${nf(part)}</span><span><i class="bad"></i>Menunggu ${nf(wait)}</span></div></div>
  <div class="card"><h3>Tren pengajuan harian</h3><p class="hint">Batang biru muda = pcs diajukan, hijau = pcs yang sudah terpenuhi dari pengajuan hari itu (maks. 45 hari terakhir pada periode).</p>${trendSvg(E, f, t)}</div>
  <div class="cols2"><div class="card"><h3>Hari tersibuk</h3><p class="hint">Total pcs diajukan per hari dalam seminggu.</p>${wd.map((v, i) => [i, v]).sort((a, b) => ((a[0] + 6) % 7) - ((b[0] + 6) % 7)).map(([i, v]) => `<div class="hb"><span>${WD[i]}</span><div class="pb"><i style="width:${pc(v, wmx)}%"></i></div><b>${nf(v)}</b></div>`).join('')}</div>
  <div class="card"><h3>Per asal barang</h3><p class="hint">Kecepatan & keandalan tiap sumber.</p><div class="tw"><table class="ot"><thead><tr><th>Asal</th><th>Diajukan</th><th>Terpenuhi</th><th>Waktu penuhi</th></tr></thead><tbody>${S.map(g => `<tr><td><span class="tag">${esc(g.k)}</span></td><td>${nf(g.min)}</td><td>${pc(g.ada, g.min)}%${pbar(pc(g.ada, g.min))}</td><td>${dayTxt(avgL(g))}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Belum ada data.</td></tr>'}</tbody></table></div></div></div>`;
}
function tabProd(D) {
  const { R, lead } = D, P = grp(R, r => r.prod, lead).sort(owSort === 'freq' ? (a, b) => b.freq - a.freq || b.min - a.min : (a, b) => b.min - a.min || b.freq - a.freq);
  const V = grp(R, r => r.prod + '|' + (r.vn || '-'), lead, r => ({ prod: r.prod, vn: r.vn || '-', vc: r.vc })).sort((a, b) => b.min - a.min);
  const crit = P.filter(p => p.min > p.ada).sort((a, b) => (b.min - b.ada) - (a.min - a.ada)).slice(0, 10);
  const names = new Set(R.map(r => r.prod)), dead = products.filter(p => !names.has(p.name));
  const lim = (k, a) => owMore[k] ? a : a.slice(0, 10), more = (k, a) => a.length > 10 ? `<button class="lnk" data-owmore="${k}">${owMore[k] ? 'Tampilkan 10 teratas saja' : 'Tampilkan semua (' + a.length + ')'}</button>` : '';
  return `<div class="card"><div class="owh"><h3>Produk paling sering diajukan</h3><select data-owsort style="width:auto"><option value="pcs"${owSort === 'pcs' ? ' selected' : ''}>Urut: total pcs</option><option value="freq"${owSort === 'freq' ? ' selected' : ''}>Urut: sering diajukan</option></select></div>
  <p class="hint">Dari yang terbanyak sampai tersedikit. "Sering diajukan" = berapa kali produk diinput; "Terpenuhi" = pcs yang sudah diterima.</p>
  <div class="tw"><table class="ot"><thead><tr><th>#</th><th>Produk</th><th>Diajukan (kali)</th><th>Diminta</th><th>Terpenuhi</th><th>% Terpenuhi</th><th>Baris lengkap</th><th>Kurang</th></tr></thead><tbody>${lim('p', P).map((p, i) => `<tr><td>${i + 1}</td><td><b>${esc(p.k)}</b></td><td>${nf(p.freq)}×</td><td>${nf(p.min)} pcs</td><td>${nf(p.ada)} pcs</td><td>${pc(p.ada, p.min)}%${pbar(pc(p.ada, p.min))}</td><td>${p.done} / ${p.n}</td><td>${nf(p.min - p.ada)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Belum ada data.</td></tr>'}</tbody></table></div>${more('p', P)}</div>
  <div class="card"><h3>Warna / varian terlaris</h3><div class="tw"><table class="ot"><thead><tr><th>#</th><th>Produk · Warna</th><th>Diminta</th><th>Terpenuhi</th></tr></thead><tbody>${lim('v', V).map((v, i) => `<tr><td>${i + 1}</td><td><span class="sw" style="background:${esc(v.vc || '#ccc')};width:14px;height:14px;margin-right:6px"></span><b>${esc(v.prod)}</b> · ${esc(v.vn)}</td><td>${nf(v.min)} pcs</td><td>${pc(v.ada, v.min)}%${pbar(pc(v.ada, v.min))}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Belum ada data.</td></tr>'}</tbody></table></div>${more('v', V)}</div>
  <div class="cols2"><div class="card"><h3>Perlu perhatian (kekurangan terbesar)</h3><p class="hint">Produk dengan pcs belum terpenuhi paling banyak.</p>${crit.map(p => `<div class="hb"><span>${esc(p.k)}</span><div class="pb bad"><i style="width:${pc(p.min - p.ada, crit[0].min - crit[0].ada)}%"></i></div><b>${nf(p.min - p.ada)}</b></div>`).join('') || '<div class="empty">Semua pengajuan sudah terpenuhi 🎉</div>'}</div>
  <div class="card"><h3>Produk tanpa pengajuan</h3><p class="hint">Ada di daftar produk, tetapi tidak pernah diajukan pada periode ini (${dead.length}).</p>${dead.slice(0, 30).map(p => `<span class="tag" style="display:inline-block;margin:0 6px 6px 0">${esc(p.name)}</span>`).join('') || '<div class="empty">Semua produk pernah diajukan.</div>'}${dead.length > 30 ? '<div class="hint2">dan ' + (dead.length - 30) + ' produk lainnya</div>' : ''}</div></div>`;
}
function tabAdm(D) {
  const { f, t, R } = D, A = {};
  const get = n => A[n] = A[n] || { name: n, acc: null, req: 0, pcs: 0, ada: 0, rec: 0, dl: 0, last: 0 };
  admins.forEach(a => { let k = a.name; if (A[k] && A[k].acc) k = a.name + ' (@' + a.username + ')'; get(k).acc = a }); // nama kembar tetap tampil terpisah
  reqs.forEach(r => { const o = get(r.adm || NO_ADM); o.last = Math.max(o.last, ...reqHist(r).map(h => h.ts)) });
  records.forEach(r => { const o = get(r.adm || NO_ADM); o.last = Math.max(o.last, r.ts); if (inR(r.ts, f, t)) o.rec++ });
  downloads.forEach(r => { const o = get(r.adm || NO_ADM); o.last = Math.max(o.last, r.ts); if (inR(r.ts, f, t)) o.dl++ });
  R.forEach(r => { const o = get(r.adm || NO_ADM); o.req++; o.pcs += r.min; o.ada += r.ada });
  const L = Object.values(A).sort((a, b) => (!!b.acc - !!a.acc) || b.pcs - a.pcs || a.name.localeCompare(b.name));
  return `<div class="card"><h3>Kontrol Admin</h3><p class="hint">Semua admin yang terdaftar beserta aktivitasnya pada periode terpilih. <b>Hapus akses</b> membuat akun tidak bisa login lagi (data yang pernah diinput tetap tersimpan). <b>Reset password</b> mengganti password admin dengan yang baru.</p>
  <div class="tw"><table class="ot" style="min-width:900px"><thead><tr><th>Admin</th><th>Role</th><th>Terdaftar</th><th>Pengajuan</th><th>Pcs diajukan</th><th>% Terpenuhi</th><th>Input purchase</th><th>Download</th><th>Aktivitas terakhir</th><th></th></tr></thead><tbody>${L.map(o => `<tr><td><b>${esc(o.name)}</b>${o.acc ? '<div class="tm">@' + esc(o.acc.username) + '</div>' : '<div class="tm">tanpa akun</div>'}</td><td>${o.acc ? roleSel(o.acc) : '-'}</td><td>${o.acc && o.acc.ts ? fmt(o.acc.ts) : '-'}</td><td>${nf(o.req)}</td><td>${nf(o.pcs)}</td><td>${o.pcs ? pc(o.ada, o.pcs) + '%' + pbar(pc(o.ada, o.pcs)) : '-'}</td><td>${nf(o.rec)}</td><td>${nf(o.dl)}</td><td>${o.last ? fmt(o.last) + tm(o.last) : '-'}</td><td class="nw">${o.acc ? `<button class="btn ghost sm" data-owreset="${esc(o.acc.username)}">Reset password</button> ${o.acc.username === SUPER.username ? '<span class="tag">Akun khusus</span>' : `<button class="btn sm" style="background:var(--bad)" data-owdel="${esc(o.acc.username)}">Hapus akses</button>`}` : ''}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">Belum ada admin.</td></tr>'}</tbody></table></div></div>`;
}
const roleSel = a => `<select data-owrole="${esc(a.username)}" style="width:auto;padding:7px 10px"${a.username === SUPER.username ? ' disabled' : ''}>${ROLES.filter(r => r !== 'Tamu').map(r => `<option${(a.role || 'Admin') === r ? ' selected' : ''}>${r}</option>`).join('')}</select>`;
async function setRole(u, role) {
  if (u === SUPER.username) return renderOw();
  const a = admins.find(x => x.username === u); if (!a) return;
  const rec = Object.assign({}, a, { role });
  try {
    if (db) await withTimeout(db.collection('admins').doc(u).set(rec));
    else { const o = store.get('pp_admins', {}); o[u] = rec; store.set('pp_admins', o) }
    admins = admins.map(x => x.username === u ? rec : x); syncMe(); renderOw();
  } catch (err) { console.error(err); alert('Gagal mengganti role: ' + authErr(err, '')); renderOw() }
}
function tabRole() {
  const cnt = r => r === 'Tamu' ? 'tanpa akun' : admins.filter(a => (a.role || 'Admin') === r).length + ' akun';
  return `<div class="card"><h3>Role &amp; Hak Akses</h3><p class="hint">Centang halaman yang boleh dibuka tiap role. Role tiap akun diatur di tab <b>Admin &amp; Akses</b>. Owner selalu bisa membuka semua halaman (kolomnya terkunci). Tamu = masuk tanpa akun. Pembatasan ini berlaku di tampilan aplikasi.</p>
  <div class="tw"><table class="ot" style="min-width:820px"><thead><tr><th>Halaman</th>${ROLES.map(r => `<th style="text-align:center">${r}<div class="tm">${cnt(r)}</div></th>`).join('')}</tr></thead><tbody>${Object.keys(PAGES).map(k => `<tr><td><b>${PAGES[k]}</b></td>${ROLES.map(r => { const on = r === 'Owner' || permsOf(r).includes(k); return `<td style="text-align:center"><input type="checkbox" data-rp="${r}|${k}"${on ? ' checked' : ''}${r === 'Owner' ? ' disabled' : ''}></td>` }).join('')}</tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h3>Tugas tiap role</h3><p class="hint">Teks ini tampil sebagai keterangan saat nama akun di pojok atas diarahkan kursor.</p>${ROLES.map(r => `<label>${r}</label><textarea data-rdesc="${r}" rows="2">${esc(descOf(r))}</textarea>`).join('')}
  <label>Role default untuk akun yang baru mendaftar</label><select id="owDef">${ROLES.filter(r => r !== 'Tamu').map(r => `<option${defRole() === r ? ' selected' : ''}>${r}</option>`).join('')}</select>
  <div class="foot"><button class="btn ghost" data-rolereset type="button">Kembalikan default</button><button class="btn" data-rolesave type="button">Simpan role &amp; akses</button></div></div>`;
}
function saveRoles() {
  const perms = {}, desc = {}; ROLES.forEach(r => perms[r] = []);
  $$('#owBody [data-rp]').forEach(c => { const [r, k] = c.dataset.rp.split('|'); if (c.checked || (r === 'Owner' && k === 'ow')) perms[r].push(k) });
  perms.Owner = Object.keys(PAGES); // Owner selalu penuh
  $$('#owBody [data-rdesc]').forEach(t => desc[t.dataset.rdesc] = t.value.trim());
  rolesCfg = { id: 'roles', perms, desc, defRole: $('#owDef').value || 'Admin', seen: Object.keys(PAGES), upd: Date.now() };
  commit([['settings', 'set', rolesCfg]]); roleDirty = false; applyRole(); renderOw(); alert('Role & hak akses tersimpan.');
}
function resetRoles() {
  if (!confirm('Kembalikan semua role ke pengaturan default?')) return;
  rolesCfg = null; commit([['settings', 'del', 'roles']]); roleDirty = false; applyRole(); renderOw();
}
function owReco(D) {
  const { R, E, lead } = D, out = [], add = (t, h, x) => out.push({ t, h, x });
  const P = grp(R, r => r.prod, lead).sort((a, b) => b.min - a.min);
  if (!P.length) return [{ t: 'info', h: 'Belum ada data', x: 'Tidak ada pengajuan pada periode / filter ini, jadi belum ada yang bisa dianalisa.' }];
  const tot = sumK(P, 'min'), tAda = sumK(P, 'ada'), fr = pc(tAda, tot), lst = a => a.map(p => `<b>${esc(p.k)}</b> (${nf(p.min)} pcs, ${pc(p.ada, p.min)}% terpenuhi)`).join('; ');
  const stars = P.slice(0, Math.max(1, Math.ceil(P.length * .3))).filter(p => pc(p.ada, p.min) >= 80).slice(0, 5);
  if (stars.length) add('good', 'Produk andalan: dorong promosi & jaga stok', lst(stars) + '. Permintaan tinggi dan pasokan lancar, aman untuk dipromosikan lebih agresif karena barangnya tersedia.');
  const med = P[Math.floor(P.length / 2)].min;
  const crit = P.filter(p => p.min >= Math.max(med, 1) && pc(p.ada, p.min) < 50).sort((a, b) => (b.min - b.ada) - (a.min - a.ada)).slice(0, 5);
  if (crit.length) add('bad', 'Permintaan tinggi tetapi pasokan tertahan', lst(crit) + '. Prioritaskan pengadaan / cari pemasok tambahan, dan tahan promosi produk ini sampai stok aman supaya tidak mengecewakan pelanggan.');
  const top3 = P.slice(0, 3), sh = pc(sumK(top3, 'min'), tot);
  if (P.length > 3 && sh >= 60) add('warn', 'Permintaan terlalu bergantung pada sedikit produk', `3 produk teratas (${top3.map(p => esc(p.k)).join(', ')}) menyumbang ${sh}% dari seluruh pcs diajukan. Risiko tinggi bila pasokan terganggu: kembangkan produk pendamping atau bundling agar permintaan lebih merata.`);
  if (fr < 70) add('bad', 'Tingkat pemenuhan keseluruhan rendah', `Baru ${fr}% dari ${nf(tot)} pcs yang diajukan terpenuhi (kurang ${nf(tot - tAda)} pcs). Evaluasi proses pembelian & pemasok sebelum menambah kampanye penjualan.`);
  else if (fr >= 90) add('good', 'Pemenuhan stok sangat baik', `${fr}% pengajuan terpenuhi. Ada ruang untuk menaikkan target penjualan.`);
  const S = grp(R, r => r.src, lead).filter(g => g.L.length >= 2).sort((a, b) => avgL(b) - avgL(a));
  if (S.length > 1) add('warn', 'Sumber barang paling lambat', `<b>${esc(S[0].k)}</b> rata-rata ${dayTxt(avgL(S[0]))} untuk memenuhi pengajuan, versus <b>${esc(S[S.length - 1].k)}</b> ${dayTxt(avgL(S[S.length - 1]))}. Pertimbangkan memesan lebih awal dari sumber yang lambat atau mengalihkan item permintaan tinggi ke sumber yang lebih cepat.`);
  const wd = [0, 0, 0, 0, 0, 0, 0]; E.forEach(e => wd[wdOf(e.ts)] += e.n);
  const bi = wd.indexOf(Math.max(...wd)); if (wd[bi] > 0) add('info', 'Hari permintaan tertinggi: ' + WD[bi], `${pc(wd[bi], sumK(E, 'n'))}% pengajuan masuk pada hari ${WD[bi]}. Jadwalkan penambahan stok dan kampanye sehari sebelumnya agar siap saat permintaan naik.`);
  const top = P[0], vs = grp(R.filter(r => r.prod === top.k), r => r.vn || '-', lead).sort((a, b) => b.min - a.min);
  if (vs.length > 1) add('info', 'Warna terlaris untuk ' + top.k, `<b>${esc(vs[0].k)}</b> (${pc(vs[0].min, top.min)}% dari permintaan ${esc(top.k)}). Alokasikan stok terbesar pada warna ini, dan gunakan warna kurang laku (${esc(vs[vs.length - 1].k)}) sebagai bahan promo bundling.`);
  const M = momentum(D), up = M.filter(m => m.cur >= 5 && m.cur > m.prev * 1.3).sort((a, b) => b.cur - b.prev - (a.cur - a.prev)).slice(0, 4), dn = M.filter(m => m.prev >= 5 && m.cur < m.prev * .7).sort((a, b) => (b.prev - b.cur) - (a.prev - a.cur)).slice(0, 4);
  const mt = m => `<b>${esc(m.k)}</b> (${nf(m.prev)} → ${nf(m.cur)} pcs)`;
  if (up.length) add('good', 'Permintaan naik (7 hari terakhir vs 7 hari sebelumnya)', up.map(mt).join('; ') + '. Tambah stok lebih awal dan manfaatkan momentum dengan promosi.');
  if (dn.length) add('warn', 'Permintaan menurun (7 hari terakhir vs 7 hari sebelumnya)', dn.map(mt).join('; ') + '. Tahan restock besar, pertimbangkan diskon / bundling atau cari tahu penyebab penurunannya.');
  const names = new Set(R.map(r => r.prod)), dead = products.filter(p => !names.has(p.name));
  if (dead.length) add('warn', `${dead.length} produk tidak pernah diajukan pada periode ini`, dead.slice(0, 8).map(p => esc(p.name)).join(', ') + (dead.length > 8 ? ' dan lainnya' : '') + '. Jangan restock dulu; jalankan promo / bundling atau pertimbangkan menghentikan produk yang terus sepi.');
  return out;
}
function tabReco(D) {
  const ic = { good: '✅', bad: '🚨', warn: '⚠️', info: '💡' };
  return `<div class="card"><h3>Rekomendasi kebijakan pemasaran</h3><p class="hint">Dihitung otomatis dari data pengajuan &amp; pemenuhan pada periode dan filter di atas. Catatan: pengajuan barang adalah <b>indikator permintaan internal</b>, bukan data penjualan ke pelanggan. Cocokkan dengan data penjualan sebelum mengambil keputusan besar.</p>${owReco(D).map(o => `<div class="rec ${o.t}"><b>${ic[o.t]} ${o.h}</b><p>${o.x}</p></div>`).join('')}</div>`;
}
/* ---------- tab GRAFIK: diagram batang mendatar yang rinci ---------- */
function topN(a, n, f) { return a.slice().sort((x, y) => (y[f || 'a'] || 0) - (x[f || 'a'] || 0)).slice(0, n) }
function aggBy(arr, kf, vf) { const m = new Map(); arr.forEach(x => { const k = kf(x); if (k == null || k === '') return; let o = m.get(k); if (!o) m.set(k, o = { k, a: 0, b: 0, n: 0 }); const v = vf(x); o.a += v[0] || 0; o.b += v[1] || 0; o.n++ }); return [...m.values()] }
const monLbl = k => BLN[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
const byKey = a => a.slice().sort((x, y) => x.k < y.k ? -1 : x.k > y.k ? 1 : 0);
// items: [{k: label, a: nilai utama, b: nilai kedua (opsional), t: warna 'ok'|'bad'|'mid', txt: teks nilai bebas}]
function hch(title, hint, items, o) {
  o = o || {}; let rows = items.filter(x => o.keep || x.a || x.b);
  if (!o.fixed) rows = rows.slice().sort((x, y) => (y.a || 0) - (x.a || 0));
  if (o.max) rows = rows.slice(0, o.max);
  const mx = Math.max(1, ...rows.map(x => Math.max(x.a || 0, x.b || 0))), ta = rows.reduce((s, x) => s + (x.a || 0), 0), tb = rows.reduce((s, x) => s + (x.b || 0), 0), u = o.unit ? ' ' + o.unit : '', bc = o.bc || 'ok';
  const lg = o.lb ? `<div class="lg"><span><i style="background:var(--pri)"></i>${o.la}</span><span><i class="${bc}"></i>${o.lb}</span></div>` : '';
  const tot = o.notot ? '' : sumBar([stag('Total ' + (o.la || 'data'), NF(ta) + u), o.lb ? stag('Total ' + o.lb, NF(tb) + u) : '']);
  const w = v => v ? Math.max(1.5, v / mx * 100) : 0;
  return `<div class="card hcard"><h3>${title}</h3><p class="hint">${hint}</p>${tot}${lg}<div class="hcw">` + (rows.length ? rows.map(x => `<div class="hc"><span class="hl2" title="${esc(x.k)}">${esc(x.k)}</span><div class="hbars"><div class="hbar ${x.t || ''}" style="width:${w(x.a)}%"></div>${o.lb ? `<div class="hbar ${bc}" style="width:${w(x.b)}%"></div>` : ''}</div><b class="hv">${x.txt != null ? x.txt : NF(x.a) + (o.lb ? ' / ' + NF(x.b) + ' <small>(' + pct(x.b, x.a) + '%)</small>' : '') + u}</b></div>`).join('') : '<div class="empty">Belum ada data pada periode / filter ini.</div>') + '</div></div>';
}
const shd = t => `<h3 class="sh">${t}</h3>`;
const hrWIB = ts => (new Date(ts).getUTCHours() + 7) % 24;
function tabChart(D) {
  const { R, E, lead, f, t } = D, fin = x => inR(x.ts, f, t), H = [];
  const rets = returns.filter(fin), rgs = rgoods.filter(x => x.qty > 0 && fin(x)), stock = stockRows();
  H.push(`<div class="card hcard"><h3>Grafik</h3><p class="hint">Mengikuti Periode dan Asal Barang di atas (Stok Produk selalu seluruh waktu; Retur tidak punya asal barang).</p></div>`);
  H.push(shd('Pengajuan'));
  const P = grp(R, r => r.prod, lead);
  H.push(hch('Produk teratas: diminta vs terpenuhi (pcs)', '10 produk dengan pcs diminta terbanyak.', P.map(g => ({ k: g.k, a: g.min, b: g.ada })), { la: 'Diminta', lb: 'Terpenuhi', unit: 'pcs', max: 10 }));
  H.push(hch('Status pengajuan (jumlah baris)', 'Selesai = ada ≥ diminta; Sebagian = sudah ada sebagian; Menunggu = belum ada.', [{ k: 'Selesai', a: R.filter(r => r.ada >= r.min).length, t: 'ok' }, { k: 'Sebagian', a: R.filter(r => r.ada > 0 && r.ada < r.min).length, t: 'mid' }, { k: 'Menunggu', a: R.filter(r => !r.ada).length, t: 'bad' }], { fixed: true, keep: true, la: 'Baris' }));
  const hA = Array(24).fill(0), hB = Array(24).fill(0); E.forEach(e => { const i = hrWIB(e.ts); hA[i] += e.n; hB[i] += e.a });
  H.push(hch('Pengajuan per jam input, WIB (pcs)', 'Jam berapa pengajuan paling sering diinput (hanya jam yang ada isinya).', hA.map((v, i) => ({ k: p2(i) + ':00 - ' + p2(i) + ':59', a: v, b: hB[i] })), { fixed: true, la: 'Diajukan', lb: 'Terpenuhi', unit: 'pcs' }));
  const wdA = [0, 0, 0, 0, 0, 0, 0], wdB = [0, 0, 0, 0, 0, 0, 0]; E.forEach(e => { wdA[wdOf(e.ts)] += e.n; wdB[wdOf(e.ts)] += e.a });
  H.push(hch('Pengajuan per hari dalam seminggu (pcs)', 'Hari mana permintaan paling ramai.', [1, 2, 3, 4, 5, 6, 0].map(i => ({ k: WD[i], a: wdA[i], b: wdB[i] })), { fixed: true, keep: true, la: 'Diajukan', lb: 'Terpenuhi', unit: 'pcs' }));
  H.push(hch('Per asal barang: diminta vs terpenuhi (pcs)', 'Perbandingan tiap sumber barang.', grp(R, r => r.src, lead).map(g => ({ k: g.k, a: g.min, b: g.ada })), { la: 'Diminta', lb: 'Terpenuhi', unit: 'pcs' }));
  H.push(shd('Retur'));
  H.push(hch('Status retur', 'Jumlah laporan retur per status.', [['On Progress', ''], ['Review', 'mid'], ['Done', 'ok'], ['Failed', 'bad']].map(([k, tc]) => ({ k, a: rets.filter(r => r.status === k).length, t: tc })), { fixed: true, keep: true, la: 'Laporan' }));
  H.push(hch('Per marketplace', 'Jumlah retur dan yang sudah Done.', aggBy(rets, r => r.mp || '(tanpa marketplace)', r => [1, r.status === 'Done' ? 1 : 0]), { la: 'Retur', lb: 'Done' }));
  H.push(hch('Barang retur per kondisi (pcs)', 'Baik / Kurang masuk gudang; Rusak / Lecet hanya tercatat di Barang Retur.', ['Baik', 'Kurang', 'Rusak', 'Lecet'].map(c => ({ k: c, a: sumK2(rgs.filter(x => brCondOf(x) === c), x => x.qty), t: RBAD.includes(c) ? 'bad' : 'ok' })), { fixed: true, keep: true, la: 'Qty', unit: 'pcs' }));
  H.push(shd('Stok'));
  H.push(hch('Stok per produk (pcs, seluruh waktu)', '10 produk dengan stok terbanyak (varian digabung).', aggBy(stock, g => g.prod, g => [g.qty]), { la: 'Stok', unit: 'pcs', max: 10 }));
  return H.join('');
}
function renderOw() {
  if (!owOk) return;
  $$('.otabs button').forEach(b => b.classList.toggle('on', b.dataset.o === owTab));
  const D = owData();
  $('#owBody').innerHTML = { sum: tabSum, chart: tabChart, prod: tabProd, adm: tabAdm, rec: tabReco, role: tabRole }[owTab](D);
}
// ---- gerbang kode & kontrol akses ----
function openOw() { if (owOk) return go('ow'); $('#gCode').value = ''; msg('#gMsg', ''); $('#gmdl').hidden = false; $('#gCode').focus() }
function tryOw() {
  if ($('#gCode').value.trim() !== OW_CODE) return msg('#gMsg', 'Kode salah.');
  owOk = true; $('#gmdl').hidden = true; go('ow');
}
function lockOw() { owOk = false; $('#owBody').innerHTML = ''; go('pg') }
$('#lockBtn').onclick = openOw; $('#gOk').onclick = tryOw; $('#gCancel').onclick = () => $('#gmdl').hidden = true;
$('#gCode').addEventListener('keydown', e => { if (e.key === 'Enter') tryOw() });
$('#owLock').onclick = lockOw;
$$('.otabs button').forEach(b => b.onclick = () => { owTab = b.dataset.o; roleDirty = false; renderOw() });
['#owPer', '#owFrom', '#owTo', '#owSrc'].forEach(x => { $(x).addEventListener('input', renderOw); $(x).addEventListener('change', renderOw) });
function forceLogout(note) { store.set('pp_session', null); me = null; renderWho(); applyRole(); refresh(); showAuth('in'); authMsg(note || '') }
let rpUser = null;
$('#owBody').addEventListener('click', e => {
  const m = e.target.closest('[data-owmore]'), r = e.target.closest('[data-owreset]'), d = e.target.closest('[data-owdel]');
  if (m) { owMore[m.dataset.owmore] = !owMore[m.dataset.owmore]; renderOw() }
  if (r) { rpUser = r.dataset.owreset; $('#rpInfo').textContent = '@' + rpUser; $('#rpPass').value = ''; msg('#rpMsg', ''); $('#rpmdl').hidden = false; $('#rpPass').focus() }
  if (d) delAccess(d.dataset.owdel);
});
$('#owBody').addEventListener('change', e => {
  const s = e.target.closest('[data-owsort]'); if (s) { owSort = s.value; renderOw() }
  const rs = e.target.closest('[data-owrole]'); if (rs) setRole(rs.dataset.owrole, rs.value);
  if (e.target.closest('[data-rp],[data-rdesc],#owDef')) roleDirty = true;
});
$('#owBody').addEventListener('input', e => { if (e.target.closest('[data-rdesc]')) roleDirty = true });
$('#owBody').addEventListener('click', e => { if (e.target.closest('[data-rolesave]')) saveRoles(); if (e.target.closest('[data-rolereset]')) resetRoles() });
async function delAccess(u) {
  if (u === SUPER.username) return alert('Akun khusus ini dilindungi dan tidak bisa dihapus.');
  const a = admins.find(x => x.username === u); if (!a) return;
  if (!confirm('Hapus akses admin "' + a.name + '" (@' + u + ')?\nAkun ini tidak bisa login lagi. Data yang pernah diinput tetap tersimpan.')) return;
  try {
    if (db) await withTimeout(db.collection('admins').doc(u).delete());
    else { const o = store.get('pp_admins', {}); delete o[u]; store.set('pp_admins', o) }
    admins = admins.filter(x => x.username !== u);
    if (me && me.username === u) forceLogout('Akses akun ini telah dihapus.');
    renderOw(); fillAdm();
  } catch (err) { console.error(err); alert('Gagal menghapus akses: ' + authErr(err, '')) }
}
async function doReset() {
  const p = $('#rpPass').value, a = admins.find(x => x.username === rpUser);
  if (!a) return $('#rpmdl').hidden = true;
  if (p.length < 4) return msg('#rpMsg', 'Password minimal 4 karakter.');
  const rec = Object.assign({}, a, { pass: pwHash(a.username, p) });
  try {
    if (db) await withTimeout(db.collection('admins').doc(a.username).set(rec));
    else { const o = store.get('pp_admins', {}); o[a.username] = rec; store.set('pp_admins', o); admins = admins.map(x => x.username === a.username ? rec : x) }
    $('#rpmdl').hidden = true; alert('Password @' + a.username + ' berhasil diganti.');
  } catch (err) { console.error(err); msg('#rpMsg', authErr(err, 'Gagal mengganti password.')) }
}
$('#rpOk').onclick = doReset; $('#rpCancel').onclick = () => $('#rpmdl').hidden = true;
$('#rpPass').addEventListener('keydown', e => { if (e.key === 'Enter') doReset() });
// akun yang aksesnya dihapus langsung dikeluarkan di perangkat mana pun
// (pengecekan ini sudah digabung ke listener admins di startSync, agar koleksi admins tidak dibaca dua kali)

pgVarUI(); addBlock(); startSync();
if (!db) ensureSuper(); // mode lokal
if (!db && admFixN) { commit(); store.set('pp_admins', Object.fromEntries(admins.map(a => [a.username, a]))) } // simpan nama admin yang sudah dikapitalkan (mode lokal)
applyRole();
/* popup welcome: tampil saat web dibuka; klik di mana saja (atau tanda silang) untuk menutup */
$('#wlc').addEventListener('click', () => { $('#wlc').hidden = true });