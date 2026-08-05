/* ================= JOURNAL — multiple timestamped entries per day ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmtDate,todayISO,openForm,pickImage,toast,voiceOverlay} from "../util.js";
import {sub,subDoc,fs,user} from "../db.js";
import * as G from "../gemini.js";

const clock=ts=>{if(!ts)return"";const d=new Date(ts);return d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})};
const entryTs=e=>e.ts||Date.parse(e.date+"T12:00:00")||0;

export function render(state){
 const byDay={};(state.journal||[]).forEach(e=>{(byDay[e.dayOrd]=byDay[e.dayOrd]||[]).push(e)});
 Object.values(byDay).forEach(a=>a.sort((x,y)=>entryTs(x)-entryTs(y)));
 const days=(state.days||[]).slice().sort((a,b)=>a.ord-b.ord);
 const total=(state.journal||[]).length;
 $("#view").innerHTML=`<section style="max-width:860px">
  <div class="sec-h">📔 ${tb("journal")}</div>
  <div class="sec-sub">${t("journalSub2")}</div><div class="rule"></div>
  ${days.map(d=>{const es=byDay[d.ord]||[];
   return `<div class="card" style="margin-bottom:14px">
    <h4>${t("day")} ${d.ord} · ${fmtDate(d.date)} <span style="font-weight:400;color:var(--ink3);font-size:13px">${esc((d.stay||"").replace(/🛏|🏁/g,"").trim())}</span>
     <span class="chip" style="float:right">${es.length} ${t("entries")}</span></h4>
    <div class="jaddrow">
     <button class="tbtn" data-jvoice="${d.ord}">🎤 ${t("voiceEntry")}</button>
     <button class="tbtn ghost2" data-jnote="${d.ord}">✍ ${t("note")}</button>
     <button class="tbtn ghost2" data-jphoto="${d.ord}">📷 ${t("photo").replace("📷 ","")}</button></div>
    ${es.length?es.map(e=>entryHtml(e)).join(""):`<div class="sec-sub" style="margin:6px 0 0">${t("noEntryYet")}</div>`}
   </div>`}).join("")}
 </section>`;
 wire(state);
}
function entryHtml(e){
 const legacy=(e.best?`<div class="tip" style="margin-top:6px"><b>⭐ ${t("bestMoment")}</b>${esc(e.best)}</div>`:"")+
  (e.kids?`<div class="tip" style="margin-top:6px"><b>🧒 ${t("kidsVote")}</b>${esc(e.kids)}</div>`:"");
 return `<div class="jentry" data-eid="${e.id}">
  <div class="je-h"><span class="je-time">🕐 ${clock(entryTs(e))||fmtDate(e.date)}</span>
   <span class="je-btns"><button class="mini" data-eaddphoto="${e.id}">📷</button><button class="mini" data-eedit="${e.id}">✎</button><button class="mini" data-edel="${e.id}">🗑</button></span></div>
  ${e.text?`<div class="je-text">${esc(e.text)}</div>`:""}
  ${(e.photos||[]).length?`<div class="je-photos">${e.photos.map((p,i)=>`<div class="je-ph"><img src="${p}"><button class="mini danger" data-erm="${e.id}:${i}">✖</button></div>`).join("")}</div>`:""}
  ${legacy}</div>`}

function wire(state){
 const id=state.tripId;
 $("#view").onclick=e=>{let el;
  if(el=e.target.closest("[data-jvoice]"))return voiceEntry(state,+el.dataset.jvoice);
  if(el=e.target.closest("[data-jnote]"))return noteEntry(state,+el.dataset.jnote);
  if(el=e.target.closest("[data-jphoto]"))return photoEntry(state,+el.dataset.jphoto);
  if(el=e.target.closest("[data-eaddphoto]"))return addPhoto(state,el.dataset.eaddphoto);
  if(el=e.target.closest("[data-eedit]"))return editEntry(state,el.dataset.eedit);
  if(el=e.target.closest("[data-edel]")){if(confirm(t("deleteEntry")+"?"))fs.deleteDoc(subDoc(id,"journal",el.dataset.edel)).then(()=>toast("✓"));return}
  if(el=e.target.closest("[data-erm]")){const [eid,i]=el.dataset.erm.split(":");const en=state.journal.find(x=>x.id===eid);
   if(en){const photos=(en.photos||[]).filter((_,k)=>k!==+i);fs.updateDoc(subDoc(id,"journal",eid),{photos})}return}};
}
function newEntry(state,ord,data){
 const d=(state.days||[]).find(x=>x.ord===ord)||{};
 return fs.addDoc(sub(state.tripId,"journal"),{dayOrd:ord,date:d.date||todayISO(),ts:Date.now(),
  by:(user()&&user().displayName)||"",text:"",photos:[],...data})}
async function voiceEntry(state,ord){
 try{const {base64,mime}=await voiceOverlay("⏹ "+t("stopTranscribe"),t("recording"));
  toast("⏳ "+t("transcribing"));
  const out=await G.voiceToJournal(base64,mime,getLang());
  let text=out.text||"";if(out.best)text+=(text?"\n":"")+"⭐ "+out.best;if(out.kids)text+=(text?"\n":"")+"🧒 "+out.kids;
  await newEntry(state,ord,{text,kind:"voice"});toast("✓ "+t("entryAdded"));
 }catch(e){if(e.message==="cancelled")return;
  // offline / no key / no mic -> let them type instead
  toast("⚠ "+e.message);openForm("✍ "+t("note"),[{k:"text",l:t("journalWhat"),type:"textarea"}],{},o=>{if(o.text)newEntry(state,ord,{text:o.text}).then(()=>toast("✓"))})}}
function noteEntry(state,ord){
 openForm("✍ "+t("note"),[{k:"text",l:t("journalWhat"),type:"textarea"}],{},o=>{if(o.text)newEntry(state,ord,{text:o.text}).then(()=>toast("✓"))})}
function photoEntry(state,ord){pickImage(u=>newEntry(state,ord,{photos:[u]}).then(()=>toast("✓")),1000,.72)}
function addPhoto(state,eid){const en=state.journal.find(x=>x.id===eid);if(!en)return;
 if((en.photos||[]).length>=6){toast(t("maxPhotos"));return}
 pickImage(u=>fs.updateDoc(subDoc(state.tripId,"journal",eid),{photos:[...(en.photos||[]),u]}).then(()=>toast("✓")),1000,.72)}
function editEntry(state,eid){const en=state.journal.find(x=>x.id===eid);if(!en)return;
 openForm("✎ "+t("journal"),[{k:"text",l:t("journalWhat"),type:"textarea"}],en,
  o=>fs.updateDoc(subDoc(state.tripId,"journal",eid),{text:o.text}).then(()=>toast("✓")),
  ()=>fs.deleteDoc(subDoc(state.tripId,"journal",eid)).then(()=>toast("✓")))}
