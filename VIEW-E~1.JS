/* ================= EXPENSES (daily entry + CSV) ================= */
import {t,tb} from "./i18n.js";
import {$,esc,fmt,fmtDate,todayISO,downloadCSV,openForm,toast} from "./util.js";
import {EXCATS,CATLBL,Q,expHome,spentTotal,dayOrdForDate} from "./calc.js";
import {sub,subDoc,fs,user,serverTimestamp} from "./db.js";

export function render(state){
 const tr=state.trip,cur=tr.currency,exps=state.expenses;
 const curs=Object.keys(tr.fx||{QAR:1});
 const total=spentTotal(tr,exps);
 // group by date desc
 const byDate={};exps.forEach(e=>{(byDate[e.date]=byDate[e.date]||[]).push(e)});
 const dates=Object.keys(byDate).sort().reverse();
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("expenses")}</div>
  <div class="sec-sub">${esc(tr.name)} — ${t("spent")}: <b>${fmt(total,cur)}</b></div><div class="rule"></div>
  <div class="card"><h4>${t("addExpense")}</h4>
   <div class="exform">
    <label class="f">${t("date")}<input class="inp" type="date" id="exDate" value="${defDate(tr)}"></label>
    <label class="f">${t("category")}<select class="inp" id="exCat">${EXCATS.map(c=>`<option value="${c.k}">${c.i} ${t(CATLBL[c.k])}</option>`).join("")}</select></label>
    <label class="f">${t("amount")}<input class="inp" type="number" id="exAmt" step="any" inputmode="decimal" placeholder="0"></label>
    <label class="f">${t("currency")}<select class="inp" id="exCur">${curs.map(c=>`<option ${c===cur?"selected":""}>${c}</option>`).join("")}</select></label>
    <label class="f" style="grid-column:span 2">${t("note")}<input class="inp" id="exNote" placeholder="…"></label>
    <button class="tbtn primary" id="exAdd" style="height:36px">${t("addExpense")}</button>
   </div></div>
  <div style="display:flex;gap:10px;margin:14px 0;flex-wrap:wrap">
   <button class="tbtn" id="csvBtn">${t("exportCSV")}</button>
   <span class="pill">${exps.length} 🧾 · ${fmt(total,cur)}</span></div>
  <div id="exList">${dates.length?dates.map(dt=>{
    const list=byDate[dt],sum=list.reduce((s,e)=>s+expHome(tr,e),0);
    const ord=dayOrdForDate(state.days,dt);
    return `<div class="card" style="margin-bottom:12px"><h4>${fmtDate(dt)} ${ord?'<span class="chip">'+t("day")+" "+ord+"</span>":""}<span style="float:right" class="money">${fmt(sum,cur)}</span></h4>
     ${list.map(e=>{const c=EXCATS.find(x=>x.k===e.cat)||EXCATS[6];
      return `<div class="exrow"><span class="cat">${c.i}</span>
       <span class="h">${esc(e.note||t(CATLBL[e.cat]||"catOther"))}<div class="sub2">${t(CATLBL[e.cat]||"catOther")}${e.by?" · "+esc(e.by):""}${e.cur!==cur?" · "+e.amt+" "+e.cur:""}</div></span>
       <b class="money">${fmt(expHome(tr,e),cur)}</b>
       <button class="mini" data-ed="${e.id}" style="background:var(--card);border:1px solid var(--line);border-radius:6px;padding:2px 8px;cursor:pointer;color:var(--ink)">✎</button></div>`}).join("")}
    </div>`}).join(""):`<div class="sec-sub">${t("noExpenses")}</div>`}</div>
 </section>`;
 $("#exAdd").onclick=()=>{
  const amt=parseFloat($("#exAmt").value);
  if(!amt){toast(t("amount")+"?");return}
  const c=$("#exCur").value,date=$("#exDate").value||todayISO();
  fs.addDoc(sub(state.tripId,"expenses"),{
   date,dayOrd:dayOrdForDate(state.days,date),cat:$("#exCat").value,note:$("#exNote").value.trim(),
   cur:c,amt,amtHome:+(Q(tr,c,amt)).toFixed(2),by:(user()&&(user().displayName||user().email))||"",ts:serverTimestamp()})
  .then(()=>{toast("✓ "+fmt(Q(tr,c,amt),cur));$("#exAmt").value="";$("#exNote").value=""})};
 $("#csvBtn").onclick=()=>exportCSV(state);
 $("#exList").onclick=e=>{const b=e.target.closest("[data-ed]");if(!b)return;
  const ex=exps.find(x=>x.id===b.dataset.ed);if(!ex)return;
  openForm("✎ "+t("expenses"),[
   {k:"date",l:t("date"),type:"date"},{k:"cat",l:t("category"),type:"select",opts:EXCATS.map(c=>c.k)},
   {k:"amt",l:t("amount"),type:"number"},{k:"cur",l:t("currency"),type:"select",opts:curs},
   {k:"note",l:t("note"),full:1}],ex,
   out=>{out.amtHome=+(Q(tr,out.cur,out.amt)).toFixed(2);out.dayOrd=dayOrdForDate(state.days,out.date);
    fs.updateDoc(subDoc(state.tripId,"expenses",ex.id),out).then(()=>toast("✓"))},
   ()=>fs.deleteDoc(subDoc(state.tripId,"expenses",ex.id)))};
}
function defDate(tr){const today=todayISO();
 return (today>=tr.start&&today<=tr.end)?today:(today<tr.start?tr.start:tr.end)}
function exportCSV(state){
 const tr=state.trip,cur=tr.currency;
 const rows=[["Date","Day","Category","Note","Currency","Amount","Amount ("+cur+")","Entered by"]];
 [...state.expenses].sort((a,b)=>a.date<b.date?-1:1).forEach(e=>rows.push(
  [e.date,e.dayOrd||"",e.cat,e.note||"",e.cur,e.amt,expHome(tr,e).toFixed(2),e.by||""]));
 rows.push([]);rows.push(["TOTAL","","","","","",spentTotal(tr,state.expenses).toFixed(2),""]);
 downloadCSV((tr.name||"trip").replace(/\W+/g,"-").toLowerCase()+"-expenses.csv",rows)}
