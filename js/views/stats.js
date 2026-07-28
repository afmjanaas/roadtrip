/* ================= STATISTICS ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmt,toast} from "../util.js";
import {Q,spentTotal,expHome} from "../calc.js";
import {effCat} from "../categories.js";
import {tripRef,fs} from "../db.js";
import * as TK from "../tracker.js";
import * as GEO from "../geo.js";

const CC_COUNTRY={QA:"Qatar",AE:"United Arab Emirates",SA:"Saudi Arabia",OM:"Oman",RET:"Saudi Arabia"};

export function render(state){
 const tr=state.trip,cur=tr.currency,days=state.days||[];
 TK.hydrate(tr.id,state.track,state.waypoints);
 const tdays=TK.trackDays(tr.id);
 // distance + driving time + altitude + longest from GPS (fallback planned)
 let actualKm=0,moveSec=0,maxAlt=null,longest={km:0,day:0};
 days.forEach(d=>{const pts=TK.pointsForDate(tr.id,d.date);
  const km=TK.dayDistanceM(pts)/1000;actualKm+=km;
  moveSec+=TK.movingSeconds(pts);
  const a=TK.maxAltitude(pts);if(a!=null&&(maxAlt==null||a>maxAlt))maxAlt=a;
  const dk=km||d.km||0;if(dk>longest.km)longest={km:dk,day:d.ord}});
 const plannedKm=days.reduce((s,d)=>s+(d.km||0),0);
 const totalKm=Math.round(actualKm||plannedKm);
 const driveH=moveSec?(moveSec/3600):(days.reduce((s,d)=>s+(d.km||0),0)/90); // fallback ~90km/h avg
 // GPS cities/countries
 const geo=GEO.summary(tr.id);
 const cities=new Set(geo.cities);days.forEach(d=>{const c=(d.stay||"").replace(/🛏|🏁|HOME —|\(\d\/\d\)/g,"").trim();if(c)cities.add(c)});
 const countries=new Set(geo.countries);days.forEach(d=>{if(CC_COUNTRY[d.cc])countries.add(CC_COUNTRY[d.cc])});
 // fuel
 const litres=(state.fuel||[]).reduce((s,f)=>s+(f.litres||0),0);
 const fuelCost=(state.fuel||[]).reduce((s,f)=>s+Q(tr,f.cur||cur,f.price||0),0);
 // money
 const spent=spentTotal(tr,state.expenses||[]);
 // places + photos + hotels
 const placesVisited=(state.places||[]).filter(p=>p.visited).length;
 const hotels=new Set(days.filter(d=>d.hotel&&d.hotel.trim()).map(d=>d.hotel.trim())).size;
 let photos=0;(state.journal||[]).forEach(j=>photos+=(j.photos||[]).length);
 (state.places||[]).forEach(p=>{if(p.photo)photos++});
 days.forEach(d=>{if(d.photo)photos++;if(d.hotelPhoto)photos++});
 const steps=tr.steps||0;

 const card=(icon,val,label,sub,extra)=>`<div class="st-card"${extra||""}><div class="st-ic">${icon}</div>
   <div class="st-v">${val}</div><div class="st-l">${label}</div>${sub?`<div class="st-s">${sub}</div>`:""}</div>`;

 $("#view").innerHTML=`<section style="max-width:900px">
  <div class="sec-h">📊 ${tb("stats")}</div>
  <div class="sec-sub">${t("statsSub")}</div><div class="rule"></div>
  <div class="st-grid">
   ${card("🌍",countries.size,t("countries"),[...countries].join(" · ").slice(0,60))}
   ${card("🏙",cities.size,t("citiesTravelled"),'<button class="mini" id="refreshCities" style="margin-top:4px">🔄 '+t("fromGPS")+'</button>')}
   ${card("🛣",totalKm.toLocaleString()+" km",actualKm?t("droveActual"):t("distance"))}
   ${card("⏱",driveH.toFixed(1)+" h",t("drivingHours"))}
   ${card("⛽",Math.round(litres)+" L",t("fuel").replace("⛽ ",""),fmt(fuelCost,cur))}
   ${card("💰",fmt(spent,cur),t("moneySpent"))}
   ${card("🏨",hotels,t("hotels"))}
   ${card("📌",placesVisited,t("placesVisited"))}
   ${card("📷",photos,t("photosTaken"))}
   ${card("👣",steps?steps.toLocaleString():"—",t("steps"),'<button class="mini" id="setSteps" style="margin-top:4px">✎ '+t("setSteps")+'</button>')}
   ${card("⛰",maxAlt!=null?maxAlt+" m":"—",t("highestAltitude"))}
   ${card("🚗",longest.km?Math.round(longest.km)+" km":"—",t("longestDrive"),longest.day?"Day "+longest.day:"")}
  </div>
  ${cities.size?`<div class="card" style="margin-top:16px"><h4>🏙 ${t("citiesTravelled")} <span class="chip">${cities.size}</span></h4>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${[...cities].map(c=>`<span class="pill">${esc(c)}</span>`).join("")}</div></div>`:""}
  <div id="geoMsg" style="font-size:12px;color:var(--ink3);margin-top:10px"></div>
 </section>`;

 const rc=$("#refreshCities");if(rc)rc.onclick=async()=>{
  if(!navigator.onLine){toast(t("needOnline"));return}
  const msg=$("#geoMsg");msg.textContent="⏳ "+t("detectingCities");
  try{await GEO.detectCities(tr.id,tdays,TK.waypoints(tr.id),(d,tot)=>{msg.textContent="⏳ "+t("detectingCities")+" "+d+"/"+tot});
   toast("✓");render(state)}catch(e){msg.textContent="⚠ "+e.message}};
 const ss=$("#setSteps");if(ss)ss.onclick=()=>{const v=prompt(t("setSteps")+" (total):",tr.steps||"");
  if(v!=null){fs.updateDoc(tripRef(tr.id),{steps:parseInt(v.replace(/\D/g,""))||0}).then(()=>{toast("✓");render(state)})}};
}
