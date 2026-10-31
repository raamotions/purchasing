const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const SRC = ['Kode A', 'Kode B', 'Aling', 'Kode AG', 'Kode BG'];
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
const stat = (a, m) => a === m ? '<b class="okc">✓</b>' : '<b class="badc">✕</b>';
const msg = (id, t, ok) => { const m = $(id); m.textContent = t; m.className = 'msg' + (ok ? ' ok' : '') };

/* ---------- penyimpanan: Firebase (sinkron semua perangkat) atau lokal ---------- */
// Isi dengan config Firebase Anda agar data tersinkron di semua perangkat (HP, tablet, PC).
// Biarkan null untuk mode lokal (data hanya tersimpan di browser ini).
// Contoh: const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCkY5k8tAa4a6s6Sh8zEzhiZU0GgQ4zFSM",
  authDomain: "purchase-eko.firebaseapp.com",
  projectId: "purchase-eko",
  storageBucket: "purchase-eko.firebasestorage.app",
  messagingSenderId: "306713086751",
  appId: "1:306713086751:web:3aad1af4d0dbd89f727e2a"
};

let db = null, products = [], reqs = [], records = [], photos = {}, admins = [], me = null; // me: {username, name} atau null (tamu)
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } }
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
  admins = Object.values(store.get('pp_admins', {}));
}
// ops: [['koleksi','set',objek] | ['koleksi','del',id]]
function commit(ops = []) {
  if (!db) {
    const used = new Set(records.map(r => r.pid));
    Object.keys(photos).forEach(k => { if (!used.has(k)) delete photos[k] });
    const ok = store.set('pp_products', products) && store.set('pp_requests', reqs) && store.set('pp_records', records) && store.set('pp_photos', photos);
    if (!ok) loadLocal();
    return ok;
  }
  for (let i = 0; i < ops.length; i += 300) {
    const b = db.batch();
    ops.slice(i, i + 300).forEach(([c, k, v]) => {
      const ref = db.collection(c).doc(k === 'del' ? v : v.id);
      k === 'del' ? b.delete(ref) : b.set(ref, v);
    });
    const t = setTimeout(() => failSync({ message: 'tidak ada respon dari server, data belum terkirim' }), 12000);
    b.commit().then(() => { clearTimeout(t); setSync('ok') }).catch(e => { clearTimeout(t); failSync(e) });
  }
  return true;
}
let failShown = false;
function failSync(e) {
  setSync('err');
  if (failShown) return; failShown = true; setTimeout(() => failShown = false, 20000);
  alert('Data GAGAL tersimpan/terbaca di Firebase (' + (e && (e.code || e.message)) + ').\nPeriksa koneksi internet, pastikan Firestore Database sudah dibuat dan Rules sudah di-Publish (allow read, write: if true).');
}
const hint = e => {
  const c = (e && e.code) || '';
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
    const n = {};
    for (const c of ['products', 'requests', 'records']) n[c] = (await db.collection(c).get({ source: 'server' })).size;
    setSync('ok');
    alert('BERHASIL: koneksi ke server Firebase normal.\n\nIsi di SERVER saat ini:\n- Produk: ' + n.products + '\n- Pengajuan: ' + n.requests + '\n- Purchase: ' + n.records + '\n\nDi layar aplikasi:\n- Produk: ' + products.length + '\n- Pengajuan: ' + reqs.length + '\n- Purchase: ' + records.length);
  } catch (e) { setSync('err'); alert('GAGAL (' + (e.code || '-') + '): ' + (e.message || e) + '\n\n' + hint(e)) }
}
$('#sync').onclick = diagnose; $('#sync').title = 'Klik untuk tes koneksi Firebase';
function refresh() {
  fillAdm(); renderReqs(); renderProducts();
  if ($('#pu').classList.contains('on')) renderTable();
}
function startSync() {
  if (!FIREBASE_CONFIG || !window.firebase) { loadLocal(); setSync('loc'); refresh(); return }
  try {
    firebase.initializeApp(FIREBASE_CONFIG); db = firebase.firestore(); db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); setSync('wait');
    const on = (c, fn) => db.collection(c).onSnapshot(s => { try { fn(s.docs.map(d => d.data())) } catch (e) { console.error(c, e) } setSync(s.metadata.fromCache || s.metadata.hasPendingWrites ? 'wait' : 'ok'); refresh() }, e => failSync(e));
    on('products', a => products = a.sort((x, y) => String(x.name || '').localeCompare(String(y.name || ''))));
    on('requests', a => reqs = a.sort((x, y) => y.ts - x.ts));
    on('records', a => records = a.sort((x, y) => y.ts - x.ts));
    on('photos', a => { photos = {}; a.forEach(p => photos[p.id] = p.d) });
    on('admins', a => admins = a);
  } catch (e) { db = null; loadLocal(); setSync('err'); refresh() }
}

/* ---------- menu & hamburger ---------- */
const TT = { pg: ['Pengajuan', 'Hari ini tampil di atas; hari sebelumnya masuk riwayat per bulan (ganti hari pukul 00.00 WIB)'], in: ['Input Barang Masuk', 'Catat barang yang diterima berdasarkan pengajuan'], pu: ['Purchase', 'Riwayat penerimaan barang'], pr: ['Produk', 'Kelola database produk dan varian warna'] };
function go(t) {
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  $$('.sec').forEach(s => s.classList.toggle('on', s.id === t));
  $('#nav').classList.remove('open'); $('#pt').textContent = TT[t][0]; $('#ps').textContent = TT[t][1];
  if (t === 'pu') renderTable();
  if (t === 'pg') renderReqs();
  if (t === 'in') refreshBlocks();
}
$$('nav button').forEach(b => b.onclick = () => go(b.dataset.t));
$('#burger').onclick = e => { e.stopPropagation(); $('#nav').classList.toggle('open') };
document.addEventListener('click', e => { if (!e.target.closest('#nav')) $('#nav').classList.remove('open') });
$$('select[data-src]').forEach(s => {
  s.innerHTML = `<option value="">${s.dataset.src}</option>` + SRC.map(x => `<option>${x}</option>`).join('');
});
function fillAdm() { // daftar nama admin = akun terdaftar + nama yang sudah tercatat di data
  const names = [...new Set(admins.map(a => a.name).concat(reqs.map(r => r.adm), records.map(r => r.adm)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  $$('select[data-adm]').forEach(s => {
    const v = s.value;
    s.innerHTML = `<option value="">${s.dataset.adm}</option>` + names.map(x => `<option>${esc(x)}</option>`).join('');
    s.value = v;
  });
}
fillAdm();

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
    l.innerHTML = m.length ? m.map(p => `<div data-id="${p.id}">${esc(p.name)}</div>`).join('') : '<em>' + (onText ? 'Tidak ditemukan. Produk baru akan ditambahkan saat Submit.' : 'Produk tidak ditemukan') + '</em>';
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
  return { get: () => pick, text: () => i.value.trim(), reset() { i.value = ''; upd(); pick = null; onPick(null) } };
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
  const ex = np ? null : todayReqs().find(r => String(r.pid) === String(prod.id) && r.vn === vn && r.vc === vc && r.src === src && (r.adm || '') === adm);
  if (ex) {
    ex.min += m; ops.push(['requests', 'set', ex]);
    records.filter(x => x.rid === ex.id).forEach(x => { x.min = ex.min; ops.push(['records', 'set', x]) });
  } else {
    const q = { id: uid(), ts: Date.now(), pid: prod.id, prod: prod.name, vn, vc, min: m, ada: 0, src, adm };
    reqs.unshift(q); ops.push(['requests', 'set', q]);
  }
  if (!commit(ops)) return msg('#pgMsg', 'Penyimpanan penuh.');
  pgSearch.reset(); $('#pgMin').value = ''; $('#pgSrc').value = ''; $('#pgVarName').value = ''; $('#pgVarCol').value = '#4a7bd0';
  msg('#pgMsg', ex ? 'Digabung dengan pengajuan yang sama. Total diminta: ' + ex.min + ' pcs.'
    : np ? 'Produk baru "' + np.name + '" masuk ke database produk, pengajuan tersimpan.'
    : nvAdded ? 'Varian "' + nvAdded + '" ditambahkan ke produk ' + prod.name + ', pengajuan tersimpan.' : 'Pengajuan tersimpan.', true);
  renderReqs(); renderProducts();
};
const todayReqs = () => reqs.filter(r => dayWIB(r.ts) === dayWIB(Date.now()));
const pgRow = (r, n) => `<tr>
    <td>${n + 1}</td><td>${fmt(r.ts)}${tm(r.ts)}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${r.ada} / ${r.min} pcs</td><td><span class="tag">${esc(r.src)}</span></td><td>${esc(r.adm || '-')}</td>
    <td>${reqStat(r)}</td>
    <td class="nw"><button class="btn ghost sm" data-redit="${r.id}">Edit</button> <button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>`;
const pgTbl = list => `<div class="tw"><table><thead><tr><th>No</th><th>Tanggal</th><th>Produk</th><th>Varian</th><th>Ada / Diminta</th><th>Asal</th><th>Admin</th><th>Status</th><th></th></tr></thead><tbody>${list.map(pgRow).join('')}</tbody></table></div>`;
function renderReqs() { // hari ini tampil di atas; hari-hari sebelumnya otomatis masuk riwayat per tahun > bulan (tertutup)
  const all = pgFiltered(), today = dayWIB(Date.now()), filt = PGF.some(x => $(x).value);
  const tr = all.filter(r => dayWIB(r.ts) === today), hr = all.filter(r => dayWIB(r.ts) !== today), g = {};
  hr.forEach(r => { const d = dayWIB(r.ts), y = d.slice(0, 4), m = d.slice(5, 7); ((g[y] = g[y] || {})[m] = g[y][m] || []).push(r) });
  const isOpen = (k, dflt) => k in openState ? openState[k] : (filt || dflt);
  let html = '<div class="dayh">Hari ini <span class="tag">' + tr.length + ' data</span></div>' + (tr.length ? pgTbl(tr) : '<div class="empty">Belum ada pengajuan hari ini.</div>');
  if (hr.length) {
    html += '<div class="dayh" style="margin-top:24px">Riwayat <span class="tag">' + hr.length + ' data</span></div>' + Object.keys(g).sort().reverse().map(y => {
      const ms = Object.keys(g[y]).sort().reverse(), cnt = ms.reduce((s, m) => s + g[y][m].length, 0), ky = 'ry' + y;
      return `<details class="yr" data-k="${ky}" ${isOpen(ky, y === today.slice(0, 4)) ? 'open' : ''}><summary>${y} <span class="tag">${cnt} data</span></summary>` +
        ms.map(m => { const km = 'rm' + y + m; return `<details class="mo" data-k="${km}" ${isOpen(km, false) ? 'open' : ''}><summary>${BLN[+m - 1]} ${y} <span class="tag">${g[y][m].length} data</span></summary>${pgTbl(g[y][m])}</details>` }).join('') + '</details>';
    }).join('');
  }
  $('#pgGrp').innerHTML = html;
}
$('#pgGrp').addEventListener('click', e => { const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open } });
$('#pgGrp').onclick = e => {
  if (e.target.dataset.redit) return openREdit(e.target.dataset.redit);
  const id = e.target.dataset.del;
  if (!id || !confirm('Hapus pengajuan ini?')) return;
  reqs = reqs.filter(r => r.id !== id); commit([['requests', 'del', id]]); renderReqs();
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
  const names = products.map(p => p.name); if (!names.includes(r.prod)) names.unshift(r.prod);
  $('#rProd').innerHTML = names.map(n => `<option>${esc(n)}</option>`).join(''); $('#rProd').value = r.prod;
  fillRVar(r.prod, r.vn, r.vc);
  $('#rAda').value = r.ada; $('#rMin').value = r.min; $('#rSrc').value = r.src; $('#rAdm').value = r.adm || '';
  rAddNew = false; $('#rVarName').value = ''; $('#rVarCol').value = '#4a7bd0'; rNewUI();
  msg('#rMsg', ''); $('#rmdl').hidden = false;
}
function rNewUI() { // isian warna baru <-> pilih dari daftar warna
  $('#rNew').hidden = !rAddNew; $('#rVsel').hidden = rAddNew; $('#rToggle').textContent = rAddNew ? 'Pilih dari daftar warna' : '+ Warna baru';
}
$('#rToggle').onclick = () => { rAddNew = !rAddNew; rNewUI() };
$('#rVarName').oninput = e => {
  const s = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(s, s);
  const c = toHex(e.target.value); if (c) $('#rVarCol').value = c;
};
const closeREdit = () => { $('#rmdl').hidden = true; rRec = null };
$('#rProd').onchange = () => fillRVar($('#rProd').value, '', '');
$('#rVar').onchange = rSwatch;
$('#rCancel').onclick = closeREdit;
$('#rmdl').onclick = e => { if (e.target.id === 'rmdl') closeREdit() };
$('#rSave').onclick = () => {
  const r = reqs.find(x => x.id === rRec.id) || rRec, m = parseInt($('#rMin').value, 10), name = $('#rProd').value;
  const p = products.find(x => x.name === name); let v = rList[$('#rVar').value];
  if (!(m >= 1)) return msg('#rMsg', 'Isi jumlah diminta dengan angka.');
  if (m < r.ada) return msg('#rMsg', 'Jumlah diminta tidak boleh kurang dari barang yang sudah ada (' + r.ada + ').');
  if (!rAddNew && !v) return msg('#rMsg', 'Warna wajib diisi: pilih dari daftar atau klik "+ Warna baru".');
  if (!$('#rSrc').value) return msg('#rMsg', 'Pilih asal barang.');
  const ops = [];
  if (rAddNew) { // warna baru: masuk ke varian produk (database produk) kalau belum ada
    const vt = normName($('#rVarName').value);
    if (!vt) return msg('#rMsg', 'Ketik nama warna atau pilih dari daftar warna.');
    if (!p) return msg('#rMsg', 'Produk tidak ada di database produk, warna baru tidak bisa ditambahkan.');
    v = p.variants.find(x => normName(x.n) === vt);
    if (!v) { v = { n: vt, c: $('#rVarCol').value }; p.variants.push(v); ops.push(['products', 'set', p]) }
  }
  Object.assign(r, { pid: p ? p.id : r.pid, prod: name, vn: v ? v.n : '', vc: v ? v.c : '', min: m, src: $('#rSrc').value, adm: $('#rAdm').value });
  ops.push(['requests', 'set', r]);
  records.filter(x => x.rid === r.id).forEach(x => { Object.assign(x, { prod: r.prod, vn: r.vn, vc: r.vc, min: r.min, src: r.src, adm: r.adm }); ops.push(['records', 'set', x]) });
  if (!commit(ops)) return msg('#rMsg', 'Penyimpanan penuh.');
  closeREdit(); renderReqs(); renderProducts();
};

/* ---------- export pengajuan ---------- */
const SL = '\u00A0'.repeat(8) + '/ '; // kolom Ada dikosongkan, garis miring tetap ada
const reqStat = r => r.ada >= r.min ? 'Selesai' : r.ada ? 'Sebagian' : 'Menunggu';
function pgFiltered() { // dipakai oleh daftar di layar DAN export
  const f = dtv(dtVal('#xFrom')), t = dtv(dtVal('#xTo', true), true), s = $('#xSrc').value, a = $('#xAdm').value,
    q = $('#xProd').value.trim().toLowerCase(), st = $('#xSt').value;
  return reqs.filter(r => (f === null || r.ts >= f) && (t === null || r.ts <= t) && (!s || r.src === s) && (!a || r.adm === a) &&
    (!q || String(r.prod).toLowerCase().includes(q)) && (!st || reqStat(r) === st)).sort((a, b) => a.ts - b.ts);
}
// nama admin untuk header & nama file: sesuai filter, atau nama admin yang ada di data
const admList = (sel, rows) => $(sel).value ? [$(sel).value] : [...new Set(rows.map(r => r.adm).filter(Boolean))];
const admHead = (sel, rows) => admList(sel, rows).join(', ') || '-';
function fileName(asal, adm, form, ext) { // KODE ASAL BARANG-NAMA ADMIN-DDMMYY-FORM DOWNLOAD
  const d = dayWIB(Date.now()).split('-');
  return [asal || 'SEMUA', adm || 'SEMUA', d[2] + d[1] + d[0].slice(2), form].join('-').toUpperCase().replace(/[\\/:*?"<>|]+/g, '') + '.' + ext;
}
const admFile = (sel, rows) => { const l = admList(sel, rows); return l.length === 1 ? l[0] : 'SEMUA' };
function pgHead(rows) {
  const f = dtVal('#xFrom'), t = dtVal('#xTo', true);
  const tgl = !f && !t ? 'Semua tanggal' : f && t ? fDT(f) + ' s/d ' + fDT(t) : f ? 'Mulai ' + fDT(f) : 'Sampai ' + fDT(t);
  return { title: 'Permintaan Pengajuan Barang', tgl: 'Tanggal & Jam Pengajuan: ' + tgl, asal: 'Asal Barang: ' + ($('#xSrc').value || 'Semua'), adm: 'Nama Admin: ' + admHead('#xAdm', rows || []) };
}
$('#pgXls').onclick = () => {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const rows = pgFiltered();
  if (!rows.length) return alert('Tidak ada pengajuan pada filter itu.');
  const H = pgHead(rows);
  const aoa = [[H.title], [H.tgl], [H.asal], [H.adm], [], ['No', 'Tanggal', 'Produk', 'Varian', 'Ada / Diminta', 'Asal', 'Status']]
    .concat(rows.map((r, i) => [i + 1, tsFmt(r.ts), r.prod, r.vn || '-', SL + r.min + ' pcs', r.src, '\u2610']));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 6 } }));
  ws['!cols'] = [5, 17, 28, 16, 18, 10, 8].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Pengajuan');
  XLSX.writeFile(wb, fileName($('#xSrc').value, admFile('#xAdm', rows), 'PENGAJUAN', 'xlsx'));
};
$('#pgPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const rows = pgFiltered(); if (!rows.length) return alert('Tidak ada pengajuan pada filter itu.');
  const H = pgHead(rows);
  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16); doc.text(H.title, 14, 15);
  doc.setFontSize(10); doc.text(H.tgl, 14, 22); doc.text(H.asal + '     ' + H.adm, 14, 28);
  doc.autoTable({
    startY: 33, headStyles: { fillColor: [74, 123, 208] },
    head: [['No', 'Tanggal', 'Produk', 'Varian', 'Ada / Diminta', 'Asal', 'Status']],
    body: rows.map((r, i) => [i + 1, tsFmt(r.ts), r.prod, r.vn || '-', SL + r.min + ' pcs', r.src, '']),
    didDrawCell: d => {
      if (d.section !== 'body') return;
      if (d.column.index === 6) { // kotak centang kosong
        const s = 4.5; doc.setDrawColor(60); doc.setLineWidth(.3);
        doc.rect(d.cell.x + (d.cell.width - s) / 2, d.cell.y + (d.cell.height - s) / 2, s, s);
      }
    }
  });
  doc.save(fileName($('#xSrc').value, admFile('#xAdm', rows), 'PENGAJUAN', 'pdf'));
};
const PGF = ['#xFromD', '#xFromT', '#xToD', '#xToT', '#xSrc', '#xAdm', '#xProd', '#xSt'];
function setPgToday() { $('#xFromD').value = $('#xToD').value = $('#xFromT').value = $('#xToT').value = '' } // filter tanggal kosong = semua data
setPgToday();
PGF.forEach(x => { $(x).addEventListener('input', renderReqs); $(x).addEventListener('change', renderReqs) });
$('#xReset').onclick = () => {
  setPgToday(); ['#xSrc', '#xAdm', '#xProd', '#xSt'].forEach(x => $(x).value = '');
  $('#xProd')._upd && $('#xProd')._upd(); renderReqs();
};

/* ---------- INPUT ---------- */
let blocks = [], photo = '';
const openProducts = () => [...new Map(todayReqs().filter(r => r.ada < r.min).map(r => [r.pid, { id: r.pid, name: r.prod }])).values()];

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
    const rs = todayReqs().filter(r => String(r.pid) === String(b.prod.id) && r.ada < r.min);
    R.innerHTML = rs.length ? rs.map(r => `<div class="ln" data-id="${r.id}">
      ${r.vc ? sw(r.vc, r.vn) : ''}
      <div class="inf">${r.vn ? '' : '<b>Satuan (tanpa varian)</b>'}
        <span>Diajukan <b>${r.min}</b> pcs · sudah ada ${r.ada} · <span class="tag">${esc(r.src)}</span> · Admin: <b>${esc(r.adm || '-')}</b></span></div>
      <input type="number" min="0" max="${r.min - r.ada}" inputmode="numeric" placeholder="Ada (0 boleh)">
      <div class="st">-</div></div>`).join('')
      : '<div class="empty">Tidak ada pengajuan terbuka untuk produk ini.</div>';
  };
  el.querySelector('.rows').oninput = e => {
    const ln = e.target.closest('.ln'); if (!ln) return;
    const r = reqs.find(x => x.id === ln.dataset.id), i = e.target, s = ln.querySelector('.st');
    if (i.value === '') { s.className = 'st'; s.textContent = '-'; return }
    let v = parseInt(i.value, 10); if (isNaN(v) || v < 0) v = 0;
    v = Math.min(v, r.min - r.ada); i.value = v;
    const ok = r.ada + v === r.min;
    s.className = 'st ' + (ok ? 'ok' : 'bad'); s.textContent = ok ? '✓' : '✕';
  };
  el.querySelector('.x').onclick = () => {
    el.remove(); blocks = blocks.filter(o => o !== b); if (!blocks.length) addBlock();
  };
  blocks.push(b);
}
function refreshBlocks() {
  blocks.forEach(b => {
    if (b.prod && !openProducts().some(p => String(p.id) === String(b.prod.id))) b.s.reset(); else b.render();
  });
}
$('#addBlk').onclick = addBlock;

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
}
$('#inSubmit').onclick = () => {
  const lines = [];
  blocks.forEach(b => b.el.querySelectorAll('.ln').forEach(ln => {
    const r = reqs.find(x => x.id === ln.dataset.id), raw = ln.querySelector('input').value.trim();
    if (raw === '') return; // kosong = dilewati; angka 0 tetap dicatat (barang tidak ada)
    const v = Math.max(0, Math.min(parseInt(raw, 10) || 0, r ? r.min - r.ada : 0));
    if (r && dayWIB(r.ts) === dayWIB(Date.now())) lines.push([r, v]);
  }));
  if (!lines.length) return msg('#inMsg', 'Isi jumlah barang ada (boleh 0) minimal pada satu produk/varian.');
  const ts = Date.now(), sj = $('#sj').value.trim(), pid = photo ? uid() : '', ops = [];
  if (pid) { photos[pid] = photo; ops.push(['photos', 'set', { id: pid, d: photo }]) }
  lines.forEach(([r, v]) => {
    r.ada += v;
    const rec = { id: uid(), ts, sj, prod: r.prod, vn: r.vn, vc: r.vc, ada: r.ada, min: r.min, src: r.src, adm: r.adm || '', pid, rid: r.id };
    records.unshift(rec); ops.push(['requests', 'set', r], ['records', 'set', rec]);
  });
  if (!commit(ops)) return msg('#inMsg', 'Penyimpanan penuh. Coba tanpa foto atau hapus data lama.');
  resetInput(); go('pu');
};

/* ---------- PURCHASE ---------- */
const FIL = ['#dFromD', '#dFromT', '#dToD', '#dToT', '#fqSj', '#fqProd', '#fqSrc', '#fqSt', '#fqVar', '#fqAdm'];
function filtered() {
  const f = dtv(dtVal('#dFrom')), t = dtv(dtVal('#dTo', true), true), j = $('#fqSj').value.toLowerCase(), q = $('#fqProd').value.toLowerCase(),
    s = $('#fqSrc').value, st = $('#fqSt').value, v = $('#fqVar').value, a = $('#fqAdm').value;
  return records.filter(r => (f === null || r.ts >= f) && (t === null || r.ts <= t) &&
    (!j || (r.sj || '').toLowerCase().includes(j)) && (!q || r.prod.toLowerCase().includes(q)) &&
    (!s || r.src === s) && (!a || r.adm === a) && (!v || r.vc === v) && (!st || (st === 'ok') === (r.ada === r.min)));
}
const openState = {};
// nomor urut berdasarkan urutan masuk (terlama = 1), tidak berubah oleh filter
const seqMap = () => { const m = {}; records.slice().sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1)).forEach((r, i) => m[r.id] = i + 1); return m };
function renderTable() {
  const seq = seqMap();
  const cols = [...new Map(records.filter(r => r.vc).map(r => [r.vc, r.vn])).entries()], cur = $('#fqVar').value;
  $('#fqVar').innerHTML = '<option value="">Semua</option>' + cols.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
  $('#fqVar').value = cur;
  const rows = filtered(), filt = FIL.some(s => $(s).value), now = ymd(Date.now());
  const rowHtml = r => `<tr>
    <td>${seq[r.id]}</td><td>${fmt(r.ts)}${tm(r.ts)}</td><td>${esc(r.sj || '-')}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${r.ada} / ${r.min} pcs</td><td>${stat(r.ada, r.min)}</td><td><span class="tag">${esc(r.src)}</span></td><td>${esc(r.adm || '-')}</td>
    <td>${photos[r.pid] ? `<img class="thumb" src="${photos[r.pid]}" alt="Surat jalan">` : '-'}</td>
    <td class="nw"><button class="btn ghost sm" data-edit="${r.id}">Edit</button> <button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>`;
  const tbl = list => `<div class="tw"><table><thead><tr><th>No</th><th>Tanggal</th><th>No. SJ</th><th>Produk</th><th>Varian</th><th>Ada / Diminta</th><th>Status</th><th>Asal</th><th>Admin</th><th>Foto</th><th></th></tr></thead><tbody>${list.slice().sort((a, b) => seq[a.id] - seq[b.id]).map(rowHtml).join('')}</tbody></table></div>`;
  const isOpen = (k, cur) => k in openState ? openState[k] : (filt || cur);
  const g = {};
  rows.forEach(r => { const d = ymd(r.ts), y = d.slice(0, 4), m = d.slice(5, 7); ((g[y] = g[y] || {})[m] = g[y][m] || []).push(r) });
  $('#grp').innerHTML = rows.length ? Object.keys(g).sort().reverse().map(y => {
    const ms = Object.keys(g[y]).sort().reverse(), cnt = ms.reduce((s, m) => s + g[y][m].length, 0), ky = 'y' + y;
    return `<details class="yr" data-k="${ky}" ${isOpen(ky, y === now.slice(0, 4)) ? 'open' : ''}><summary>${y} <span class="tag">${cnt} data</span></summary>` +
      ms.map(m => { const km = 'm' + y + m; return `<details class="mo" data-k="${km}" ${isOpen(km, y + '-' + m === now.slice(0, 7)) ? 'open' : ''}><summary>${BLN[+m - 1]} ${y} <span class="tag">${g[y][m].length} data</span></summary>${tbl(g[y][m])}</details>` }).join('') + '</details>';
  }).join('') : '<div class="empty">Belum ada data purchase.</div>';
}
$('#grp').addEventListener('click', e => { const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open } });
FIL.forEach(s => $(s).oninput = renderTable);
$('#fToggle').onclick = () => $('#fl').classList.toggle('open');
$('#reset').onclick = () => { FIL.forEach(s => $(s).value = ''); [$('#fqProd'), $('#fqSj')].forEach(i => i._upd && i._upd()); renderTable() };
$('#grp').onclick = e => {
  const t = e.target;
  if (t.dataset.edit) openEdit(t.dataset.edit);
  if (t.dataset.del && confirm('Hapus data ini?')) {
    const r = records.find(x => x.id === t.dataset.del); if (!r) return;
    records = records.filter(x => x !== r);
    const ops = [['records', 'del', r.id]];
    if (r.pid && !records.some(x => x.pid === r.pid)) { ops.push(['photos', 'del', r.pid]); delete photos[r.pid] }
    commit(ops); renderTable();
  }
  if (t.classList.contains('thumb')) { $('#lb img').src = t.src; $('#lb').hidden = false }
};
$('#lb').onclick = () => $('#lb').hidden = true;

/* ---------- edit (popup) ---------- */
let eRec = null, eFoto, eList = [];
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
  msg('#eMsg', ''); $('#mdl').hidden = false;
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
  Object.assign(r, { ts: new Date(d + 'T' + ($('#eTime').value || hm(r.ts))).getTime(), sj: $('#eSj').value.trim(), prod: $('#eProd').value, vn: v ? v.n : '', vc: v ? v.c : '', ada: a, min: m, src: $('#eSrc').value, adm: $('#eAdm').value });
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
  if (old && old !== r.pid && !records.some(x => x.pid === old)) { ops.push(['photos', 'del', old]); delete photos[old] }
  if (!commit(ops)) return msg('#eMsg', 'Penyimpanan penuh. Coba foto yang lebih kecil.');
  closeEdit(); renderTable(); renderReqs();
};
$('#mdl').onclick = e => { if (e.target.id === 'mdl') closeEdit() };

/* ---------- export ---------- */
const stDesc = r => r.ada === r.min ? 'Lengkap' : 'Kurang';
function puHead(rows) {
  const f = dtVal('#dFrom'), t = dtVal('#dTo', true);
  const tgl = !f && !t ? 'Semua tanggal' : f && t ? fDT(f) + ' s/d ' + fDT(t) : f ? 'Mulai ' + fDT(f) : 'Sampai ' + fDT(t);
  return { title: 'Laporan Purchase', tgl: 'Tanggal & Jam: ' + tgl, asal: 'Asal Barang: ' + ($('#fqSrc').value || 'Semua'), adm: 'Nama Admin: ' + admHead('#fqAdm', rows) };
}
$('#xXls').onclick = () => {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const seq = seqMap(), rows = filtered().sort((a, b) => seq[a.id] - seq[b.id]);
  if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const H = puHead(rows);
  const aoa = [[H.title], [H.tgl], [H.asal], [H.adm], [], ['No', 'Tanggal', 'Jam', 'No Surat Jalan', 'Produk', 'Varian', 'Ada', 'Diminta', 'Status', 'Asal']]
    .concat(rows.map(r => [seq[r.id], ymd(r.ts), hm(r.ts), r.sj || '', r.prod, r.vn || '-', r.ada, r.min, stDesc(r), r.src]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 9 } }));
  ws['!cols'] = [5, 12, 8, 18, 28, 16, 6, 9, 10, 10].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Purchase');
  XLSX.writeFile(wb, fileName($('#fqSrc').value, admFile('#fqAdm', rows), 'PURCHASE', 'xlsx'));
};
$('#xPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const seq = seqMap(), rows = filtered().sort((a, b) => seq[a.id] - seq[b.id]); if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const H = puHead(rows), doc = new jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16); doc.text(H.title, 14, 15);
  doc.setFontSize(10); doc.text(H.tgl, 14, 22); doc.text(H.asal + '     ' + H.adm, 14, 28);
  doc.autoTable({
    startY: 33, headStyles: { fillColor: [74, 123, 208] },
    head: [['No', 'Tanggal', 'No. Surat Jalan', 'Produk', 'Varian', 'Ada / Diminta', 'Status', 'Asal']],
    body: rows.map(r => [seq[r.id], tsFmt(r.ts), r.sj || '-', r.prod, r.vn || '-', r.ada + ' / ' + r.min + ' pcs', stDesc(r), r.src]),
  });
  doc.save(fileName($('#fqSrc').value, admFile('#fqAdm', rows), 'PURCHASE', 'pdf'));
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
function renderProducts() {
  const q = $('#pSearch').value.trim().toLowerCase();
  const L = products.filter(p => !q || p.name.toLowerCase().includes(q) || p.variants.some(v => v.n.toLowerCase().includes(q)));
  $('#pList').innerHTML = '<label>Daftar Produk (' + (q ? L.length + ' dari ' : '') + products.length + ')</label>' + (L.length ? L.map(p => `<div class="pl">
    <div><b>${esc(p.name)}</b><div style="margin-top:6px">${p.variants.length ? p.variants.map(v => sw(v.c, v.n)).join(' ') : '<span style="color:var(--mute);font-size:13px">Tanpa varian</span>'}</div></div>
    <button class="btn ghost sm" data-p="${p.id}">Hapus</button></div>`).join('') : '<div class="empty">' + (products.length ? 'Produk tidak ditemukan.' : 'Belum ada produk.') + '</div>');
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
  const id = e.target.dataset.p;
  if (!id || !confirm('Hapus produk ini? Data pengajuan dan purchase lama tetap tersimpan.')) return;
  products = products.filter(p => String(p.id) !== id); commit([['products', 'del', id]]); renderProducts();
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
[$('#pSearch'), $('#fqProd'), $('#fqSj'), $('#xProd')].forEach(addClear);
$$('.tm24').forEach(time24);
let curDay = dayWIB(Date.now());
const dayCheck = () => {
  const d = dayWIB(Date.now());
  if (d !== curDay) { // ganti hari: filter tanggal yang masih di "hari kemarin" ikut pindah ke hari baru
    if ($('#xFromD').value === curDay) $('#xFromD').value = d;
    if ($('#xToD').value === curDay) $('#xToD').value = d;
    curDay = d; renderReqs(); refreshBlocks();
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
  $('#who').textContent = me ? '👤 ' + me.name : '🔒 Tamu';
  $('#who').title = me ? 'Klik untuk keluar' : 'Klik untuk masuk / daftar';
}
function setMe(m) { me = m; store.set('pp_session', m ? { username: m.username, name: m.name } : { guest: true }); $('#auth').hidden = true; renderWho() }
$$('.atabs button').forEach(b => b.onclick = () => authTab(b.dataset.a));
$('#who').onclick = () => {
  if (!me) return showAuth('in');
  if (!confirm('Keluar dari akun ' + me.name + '?')) return;
  store.set('pp_session', null); me = null; renderWho(); showAuth('in');
};
$('#guestBtn').onclick = () => setMe(null); // masuk tanpa akun: nama admin tidak terisi
$('#fLogin').onsubmit = async e => {
  e.preventDefault();
  const u = $('#lUser').value.trim().toLowerCase(), p = $('#lPass').value;
  if (!u || !p) return authMsg('Isi username dan password.');
  try {
    const a = await adminGet(u);
    if (!a || a.pass !== pwHash(u, p)) return authMsg('Username atau password salah.');
    $('#lPass').value = ''; setMe({ username: a.username, name: a.name });
  } catch (err) { console.error('login', err); authMsg(authErr(err, 'Tidak bisa terhubung ke server.')) }
};
$('#fSignup').onsubmit = async e => {
  e.preventDefault();
  const name = $('#sName').value.trim().replace(/\s+/g, ' '), u = $('#sUser').value.trim().toLowerCase(), p = $('#sPass').value;
  if (!name) return authMsg('Isi nama.');
  if (!/^[a-z0-9._-]{3,20}$/.test(u)) return authMsg('Username 3-20 karakter: huruf kecil, angka, titik, strip, atau garis bawah.');
  if (p.length < 4) return authMsg('Password minimal 4 karakter.');
  try {
    await adminCreate({ username: u, name, pass: pwHash(u, p), ts: Date.now() });
    $('#sPass').value = ''; setMe({ username: u, name });
  } catch (err) {
    console.error('signup', err);
    authMsg(err && err.message === 'exists' ? 'Username sudah dipakai, pilih yang lain.' : authErr(err, 'Gagal mendaftar.'));
  }
};
{ const s = store.get('pp_session', null);
  if (s && s.username) me = { username: s.username, name: s.name };
  renderWho(); if (!s) showAuth('in'); }

pgVarUI(); addBlock(); startSync();