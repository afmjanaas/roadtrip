/* ================= PUBLIC FAMILY SHARE — read-only "follow our journey" =================
   No login. Renders into #app. Shows where they are now, the live route,
   photos/journal, itinerary and stays. Money, documents and the audit log
   are never included (and are blocked by the security rules anyway). */
import {t,tb,getLang,setLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,todayISO,CCOL} from "../util.js";
import * as TK from "../tracker.js";

let LMAP=null;
export function render(state){
 const tr=state.trip;
 document.documentElement.dataset.lang=getLang();
 if(state.ready&&state.ready.trip&&!tr){
  $("#app").innerHTML=`<div class="gate"><div class="card"><h1>🔒</h1>
   <div class="sub">${t("shareUnavailable")}</div></div></div>`;return}
 if(!tr){$("#app").innerHTML=`<div class="gate"><div class="card"><h1>🧭</h1><div class="sub">…</div></div></div>`;return}

 TK.hydrate(tr.id,state.track,state.waypoints);
 const days=state.days||[],places=state.places||[],journal=(state.journal||[]).slice().sort((a,b)=>(b.dayOrd||0)-(a.dayOrd||0));
 const today=todayISO();
 const km=days.reduce((s,d)=>s+(d.km||0),0);
 // trip stage
 let stage="",live=false,dn=0;
 if(today<tr.start)stage="🗓 "+Math.ceil((new Date(tr.start)-new Date(today))/864e5)+" "+t("daysToGo");
 else if(today>tr.end)stage="🏁 "+t("tripDone");
 else{dn=Math.floor((new Date(today)-new Date(tr.start))/864e5)+1;stage="🚗 "+t("day")+" "+dn+" / "+days.length;live=true}
 // actual driven so far
 const tdays=TK.trackDays(tr.id),wps=TK.waypoints(tr.id);
 let actualKm=0;Object.values(tdays).forEach(pts=>actualKm+=TK.dayDistanceM(pts)/1000);
 // latest known position
 const lastWp=wps.slice().sort((a,b)=>b.ts-a.ts)[0];
 let lastPt=null;Object.values(tdays).forEach(pts=>{const p=pts[pts.length-1];if(p&&(!lastPt||p[2]>lastPt[2]))lastPt=p});
 const dToday=days.find(d=>d.date===today)||(live?days[dn-1]:null);

 $("#app").innerHTML=`<div id="share">
  <div class="shbar">
   <div><b>${esc(tr.name)}</b>${tr.name_ta?`<span class="ta"> · ${esc(tr.name_ta)}</span>`:""}</div>
   <div style="display:flex;gap:8px;align-items:center">
    <button class="tbtn" id="shLang">${getLang()==="ta"?"A·அ":"அ"}</button>
    <button class="tbtn" id="shDark">◐</button></div>
  </div>
  <div class="shhero">
   <div class="kick">${t("followJourney")}</div>
   <h1>${esc(tr.name)}</h1>
   <div class="shsub">📅 ${fmtDate(tr.start)} → ${fmtDate(tr.end)} · ${days.length} ${t("days")} ${tr.vehicle?"· 🚙 "+esc(tr.vehicle):""}</div>
   <div class="shbadges"><span class="badge">${stage}</span>
    ${live?'<span class="badge" style="border-color:#e5484d;color:#ffb3b3">🔴 '+t("liveNow")+'</span>':""}</div>
  </div>

  <div class="shwrap">
   <div class="shstats">
    <div class="stat"><div class="v">${days.length}</div><div class="l">${t("days")}</div></div>
    <div class="stat"><div class="v">${(actualKm||km).toLocaleString(undefined,{maximumFractionDigits:0})} km</div><div class="l">${actualKm?t("droveActual"):t("distance")}</div></div>
    <div class="stat"><div class="v">${journal.reduce((s,j)=>s+((j.photos||[]).length),0)}</div><div class="l">${t("photos").replace("📷 ","")}</div></div>
    <div class="stat"><div class="v">${wps.filter(w=>w.type==="stay").length||Math.max(days.length-1,0)}</div><div class="l">${t("overnights")}</div></div>
   </div>

   ${(lastPt||lastWp)?`<div class="card"><h4>📍 ${t("whereNow")}</h4>
     <div id="shmap" style="height:300px;border-radius:12px;border:1px solid var(--line);margin:8px 0"></div>
     <div style="font-size:13px;color:var(--ink2)">
      ${lastWp?`${wpIcon(lastWp.type)} ${t("wp_"+lastWp.type)}${lastWp.note?" — "+esc(lastWp.note):""} · ${ago(lastWp.ts)}`
       :`${t("lastSeen")} ${ago(lastPt[2])}`}</div></div>`:""}

   ${dToday?`<div class="card"><h4>📆 ${live?t("todayPlan"):t("day")+" "+dToday.ord}</h4>
     <div style="font-family:var(--serif);font-size:16px;margin-bottom:4px">${esc(dToday.route||"")}</div>
     ${[["🌅",dToday.m],["☀",dToday.a],["🌆",dToday.e]].filter(x=>x[1]).map(([i,x])=>`<div style="font-size:13.5px;margin:3px 0"><b>${i}</b> ${esc(x)}</div>`).join("")}
     ${dToday.hotel?`<div style="margin-top:6px;font-size:13px;color:var(--ink2)">🛏 ${esc(dToday.hotel)}</div>`:""}</div>`:""}

   ${journal.length?`<div class="card"><h4>📔 ${t("memories")}</h4>
     ${journal.map(j=>{const d=days.find(x=>x.ord===j.dayOrd);
      return `<div class="shmem">
       <div class="shmem-h">${t("day")} ${j.dayOrd}${d?" · "+fmtDate(d.date):""}</div>
       ${(j.photos||[]).length?`<div class="shphotos">${j.photos.map(p=>`<img src="${p}" alt="">`).join("")}</div>`:""}
       ${j.text?`<div style="font-size:14px;white-space:pre-wrap;margin-top:6px">${esc(j.text)}</div>`:""}
       ${j.best?`<div class="tip" style="margin-top:6px"><b>⭐ ${t("bestMoment")}</b>${esc(j.best)}</div>`:""}
       ${j.kids?`<div class="tip" style="margin-top:6px"><b>🧒 ${t("kidsVote")}</b>${esc(j.kids)}</div>`:""}
      </div>`}).join("")}</div>`:""}

   <div class="card"><h4>🗺 ${t("theRoute")}</h4><div id="shroute" style="height:340px;border-radius:12px;border:1px solid var(--line)"></div></div>

   <div class="card"><h4>📅 ${tb("itinerary")}</h4>
    ${days.map(d=>`<div class="shday ${d.done?"done":""}">
      <span class="shdnum" style="background:${CCOL[d.cc]||tr.color||'#8A1538'}">${d.ord}</span>
      <div style="flex:1"><div style="font-weight:600">${esc(d.route||"")}</div>
       <div style="font-size:12px;color:var(--ink3)">${fmtDate(d.date)}${d.stay?" · 🛏 "+esc((d.stay||"").replace(/🛏|🏁/g,"").trim()):""}${d.done?" · ✅":""}</div></div></div>`).join("")}
   </div>

   <div class="card"><h4>🏨 ${tb("stays")}</h4>
    ${days.filter(d=>d.hotel&&d.hotel.trim()).map(d=>`<div class="kv"><span class="k">${fmtDate(d.date)}</span><span class="v" style="max-width:60%;text-align:right">${esc(d.hotel)}</span></div>`).join("")||"—"}
   </div>

   <div class="shfoot">🧭 ${t("sharedReadOnly")}</div>
  </div>
 </div>`;

 $("#shLang").onclick=()=>{setLang(getLang()==="ta"?"en":"ta");render(state)};
 $("#shDark").onclick=()=>{const h=document.documentElement;h.dataset.theme=h.dataset.theme==="dark"?"light":"dark";localStorage.setItem("ftp_theme",h.dataset.theme);render(state)};
 setTimeout(()=>{drawMini(tr,lastPt,lastWp);drawRoute(state)},60);
}

function wpIcon(k){return{start:"🏳",stay:"🛏",eat:"🍽",fuel:"⛽",photo:"📷",sight:"📍",finish:"🏁"}[k]||"📍"}
function ago(ts){const s=Math.floor(Date.now()/1000-ts);
 if(s<90)return t("justNow");const m=Math.floor(s/60);if(m<90)return m+" "+t("minAgo");
 const h=Math.floor(m/60);if(h<36)return h+" "+t("hrAgo");return Math.floor(h/24)+" "+t("dayAgo")}

function drawMini(tr,lastPt,lastWp){
 const L=window.L,el=$("#shmap");if(!L||!el)return;
 const pos=lastWp?[lastWp.lat,lastWp.lng]:(lastPt?[lastPt[0],lastPt[1]]:null);if(!pos)return;
 const m=L.map("shmap");L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(m);
 L.marker(pos,{icon:L.divIcon({className:"",html:'<div style="font-size:26px;text-shadow:0 0 4px #fff">📍</div>',iconAnchor:[13,13]})}).addTo(m);
 m.setView(pos,9);}
function drawRoute(state){
 const L=window.L,el=$("#shroute");if(!L||!el)return;
 const m=L.map("shroute");L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(m);
 const bounds=[];
 // planned stops
 (state.stops||[]).slice().sort((a,b)=>a.ord-b.ord).forEach((s,i,arr)=>{bounds.push([s.lat,s.lng])});
 const stops=(state.stops||[]).slice().sort((a,b)=>a.ord-b.ord);
 if(stops.length)L.polyline(stops.map(s=>[s.lat,s.lng]),{color:state.trip.color||"#8A1538",weight:3,opacity:.5,dashArray:"6 6"}).addTo(m);
 // actual route (all days)
 const tdays=TK.trackDays(state.trip.id);
 Object.values(tdays).forEach(pts=>{if(pts.length>1){L.polyline(pts.map(p=>[p[0],p[1]]),{color:"#c2582a",weight:4,opacity:.9}).addTo(m);pts.forEach(p=>bounds.push([p[0],p[1]]))}});
 TK.waypoints(state.trip.id).forEach(w=>{L.marker([w.lat,w.lng],{icon:L.divIcon({className:"",html:'<div style="font-size:18px;text-shadow:0 0 3px #fff">'+wpIcon(w.type)+'</div>',iconAnchor:[9,9]})}).addTo(m);bounds.push([w.lat,w.lng])});
 if(bounds.length)m.fitBounds(L.latLngBounds(bounds).pad(0.15));else m.setView([24.5,46],5);
}
