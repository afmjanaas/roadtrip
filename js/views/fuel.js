/* ================= FUEL LOG ================= */
import {t,tb} from "../i18n.js";
import {$,esc,fmt,fmtDate,todayISO,downloadCSV,openForm,toast} from "../util.js";
import {Q,dayOrdForDate,expHome} from "../calc.js";
import {sub,subDoc,fs,user,serverTimestamp} from "../db.js";

export function render(state){
 const tr=state.trip,cur=tr.currency;
 const rows=[...state.fuel].sort((a,b)=>(a.odo||0)-(b.odo||0));
 const totL=rows.reduce((s,r)=>s+(r.litres||0),0);
 const totC=rows.reduce((s,r)=>s+Q(tr,r.cur||cur,r.price||0),0);
 // consumption between consecutive full tanks
 let consRows=[],lastFull=null;
 rows.forEach(r=>{if(!r.full)return;
  if(lastFull&&r.odo>lastFull.odo){
   const km=r.odo-lastFull.odo;
   consRows.push({from:lastFull,to:r,km,l100:r.litres/km*100})}
  lastFull=r});
 const avg=consRows.length?consRows.reduce((s,c)=>s+c.l100,0)/consRows.length:0;
 $("#view").innerHTML=`<section style="max-width:860px">
  <div class="sec-h">⛽ ${tb("fuelLog")}</div>
  <div class="sec-sub">${t("fuelSub")}</div><div class="rule"></div>
  <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
   <div class="stat"><div class="v">${rows.length}</div><div class="l">${t("fillUps")}</div></div>
   <div class="stat"><div class="v">${Math.round(totL)} L</div><div class="l">${t("litres")}</div></div>
   <div class="stat"><div class="v">${fmt(totC,cur)}</div><div class="l">${t("fuel").replace("⛽ ","")}</div></div>
   <div class="stat"><div class="v" style="color:${avg>11?"var(--bad)":"var(--ok)"}">${avg?avg.toFixed(1):"—"}</div><div class="l">L / 100 km</div></div>
  </div>
  ${avg>11?`<div class="warn">⚠ ${t("consHigh")}</div>`:""}
  <div style="display:flex;gap:10px;margin:10px 0;flex-wrap:wrap">
   <button class="tbtn primary" id="fAdd">＋ ${t("addFill")}</button>
   <button class="tbtn" id="fCsv">${t("exportCSV")}</button></div>
  <div class="card">${rows.length?rows.slice().reverse().map(r=>`
   <div class="exrow"><span class="cat">⛽</span>
    <span class="h"><b>${esc(r.station||"—")}</b>
     <div class="sub2">${fmtDate(r.date)} · ${t("odo")} ${(r.odo||0).toLocaleString()} km${r.full?" · "+t("fullTank"):""}</div></span>
    <span style="text-align:right"><b class="money">${fmt(Q(tr,r.cur||cur,r.price||0),cur)}</b>
     <div class="sub2">${r.litres||0} L</div></span>
    <button class="mini" data-fed="${r.id}">✎</button></div>`).join("")
   :`<div class="sec-sub" style="margin:0">${t("noFills")}</div>`}</div>
  ${consRows.length?`<div class="card" style="margin-top:14px"><h4>📈 ${t("consumption")}</h4>
   <table class="tbl"><tr><th>${t("legs")}</th><th class="right">km</th><th class="right">L</th><th class="right">L/100km</th></tr>
   ${consRows.map(c=>`<tr><td>${esc(c.from.station||"")} → ${esc(c.to.station||"")}</td><td class="right">${c.km}</td><td class="right">${c.to.litres}</td><td class="right money ${c.l100>11?"neg":"pos"}">${c.l100.toFixed(1)}</td></tr>`).join("")}</table>
   <div style="font-size:11px;color:var(--ink3);margin-top:6px">${t("consNote")}</div></div>`:""}
 </section>`;
 $("#fAdd").onclick=()=>form(state,null);
 $("#fCsv").onclick=()=>{
  const out=[["Date","Station","Odometer km","Litres","Price","Currency","Price ("+cur+")","Full tank"]];
  rows.forEach(r=>out.push([r.date,r.station||"",r.odo||"",r.litres||"",r.price||"",r.cur||cur,Q(tr,r.cur||cur,r.price||0).toFixed(2),r.full?"yes":"no"]));
  downloadCSV("fuel-log.csv",out)};
 $("#view").addEventListener("click",e=>{const b=e.target.closest("[data-fed]");
  if(b)form(state,state.fuel.find(x=>x.id===b.dataset.fed))});
}
function form(state,r){
 const tr=state.trip,isNew=!r;r=r||{date:todayISO(),cur:"SAR",full:"yes"};
 openForm(isNew?t("addFill"):"✎ ⛽",[
  {k:"date",l:t("date"),type:"date"},{k:"station",l:t("station")},
  {k:"odo",l:t("odo")+" (km)",type:"number"},{k:"litres",l:t("litres"),type:"number"},
  {k:"price",l:t("amount"),type:"number"},{k:"cur",l:t("currency"),type:"select",opts:Object.keys(tr.fx||{QAR:1})},
  {k:"full",l:t("fullTank")+"?",type:"select",opts:["yes","no"]},
  ...(isNew?[{k:"exp",l:t("alsoExpense")+"?",type:"select",opts:["yes","no"]}]:[])],
  {...r,full:r.full===true||r.full==="yes"?"yes":"no"},
  async out=>{
   const data={date:out.date,station:out.station,odo:out.odo,litres:out.litres,price:out.price,cur:out.cur,
    full:out.full==="yes",dayOrd:dayOrdForDate(state.days,out.date)};
   if(isNew){await fs.addDoc(sub(state.tripId,"fuel"),data);
    if(out.exp==="yes"&&out.price)await fs.addDoc(sub(state.tripId,"expenses"),{
     date:out.date,dayOrd:data.dayOrd,cat:"fuel",note:"⛽ "+(out.station||""),cur:out.cur,amt:out.price,
     amtHome:+(Q(tr,out.cur,out.price)).toFixed(2),by:(user()&&(user().displayName||user().email))||"",ts:serverTimestamp()})}
   else await fs.updateDoc(subDoc(state.tripId,"fuel",r.id),data);
   toast("✓")},
  isNew?null:()=>fs.deleteDoc(subDoc(state.tripId,"fuel",r.id)))}
