/* ================= ITINERARY (fully editable) ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,stars,dots,CCOL,DOWS,openForm,pickImage,toast} from "../util.js";
import {Q,dayActs,dayPlanned,placesOfDay,spentByDay} from "../calc.js";
import {sub,subDoc,fs,db} from "../db.js";

const CITYICON={"Abu Dhabi":"🕌","Dubai":"🌆","Hofuf (Al Ahsa)":"🏜","Riyadh":"🏙","Buraydah":"🐪","Hail":"🏰","AlUla":"🗿","Madinah":"🕌","Taif":"🌹","Al Baha":"🌲","Abha":"⛰","Rijal Almaa":"🏘","Makkah":"🕋"};
const wikiCache=JSON.parse(localStorage.getItem("ftp_wimg")||"{}");

const DAYF=st=>[
 {k:"date",l:t("date"),type:"date"},{k:"dow",l:"DOW (3 letters)"},
 {k:"cc",l:t("colour"),type:"select",opts:["QA","AE","SA","RET"]},
 {k:"route",l:"Route / title",full:1},
 {k:"km",l:"km",type:"number"},{k:"drv",l:"Drive time"},
 {k:"stay",l:"Overnight city"},
 {k:"hotel",l:"🏨 Hotel — name & notes",full:1},
 {k:"hCur",l:t("currency"),type:"select",opts:Object.keys(st.trip.fx||{QAR:1})},
 {k:"hV",l:"🏨 / night",type:"number"},
 {k:"m",l:"🌅 "+t("morning"),type:"textarea"},{k:"a",l:"☀ "+t("afternoon"),type:"textarea"},
 {k:"e",l:"🌆 "+t("evening"),type:"textarea"},{k:"n",l:"🌙 "+t("night"),type:"textarea"},
 {k:"fuel",l:t("fuelStops")+" (one per line)",type:"textarea",arr:1},
 {k:"food",l:t("food"),type:"textarea"},{k:"fam",l:t("famTip"),type:"textarea"},
 {k:"kids",l:t("kidsTip"),type:"textarea"},{k:"wx",l:t("weather")},
 {k:"road",l:t("roadNotes"),type:"textarea"},{k:"alt",l:t("alternative"),type:"textarea"},
 {k:"fuelQ",l:"⛽ "+t("budget"),type:"number"},{k:"foodQ",l:"🍽 "+t("budget"),type:"number"},
 {k:"parkQ",l:"🅿 "+t("budget"),type:"number"},{k:"miscQ",l:"✨ "+t("budget"),type:"number"}];
const ATTF=st=>[
 {k:"n",l:t("name"),full:1},{k:"city",l:"City"},
 {k:"s",l:"★ 1–5",type:"number",def:4},{k:"cur",l:t("currency"),type:"select",opts:Object.keys(st.trip.fx||{QAR:1})},
 {k:"fam",l:"🎟 Family cost",type:"number",def:0},{k:"cn",l:"Ticket note",def:"Free"},
 {k:"t",l:"⏱ Time",def:"1–2 h"},{k:"best",l:"🌅 Best time",def:"Evening"},
 {k:"park",l:"🅿 Parking",def:"—"},{k:"pray",l:"🕌 Prayer",def:"—"},
 {k:"kids",l:"🧒 0–5",type:"number",def:3},{k:"ph",l:"📷 0–5",type:"number",def:3},
 {k:"why",l:"Why visit",type:"textarea"},
 {k:"q",l:"Google Maps search",full:1},{k:"wiki",l:"Wikipedia title (auto photo)",full:1}];

export function render(state){
 const tr=state.trip,cur=tr.currency,days=state.days,places=state.places;
 const spent=spentByDay(tr,state.expenses);
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("itinerary")}</div>
  <div class="sec-sub">${esc(tr.name)} · ${days.length} ${t("days")}</div><div class="rule"></div>
  <div id="days">${days.map(d=>dayCard(state,d,spent[d.ord]||0)).join("")}</div>
  <div class="eaddrow" style="justify-content:center"><button class="ebtn" style="font-size:14px;padding:9px 20px" id="addDayBtn">${t("addDay")}</button></div>
 </section>`;
 wire(state);
 loadWikiImages(state);
}

function dayCard(state,d,actual){
 const tr=state.trip,cur=tr.currency;
 const acts=placesOfDay(state.places,d.ord);
 const tot=dayPlanned(tr,state.places,d);
 const ta=d.ta||{},lang=getLang();
 const tip=(label,en,taTxt)=>en?`<div class="tip"><b>${label}</b>${esc(en)}${taTxt?'<div class="ta tam">'+esc(taTxt)+"</div>":""}</div>`:"";
 return `<div class="day" id="day${d.ord}" data-day="${d.id}">
  <div class="day-head" style="border-left-color:${CCOL[d.cc]||tr.color}" data-toggle="1">
   <div class="dnum" style="background:${CCOL[d.cc]||tr.color}"><span class="n">${d.ord}</span><span class="d">${esc(d.dow||"")}</span></div>
   <div class="rt"><div class="r1">${esc(d.route||"")}</div>
    <div class="r2"><span>📅 ${fmtDate(d.date)}</span>${d.km?`<span>🚗 ${d.km} km · ${esc(d.drv||"")}</span>`:""}${d.stay?`<span>🛏 ${esc(d.stay)}</span>`:""}</div></div>
   <div class="day-ebtns" style="display:flex;gap:6px"><button class="ebtn" data-edit="${d.id}">✎</button><button class="ebtn" data-photo="${d.id}">📷</button></div>
   <div class="money-side"><div class="b">${fmt(tot,cur)}</div><div class="s">${t("dayBudget")}</div>
    ${actual?`<div class="s" style="color:${actual>tot?"var(--bad)":"var(--ok)"}">${t("actual")}: ${fmt(actual,cur)}</div>`:""}</div>
   <span class="car">▾</span></div>
  <div class="day-body">
   ${d.photo?`<div class="dayimg"><img src="${d.photo}" alt=""><button class="ebtn danger" data-photodel="${d.id}">${t("removePhoto")}</button></div>`:""}
   <div class="tl">
    ${slot("🌅 "+t("morning"),d.m,ta.m)}${slot("☀ "+t("afternoon"),d.a,ta.a)}
    ${slot("🌆 "+t("evening"),d.e,ta.e)}${slot("🌙 "+t("night"),d.n,ta.n)}
   </div>
   <div class="tipgrid">
    ${(d.fuel&&d.fuel.length)?`<div class="tip"><b>${t("fuelStops")}</b>${d.fuel.map(esc).join("<br>")}</div>`:""}
    ${tip(t("food"),d.food,ta.food)}${tip(t("famTip"),d.fam,ta.fam)}${tip(t("kidsTip"),d.kids,ta.kids)}
    ${tip(t("weather"),d.wx,ta.wx)}${tip(t("roadNotes"),d.road,ta.road)}${tip(t("alternative"),d.alt,ta.alt)}
    <div class="tip"><b>${t("tonight")}</b>${esc(d.hotel||"—")}${d.hV?` — <b>${fmt(Q(state.trip,d.hCur,d.hV),cur)}</b>/night`:""}
     ${d.stay?` <a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("hotels near "+d.stay)}">🗺</a>`:""}
     <button class="ebtn" data-edit="${d.id}">✎</button></div>
   </div>
   ${acts.length?`<div style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink3);margin-top:14px">${t("attractions")}</div>
   <div class="atts">${acts.map(p=>attCard(state,p)).join("")}</div>`:""}
   <div class="eaddrow"><button class="ebtn" data-addplace="${d.ord}">${t("addPlace")}</button>
    <button class="ebtn" data-edit="${d.id}">${t("editDay")}</button>
    <button class="ebtn" data-photo="${d.id}">${t("dayPhoto")}</button></div>
   <div class="dbudget"><div class="bh"><span>${t("day")} ${d.ord} ${t("budget")}</span>
     <label class="done-ck" style="display:flex;gap:6px;align-items:center;cursor:pointer;font-size:11px"><input type="checkbox" data-done="${d.id}" ${d.done?"checked":""}> ${t("markDone")}</label></div>
    ${brow(t("accommodation"),Q(state.trip,d.hCur,d.hV),cur)}
    ${brow(t("fuel")+(d.km?" ("+d.km+" km)":""),d.fuelQ,cur)}
    ${brow(t("foodB"),d.foodQ,cur)}${brow(t("parking"),d.parkQ,cur)}
    ${brow(t("activities"),dayActs(state.trip,state.places,d.ord),cur)}${brow(t("misc"),d.miscQ,cur)}
    <div class="brow tot"><span>${t("dayTotal")}</span><b>${fmt(tot,cur)}</b></div>
    ${actual?`<div class="brow"><span>💳 ${t("actual")}</span><b class="${actual>tot?"neg":"pos"}">${fmt(actual,cur)}</b></div>`:""}
   </div>
  </div></div>`}
const slot=(st,en,ta)=>en?`<div class="slot"><div class="st">${st}</div><div class="sx">${esc(en)}${ta?'<div class="ta tam">'+esc(ta)+"</div>":""}</div></div>`:"";
const brow=(l,v,cur)=>`<div class="brow"><span>${l}</span><b>${fmt(v||0,cur)}</b></div>`;

function attCard(state,p){
 const cur=state.trip.currency,cost=Q(state.trip,p.cur,p.fam);
 const ta=p.ta||{};
 const img=p.photo||wikiCache[p.wiki]||"";
 return `<div class="att ${p.on?"":"unsel"}" data-att="${p.id}">
  <div class="ph"><div class="fall" ${img?'style="display:none"':""}><span class="fi">${CITYICON[p.city]||"📍"}</span>${esc(p.city||"")}</div>
   <img ${img?'src="'+img+'"':""} data-wiki="${esc(p.wiki||"")}" alt="" style="${img?"":"display:none"}" loading="lazy">
   <span class="stars">${stars(p.s)}</span><span class="cost">${cost?fmt(cost,cur):"FREE"}</span></div>
  <div class="bd"><div class="nm">${esc(p.n)}${ta.n?'<div class="ta tam">'+esc(ta.n)+"</div>":""}</div>
   <div class="why">${esc(p.why||"")}${ta.why?'<div class="ta tam">'+esc(ta.why)+"</div>":""}</div>
   <div class="meta">${p.t?`<span>⏱ ${esc(p.t)}</span>`:""}${p.best?`<span>🌅 ${esc(p.best)}</span>`:""}${p.park?`<span>🅿 ${esc(p.park)}</span>`:""}<span>👧 ${dots(p.kids)}</span><span>📷 ${dots(p.ph)}</span></div>
   ${p.cn?`<div style="font-size:11px;color:var(--ink3)">🎟 ${esc(p.cn)}</div>`:""}</div>
  <div class="ft"><label><input type="checkbox" data-sel="${p.id}" ${p.on?"checked":""}> ${t("inBudget")}</label>
   ${p.q?`<a class="gm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}">🗺</a>`:""}
   <button class="ebtn" data-editatt="${p.id}">✎</button><button class="ebtn" data-attphoto="${p.id}">📷</button></div></div>`}

/* ---------- events ---------- */
function wire(state){
 const id=state.tripId;
 $("#view").onclick=e=>{
  const q=s=>e.target.closest(s);
  let el;
  if(el=q("[data-edit]")){e.stopPropagation();editDay(state,el.dataset.edit);return}
  if(el=q("[data-photo]")){e.stopPropagation();pickImage(u=>fs.updateDoc(subDoc(id,"days",el.dataset.photo),{photo:u}).then(()=>toast("✓")));return}
  if(el=q("[data-photodel]")){e.stopPropagation();fs.updateDoc(subDoc(id,"days",el.dataset.photodel),{photo:""});return}
  if(el=q("[data-addplace]")){e.stopPropagation();addPlace(state,+el.dataset.addplace);return}
  if(el=q("[data-editatt]")){e.stopPropagation();editPlace(state,el.dataset.editatt);return}
  if(el=q("[data-attphoto]")){e.stopPropagation();pickImage(u=>fs.updateDoc(subDoc(id,"places",el.dataset.attphoto),{photo:u}).then(()=>toast("✓")),900,.72);return}
  if(e.target.id==="addDayBtn"){addDay(state);return}
  if(el=q("[data-toggle]")){el.parentElement.classList.toggle("open")}};
 $("#view").onchange=e=>{
  const sel=e.target.closest("[data-sel]");
  if(sel){fs.updateDoc(subDoc(id,"places",sel.dataset.sel),{on:sel.checked});return}
  const dn=e.target.closest("[data-done]");
  if(dn){fs.updateDoc(subDoc(id,"days",dn.dataset.done),{done:dn.checked})}};
}

function editDay(state,docId){
 const d=state.days.find(x=>x.id===docId);if(!d)return;
 openForm(t("day")+" "+d.ord,DAYF(state),d,
  out=>fs.updateDoc(subDoc(state.tripId,"days",docId),out).then(()=>toast("✓")),
  ()=>deleteDay(state,d))}
async function deleteDay(state,d){
 const b=fs.writeBatch(db());
 state.places.filter(p=>p.dayOrd===d.ord).forEach(p=>b.delete(subDoc(state.tripId,"places",p.id)));
 state.places.filter(p=>p.dayOrd>d.ord).forEach(p=>b.update(subDoc(state.tripId,"places",p.id),{dayOrd:p.dayOrd-1}));
 state.days.filter(x=>x.ord>d.ord).forEach(x=>b.update(subDoc(state.tripId,"days",x.id),{ord:x.ord-1}));
 b.delete(subDoc(state.tripId,"days",d.id));
 await b.commit();toast("✓")}
function addDay(state){
 let pos=parseInt(prompt("Insert AFTER day number (0 = start):",state.days.length));
 if(isNaN(pos))pos=state.days.length;pos=Math.min(Math.max(pos,0),state.days.length);
 openForm(t("addDay"),DAYF(state),{cc:"SA",hCur:state.trip.currency,fuel:[],km:0,hV:0,fuelQ:0,foodQ:0,parkQ:0,miscQ:0,dow:"DAY",route:"New day"},
  async out=>{const b=fs.writeBatch(db());
   state.places.filter(p=>p.dayOrd>pos).forEach(p=>b.update(subDoc(state.tripId,"places",p.id),{dayOrd:p.dayOrd+1}));
   state.days.filter(x=>x.ord>pos).forEach(x=>b.update(subDoc(state.tripId,"days",x.id),{ord:x.ord+1}));
   b.set(fs.doc(sub(state.tripId,"days")),{...out,ord:pos+1,done:false,ta:{}});
   await b.commit();toast("✓")})}
function editPlace(state,docId){
 const p=state.places.find(x=>x.id===docId);if(!p)return;
 openForm(p.n,ATTF(state),p,
  out=>fs.updateDoc(subDoc(state.tripId,"places",docId),out).then(()=>toast("✓")),
  ()=>fs.deleteDoc(subDoc(state.tripId,"places",docId)))}
function addPlace(state,ord){
 const d=state.days.find(x=>x.ord===ord)||{};
 openForm(t("addPlace")+" — "+t("day")+" "+ord,ATTF(state),{cur:state.trip.currency,city:(d.stay||"")},
  out=>fs.addDoc(sub(state.tripId,"places"),{...out,dayOrd:ord,on:true,ta:{}}).then(()=>toast("✓")))}

/* wikipedia auto-photos for places without an uploaded photo */
async function loadWikiImages(state){
 if(!navigator.onLine)return;
 const need=[...new Set(state.places.filter(p=>!p.photo&&p.wiki&&wikiCache[p.wiki]===undefined).map(p=>p.wiki))].slice(0,30);
 if(!need.length)return;
 await Promise.all(need.map(async w=>{
  try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(w));
   if(!r.ok){wikiCache[w]=null;return}
   const j=await r.json();
   wikiCache[w]=(j.thumbnail&&j.thumbnail.source)?j.thumbnail.source.replace(/\/\d+px-/,"/640px-"):null;
  }catch(e){}}));
 localStorage.setItem("ftp_wimg",JSON.stringify(wikiCache));
 $$("#view img[data-wiki]").forEach(img=>{const u=wikiCache[img.dataset.wiki];
  if(u&&!img.src){img.src=u;img.style.display="block";
   const f=img.parentElement.querySelector(".fall");if(f)f.style.display="none"}})}
