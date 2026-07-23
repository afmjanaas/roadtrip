/* ================= TODAY — phone-first live dashboard ================= */
import {t,tb} from "../i18n.js";
import {$,esc,fmt,fmtDate,todayISO,openForm,toast} from "../util.js";
import {Q,dayPlanned,placesOfDay,expHome,dayOrdForDate,EXCATS,CATLBL} from "../calc.js";
import {sub,subDoc,fs,user,serverTimestamp} from "../db.js";
import {prayerFor,stopForDay,preparedDaysAgo} from "../offline.js";

export function render(state){
 const tr=state.trip,cur=tr.currency,today=todayISO();
 let ord,mode="live";
 if(today<tr.start){mode="before";ord=1}
 else if(today>tr.end){mode="after";ord=state.days.length}
 else ord=Math.min(Math.floor((new Date(today)-new Date(tr.start))/864e5)+1,state.days.length);
 const d=state.days.find(x=>x.ord===ord)||state.days[0];
 if(!d){$("#view").innerHTML="<section>—</section>";return}
 const planned=dayPlanned(tr,state.places,d);
 const todaysExp=state.expenses.filter(e=>e.date===(mode==="live"?today:d.date));
 const spent=todaysExp.reduce((s,e)=>s+expHome(tr,e),0);
 const acts=placesOfDay(state.places,d.ord).filter(p=>p.on);
 const city=(d.stay||"").replace(/🛏|🏁|HOME —/g,"").trim();
 const jn=state.journal.find(j=>j.dayOrd===d.ord);
 $("#view").innerHTML=`<section style="max-width:760px">
  ${(()=>{const ago=preparedDaysAgo(state.tripId);
    return (ago===null||ago>7)?`<div class="warn" style="margin-top:0">📴 <b>${t("notPrepared")}</b> — <a data-nav="settings" style="cursor:pointer;text-decoration:underline">${t("prepareOffline")}</a></div>`:""})()}
  ${mode==="before"?`<div class="note" style="font-size:15px">🗓 <b>${Math.ceil((new Date(tr.start)-new Date(today))/864e5)}</b> ${t("daysToGo")} — ${fmtDate(tr.start)}. ${t("previewDay1")}</div>`:""}
  ${mode==="after"?`<div class="note">🏁 ${t("tripDone")} <a data-nav="journal" style="cursor:pointer;text-decoration:underline">${t("journal")}</a></div>`:""}
  <div class="sec-h">📆 ${t("day")} ${d.ord} · ${esc(d.dow||"")}</div>
  <div class="sec-sub">${fmtDate(d.date)} — ${esc(d.route||"")}</div><div class="rule"></div>
  <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(105px,1fr))">
   <div class="stat"><div class="v">${d.km||0} km</div><div class="l">${t("driveToday")}</div></div>
   <div class="stat"><div class="v">${fmt(planned,cur)}</div><div class="l">${t("dayBudget")}</div></div>
   <div class="stat"><div class="v" style="color:${spent>planned?"var(--bad)":"var(--ok)"}">${fmt(spent,cur)}</div><div class="l">${t("spentToday")}</div></div>
  </div>
  <div id="twx" style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px"></div>
  <div class="card" style="margin-bottom:14px"><h4>🕐 ${t("plan")}</h4><div class="tl">
   ${[["🌅 "+t("morning"),d.m],["☀ "+t("afternoon"),d.a],["🌆 "+t("evening"),d.e],["🌙 "+t("night"),d.n]]
    .filter(x=>x[1]).map(([h,x])=>`<div class="slot"><div class="st">${h}</div><div class="sx">${esc(x)}</div></div>`).join("")||"—"}
  </div></div>
  ${acts.length?`<div class="card" style="margin-bottom:14px"><h4>🎟 ${t("todayPlaces")}</h4>
   ${acts.map(p=>`<div class="exrow"><span class="cat">📍</span><span class="h"><b>${esc(p.n)}</b><div class="sub2">${esc(p.best||"")}</div></span>
    <b class="money">${p.fam?fmt(Q(tr,p.cur,p.fam),cur):"FREE"}</b>
    ${p.q?`<a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}">🗺</a>`:""}</div>`).join("")}</div>`:""}
  <div class="card" style="margin-bottom:14px"><h4>🏨 ${t("tonight")}</h4>
   ${d.hotel?`<div style="font-family:var(--serif);font-size:17px">${esc(d.hotel)}</div>
   <div style="font-size:13px;color:var(--ink2);margin:4px 0 10px">${d.hV?fmt(Q(tr,d.hCur,d.hV),cur)+" / "+t("night").toLowerCase():""} ${d.hRef?" · 🎫 "+esc(d.hRef):""}</div>
   <a class="gm" style="font-size:13px;padding:8px 14px" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.hotel+" "+city)}&travelmode=driving">🧭 ${t("navigate")}</a>`
   :`<div class="sec-sub">${t("noStay")}</div>`}
   ${d.fuel&&d.fuel.length?`<div class="tip" style="margin-top:10px"><b>${t("fuelStops")}</b>${d.fuel.map(esc).join("<br>")}</div>`:""}</div>
  <div class="card" style="margin-bottom:14px"><h4>⚡ ${t("quickExpense")}</h4>
   <div class="exform">
    <label class="f">${t("amount")}<input class="inp" type="number" id="qAmt" inputmode="decimal" placeholder="0"></label>
    <label class="f">${t("currency")}<select class="inp" id="qCur">${Object.keys(tr.fx||{QAR:1}).map(c=>`<option ${c===cur?"selected":""}>${c}</option>`).join("")}</select></label>
    <label class="f">${t("category")}<select class="inp" id="qCat">${EXCATS.map(c=>`<option value="${c.k}">${c.i} ${t(CATLBL[c.k])}</option>`).join("")}</select></label>
    <button class="tbtn primary" id="qAdd" style="height:36px">＋</button></div>
   ${todaysExp.length?`<div style="margin-top:8px">${todaysExp.slice(-3).map(e=>`<div class="kv"><span class="k">${esc(e.note||t(CATLBL[e.cat]||"catOther"))}</span><span class="v money">${fmt(expHome(tr,e),cur)}</span></div>`).join("")}</div>`:""}</div>
  <div class="card"><h4>📔 ${t("journal")}</h4>
   ${jn?`<div style="font-size:13.5px;white-space:pre-wrap">${esc((jn.text||"").slice(0,200))}${(jn.text||"").length>200?"…":""}</div>`:`<div class="sec-sub">${t("noEntryYet")}</div>`}
   <div style="margin-top:8px"><a class="tbtn" data-nav="journal" style="text-decoration:none;cursor:pointer">${t("writeToday")} →</a></div></div>
  <label class="done-ck" style="display:flex;gap:8px;align-items:center;margin:16px 4px;cursor:pointer">
   <input type="checkbox" id="tDone" ${d.done?"checked":""}> <b>${t("markDone")}</b></label>
 </section>`;
 $("#qAdd").onclick=()=>{
  const amt=parseFloat($("#qAmt").value);if(!amt){toast(t("amount")+"?");return}
  const c=$("#qCur").value,date=mode==="live"?today:d.date;
  fs.addDoc(sub(state.tripId,"expenses"),{date,dayOrd:dayOrdForDate(state.days,date),cat:$("#qCat").value,
   note:"",cur:c,amt,amtHome:+(Q(tr,c,amt)).toFixed(2),by:(user()&&(user().displayName||user().email))||"",ts:serverTimestamp()})
   .then(()=>{toast("✓ "+fmt(Q(tr,c,amt),cur));$("#qAmt").value=""})};
 $("#tDone").onchange=e=>fs.updateDoc(subDoc(state.tripId,"days",d.id),{done:e.target.checked});
 weather(state,d);
}
async function weather(state,d){
 const el=$("#twx");if(!el)return;
 const stop=stopForDay(state.stops,d.ord);if(!stop)return;
 const cached=prayerFor(state.tripId,d.date);
 const prayPill=p=>p?`<span class="pill">🕌 ${p.Fajr} · ${p.Dhuhr} · ${p.Asr} · ${p.Maghrib} · ${p.Isha}</span>`:"";
 if(!navigator.onLine){
  el.innerHTML=`<span class="pill">📍 ${esc(stop.name)}</span>${prayPill(cached)}
   <span class="pill">${cached?"💾 "+t("prayerCached"):"📴 "+t("offline")}</span>`;return}
 try{
  const w=await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${stop.lat}&longitude=${stop.lng}&current=temperature_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)).json();
  let p=null;
  try{const pj=await (await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=${stop.lat}&longitude=${stop.lng}&method=4`)).json();p=pj.data&&pj.data.timings}catch(e){}
  el.innerHTML=`<span class="pill">📍 ${esc(stop.name)}</span>
   ${w.current?`<span class="pill">🌡 <b>${Math.round(w.current.temperature_2m)}°</b> / ${Math.round(w.daily.temperature_2m_max[0])}°-${Math.round(w.daily.temperature_2m_min[0])}°</span>`:""}
   ${prayPill(p||cached)}`}catch(e){
  el.innerHTML=`<span class="pill">📍 ${esc(stop.name)}</span>${prayPill(cached)}`}}
