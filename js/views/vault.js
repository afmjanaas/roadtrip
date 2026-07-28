/* ================= DOCUMENT VAULT (owner only) — linked to travellers ================= */
import {t,tb} from "../i18n.js";
import {$,$$,esc,openForm,pickImage,toast} from "../util.js";
import {db,fs,watch,user} from "../db.js";

let unsub=null,docs=[],FILTER="all",CUR=null;
const TYPES=["Passport","Visa","RP card","Driving licence","Car registration","Insurance","Booking","Other"];
export function render(state){
 CUR=state;
 const isOwner=state.config&&state.config.owner===(user()&&user().email);
 if(!isOwner){$("#view").innerHTML=`<section><div class="sec-h">🪪 ${tb("vault")}</div><div class="rule"></div>
  <div class="warn">🔐 ${t("vaultOwner")}</div></section>`;return}
 const pre=sessionStorage.getItem("ftp_vaultFilter");if(pre){FILTER=pre;sessionStorage.removeItem("ftp_vaultFilter")}
 $("#view").innerHTML=`<section>
  <div class="sec-h">🪪 ${tb("vault")}</div>
  <div class="sec-sub">${t("vaultSub")}</div><div class="rule"></div>
  <div class="warn" style="margin-top:0">🔐 ${t("vaultNote")}</div>
  <button class="tbtn primary" id="vAdd" style="margin-bottom:12px">＋ ${t("addDoc")}</button>
  <div class="plfilters" id="vFilters"></div>
  <div class="atts" id="vGrid" style="margin-top:14px"></div></section>`;
 if(unsub)unsub();
 unsub=watch(fs.query(fs.collection(db(),"vault"),fs.orderBy("traveler")),ss=>{
  docs=ss.docs.map(d=>({id:d.id,...d.data()}));paint()});
 $("#vAdd").onclick=()=>addDoc(state);
 paint();
}
function travNames(state){return (state.travellers||[]).slice().sort((a,b)=>(a.created||0)-(b.created||0)).map(x=>x.name).filter(Boolean)}
function addDoc(state){
 pickImage(u=>{
  const names=travNames(state);
  openForm(t("addDoc"),[
   {k:"traveler",l:t("traveler"),type:names.length?"select":"text",opts:names.length?["",...names]:undefined,full:1},
   {k:"type",l:t("docType"),type:"select",opts:TYPES},
   {k:"note",l:t("note")+" (number, expiry…)",full:1}],{},
   out=>fs.addDoc(fs.collection(db(),"vault"),{...out,photo:u}).then(()=>toast("✓")))},1280,.8);
}
function paint(){const g=$("#vGrid");if(!g||!CUR)return;
 // filters: All + each traveller (from travellers list ∪ docs)
 const names=[...new Set([...travNames(CUR),...docs.map(d=>d.traveler).filter(Boolean)])];
 const fEl=$("#vFilters");
 if(fEl)fEl.innerHTML=[["all","🗂 "+t("fAll"),docs.length],...names.map(n=>[n,n,docs.filter(d=>d.traveler===n).length])]
  .map(([k,l,c])=>`<button class="plchip ${k===FILTER?"on":""}" data-vf="${esc(k)}">${esc(l)} <span class="plc">${c}</span></button>`).join("");
 const list=docs.filter(d=>FILTER==="all"||d.traveler===FILTER);
 g.innerHTML=list.map(d=>`<div class="att">
  <div class="ph" style="height:160px;cursor:zoom-in" data-vzoom="${d.id}"><img src="${d.photo}" style="display:block" alt=""></div>
  <div class="bd"><div class="nm">${esc(d.traveler||"—")} — ${esc(d.type||"")}</div>${d.note?`<div class="why">${esc(d.note)}</div>`:""}</div>
  <div class="ft"><button class="mini" data-ved="${d.id}">✎</button>
   <a class="gm" download="${esc(d.traveler||"doc")}-${esc(d.type||"")}.jpg" href="${d.photo}">⬇</a></div></div>`).join("")||
  `<div class="sec-sub">${t("noDocs")}</div>`;
 if(fEl)$$("#vFilters [data-vf]").forEach(b=>b.onclick=()=>{FILTER=b.dataset.vf;paint()});
 g.onclick=e=>{
  const z=e.target.closest("[data-vzoom]");
  if(z){const d=docs.find(x=>x.id===z.dataset.vzoom);
   const ov=document.createElement("div");ov.className="ovl";ov.style.alignItems="center";
   ov.innerHTML=`<img src="${d.photo}" style="max-width:96vw;max-height:92vh;border-radius:10px">`;ov.onclick=()=>ov.remove();document.body.appendChild(ov);return}
  const ed=e.target.closest("[data-ved]");
  if(ed){const d=docs.find(x=>x.id===ed.dataset.ved);const names=travNames(CUR);
   openForm("✎ "+(d.traveler||""),[
    {k:"traveler",l:t("traveler"),type:names.length?"select":"text",opts:names.length?["",...names]:undefined,full:1},
    {k:"type",l:t("docType"),type:"select",opts:TYPES},{k:"note",l:t("note"),full:1}],d,
    out=>fs.updateDoc(fs.doc(db(),"vault",d.id),out).then(()=>toast("✓")),
    ()=>fs.deleteDoc(fs.doc(db(),"vault",d.id)).then(()=>toast("✓")))}};
}
