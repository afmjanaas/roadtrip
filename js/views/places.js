/* ================= PLACES — filterable list of everywhere ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,stars,dots,openForm,pickImage,toast} from "../util.js";
import {Q} from "../calc.js";
import {PLACE_CATS,effCat,catMeta,autoCat} from "../categories.js";
import {sub,subDoc,fs} from "../db.js";
function voteAvg(p){const v=p.votes||{};const a=Object.values(v).filter(x=>x>0);return a.length?a.reduce((s,x)=>s+x,0)/a.length:0}
function voteCount(p){return Object.values(p.votes||{}).filter(x=>x>0).length}

const CITYICON={"Abu Dhabi":"🕌","Dubai":"🌆","Muscat":"🕌","Nizwa":"🏰","Bahla":"🏰","Ibri":"🏜","Hofuf (Al Ahsa)":"🏜","Riyadh":"🏙","Buraydah":"🐪","Hail":"🏰","AlUla":"🗿","Madinah":"🕌","Taif":"🌹","Al Baha":"🌲","Abha":"⛰","Rijal Almaa":"🏘","Makkah":"🕋","Al Ain":"🌴"};
let FILTER="all";

export function render(state){
 const tr=state.trip,places=state.places||[],days=state.days||[];
 const dayDate=o=>{const d=days.find(x=>x.ord===o);return d?d.date:""};
 const pred=p=>{switch(FILTER){
  case "all":return true;case "want":return !p.visited;case "visited":return !!p.visited;case "gem":return !!p.gem;
  default:return effCat(p)===FILTER}};
 const FILTERS=[["all","🗂",t("fAll")],["want","📍",t("fWant")],["visited","✅",t("fVisited")],["gem","💎",t("fGems")],
  ...PLACE_CATS.map(c=>[c.k,c.i,getLang()==="ta"?c.ta:c.l])];
 const count=f=>{const o=FILTER;FILTER=f;const n=places.filter(pred).length;FILTER=o;return n};
 const list=places.filter(pred).sort((a,b)=>(a.dayOrd||0)-(b.dayOrd||0)||(b.s||0)-(a.s||0));

 $("#view").innerHTML=`<section>
  <div class="sec-h">📌 ${tb("places")}</div>
  <div class="sec-sub">${t("placesSub")}</div><div class="rule"></div>
  <div class="plfilters">${FILTERS.map(([k,i,l])=>`<button class="plchip ${k===FILTER?"on":""}" data-f="${k}">${i} ${l} <span class="plc">${count(k)}</span></button>`).join("")}</div>
  <div class="atts" style="margin-top:14px">${list.map(p=>card(state,p,dayDate(p.dayOrd))).join("")||`<div class="sec-sub">${t("noPlacesFilter")}</div>`}</div>
 </section>`;

 $("#view").querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{FILTER=b.dataset.f;render(state)});
 $("#view").addEventListener("change",e=>{const v=e.target.closest("[data-visit]");if(!v)return;
  fs.updateDoc(subDoc(state.tripId,"places",v.dataset.visit),{visited:v.checked}).then(()=>toast(v.checked?"✅":"↩"))});
 $("#view").addEventListener("click",e=>{
  let el;
  if(el=e.target.closest("[data-pedit]"))return editPlace(state,el.dataset.pedit);
  if(el=e.target.closest("[data-pphoto]"))return pickImage(u=>fs.updateDoc(subDoc(state.tripId,"places",el.dataset.pphoto),{photo:u}).then(()=>toast("✓")),900,.72);
  if(el=e.target.closest("[data-pvote]"))return voteModal(state,el.dataset.pvote);
 });
 loadWiki();
}
function card(state,p,date){
 const cur=state.trip.currency,cost=Q(state.trip,p.cur,p.fam),cm=catMeta(effCat(p)),ta=p.ta||{};
 const img=p.photo||"";
 return `<div class="att ${p.visited?"":""}" style="${p.visited?'border-color:var(--ok)':''}">
  <div class="ph">${img?`<img src="${img}" style="display:block">`:`<div class="fall"><span class="fi">${CITYICON[p.city]||"📍"}</span>${esc(p.city||"")}</div><img data-wiki="${esc(p.wiki||"")}" style="display:none">`}
   <span class="stars">${stars(p.s)}</span>
   <span class="cost" style="background:rgba(0,0,0,.6)">${cm.i} ${getLang()==="ta"?cm.ta:cm.l}</span>
   ${p.gem?`<span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#ffd76e;padding:2px 8px;border-radius:999px;font-size:11px">💎</span>`:""}</div>
  <div class="bd"><div class="nm">${esc(p.n)}${ta.n?`<div class="ta tam">${esc(ta.n)}</div>`:""}</div>
   <div class="why">${esc(p.why||"")}</div>
   <div class="meta"><span>📅 ${date?fmtDate(date):("Day "+p.dayOrd)}</span>${p.city?`<span>📍 ${esc(p.city)}</span>`:""}${cost?`<span>🎟 ${fmt(cost,cur)}</span>`:""}</div></div>
  <div class="ft">
   <label style="flex:1"><input type="checkbox" data-visit="${p.id}" ${p.visited?"checked":""}> ${t("markVisited")}</label>
   ${p.q?`<a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}">🗺</a>`:""}
   <button class="ebtn" data-pvote="${p.id}" style="display:inline-flex">🗳${voteCount(p)?" "+voteAvg(p).toFixed(1)+"★("+voteCount(p)+")":""}</button>
   <button class="ebtn" data-pedit="${p.id}" style="display:inline-flex">✎</button>
   <button class="ebtn" data-pphoto="${p.id}" style="display:inline-flex">📷</button></div></div>`}
function editPlace(state,id){
 const p=state.places.find(x=>x.id===id);if(!p)return;
 openForm("✎ "+p.n,[
  {k:"n",l:t("name"),full:1},
  {k:"tag",l:t("category"),type:"select",opts:["",...PLACE_CATS.map(c=>c.k)]},
  {k:"gem",l:"💎 "+t("fGems")+"?",type:"select",opts:["no","yes"]},
  {k:"visited",l:"✅ "+t("markVisited")+"?",type:"select",opts:["no","yes"]},
  {k:"why",l:t("whyVisit"),type:"textarea"}],
  {...p,tag:p.tag||"",gem:p.gem?"yes":"no",visited:p.visited?"yes":"no"},
  out=>fs.updateDoc(subDoc(state.tripId,"places",id),{n:out.n,tag:out.tag,gem:out.gem==="yes",visited:out.visited==="yes",why:out.why}).then(()=>toast("✓")),
  ()=>fs.deleteDoc(subDoc(state.tripId,"places",id)).then(()=>toast("✓")))}
async function loadWiki(){
 const cache=JSON.parse(localStorage.getItem("ftp_wimg")||"{}");
 const apply=()=>$$("#view img[data-wiki]").forEach(img=>{const u=cache[img.dataset.wiki];
  if(u){img.src=u;img.style.display="block";const f=img.parentElement.querySelector(".fall");if(f)f.style.display="none"}});
 apply();if(!navigator.onLine)return;
 const need=[...new Set($$("#view img[data-wiki]").map(i=>i.dataset.wiki).filter(w=>w&&cache[w]===undefined))].slice(0,40);
 if(!need.length)return;
 await Promise.all(need.map(async w=>{try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(w));
  if(!r.ok){cache[w]=null;return}const j=await r.json();cache[w]=(j.thumbnail&&j.thumbnail.source)?j.thumbnail.source.replace(/\/\d+px-/,"/640px-"):null}catch(e){}}));
 localStorage.setItem("ftp_wimg",JSON.stringify(cache));apply()}

function voteModal(state,pid){
 const pl=state.places.find(x=>x.id===pid);if(!pl)return;
 const trav=(state.travellers||[]).slice().sort((a,b)=>(a.created||0)-(b.created||0));
 if(!trav.length){toast(t("addTravellersFirst"));return}
 const votes={...(pl.votes||{})};
 const ov=document.createElement("div");ov.className="ovl";
 const rows=()=>trav.map(tr=>`<div class="voterow"><span class="votename"><span class="voteav" style="background:${tr.color||'#555'}">${esc((tr.name||'?').slice(0,1))}</span>${esc(tr.name||'')} ${tr.kid?'🧒':''}</span>
   <span class="votestars" data-tv="${tr.id}">${[1,2,3,4,5].map(n=>`<span class="vst ${((votes[tr.id]||0)>=n)?'on':''}" data-n="${n}">★</span>`).join("")}${votes[tr.id]?`<span class="vst clear" data-n="0">✕</span>`:""}</span></div>`).join("");
 ov.innerHTML='<div class="modal"><h3>🗳 '+esc(pl.n)+'</h3><div class="sec-sub">'+t("voteHint")+'</div><div id="voteRows">'+rows()+'</div>'+
  '<div class="btns"><button class="tbtn" data-a="cancel">'+t("cancel")+'</button><button class="tbtn primary" data-a="save">💾 '+t("save")+'</button></div></div>';
 document.body.appendChild(ov);
 ov.addEventListener("click",e=>{
  const st=e.target.closest(".vst");
  if(st){const tid=st.closest("[data-tv]").dataset.tv;votes[tid]=+st.dataset.n;if(!votes[tid])delete votes[tid];
   ov.querySelector("#voteRows").innerHTML=rows();return}
  const a=e.target.dataset&&e.target.dataset.a;
  if(e.target===ov||a==="cancel"){ov.remove();return}
  if(a==="save"){fs.updateDoc(subDoc(state.tripId,"places",pid),{votes}).then(()=>{toast("✓");ov.remove();render(state)})}});
}
