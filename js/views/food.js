/* ================= FOOD PLANNER — restaurants day by day ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,openForm,toast} from "../util.js";
import {Q} from "../calc.js";
import {effCat} from "../categories.js";
import {sub,subDoc,fs} from "../db.js";

export function render(state){
 const tr=state.trip,cur=tr.currency,days=(state.days||[]).slice().sort((a,b)=>a.ord-b.ord),places=state.places||[];
 const rests=places.filter(p=>effCat(p)==="restaurant");
 $("#view").innerHTML=`<section style="max-width:900px">
  <div class="sec-h">🍽 ${tb("food")}</div>
  <div class="sec-sub">${t("foodSub")}</div><div class="rule"></div>
  <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
   <div class="stat"><div class="v">${rests.length}</div><div class="l">${t("restaurants")}</div></div>
   <div class="stat"><div class="v">${rests.filter(r=>r.visited).length}</div><div class="l">${t("fVisited")}</div></div>
   <div class="stat"><div class="v">${days.filter(d=>d.food&&d.food.trim()).length}</div><div class="l">${t("chefNotes")}</div></div>
  </div>
  ${days.map(d=>{const dr=rests.filter(p=>p.dayOrd===d.ord);
   const city=(d.stay||"").replace(/🛏|🏁|HOME —|\(\d\/\d\)/g,"").trim();
   return `<div class="card" style="margin-bottom:12px">
    <h4>${t("day")} ${d.ord} · ${fmtDate(d.date)} ${city?`<span style="font-weight:400;color:var(--ink3);font-size:13px">📍 ${esc(city)}</span>`:""}
     <button class="tbtn" data-addfood="${d.ord}" style="float:right">＋ ${t("addRestaurant")}</button></h4>
    ${d.food?`<div class="tip" style="margin:6px 0"><b>🍴 ${t("chefNote")}</b>${esc(d.food)}${d.ta&&d.ta.food?`<div class="ta tam">${esc(d.ta.food)}</div>`:""}</div>`:""}
    ${dr.length?dr.map(p=>{const cost=Q(tr,p.cur,p.fam);
     return `<div class="exrow"><span class="cat">${p.visited?"✅":"🍽"}</span>
      <span class="h"><b>${esc(p.n)}</b>${p.why?`<div class="sub2">${esc(p.why)}</div>`:""}</span>
      ${cost?`<b class="money">${fmt(cost,cur)}</b>`:""}
      ${p.q?`<a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}">🗺</a>`:""}
      <label class="mini" style="display:inline-flex;gap:4px;align-items:center;cursor:pointer"><input type="checkbox" data-fvisit="${p.id}" ${p.visited?"checked":""}> ${t("been")}</label>
      <button class="mini" data-fedit="${p.id}">✎</button></div>`}).join("")
    :`<div class="sec-sub" style="margin:2px 0 0">${t("noRestaurants")}</div>`}
   </div>`}).join("")}
 </section>`;
 $("#view").addEventListener("change",e=>{const v=e.target.closest("[data-fvisit]");if(!v)return;
  fs.updateDoc(subDoc(state.tripId,"places",v.dataset.fvisit),{visited:v.checked}).then(()=>toast(v.checked?"✅":"↩"))});
 $("#view").addEventListener("click",e=>{
  let el;
  if(el=e.target.closest("[data-addfood]"))return foodForm(state,+el.dataset.addfood,null);
  if(el=e.target.closest("[data-fedit]"))return foodForm(state,null,state.places.find(p=>p.id===el.dataset.fedit));});
}
function foodForm(state,ord,p){
 const isNew=!p;const d=(state.days||[]).find(x=>x.ord===(ord||(p&&p.dayOrd)));
 openForm(isNew?t("addRestaurant")+" — "+t("day")+" "+ord:"✎ "+(p.n||""),[
  {k:"n",l:t("name")+" (restaurant)",full:1},
  {k:"why",l:t("note")+" — cuisine, dish, why",full:1},
  {k:"fam",l:t("amount")+" ("+t("optional")+")",type:"number"},
  {k:"cur",l:t("currency"),type:"select",opts:Object.keys(state.trip.fx||{QAR:1})},
  {k:"visited",l:t("been")+"?",type:"select",opts:["no","yes"]}],
  isNew?{cur:state.trip.currency,city:(d&&d.stay||"").replace(/🛏|🏁/g,"").trim()}:{...p,visited:p.visited?"yes":"no"},
  out=>{const data={n:out.n||"Restaurant",why:out.why||"",fam:out.fam||0,cur:out.cur||state.trip.currency,
    tag:"restaurant",visited:out.visited==="yes",q:(out.n||"")+" "+((d&&d.stay)||"")};
   if(isNew){data.dayOrd=ord;data.city=(d&&d.stay||"").replace(/🛏|🏁/g,"").trim();data.on=false;data.s=4;data.kids=3;data.ph=3;data.ta={}}
   const pr=isNew?fs.addDoc(sub(state.tripId,"places"),data):fs.updateDoc(subDoc(state.tripId,"places",p.id),data);
   pr.then(()=>toast("✓"))},
  isNew?null:()=>fs.deleteDoc(subDoc(state.tripId,"places",p.id)).then(()=>toast("✓")))}
