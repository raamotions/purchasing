const $=s=>document.querySelector(s);
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
};
let products=store.get('pp_products',null);
if(!products){products=[
 {id:1,name:'Kaos Polos',variants:[{n:'Biru',c:'#3b82f6'},{n:'Merah',c:'#ef4444'},{n:'Hitam',c:'#1f2937'}]},
 {id:2,name:'Tas Kanvas',variants:[]}
];store.set('pp_products',products)}
let records=store.get('pp_records',[]);
let selVar=null,photo='';

// tabs
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on',s.id===b.dataset.t));
  if(b.dataset.t==='pu')renderTable();
});

// input form
function fillProducts(){
  $('#fProd').innerHTML='<option value="">Pilih produk</option>'+products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  onProd();
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function curProd(){return products.find(p=>p.id==$('#fProd').value)}
function onProd(){
  selVar=null;const p=curProd(),btn=$('#fVar');
  setVarBtn();
  $('#varList').classList.remove('open');
  if(p&&p.variants.length){
    btn.disabled=false;
    $('#varList').innerHTML=p.variants.map((v,i)=>`<span class="sw" data-i="${i}" title="${esc(v.n)}" style="background:${v.c}"></span>`).join('');
  }else{btn.disabled=true;$('#varList').innerHTML='';$('#fVarTxt').textContent=p?'Tidak ada varian':'Pilih warna'}
}
function setVarBtn(){
  const sw=$('#fVar .sw');
  if(selVar){sw.style.cssText=`background:${selVar.c}`;$('#fVarTxt').textContent=''}
  else{sw.style.cssText='background:transparent;border-style:dashed';$('#fVarTxt').textContent='Pilih warna'}
}
$('#fProd').onchange=onProd;
$('#fVar').onclick=()=>$('#varList').classList.toggle('open');
$('#varList').onclick=e=>{
  const i=e.target.dataset.i;if(i===undefined)return;
  selVar=curProd().variants[i];setVarBtn();$('#varList').classList.remove('open');
};
document.addEventListener('click',e=>{if(!e.target.closest('.pop'))$('#varList').classList.remove('open')});

function updStatus(){
  let a=$('#qAda').value,m=$('#qMin').value;const st=$('#st');
  if(a!==''&&m!==''&&+a>+m){$('#qAda').value=a=m}
  if(a===''||m===''){st.className='status';st.textContent='-';return}
  if(+a===+m){st.className='status ok';st.textContent='✓'}
  else{st.className='status bad';st.textContent='✕'}
}
$('#qAda').oninput=$('#qMin').oninput=updStatus;

$('#fFoto').onchange=e=>{
  const f=e.target.files[0];photo='';$('#prev').style.display='none';
  if(!f)return;
  const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{
    const k=Math.min(1,900/Math.max(im.width,im.height));
    const c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    photo=c.toDataURL('image/jpeg',.65);$('#prev').src=photo;$('#prev').style.display='block';
  };im.src=r.result};
  r.readAsDataURL(f);
};

function msg(t,ok){const m=$('#msg');m.textContent=t;m.className='msg'+(ok?' ok':'')}
$('#submit').onclick=()=>{
  const p=curProd();
  if(!p)return msg('Pilih produk terlebih dahulu.');
  if(p.variants.length&&!selVar)return msg('Pilih varian warna.');
  const a=$('#qAda').value,m=$('#qMin').value;
  if(a===''||m===''||+m<1)return msg('Isi quantity ada dan diminta.');
  if(+a>+m)return msg('Barang ada tidak boleh melebihi barang diminta.');
  if(!$('#fSrc').value)return msg('Pilih asal barang.');
  records.unshift({id:Date.now(),ts:Date.now(),prod:p.name,vn:selVar?selVar.n:'',vc:selVar?selVar.c:'',ada:+a,min:+m,src:$('#fSrc').value,photo});
  if(!store.set('pp_records',records)){records.shift();return msg('Penyimpanan penuh. Coba tanpa foto atau hapus data lama.')}
  msg('Tersimpan ke menu Purchase.',true);
  $('#fProd').value='';onProd();$('#qAda').value=$('#qMin').value='';updStatus();
  $('#fSrc').value='';$('#fFoto').value='';photo='';$('#prev').style.display='none';
};

// purchase table
function fmt(t){const d=new Date(t);return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
function ymd(t){const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function renderTable(){
  const cols=[...new Map(records.filter(r=>r.vc).map(r=>[r.vc,r.vn])).entries()];
  const cur=$('#fqVar').value;
  $('#fqVar').innerHTML='<option value="">Semua</option>'+cols.map(([c,n])=>`<option value="${c}">${esc(n)}</option>`).join('');
  $('#fqVar').value=cur;
  const f=$('#dFrom').value,t=$('#dTo').value,q=$('#fqProd').value.toLowerCase(),s=$('#fqSrc').value,st=$('#fqSt').value,v=$('#fqVar').value;
  const rows=records.filter(r=>(!f||ymd(r.ts)>=f)&&(!t||ymd(r.ts)<=t)&&(!q||r.prod.toLowerCase().includes(q))&&(!s||r.src===s)&&(!v||r.vc===v)&&(!st||(st==='ok')===(r.ada===r.min)));
  $('#tb').innerHTML=rows.length?rows.map(r=>`<tr>
<td>${fmt(r.ts)}</td><td>${esc(r.prod)}</td>
<td>${r.vc?`<span class="sw" title="${esc(r.vn)}" style="background:${r.vc}"></span>`:'-'}</td>
<td>${r.ada} / ${r.min} pcs</td>
<td>${r.ada===r.min?'<b style="color:var(--ok);font-size:18px">✓</b>':'<b style="color:var(--bad);font-size:18px">✕</b>'}</td>
<td><span class="tag">${esc(r.src)}</span></td>
<td>${r.photo?`<img class="thumb" src="${r.photo}" data-id="${r.id}" alt="Surat jalan">`:'-'}</td>
<td><button class="btn ghost sm" data-del="${r.id}">Hapus</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty">Belum ada data purchase.</td></tr>';
}
['#dFrom','#dTo','#fqProd','#fqSrc','#fqSt','#fqVar'].forEach(s=>{$(s).oninput=renderTable});
$('#reset').onclick=()=>{['#dFrom','#dTo','#fqProd','#fqSrc','#fqSt','#fqVar'].forEach(s=>$(s).value='');renderTable()};
$('#tb').onclick=e=>{
  if(e.target.dataset.del){if(!confirm('Hapus data ini?'))return;records=records.filter(r=>r.id!=e.target.dataset.del);store.set('pp_records',records);renderTable()}
  if(e.target.classList.contains('thumb')){$('#lb img').src=e.target.src;$('#lb').style.display='flex'}
};
$('#lb').onclick=()=>$('#lb').style.display='none';

// product manager
function addVRow(n='',c='#4a7bd0'){
  const d=document.createElement('div');d.className='vrow';
  d.innerHTML=`<input type="color" value="${c}"><input placeholder="Nama warna (mis. Biru)" value="${esc(n)}"><button class="btn ghost sm" type="button">Hapus</button>`;
  d.querySelector('button').onclick=()=>d.remove();$('#vBox').appendChild(d);
}
$('#addV').onclick=()=>addVRow();
$('#saveP').onclick=()=>{
  const name=$('#pName').value.trim(),m=$('#pMsg');m.className='msg';
  if(!name){m.textContent='Isi nama produk.';return}
  const variants=[...document.querySelectorAll('.vrow')].map(r=>({c:r.querySelector('input[type=color]').value,n:r.querySelector('input:not([type=color])').value.trim()||r.querySelector('input[type=color]').value}));
  products.push({id:Date.now(),name,variants});store.set('pp_products',products);
  $('#pName').value='';$('#vBox').innerHTML='';m.textContent='Produk tersimpan.';m.className='msg ok';
  fillProducts();renderProducts();
};
function renderProducts(){
  $('#pList').innerHTML='<label>Daftar Produk</label>'+(products.length?products.map(p=>`<div class="pl"><div><b>${esc(p.name)}</b><div style="margin-top:6px">${p.variants.length?p.variants.map(v=>`<span class="sw" title="${esc(v.n)}" style="background:${v.c}"></span>`).join(''):'<span style="color:var(--mute);font-size:13px">Tanpa varian</span>'}</div></div><button class="btn ghost sm" data-p="${p.id}">Hapus</button></div>`).join(''):'<div class="empty">Belum ada produk.</div>');
}
$('#pList').onclick=e=>{
  const id=e.target.dataset.p;if(!id||!confirm('Hapus produk ini? Data purchase lama tetap tersimpan.'))return;
  products=products.filter(p=>p.id!=id);store.set('pp_products',products);fillProducts();renderProducts();
};

fillProducts();renderProducts();