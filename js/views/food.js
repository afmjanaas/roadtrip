/* ================= FOOD PLANNER — meals per day + nearby suggestions ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,todayISO,openForm,toast} from "../util.js";
import {Q} from "../calc.js";
import {effCat} from "../categories.js";
import {sub,subDoc,fs} from "../db.js";
import * as GEO from "../geo.js";
import * as TK from "../tracker.js";

const MEALS=[["breakfast","🍳"],["lunch","🍽"],["dinner","🌙"],["snack","🍫"]];
const MI=Object.fromEntries(MEALS);

export function render(state){
 const tr=state.trip,cur=tr.currency,days=(state.days||[]).slice().sort((a,b)=>a.ord-b.ord);
 const rests=(state.places||[]).filter(p=>effCat(p)==="restaurant");
 const today=todayISO();
 $("#view").innerHTML=`<section style="max-width:900px">
  <div class="sec-h">🍽 ${tb("food")}</div>
  <div class="sec-sub">${t("foodSub2")}</div><div class="rule"></div>
  <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
   <div class="stat"><div class="v">${rests.length}</div><div class="l">${t("restaurants")}</div></div>
   <div class="stat"><div class="v">${rests.filter(r=>r.visited).length}</div><div class="l">${t("been")}</div></div>
   <div class="stat"><div class="v">${days.length*3}</div><div class="l">${t("mealsToPlan")}</div></div>
  </div>
  ${days.map(d=>{const city=(d.stay||"").replace(/🛏|🏁|HOME —|\(\d\/\d\)/g,"").trim();
   const dr=rests.filter(p=>p.dayOrd===d.ord);
   return `<div class="card" style="margin-bottom:12px">
    <h4>${t("day")} ${d.ord} · ${fmtDate(d.date)} ${city?`<span style="font-weight:400;color:var(--ink3);font-size:13px">📍 ${esc(city)}</span>`:""}</h4>
    ${d.food?`<div class="tip" style="margin:4px 0 10px"><b>🍴 ${t("chefNote")}</b>${esc(d.food)}</div>`:""}
    ${MEALS.map(([m,ic])=>{const items=dr.filter(p=>(p.meal||"lunch")===m||(m==="lunch"&&!p.meal&&false));
      const forMeal=dr.filter(p=>(p.meal||"")===m);
      return `<div class="meal ${(m!=="snack"&&!forMeal.length)?"empty":""}">
       <div class="meal-h"><span>${ic} ${t("meal_"+m)}</span>
        <span><button class="mini" data-nearby="${d.ord}:${m}">🔍 ${t("nearby")}</button>
         <button class="mini" data-addmeal="${d.ord}:${m}">＋</button></span></div>
       ${forMeal.length?forMeal.map(p=>{const cost=Q(tr,p.cur,p.fam);
        return `<div class="exrow" style="padding:5px 0"><span class="cat" style="width:26px;height:26px;font-size:13px">${p.visited?"✅":ic}</span>
         <span class="h"><b>${esc(p.n)}</b>${p.why?`<div class="sub2">${esc(p.why)}</div>`:""}</span>
         ${cost?`<b class="money" style="font-size:12px">${fmt(cost,cur)}</b>`:""}
         ${p.q?`<a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}">🗺</a>`:""}
         <label class="mini" style="display:inline-flex;gap:3px;align-items:center"><input type="checkbox" data-fvisit="${p.id}" ${p.visited?"checked":""}>${t("been")}</label>
         <button class="mini" data-fedit="${p.id}">✎</button></div>`}).join("")
       :`<div class="meal-empty">${m==="snack"?t("snackOptional"):t("noMealYet")}</div>`}
      </div>`}).join("")}
   </div>`}).join("")}
 </section>`;
 $("#view").addEventListener("change",e=>{const v=e.target.closest("[data-fvisit]");if(v)
  fs.updateDoc(subDoc(state.tripId,"places",v.dataset.fvisit),{visited:v.checked}).then(()=>toast(v.checked?"✅":"↩"))});
 $("#view").addEventListener("click",e=>{let el;
  if(el=e.target.closest("[data-addmeal]")){const[o,m]=el.dataset.addmeal.split(":");mealForm(state,+o,m,null)}
  else if(el=e.target.closest("[data-fedit]"))mealForm(state,null,null,state.places.find(p=>p.id===el.dataset.fedit));
  else if(el=e.target.closest("[data-nearby]")){const[o,m]=el.dataset.nearby.split(":");nearby(state,+o,m)}});
}
function dayCoords(state,ord){
 const d=(state.days||[]).find(x=>x.ord===ord);
 // today -> current GPS; else the day's planned stop
 if(d&&d.date===todayISO()){const days=TK.trackDays(state.trip.id);let last=null;
  Object.values(days).forEach(pts=>{const p=pts[pts.length-1];if(p&&(!last||p[2]>last[2]))last=p});
  if(last)return {lat:last[0],lng:last[1]}}
 const stops=(state.stops||[]).filter(s=>s.day<=ord).sort((a,b)=>b.day-a.day);
 return stops[0]||(state.stops||[])[0]||null}
async function nearby(state,ord,meal){
 if(!navigator.onLine){toast(t("needOnline"));return}
 const c=dayCoords(state,ord);if(!c){toast("No location for this day");return}
 toast("🔍 "+t("searchingNearby"));
 let list;try{list=await GEO.nearbyRestaurants(c.lat,c.lng)}catch(e){toast("⚠ "+e.message);return}
 if(!list.length){toast(t("noneNearby"));return}
 const ov=document.createElement("div");ov.className="ovl";
 ov.innerHTML='<div class="modal"><h3>'+MI[meal]+' '+t("nearbyFor")+' '+t("meal_"+meal)+' — '+t("day")+' '+ord+'</h3>'+
  '<div class="sec-sub">'+t("tapToAdd")+'</div>'+
  list.map((r,i)=>'<div class="exrow" data-pick="'+i+'" style="cursor:pointer"><span class="cat">'+(r.kind==="cafe"?"☕":r.kind==="fast_food"?"🍔":"🍽")+'</span>'+
   '<span class="h"><b>'+esc(r.name)+'</b>'+(r.cuisine?'<div class="sub2">'+esc(r.cuisine)+'</div>':'')+'</span>'+
   '<a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.name+" "+r.lat+","+r.lng)+'">🗺</a></div>').join("")+
  '<div class="btns"><button class="tbtn" data-a="cancel">'+t("cancel")+'</button></div></div>';
 document.body.appendChild(ov);
 ov.addEventListener("click",e=>{
  if(e.target===ov||(e.target.dataset&&e.target.dataset.a==="cancel")){ov.remove();return}
  const pk=e.target.closest("[data-pick]");if(!pk)return;
  if(e.target.closest("a"))return;
  const r=list[+pk.dataset.pick];const d=(state.days||[]).find(x=>x.ord===ord);
  fs.addDoc(sub(state.tripId,"places"),{dayOrd:ord,n:r.name,why:r.cuisine||"",city:(d&&d.stay||"").replace(/🛏|🏁/g,"").trim(),
   tag:"restaurant",meal,cur:state.trip.currency,fam:0,on:false,visited:false,s:4,kids:3,ph:3,
   q:r.name+" "+r.lat+","+r.lng,wiki:"",ta:{}}).then(()=>{toast("✓ "+r.name);ov.remove()})});
}
function mealForm(state,ord,meal,p){
 const isNew=!p;const d=(state.days||[]).find(x=>x.ord===(ord||(p&&p.dayOrd)));
 openForm(isNew?(MI[meal]||"🍽")+" "+t("meal_"+(meal||"lunch"))+" — "+t("day")+" "+ord:"✎ "+(p.n||""),[
  {k:"n",l:t("name")+" (restaurant)",full:1},
  {k:"meal",l:t("meal"),type:"select",opts:MEALS.map(x=>x[0])},
  {k:"why",l:t("note")+" — cuisine, dish",full:1},
  {k:"fam",l:t("amount")+" ("+t("optional")+")",type:"number"},
  {k:"cur",l:t("currency"),type:"select",opts:Object.keys(state.trip.fx||{QAR:1})},
  {k:"visited",l:t("been")+"?",type:"select",opts:["no","yes"]}],
  isNew?{meal:meal||"lunch",cur:state.trip.currency}:{...p,meal:p.meal||"lunch",visited:p.visited?"yes":"no"},
  out=>{const data={n:out.n||"Restaurant",meal:out.meal||"lunch",why:out.why||"",fam:out.fam||0,cur:out.cur||state.trip.currency,
    tag:"restaurant",visited:out.visited==="yes",q:(out.n||"")+" "+((d&&d.stay)||"")};
   if(isNew){data.dayOrd=ord;data.city=(d&&d.stay||"").replace(/🛏|🏁/g,"").trim();data.on=false;data.s=4;data.kids=3;data.ph=3;data.ta={}}
   const pr=isNew?fs.addDoc(sub(state.tripId,"places"),data):fs.updateDoc(subDoc(state.tripId,"places",p.id),data);
   pr.then(()=>toast("✓"))},
  isNew?null:()=>fs.deleteDoc(subDoc(state.tripId,"places",p.id)).then(()=>toast("✓")))}
