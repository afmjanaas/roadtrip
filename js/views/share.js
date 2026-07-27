/* ================= PUBLIC FAMILY SHARE — read-only "follow our journey" =================
   No login. Shows where they are now, the live route, photos/journal, the FULL
   itinerary with places, a highlights gallery, stays and the trip guides.
   Money (expenses, budget), documents and the audit log are never included. */
import {t,tb,getLang,setLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,todayISO,stars,dots,CCOL} from "../util.js";
import * as TK from "../tracker.js";

const CITYICON={"Abu Dhabi":"🕌","Dubai":"🌆","Muscat":"🕌","Nizwa":"🏰","Bahla":"🏰","Ibri":"🏜","Hofuf (Al Ahsa)":"🏜","Riyadh":"🏙","Buraydah":"🐪","Hail":"🏰","AlUla":"🗿","Madinah":"🕌","Taif":"🌹","Al Baha":"🌲","Abha":"⛰","Rijal Almaa":"🏘","Makkah":"🕋","Al Ain":"🌴"};

export function render(state){
 const tr=state.trip;
 document.documentElement.dataset.lang=getLang();
 if(state.ready&&state.ready.trip&&!tr){
  $("#app").innerHTML=`<div class="gate"><div class="card"><h1>🔒</h1><div class="sub">${t("shareUnavailable")}</div></div></div>`;return}
 if(!tr){$("#app").innerHTML=`<div class="gate"><div class="card"><h1>🧭</h1><div class="sub">…</div></div></div>`;return}

 TK.hydrate(tr.id,state.track,state.waypoints);
 const days=(state.days||[]).slice().sort((a,b)=>a.ord-b.ord);
 const places=state.places||[];
 const journal=(state.journal||[]).slice().sort((a,b)=>(b.dayOrd||0)-(a.dayOrd||0));
 const guides=(state.guides||[]).slice().sort((a,b)=>(a.ord||0)-(b.ord||0));
 const lists=state.lists||[];
 const today=todayISO();
 const km=days.reduce((s,d)=>s+(d.km||0),0);
 let stage="",live=false,dn=0;
 if(today<tr.start)stage="🗓 "+Math.ceil((new Date(tr.start)-new Date(today))/864e5)+" "+t("daysToGo");
 else if(today>tr.end)stage="🏁 "+t("tripDone");
 else{dn=Math.floor((new Date(today)-new Date(tr.start))/864e5)+1;stage="🚗 "+t("day")+" "+dn+" / "+days.length;live=true}
 const tdays=TK.trackDays(tr.id),wps=TK.waypoints(tr.id);
 let actualKm=0;Object.values(tdays).forEach(pts=>actualKm+=TK.dayDistanceM(pts)/1000);
 const lastWp=wps.slice().sort((a,b)=>b.ts-a.ts)[0];
 let lastPt=null;Object.values(tdays).forEach(pts=>{const p=pts[pts.length-1];if(p&&(!lastPt||p[2]>lastPt[2]))lastPt=p});
 const dToday=days.find(d=>d.date===today)||(live?days[dn-1]:null);
 const selPlaces=places.filter(p=>p.on!==false);
 const highlights=selPlaces.filter(p=>(p.s||0)>=5).slice(0,10);
 const photoCount=journal.reduce((s,j)=>s+((j.photos||[]).length),0);

 const placeCard=p=>{const img=p.photo||"";
  return `<div class="shplace">
   <div class="shph">${img?`<img src="${img}" alt="">`:`<img data-wiki="${esc(p.wiki||"")}" data-photo="${esc(p.photo||"")}" alt="" style="display:none">`}
     <div class="fall"${img?' style="display:none"':""}>${CITYICON[p.city]||"📍"}</div>
     ${p.s?`<span class="shstars">${stars(p.s)}</span>`:""}</div>
   <div class="shpb"><div class="shpn">${esc(p.n)}${p.ta&&p.ta.n?`<span class="ta tam"> · ${esc(p.ta.n)}</span>`:""}</div>
    ${p.why?`<div class="shpw">${esc(p.why)}</div>`:""}
    <div class="shpm">${p.t?`<span>⏱ ${esc(p.t)}</span>`:""}${p.best?`<span>🌅 ${esc(p.best)}</span>`:""}
     ${p.q?`<a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}">🗺</a>`:""}</div></div></div>`};

 $("#app").innerHTML=`<div id="share">
  <div class="shbar">
   <div><b>${esc(tr.name)}</b>${tr.name_ta?`<span class="ta"> · ${esc(tr.name_ta)}</span>`:""}</div>
   <div style="display:flex;gap:8px;align-items:center">
    <button class="tbtn" id="shLang">${getLang()==="ta"?"A·அ":"அ"}</button>
    <button class="tbtn" id="shDark">◐</button></div></div>
  <div class="shhero">
   <div class="kick">${t("followJourney")}</div><h1>${esc(tr.name)}</h1>
   <div class="shsub">📅 ${fmtDate(tr.start)} → ${fmtDate(tr.end)} · ${days.length} ${t("days")} ${tr.vehicle?"· 🚙 "+esc(tr.vehicle):""}</div>
   <div class="shbadges"><span class="badge">${stage}</span>${live?'<span class="badge" style="border-color:#e5484d;color:#ffb3b3">🔴 '+t("liveNow")+'</span>':""}</div></div>

  <div class="shwrap">
   <div class="shstats">
    <div class="stat"><div class="v">${days.length}</div><div class="l">${t("days")}</div></div>
    <div class="stat"><div class="v">${(actualKm||km).toLocaleString(undefined,{maximumFractionDigits:0})} km</div><div class="l">${actualKm?t("droveActual"):t("distance")}</div></div>
    <div class="stat"><div class="v">${selPlaces.length}</div><div class="l">${t("placesToSee")}</div></div>
    <div class="stat"><div class="v">${photoCount}</div><div class="l">${t("photos").replace("📷 ","")}</div></div>
   </div>

   ${(lastPt||lastWp)?`<div class="card"><h4>📍 ${t("whereNow")}</h4>
     <div id="shmap" style="height:300px;border-radius:12px;border:1px solid var(--line);margin:8px 0"></div>
     <div style="font-size:13px;color:var(--ink2)">${lastWp?`${wpIcon(lastWp.type)} ${t("wp_"+lastWp.type)}${lastWp.note?" — "+esc(lastWp.note):""} · ${ago(lastWp.ts)}`:`${t("lastSeen")} ${ago(lastPt[2])}`}</div></div>`:""}

   ${dToday?`<div class="card"><h4>📆 ${live?t("todayPlan"):t("day")+" "+dToday.ord}</h4>
     <div style="font-family:var(--serif);font-size:16px;margin-bottom:4px">${esc(dToday.route||"")}</div>
     ${[["🌅",dToday.m],["☀",dToday.a],["🌆",dToday.e]].filter(x=>x[1]).map(([i,x])=>`<div style="font-size:13.5px;margin:3px 0"><b>${i}</b> ${esc(x)}</div>`).join("")}
     ${dToday.hotel?`<div style="margin-top:6px;font-size:13px;color:var(--ink2)">🛏 ${esc(dToday.hotel)}</div>`:""}</div>`:""}

   ${highlights.length?`<div class="card"><h4>⭐ ${t("highlights")}</h4>
     <div class="shgallery">${highlights.map(placeCard).join("")}</div></div>`:""}

   ${journal.length?`<div class="card"><h4>📔 ${t("memories")}</h4>
     ${journal.map(j=>{const d=days.find(x=>x.ord===j.dayOrd);
      return `<div class="shmem"><div class="shmem-h">${t("day")} ${j.dayOrd}${d?" · "+fmtDate(d.date):""}</div>
       ${(j.photos||[]).length?`<div class="shphotos">${j.photos.map(p=>`<img src="${p}" alt="">`).join("")}</div>`:""}
       ${j.text?`<div style="font-size:14px;white-space:pre-wrap;margin-top:6px">${esc(j.text)}</div>`:""}
       ${j.best?`<div class="tip" style="margin-top:6px"><b>⭐ ${t("bestMoment")}</b>${esc(j.best)}</div>`:""}
       ${j.kids?`<div class="tip" style="margin-top:6px"><b>🧒 ${t("kidsVote")}</b>${esc(j.kids)}</div>`:""}</div>`}).join("")}</div>`:""}

   <div class="card"><h4>🗺 ${t("theRoute")}</h4><div id="shroute" style="height:340px;border-radius:12px;border:1px solid var(--line)"></div></div>

   <div class="card"><h4>📅 ${tb("itinerary")}</h4>
    ${days.map(d=>{const dp=places.filter(p=>p.dayOrd===d.ord);
     return `<details class="shday-d" ${d.ord===(dToday?dToday.ord:1)?"open":""}>
      <summary><span class="shdnum" style="background:${CCOL[d.cc]||tr.color||'#8A1538'}">${d.ord}</span>
       <span style="flex:1"><b>${esc(d.route||"")}</b>
        <span class="shdmeta">${fmtDate(d.date)}${d.km?" · "+d.km+" km":""}${d.stay?" · 🛏 "+esc((d.stay||"").replace(/🛏|🏁/g,"").trim()):""}${d.done?" · ✅":""}</span></span></summary>
      <div class="shday-body">
       ${[["🌅 "+t("morning"),d.m],["☀ "+t("afternoon"),d.a],["🌆 "+t("evening"),d.e],["🌙 "+t("night"),d.n]].filter(x=>x[1]).map(([h,x])=>`<div class="shslot"><b>${h}</b> ${esc(x)}</div>`).join("")}
       ${d.hotel?`<div class="shslot"><b>🏨 ${t("tonight")}</b> ${esc(d.hotel)}</div>`:""}
       ${dp.length?`<div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink3);margin:10px 0 4px">${t("placesThisDay")}</div>
        <div class="shgallery">${dp.map(placeCard).join("")}</div>`:""}
      </div></details>`}).join("")}
   </div>

   <div class="card"><h4>🏨 ${tb("stays")}</h4>
    ${days.filter(d=>d.hotel&&d.hotel.trim()).map(d=>`<div class="kv"><span class="k">${fmtDate(d.date)}</span><span class="v" style="max-width:60%;text-align:right">${esc(d.hotel)}</span></div>`).join("")||"—"}</div>

   ${lists.length?`<div class="card"><h4>☑ ${tb("checklists")}</h4>
     ${lists.map(l=>{const done=(l.items||[]).filter(i=>i.done).length,total=(l.items||[]).length;
      return `<div class="kv"><span class="k">${esc(l.title)}</span><span class="v">${done}/${total}</span></div>`}).join("")}</div>`:""}

   ${guides.length?`<div class="card"><h4>📖 ${tb("guides")}</h4>
     ${guides.map(g=>`<details class="shday-d"><summary><span style="flex:1"><b>${esc(g.title||"")}</b>${g.title_ta?`<span class="ta"> · ${esc(g.title_ta)}</span>`:""}</span></summary>
       <div class="shguide" id="${g.key||("g"+g.ord)}">${g.html||""}</div></details>`).join("")}</div>`:""}

   <div class="shfoot">🧭 ${t("sharedReadOnly")}</div>
  </div></div>`;

 $("#shLang").onclick=()=>{setLang(getLang()==="ta"?"en":"ta");render(state)};
 $("#shDark").onclick=()=>{const h=document.documentElement;h.dataset.theme=h.dataset.theme==="dark"?"light":"dark";localStorage.setItem("ftp_theme",h.dataset.theme);render(state)};
 setTimeout(()=>{drawMini(tr,lastPt,lastWp);drawRoute(state);loadPlacePhotos()},60);
}

function wpIcon(k){return{start:"🏳",stay:"🛏",eat:"🍽",fuel:"⛽",photo:"📷",sight:"📍",finish:"🏁"}[k]||"📍"}
function ago(ts){const s=Math.floor(Date.now()/1000-ts);
 if(s<90)return t("justNow");const m=Math.floor(s/60);if(m<90)return m+" "+t("minAgo");
 const h=Math.floor(m/60);if(h<36)return h+" "+t("hrAgo");return Math.floor(h/24)+" "+t("dayAgo")}

async function loadPlacePhotos(){
 const cache=JSON.parse(localStorage.getItem("ftp_wimg")||"{}");
 const apply=()=>$$("#share img[data-wiki]").forEach(img=>{const u=img.dataset.photo||cache[img.dataset.wiki];
  if(u){img.src=u;img.style.display="block";const f=img.parentElement.querySelector(".fall");if(f)f.style.display="none"}});
 apply();
 if(!navigator.onLine)return;
 const need=[...new Set($$("#share img[data-wiki]").map(i=>i.dataset.wiki).filter(w=>w&&cache[w]===undefined))].slice(0,50);
 if(!need.length)return;
 await Promise.all(need.map(async w=>{try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(w));
  if(!r.ok){cache[w]=null;return}const j=await r.json();
  cache[w]=(j.thumbnail&&j.thumbnail.source)?j.thumbnail.source.replace(/\/\d+px-/,"/640px-"):null}catch(e){}}));
 localStorage.setItem("ftp_wimg",JSON.stringify(cache));apply();
}
function drawMini(tr,lastPt,lastWp){
 const L=window.L,el=$("#shmap");if(!L||!el)return;
 const pos=lastWp?[lastWp.lat,lastWp.lng]:(lastPt?[lastPt[0],lastPt[1]]:null);if(!pos)return;
 const m=L.map("shmap");L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(m);
 L.marker(pos,{icon:L.divIcon({className:"",html:'<div style="font-size:26px;text-shadow:0 0 4px #fff">📍</div>',iconAnchor:[13,13]})}).addTo(m);m.setView(pos,9)}
function drawRoute(state){
 const L=window.L,el=$("#shroute");if(!L||!el)return;
 const m=L.map("shroute");L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(m);
 const bounds=[];const stops=(state.stops||[]).slice().sort((a,b)=>a.ord-b.ord);
 if(stops.length)L.polyline(stops.map(s=>[s.lat,s.lng]),{color:state.trip.color||"#8A1538",weight:3,opacity:.5,dashArray:"6 6"}).addTo(m);
 stops.forEach(s=>bounds.push([s.lat,s.lng]));
 const tdays=TK.trackDays(state.trip.id);
 Object.values(tdays).forEach(pts=>{if(pts.length>1){L.polyline(pts.map(p=>[p[0],p[1]]),{color:"#c2582a",weight:4,opacity:.9}).addTo(m);pts.forEach(p=>bounds.push([p[0],p[1]]))}});
 TK.waypoints(state.trip.id).forEach(w=>{L.marker([w.lat,w.lng],{icon:L.divIcon({className:"",html:'<div style="font-size:18px;text-shadow:0 0 3px #fff">'+wpIcon(w.type)+'</div>',iconAnchor:[9,9]})}).addTo(m);bounds.push([w.lat,w.lng])});
 if(bounds.length)m.fitBounds(L.latLngBounds(bounds).pad(0.15));else m.setView([24.5,46],5)}
