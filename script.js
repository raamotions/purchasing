const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const SRC = ['Kode A', 'Kode B', 'Aling'];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sw = (c, n) => c ? `<span class="sw" title="${esc(n || '')}" style="background:${c}"></span>` : '-';
const p2 = n => String(n).padStart(2, '0');
const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) };
const hm = t => p2(new Date(t).getHours()) + ':' + p2(new Date(t).getMinutes());
const fmt = t => new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

let db = null, products = [], reqs = [], records = [], photos = {};
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
  renderReqs(); renderProducts();
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
  } catch (e) { db = null; loadLocal(); setSync('err'); refresh() }
}

/* ---------- menu & hamburger ---------- */
const TT = { pg: ['Pengajuan', 'Daftar pengajuan dikosongkan otomatis setiap pukul 00.00 WIB'], in: ['Input Barang Masuk', 'Catat barang yang diterima berdasarkan pengajuan'], pu: ['Purchase', 'Riwayat penerimaan barang'], pr: ['Produk', 'Kelola database produk dan varian warna'] };
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

/* ---------- komponen: pencarian produk ---------- */
function psearch(box, opts, onPick, onText) { // onText: aktifkan mode ketik produk baru (HURUF KAPITAL)
  box.classList.add('pop');
  box.innerHTML = '<input placeholder="Cari produk..." autocomplete="off"><div class="list sug"></div>';
  const i = box.querySelector('input'), l = box.querySelector('.sug');
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
  l.onclick = e => {
    const id = e.target.dataset.id; if (!id) return;
    pick = opts().find(x => String(x.id) === id);
    i.value = pick.name; l.classList.remove('open'); onPick(pick);
  };
  document.addEventListener('click', e => { if (!box.contains(e.target)) l.classList.remove('open') });
  return { get: () => pick, text: () => i.value.trim(), reset() { i.value = ''; pick = null; onPick(null) } };
}

/* ---------- PENGAJUAN ---------- */
let pgProd = null, pgVar = null;
let pgNew = false;
const pgSearch = psearch($('#pgSearch'), () => products, p => { pgProd = p; pgVar = null; pgNewUI(); pgVarUI() }, t => {
  const p = products.find(x => x.name.toUpperCase() === t.toUpperCase());
  pgProd = p || null; pgVar = null; pgNewUI(); pgVarUI();
});
function pgNewUI() { // produk tidak ada di database: tampilkan isian warna manual
  pgNew = !pgProd && pgSearch.text() !== '';
  $('#pgNew').hidden = !pgNew; $('#pgVarWrap').hidden = pgNew;
}
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
  const typed = pgSearch.text().toUpperCase();
  let prod = pgProd, vr = pgVar;
  if (!prod && !typed) return msg('#pgMsg', 'Pilih produk dari hasil pencarian atau ketik nama produk baru.');
  if (prod && prod.variants.length && !vr) return msg('#pgMsg', 'Pilih varian warna.');
  const m = parseInt($('#pgMin').value, 10), src = $('#pgSrc').value;
  if (!(m >= 1)) return msg('#pgMsg', 'Isi jumlah barang diminta (angka).');
  if (!src) return msg('#pgMsg', 'Pilih asal barang.');
  const ops = []; let np = null;
  if (!prod) { // produk baru: langsung masuk ke database produk
    const vt = $('#pgVarName').value.trim().toUpperCase();
    vr = vt ? { n: vt, c: $('#pgVarCol').value } : null;
    np = prod = { id: uid(), name: typed, variants: vr ? [vr] : [] };
    products.push(np); ops.push(['products', 'set', np]);
  }
  const vn = vr ? vr.n : '', vc = vr ? vr.c : '';
  // produk + warna + asal yang sama (hari ini) digabung, jumlah diminta dijumlahkan
  const ex = np ? null : todayReqs().find(r => String(r.pid) === String(prod.id) && r.vn === vn && r.vc === vc && r.src === src);
  if (ex) {
    ex.min += m; ops.push(['requests', 'set', ex]);
    records.filter(x => x.rid === ex.id).forEach(x => { x.min = ex.min; ops.push(['records', 'set', x]) });
  } else {
    const q = { id: uid(), ts: Date.now(), pid: prod.id, prod: prod.name, vn, vc, min: m, ada: 0, src };
    reqs.unshift(q); ops.push(['requests', 'set', q]);
  }
  if (!commit(ops)) return msg('#pgMsg', 'Penyimpanan penuh.');
  pgSearch.reset(); $('#pgMin').value = ''; $('#pgSrc').value = ''; $('#pgVarName').value = ''; $('#pgVarCol').value = '#4a7bd0';
  msg('#pgMsg', ex ? 'Digabung dengan pengajuan yang sama. Total diminta: ' + ex.min + ' pcs.' : np ? 'Produk baru "' + np.name + '" masuk ke database produk, pengajuan tersimpan.' : 'Pengajuan tersimpan.', true);
  renderReqs(); renderProducts();
};
const todayReqs = () => reqs.filter(r => dayWIB(r.ts) === dayWIB(Date.now()));
function renderReqs() {
  const L = todayReqs().filter(r => !$('#xSrc').value || r.src === $('#xSrc').value).sort((a, b) => a.ts - b.ts);
  $('#pgTb').innerHTML = L.length ? L.map((r, n) => `<tr>
    <td>${n + 1}</td><td>${fmt(r.ts)}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${r.ada} / ${r.min} pcs</td><td><span class="tag">${esc(r.src)}</span></td>
    <td>${r.ada >= r.min ? 'Selesai' : r.ada ? 'Sebagian' : 'Menunggu'}</td>
    <td class="nw"><button class="btn ghost sm" data-redit="${r.id}">Edit</button> <button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>`).join('')
    : '<tr><td colspan="8" class="empty">Belum ada pengajuan hari ini.</td></tr>';
}
$('#pgTb').onclick = e => {
  if (e.target.dataset.redit) return openREdit(e.target.dataset.redit);
  const id = e.target.dataset.del;
  if (!id || !confirm('Hapus pengajuan ini?')) return;
  reqs = reqs.filter(r => r.id !== id); commit([['requests', 'del', id]]); renderReqs();
};

/* ---------- edit pengajuan (popup) ---------- */
let rRec = null, rList = [];
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
  $('#rAda').value = r.ada; $('#rMin').value = r.min; $('#rSrc').value = r.src;
  msg('#rMsg', ''); $('#rmdl').hidden = false;
}
const closeREdit = () => { $('#rmdl').hidden = true; rRec = null };
$('#rProd').onchange = () => fillRVar($('#rProd').value, '', '');
$('#rVar').onchange = rSwatch;
$('#rCancel').onclick = closeREdit;
$('#rmdl').onclick = e => { if (e.target.id === 'rmdl') closeREdit() };
$('#rSave').onclick = () => {
  const r = reqs.find(x => x.id === rRec.id) || rRec, m = parseInt($('#rMin').value, 10), name = $('#rProd').value;
  const p = products.find(x => x.name === name), v = rList[$('#rVar').value];
  if (!(m >= 1)) return msg('#rMsg', 'Isi jumlah diminta dengan angka.');
  if (m < r.ada) return msg('#rMsg', 'Jumlah diminta tidak boleh kurang dari barang yang sudah ada (' + r.ada + ').');
  if (p && p.variants.length && !v) return msg('#rMsg', 'Pilih varian warna.');
  if (!$('#rSrc').value) return msg('#rMsg', 'Pilih asal barang.');
  Object.assign(r, { pid: p ? p.id : r.pid, prod: name, vn: v ? v.n : '', vc: v ? v.c : '', min: m, src: $('#rSrc').value });
  const ops = [['requests', 'set', r]];
  records.filter(x => x.rid === r.id).forEach(x => { Object.assign(x, { prod: r.prod, vn: r.vn, vc: r.vc, min: r.min, src: r.src }); ops.push(['records', 'set', x]) });
  if (!commit(ops)) return msg('#rMsg', 'Penyimpanan penuh.');
  closeREdit(); renderReqs();
};

/* ---------- export pengajuan ---------- */
const SL = '\u00A0'.repeat(8) + '/ '; // kolom Ada dikosongkan, garis miring tetap ada
const reqStat = r => r.ada >= r.min ? 'Selesai' : r.ada ? 'Sebagian' : 'Menunggu';
function pgRows() {
  const f = $('#xFrom').value, t = $('#xTo').value;
  const s = $('#xSrc').value;
  return reqs.filter(r => (!f || dayWIB(r.ts) >= f) && (!t || dayWIB(r.ts) <= t) && (!s || r.src === s)).sort((a, b) => a.ts - b.ts);
}
const fD = s => s ? s.split('-').reverse().join('-') : '';
function pgHead() {
  const f = $('#xFrom').value, t = $('#xTo').value, s = $('#xSrc').value;
  const tgl = !f && !t ? 'Semua tanggal' : f && t ? (f === t ? fD(f) : fD(f) + ' s/d ' + fD(t)) : f ? 'Mulai ' + fD(f) : 'Sampai ' + fD(t);
  return { title: 'Permintaan Pengajuan Barang', tgl: 'Tanggal Pengajuan: ' + tgl, asal: 'Asal Barang: ' + (s || 'Semua') };
}
$('#pgXls').onclick = () => {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const H = pgHead(), rows = pgRows();
  if (!rows.length) return alert('Tidak ada pengajuan pada filter itu.');
  const aoa = [[H.title], [H.tgl], [H.asal], [], ['No', 'Tanggal', 'Produk', 'Varian', 'Kode Warna', 'Ada / Diminta', 'Asal', 'Status']]
    .concat(rows.map((r, i) => [i + 1, fD(dayWIB(r.ts)), r.prod, r.vn, r.vc, SL + r.min + ' pcs', r.src, '\u2610']));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: 7 } }));
  ws['!cols'] = [5, 12, 28, 14, 12, 18, 10, 8].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Pengajuan');
  XLSX.writeFile(wb, 'pengajuan-' + dayWIB(Date.now()) + '.xlsx');
};
$('#pgPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const H = pgHead(), rows = pgRows(); if (!rows.length) return alert('Tidak ada pengajuan pada filter itu.');
  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16); doc.text(H.title, 14, 15);
  doc.setFontSize(10); doc.text(H.tgl, 14, 22); doc.text(H.asal, 14, 28);
  doc.autoTable({
    startY: 33, headStyles: { fillColor: [74, 123, 208] },
    head: [['No', 'Tanggal', 'Produk', 'Varian', 'Ada / Diminta', 'Asal', 'Status']],
    body: rows.map((r, i) => [i + 1, fD(dayWIB(r.ts)), r.prod, '', SL + r.min + ' pcs', r.src, '']),
    didDrawCell: d => {
      if (d.section !== 'body') return;
      if (d.column.index === 3) {
        const r = rows[d.row.index];
        if (r.vc) { doc.setFillColor(r.vc); doc.circle(d.cell.x + 6, d.cell.y + d.cell.height / 2, 2.2, 'F') }
      }
      if (d.column.index === 6) { // kotak centang kosong
        const s = 4.5; doc.setDrawColor(60); doc.setLineWidth(.3);
        doc.rect(d.cell.x + (d.cell.width - s) / 2, d.cell.y + (d.cell.height - s) / 2, s, s);
      }
    }
  });
  doc.save('pengajuan-' + dayWIB(Date.now()) + '.pdf');
};
$('#xFrom').value = $('#xTo').value = dayWIB(Date.now());
$('#xSrc').onchange = renderReqs;

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
        <span>Diajukan <b>${r.min}</b> pcs · sudah ada ${r.ada} · <span class="tag">${esc(r.src)}</span></span></div>
      <input type="number" min="0" max="${r.min - r.ada}" inputmode="numeric" placeholder="Ada">
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
    const r = reqs.find(x => x.id === ln.dataset.id);
    const v = Math.min(parseInt(ln.querySelector('input').value, 10) || 0, r ? r.min - r.ada : 0);
    if (r && v > 0) lines.push([r, v]);
  }));
  if (!lines.length) return msg('#inMsg', 'Isi jumlah barang ada minimal pada satu produk/varian.');
  const ts = Date.now(), sj = $('#sj').value.trim(), pid = photo ? uid() : '', ops = [];
  if (pid) { photos[pid] = photo; ops.push(['photos', 'set', { id: pid, d: photo }]) }
  lines.forEach(([r, v]) => {
    r.ada += v;
    const rec = { id: uid(), ts, sj, prod: r.prod, vn: r.vn, vc: r.vc, ada: r.ada, min: r.min, src: r.src, pid, rid: r.id };
    records.unshift(rec); ops.push(['requests', 'set', r], ['records', 'set', rec]);
  });
  if (!commit(ops)) return msg('#inMsg', 'Penyimpanan penuh. Coba tanpa foto atau hapus data lama.');
  resetInput(); go('pu');
};

/* ---------- PURCHASE ---------- */
const FIL = ['#dFrom', '#dTo', '#fqSj', '#fqProd', '#fqSrc', '#fqSt', '#fqVar'];
function filtered() {
  const f = $('#dFrom').value, t = $('#dTo').value, j = $('#fqSj').value.toLowerCase(), q = $('#fqProd').value.toLowerCase(),
    s = $('#fqSrc').value, st = $('#fqSt').value, v = $('#fqVar').value;
  return records.filter(r => (!f || ymd(r.ts) >= f) && (!t || ymd(r.ts) <= t) &&
    (!j || (r.sj || '').toLowerCase().includes(j)) && (!q || r.prod.toLowerCase().includes(q)) &&
    (!s || r.src === s) && (!v || r.vc === v) && (!st || (st === 'ok') === (r.ada === r.min)));
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
    <td>${seq[r.id]}</td><td>${fmt(r.ts)}</td><td>${esc(r.sj || '-')}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${r.ada} / ${r.min} pcs</td><td>${stat(r.ada, r.min)}</td><td><span class="tag">${esc(r.src)}</span></td>
    <td>${photos[r.pid] ? `<img class="thumb" src="${photos[r.pid]}" alt="Surat jalan">` : '-'}</td>
    <td class="nw"><button class="btn ghost sm" data-edit="${r.id}">Edit</button> <button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>`;
  const tbl = list => `<div class="tw"><table><thead><tr><th>No</th><th>Tanggal</th><th>No. SJ</th><th>Produk</th><th>Varian</th><th>Ada / Diminta</th><th>Status</th><th>Asal</th><th>Foto</th><th></th></tr></thead><tbody>${list.slice().sort((a, b) => seq[a.id] - seq[b.id]).map(rowHtml).join('')}</tbody></table></div>`;
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
$('#reset').onclick = () => { FIL.forEach(s => $(s).value = ''); renderTable() };
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
  $('#eDate').value = ymd(r.ts); $('#eSj').value = r.sj || ''; $('#eAda').value = r.ada; $('#eMin').value = r.min; $('#eSrc').value = r.src;
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
  if (isNaN(a) || a < 0 || !(m >= 1)) return msg('#eMsg', 'Isi quantity dengan angka yang benar.');
  if (a > m) return msg('#eMsg', 'Barang ada tidak boleh melebihi barang diminta.');
  const r = records.find(x => x.id === eRec.id) || eRec, v = eList[$('#eVar').value], old = r.pid, ops = [];
  const sibs = records.filter(x => x.rid && x.rid === r.rid && x.id !== r.id), mx = Math.max(a, ...sibs.map(x => x.ada));
  if (r.rid && m < mx) return msg('#eMsg', 'Diminta tidak boleh kurang dari barang ada pada penerimaan terkait (' + mx + ').');
  Object.assign(r, { ts: new Date(d + 'T' + hm(r.ts)).getTime(), sj: $('#eSj').value.trim(), prod: $('#eProd').value, vn: v ? v.n : '', vc: v ? v.c : '', ada: a, min: m, src: $('#eSrc').value });
  const rq = r.rid && reqs.find(x => x.id === r.rid);
  if (rq) { // sinkron ke form Pengajuan
    const f = { prod: r.prod, vn: r.vn, vc: r.vc, min: r.min, src: r.src }, pp = products.find(x => x.name === r.prod);
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
$('#xXls').onclick = () => {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const seq = seqMap();
  const rows = filtered().sort((a, b) => seq[a.id] - seq[b.id]).map(r => ({ No: seq[r.id], Tanggal: ymd(r.ts), 'No Surat Jalan': r.sj || '', Produk: r.prod, Varian: r.vn, 'Kode Warna': r.vc, Ada: r.ada, Diminta: r.min, Status: stDesc(r), Asal: r.src }));
  if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Purchase');
  XLSX.writeFile(wb, 'purchase-' + ymd(Date.now()) + '.xlsx');
};
$('#xPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const seq = seqMap(), rows = filtered().sort((a, b) => seq[a.id] - seq[b.id]); if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14); doc.text('Laporan Purchase', 14, 14);
  doc.autoTable({
    startY: 20, headStyles: { fillColor: [74, 123, 208] },
    head: [['No', 'Tanggal', 'No. Surat Jalan', 'Produk', 'Varian', 'Ada / Diminta', 'Status', 'Asal']],
    body: rows.map(r => [seq[r.id], ymd(r.ts), r.sj || '-', r.prod, '', r.ada + ' / ' + r.min + ' pcs', stDesc(r), r.src]),
    didDrawCell: d => {
      if (d.section === 'body' && d.column.index === 4) {
        const r = rows[d.row.index];
        if (r.vc) { doc.setFillColor(r.vc); doc.circle(d.cell.x + 6, d.cell.y + d.cell.height / 2, 2.2, 'F') }
      }
    }
  });
  doc.save('purchase-' + ymd(Date.now()) + '.pdf');
};

/* ---------- PRODUK ---------- */
function addVRow(n = '', c = '#4a7bd0') {
  const d = document.createElement('div'); d.className = 'vrow';
  d.innerHTML = `<input type="color" value="${c}"><input placeholder="Nama warna (mis. Biru)" value="${esc(n)}"><button class="btn ghost sm" type="button">Hapus</button>`;
  d.querySelector('button').onclick = () => d.remove(); $('#vBox').appendChild(d);
}
$('#addV').onclick = () => addVRow();
$('#saveP').onclick = () => {
  const name = $('#pName').value.trim();
  if (!name) return msg('#pMsg', 'Isi nama produk.');
  if (products.some(p => p.name.toLowerCase() === name.toLowerCase())) return msg('#pMsg', 'Produk dengan nama itu sudah ada.');
  const variants = [...$$('.vrow')].map(r => {
    const c = r.querySelector('input[type=color]').value;
    return { c, n: r.querySelector('input:not([type=color])').value.trim() || c };
  });
  const pr = { id: uid(), name, variants }; products.push(pr);
  if (!commit([['products', 'set', pr]])) return msg('#pMsg', 'Penyimpanan penuh.');
  $('#pName').value = ''; $('#vBox').innerHTML = ''; msg('#pMsg', 'Produk tersimpan.', true); renderProducts();
};
function renderProducts() {
  $('#pList').innerHTML = '<label>Daftar Produk (' + products.length + ')</label>' + (products.length ? products.map(p => `<div class="pl">
    <div><b>${esc(p.name)}</b><div style="margin-top:6px">${p.variants.length ? p.variants.map(v => sw(v.c, v.n)).join(' ') : '<span style="color:var(--mute);font-size:13px">Tanpa varian</span>'}</div></div>
    <button class="btn ghost sm" data-p="${p.id}">Hapus</button></div>`).join('') : '<div class="empty">Belum ada produk.</div>');
}
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
        const name = String(k.produk || k['nama produk'] || k.nama || '').trim();
        if (!name) { bad++; return }
        let p = products.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!p) { p = { id: uid(), name, variants: [] }; products.push(p); np++ }
        touched.add(p);
        const vn = String(k.varian || '').trim(), col = String(k.warna || '').trim();
        if (!vn && !col) return;
        const c = toHex(col || vn), nm = vn || col;
        if (!c) { bad++; return }
        if (!p.variants.some(v => v.n.toLowerCase() === nm.toLowerCase())) { p.variants.push({ n: nm, c }); nv++ }
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
let curDay = dayWIB(Date.now());
const dayCheck = () => { const d = dayWIB(Date.now()); if (d !== curDay) { curDay = d; renderReqs(); refreshBlocks() } };
setInterval(dayCheck, 30000); document.addEventListener('visibilitychange', dayCheck);
pgVarUI(); addBlock(); startSync();