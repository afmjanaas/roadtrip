/* ================= BUDGET vs ACTUAL ================= */
import {t,tb} from "./i18n.js";
import {$,esc,fmt,fmtDate,CCOL} from "./util.js";
import {EXCATS,CATLBL,dayPlanned,dayPlannedCats,spentByDay,spentByCat,spentTotal,plannedTotal,preTotal} from "./calc.js";

export function render(state){
 const tr=state.trip,cur=tr.currency,days=state.days,ps=state.places;
 const byDay=spentByDay(tr,state.expenses),byCat=spentByCat(tr,state.expenses);
 const planned=plannedTotal(tr,days,ps),spent=spentTotal(tr,state.expenses);
 const diff=planned-spent;
 let cumP=0,cumA=0;
 const rows=days.map(d=>{const p=dayPlanned(tr,ps,d),a=byDay[d.ord]||0;cumP+=p;cumA+=a;
  return {d,p,a,cumP,cumA}});
 const unassigned=byDay[0]||0;
 const maxPA=Math.max(...rows.map(r=>Math.max(r.p,r.a)),1);
 // planned by category (across days)
 const pCats={};days.forEach(d=>{const c=dayPlannedCats(tr,ps,d);Object.keys(c).forEach(k=>pCats[k]=(pCats[k]||0)+c[k])});
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("compare")}</div>
  <div class="sec-sub">${esc(tr.name)}</div><div class="rule"></div>
  <div class="stats">
   <div class="stat"><div class="v">${fmt(planned,cur)}</div><div class="l">${t("planned")}</div></div>
   <div class="stat"><div class="v">${fmt(spent,cur)}</div><div class="l">${t("spent")}</div></div>
   <div class="stat"><div class="v ${diff>=0?"pos":"neg"}" style="color:${diff>=0?"var(--ok)":"var(--bad)"}">${fmt(Math.abs(diff),cur)}</div>
    <div class="l">${diff>=0?t("underBudget"):t("overBudget")}</div></div>
  </div>
  <div class="card cmp" style="margin-top:10px"><h4>📊 ${t("plannedVsActual")}</h4>
   <table class="tbl"><tr><th>${t("day")}</th><th></th><th style="width:34%"></th><th class="right">${t("planned")}</th><th class="right">${t("actual")}</th><th class="right">${t("diff")}</th></tr>
   ${rows.map(({d,p,a})=>{const dd=p-a;
    return `<tr><td><b style="color:${CCOL[d.cc]||tr.color}">D${d.ord}</b></td><td>${fmtDate(d.date)}<div style="color:var(--ink3);font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.stay||d.route||"")}</div></td>
    <td><div class="bar2" style="height:9px"><i style="width:${p/maxPA*100}%;background:var(--line)"></i></div>
        <div class="bar2" style="height:9px"><i style="width:${Math.min(a/maxPA*100,100)}%;background:${a>p?"var(--bad)":"var(--ok)"}"></i></div></td>
    <td class="right">${fmt(p,cur)}</td><td class="right money">${a?fmt(a,cur):"—"}</td>
    <td class="right money ${dd>=0?"pos":"neg"}">${a?((dd>=0?"−":"+")+fmt(Math.abs(dd),cur).replace(cur+" ","")):"—"}</td></tr>`}).join("")}
   ${unassigned?`<tr><td colspan="4"><i>${t("preTrip")} / dates outside the trip</i></td><td class="right money">${fmt(unassigned,cur)}</td><td></td></tr>`:""}
   <tr style="font-size:14.5px"><td colspan="3"><b>${t("total")}</b> <span style="color:var(--ink3);font-size:11px">(incl. ${t("preTrip").toLowerCase()} ${fmt(preTotal(tr),cur)})</span></td>
    <td class="right money">${fmt(planned,cur)}</td><td class="right money">${fmt(spent,cur)}</td>
    <td class="right money ${diff>=0?"pos":"neg"}">${(diff>=0?"−":"+")+fmt(Math.abs(diff),cur).replace(cur+" ","")}</td></tr></table></div>
  <div class="card" style="margin-top:16px"><h4>🗂 ${t("byCategory")}</h4>
   <table class="tbl"><tr><th>${t("category")}</th><th style="width:40%"></th><th class="right">${t("planned")}</th><th class="right">${t("actual")}</th><th class="right">${t("diff")}</th></tr>
   ${EXCATS.map(c=>{const p=pCats[c.k]||0,a=byCat[c.k]||0;if(!p&&!a)return"";const m=Math.max(p,a,1);
    return `<tr><td>${c.i} ${t(CATLBL[c.k])}</td>
     <td><div class="bar2" style="height:9px"><i style="width:${p/m*100}%;background:var(--line)"></i></div>
         <div class="bar2" style="height:9px"><i style="width:${a/m*100}%;background:${a>p?"var(--bad)":"var(--ok)"}"></i></div></td>
     <td class="right">${fmt(p,cur)}</td><td class="right money">${a?fmt(a,cur):"—"}</td>
     <td class="right money ${p-a>=0?"pos":"neg"}">${a||p?((p-a>=0?"−":"+")+fmt(Math.abs(p-a),cur).replace(cur+" ","")):"—"}</td></tr>`}).join("")}</table>
   <div style="font-size:11px;color:var(--ink3);margin-top:8px">▦ grey = ${t("planned").toLowerCase()} · ▦ green/red = ${t("actual")}</div></div>
  <div class="card" style="margin-top:16px"><h4>📈 ${t("cumulative")}</h4>${cumChart(rows,cur)}</div>
 </section>`}

function cumChart(rows,cur){
 if(!rows.length)return"—";
 const W=700,H=200,P=30;
 const maxY=Math.max(rows[rows.length-1].cumP,rows[rows.length-1].cumA,1);
 const x=i=>P+i*(W-2*P)/Math.max(rows.length-1,1);
 const y=v=>H-P-(v/maxY)*(H-2*P);
 const path=k=>rows.map((r,i)=>(i?"L":"M")+x(i)+","+y(r[k])).join(" ");
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
  <line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" stroke="var(--line)"/>
  <path d="${path("cumP")}" fill="none" stroke="var(--ink3)" stroke-width="2" stroke-dasharray="5 4"/>
  <path d="${path("cumA")}" fill="none" stroke="var(--gold)" stroke-width="2.5"/>
  ${rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.cumA)}" r="2.5" fill="var(--gold)"><title>D${r.d.ord}: ${fmt(r.cumA,cur)} / ${fmt(r.cumP,cur)}</title></circle>`).join("")}
  <text x="${P}" y="14" style="font-size:11px;fill:var(--ink3)">--- ${t("planned")} · ─ ${t("actual")} (${t("cumulative").toLowerCase()})</text></svg>`}
