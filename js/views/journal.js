/* ================= JOURNAL — daily memories ================= */
import {t,tb} from "../i18n.js";
import {$,esc,fmtDate,todayISO,openForm,pickImage,toast} from "../util.js";
import {sub,subDoc,fs,user} from "../db.js";

export function render(state){
 const entries=Object.fromEntries(state.journal.map(j=>[j.dayOrd,j]));
 $("#view").innerHTML=`<section style="max-width:860px">
  <div class="sec-h">📔 ${tb("journal")}</div>
  <div class="sec-sub">${t("journalSub")}</div><div class="rule"></div>
  ${state.days.map(d=>{const j=entries[d.ord];
   return `<div class="card" style="margin-bottom:14px">
    <h4>${t("day")} ${d.ord} · ${fmtDate(d.date)} <span style="font-weight:400;color:var(--ink3);font-size:13px">${esc((d.stay||"").replace(/🛏|🏁/g,"").trim())}</span>
     <button class="tbtn" data-jedit="${d.ord}" style="float:right">${j?"✎":"＋ "+t("writeToday")}</button></h4>
    ${j?`
     ${(j.photos||[]).length?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">${j.photos.map((p,i)=>`<div style="position:relative"><img src="${p}" style="height:110px;border-radius:10px;border:1px solid var(--line)" alt=""><button class="ebtn danger" data-jpdel="${d.ord}:${i}" style="position:absolute;top:4px;right:4px">✖</button></div>`).join("")}</div>`:""}
     ${j.text?`<div style="font-size:14px;white-space:pre-wrap;margin:6px 0">${esc(j.text)}</div>`:""}
     ${j.best?`<div class="tip" style="margin-top:8px"><b>⭐ ${t("bestMoment")}</b>${esc(j.best)}</div>`:""}
     ${j.kids?`<div class="tip" style="margin-top:8px"><b>🧒 ${t("kidsVote")}</b>${esc(j.kids)}</div>`:""}
     <div class="eaddrow" style="margin-top:8px"><button class="ebtn" data-jphoto="${d.ord}">📷 ${t("photo").replace("📷 ","")}</button></div>`
    :`<div class="sec-sub" style="margin:0">${t("noEntryYet")}</div>`}
   </div>`}).join("")}
 </section>`;
 $("#view").onclick=e=>{
  let el;
  if(el=e.target.closest("[data-jedit]"))return form(state,+el.dataset.jedit);
  if(el=e.target.closest("[data-jphoto]"))return addPhoto(state,+el.dataset.jphoto);
  if(el=e.target.closest("[data-jpdel]")){const[o,i]=el.dataset.jpdel.split(":");
   const j=state.journal.find(x=>x.dayOrd===+o);if(!j)return;
   const photos=(j.photos||[]).filter((_,k)=>k!==+i);
   fs.updateDoc(subDoc(state.tripId,"journal",j.id),{photos});return}};
}
function form(state,ord){
 const d=state.days.find(x=>x.ord===ord);
 const j=state.journal.find(x=>x.dayOrd===ord)||{};
 openForm("📔 "+t("day")+" "+ord+" — "+fmtDate(d.date),[
  {k:"text",l:t("journalWhat"),type:"textarea"},
  {k:"best",l:"⭐ "+t("bestMoment"),full:1},
  {k:"kids",l:"🧒 "+t("kidsVote"),full:1}],j,
  out=>{const data={...out,dayOrd:ord,date:d.date,by:(user()&&user().displayName)||""};
   const p=j.id?fs.updateDoc(subDoc(state.tripId,"journal",j.id),data)
    :fs.addDoc(sub(state.tripId,"journal"),{...data,photos:[]});
   p.then(()=>toast("✓"))},
  j.id?()=>fs.deleteDoc(subDoc(state.tripId,"journal",j.id)):null)}
function addPhoto(state,ord){
 const j=state.journal.find(x=>x.dayOrd===ord);if(!j)return;
 if((j.photos||[]).length>=3){toast(t("maxPhotos"));return}
 pickImage(u=>fs.updateDoc(subDoc(state.tripId,"journal",j.id),{photos:[...(j.photos||[]),u]})
  .then(()=>toast("✓")),800,.7)}
