/* ================= TRAVELLERS ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,openForm,pickImage,toast,stars} from "../util.js";
import {sub,subDoc,fs,user} from "../db.js";

const COLORS=["#8A1538","#1B5FAA","#0E7A45","#D97B29","#7a6ea8","#b98a2e","#2a9d8f","#c2582a"];

export function render(state){
 const trav=(state.travellers||[]).slice().sort((a,b)=>(a.created||0)-(b.created||0));
 const places=state.places||[];
 const isOwner=state.config&&state.config.owner===(user()&&user().email);
 // vote summary per traveller
 const voted=id=>places.filter(p=>p.votes&&p.votes[id]);
 const fav=id=>{const v=voted(id).slice().sort((a,b)=>(b.votes[id]||0)-(a.votes[id]||0));return v[0]};
 $("#view").innerHTML=`<section style="max-width:900px">
  <div class="sec-h">👨‍👩‍👧 ${tb("travellers")}</div>
  <div class="sec-sub">${t("travellersSub")}</div><div class="rule"></div>
  <div class="trav-grid">
   ${trav.map(p=>{const vp=voted(p.id),f=fav(p.id);
    return `<div class="trav-card">
     <div class="trav-ph" style="background:${p.color||'#2e3d50'}">${p.photo?`<img src="${p.photo}">`:`<span>${esc((p.name||"?").slice(0,1))}</span>`}
      <button class="ebtn" data-tphoto="${p.id}" style="position:absolute;bottom:6px;right:6px">📷</button></div>
     <div class="trav-bd">
      <div class="trav-nm">${esc(p.name||"—")} ${p.kid?"🧒":""}</div>
      <div class="trav-meta">${[p.role,p.age?p.age+" "+t("yrs"):"",p.nationality].filter(Boolean).map(esc).join(" · ")}</div>
      ${p.notes?`<div class="trav-notes">${esc(p.notes)}</div>`:""}
      <div class="trav-stat">🗳 ${vp.length} ${t("voted")}${f?` · ❤️ ${esc(f.n)}`:""}</div>
      <div class="trav-ft">
       <button class="ebtn" data-tedit="${p.id}" style="display:inline-flex">✎</button>
       ${isOwner?`<button class="ebtn" data-tdocs="${esc(p.name||'')}" style="display:inline-flex">🪪 ${t("documents")}</button>`:""}
      </div></div></div>`}).join("")||`<div class="sec-sub">${t("noTravellers")}</div>`}
  </div>
  <div style="margin-top:16px"><button class="tbtn primary" id="addTrav">＋ ${t("addTraveller")}</button></div>
 </section>`;
 $("#addTrav").onclick=()=>form(state,null);
 $("#view").addEventListener("click",e=>{let el;
  if(el=e.target.closest("[data-tedit]"))return form(state,state.travellers.find(x=>x.id===el.dataset.tedit));
  if(el=e.target.closest("[data-tphoto]"))return pickImage(u=>fs.updateDoc(subDoc(state.tripId,"travellers",el.dataset.tphoto),{photo:u}).then(()=>toast("✓")),700,.8);
  if(el=e.target.closest("[data-tdocs]")){sessionStorage.setItem("ftp_vaultFilter",el.dataset.tdocs);location.hash="#/t/"+state.tripId+"/vault"}});
}
function form(state,p){
 const isNew=!p;const n=(state.travellers||[]).length;
 openForm(isNew?t("addTraveller"):"✎ "+(p.name||""),[
  {k:"name",l:t("name"),full:1},{k:"role",l:t("role")},{k:"age",l:t("age"),type:"number"},
  {k:"kid",l:t("isKid")+"? (yes/no)"},{k:"nationality",l:t("nationality")},
  {k:"color",l:t("colour"),type:"select",opts:COLORS},
  {k:"notes",l:t("note"),type:"textarea"}],
  isNew?{color:COLORS[n%COLORS.length]}:{...p,kid:p.kid?"yes":"no"},
  out=>{const data={name:out.name||"",role:out.role||"",age:out.age||0,kid:out.kid==="yes",
    nationality:out.nationality||"",color:out.color||COLORS[n%COLORS.length],notes:out.notes||""};
   const pr=isNew?fs.addDoc(sub(state.tripId,"travellers"),{...data,created:Date.now()}):fs.updateDoc(subDoc(state.tripId,"travellers",p.id),data);
   pr.then(()=>toast("✓"))},
  isNew?null:()=>fs.deleteDoc(subDoc(state.tripId,"travellers",p.id)).then(()=>toast("✓")))}
