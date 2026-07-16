/* ================= TRIP OVERVIEW / DASHBOARD ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,esc,fmt,fmtDate,todayISO,CCOL,pickImage,toast} from "../util.js";
import {plannedTotal,spentTotal,preTotal} from "../calc.js";
import {tripRef,fs} from "../db.js";

export function render(state){
 const tr=state.trip,days=state.days,places=state.places,exps=state.expenses;
 const cur=tr.currency||"QAR";
 const km=days.reduce((s,d)=>s+(d.km||0),0);
 const planned=plannedTotal(tr,days,places), spent=spentTotal(tr,exps);
 const doneN=days.filter(d=>d.done).length;
 const today=todayISO();
 let stage;
 if(today<tr.start)stage="🗓 "+Math.ceil((new Date(tr.start)-new Date(today))/864e5)+" days to departure";
 else if(today>tr.end)stage="🏁 Trip completed — "+doneN+"/"+days.length+" days logged";
 else stage="🚗 "+t("day")+" "+(Math.floor((new Date(today)-new Date(tr.start))/864e5)+1)+" of "+days.length;
 $("#view").innerHTML=`
 <div id="hero"><div class="kick">${esc((tr.sub||"").toUpperCase()||"FAMILY TRIP")}</div>
  <h2>${esc(tr.name)}</h2>${tr.name_ta?'<div class="ta tam" style="font-size:18px">'+esc(tr.name_ta)+"</div>":""}
  <div class="tag">📅 ${fmtDate(tr.start)} → ${fmtDate(tr.end)} · ${days.length} ${t("days")} ${tr.vehicle?"· 🚙 "+esc(tr.vehicle):""}</div>
  <div class="badges"><span class="badge">${stage}</span><span class="badge">${doneN}/${days.length} ${t("done")}</span></div>
  <div class="eaddrow" style="margin-top:12px"><button class="ebtn" id="covBtn">${t("cover")}</button></div></div>
 <section style="padding-top:18px">
  <div class="stats">
   <div class="stat"><div class="v">${days.length}</div><div class="l">${t("days")}</div></div>
   <div class="stat"><div class="v">${Math.max(days.length-1,0)}</div><div class="l">${t("nights")}</div></div>
   <div class="stat"><div class="v">${km.toLocaleString()} km</div><div class="l">${t("distance")}</div></div>
   <div class="stat"><div class="v">${fmt(planned,cur)}</div><div class="l">${t("planned")}</div></div>
   <div class="stat"><div class="v">${fmt(spent,cur)}</div><div class="l">${t("spent")}</div></div>
   <div class="stat"><div class="v" style="color:${planned-spent>=0?"var(--ok)":"var(--bad)"}">${fmt(planned-spent,cur)}</div><div class="l">${t("remaining")}</div></div>
  </div>
  <div class="ckbar" title="${t("spent")} / ${t("planned")}"><i style="width:${planned?Math.min(spent/planned*100,100):0}%"></i></div>
  <div id="livebar" style="display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 18px"></div>
  <div class="grid g3">
   <div class="card"><h4>📅 ${tb("itinerary")}</h4>
    ${days.slice(0,5).map(d=>`<div class="kv"><span class="k">${t("day")} ${d.ord} · ${esc(d.dow)}</span><span class="v" style="max-width:60%;text-align:right">${esc(d.stay||d.route)}</span></div>`).join("")}
    <div style="margin-top:10px"><a class="tbtn" data-nav="itinerary" style="text-decoration:none">${t("open")} →</a></div></div>
   <div class="card"><h4>🧾 ${tb("expenses")}</h4>
    ${exps.slice(-5).reverse().map(e=>`<div class="kv"><span class="k">${esc(e.date)} · ${esc(e.note||e.cat)}</span><span class="v money">${fmt(e.amtHome,cur)}</span></div>`).join("")||'<div class="sec-sub">'+t("noExpenses")+"</div>"}
    <div style="margin-top:10px"><a class="tbtn" data-nav="expenses" style="text-decoration:none">${t("addExpense")} →</a></div></div>
   <div class="card"><h4>☑ ${tb("checklists")}</h4>
    ${state.lists.map(l=>{const done=l.items.filter(i=>i.done).length;
     return `<div class="kv"><span class="k">${esc(l.title)}</span><span class="v">${done}/${l.items.length}</span></div>`}).join("")||"—"}
    <div style="margin-top:10px"><a class="tbtn" data-nav="checklists" style="text-decoration:none">${t("open")} →</a></div></div>
  </div>
 </section>`;
 $("#covBtn").onclick=()=>pickImage(u=>fs.updateDoc(tripRef(tr.id),{cover:u}).then(()=>toast("✓")),900,.7);
 liveRefresh(state);
}

/* weather + prayer for the current route position */
async function liveRefresh(state){
 const el=$("#livebar");if(!el||!navigator.onLine)return;
 const tr=state.trip,today=todayISO();
 let dn=1;
 if(today>=tr.start&&today<=tr.end)dn=Math.floor((new Date(today)-new Date(tr.start))/864e5)+1;
 else if(today>tr.end)dn=state.days.length;
 const stops=state.stops.filter(s=>s.day<=dn).sort((a,b)=>b.day-a.day);
 const stop=stops[0]||state.stops[0];if(!stop)return;
 try{
  const w=await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${stop.lat}&longitude=${stop.lng}&current=temperature_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)).json();
  let p=null;
  try{const pj=await (await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=${stop.lat}&longitude=${stop.lng}&method=4`)).json();p=pj.data&&pj.data.timings}catch(e){}
  el.innerHTML=`
   <div class="pill">📍 <b>${esc(stop.name)}</b> · ${t("routePos")}</div>
   ${w.current?`<div class="pill">🌡 <b>${Math.round(w.current.temperature_2m)}°C</b> (feels ${Math.round(w.current.apparent_temperature)}°)</div>
   <div class="pill">${t("today")}: ${Math.round(w.daily.temperature_2m_max[0])}° / ${Math.round(w.daily.temperature_2m_min[0])}°</div>`:""}
   ${p?`<div class="pill">🕌 Fajr ${p.Fajr} · Dhuhr ${p.Dhuhr} · Asr ${p.Asr} · Maghrib ${p.Maghrib} · Isha ${p.Isha}</div>`:""}`;
 }catch(e){}}
