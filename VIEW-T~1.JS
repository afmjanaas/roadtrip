/* ================= TRIPS HOME ================= */
import {tripsCol,fs,watch,signOut} from "./db.js";
import {t,tb,getLang,setLang} from "./i18n.js";
import {$,esc,fmtDate,dateRange,DOWS,openForm,pickImage,toast} from "./util.js";
import {seedGulfTrip} from "./seed.js";
import {batchSet,serverTimestamp} from "./db.js";

let unsub=null,trips=[];
export function render(state){
 document.body.className="notrip";
 $("#app").innerHTML=`<div id="main">
  <div id="topbar"><span class="crumb">🧭 ${t("appName")}</span>
   <div class="tb-right">
    <button class="tbtn" id="langBtn">${getLang()==="ta"?"A·அ":"அ"}</button>
    <button class="tbtn" id="darkBtn">◐</button>
    <button class="tbtn" id="outBtn">${t("signOut")}</button></div></div>
  <section><div class="sec-h">${tb("trips")}</div><div class="rule"></div>
   <div class="trips" id="tripGrid"></div>
   <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
    <button class="tbtn primary" id="newTrip">${t("newTrip")}</button>
    <button class="tbtn" id="seedBtn">🕋 ${t("loadSample")}</button></div>
  </section></div>`;
 $("#langBtn").onclick=()=>{setLang(getLang()==="ta"?"en":"ta");location.reload()};
 $("#darkBtn").onclick=()=>{const h=document.documentElement;h.dataset.theme=h.dataset.theme==="dark"?"light":"dark";localStorage.setItem("ftp_theme",h.dataset.theme)};
 $("#outBtn").onclick=()=>signOut();
 $("#newTrip").onclick=newTrip;
 $("#seedBtn").onclick=async()=>{toast("Creating the Gulf trip… (~10 s)");
  try{const id=await seedGulfTrip();toast("Done!");location.hash="#/t/"+id+"/overview"}
  catch(e){toast("Seed failed: "+e.message)}};
 if(unsub)unsub();
 unsub=watch(fs.query(tripsCol(),fs.orderBy("createdAt","desc")),ss=>{
  trips=ss.docs.map(d=>({id:d.id,...d.data()}));paint()});
 paint();
}
function paint(){const g=$("#tripGrid");if(!g)return;
 g.innerHTML=trips.length?trips.map(tr=>`
  <div class="tripcard" data-open="${tr.id}">
   <div class="cov">${tr.cover?'<img src="'+tr.cover+'" alt="">':"🧭"}</div>
   <div class="bd"><div class="nm">${esc(tr.name)}${tr.name_ta?'<div class="ta tam">'+esc(tr.name_ta)+'</div>':""}</div>
    <div class="dt">📅 ${fmtDate(tr.start)} → ${fmtDate(tr.end)}</div>
    <div class="row"><span class="chip">${esc(tr.currency||"QAR")}</span>${tr.vehicle?'<span class="pill">🚙 '+esc(tr.vehicle)+"</span>":""}</div>
   </div></div>`).join("")
 :'<div class="sec-sub">✨ '+t("loadSample")+' ↓</div>';
 g.onclick=e=>{const c=e.target.closest("[data-open]");if(c)location.hash="#/t/"+c.dataset.open+"/overview"}}

function newTrip(){
 openForm(t("newTrip"),[
  {k:"name",l:t("name"),full:1},{k:"start",l:t("startDate"),type:"date"},{k:"end",l:t("endDate"),type:"date"},
  {k:"currency",l:t("homeCur"),type:"select",opts:["QAR","SAR","AED","USD","EUR","INR","LKR"]},
  {k:"travelers",l:"👨‍👩‍👧 Travelers",type:"number",def:5},
  {k:"vehicle",l:"🚙 Vehicle"},{k:"color",l:t("colour"),type:"select",opts:["#8A1538","#1B5FAA","#0E7A45","#D97B29"]},
 ],{currency:"QAR"},async out=>{
  if(!out.name||!out.start||!out.end){toast("Name and dates are required");return}
  const fx={QAR:1,SAR:0.9707,AED:0.9913,USD:3.64,EUR:4.2,INR:0.042,LKR:0.012};
  const ref=await fs.addDoc(tripsCol(),{...out,fx:{...fx,[out.currency]:1},pretrip:[],createdAt:serverTimestamp()});
  // auto-create a day per date
  const dates=dateRange(out.start,out.end);
  await batchSet(ref.id,"days",dates.map((iso,i)=>({ord:i+1,date:iso,
   dow:DOWS[new Date(iso+"T12:00:00").getDay()],route:"Day "+(i+1),cc:"SA",km:0,drv:"",stay:"",hotel:"",
   hCur:out.currency,hV:0,m:"",a:"",e:"",n:"",fuel:[],food:"",fam:"",kids:"",wx:"",road:"",alt:"",
   fuelQ:0,foodQ:0,parkQ:0,miscQ:0,done:false,ta:{}})));
  location.hash="#/t/"+ref.id+"/itinerary"})}
