/* ================= DASHBOARD — mission control (phase-adaptive) ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,todayISO,openForm,pickImage,toast,CCOL} from "../util.js";
import {Q,plannedTotal,spentTotal,dayPlanned,expHome,EXCATS,CATLBL,spentByDay} from "../calc.js";
import {effCat} from "../categories.js";
import {tripRef,sub,subDoc,fs,user,serverTimestamp} from "../db.js";
import * as TK from "../tracker.js";
import * as GEO from "../geo.js";

const CC_COUNTRY={QA:"Qatar",AE:"UAE",SA:"Saudi Arabia",OM:"Oman",RET:"Saudi Arabia"};
const WC={0:["☀️","Clear"],1:["🌤","Mostly clear"],2:["⛅","Partly cloudy"],3:["☁️","Cloudy"],45:["🌫","Fog"],48:["🌫","Fog"],
 51:["🌦","Drizzle"],61:["🌧","Rain"],63:["🌧","Rain"],65:["🌧","Heavy rain"],71:["🌨","Snow"],80:["🌦","Showers"],81:["🌧","Showers"],95:["⛈","Storm"],96:["⛈","Storm"]};
const wc=c=>WC[c]||["🌡",""];

function greeting(){const h=new Date().getHours();return h<12?"goodMorning":h<17?"goodAfternoon":"goodEvening"}
function tripPhase(tr){const d=todayISO();if(d<tr.start)return"before";if(d>tr.end)return"after";return"during"}
function dayNum(tr){return Math.floor((new Date(todayISO())-new Date(tr.start))/864e5)+1}
function travellerName(state){
 const u=user();const me=(state.travellers||[]).find(x=>x.name);
 return (u&&u.displayName&&u.displayName.split(" ")[0])||(me&&me.name)||"traveller"}

export function render(state){
 const tr=state.trip,cur=tr.currency,days=(state.days||[]).slice().sort((a,b)=>a.ord-b.ord);
 const phase=tripPhase(tr);
 const dn=Math.min(Math.max(dayNum(tr),1),days.length||1);
 const dToday=phase==="during"?days.find(d=>d.date===todayISO())||days[dn-1]:(phase==="before"?days[0]:days[days.length-1]);
 const pct=phase==="before"?0:phase==="after"?100:Math.round(dn/(days.length||1)*100);
 const city=(dToday&&dToday.stay||"").replace(/🛏|🏁|HOME —|\(\d\/\d\)/g,"").trim();
 const country=CC_COUNTRY[dToday&&dToday.cc]||"";
 const hero=tr.cover?`style="background-image:linear-gradient(180deg,rgba(20,24,30,.25),rgba(28,20,32,.82)),url('${tr.cover}')"`:"";

 // build cards by phase
 const cards=[];
 if(phase==="before"){
  cards.push(countdownCard(tr,days),prepCard(state),nextBookingCard(state),alertsCard(state,phase),weatherCardShell(),budgetCard(state),quickActionsCard(state),familyCard(state),aiCard(state,phase,dToday));
 }else if(phase==="during"){
  cards.push(todayCard(state,dToday),driveCard(state,dToday),weatherCardShell(),alertsCard(state,phase),nextBookingCard(state),fuelCard(state,dToday),budgetCard(state),memoriesCard(state,dToday),quickActionsCard(state),aiCard(state,phase,dToday),statsCard(state),familyCard(state));
 }else{
  cards.push(statsCard(state),memoriesCard(state,dToday),budgetCard(state),bookLinkCard(),familyCard(state),quickActionsCard(state));
 }

 $("#view").innerHTML=`<div id="dash">
  <div class="dhero" ${hero}>
   <div class="dhero-in">
    <div class="dhero-greet">${t(greeting())}, ${esc(travellerName(state))}</div>
    <h1>${esc(tr.name)}</h1>
    <div class="dhero-meta">
     ${phase==="during"?`<span>📆 ${t("day")} ${dn} ${t("of")} ${days.length}</span>`:phase==="before"?`<span>🗓 ${Math.ceil((new Date(tr.start)-new Date(todayISO()))/864e5)} ${t("daysToGo")}</span>`:`<span>🏁 ${t("tripDone")}</span>`}
     ${city?`<span>📍 ${esc(city)}${country?", "+esc(country):""}</span>`:""}
     <span>${fmtDate(todayISO())}</span></div>
    <div class="dhero-bar"><i style="width:${pct}%"></i></div>
    <div class="dhero-pct">${pct}% ${t("completed")}</div>
    <div class="eaddrow" style="margin-top:8px"><button class="ebtn" id="dCover">📷 ${t("cover")}</button></div>
   </div></div>
  <div class="dgrid">${cards.join("")}</div>
  <button id="dFab" title="${t("assistant")}">🤖</button>
 </div>`;

 // wire
 $("#dCover").onclick=()=>pickImage(u=>fs.updateDoc(tripRef(tr.id),{cover:u}).then(()=>toast("✓")),1000,.72);
 $("#dFab").onclick=()=>location.hash="#/t/"+state.tripId+"/assistant";
 $("#view").addEventListener("click",e=>{
  const nav=e.target.closest("[data-go]");if(nav){location.hash="#/t/"+state.tripId+"/"+nav.dataset.go;return}
  const qx=e.target.closest("[data-qexp]");if(qx){quickExpense(state);return}
  const qp=e.target.closest("[data-qphoto]");if(qp){quickPhoto(state,dToday);return}
  const dd=e.target.closest("[data-daydone]");if(dd&&dToday){fs.updateDoc(subDoc(state.tripId,"days",dToday.id),{done:!dToday.done}).then(()=>toast("✓"));return}
 });
 loadWeather(state,dToday);
}

/* ---------- cards ---------- */
function card(cls,icon,title,body,accent){return `<div class="dcard ${accent||""}">
  <div class="dc-h"><span class="dc-i">${icon}</span><span class="dc-t">${title}</span></div>${body}</div>`}

function todayCard(state,d){
 if(!d)return "";
 const acts=(state.places||[]).filter(p=>p.dayOrd===d.ord&&p.on!==false&&effCat(p)!=="restaurant");
 const h=new Date().getHours();
 const slots=[["🌅",t("morning"),d.m,h<12],["☀",t("afternoon"),d.a,h>=12&&h<17],["🌆",t("evening"),d.e,h>=17&&h<21],["🌙",t("night"),d.n,h>=21]];
 const body=`<div class="dc-route">${esc(d.route||"")}</div>
  ${slots.filter(s=>s[2]).map(s=>`<div class="dslot ${s[3]?"now":""}">${s[3]?`<span class="dnow">${t("now")}</span>`:""}<b>${s[0]} ${s[1]}</b> ${esc(s[2])}</div>`).join("")}
  ${acts.length?`<div class="dchips">${acts.slice(0,6).map(p=>`<span class="dchip">📍 ${esc(p.n)}</span>`).join("")}</div>`:""}
  <div class="dc-btns">
   ${d.hotel?`<a class="dbtn" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.hotel+" "+((d.stay||"").replace(/🛏|🏁/g,"")))}&travelmode=driving">🧭 ${t("navigate")}</a>`:""}
   <button class="dbtn ${d.done?"ok":""}" data-daydone>${d.done?"✅ "+t("done"):"○ "+t("markDone")}</button>
   <button class="dbtn ghost" data-go="itinerary">${t("viewItinerary")}</button></div>`;
 return card("","📆",t("todayPlan"),body,"info")}

function driveCard(state,d){
 if(!d||!(d.km))return "";
 const borders=(d.route||"").split("🛂").length-1;
 const fatigue=d.km>=500?t("fatigueLong"):d.km>=250?t("fatigueMid"):t("fatigueOk");
 const body=`<div class="dstat-row">
   <div class="dmini"><b>${d.km} km</b><span>${t("distance")}</span></div>
   <div class="dmini"><b>${esc(d.drv||"—")}</b><span>${t("drivingHours")}</span></div>
   <div class="dmini"><b>${borders||"0"}</b><span>${t("borders")}</span></div></div>
  ${d.fuel&&d.fuel.length?`<div class="dc-sub">⛽ ${d.fuel.map(esc).join(" · ")}</div>`:""}
  <div class="dc-sub">🛌 ${fatigue}</div>
  ${d.road?`<div class="dc-sub">🛣 ${esc(d.road)}</div>`:""}`;
 return card("","🚗",t("driveSummary"),body,"info")}

function weatherCardShell(){return `<div class="dcard info" id="dWx"><div class="dc-h"><span class="dc-i">🌡</span><span class="dc-t">${t("weather")}</span></div><div id="dWxBody"><div class="dc-sub">…</div></div></div>`}

function budgetCard(state){
 const tr=state.trip,cur=tr.currency;
 const planned=plannedTotal(tr,state.days||[],state.places||[]),spent=spentTotal(tr,state.expenses||[]);
 const today=(state.expenses||[]).filter(e=>e.date===todayISO()).reduce((s,e)=>s+expHome(tr,e),0);
 const pct=planned?Math.min(spent/planned*100,100):0;const over=spent>planned;
 const body=`<div class="dstat-row">
   <div class="dmini"><b>${fmt(planned,cur)}</b><span>${t("planned")}</span></div>
   <div class="dmini"><b>${fmt(spent,cur)}</b><span>${t("spent")}</span></div>
   <div class="dmini"><b class="${over?"neg":"pos"}">${fmt(planned-spent,cur)}</b><span>${t("remaining")}</span></div></div>
  <div class="dbar"><i class="${over?"neg":""}" style="width:${pct}%"></i></div>
  <div class="dc-sub">${t("today")}: <b>${fmt(today,cur)}</b>${over?` · ⚠ ${t("overBudget")}`:""}</div>
  <div class="dc-btns"><button class="dbtn" data-qexp>＋ ${t("addExpense")}</button><button class="dbtn ghost" data-go="compare">${t("compare")}</button></div>`;
 return card("","💰",t("budget"),body,over?"warn":"ok")}

function fuelCard(state,d){
 const tr=state.trip,cur=tr.currency,fuel=(state.fuel||[]).slice().sort((a,b)=>(a.odo||0)-(b.odo||0));
 if(!fuel.length&&!(d&&d.fuel&&d.fuel.length))return "";
 let avg=0,fulls=fuel.filter(f=>f.full);
 for(let i=1;i<fulls.length;i++){const km=fulls[i].odo-fulls[i-1].odo;if(km>0)avg+=fulls[i].litres/km*100}
 if(fulls.length>1)avg/=(fulls.length-1);
 const todayCost=(state.fuel||[]).filter(f=>f.date===todayISO()).reduce((s,f)=>s+Q(tr,f.cur||cur,f.price||0),0);
 const body=`<div class="dstat-row">
   <div class="dmini"><b>${avg?avg.toFixed(1):"—"}</b><span>L/100km</span></div>
   <div class="dmini"><b>${fmt(todayCost,cur)}</b><span>${t("fuelToday")}</span></div>
   <div class="dmini"><b>${fuel.length}</b><span>${t("fillUps")}</span></div></div>
  ${d&&d.fuel&&d.fuel.length?`<div class="dc-sub">⛽ ${d.fuel.map(esc).join(" · ")}</div>`:""}
  <div class="dc-btns"><button class="dbtn ghost" data-go="fuel">${t("fuelLog")}</button></div>`;
 return card("","⛽",t("fuelLog"),body,"info")}

function nextBookingCard(state){
 const today=todayISO();
 const up=(state.bookings||[]).filter(b=>b.status!=="cancelled"&&b.date>=today).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")));
 if(!up.length)return "";
 const b=up[0];const TI={flight:"✈️",hotel:"🏨",car:"🚗",train:"🚆",ferry:"⛴",activity:"🎟",restaurant:"🍽",visa:"🛂",other:"📄"};
 const body=`<div class="dbk"><span class="dbk-i">${TI[b.type]||"📄"}</span>
   <div><b>${esc(b.title||b.type)}</b><div class="dc-sub">${fmtDate(b.date)}${b.time?" · "+esc(b.time):""}${b.ref?" · 🎫 "+esc(b.ref):""}</div>
    ${b.detail?`<div class="dc-sub">${esc(b.detail)}</div>`:""}</div></div>
  <div class="dc-btns"><button class="dbtn ghost" data-go="bookings">${t("open")}</button></div>`;
 return card("","🧾",t("nextBooking"),body,"info")}

function alertsCard(state,phase){
 const al=[];const today=todayISO();
 (state.reminders||[]).filter(r=>!r.done&&r.date===today).forEach(r=>al.push(["warn","🔔",r.title||"Reminder"]));
 const planned=plannedTotal(state.trip,state.days||[],state.places||[]),spent=spentTotal(state.trip,state.expenses||[]);
 if(spent>planned)al.push(["bad","💸",t("overBudget")]);
 // offline prep reminder during trip
 try{const prep=localStorage.getItem("ftp_prep_"+state.tripId);if(phase!=="after"&&!prep)al.push(["info","📴",t("notPrepared")])}catch(e){}
 if(!al.length)return "";
 const body=al.slice(0,5).map(a=>`<div class="dalert ${a[0]}"><span>${a[1]}</span> ${esc(a[2])}</div>`).join("");
 return card("","⚠️",t("alerts"),body,"warn")}

function quickActionsCard(state){
 const A=[["itinerary","📅",t("itinerary")],["journeylog","🛰",t("navigate")],["expenses","💳",t("addExpense")],["fuel","⛽",t("fuelLog")],
  ["journal","📔",t("journal")],["checklists","☑",t("checklists")],["vault","🪪",t("documents")],["food","🍽",t("nearby")],["assistant","🤖",t("assistant")],["sos","🆘",t("sos")]];
 const body=`<div class="dqa">${A.map(([g,i,l])=>`<button class="dqa-b" data-go="${g}"><span>${i}</span>${esc(l)}</button>`).join("")}</div>`;
 return card("","⚡",t("quickActions"),body,"")}

function statsCard(state){
 const tr=state.trip,cur=tr.currency,days=state.days||[];
 let km=0;days.forEach(d=>km+=TK.dayDistanceM(TK.pointsForDate(tr.id,d.date))/1000);
 if(!km)km=days.reduce((s,d)=>s+(d.km||0),0);
 const geo=GEO.summary(tr.id);
 const cities=new Set(geo.cities);days.forEach(d=>{const c=(d.stay||"").replace(/🛏|🏁/g,"").trim();if(c)cities.add(c)});
 const countries=new Set(geo.countries);days.forEach(d=>{if(CC_COUNTRY[d.cc])countries.add(CC_COUNTRY[d.cc])});
 let photos=0;(state.journal||[]).forEach(j=>photos+=(j.photos||[]).length);
 const spent=spentTotal(tr,state.expenses||[]);
 const S=[[countries.size,t("countries")],[cities.size,t("citiesTravelled")],[Math.round(km)+" km",t("distance")],
  [(state.places||[]).filter(p=>p.visited).length,t("placesVisited")],[photos,t("photos").replace("📷 ","")],[fmt(spent,cur),t("spent")]];
 const body=`<div class="dstats">${S.map(([v,l])=>`<div class="dstat"><b>${v}</b><span>${l}</span></div>`).join("")}
   <div class="dc-btns" style="grid-column:1/-1"><button class="dbtn ghost" data-go="stats">${t("stats")} →</button></div></div>`;
 return card("","📈",t("liveStats"),body,"")}

function memoriesCard(state,d){
 const j=(state.journal||[]).slice().sort((a,b)=>(b.dayOrd||0)-(a.dayOrd||0))[0];
 const photos=[];(state.journal||[]).forEach(x=>(x.photos||[]).forEach(p=>photos.push(p)));
 const body=`${photos.length?`<div class="dmem-ph">${photos.slice(0,4).map(p=>`<img src="${p}">`).join("")}</div>`:""}
   ${j&&j.text?`<div class="dc-sub" style="margin-top:6px">“${esc(j.text.slice(0,120))}${j.text.length>120?"…":""}”</div>`:`<div class="dc-sub">${t("noEntryYet")}</div>`}
   <div class="dc-btns"><button class="dbtn" data-go="journal">${t("writeToday")}</button><button class="dbtn ghost" data-qphoto>📷 ${t("photo").replace("📷 ","")}</button></div>`;
 return card("","📸",t("memories"),body,"")}

function familyCard(state){
 const tr=(state.travellers||[]).slice().sort((a,b)=>(a.created||0)-(b.created||0));
 if(!tr.length)return card("","👪",t("travellers"),`<div class="dc-sub">${t("noTravellers")}</div><div class="dc-btns"><button class="dbtn" data-go="travellers">＋ ${t("addTraveller")}</button></div>`,"");
 const body=`<div class="dfam">${tr.map(p=>`<div class="dfam-p"><span class="dfam-av" style="background:${p.color||'#555'}">${p.photo?`<img src="${p.photo}">`:esc((p.name||"?").slice(0,1))}</span>${esc((p.name||"").split(" ")[0])}</div>`).join("")}</div>
   <div class="dc-btns"><button class="dbtn ghost" data-go="travellers">${t("travellers")} →</button><button class="dbtn ghost" data-go="sos">🆘 ${t("sos")}</button></div>`;
 return card("","👪",t("travellers"),body,"")}

function countdownCard(tr,days){
 const dd=Math.ceil((new Date(tr.start)-new Date(todayISO()))/864e5);
 const body=`<div class="dcount"><b>${dd}</b><span>${t("daysToGo")}</span></div>
   <div class="dc-sub">${fmtDate(tr.start)} → ${fmtDate(tr.end)} · ${days.length} ${t("days")}</div>`;
 return card("","🗓",t("countdown"),body,"ai")}
function prepCard(state){
 const lists=state.lists||[];const done=lists.reduce((s,l)=>s+(l.items||[]).filter(i=>i.done).length,0),total=lists.reduce((s,l)=>s+(l.items||[]).length,0);
 const body=`<div class="dbar"><i style="width:${total?done/total*100:0}%"></i></div>
   <div class="dc-sub">${done}/${total} ${t("done")} · ${lists.length} ${t("checklists").toLowerCase()}</div>
   <div class="dc-btns"><button class="dbtn" data-go="checklists">${t("checklists")}</button><button class="dbtn ghost" data-go="bookings">${t("bookings")}</button></div>`;
 return card("","🎒",t("prep"),body,"info")}
function bookLinkCard(){return card("","📕",t("memoryBook"),`<div class="dc-sub">${t("bookHint")}</div><div class="dc-btns"><button class="dbtn" data-go="book">${t("book")} →</button></div>`,"ai")}

/* rule-based AI tips (works offline/free); + link to full assistant */
function aiCard(state,phase,d){
 const tips=[];const tr=state.trip;
 if(phase==="before")tips.push("🎒 "+t("tipPrep"));
 if(d&&d.km>=500)tips.push("🛌 "+t("tipLongDrive"));
 if(d&&/🛂/.test(d.route||""))tips.push("🛂 "+t("tipBorder"));
 const planned=plannedTotal(tr,state.days||[],state.places||[]),spent=spentTotal(tr,state.expenses||[]);
 if(spent<planned*0.6&&phase==="during")tips.push("💰 "+t("tipUnderBudget"));
 if(spent>planned)tips.push("💸 "+t("tipOverBudget"));
 if(d&&/UMRAH|Umrah/.test(d.route||""))tips.push("🕋 "+t("tipUmrah"));
 if(!tips.length)tips.push("✨ "+t("tipAsk"));
 const body=tips.slice(0,4).map(x=>`<div class="dtip">${x}</div>`).join("")+`<div class="dc-btns"><button class="dbtn" data-go="assistant">🤖 ${t("assistant")}</button></div>`;
 return card("","✨",t("aiSuggestions"),body,"ai")}

/* ---------- quick actions ---------- */
function quickExpense(state){
 const tr=state.trip,curs=Object.keys(tr.fx||{QAR:1});
 openForm(t("addExpense"),[{k:"amt",l:t("amount"),type:"number"},{k:"cur",l:t("currency"),type:"select",opts:curs},
  {k:"cat",l:t("category"),type:"select",opts:EXCATS.map(c=>c.k)},{k:"note",l:t("note"),full:1}],{cur:tr.currency,cat:"food"},
  out=>{if(!out.amt)return;const date=todayISO();const dd=(state.days||[]).find(x=>x.date===date);
   fs.addDoc(sub(state.tripId,"expenses"),{date,dayOrd:dd?dd.ord:0,cat:out.cat,note:out.note||"",cur:out.cur,amt:out.amt,
    amtHome:+(Q(tr,out.cur,out.amt)).toFixed(2),by:(user()&&(user().displayName||user().email))||"",ts:serverTimestamp()}).then(()=>toast("✓ "+fmt(Q(tr,out.cur,out.amt),tr.currency)))})}
function quickPhoto(state,d){
 if(!d)return;const j=(state.journal||[]).find(x=>x.dayOrd===d.ord);
 pickImage(u=>{if(j)fs.updateDoc(subDoc(state.tripId,"journal",j.id),{photos:[...(j.photos||[]),u]}).then(()=>toast("✓"));
  else fs.addDoc(sub(state.tripId,"journal"),{dayOrd:d.ord,date:d.date,text:"",photos:[u]}).then(()=>toast("✓"))},900,.72)}

/* ---------- weather (open-meteo) ---------- */
async function loadWeather(state,d){
 const el=$("#dWxBody");if(!el)return;
 const stop=stopFor(state,d);if(!stop){el.innerHTML=`<div class="dc-sub">—</div>`;return}
 if(!navigator.onLine){el.innerHTML=`<div class="dc-sub">📴 ${t("offline")}</div>`;return}
 try{
  const w=await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${stop.lat}&longitude=${stop.lng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,precipitation_probability_max&forecast_days=1&timezone=auto`)).json();
  const c=w.current||{},dl=(w.daily||{}),[ic,txt]=wc(c.weather_code);
  const hi=dl.temperature_2m_max&&dl.temperature_2m_max[0],lo=dl.temperature_2m_min&&dl.temperature_2m_min[0];
  const uv=dl.uv_index_max&&dl.uv_index_max[0],rain=dl.precipitation_probability_max&&dl.precipitation_probability_max[0];
  const sr=dl.sunrise&&dl.sunrise[0]?dl.sunrise[0].slice(11,16):"",ss=dl.sunset&&dl.sunset[0]?dl.sunset[0].slice(11,16):"";
  // next hours
  let hourly="";
  if(w.hourly&&w.hourly.time){const now=Date.now();const idx=w.hourly.time.findIndex(tm=>new Date(tm).getTime()>=now);
   const s=Math.max(idx,0);hourly=w.hourly.time.slice(s,s+6).map((tm,i)=>{const [hi2]=wc(w.hourly.weather_code[s+i]);
    return `<div class="dwx-h"><span>${tm.slice(11,13)}h</span><b>${hi2}</b><span>${Math.round(w.hourly.temperature_2m[s+i])}°</span></div>`}).join("")}
  el.innerHTML=`<div class="dwx-now"><span class="dwx-ic">${ic}</span><div><b>${Math.round(c.temperature_2m)}°C</b>
     <div class="dc-sub">${esc(txt)} · ${t("feelsLike")} ${Math.round(c.apparent_temperature)}° · ${Math.round(hi)}°/${Math.round(lo)}°</div></div></div>
    ${hourly?`<div class="dwx-hours">${hourly}</div>`:""}
    <div class="dwx-tags"><span>💧 ${rain!=null?rain+"%":"—"}</span><span>💨 ${Math.round(c.wind_speed_10m||0)} km/h</span><span>☀️ UV ${uv!=null?Math.round(uv):"—"}</span><span>🌅 ${sr}</span><span>🌇 ${ss}</span></div>
    ${rain>=60?`<div class="dc-sub" style="color:var(--warn)">⚠ ${t("wxRain")}</div>`:hi>=45?`<div class="dc-sub" style="color:var(--warn)">⚠ ${t("wxHeat")}</div>`:""}
    <div class="dc-sub">📍 ${esc(stop.name||"")}</div>`;
 }catch(e){el.innerHTML=`<div class="dc-sub">—</div>`}}
function stopFor(state,d){
 if(d&&d.date===todayISO()){const days=TK.trackDays(state.trip.id);let last=null;
  Object.values(days).forEach(pts=>{const p=pts[pts.length-1];if(p&&(!last||p[2]>last[2]))last=p});
  if(last)return {lat:last[0],lng:last[1],name:(d.stay||"").replace(/🛏|🏁/g,"").trim()}}
 const ord=d?d.ord:1;const stops=(state.stops||[]).filter(s=>s.day<=ord).sort((a,b)=>b.day-a.day);
 const s=stops[0]||(state.stops||[])[0];return s?{lat:s.lat,lng:s.lng,name:s.name}:null}
