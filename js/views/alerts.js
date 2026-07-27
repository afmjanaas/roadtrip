/* ================= ALERTS / REMINDERS ================= */
import {t,tb} from "../i18n.js";
import {$,$$,esc,fmtDate,todayISO,openForm,toast} from "../util.js";
import {sub,subDoc,fs} from "../db.js";
import * as notify from "../notify.js";

export function render(state){
 const set=notify.settings(state.tripId);
 const perm=notify.permissionState();
 const rems=(state.reminders||[]).slice().sort((a,b)=>((a.date||"")+(a.time||"")).localeCompare((b.date||"")+(b.time||"")));
 const enabled=set.enabled&&(perm==="granted"||perm==="native");
 $("#view").innerHTML=`<section style="max-width:820px">
  <div class="sec-h">🔔 ${tb("alerts")}</div>
  <div class="sec-sub">${t("alertsSub")}</div><div class="rule"></div>

  <div class="card" style="border:2px solid ${enabled?"var(--ok)":"var(--gold)"}">
   <h4>${enabled?"✅ "+t("notifsOn"):"🔕 "+t("notifsOff")}</h4>
   <div class="sec-sub" style="margin:6px 0 10px">${t("notifsHint")}</div>
   <button class="tbtn primary" id="enableBtn">${enabled?t("reschedule"):t("enableNotifs")}</button>
   <button class="tbtn" id="testBtn">${t("sendTest")}</button>
  </div>

  <div class="card" style="margin-top:14px"><h4>⚙ ${t("autoAlerts")}</h4>
   ${toggle("prayer","🕌 "+t("prayerAlerts"),set.prayer)}
   ${toggle("day","📆 "+t("dayAlerts"),set.day)}
   ${toggle("location","📍 "+t("locationAlerts"),set.location)}
   <div style="font-size:11px;color:var(--ink3);margin-top:6px">${t("locationAlertsNote")}</div>
  </div>

  <div class="card" style="margin-top:14px"><h4>🔔 ${t("customReminders")}
    <button class="tbtn" id="addRem" style="float:right">＋ ${t("addReminder")}</button></h4>
   ${rems.length?rems.map(r=>`<div class="exrow"><span class="cat">${r.lat?"📍":"⏰"}</span>
     <span class="h"><b>${esc(r.title||"")}</b>
      <div class="sub2">${r.date?fmtDate(r.date):""}${r.time?" · "+esc(r.time):""}${r.lat?" · "+t("atPlace"):""}${r.done?" · ✅":""}</div></span>
     <button class="mini" data-remedit="${r.id}">✎</button></div>`).join("")
   :`<div class="sec-sub" style="margin:0">${t("noReminders")}</div>`}
  </div>
 </section>`;

 $("#enableBtn").onclick=async()=>{
  const ok=await notify.requestPermission();
  notify.setSettings(state.tripId,{enabled:ok});
  if(!ok){toast("⚠ "+t("permDenied"));return}
  notify.setState(state);const n=await notify.rescheduleAll(state);
  toast("✅ "+t("scheduled")+" ("+n+")");render(state)};
 $("#testBtn").onclick=async()=>{const ok=await notify.requestPermission();
  if(!ok){toast("⚠ "+t("permDenied"));return}
  notify.notifyNow("🔔 "+t("testTitle"),t("testBody"),"test");toast("✓")};
 $("#view").addEventListener("change",e=>{const tg=e.target.closest("[data-toggle]");if(!tg)return;
  notify.setSettings(state.tripId,{[tg.dataset.toggle]:tg.checked});
  notify.setState(state);notify.rescheduleAll(state)});
 $("#addRem").onclick=()=>remForm(state,null);
 $("#view").addEventListener("click",e=>{const b=e.target.closest("[data-remedit]");if(!b)return;
  remForm(state,state.reminders.find(r=>r.id===b.dataset.remedit))});
}
function toggle(k,label,on){
 return `<label class="ck" style="cursor:pointer;border-bottom:1px dashed var(--line2)">
  <input type="checkbox" data-toggle="${k}" ${on?"checked":""}><span class="tx">${label}</span></label>`}
function remForm(state,r){
 const isNew=!r;r=r||{date:todayISO(),time:"09:00"};
 const stops=(state.stops||[]).slice().sort((a,b)=>a.ord-b.ord);
 openForm(isNew?t("addReminder"):"✎ "+(r.title||""),[
  {k:"title",l:t("name"),full:1},
  {k:"date",l:t("date"),type:"date"},{k:"time",l:t("time"),type:"time"},
  {k:"place",l:t("attachPlace"),type:"select",opts:["",...stops.map(s=>s.name)]},
  {k:"done",l:t("done")+"?",type:"select",opts:["no","yes"]}],
  {...r,place:"",done:r.done?"yes":"no"},
  out=>{const data={title:out.title||"Reminder",date:out.date||"",time:out.time||"",done:out.done==="yes"};
   const stop=stops.find(s=>s.name===out.place);
   if(stop){data.lat=stop.lat;data.lng=stop.lng}else{data.lat=null;data.lng=null}
   const p=isNew?fs.addDoc(sub(state.tripId,"reminders"),data):fs.updateDoc(subDoc(state.tripId,"reminders",r.id),data);
   p.then(()=>{toast("✓");notify.setState(state);notify.rescheduleAll(state)})},
  isNew?null:()=>fs.deleteDoc(subDoc(state.tripId,"reminders",r.id)).then(()=>notify.rescheduleAll(state)))}
