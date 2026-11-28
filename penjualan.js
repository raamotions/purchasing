/* Data Penjualan (Owner & Admin): upload Excel BigSeller "Order Package".
   Kolom yang diambil: BH = No. Resi, AB = Nama Produk, AC = Nama Variasi, AG = Jumlah (tiga kolom ini dipecah per baris jadi poin),
   BE = Jasa Kirim, J = Marketplace, K = Toko Marketplace. Satu resi = satu data (upload ulang memperbarui). */
let sales = [], salesLoaded = false, djShow = 100;
const DJ_C = { mp: 9, toko: 10, prod: 27, vari: 28, qty: 32, kirim: 56, resi: 59 }; // indeks kolom (mulai 0): J, K, AB, AC, AG, BE, BH
const djTxt = v => String(v == null ? '' : v).trim();
const djLines = v => djTxt(v).split(/\r?\n/).map(t => t.trim()).filter(Boolean);
const djSave = () => { if (!db) store.set('pp_sales', sales) };
async function djLoad(force) {
  if (salesLoaded && !force) return true;
  if (!db) { sales = store.get('pp_sales', []); salesLoaded = true; return true }
  try { const s = await db.collection('sales').get(); sales = s.docs.map(d => d.data()); salesLoaded = true; return true }
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
  djShow = 100; djRender();
}
function djOpts(sel, vals, label) {
  const el = $(sel), cur = el.value; el.innerHTML = `<option value="">${label}</option>` + vals.map(v => `<option>${esc(v)}</option>`).join('');
  el.value = vals.includes(cur) ? cur : '';
}
const djUl = a => a.length ? '<ul style="margin:0;padding-left:18px">' + a.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : '-';
function djRender() {
  const el = $('#djList'); if (!el) return;
  const uniq = k => Array.from(new Set(sales.map(s => s[k]).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  djOpts('#djMp', uniq('mp'), 'Semua marketplace'); djOpts('#djKirim', uniq('kirim'), 'Semua jasa kirim'); djOpts('#djToko', uniq('toko'), 'Semua toko');
  const q = $('#djQ').value.trim(), mp = $('#djMp').value, kk = $('#djKirim').value, tk = $('#djToko').value;
  const L = sales.filter(s => (!mp || s.mp === mp) && (!kk || s.kirim === kk) && (!tk || s.toko === tk) &&
    (!q || tokOk(normName([s.resi, s.toko, s.prod.join(' '), s.vari.join(' ')].join(' ')), q))).sort((a, b) => (b.ts || 0) - (a.ts || 0) || a.resi.localeCompare(b.resi));
  const pcs = L.reduce((n, s) => n + s.qty.reduce((m, x) => m + (parseFloat(x) || 0), 0), 0), V = L.slice(0, djShow);
  el.innerHTML = sumBar([stag('Total resi', NF(sales.length)), (q || mp || kk || tk) ? stag('Hasil filter', NF(L.length)) : '', stag('Total pcs', NF(pcs))]) +
    (V.length ? `<div class="tw"><table style="min-width:1000px"><thead><tr><th>No</th><th>No. Resi</th><th>Marketplace</th><th>Toko</th><th>Jasa Kirim</th><th>Nama Produk</th><th>Nama Variasi</th><th>Jumlah</th></tr></thead><tbody>${V.map((s, i) =>
      `<tr><td>${i + 1}</td><td class="nw"><b>${esc(s.resi)}</b></td><td>${esc(s.mp || '-')}</td><td>${esc(s.toko || '-')}</td><td class="nw">${esc(s.kirim || '-')}</td><td>${djUl(s.prod)}</td><td>${djUl(s.vari)}</td><td>${djUl(s.qty)}</td></tr>`).join('')}</tbody></table></div>` +
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
    msg('#djMsg', 'Semua data penjualan dihapus.', true); djRender();
  };
})();
