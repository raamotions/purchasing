/* ========== COD GAGAL (menu Retur) ==========
   Dimuat setelah script.js: memakai helper & data milik script.js (commit, msg, esc, dayWIB, openState, snBeep, dst).
   Data: koleksi Firestore "codfail" (1 dokumen per resi yang discan) dan dokumen settings/cfdata (manifest + data BigSeller). */
const CF_EKS = ['J&T', 'SPX', 'GTL', 'SI CEPAT', 'CARGO', 'JNE', 'LEX'];
const CF_ST = ['Baik', 'Barang ditukar', 'Rusak', 'Lecet', 'Kurang', 'Salah barang'];
const CF_COLS = ['No', 'Tgl Transaksi', 'Nomor Resi Pengembalian', 'Nama Toko', 'Check Status', 'Check Deskripsi', 'Ket. Karung', 'Tgl Check', 'Waktu Check'];
const CF_W = [6, 14, 26, 28, 18, 22, 14, 14, 9];
const CF_H = { // nama kolom Excel BigSeller (huruf kecil)
  toko: ['toko bigseller', 'nama toko', 'toko'],
  pes: ['nomor pesanan', 'no pesanan', 'no. pesanan', 'id pesanan'],
  resi: ['nomor resi', 'no resi', 'no. resi'],
  ret: ['nomor resi pesanan pengembalian', 'nomor resi pengembalian', 'no resi pengembalian', 'no. resi pengembalian']
};
const cfDt = ts => dayWIB(ts).split('-').reverse().join('/'); // 27/11/2026
const cfTm = ts => new Date(ts).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); // 15:32
const cfFine = () => !(window.matchMedia && matchMedia('(pointer:coarse)').matches); // true = ada mouse/keyboard (bukan layar sentuh)

/* ---------- pilihan ---------- */
$('#cfEks').innerHTML = '<option value="">Pilih ekspedisi</option>' + CF_EKS.map(e => `<option>${esc(e)}</option>`).join('');
$('#cfMEks').innerHTML = '<option value="">Tidak ditentukan</option>' + CF_EKS.map(e => `<option>${esc(e)}</option>`).join('');
['#cfCmpE', '#cfFE'].forEach(id => $(id).innerHTML = '<option value="">Semua</option>' + CF_EKS.map(e => `<option>${esc(e)}</option>`).join(''));
$('#cfEks').value = store.get('cf_eks', '') || '';
$('#cfKrg').value = store.get('cf_krg', 36);
$('#cfMD').value = dayWIB(Date.now()); // tanggal manifest (bisa diganti, mis. 25 / 26)
caps($('#cfResi'));

/* ---------- data manifest & BigSeller ---------- */
const cfM = () => (cfData && cfData.mf) || [];
const cfB = () => (cfData && cfData.bs) || [];
let cfBsK = null, cfBsM = null;
function cfBsMap() { // resi / resi pengembalian -> {toko, pes, resi, ret}
  const a = cfB(); if (cfBsK === a && cfBsM) return cfBsM;
  const m = new Map();
  a.forEach(s => { const p = s.split('\t'), o = { toko: p[0] || '', pes: p[1] || '', resi: p[2] || '', ret: p[3] || '', d: p[4] || '', e: p[5] || '' }; if (o.resi) m.set(o.resi, o); if (o.ret) m.set(o.ret, o) });
  cfBsK = a; return cfBsM = m;
}
const cfEntry = r => cfBsMap().get(r) || null;
// Toko yang diambil dari kolom B (Toko BigSeller). Baris toko lain dibuang. Pencocokan tidak peduli huruf besar/kecil, spasi, garis bawah.
// Nama dalam kurung (alias BigSeller) dan variasi ejaan yang ada di file ikut didaftarkan.
const BS_TOKO = [
  'Sukses Acc Motorshop', 'Sukses Acc1', 'Sukses Aksesoris Motor', 'Shinesanz Shop', 'Pusat Variasi Motor', 'JFM Motor', // TikTok
  'Sukses Acc Motor', 'Shinesanz_Motor', 'Santix2', 'Shinesanz Motor', 'Fortune Star Shop', 'JFM 2', 'Pusat Variasi Motorsport', 'Gorilla Motor', 'Kaylie Motor', 'Mario Racing', 'Roda Dua Store', 'Roda Dua Stores', // Shopee
  'Shinesanz', 'PVM', 'PVM Speed' // Lazada
];
const cfNorm = t => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9]+/g, '');
const BS_TOKO_SET = new Set(BS_TOKO.map(cfNorm));
const cfTokoOk = t => BS_TOKO_SET.has(cfNorm(t));
const BS_AE_COL = 30, BS_X_COL = 23; // AE = Nomor Resi Pesanan Pengembalian, X = Jasa Kirim
const cfJntReg = v => { const n = cfNorm(v); return n === 'jntreguler' || n === 'jtreguler' };
const BS_DATE_COL = 37; // kolom AL (Waktu Sampai Gudang) = acuan tanggal data BigSeller
const CF_BLN = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };
const cfP2 = n => (n < 10 ? '0' : '') + n;
function cfParseDt(v) { // nilai sel Excel / teks -> 'YYYY-MM-DD' (atau '' bila tidak terbaca)
  if (v == null || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : v.getFullYear() + '-' + cfP2(v.getMonth() + 1) + '-' + cfP2(v.getDate());
  if (typeof v === 'number') { if (v < 20000 || v > 80000) return ''; return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10) }
  const t = String(v).trim().toLowerCase();
  let m = t.match(/(\d{1,2})[\s\-\/]+([a-z]{3,})\.?[\s\-\/,]+(\d{4})/); // 26 Nov 2026 15:36
  if (m && CF_BLN[m[2].slice(0, 3)]) return m[3] + '-' + cfP2(CF_BLN[m[2].slice(0, 3)]) + '-' + cfP2(+m[1]);
  m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + cfP2(+m[2]) + '-' + cfP2(+m[3]);
  m = t.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/); if (m) return m[3] + '-' + cfP2(+m[2]) + '-' + cfP2(+m[1]);
  return '';
}
const cfDay = d => d ? d.split('-').reverse().join('/') : ''; // 2026-11-26 -> 26/11/2026
function cfCount(arr, f) { // "25/11: 120 · 26/11: 80"
  const o = {}; arr.forEach(x => { const d = f(x) || ''; o[d] = (o[d] || 0) + 1 });
  return Object.keys(o).sort().map(d => (d ? cfDay(d).slice(0, 5) : 'tanpa tgl') + ': ' + NF(o[d])).join(' · ');
}
const cfToko = r => (cfEntry(r) || {}).toko || '';
function cfSave(mf, bs) {
  const nd = { id: 'cfdata', mf, bs, upd: Date.now(), adm: me ? me.name : '' };
  if (JSON.stringify(nd).length > 900000) return false; // batas dokumen Firestore 1 MB
  const before = cfData; cfData = nd;
  if (!commit([['settings', 'set', nd]])) { cfData = before; return false }
  return true;
}
function cfParseManifest(t) { // ambil semua nomor resi dari teks (huruf + angka, minimal 8 karakter, wajib ada angka)
  const out = [], seen = new Set();
  (String(t).toUpperCase().match(/[A-Z0-9]{8,32}/g) || []).forEach(x => {
    if (!/\d/.test(x)) return;
    if (/^\d+$/.test(x)) { if (x.length < 10) return; if (x.length <= 13 && /^(08|62)/.test(x)) return } // bukan tanggal / nomor HP
    if (seen.has(x)) return; seen.add(x); out.push(x);
  });
  return out;
}
$('#cfMGo').onclick = () => {
  const toks = cfParseManifest($('#cfMtx').value), d = $('#cfMD').value;
  if (!d) return msg('#cfMMsg', 'Pilih tanggal manifest dulu.');
  if (!toks.length) return msg('#cfMMsg', 'Tidak ada nomor resi yang terbaca dari teks itu.');
  const e = $('#cfMEks').value, mf = cfM().map(x => ({ r: x.r, e: x.e || '', d: x.d || '' })), idx = new Map(mf.map((x, i) => [x.r, i]));
  let add = 0, dup = 0;
  toks.forEach(r => { if (idx.has(r)) { dup++; const x = mf[idx.get(r)]; if (!x.e && e) x.e = e; if (!x.d) x.d = d } else { idx.set(r, mf.length); mf.push({ r, e, d }); add++ } });
  if (!cfSave(mf, cfB())) return msg('#cfMMsg', 'Gagal menyimpan (data terlalu besar atau penyimpanan penuh).');
  $('#cfMtx').value = ''; msg('#cfMMsg', 'Manifest tanggal ' + cfDay(d) + ': ' + NF(toks.length) + ' resi terbaca, ' + NF(add) + ' baru, ' + NF(dup) + ' sudah ada (tanggal lama dipertahankan).', true); renderCf(true);
};
$('#cfMClr').onclick = () => {
  if (!cfM().length) return msg('#cfMMsg', 'Manifest sudah kosong.');
  if (!confirm('Kosongkan SEMUA manifest dari semua tanggal (' + NF(cfM().length) + ' resi)? Data scan tidak ikut terhapus.')) return;
  if (!cfSave([], cfB())) return msg('#cfMMsg', 'Gagal menyimpan.');
  msg('#cfMMsg', 'Semua manifest dikosongkan.', true); renderCf(true);
};
$('#cfMDelD').onclick = () => { // hapus manifest untuk satu tanggal saja
  const d = $('#cfMD').value; if (!d) return msg('#cfMMsg', 'Pilih tanggal manifest yang mau dihapus.');
  const n = cfM().filter(x => x.d === d).length; if (!n) return msg('#cfMMsg', 'Tidak ada manifest untuk tanggal ' + cfDay(d) + '.');
  if (!confirm('Hapus manifest tanggal ' + cfDay(d) + ' (' + NF(n) + ' resi)? Manifest tanggal lain dan data scan tidak ikut terhapus.')) return;
  if (!cfSave(cfM().filter(x => x.d !== d).map(x => ({ r: x.r, e: x.e || '', d: x.d || '' })), cfB())) return msg('#cfMMsg', 'Gagal menyimpan.');
  msg('#cfMMsg', 'Manifest tanggal ' + cfDay(d) + ' dihapus.', true); renderCf(true);
};
async function cfReadBs(files) {
  files = Array.from(files || []); if (!files.length) return;
  if (!window.XLSX) return msg('#cfBMsg', 'Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  msg('#cfBMsg', 'Membaca file...', true);
  const map = new Map(); cfB().forEach(s => { const p = s.split('\t'); map.set(p[3] || p[2] || p[1], s) });
  const eksSel = $('#cfMEks').value; // ekspedisi yang dipilih di kolom manifest menentukan penyaringan baris
  let read = 0, add = 0, upd = 0, nod = 0, skip = 0, skipE = 0; const bad = [], perD = [], skipN = {};
  try {
    for (const fl of files) {
      const wb = XLSX.read(await fl.arrayBuffer(), { type: 'array' }); let found = false;
      wb.SheetNames.forEach(sn => {
        const a = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
        let hi = -1, ix = {};
        for (let i = 0; i < Math.min(a.length, 15) && hi < 0; i++) {
          const h = a[i].map(x => String(x).trim().replace(/\s+/g, ' ').toLowerCase()), f1 = names => h.findIndex(x => names.includes(x));
          const ret = f1(CF_H.ret), res = f1(CF_H.resi);
          if (ret >= 0 || res >= 0) { hi = i; ix = { toko: f1(CF_H.toko), pes: f1(CF_H.pes), resi: res, ret } }
        }
        if (hi < 0) return; found = true;
        for (let i = hi + 1; i < a.length; i++) {
          const r = a[i], g = k => k >= 0 ? r[k] : '';
          const resi = scResi(g(ix.resi)), ret = scResi(g(ix.ret)), toko = String(g(ix.toko) || '').trim(), pes = String(g(ix.pes) || '').trim();
          if (!resi && !ret) continue;
          if (!cfTokoOk(toko)) { skip++; const nm = toko || '(kosong)'; skipN[nm] = (skipN[nm] || 0) + 1; continue } // bukan toko yang diambil
          if (eksSel === 'SPX' && String(r[BS_AE_COL] == null ? '' : r[BS_AE_COL]).trim() !== '') { skipE++; continue } // SPX: hanya yang kolom AE kosong (ID / CM tidak ikut)
          if (eksSel === 'J&T' && !cfJntReg(r[BS_X_COL])) { skipE++; continue } // J&T: hanya yang kolom X = JNT Reguler
          const dt = cfParseDt(r[BS_DATE_COL]); if (!dt) nod++; perD.push({ d: dt });
          read++; const key = ret || resi || pes, s = [toko, pes, resi, ret, dt, eksSel].join('\t');
          if (map.has(key)) { if (map.get(key) !== s) upd++ } else add++;
          map.set(key, s);
        }
      });
      if (!found) bad.push(fl.name);
    }
  } catch (e) { console.error(e); return msg('#cfBMsg', 'File tidak bisa dibaca. Pastikan file Excel dari BigSeller.') }
  const skipTxt = skip ? ' Dilewati ' + NF(skip) + ' baris dari toko lain: ' + Object.keys(skipN).sort((a, b) => skipN[b] - skipN[a]).slice(0, 8).map(k => k + ' (' + skipN[k] + ')').join(', ') + (Object.keys(skipN).length > 8 ? ', dst' : '') + '.' : '';
  const eksTxt = eksSel === 'SPX' ? ' Filter SPX (kolom AE harus kosong): ' + NF(skipE) + ' baris dilewati.' : eksSel === 'J&T' ? ' Filter J&T (kolom X harus JNT Reguler): ' + NF(skipE) + ' baris dilewati.' : '';
  if (!read && (skip || skipE)) return msg('#cfBMsg', 'Tidak ada baris yang lolos penyaringan.' + skipTxt + eksTxt);
  if (!read) return msg('#cfBMsg', 'Kolom "Nomor Resi" / "Nomor Resi Pesanan Pengembalian" tidak ditemukan' + (bad.length ? ' di: ' + bad.join(', ') : '') + '.');
  const keep = Array.from(map.values()).filter(s => cfTokoOk(s.split('\t')[0])), purged = map.size - keep.length; // data lama dari toko lain ikut dibuang
  if (!cfSave(cfM(), keep)) return msg('#cfBMsg', 'Gagal menyimpan (data terlalu besar atau penyimpanan penuh).');
  msg('#cfBMsg', NF(read) + ' baris dibaca: ' + NF(add) + ' baru, ' + NF(upd) + ' diperbarui. Per tanggal (kolom AL): ' + cfCount(perD, o => o.d) + (nod ? ' (' + NF(nod) + ' baris tanpa tanggal di kolom AL)' : '') + '.' + eksTxt + skipTxt + (purged ? ' ' + NF(purged) + ' baris lama dari toko lain dibuang.' : '') + (bad.length ? ' File tanpa kolom resi dilewati: ' + bad.join(', ') + '.' : ''), true);
  renderCf(true);
}
(() => {
  const d = $('#cfBsDrop');
  ['dragenter', 'dragover'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.add('over') }));
  ['dragleave', 'drop'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.remove('over') }));
  d.addEventListener('drop', e => cfReadBs(e.dataTransfer.files));
  $('#cfBsPick').onclick = () => $('#cfBsFile').click();
  $('#cfBsFile').onchange = e => { cfReadBs(e.target.files); e.target.value = '' };
})();
$('#cfBClr').onclick = () => {
  if (!cfB().length) return msg('#cfBMsg', 'Data BigSeller sudah kosong.');
  if (!confirm('Kosongkan data BigSeller (' + NF(cfB().length) + ' baris)?')) return;
  if (!cfSave(cfM(), [])) return msg('#cfBMsg', 'Gagal menyimpan.');
  msg('#cfBMsg', 'Data BigSeller dikosongkan.', true); renderCf(true);
};

/* ---------- perbandingan manifest vs scan ---------- */
function cfMatch() { // scan <-> manifest (semua tanggal). Resi lain pada pesanan yang sama ikut dianggap cocok
  const byKey = new Map(), used = new Set();
  codfail.forEach(s => byKey.set(s.resi, s));
  codfail.forEach(s => { const en = cfEntry(s.resi); if (en) [en.resi, en.ret].forEach(k => { if (k && !byKey.has(k)) byKey.set(k, s) }) });
  cfM().forEach(m => { const s = byKey.get(m.r); if (s) used.add(s) });
  return { byKey, used };
}
function cfBsPending() { // baris BigSeller yang belum discan dan tidak ada di manifest (yang ada di manifest sudah tampil sebagai manifest belum discan)
  const ms = new Set(cfM().map(m => m.r)), ss = new Set(codfail.map(s => s.resi)), seen = new Set(), out = [];
  cfBsMap().forEach(en => {
    if (seen.has(en)) return; seen.add(en);
    if ([en.resi, en.ret].some(k => k && (ms.has(k) || ss.has(k)))) return;
    out.push(en);
  });
  return out;
}
function cfRenderCmp() {
  const el = $('#cfCmp'), d1 = $('#cfCmpD').value, d2 = $('#cfCmpD2').value, fe = $('#cfCmpE').value, mf = cfM(), bs = cfB();
  $('#cfInfoM').innerHTML = 'Manifest tersimpan: <b>' + NF(mf.length) + '</b> resi' + (mf.length ? ' (' + cfCount(mf, x => x.d) + ')' : '') +
    '. Data BigSeller: <b>' + NF(bs.length) + '</b> baris' + (bs.length ? ' (tanggal kolom AL, ' + cfCount(bs, s => s.split('\t')[4]) + ')' : '') + '.';
  if (!mf.length && !codfail.length) { el.innerHTML = '<div class="empty">Belum ada manifest atau data scan.</div>'; return }
  const inR = d => (!d1 && !d2) || (!!d && (!d1 || d >= d1) && (!d2 || d <= d2)); // rentang tanggal manifest
  const { byKey, used } = cfMatch(), pend = [], okr = [];
  mf.forEach(m => {
    const s = byKey.get(m.r), en = cfEntry(m.r) || (s && cfEntry(s.resi)) || null, md = m.d || '';
    if (!inR(md || (en && en.d) || '') || (fe && m.e && m.e !== fe)) return;
    (s ? okr : pend).push({ m, s, en, md });
  });
  cfBsPending().forEach(en => { if (inR(en.d || '') && (!fe || !en.e || en.e === fe)) pend.push({ m: null, s: null, en, md: '' }) }); // data BigSeller yang belum discan & tidak ada di manifest: ikut nyangkut di atas
  const dk = x => x.md || (x.en && x.en.d) || '';
  pend.sort((a, b) => dk(a).localeCompare(dk(b))); // belum discan: tertua di paling atas
  const extra = codfail.filter(s => !used.has(s) && (!fe || s.eks === fe) && !s.dm && inR(s.day || dayWIB(s.ts)));
  const tr = (cls, i, man, md, scn, en, st, del) => `<tr class="${cls}"><td>${i}</td><td>${man ? '<b>' + esc(man) + '</b>' : '-'}</td><td class="nw">${esc(cfDay(md) || '-')}</td><td>${scn ? '<b>' + esc(scn) + '</b>' : '-'}</td><td>${esc((en && en.toko) || '-')}</td><td>${esc((en && en.pes) || '-')}</td><td class="nw">${esc((en && cfDay(en.d)) || '-')}</td><td class="nw">${st}</td><td>${del || ''}</td></tr>`;
  const delB = m => `<button class="btn ghost sm" data-cfmdel="${esc(m)}" title="Hapus dari manifest">×</button>`;
  let i = 0, body = '';
  pend.forEach(x => { if (!x.m) { body += tr('cfwait', ++i, x.en.ret || x.en.resi, '', '', x.en, 'Belum discan <span class="tag">Hanya di BigSeller</span>'); return }
    body += tr('cfwait', ++i, x.m.r, x.md, '', x.en, 'Belum discan' + (x.m.e ? ' <span class="tag">' + esc(x.m.e) + '</span>' : ''), delB(x.m.r)) }); // belum discan: tetap di atas sampai cocok
  extra.forEach(s => { body += tr('cfplain', ++i, '', '', s.resi, cfEntry(s.resi), 'Tidak ada di manifest <span class="tag">' + esc(s.eks || '-') + '</span>', `<button class="btn ghost sm" data-cfxdis="${esc(s.id)}" title="Hilangkan dari daftar ini (data scan tetap ada di grup)">×</button>`) }); // tidak sesuai: tetap masuk grup, juga tetap di atas sampai di-x
  // yang sudah cocok otomatis keluar dari daftar ini dan hanya tampil di grup hasil scan
  el.innerHTML = sumBar([stag('Manifest', NF(pend.filter(x => x.m).length + okr.length)), stag('Cocok', NF(okr.length), 'cfokt'), stag('Belum discan', NF(pend.length)), stag('Scan tidak sesuai', NF(extra.length), extra.length ? 'ed' : '')]) +
    (body ? `<div class="tw"><table style="min-width:900px"><thead><tr><th>No</th><th>Manifest</th><th>Tgl Manifest</th><th>Data Scan</th><th>Nama Toko</th><th>No. Pesanan</th><th>Tgl BigSeller</th><th>Status</th><th></th></tr></thead><tbody>${body}</tbody></table></div>` : (okr.length ? '<div class="empty">Semua data yang discan sudah cocok dan masuk ke grup hasil scan.</div>' : '<div class="empty">Tidak ada data pada filter ini.</div>'));
}
$('#cfCmp').addEventListener('click', e => {
  const xd = e.target.closest('[data-cfxdis]');
  if (xd) { const s = codfail.find(z => z.id === xd.dataset.cfxdis); if (s) { s.dm = 1; commit([['codfail', 'set', s]]); renderCf(true) } return }
  const b = e.target.closest('[data-cfmdel]'); if (!b) return;
  const mf = cfM().filter(x => x.r !== b.dataset.cfmdel).map(x => ({ r: x.r, e: x.e || '', d: x.d || '' }));
  if (cfSave(mf, cfB())) renderCf(true);
});
['#cfCmpD', '#cfCmpD2', '#cfCmpE'].forEach(id => { $(id).addEventListener('input', cfRenderCmp); $(id).addEventListener('change', cfRenderCmp) });

/* ---------- form & scan ---------- */
let cfNew = false; // true = scan berikutnya masuk karung baru
function cfOpenGroup(eks, krg, day) { // karung hari ini (ekspedisi & isi sama) yang belum penuh
  const g = {};
  codfail.forEach(r => { if ((r.day || dayWIB(r.ts)) === day && r.eks === eks && +r.krg === krg && r.kid) { const o = g[r.kid] = g[r.kid] || { kid: r.kid, n: 0, t: 0 }; o.n++; o.t = Math.max(o.t, r.ts) } });
  return Object.values(g).filter(o => o.n < krg).sort((a, b) => b.t - a.t)[0] || null;
}
function cfInfo() {
  const eks = $('#cfEks').value, krg = parseInt($('#cfKrg').value, 10), el = $('#cfInfo');
  if (!eks || !(krg > 0)) { el.textContent = 'Pilih ekspedisi dan isi jumlah isi karung.'; return }
  const o = cfNew ? null : cfOpenGroup(eks, krg, dayWIB(Date.now()));
  el.innerHTML = o ? `Karung aktif: <b>${esc(eks)}</b> · terisi <b>${o.n}/${krg}</b> PCS` : `Scan berikutnya masuk <b>karung baru</b> ${esc(eks)} (0/${krg} PCS)`;
}
$('#cfEks').addEventListener('change', () => { store.set('cf_eks', $('#cfEks').value); cfNew = false; cfInfo() });
$('#cfKrg').addEventListener('input', () => { const v = parseInt($('#cfKrg').value, 10); if (v > 0) store.set('cf_krg', v); cfNew = false; cfInfo() });
$('#cfNewK').onclick = () => { $('#cfNewMdl').hidden = false; $('#cfNewOk').focus() }; // konfirmasi dulu
const cfNewClose = () => { $('#cfNewMdl').hidden = true };
$('#cfNewC').onclick = cfNewClose;
$('#cfNewMdl').addEventListener('mousedown', e => { if (e.target === $('#cfNewMdl')) cfNewClose() });
$('#cfNewOk').onclick = () => { cfNewClose(); cfNew = true; cfInfo(); msg('#cfMsg', 'Scan berikutnya masuk karung baru.', true) };

/* ---------- edit: pindah resi antar karung ---------- */
let cfEdId = null;
function cfEdClose() { $('#cfEdMdl').hidden = true; cfEdId = null }
function cfEdOpen(id) {
  const r = codfail.find(z => z.id === id); if (!r) return;
  const day = r.day || dayWIB(r.ts), gs = cfGroups(codfail).filter(g => g.day === day), cur = gs.find(g => g.rows.includes(r));
  cfEdId = id; $('#cfEResi').textContent = r.resi;
  $('#cfEK').innerHTML = gs.map(g => `<option value="${esc(g.k)}"${cur && g.k === cur.k ? ' selected' : ''}>${esc(g.eks)} · Karung ${g.n} (${NF(g.rows.length)}/${NF(g.krg)} PCS)${cur && g.k === cur.k ? ' - sekarang' : ''}</option>`).join('') + `<option value="__new">+ Karung baru (${esc(r.eks || '-')})</option>`;
  msg('#cfEMsg', ''); $('#cfEdMdl').hidden = false;
}
$('#cfECancel').onclick = cfEdClose;
$('#cfEdMdl').addEventListener('mousedown', e => { if (e.target === $('#cfEdMdl')) cfEdClose() });
$('#cfEOk').onclick = () => {
  const r = codfail.find(z => z.id === cfEdId); if (!r) return cfEdClose();
  const v = $('#cfEK').value, day = r.day || dayWIB(r.ts), gs = cfGroups(codfail).filter(g => g.day === day), cur = gs.find(g => g.rows.includes(r));
  if (cur && v === cur.k) return cfEdClose(); // tidak ada perubahan
  const old = { kid: r.kid, eks: r.eks, krg: r.krg }, changed = [r], oldK = [];
  if (v === '__new') r.kid = 'k' + uid();
  else {
    const g = gs.find(x => x.k === v); if (!g) return msg('#cfEMsg', 'Karung tujuan tidak ditemukan.');
    if (g.krg > 0 && g.rows.length >= g.krg) return msg('#cfEMsg', 'Karung tujuan sudah penuh (' + NF(g.rows.length) + '/' + NF(g.krg) + ' PCS).');
    let kid = g.rows[0].kid;
    if (!kid) { kid = 'k' + uid(); g.rows.forEach(z => { oldK.push([z, z.kid]); z.kid = kid; changed.push(z) }) } // karung data lama diberi ID
    r.kid = kid; r.eks = g.eks; r.krg = g.krg;
  }
  if (!commit(changed.map(z => ['codfail', 'set', z]))) { Object.assign(r, old); oldK.forEach(([z, k]) => z.kid = k); return msg('#cfEMsg', 'Penyimpanan penuh, perubahan tidak tersimpan.') }
  cfEdClose(); cfNew = false; msg('#cfMsg', 'Resi ' + r.resi + ' dipindahkan.', true); renderCf(true);
};
function cfSubmit(raw) {
  const inp = $('#cfResi'), resi = scResi(raw), mm = $('#cfMsg');
  const back = () => { inp.value = ''; if (!cfStream && cfFine()) inp.focus() };
  const fail = t => { msg('#cfMsg', t); mm.classList.add('bad'); snBeep(true); back() };
  if (!resi) return;
  mm.classList.remove('bad');
  if (!me) return fail('Masuk dengan akun terlebih dulu agar hasil scan tercatat atas nama Anda.');
  const eks = $('#cfEks').value, krg = parseInt($('#cfKrg').value, 10);
  if (!eks) return fail('Pilih ekspedisi dulu.');
  if (!(krg > 0)) return fail('Isi jumlah isi karung (angka lebih dari 0).');
  if (codfail.some(x => x.resi === resi)) return fail('Resi ' + resi + ' sudah pernah discan.');
  const ts = Date.now(), day = dayWIB(ts), og = cfNew ? null : cfOpenGroup(eks, krg, day), kid = og ? og.kid : 'k' + uid();
  const rec = { id: 'cf_' + uid(), ts, day, resi, eks, krg, kid, st: 'Baik', ds: '', adm: me.name };
  codfail.push(rec);
  if (!commit([['codfail', 'set', rec]])) { codfail.pop(); return fail('Penyimpanan penuh, data tidak tersimpan.') }
  cfNew = false;
  const n = codfail.filter(x => x.kid === kid).length, inMf = cfM().some(m => m.r === resi) || (() => { const en = cfEntry(resi); return !!en && cfM().some(m => m.r === en.resi || m.r === en.ret) })();
  if (cfM().length && !inMf) { msg('#cfMsg', '⚠ ' + resi + ' tersimpan, tapi TIDAK ADA di manifest.'); mm.classList.add('bad'); snBeep(true) }
  else { msg('#cfMsg', '✓ ' + resi + ' tersimpan · ' + eks + ' ' + n + '/' + krg + ' PCS' + (n >= krg ? ' (karung penuh)' : ''), true); snBeep(false) }
  openState['cfd' + day] = true; back(); renderCf(true);
}
$('#cfResi').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); cfSubmit($('#cfResi').value) } });
$('#cfAdd').onclick = () => cfSubmit($('#cfResi').value);
let cfStream = null, cfTimer = null;
function cfCamStop() {
  clearInterval(cfTimer); cfTimer = null;
  if (cfStream) cfStream.getTracks().forEach(t => t.stop()); cfStream = null;
  const v = $('#cfVid'); if (v) { v.srcObject = null; v.hidden = true }
  $('#cfFr').hidden = true; $('#cfCam').hidden = false; $('#cfStopW').hidden = true;
}
$('#cfCam').onclick = async () => {
  try { snBeepC = snBeepC || new (window.AudioContext || window.webkitAudioContext)(); if (snBeepC.state === 'suspended') snBeepC.resume() } catch (e) { } // izinkan suara (harus dari ketukan)
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices) return msg('#cfMsg', 'Browser ini belum mendukung scan lewat kamera. Ketik No. Resi di kolom atas atau pakai alat scanner.');
  if (cfStream) return;
  try {
    const det = new BarcodeDetector(), v = $('#cfVid'); let busy = false, lastV = '', lastT = 0;
    cfStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', aspectRatio: { ideal: 1 } } }); v.srcObject = cfStream; await v.play();
    v.hidden = false; $('#cfFr').hidden = false; $('#cfCam').hidden = true; $('#cfStopW').hidden = false; $('#cfMsg').classList.remove('bad'); msg('#cfMsg', 'Arahkan kamera ke Barcode / QR.');
    cfTimer = setInterval(async () => {
      if (busy) return; busy = true;
      try { const r = await det.detect(v); if (r.length) { const val = r[0].rawValue, n = Date.now(); if (val !== lastV || n - lastT > 2500) { lastV = val; lastT = n; cfSubmit(val) } } } catch (e) { }
      busy = false;
    }, 250);
  } catch (e) { cfCamStop(); msg('#cfMsg', 'Kamera tidak bisa dibuka. Izinkan akses kamera atau ketik No. Resi.') }
};
$('#cfCamStop').onclick = cfCamStop;

/* ---------- hasil scan (dikelompokkan per tanggal > karung) ---------- */
function cfGroups(list) {
  const g = new Map();
  list.forEach(r => {
    const d = r.day || dayWIB(r.ts), k = r.kid || ('x' + d + '|' + r.eks + '|' + r.krg);
    let o = g.get(k); if (!o) { o = { k, eks: r.eks || '-', krg: +r.krg || 0, day: d, rows: [] }; g.set(k, o) }
    o.rows.push(r);
  });
  const arr = Array.from(g.values()), cnt = {};
  arr.forEach(o => { o.rows.sort((a, b) => a.ts - b.ts); o.t0 = o.rows[0].ts; o.t1 = o.rows[o.rows.length - 1].ts; o.pos = {}; o.rows.forEach((r, i) => o.pos[r.id] = i + 1) });
  arr.sort((a, b) => a.t0 - b.t0).forEach(o => { const c = o.day + '|' + o.eks; cnt[c] = (cnt[c] || 0) + 1; o.n = cnt[c] });
  return arr;
}
let cfLast = [], cfUsedSet = new Set();
function cfFiltered() { // kelompok dengan baris yang lolos filter
  const f = $('#cfFD').value, t = $('#cfTD').value, fe = $('#cfFE').value, toks = $('#cfQ').value.trim().toUpperCase().split(/[\s,;]+/).filter(Boolean), out = [];
  cfGroups(codfail).forEach(g => {
    const rows = g.rows.filter(r => { const d = r.day || dayWIB(r.ts); return (!f || d >= f) && (!t || d <= t) && (!fe || r.eks === fe) && (!toks.length || toks.some(k => r.resi.includes(k))) });
    if (rows.length) out.push(Object.assign({}, g, { all: g.rows.length, full: g.rows, rows }));
  });
  return out;
}
function cfGrpHtml(g) {
  const full = g.krg > 0 && g.all >= g.krg;
  const rows = g.rows.map(r => `<tr${(r.st || 'Baik') !== 'Baik' ? ' class="cfwarn"' : cfUsedSet.has(r) ? ' class="cfok"' : ''}><td>${g.pos[r.id]}</td><td><b>${esc(r.resi)}</b></td><td>${esc(cfToko(r.resi) || '-')}</td>` +
    `<td><select data-cfst="${esc(r.id)}">${CF_ST.map(s => `<option${s === (r.st || 'Baik') ? ' selected' : ''}>${s}</option>`).join('')}</select></td>` +
    `<td><input data-cfds="${esc(r.id)}" value="${esc(r.ds || '')}" placeholder="Deskripsi" autocomplete="off"></td>` +
    `<td class="nw">${g.krg}PCS</td><td class="nw">${cfDt(r.ts)}</td><td class="nw">${cfTm(r.ts)}</td><td class="nw"><button class="btn ghost sm" data-cfedit="${esc(r.id)}">Edit</button> <button class="btn ghost sm" data-cfdel="${esc(r.id)}">Hapus</button></td></tr>`).join('');
  const hasM = cfM().length > 0, cocok = g.full.filter(r => cfUsedSet.has(r)).length, salah = hasM ? g.full.length - cocok : 0, belum = Math.max(0, g.krg - g.all);
  return `<div class="cfgh"><div><b>${esc(g.eks)}</b> - Karung ${g.n} <span class="tag${full ? ' cfokt' : ''}">(Cocok ${NF(cocok)}/${NF(g.krg)})</span> <span class="tag${salah ? ' ed' : ''}">(Tidak Sesuai Manifest ${NF(salah)}/${NF(g.krg)})</span> <span class="tag">(belum di scan ${NF(belum)}/${NF(g.krg)})</span></div>` +
    `<div class="cfbtns"><button class="btn ghost sm" data-cfx="xls" data-k="${esc(g.k)}" type="button">Excel</button><button class="btn ghost sm" data-cfx="pdf" data-k="${esc(g.k)}" type="button">PDF</button></div></div>` +
    `<div class="tw"><table style="min-width:900px"><thead><tr><th>No</th><th>Nomor Resi Pengembalian</th><th>Nama Toko</th><th>Check Status</th><th>Check Deskripsi</th><th>Ket. Karung</th><th>Tgl Check</th><th>Waktu</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function cfBsPendF() { // data BigSeller belum discan, mengikuti filter hasil scan
  const f = $('#cfFD').value, t = $('#cfTD').value, fe = $('#cfFE').value, toks = $('#cfQ').value.trim().toUpperCase().split(/[\s,;]+/).filter(Boolean), today = dayWIB(Date.now());
  return cfBsPending().map(en => ({ en, d: en.d || today })).filter(x => (!f || x.d >= f) && (!t || x.d <= t) && (!fe || !x.en.e || x.en.e === fe) && (!toks.length || toks.some(k => (x.en.resi + ' ' + x.en.ret).toUpperCase().includes(k))));
}
function cfPendHtml(list) {
  const rows = list.map((x, i) => `<tr class="cfwait"><td>${i + 1}</td><td><b>${esc(x.en.ret || x.en.resi)}</b></td><td>${esc(x.en.toko || '-')}</td><td>${esc(x.en.pes || '-')}</td><td class="nw">Belum discan</td></tr>`).join('');
  return `<div class="cfgh"><div><b>Belum discan</b> · dari BigSeller <span class="tag">${NF(list.length)} resi</span></div></div><div class="tw"><table style="min-width:600px"><thead><tr><th>No</th><th>Nomor Resi</th><th>Nama Toko</th><th>No. Pesanan</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function cfRenderGrp() {
  const G = cfFiltered(), el = $('#cfGrp'); cfLast = G; cfUsedSet = cfM().length ? cfMatch().used : new Set();
  const bsP = cfBsPendF();
  if (!G.length && !bsP.length) { el.innerHTML = '<div class="empty">Belum ada hasil scan.</div>'; return }
  const today = dayWIB(Date.now()), filt = ['#cfFD', '#cfTD', '#cfFE', '#cfQ'].some(x => $(x).value), all = [].concat(...G.map(g => g.rows)), days = {};
  G.forEach(g => (days[g.day] = days[g.day] || []).push(g));
  const pd = {}; bsP.forEach(x => { (pd[x.d] = pd[x.d] || []).push(x); days[x.d] = days[x.d] || [] });
  let html = sumBar([stag('Total scan', NF(all.length)), stag('Jumlah karung', NF(G.length))].concat(bsP.length ? [stag('Belum discan (BigSeller)', NF(bsP.length))] : []).concat(cTags(countBy(all, r => r.eks), '')));
  Object.keys(days).sort().reverse().forEach(d => {
    const gs = days[d].sort((a, b) => b.t1 - a.t1), n = gs.reduce((s, g) => s + g.rows.length, 0), k = 'cfd' + d, open = k in openState ? openState[k] : (filt || d === today || !!pd[d]), pn = (pd[d] || []).length;
    html += `<details class="dy" data-k="${k}"${open ? ' open' : ''}><summary>${dayLbl(d)} <span class="tag">${NF(n)} data</span>${pn ? ` <span class="tag">${NF(pn)} belum discan</span>` : ''}</summary>${pn ? cfPendHtml(pd[d]) : ''}${gs.map(cfGrpHtml).join('')}</details>`;
  });
  el.innerHTML = html;
}
function renderCf(force) {
  if (!$('#cf')) return;
  cfRenderCmp(); cfInfo();
  const a = document.activeElement;
  if (force || !(a && $('#cfGrp').contains(a) && /^(INPUT|SELECT)$/.test(a.tagName))) cfRenderGrp(); // jangan ganggu saat sedang mengetik / memilih
}
$('#cfGrp').addEventListener('click', e => {
  const s = e.target.closest('summary'); if (s) { const d = s.parentElement; openState[d.dataset.k] = !d.open; return }
  const x = e.target.closest('[data-cfx]');
  if (x) { const g = cfLast.find(z => z.k === x.dataset.k); if (!g) return; return x.dataset.cfx === 'xls' ? cfXlsx([g], cfName(g, 'xlsx')) : cfPdf([g], cfName(g, 'pdf')) }
  const ed = e.target.closest('[data-cfedit]'); if (ed) return cfEdOpen(ed.dataset.cfedit);
  const b = e.target.closest('[data-cfdel]');
  if (b) {
    const r = codfail.find(z => z.id === b.dataset.cfdel); if (!r) return;
    if (!confirm('Hapus resi ' + r.resi + ' dari daftar COD Gagal?')) return;
    codfail = codfail.filter(z => z !== r); commit([['codfail', 'del', r.id]]); renderCf(true);
  }
});
$('#cfGrp').addEventListener('change', e => {
  const st = e.target.closest('[data-cfst]'), ds = e.target.closest('[data-cfds]'), el = st || ds; if (!el) return;
  const r = codfail.find(z => z.id === (el.dataset.cfst || el.dataset.cfds)); if (!r) return;
  if (st) r.st = st.value; else r.ds = ds.value.trim();
  commit([['codfail', 'set', r]]);
  const tr = el.closest('tr'); if (tr && st) tr.classList.toggle('cfwarn', r.st !== 'Baik');
});
['#cfFD', '#cfTD', '#cfFE', '#cfQ'].forEach(id => { $(id).addEventListener('input', cfRenderGrp); $(id).addEventListener('change', cfRenderGrp) });
$('#cfFReset').onclick = () => { ['#cfFD', '#cfTD', '#cfFE', '#cfQ'].forEach(id => $(id).value = ''); cfRenderGrp() };

/* ---------- export (format tabel: No, Tgl Transaksi, Nomor Resi Pengembalian, ...) ---------- */
const cfRowsOf = g => g.rows.map((r, i) => [i + 1, cfDt(r.ts), r.resi, cfToko(r.resi), r.st || 'Baik', r.ds || '', g.krg + 'PCS', cfDt(r.ts), cfTm(r.ts)]);
const cfDmy = () => { const d = dayWIB(Date.now()).split('-'); return d[2] + d[1] + d[0].slice(2) };
const cfName = (g, ext) => 'COD GAGAL-' + (g ? g.eks.replace(/[^A-Za-z0-9]+/g, '') + '-K' + g.n + '-' : '') + (g ? g.day.slice(8) + g.day.slice(5, 7) + g.day.slice(2, 4) : cfDmy()) + '.' + ext;
function cfSaveBlob(blob, fn) {
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function cfXlsx(groups, fn) {
  if (!groups.length) return alert('Tidak ada data untuk diexport.');
  if (!window.ExcelJS) return alert('Library Excel gagal dimuat. Pastikan terhubung ke internet.');
  try {
    const wb = new ExcelJS.Workbook(), used = new Set(), K = { argb: 'FF000000' };
    const bd = { top: { style: 'thin', color: K }, bottom: { style: 'thin', color: K }, left: { style: 'medium', color: K }, right: { style: 'medium', color: K } };
    const PINK = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    groups.forEach(g => {
      let nm = (g.eks + ' ' + g.day.slice(8) + '-' + g.day.slice(5, 7) + ' K' + g.n).replace(/[\\\/\?\*\[\]:]/g, '').slice(0, 31), i = 1;
      while (used.has(nm.toLowerCase())) nm = nm.slice(0, 27) + ' (' + (++i) + ')';
      used.add(nm.toLowerCase());
      const ws = wb.addWorksheet(nm);
      CF_W.forEach((w, c) => ws.getColumn(c + 1).width = w);
      [CF_COLS].concat(cfRowsOf(g)).forEach((v, ri) => {
        const row = ws.addRow(v); row.height = ri ? 15.75 : 30;
        row.eachCell({ includeEmpty: true }, (c, ci) => {
          c.font = { name: 'Arial', size: 10, color: { argb: ci === 3 ? 'FF9C0006' : 'FF000000' } };
          c.border = bd; c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: !ri };
          if (ci === 3) c.fill = PINK;
        });
      });
    });
    cfSaveBlob(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fn);
  } catch (e) { console.error(e); alert('Export Excel gagal: ' + (e.message || e)) }
}
function cfPdf(groups, fn) {
  if (!groups.length) return alert('Tidak ada data untuk diexport.');
  if (!window.jspdf) return alert('Library PDF gagal dimuat. Pastikan terhubung ke internet.');
  try {
    const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    groups.forEach((g, i) => {
      if (i) doc.addPage();
      doc.setFontSize(9); doc.setTextColor(90); doc.text(g.eks + ' - Karung ' + g.n + ' - ' + cfDt(g.t0) + ' - ' + g.rows.length + '/' + g.krg + ' PCS', 10, 8);
      doc.autoTable({
        startY: 11, margin: { left: 10, right: 10, top: 10, bottom: 10 }, theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.4, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0], halign: 'left', valign: 'middle' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'normal' },
        columnStyles: { 2: { fillColor: [255, 199, 206], textColor: [156, 0, 6] } },
        head: [CF_COLS], body: cfRowsOf(g)
      });
    });
    doc.save(fn);
  } catch (e) { console.error(e); alert('Export PDF gagal: ' + (e.message || e)) }
}
const cfAllG = () => cfFiltered().sort((a, b) => a.t0 - b.t0);
$('#cfXls').onclick = () => cfXlsx(cfAllG(), cfName(null, 'xlsx'));
$('#cfPdf').onclick = () => cfPdf(cfAllG(), cfName(null, 'pdf'));