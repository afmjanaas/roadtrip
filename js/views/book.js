/* ================= TRIP BOOK — printable document ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,esc,fmt,fmtDate,stars,CCOL} from "../util.js";
import {Q,dayActs,dayPlanned,placesOfDay,plannedTotal,preTotal,spentTotal} from "../calc.js";

export function render(state){
 const tr=state.trip,cur=tr.currency,days=state.days,ps=state.places;
 const km=days.reduce((s,d)=>s+(d.km||0),0);
 const planned=plannedTotal(tr,days,ps),spent=spentTotal(tr,state.expenses);
 $("#view").innerHTML=`<section style="max-width:900px">
  <div style="display:flex;gap:10px;margin-bottom:16px" class="noprint">
   <button class="tbtn primary" onclick="window.print()">🖨 ${t("printPdf")}</button>
   <span class="pill">${t("bookHint")}</span></div>
  <div id="hero" style="border-radius:18px;margin-bottom:22px">
   ${tr.cover?`<img src="${tr.cover}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35" alt="">`:""}
   <div style="position:relative;z-index:2"><div class="kick">${esc(tr.sub||"FAMILY TRIP")}</div>
   <h2>${esc(tr.name)}</h2>${tr.name_ta?`<div class="ta tam" style="font-size:17px">${esc(tr.name_ta)}</div>`:""}
   <div class="tag">📅 ${fmtDate(tr.start)} → ${fmtDate(tr.end)} · ${days.length} ${t("days")} · ${km.toLocaleString()} km ${tr.vehicle?"· 🚙 "+esc(tr.vehicle):""}</div></div></div>
  <div class="stats">
   <div class="stat"><div class="v">${days.length}</div><div class="l">${t("days")}</div></div>
   <div class="stat"><div class="v">${km.toLocaleString()}</div><div class="l">km</div></div>
   <div class="stat"><div class="v">${fmt(planned,cur)}</div><div class="l">${t("planned")}</div></div>
   ${spent?`<div class="stat"><div class="v">${fmt(spent,cur)}</div><div class="l">${t("spent")}</div></div>`:""}
  </div>
  ${days.map(d=>{const acts=placesOfDay(ps,d.ord);
   return `<div class="card" style="margin:14px 0;break-inside:avoid;border-left:5px solid ${CCOL[d.cc]||tr.color}">
   <h4>${t("day")} ${d.ord} — ${fmtDate(d.date)} · ${esc(d.route||"")}</h4>
   <div style="font-size:12.5px;color:var(--ink2);margin-bottom:6px">${d.km?`🚗 ${d.km} km · ${esc(d.drv||"")} · `:""}🛏 ${esc(d.hotel||d.stay||"—")}${d.hV?` — ${fmt(Q(tr,d.hCur,d.hV),cur)}`:""}</div>
   ${d.photo?`<img src="${d.photo}" style="width:100%;max-height:260px;object-fit:cover;border-radius:10px;margin:6px 0" alt="">`:""}
   ${[["🌅",d.m],["☀",d.a],["🌆",d.e],["🌙",d.n]].filter(x=>x[1]).map(([i,x])=>`<div style="font-size:13px;margin:3px 0"><b>${i}</b> ${esc(x)}</div>`).join("")}
   ${acts.length?`<div style="font-size:12.5px;margin-top:6px"><b>🎟</b> ${acts.map(p=>esc(p.n)+(p.on&&p.fam?` (${fmt(Q(tr,p.cur,p.fam),cur)})`:"")).join(" · ")}</div>`:""}
   <div style="font-size:12px;color:var(--ink3);margin-top:6px">${t("dayTotal")}: <b>${fmt(dayPlanned(tr,ps,d),cur)}</b></div>
  </div>`}).join("")}
  <div class="card" style="break-inside:avoid"><h4>💰 ${t("budget")}</h4>
   <table class="tbl">
    ${days.map(d=>`<tr><td>D${d.ord} ${esc((d.stay||d.route||"").slice(0,40))}</td><td class="right money">${fmt(dayPlanned(tr,ps,d),cur)}</td></tr>`).join("")}
    <tr><td><b>+ ${t("preTrip")}</b></td><td class="right money">${fmt(preTotal(tr),cur)}</td></tr>
    <tr style="font-size:15px"><td><b>${t("grandTotal").toUpperCase()}</b></td><td class="right money">${fmt(planned,cur)}</td></tr></table></div>
  ${state.lists.length?`<div class="grid g2" style="margin-top:14px">${state.lists.map(l=>`
   <div class="card" style="break-inside:avoid"><h4>${esc(l.title)}</h4>
    ${l.items.map(i=>`<div style="font-size:12.5px;padding:2px 0">${i.done?"☑":"☐"} ${esc(i.t)}</div>`).join("")}</div>`).join("")}</div>`:""}
  <footer style="border:0">🧭 ${esc(tr.name)} — ${t("appName")}</footer>
 </section>`;
}
