/* ================= JOURNEY LOG — actual GPS route ================= */
import {t,tb} from "../i18n.js";
import {$,$$,esc,fmtDate,todayISO,toast,openForm} from "../util.js";
import * as TK from "../tracker.js";

const WT=[
 {k:"start",i:"🏳",c:"#0E7A45"},{k:"stay",i:"🛏",c:"#8A1538"},{k:"eat",i:"🍽",c:"#D97B29"},
 {k:"fuel",i:"⛽",c:"#b98a2e"},{k:"photo",i:"📷",c:"#1B5FAA"},{k:"sight",i:"📍",c:"#7a6ea8"},
 {k:"finish",i:"🏁",c:"#b3271e"}];
const WI=Object.fromEntries(WT.map(w=>[w.k,w]));
let LMAP=null, selDate=null, unsub=null;

export function render(state){
 TK.hydrate(state.tripId,state.track,state.waypoints);
 const days=TK.trackDays(state.tripId);
 const wps=TK.waypoints(state.tripId);
 const dates=[...new Set([...Object.keys(days),...wps.map(w=>w.date)])].filter(Boolean).sort();
 if(!selDate||!dates.includes(selDate))selDate=dates[dates.length-1]||todayISO();
 const st=TK.status();
 const active=st.active&&st.trip===state.tripId;

 $("#view").innerHTML=`<section style="max-width:900px">
  <div class="sec-h">🛰 ${tb("journeyLog")}</div>
  <div class="sec-sub">${t("journeyLogSub")}</div><div class="rule"></div>

  <div class="card" style="border:2px solid ${active?"var(--bad)":"var(--line)"};text-align:center">
   <div id="recStatus" style="font-size:13px;color:var(--ink2);margin-bottom:10px"></div>
   <button class="tbtn ${active?"danger":"primary"}" id="recBtn" style="font-size:17px;padding:12px 28px">
     ${active?"⏹ "+t("stopJourney"):"● "+t("startJourney")}</button>
   <div id="wpRow" style="display:${active?"flex":"none"};gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px">
    ${WT.map(w=>`<button class="tbtn wpbtn" data-wp="${w.k}" style="border-color:${w.c}">${w.i} ${t("wp_"+w.k)}</button>`).join("")}
   </div>
   <div style="font-size:11px;color:var(--ink3);margin-top:10px">${active?t("keepOpen"):t("startHint")}</div>
  </div>

  ${dates.length?`
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 10px;align-items:center">
   <b>${t("day")}:</b>
   ${dates.map((d,i)=>`<button class="tbtn ${d===selDate?"on":""}" data-date="${d}">${i+1}. ${fmtDate(d)}</button>`).join("")}
  </div>
  <div id="jmap" style="height:420px;border-radius:14px;border:1px solid var(--line);z-index:1"></div>
  <div id="dayCard"></div>

  <div class="card" style="margin-top:16px"><h4>📊 ${t("wholeTrip")}</h4><div id="totals"></div></div>
  <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
   <button class="tbtn primary" id="printJ">🖨 ${t("printJourney")}</button>
   <button class="tbtn" id="gmapDay">🗺 ${t("openDayGoogle")}</button>
  </div>
  <div id="printArea"></div>
  `:`<div class="note">${t("noTrackYet")}</div>`}
 </section>`;

 $("#recBtn").onclick=async()=>{
  try{
   if(active){await TK.stop();toast("⏹ "+t("stopped"))}
   else{$("#recBtn").disabled=true;await TK.start(state.tripId);toast("● "+t("recording"))}
  }catch(e){toast("⚠ "+e.message)}
  render(state)};
 $("#wpRow").onclick=async e=>{const b=e.target.closest("[data-wp]");if(!b)return;
  try{const w=await TK.addWaypoint(b.dataset.wp,"");
   const note=prompt(t("wpNote"),"");
   if(note!=null&&note!=="")TK.editWaypoint(w.id,{note});
   toast(WI[b.dataset.wp].i+" "+t("pinDropped"));render(state)}
  catch(e){toast("⚠ "+e.message)}};
 $$("[data-date]").forEach(b=>b.onclick=()=>{selDate=b.dataset.date;render(state)});
 const pj=$("#printJ");if(pj)pj.onclick=()=>printJourney(state,dates,days);
 const gd=$("#gmapDay");if(gd)gd.onclick=()=>openDayInGoogle(state,selDate);

 paintStatus(state);
 if(dates.length){buildMap(state);paintDay(state);paintTotals(state,dates);}
 // live refresh while recording
 if(unsub)unsub();
 unsub=TK.onTracker(()=>{paintStatus(state);if(active)quickMapUpdate(state)});
}

function paintStatus(state){
 const el=$("#recStatus");if(!el)return;
 const st=TK.status();
 if(st.active&&st.trip===state.tripId){
  const acc=st.last?" · ±"+st.last.acc+"m":"";
  el.innerHTML=`<span style="color:var(--bad);font-weight:700">● ${t("recording")}</span> — ${st.points} ${t("points")}${acc}
   ${st.wake?" · 🔆 "+t("screenLock"):""} ${st.unsynced?" · ⏳ "+st.unsynced+" "+t("toSync"):" · ✅ "+t("synced")}`;
 }else{
  el.innerHTML=`${st.points?st.points+" "+t("points")+" "+t("recorded"):t("notRecording")}${st.unsynced?" · ⏳ "+st.unsynced+" "+t("toSync"):""}`;
 }}

/* ---------- map ---------- */
function buildMap(state){
 const L=window.L;if(!L){$("#jmap").innerHTML="map n/a";return}
 LMAP=L.map("jmap");
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(LMAP);
 drawDay(state);
}
let dayLayer=null;
function drawDay(state){
 const L=window.L;if(!LMAP)return;
 if(dayLayer)dayLayer.remove();dayLayer=L.layerGroup().addTo(LMAP);
 const pts=TK.pointsForDate(state.tripId,selDate).map(p=>[p[0],p[1]]);
 const wps=TK.waypoints(state.tripId).filter(w=>w.date===selDate);
 let bounds=[];
 if(pts.length){L.polyline(pts,{color:"#c2582a",weight:4,opacity:.85}).addTo(dayLayer);bounds=pts.slice()}
 wps.forEach(w=>{const wi=WI[w.type]||WI.sight;
  L.marker([w.lat,w.lng],{icon:L.divIcon({className:"",html:`<div style="font-size:20px;text-shadow:0 0 3px #fff">${wi.i}</div>`,iconAnchor:[10,10]})})
   .addTo(dayLayer).bindPopup(`<b>${wi.i} ${t("wp_"+w.type)}</b>${w.note?"<br>"+esc(w.note):""}<br>${clock(w.ts)}<br><a target="_blank" href="https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}">Google Maps</a>`);
  bounds.push([w.lat,w.lng])});
 if(bounds.length)LMAP.fitBounds(L.latLngBounds(bounds).pad(0.2));
 else LMAP.setView([24.5,46],5);
}
function quickMapUpdate(state){if(LMAP&&selDate===todayISO())drawDay(state)}

/* ---------- day summary ---------- */
function paintDay(state){
 const el=$("#dayCard");if(!el)return;
 const pts=TK.pointsForDate(state.tripId,selDate);
 const wps=TK.waypoints(state.tripId).filter(w=>w.date===selDate).sort((a,b)=>a.ts-b.ts);
 const km=(TK.dayDistanceM(pts)/1000);
 const first=pts[0],lastp=pts[pts.length-1];
 el.innerHTML=`<div class="card" style="margin-top:14px">
  <h4>${fmtDate(selDate)}</h4>
  <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin:6px 0 12px">
   <div class="stat"><div class="v">${km.toFixed(1)} km</div><div class="l">${t("droveActual")}</div></div>
   <div class="stat"><div class="v">${first?clock(first[2]):"—"}</div><div class="l">${t("firstFix")}</div></div>
   <div class="stat"><div class="v">${lastp?clock(lastp[2]):"—"}</div><div class="l">${t("lastFix")}</div></div>
   <div class="stat"><div class="v">${wps.length}</div><div class="l">${t("pins")}</div></div>
  </div>
  ${wps.length?wps.map(w=>{const wi=WI[w.type]||WI.sight;
   return `<div class="exrow"><span class="cat" style="background:${wi.c}22">${wi.i}</span>
    <span class="h"><b>${t("wp_"+w.type)}</b>${w.note?" — "+esc(w.note):""}
     <div class="sub2">${clock(w.ts)} · ${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}</div></span>
    <a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}">🗺</a>
    <button class="mini" data-wpedit="${w.id}">✎</button></div>`}).join("")
  :`<div class="sec-sub">${t("noPinsDay")}</div>`}
 </div>`;
 el.querySelectorAll("[data-wpedit]").forEach(b=>b.onclick=()=>{
  const w=TK.waypoints(state.tripId).find(x=>x.id===b.dataset.wpedit);
  openForm("✎ "+t("wp_"+w.type),[
   {k:"type",l:t("type"),type:"select",opts:WT.map(x=>x.k)},{k:"note",l:t("note"),full:1}],w,
   out=>{TK.editWaypoint(w.id,out);render(state)},
   ()=>{TK.deleteWaypoint(w.id);render(state)})});
}

/* ---------- totals ---------- */
function paintTotals(state,dates){
 const el=$("#totals");if(!el)return;
 let totKm=0,totPins=0;const stays=[];
 dates.forEach(d=>{totKm+=TK.dayDistanceM(TK.pointsForDate(state.tripId,d))/1000;
  const w=TK.waypoints(state.tripId).filter(x=>x.date===d);totPins+=w.length;
  w.filter(x=>x.type==="stay").forEach(s=>stays.push({d,s}))});
 el.innerHTML=`<div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
   <div class="stat"><div class="v">${dates.length}</div><div class="l">${t("daysTracked")}</div></div>
   <div class="stat"><div class="v">${totKm.toFixed(0)} km</div><div class="l">${t("totalActual")}</div></div>
   <div class="stat"><div class="v">${totPins}</div><div class="l">${t("pins")}</div></div>
   <div class="stat"><div class="v">${stays.length}</div><div class="l">${t("overnights")}</div></div>
  </div>
  ${stays.length?`<div style="margin-top:8px">${stays.map(x=>`<div class="kv"><span class="k">🛏 ${fmtDate(x.d)}</span><span class="v">${esc(x.s.note||(x.s.lat.toFixed(3)+", "+x.s.lng.toFixed(3)))}</span></div>`).join("")}</div>`:""}`;
}

/* ---------- helpers ---------- */
function clock(ts){const d=new Date(ts*1000);return d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
function openDayInGoogle(state,date){
 const wps=TK.waypoints(state.tripId).filter(w=>w.date===date).sort((a,b)=>a.ts-b.ts);
 let anchors=wps.map(w=>[w.lat,w.lng]);
 if(anchors.length<2){const pts=TK.pointsForDate(state.tripId,date);
  if(pts.length){anchors=[pts[0]];const step=Math.max(1,Math.floor(pts.length/8));
   for(let i=step;i<pts.length;i+=step)anchors.push(pts[i]);anchors.push(pts[pts.length-1])}}
 if(!anchors.length){toast(t("noTrackYet"));return}
 const o=anchors[0],dst=anchors[anchors.length-1],way=anchors.slice(1,-1).slice(0,9);
 let url="https://www.google.com/maps/dir/?api=1&origin="+o[0]+","+o[1]+"&destination="+dst[0]+","+dst[1]+"&travelmode=driving";
 if(way.length)url+="&waypoints="+way.map(w=>w[0]+","+w[1]).join("%7C");
 window.open(url,"_blank");}

/* ---------- printable journey ---------- */
function svgRoute(pts,wps,W=680,H=360){
 const all=[...pts.map(p=>[p[0],p[1]]),...wps.map(w=>[w.lat,w.lng])];
 if(!all.length)return `<div style="color:var(--ink3);padding:20px">${t("noTrackYet")}</div>`;
 let minLa=90,maxLa=-90,minLo=180,maxLo=-180;
 all.forEach(([la,lo])=>{minLa=Math.min(minLa,la);maxLa=Math.max(maxLa,la);minLo=Math.min(minLo,lo);maxLo=Math.max(maxLo,lo)});
 const pad=0.12,dLa=(maxLa-minLa)||0.01,dLo=(maxLo-minLo)||0.01;
 minLa-=dLa*pad;maxLa+=dLa*pad;minLo-=dLo*pad;maxLo+=dLo*pad;
 const X=lo=>((lo-minLo)/(maxLo-minLo))*(W-40)+20;
 const Y=la=>H-(((la-minLa)/(maxLa-minLa))*(H-40)+20);
 const path=pts.length?`<path d="${pts.map((p,i)=>(i?"L":"M")+X(p[1]).toFixed(1)+","+Y(p[0]).toFixed(1)).join(" ")}" fill="none" stroke="#c2582a" stroke-width="2.5"/>`:"";
 const marks=wps.map(w=>{const wi=WI[w.type]||WI.sight;const x=X(w.lng),y=Y(w.lat);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${wi.c}" stroke="#fff" stroke-width="1.5"/><text x="${(x+8).toFixed(1)}" y="${(y+4).toFixed(1)}" style="font-size:11px;fill:#222">${wi.i} ${esc((w.note||t("wp_"+w.type)).slice(0,22))}</text>`}).join("");
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;background:#f4efe4;border:1px solid #ddd;border-radius:8px">${path}${marks}</svg>`;
}
function printJourney(state,dates,days){
 const area=$("#printArea");
 let totKm=0;dates.forEach(d=>totKm+=TK.dayDistanceM(TK.pointsForDate(state.tripId,d))/1000);
 const allPts=[],allWps=[];
 dates.forEach(d=>{allPts.push(...TK.pointsForDate(state.tripId,d));
  allWps.push(...TK.waypoints(state.tripId).filter(w=>w.date===d))});
 area.innerHTML=`<div class="printjournal">
  <h2 style="font-family:var(--serif);margin:18px 0 4px">🛰 ${esc(state.trip.name)} — ${t("journeyLog")}</h2>
  <div style="color:var(--ink2);margin-bottom:10px">${t("totalActual")}: <b>${totKm.toFixed(0)} km</b> · ${dates.length} ${t("daysTracked")} · ${allWps.length} ${t("pins")}</div>
  ${svgRoute(allPts,allWps.filter(w=>w.type==="stay"||w.type==="start"||w.type==="finish"),700,380)}
  ${dates.map((d,i)=>{
   const pts=TK.pointsForDate(state.tripId,d);
   const wps=TK.waypoints(state.tripId).filter(w=>w.date===d).sort((a,b)=>a.ts-b.ts);
   const km=TK.dayDistanceM(pts)/1000;
   return `<div style="break-inside:avoid;margin-top:18px;border-top:2px solid var(--gold);padding-top:10px">
    <h3 style="font-family:var(--serif)">${t("day")} ${i+1} — ${fmtDate(d)}</h3>
    <div style="color:var(--ink2);font-size:13px;margin-bottom:6px">${km.toFixed(1)} km ${t("droveActual")}${pts.length?" · "+clock(pts[0][2])+" → "+clock(pts[pts.length-1][2]):""}</div>
    ${svgRoute(pts,wps,680,300)}
    ${wps.length?`<table class="tbl" style="margin-top:8px"><tr><th>${t("time")}</th><th></th><th>${t("note")}</th><th class="right">${t("coords")}</th></tr>
     ${wps.map(w=>`<tr><td>${clock(w.ts)}</td><td>${(WI[w.type]||WI.sight).i} ${t("wp_"+w.type)}</td><td>${esc(w.note||"")}</td><td class="right" style="font-family:monospace;font-size:11px">${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}</td></tr>`).join("")}</table>`:""}
   </div>`}).join("")}
 </div>`;
 setTimeout(()=>window.print(),200);
}
