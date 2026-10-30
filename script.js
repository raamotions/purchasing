const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const SRC = ['Kode A', 'Kode B', 'Aling'];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sw = (c, n) => c ? `<span class="sw" title="${esc(n || '')}" style="background:${c}"></span>` : '-';
const p2 = n => String(n).padStart(2, '0');
const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) };
const hm = t => p2(new Date(t).getHours()) + ':' + p2(new Date(t).getMinutes());
const fmt = t => new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const stat = (a, m) => a === m ? '<b class="okc">✓</b>' : '<b class="badc">✕</b>';
const msg = (id, t, ok) => { const m = $(id); m.textContent = t; m.className = 'msg' + (ok ? ' ok' : '') };

/* ---------- penyimpanan (localStorage) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } }
};
let products, reqs, records, photos;
function load() {
  products = store.get('pp_products', null) || [
    { id: 'p1', name: 'Kaos Polos', variants: [{ n: 'Biru', c: '#3b82f6' }, { n: 'Merah', c: '#ef4444' }, { n: 'Hitam', c: '#1f2937' }] },
    { id: 'p2', name: 'Tas Kanvas', variants: [] }
  ];
  reqs = store.get('pp_requests', []);
  records = store.get('pp_records', []);
  photos = store.get('pp_photos', {});
}
function commit() {
  const used = new Set(records.map(r => r.pid));
  Object.keys(photos).forEach(k => { if (!used.has(k)) delete photos[k] });
  const ok = store.set('pp_products', products) && store.set('pp_requests', reqs) &&
             store.set('pp_records', records) && store.set('pp_photos', photos);
  if (!ok) load(); // gagal (penyimpanan penuh): kembalikan ke data terakhir
  return ok;
}
load();

/* ---------- menu & hamburger ---------- */
function go(t) {
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  $$('.sec').forEach(s => s.classList.toggle('on', s.id === t));
  $('#nav').classList.remove('open');
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
function psearch(box, opts, onPick) {
  box.classList.add('pop');
  box.innerHTML = '<input placeholder="Cari produk..." autocomplete="off"><div class="list sug"></div>';
  const i = box.querySelector('input'), l = box.querySelector('.sug');
  const show = () => {
    const q = i.value.trim().toLowerCase();
    const m = opts().filter(p => p.name.toLowerCase().includes(q));
    l.innerHTML = m.length ? m.map(p => `<div data-id="${p.id}">${esc(p.name)}</div>`).join('') : '<em>Produk tidak ditemukan</em>';
    l.classList.add('open');
  };
  let pick = null;
  i.oninput = () => { pick = null; onPick(null); show() };
  i.onfocus = show;
  l.onclick = e => {
    const id = e.target.dataset.id; if (!id) return;
    pick = opts().find(x => String(x.id) === id);
    i.value = pick.name; l.classList.remove('open'); onPick(pick);
  };
  document.addEventListener('click', e => { if (!box.contains(e.target)) l.classList.remove('open') });
  return { get: () => pick, reset() { i.value = ''; pick = null; onPick(null) } };
}

/* ---------- PENGAJUAN ---------- */
let pgProd = null, pgVar = null;
const pgSearch = psearch($('#pgSearch'), () => products, p => { pgProd = p; pgVar = null; pgVarUI() });
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
  if (!pgProd) return msg('#pgMsg', 'Pilih produk dari hasil pencarian.');
  if (pgProd.variants.length && !pgVar) return msg('#pgMsg', 'Pilih varian warna.');
  const m = parseInt($('#pgMin').value, 10);
  if (!(m >= 1)) return msg('#pgMsg', 'Isi jumlah barang diminta (angka).');
  if (!$('#pgSrc').value) return msg('#pgMsg', 'Pilih asal barang.');
  reqs.unshift({ id: uid(), ts: Date.now(), pid: pgProd.id, prod: pgProd.name, vn: pgVar ? pgVar.n : '', vc: pgVar ? pgVar.c : '', min: m, ada: 0, src: $('#pgSrc').value });
  if (!commit()) return msg('#pgMsg', 'Penyimpanan penuh.');
  pgSearch.reset(); $('#pgMin').value = ''; $('#pgSrc').value = '';
  msg('#pgMsg', 'Pengajuan tersimpan.', true); renderReqs();
};
function renderReqs() {
  $('#pgTb').innerHTML = reqs.length ? reqs.map(r => `<tr>
    <td>${fmt(r.ts)}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${r.ada} / ${r.min} pcs</td><td><span class="tag">${esc(r.src)}</span></td>
    <td>${r.ada >= r.min ? 'Selesai' : r.ada ? 'Sebagian' : 'Menunggu'}</td>
    <td><button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Belum ada pengajuan.</td></tr>';
}
$('#pgTb').onclick = e => {
  const id = e.target.dataset.del;
  if (!id || !confirm('Hapus pengajuan ini?')) return;
  reqs = reqs.filter(r => r.id !== id); commit(); renderReqs();
};

/* ---------- INPUT ---------- */
let blocks = [], photo = '';
const openProducts = () => [...new Map(reqs.filter(r => r.ada < r.min).map(r => [r.pid, { id: r.pid, name: r.prod }])).values()];

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
    const rs = reqs.filter(r => String(r.pid) === String(b.prod.id) && r.ada < r.min);
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
$('#fFoto').onchange = e => {
  photo = ''; $('#prev').style.display = 'none';
  const f = e.target.files[0];
  if (f) compress(f, d => { photo = d; $('#prev').src = d; $('#prev').style.display = 'block' });
};
function resetInput() {
  $('#sj').value = ''; $('#fFoto').value = ''; photo = ''; $('#prev').style.display = 'none';
  $('#blocks').innerHTML = ''; blocks = []; addBlock(); msg('#inMsg', '');
}
$('#inSubmit').onclick = () => {
  const lines = [];
  blocks.forEach(b => b.el.querySelectorAll('.ln').forEach(ln => {
    const v = parseInt(ln.querySelector('input').value, 10);
    if (v > 0) lines.push([reqs.find(r => r.id === ln.dataset.id), v]);
  }));
  if (!lines.length) return msg('#inMsg', 'Isi jumlah barang ada minimal pada satu produk/varian.');
  const ts = Date.now(), sj = $('#sj').value.trim(), pid = photo ? uid() : '';
  if (pid) photos[pid] = photo;
  lines.forEach(([r, v]) => {
    r.ada += v;
    records.unshift({ id: uid(), ts, sj, prod: r.prod, vn: r.vn, vc: r.vc, ada: r.ada, min: r.min, src: r.src, pid, rid: r.id });
  });
  if (!commit()) return msg('#inMsg', 'Penyimpanan penuh. Coba tanpa foto atau hapus data lama.');
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
function renderTable() {
  const cols = [...new Map(records.filter(r => r.vc).map(r => [r.vc, r.vn])).entries()], cur = $('#fqVar').value;
  $('#fqVar').innerHTML = '<option value="">Semua</option>' + cols.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
  $('#fqVar').value = cur;
  const rows = filtered();
  $('#tb').innerHTML = rows.length ? rows.map(r => `<tr>
    <td>${fmt(r.ts)}</td><td>${esc(r.sj || '-')}</td><td>${esc(r.prod)}</td><td>${sw(r.vc, r.vn)}</td>
    <td>${r.ada} / ${r.min} pcs</td><td>${stat(r.ada, r.min)}</td><td><span class="tag">${esc(r.src)}</span></td>
    <td>${photos[r.pid] ? `<img class="thumb" src="${photos[r.pid]}" alt="Surat jalan">` : '-'}</td>
    <td class="nw"><button class="btn ghost sm" data-edit="${r.id}">Edit</button> <button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>`).join('')
    : '<tr><td colspan="9" class="empty">Belum ada data purchase.</td></tr>';
}
FIL.forEach(s => $(s).oninput = renderTable);
$('#reset').onclick = () => { FIL.forEach(s => $(s).value = ''); renderTable() };
$('#tb').onclick = e => {
  const t = e.target;
  if (t.dataset.edit) openEdit(t.dataset.edit);
  if (t.dataset.del && confirm('Hapus data ini?')) { records = records.filter(r => r.id !== t.dataset.del); commit(); renderTable() }
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
  $('#eFile').value = ''; const ph = photos[r.pid];
  $('#ePrev').src = ph || ''; $('#ePrev').style.display = ph ? 'block' : 'none';
  msg('#eMsg', ''); $('#mdl').hidden = false;
}
$('#eProd').onchange = () => fillEVar($('#eProd').value, '', '');
$('#eVar').onchange = eSwatch;
$('#eFile').onchange = e => {
  const f = e.target.files[0];
  if (f) compress(f, d => { eFoto = d; $('#ePrev').src = d; $('#ePrev').style.display = 'block' });
};
$('#eDelFoto').onclick = () => { eFoto = ''; $('#eFile').value = ''; $('#ePrev').style.display = 'none' };
const closeEdit = () => { $('#mdl').hidden = true; eRec = null };
$('#eCancel').onclick = closeEdit;
$('#eSave').onclick = () => {
  const a = parseInt($('#eAda').value, 10), m = parseInt($('#eMin').value, 10), d = $('#eDate').value;
  if (!d) return msg('#eMsg', 'Isi tanggal.');
  if (isNaN(a) || a < 0 || !(m >= 1)) return msg('#eMsg', 'Isi quantity dengan angka yang benar.');
  if (a > m) return msg('#eMsg', 'Barang ada tidak boleh melebihi barang diminta.');
  const r = eRec, v = eList[$('#eVar').value];
  Object.assign(r, { ts: new Date(d + 'T' + hm(r.ts)).getTime(), sj: $('#eSj').value.trim(), prod: $('#eProd').value, vn: v ? v.n : '', vc: v ? v.c : '', ada: a, min: m, src: $('#eSrc').value });
  if (eFoto !== undefined) { if (eFoto) { r.pid = uid(); photos[r.pid] = eFoto } else r.pid = '' }
  if (!commit()) { eRec = records.find(x => x.id === r.id); return msg('#eMsg', 'Penyimpanan penuh. Coba foto yang lebih kecil.') }
  closeEdit(); renderTable();
};
$('#mdl').onclick = e => { if (e.target.id === 'mdl') closeEdit() };

/* ---------- export ---------- */
const stDesc = r => r.ada === r.min ? 'Lengkap' : 'Kurang';
$('#xXls').onclick = () => {
  if (!window.XLSX) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  const rows = filtered().map(r => ({ Tanggal: ymd(r.ts), 'No Surat Jalan': r.sj || '', Produk: r.prod, Varian: r.vn, 'Kode Warna': r.vc, Ada: r.ada, Diminta: r.min, Status: stDesc(r), Asal: r.src }));
  if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Purchase');
  XLSX.writeFile(wb, 'purchase-' + ymd(Date.now()) + '.xlsx');
};
$('#xPdf').onclick = () => {
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  const rows = filtered(); if (!rows.length) return alert('Tidak ada data untuk diexport.');
  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14); doc.text('Laporan Purchase', 14, 14);
  doc.autoTable({
    startY: 20, headStyles: { fillColor: [74, 123, 208] },
    head: [['Tanggal', 'No. Surat Jalan', 'Produk', 'Varian', 'Ada / Diminta', 'Status', 'Asal']],
    body: rows.map(r => [ymd(r.ts), r.sj || '-', r.prod, '', r.ada + ' / ' + r.min + ' pcs', stDesc(r), r.src]),
    didDrawCell: d => {
      if (d.section === 'body' && d.column.index === 3) {
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
  products.push({ id: uid(), name, variants });
  if (!commit()) return msg('#pMsg', 'Penyimpanan penuh.');
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
  products = products.filter(p => String(p.id) !== id); commit(); renderProducts();
};

/* input massal */
const CN = { merah: 'red', biru: 'blue', hijau: 'green', kuning: 'yellow', hitam: 'black', putih: 'white', abu: 'gray', 'abu-abu': 'gray', oranye: 'orange', jingga: 'orange', ungu: 'purple', coklat: 'brown', cokelat: 'brown' };
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
      let np = 0, nv = 0, bad = 0;
      rows.forEach(row => {
        const k = {}; Object.keys(row).forEach(x => k[x.trim().toLowerCase()] = row[x]);
        const name = String(k.produk || k['nama produk'] || k.nama || '').trim();
        if (!name) { bad++; return }
        let p = products.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!p) { p = { id: uid(), name, variants: [] }; products.push(p); np++ }
        const vn = String(k.varian || '').trim(), col = String(k.warna || '').trim();
        if (!vn && !col) return;
        const c = toHex(col || vn), nm = vn || col;
        if (!c) { bad++; return }
        if (!p.variants.some(v => v.n.toLowerCase() === nm.toLowerCase())) { p.variants.push({ n: nm, c }); nv++ }
      });
      if (!commit()) return msg('#impMsg', 'Penyimpanan penuh.');
      renderProducts();
      msg('#impMsg', `${np} produk baru, ${nv} varian ditambahkan` + (bad ? `, ${bad} baris dilewati (nama/warna tidak valid).` : '.'), true);
    } catch (err) { msg('#impMsg', 'File tidak bisa dibaca. Gunakan format .xlsx atau .csv.') }
    $('#impFile').value = '';
  };
  rd.readAsArrayBuffer(f);
};

/* ---------- mulai ---------- */
pgVarUI(); renderReqs(); renderProducts(); addBlock();