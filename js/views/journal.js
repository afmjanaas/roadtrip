/* ================= JOURNAL — collapsible days, multi-photo, auto GPS pins ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmtDate,todayISO,openForm,pickImage,pickImages,keepScroll,toast,voiceOverlay} from "../util.js";
import {sub,subDoc,fs,user} from "../db.js";
import * as G from "../gemini.js";
import * as TK from "../tracker.js";

const clock=ts=>{if(!ts)return"";const d=new Date(ts);return d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})};
const entryTs=e=>e.ts||Date.parse(e.date+"T12:00:00")||0;
/* pin kinds shown on the Journey Log map */
const KINDS=[["sight","📍"],["eat","🍽"],["stay","🛏"],["fuel","⛽"],["photo","📷"],["start","🏳"],["finish","🏁"]];
const KI=Object.fromEntries(KINDS);

/* which days are open (persisted per trip) */
const OKEY=id=>"ftp_jopen_"+id;
function openSet(id){try{return JSON.parse(localStorage.getItem(OKEY(id))||"null")}catch(e){return null}}
function setOpen(id,o){localStorage.setItem(OKEY(id),JSON.stringify(o))}

export function render(state){
 const id=state.tripId;
 const byDay={};(state.journal||[]).forEach(e=>{(byDay[e.dayOrd]=byDay[e.dayOrd]||[]).push(e)});
 Object.values(byDay).forEach(a=>a.sort((x,y)=>entryTs(x)-entryTs(y)));
 const days=(state.days||[]).slice().sort((a,b)=>a.ord-b.ord);
 // default: today's day open, others collapsed
 let open=openSet(id);
 if(!open){const td=days.find(d=>d.date===todayISO());open={};if(td)open[td.ord]=1;else if(days.length)open[days[days.length-1].ord]=1;setOpen(id,open)}
 const total=(state.journal||[]).length;

 $("#view").innerHTML=`<section style="max-width:860px">
  <div class="sec-h">📔 ${tb("journal")}</div>
  <div class="sec-sub">${t("journalSub2")}</div><div class="rule"></div>
  <div class="jtools">
   <span class="pill">${total} ${t("entries")}</span>
   <button class="tbtn ghost2" id="jExpandAll">⬇ ${t("expandAll")}</button>
   <button class="tbtn ghost2" id="jCollapseAll">⬆ ${t("collapseAll")}</button></div>
  ${days.map(d=>{const es=byDay[d.ord]||[];const isOpen=!!open[d.ord];
   const nPhotos=es.reduce((s,e)=>s+((e.photos||[]).length),0);
   return `<div class="jday ${isOpen?"open":""}" data-jd="${d.ord}">
    <div class="jday-h" data-jtoggle="${d.ord}">
     <span class="jday-n">${d.ord}</span>
     <span class="jday-t"><b>${fmtDate(d.date)}</b>
      <span class="jday-sub">${esc((d.stay||"").replace(/🛏|🏁/g,"").trim()||d.route||"")}</span></span>
     <span class="jday-c">${es.length?`<span class="chip">${es.length}${nPhotos?" · 📷"+nPhotos:""}</span>`:""}<span class="jcar">▾</span></span>
    </div>
    <div class="jday-b">
     <div class="jaddrow">
      <button class="tbtn" data-jvoice="${d.ord}">🎤 ${t("voiceEntry")}</button>
      <button class="tbtn ghost2" data-jnote="${d.ord}">✍ ${t("note")}</button>
      <button class="tbtn ghost2" data-jphoto="${d.ord}">📷 ${t("photos")}</button></div>
     ${es.length?es.map(e=>entryHtml(e)).join(""):`<div class="sec-sub" style="margin:6px 0 0">${t("noEntryYet")}</div>`}
    </div></div>`}).join("")}
 </section>`;
 wire(state);
}
function entryHtml(e){
 const legacy=(e.best?`<div class="tip" style="margin-top:6px"><b>⭐ ${t("bestMoment")}</b>${esc(e.best)}</div>`:"")+
  (e.kids?`<div class="tip" style="margin-top:6px"><b>🧒 ${t("kidsVote")}</b>${esc(e.kids)}</div>`:"");
 const pin=e.pinned?`<span class="jpin" title="${t("pinnedOnMap")}">${KI[e.kind]||"📍"} ${t("onMap")}</span>`:"";
 return `<div class="jentry" data-eid="${e.id}">
  <div class="je-h"><span class="je-time">🕐 ${clock(entryTs(e))||fmtDate(e.date)} ${pin}</span>
   <span class="je-btns"><button class="mini" data-eaddphoto="${e.id}">📷</button><button class="mini" data-eedit="${e.id}">✎</button><button class="mini" data-edel="${e.id}">🗑</button></span></div>
  ${e.text?`<div class="je-text">${esc(e.text)}</div>`:""}
  ${(e.photos||[]).length?`<div class="je-photos">${e.photos.map((p,i)=>`<div class="je-ph"><img src="${p}"><button class="mini danger" data-erm="${e.id}:${i}">✖</button></div>`).join("")}</div>`:""}
  ${legacy}</div>`}

function wire(state){
 const id=state.tripId;
 $("#jExpandAll").onclick=()=>{const o={};(state.days||[]).forEach(d=>o[d.ord]=1);setOpen(id,o);keepScroll(()=>render(state))};
 $("#jCollapseAll").onclick=()=>{setOpen(id,{});keepScroll(()=>render(state))};
 $("#view").onclick=e=>{let el;
  if(el=e.target.closest("[data-jtoggle]")){
   const ord=+el.dataset.jtoggle,o=openSet(id)||{};o[ord]=o[ord]?0:1;setOpen(id,o);
   const box=el.closest(".jday");if(box)box.classList.toggle("open");return}
  if(el=e.target.closest("[data-jvoice]"))return voiceEntry(state,+el.dataset.jvoice);
  if(el=e.target.closest("[data-jnote]"))return noteEntry(state,+el.dataset.jnote);
  if(el=e.target.closest("[data-jphoto]"))return photoEntry(state,+el.dataset.jphoto);
  if(el=e.target.closest("[data-eaddphoto]"))return addPhotos(state,el.dataset.eaddphoto);
  if(el=e.target.closest("[data-eedit]"))return editEntry(state,el.dataset.eedit);
  if(el=e.target.closest("[data-edel]")){if(!confirm(t("deleteEntry")+"?"))return;
   try{TK.deleteWaypointByJournal(el.dataset.edel,id)}catch(_){}
   fs.deleteDoc(subDoc(id,"journal",el.dataset.edel)).then(()=>toast("✓"));return}
  if(el=e.target.closest("[data-erm]")){const [eid,i]=el.dataset.erm.split(":");const en=state.journal.find(x=>x.id===eid);
   if(en){const photos=(en.photos||[]).filter((_,k)=>k!==+i);keepScroll(()=>{});fs.updateDoc(subDoc(id,"journal",eid),{photos})}return}};
}

/* create the entry, then drop a matching pin on the Journey Log */
async function newEntry(state,ord,data,kind){
 const d=(state.days||[]).find(x=>x.ord===ord)||{};
 const ref=await fs.addDoc(sub(state.tripId,"journal"),{dayOrd:ord,date:d.date||todayISO(),ts:Date.now(),
  by:(user()&&user().displayName)||"",text:"",photos:[],kind:kind||"sight",pinned:false,...data});
 // auto-pin at current location (works even if journey tracking isn't running)
 try{
  const note=((data&&data.text)||"").split("\n")[0].slice(0,60)||t("journalEntry");
  await TK.addWaypoint(kind||"sight",note,{tripId:state.tripId,journalId:ref.id});
  await fs.updateDoc(subDoc(state.tripId,"journal",ref.id),{pinned:true});
  toast("✓ "+t("entryAdded")+" · 📍 "+t("pinnedOnMap"));
 }catch(e){toast("✓ "+t("entryAdded")+" ("+t("noGpsPin")+")")}
 return ref}

const kindField=()=>({k:"kind",l:t("pinType"),type:"select",opts:KINDS.map(k=>k[0])});

async function voiceEntry(state,ord){
 try{const {base64,mime}=await voiceOverlay("⏹ "+t("stopTranscribe"),t("recording"));
  toast("⏳ "+t("transcribing"));
  const out=await G.voiceToJournal(base64,mime,getLang());
  let text=out.text||"";if(out.best)text+=(text?"\n":"")+"⭐ "+out.best;if(out.kids)text+=(text?"\n":"")+"🧒 "+out.kids;
  // let them confirm the text + choose the pin type
  openForm("🎤 "+t("voiceEntry"),[{k:"text",l:t("journalWhat"),type:"textarea"},kindField()],{text,kind:"sight"},
   o=>keepScroll(()=>newEntry(state,ord,{text:o.text},o.kind)));
 }catch(e){if(e.message==="cancelled")return;
  toast("⚠ "+e.message);
  openForm("✍ "+t("note"),[{k:"text",l:t("journalWhat"),type:"textarea"},kindField()],{kind:"sight"},
   o=>{if(o.text)keepScroll(()=>newEntry(state,ord,{text:o.text},o.kind))})}}
function noteEntry(state,ord){
 openForm("✍ "+t("note"),[{k:"text",l:t("journalWhat"),type:"textarea"},kindField()],{kind:"sight"},
  o=>{if(o.text)keepScroll(()=>newEntry(state,ord,{text:o.text},o.kind))})}
function photoEntry(state,ord){
 pickImages(list=>keepScroll(()=>newEntry(state,ord,{photos:list},"photo").then(()=>toast("✓ "+list.length+" 📷"))),1000,.72,10)}
function addPhotos(state,eid){const en=state.journal.find(x=>x.id===eid);if(!en)return;
 const room=Math.max(0,10-((en.photos||[]).length));
 if(!room){toast(t("maxPhotos"));return}
 pickImages(list=>keepScroll(()=>fs.updateDoc(subDoc(state.tripId,"journal",eid),{photos:[...(en.photos||[]),...list]})
   .then(()=>toast("✓ "+list.length+" 📷"))),1000,.72,room)}
function editEntry(state,eid){const en=state.journal.find(x=>x.id===eid);if(!en)return;
 openForm("✎ "+t("journal"),[{k:"text",l:t("journalWhat"),type:"textarea"},kindField()],{...en,kind:en.kind||"sight"},
  o=>keepScroll(()=>fs.updateDoc(subDoc(state.tripId,"journal",eid),{text:o.text,kind:o.kind}).then(()=>toast("✓"))),
  ()=>{try{TK.deleteWaypointByJournal(eid,state.tripId)}catch(_){}
   fs.deleteDoc(subDoc(state.tripId,"journal",eid)).then(()=>toast("✓"))})}
