/* Data Penjualan (Owner & Admin): upload Excel BigSeller "Order Package".
   Kolom yang diambil: BH = No. Resi, AB = Nama Produk, AC = Nama Variasi, AG = Jumlah (tiga kolom ini dipecah per baris jadi poin),
   BE = Jasa Kirim, J = Marketplace, K = Toko Marketplace. Satu resi = satu data (upload ulang memperbarui). */
let sales = [], salesLoaded = false, djShow = 100, djKMap = null, djKSrc = null, djKLen = -1;
// Ekspedisi di Data Scanner = Jasa Kirim pada Data Penjualan (dicari lewat nomor resi)
window.djKirimOf = resi => {
  if (!salesLoaded || !sales.length) return '';
  if (!djKMap || djKSrc !== sales || djKLen !== sales.length) { djKMap = new Map(sales.map(x => [String(x.resi).toUpperCase(), x.kirim || ''])); djKSrc = sales; djKLen = sales.length }
  return djKMap.get(String(resi).toUpperCase()) || '';
};
const djRefreshSc = () => { scCache = null; try { if ($('#sc').classList.contains('on')) renderSc() } catch (e) {} };
window.djEnsure = async () => { if (salesLoaded) return; if (await djLoad()) djRefreshSc() }; // dipanggil saat Data Scanner dibuka
const DJ_C = { mp: 9, toko: 10, prod: 27, vari: 28, qty: 32, kirim: 56, resi: 59 }; // indeks kolom (mulai 0): J, K, AB, AC, AG, BE, BH
const djTxt = v => String(v == null ? '' : v).trim();
const djLines = v => djTxt(v).split(/\r?\n/).map(t => t.trim()).filter(Boolean);
const djSave = () => { if (!db) store.set('pp_sales', sales) };
async function djLoad(force) {
  if (salesLoaded && !force) return true;
  if (!db) { sales = store.get('pp_sales', []); salesLoaded = true; scCache = null; return true }
  try { const s = await db.collection('sales').get(); sales = s.docs.map(d => d.data()); salesLoaded = true; scCache = null; return true }
  catch (e) { msg('#djMsg', 'Gagal memuat data penjualan: ' + ((e && (e.code || e.message)) || e) + '. Jika Rules Firestore membatasi koleksi, izinkan koleksi "sales" (allow read, write: if true;) lalu Publish.'); return false }
}
async function djRead(files) {
  files = Array.from(files || []); if (!files.length) return;
  if (!window.XLSX) return msg('#djMsg', 'Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  if (!me) return msg('#djMsg', 'Masuk dengan akun terlebih dulu.');
  if (!can('dj')) return msg('#djMsg', 'Akun ini tidak punya akses Data Penjualan.');
  msg('#djMsg', 'Membaca file...', true);
  if (!(await djLoad())) return;
  const byId = new Map(sales.map(s => [s.id, s])), ops = [], ts = Date.now(), pt = [];
  let read = 0, add = 0, upd = 0, same = 0, skip = 0;
  try {
    for (const fl of files) {
      const wb = XLSX.read(await fl.arrayBuffer(), { type: 'array' });
      for (const sn of wb.SheetNames) {
        const a = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
        a.slice(1).forEach(r => {
          const resi = djTxt(r[DJ_C.resi]); if (!resi) { skip++; return }
          read++;
          const rec = { id: 's_' + resi.replace(/[\/\s]+/g, '_'), resi, mp: djTxt(r[DJ_C.mp]), toko: djTxt(r[DJ_C.toko]), kirim: djTxt(r[DJ_C.kirim]), prod: djLines(r[DJ_C.prod]), vari: djLines(r[DJ_C.vari]), qty: djLines(r[DJ_C.qty]) };
          const old = byId.get(rec.id), key = o => JSON.stringify([o.resi, o.mp, o.toko, o.kirim, o.prod, o.vari, o.qty]);
          if (old && key(old) === key(rec)) { same++; return }
          rec.ts = ts; rec.adm = me.name; if (old) upd++; else add++;
          byId.set(rec.id, rec); pt.push(rec);
        });
      }
    }
  } catch (e) { return msg('#djMsg', 'Gagal membaca file: ' + ((e && e.message) || e)) }
  if (!read) return msg('#djMsg', 'Tidak ada nomor resi di kolom BH. Pastikan file Excel BigSeller "Order Package".');
  if (pt.length) {
    sales = Array.from(byId.values());
    if (db) { if (!commit(pt.map(r => ['sales', 'set', r]))) return msg('#djMsg', 'Gagal menyimpan.') } else djSave();
  }
  msg('#djMsg', NF(read) + ' resi dibaca: ' + NF(add) + ' baru, ' + NF(upd) + ' diperbarui, ' + NF(same) + ' sudah sama' + (skip ? ', ' + NF(skip) + ' baris tanpa resi dilewati' : '') + '.', true);
  djShow = 100; djRender(); djRefreshSc();
}
function djOpts(sel, vals, label) {
  const el = $(sel), cur = el.value; el.innerHTML = `<option value="">${label}</option>` + vals.map(v => `<option>${esc(v)}</option>`).join('');
  el.value = vals.includes(cur) ? cur : '';
}
const djRows = (s, i) => { // satu resi = beberapa baris; tiap poin produk, variasinya, dan jumlahnya sejajar di baris yang sama
  const n = Math.max(1, s.prod.length, s.vari.length, s.qty.length), pt = t => t ? '• ' + esc(t) : '-', out = [];
  for (let k = 0; k < n; k++) {
    const top = k === 0 ? ' style="border-top:2px solid rgba(60,100,150,.35)"' : '';
    out.push('<tr>' + (k === 0 ? `<td rowspan="${n}"${top}>${i + 1}</td><td class="nw" rowspan="${n}"${top}><b>${esc(s.resi)}</b></td><td rowspan="${n}"${top}>${esc(s.mp || '-')}</td><td rowspan="${n}"${top}>${esc(s.toko || '-')}</td><td class="nw" rowspan="${n}"${top}>${esc(s.kirim || '-')}</td>` : '') +
      `<td${top}>${pt(s.prod[k])}</td><td${top}>${pt(s.vari[k])}</td><td style="${k === 0 ? 'border-top:2px solid rgba(60,100,150,.35);' : ''}text-align:center"><b>${esc(s.qty[k] || '-')}</b></td></tr>`);
  }
  return out.join('');
};
function djRender() {
  const el = $('#djList'); if (!el) return;
  const uniq = k => Array.from(new Set(sales.map(s => s[k]).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  djOpts('#djMp', uniq('mp'), 'Semua marketplace'); djOpts('#djKirim', uniq('kirim'), 'Semua jasa kirim'); djOpts('#djToko', uniq('toko'), 'Semua toko');
  const q = $('#djQ').value.trim(), mp = $('#djMp').value, kk = $('#djKirim').value, tk = $('#djToko').value;
  const L = sales.filter(s => (!mp || s.mp === mp) && (!kk || s.kirim === kk) && (!tk || s.toko === tk) &&
    (!q || tokOk(normName([s.resi, s.toko, s.prod.join(' '), s.vari.join(' ')].join(' ')), q))).sort((a, b) => (b.ts || 0) - (a.ts || 0) || a.resi.localeCompare(b.resi));
  const pcs = L.reduce((n, s) => n + s.qty.reduce((m, x) => m + (parseFloat(x) || 0), 0), 0), V = L.slice(0, djShow);
  el.innerHTML = sumBar([stag('Total resi', NF(sales.length)), (q || mp || kk || tk) ? stag('Hasil filter', NF(L.length)) : '', stag('Total pcs', NF(pcs))]) +
    (V.length ? `<div class="tw"><table style="min-width:1000px"><thead><tr><th>No</th><th>No. Resi</th><th>Marketplace</th><th>Toko</th><th>Jasa Kirim</th><th>Nama Produk</th><th>Nama Variasi</th><th>Jumlah</th></tr></thead><tbody>${V.map(djRows).join('')}</tbody></table></div>` +
      (L.length > V.length ? `<div style="text-align:center;margin-top:10px"><button class="btn ghost sm" type="button" id="djMore">Tampilkan lebih banyak (${NF(L.length - V.length)} lagi)</button></div>` : '') : '<div class="empty">Belum ada data penjualan.</div>');
  const m = $('#djMore'); if (m) m.onclick = () => { djShow += 200; djRender() };
}
window.renderDj = async function () {
  if (!can('dj')) return;
  if (!salesLoaded) { $('#djList').innerHTML = '<div class="empty">Memuat data...</div>'; await djLoad() }
  djRender();
};
(() => {
  const d = $('#djDrop'); if (!d) return;
  ['dragenter', 'dragover'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.add('over') }));
  ['dragleave', 'drop'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.remove('over') }));
  d.addEventListener('drop', e => djRead(e.dataTransfer.files));
  $('#djPick').onclick = () => $('#djFile').click();
  $('#djFile').onchange = e => { djRead(e.target.files); e.target.value = '' };
  ['#djQ', '#djMp', '#djKirim', '#djToko'].forEach(id => { $(id).addEventListener('input', () => { djShow = 100; djRender() }); $(id).addEventListener('change', () => { djShow = 100; djRender() }) });
  $('#djReload').onclick = async () => { msg('#djMsg', 'Memuat ulang...', true); if (await djLoad(true)) { msg('#djMsg', 'Data dimuat ulang.', true); djRender() } };
  $('#djClear').onclick = () => {
    if (!can('dj') || !sales.length) return;
    if (!confirm('Hapus SEMUA data penjualan (' + NF(sales.length) + ' resi)? Tindakan ini tidak bisa dibatalkan.')) return;
    const ids = sales.map(s => s.id); sales = [];
    if (db) commit(ids.map(id => ['sales', 'del', id])); else djSave();
    msg('#djMsg', 'Semua data penjualan dihapus.', true); djRender(); djRefreshSc();
  };
})();

/* ---------- Pop up info resi saat scan (menu Packing > Scan) ---------- */
const djId = r => 's_' + String(r).replace(/[\/\s]+/g, '_');
async function djFind(resi) { // null = tidak ada, undefined = gagal membaca
  const ids = Array.from(new Set([resi, String(resi).toUpperCase()])), U = String(resi).toUpperCase();
  const list = salesLoaded ? sales : (db ? [] : store.get('pp_sales', []));
  const c = list.find(s => String(s.resi).toUpperCase() === U); if (c) return c;
  if (!db) return null;
  try { for (const r of ids) { const d = await db.collection('sales').doc(djId(r)).get(); if (d.exists) return d.data() } return null }
  catch (e) { return undefined }
}
let snInfoTok = 0;
function snInfoClose() { $('#snMdl').hidden = true; if ($('#scn').classList.contains('on')) { const i = $('#snIn'); if (i) i.focus({ preventScroll: true }) } }
window.snInfo = async function (resi, dup) {
  const body = $('#snMdlBody'), tok = ++snInfoTok;
  body.innerHTML = `<div class="hint">No. Resi : <b>${esc(resi)}</b></div><div class="empty">Mencari data penjualan...</div>`; $('#snMdl').hidden = false;
  const s = await djFind(resi); if (tok !== snInfoTok) return; // sudah scan resi lain
  const note = dup ? '<div class="msg bad" style="margin:0 0 10px">Resi ini sudah pernah discan.</div>' : '';
  if (!s) { body.innerHTML = note + `<div style="margin-bottom:8px"><b>No. Resi</b> : ${esc(resi)}</div><div class="msg bad" style="margin:0">${s === undefined ? 'Gagal membaca Data Penjualan (periksa koneksi / Rules Firestore).' : 'Resi ini tidak ditemukan di Data Penjualan.'}</div>`; return }
  const n = Math.max(1, s.prod.length, s.vari.length, s.qty.length), rows = [];
  for (let k = 0; k < n; k++) rows.push(`<tr><td>${k + 1}</td><td>${esc(s.prod[k] || '-')}</td><td>${esc(s.vari[k] || '-')}</td><td style="text-align:center"><b>${esc(s.qty[k] || '-')}</b></td></tr>`);
  body.innerHTML = note +
    `<div style="line-height:1.7"><div><b>No. Resi</b> : ${esc(s.resi)}</div><div><b>Toko</b> : ${esc(s.toko || '-')}</div><div><b>Marketplace</b> : ${esc(s.mp || '-')}</div></div>` +
    `<div class="tw" style="margin:12px 0"><table style="min-width:420px"><thead><tr><th>No.</th><th>Nama Produk</th><th>Nama Variasi</th><th>Jumlah</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>` +
    `<div><b>Jasa Kirim</b> : ${esc(s.kirim || '-')}</div>`;
};
(() => {
  const m = $('#snMdl'); if (!m) return;
  $('#snMdlOk').onclick = snInfoClose;
  m.addEventListener('mousedown', e => { if (e.target === m) snInfoClose() });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) snInfoClose() });
})();