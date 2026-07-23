/* ================= BOOKINGS VAULT =================
   Every confirmation in one place — flights, hotels, tickets, car hire,
   activities — with reference code, date/time, cost and a voucher photo.
   Family-shared (same rules as trip data). Works offline once prepared. */
import {t,tb} from "../i18n.js";
import {$,esc,fmt,fmtDate,todayISO,openForm,pickImage,toast,downloadCSV} from "../util.js";
import {Q} from "../calc.js";
import {sub,subDoc,fs} from "../db.js";

const TYPES=[
 {k:"flight",i:"✈️"},{k:"hotel",i:"🏨"},{k:"car",i:"🚗"},{k:"train",i:"🚆"},
 {k:"ferry",i:"⛴"},{k:"activity",i:"🎟"},{k:"restaurant",i:"🍽"},{k:"visa",i:"🛂"},{k:"other",i:"📄"}];
const TI=Object.fromEntries(TYPES.map(x=>[x.k,x.i]));
const STATUS=[["confirmed","#0E7A45"],["pending","#b98a2e"],["cancelled","#b3271e"]];
const SC=Object.fromEntries(STATUS);

export function render(state){
 const tr=state.trip,cur=tr.currency;
 const list=[...state.bookings].sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")));
 const paid=list.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+Q(tr,b.cur||cur,b.cost||0),0);
 const today=todayISO();
 const upcoming=list.filter(b=>b.date>=today&&b.status!=="cancelled");
 $("#view").innerHTML=`<section style="max-width:860px">
  <div class="sec-h">🧾 ${tb("bookings")}</div>
  <div class="sec-sub">${t("bookingsSub")}</div><div class="rule"></div>
  <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
   <div class="stat"><div class="v">${list.length}</div><div class="l">${t("bookings")}</div></div>
   <div class="stat"><div class="v">${list.filter(b=>b.status==="confirmed").length}</div><div class="l">${t("st_confirmed")}</div></div>
   <div class="stat"><div class="v">${upcoming.length}</div><div class="l">${t("upcoming")}</div></div>
   <div class="stat"><div class="v">${fmt(paid,cur)}</div><div class="l">${t("bookedValue")}</div></div>
  </div>
  <div style="display:flex;gap:10px;margin:10px 0;flex-wrap:wrap">
   <button class="tbtn primary" id="addBk">＋ ${t("addBooking")}</button>
   <button class="tbtn" id="bkCsv">${t("exportCSV")}</button>
   <select class="inp" id="bkFilter" style="width:auto;margin:0">
    <option value="">${t("allTypes")}</option>${TYPES.map(x=>`<option value="${x.k}">${x.i} ${t("bk_"+x.k)}</option>`).join("")}</select>
  </div>
  <div id="bkList">${cards(state,list)}</div>
 </section>`;
 $("#addBk").onclick=()=>form(state,null);
 $("#bkCsv").onclick=()=>exportCSV(state);
 $("#bkFilter").onchange=e=>{const f=e.target.value;
  $("#bkList").innerHTML=cards(state,list.filter(b=>!f||b.type===f))};
 $("#bkList").addEventListener("click",e=>{
  let el;
  if(el=e.target.closest("[data-bkedit]"))return form(state,state.bookings.find(x=>x.id===el.dataset.bkedit));
  if(el=e.target.closest("[data-bkphoto]"))
   return pickImage(u=>fs.updateDoc(subDoc(state.tripId,"bookings",el.dataset.bkphoto),{voucher:u}).then(()=>toast("✓")),1280,.8);
  if(el=e.target.closest("[data-bkzoom]")){const b=state.bookings.find(x=>x.id===el.dataset.bkzoom);
   const ov=document.createElement("div");ov.className="ovl";ov.style.alignItems="center";
   ov.innerHTML=`<img src="${b.voucher}" style="max-width:96vw;max-height:92vh;border-radius:10px">`;
   ov.onclick=()=>ov.remove();document.body.appendChild(ov);return}});
}
function cards(state,list){
 const tr=state.trip,cur=tr.currency,today=todayISO();
 if(!list.length)return `<div class="sec-sub">${t("noBookings")}</div>`;
 let lastMonth="";
 return list.map(b=>{
  const mon=b.date?new Date(b.date+"T12:00:00").toLocaleDateString("en-GB",{month:"long",year:"numeric"}):"—";
  const head=mon!==lastMonth?`<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin:16px 0 6px">${mon}</div>`:"";
  lastMonth=mon;
  const st=b.status||"confirmed";
  const past=b.date<today;
  return head+`<div class="card" style="margin-bottom:10px;padding:0;overflow:hidden;${past?'opacity:.6;':''}${st==="cancelled"?'text-decoration:line-through;':''}" data-bk="${b.id}">
   <div style="display:flex;flex-wrap:wrap">
    <div style="width:78px;flex:none;background:var(--line2);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px;text-align:center">
     <div style="font-size:26px">${TI[b.type]||"📄"}</div>
     <div style="font-size:12px;font-weight:700">${b.date?fmtDate(b.date).replace(/,.*/,""):""}</div>
     ${b.time?`<div style="font-size:11px;color:var(--ink2)">${esc(b.time)}</div>`:""}</div>
    <div style="flex:1;min-width:200px;padding:12px 14px">
     <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
      <b style="font-size:15px">${esc(b.title||t("bk_"+(b.type||"other")))}</b>
      <span class="chip" style="background:${SC[st]};color:#fff">${t("st_"+st)}</span></div>
     ${b.detail?`<div style="font-size:13px;color:var(--ink2);margin-top:2px">${esc(b.detail)}</div>`:""}
     <div style="font-size:12.5px;color:var(--ink3);margin-top:4px">
      ${b.ref?`🎫 <b style="color:var(--ink);font-family:monospace">${esc(b.ref)}</b>`:""}
      ${b.cost?` · <b class="money" style="color:var(--accent)">${fmt(Q(tr,b.cur||cur,b.cost),cur)}</b>`:""}
      ${b.provider?` · ${esc(b.provider)}`:""}</div>
     <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="mini" data-bkedit="${b.id}">✎</button>
      <button class="mini" data-bkphoto="${b.id}">📷 ${b.voucher?t("change"):t("photo").replace("📷 ","")}</button>
      ${b.link?`<a class="gm" target="_blank" href="${esc(b.link)}">↗ ${t("open")}</a>`:""}
      ${b.voucher?`<button class="mini" data-bkzoom="${b.id}">🔍 ${t("voucher")}</button>`:""}</div>
    </div>
    ${b.voucher?`<div style="width:70px;flex:none;cursor:zoom-in" data-bkzoom="${b.id}"><img src="${b.voucher}" style="width:100%;height:100%;object-fit:cover" alt=""></div>`:""}
   </div></div>`}).join("");
}
function form(state,b){
 const isNew=!b;b=b||{date:todayISO(),type:"flight",status:"confirmed",cur:state.trip.currency};
 openForm(isNew?t("addBooking"):"✎ "+(b.title||t("bookings")),[
  {k:"type",l:t("type"),type:"select",opts:TYPES.map(x=>x.k)},
  {k:"status",l:t("status"),type:"select",opts:STATUS.map(s=>s[0])},
  {k:"title",l:t("name")+" (e.g. Emirates EK712, Rove Downtown)",full:1},
  {k:"detail",l:t("detail")+" (route, room type, seats…)",full:1},
  {k:"date",l:t("date"),type:"date"},{k:"time",l:t("time")+" (opt.)",type:"time"},
  {k:"ref",l:"🎫 "+t("confirmationNo")},{k:"provider",l:t("provider")+" (airline / site)"},
  {k:"cost",l:t("cost"),type:"number"},{k:"cur",l:t("currency"),type:"select",opts:Object.keys(state.trip.fx||{QAR:1})},
  {k:"link",l:"🔗 "+t("manageLink"),full:1}],b,
  out=>{const p=isNew?fs.addDoc(sub(state.tripId,"bookings"),{...out,voucher:""})
    :fs.updateDoc(subDoc(state.tripId,"bookings",b.id),out);
   p.then(()=>toast("✓"))},
  isNew?null:()=>fs.deleteDoc(subDoc(state.tripId,"bookings",b.id)))}
function exportCSV(state){
 const tr=state.trip,cur=tr.currency;
 const rows=[["Date","Time","Type","Title","Detail","Confirmation","Provider","Status","Cost","Currency","Cost ("+cur+")"]];
 [...state.bookings].sort((a,b)=>a.date.localeCompare(b.date)).forEach(b=>rows.push(
  [b.date,b.time||"",b.type,b.title||"",b.detail||"",b.ref||"",b.provider||"",b.status||"",b.cost||"",b.cur||cur,Q(tr,b.cur||cur,b.cost||0).toFixed(2)]));
 downloadCSV((tr.name||"trip").replace(/\W+/g,"-").toLowerCase()+"-bookings.csv",rows)}
