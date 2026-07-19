/* ================= ACTIVITY LOG (owner only) ================= */
import {t,tb} from "../i18n.js";
import {$,esc,downloadCSV} from "../util.js";
import {activityCol,fs,watch,user} from "../db.js";

let unsub=null,rows=[];
const ICON={login:"🔓",logout:"🔒",create:"➕",update:"✏️",delete:"🗑",bulk:"📦"};
export function render(state){
 const isOwner=state.config&&state.config.owner===(user()&&user().email);
 if(!isOwner){$("#view").innerHTML=`<section><div class="sec-h">${tb("activity")}</div><div class="rule"></div>
  <div class="warn">🔐 ${t("ownerOnly")}</div></section>`;return}
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("activity")}</div>
  <div class="sec-sub">${t("activitySub")}</div><div class="rule"></div>
  <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
   <button class="tbtn" id="actCsv">${t("exportCSV")}</button>
   <span class="pill" id="actCount"></span></div>
  <div id="actList" class="card">⏳ …</div></section>`;
 if(unsub)unsub();
 unsub=watch(fs.query(activityCol(),fs.orderBy("ts","desc"),fs.limit(400)),ss=>{
  rows=ss.docs.map(d=>({id:d.id,...d.data()}));paint(state)},
 );
 $("#actCsv").onclick=()=>{
  const out=[["Time","Email","Name","Action","Where","Details"]];
  rows.forEach(r=>out.push([when(r),r.email,r.name,r.action,pretty(state,r.path),r.summary||""]));
  downloadCSV("activity-log.csv",out)};
}
function when(r){if(!r.ts||!r.ts.toDate)return"…";const d=r.ts.toDate();
 return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})+" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
function pretty(state,p){
 if(!p)return"";
 let s=p.replace(/^trips\/([^/]+)/,(m,id)=>{const tr=state.trip&&state.trip.id===id?state.trip:null;
  return "🧳 "+(tr?tr.name:id.slice(0,6)+"…")});
 return s.replace("/days/"," · day ").replace("/places/"," · place ").replace("/expenses/"," · expense ")
  .replace("/stops/"," · stop ").replace("/lists/"," · list ").replace("/guides/"," · guide ")}
function paint(state){
 const el=$("#actList");if(!el)return;
 $("#actCount").textContent=rows.length+" 📜";
 if(!rows.length){el.innerHTML="—";return}
 let lastDay="";
 el.innerHTML=rows.map(r=>{
  const d=r.ts&&r.ts.toDate?r.ts.toDate():null;
  const day=d?d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):"…";
  const head=day!==lastDay?`<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin:14px 0 4px">${day}</div>`:"";
  lastDay=day;
  return head+`<div class="exrow"><span class="cat">${ICON[r.action]||"•"}</span>
   <span class="h"><b>${esc(r.name||r.email)}</b> <span style="color:var(--ink3)">${t("act_"+r.action)}</span>
    ${r.path?`<span style="color:var(--ink2)">${esc(pretty(state,r.path))}</span>`:""}
    ${r.summary?`<div class="sub2">${esc(r.summary)}</div>`:""}
    <div class="sub2">${esc(r.email)}</div></span>
   <span style="font-size:12px;color:var(--ink3);white-space:nowrap">${d?d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"…"}</span></div>`}).join("")}
