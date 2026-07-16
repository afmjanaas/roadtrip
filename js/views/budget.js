/* ================= BUDGET (planned) ================= */
import {t,tb} from "../i18n.js";
import {$,esc,fmt,fmtDate,CCOL,openForm,toast} from "../util.js";
import {Q,dayActs,dayPlanned,preTotal,plannedTotal} from "../calc.js";
import {tripRef,fs} from "../db.js";

const CATS=[["accommodation","#8A1538",(tr,ps,d)=>Q(tr,d.hCur,d.hV)],["fuel","#D97B29",(tr,ps,d)=>d.fuelQ||0],
 ["foodB","#0E7A45",(tr,ps,d)=>d.foodQ||0],["activities","#1B5FAA",(tr,ps,d)=>dayActs(tr,ps,d.ord)],
 ["parking","#7a6ea8",(tr,ps,d)=>d.parkQ||0],["misc","#b98a2e",(tr,ps,d)=>d.miscQ||0]];

export function render(state){
 const tr=state.trip,cur=tr.currency,days=state.days,ps=state.places;
 const catTot=CATS.map(([k,c,f])=>[t(k),c,days.reduce((s,d)=>s+f(tr,ps,d),0)]);
 const pre=preTotal(tr),daysSum=days.reduce((s,d)=>s+dayPlanned(tr,ps,d),0),grand=daysSum+pre;
 const all=[...catTot,[t("preTrip"),"#556",pre]];
 const totPie=all.reduce((s,a)=>s+a[2],0)||1;
 let acc=0;
 const segs=all.map(([n,c,v])=>{const p=v/totPie*100,o=acc;acc+=p;
  return `<circle r="15.9155" cx="21" cy="21" fill="none" stroke="${c}" stroke-width="7" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${25-o}"></circle>`}).join("");
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("budget")}</div>
  <div class="sec-sub">${t("planned")} — ${esc(tr.name)}</div><div class="rule"></div>
  <div class="grid g3">
   <div class="card" style="text-align:center"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3)">${t("grandTotal")}</div>
    <div class="bigtotal">${fmt(grand,cur)}</div>
    <div style="font-size:12.5px;color:var(--ink2)">= ${fmt(daysSum,cur)} + ${fmt(pre,cur)} ${t("preTrip").toLowerCase()}<br>
    ≈ ${fmt(grand/(tr.travelers||1),cur)} ${t("perPerson")} · ${fmt(grand/(days.length||1),cur)} ${t("perDay")}</div></div>
   <div class="card"><h4>${t("whereGoes")}</h4><div class="donutwrap">
    <svg width="130" height="130" viewBox="0 0 42 42">${segs}<circle r="11" cx="21" cy="21" fill="var(--card)"></circle><text x="21" y="22.5" text-anchor="middle" style="font-size:5px;fill:var(--ink);font-weight:700">${cur}</text></svg>
    <div class="dlegend">${all.map(([n,c,v])=>`<div class="li"><span class="sw" style="background:${c}"></span>${n}<b style="margin-left:auto">${fmt(v,cur)}</b></div>`).join("")}</div></div></div>
   <div class="card"><h4>🧾 ${t("preTrip")} <button class="ebtn" id="preBtn">✎</button></h4>
    ${(tr.pretrip||[]).map(p=>`<div class="kv"><span class="k">${esc(p.n)}</span><span class="v money">${fmt(p.v,cur)}</span></div>`).join("")||"—"}
    <div class="kv" style="border-top:2px solid var(--gold)"><span class="k"><b>${t("total")}</b></span><span class="v money">${fmt(pre,cur)}</span></div></div>
  </div>
  <div class="card" style="margin-top:16px"><h4>🏨 ${t("hotelsTable")}</h4><table class="tbl">
   <tr><th>${t("date")}</th><th>${t("day")}</th><th></th><th class="right">${cur}</th></tr>
   ${days.filter(d=>d.hV).map(d=>`<tr><td>${fmtDate(d.date)}</td><td>D${d.ord} ${esc(d.stay||"")}</td><td style="color:var(--ink3);font-size:12px">${esc(d.hotel||"")}</td><td class="right money">${fmt(Q(tr,d.hCur,d.hV),cur)}</td></tr>`).join("")}
   <tr><td colspan="3"><b>${t("total")}</b></td><td class="right money">${fmt(days.reduce((s,d)=>s+Q(tr,d.hCur,d.hV),0),cur)}</td></tr></table></div>
  <div class="card" style="margin-top:16px"><h4>📅 ${t("dailyTotals")}</h4>
   <div class="bar2">${days.map(d=>`<i title="D${d.ord}: ${fmt(dayPlanned(tr,ps,d),cur)}" style="background:${CCOL[d.cc]||tr.color};flex:${Math.max(dayPlanned(tr,ps,d),1)}"></i>`).join("")}</div>
   <table class="tbl"><tr><th>${t("day")}</th><th></th><th class="right">🏨</th><th class="right">⛽</th><th class="right">🍽</th><th class="right">🅿</th><th class="right">🎟</th><th class="right">✨</th><th class="right">${t("total")}</th></tr>
   ${days.map(d=>`<tr><td><b style="color:${CCOL[d.cc]||tr.color}">D${d.ord}</b></td><td style="max-width:220px">${esc(d.route||"")}</td>
    <td class="right">${fmt(Q(tr,d.hCur,d.hV),cur)}</td><td class="right">${fmt(d.fuelQ,cur)}</td><td class="right">${fmt(d.foodQ,cur)}</td>
    <td class="right">${fmt(d.parkQ,cur)}</td><td class="right">${fmt(dayActs(tr,ps,d.ord),cur)}</td><td class="right">${fmt(d.miscQ,cur)}</td>
    <td class="right money">${fmt(dayPlanned(tr,ps,d),cur)}</td></tr>`).join("")}
   <tr><td colspan="8"><b>${t("total")}</b></td><td class="right money">${fmt(daysSum,cur)}</td></tr>
   <tr><td colspan="8"><b>+ ${t("preTrip")}</b></td><td class="right money">${fmt(pre,cur)}</td></tr>
   <tr><td colspan="8" style="font-size:15px"><b>${t("grandTotal").toUpperCase()}</b></td><td class="right money" style="font-size:15px">${fmt(grand,cur)}</td></tr></table></div>
 </section>`;
 $("#preBtn").onclick=()=>openForm(t("preTrip"),
  [{k:"lines",l:"One per line:  description | amount",type:"textarea",arr:1}],
  {lines:(tr.pretrip||[]).map(p=>p.n+" | "+p.v)},
  out=>{const pretrip=out.lines.map(l=>{const m=l.split("|");return{n:(m[0]||"").trim(),v:parseFloat(m[1])||0}});
   fs.updateDoc(tripRef(tr.id),{pretrip}).then(()=>toast("✓"))});
}
