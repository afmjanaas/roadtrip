/* ================= STAYS — hotels night by night ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,esc,fmt,fmtDate,openForm,pickImage,toast} from "../util.js";
import {Q} from "../calc.js";
import {subDoc,fs} from "../db.js";

const STATUS=[["idea","#8d8878"],["shortlist","#b98a2e"],["booked","#0E7A45"],["paid","#1B5FAA"]];
const SCOL=Object.fromEntries(STATUS);

export function render(state){
 const tr=state.trip,cur=tr.currency,days=state.days;
 const nights=days.filter(d=>d.hV>0||(d.hotel&&d.hotel.trim()));
 const totalCost=days.reduce((s,d)=>s+Q(tr,d.hCur,d.hV),0);
 const booked=days.filter(d=>d.hStatus==="booked"||d.hStatus==="paid").length;
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("stays")}</div>
  <div class="sec-sub">${t("staysSub")}</div><div class="rule"></div>
  <div class="stats">
   <div class="stat"><div class="v">${nights.length}</div><div class="l">${t("nights")}</div></div>
   <div class="stat"><div class="v">${booked}/${nights.length}</div><div class="l">${t("stBooked")}</div></div>
   <div class="stat"><div class="v">${fmt(totalCost,cur)}</div><div class="l">${t("accommodation").replace("🏨 ","")}</div></div>
   <div class="stat"><div class="v">${fmt(nights.length?totalCost/nights.length:0,cur)}</div><div class="l">/ ${t("night").toLowerCase()}</div></div>
  </div>
  <div id="stayCards">${days.map(d=>card(state,d)).join("")}</div>
  ${guide()}
 </section>`;
 wire(state);
}

function card(state,d){
 const tr=state.trip,cur=tr.currency;
 const q=Q(tr,d.hCur,d.hV);
 const st=d.hStatus||"idea";
 const city=(d.stay||"").replace(/🛏|🏁|HOME —/g,"").trim();
 const out=nextDate(state,d);
 const noStay=!d.hV&&!(d.hotel&&d.hotel.trim());
 const opts=(d.hotelOpts||[]);
 return `<div class="card" style="margin-bottom:14px;padding:0;overflow:hidden" data-sd="${d.id}">
  <div style="display:flex;flex-wrap:wrap">
   <div style="width:230px;min-height:150px;flex:none;background:linear-gradient(135deg,#2e3d50,#4a3345);position:relative;display:flex;align-items:center;justify-content:center">
    ${d.hotelPhoto?`<img src="${d.hotelPhoto}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" alt="">`:`<span style="font-size:40px">🏨</span>`}
    <button class="ebtn" data-hph="${d.id}" style="position:absolute;bottom:8px;right:8px">📷</button>
    <span class="chip" style="position:absolute;top:8px;left:8px;background:${SCOL[st]};color:#fff">${t("st_"+st)}</span></div>
   <div style="flex:1;min-width:260px;padding:14px 16px">
    <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
     <span class="chip">${t("night")} ${d.ord}</span><b>${fmtDate(d.date)}${out?" → "+fmtDate(out):""}</b>
     ${city?`<span class="pill">📍 ${esc(city)}</span>`:""}</div>
    ${noStay?`<div class="sec-sub" style="margin:10px 0 6px">${t("noStay")}</div>`
    :`<div style="font-family:var(--serif);font-size:18px;margin:8px 0 2px">${esc(d.hotel||"—")}</div>
    <div style="font-size:13px;color:var(--ink2)">${d.hV?`<b class="money" style="font-size:15px;color:var(--accent)">${fmt(q,cur)}</b> / ${t("night").toLowerCase()}${d.hCur!==cur?` <span style="color:var(--ink3)">(${d.hV} ${d.hCur})</span>`:""}`:t("freeStay")}
     ${d.hRef?` · 🎫 ${esc(d.hRef)}`:""}</div>`}
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
     <select class="inp" style="width:auto;margin:0" data-hst="${d.id}">${STATUS.map(([k])=>`<option value="${k}" ${st===k?"selected":""}>${t("st_"+k)}</option>`).join("")}</select>
     <button class="tbtn" data-hedit="${d.id}">✎ ${t("edit").replace("✎ ","")}</button>
     ${city?`<a class="gm" style="align-self:center" target="_blank" href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${d.date}&checkout=${out||d.date}&group_adults=2&group_children=3">🔎 Booking.com</a>
     <a class="gm" style="align-self:center" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((d.hotel&&d.hotel.trim()?d.hotel+" ":"hotels ")+city)}">🗺 Maps</a>`:""}
    </div>
    ${opts.length?`<div style="margin-top:12px;font-size:10.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3)">${t("alternatives")}</div>
    ${opts.map((o,i)=>{const oq=Q(state.trip,o.cur||d.hCur,o.v);const diff=oq-q;
     return `<div class="exrow"><span class="cat">🏨</span>
      <span class="h"><b>${esc(o.n)}</b>${o.rating?` <span style="color:var(--gold)">★ ${esc(String(o.rating))}</span>`:""}
       ${o.note?`<div class="sub2">${esc(o.note)}</div>`:""}</span>
      <span style="text-align:right"><b class="money">${fmt(oq,state.trip.currency)}</b>
       ${d.hV?`<div class="sub2 ${diff<=0?"pos":"neg"}" style="font-size:11px">${diff===0?"=":(diff<0?"−":"+")+fmt(Math.abs(diff),state.trip.currency).replace(state.trip.currency+" ","")}</div>`:""}</span>
      ${o.link?`<a class="gm" target="_blank" href="${esc(o.link)}">↗</a>`:""}
      <button class="mini stbtn" data-pick="${d.id}:${i}">✔ ${t("chooseThis")}</button>
      <button class="mini stbtn" data-oedit="${d.id}:${i}">✎</button></div>`}).join("")}`:""}
    <div class="eaddrow" style="margin:10px 0 2px"><button class="ebtn" data-oadd="${d.id}">${t("addAlt")}</button></div>
   </div></div></div>`}

function nextDate(state,d){const n=state.days.find(x=>x.ord===d.ord+1);return n?n.date:""}

function guide(){
 const en=["👨‍👩‍👧‍👦 One family room for 5 (or connecting rooms) — confirm max occupancy in writing","↩ Free cancellation — plans shift on road trips; never prepay non-refundable early","🅿 Free on-site parking — you have a car every single night","🍳 Breakfast included for 5 can be worth more than the room discount","🏊 Pool = the kids' daily reward (check hours & kids' rules)","📍 Location beats stars: near the evening attraction & an easy morning exit to the highway","🕐 Check-in time vs your arrival (late arrival? message the hotel ahead)","🧺 Aparthotel with kitchen + laundry every 4–5 nights saves money and sanity","🕌 Mosque / prayer space nearby; in Makkah & Madinah pay for WALKING distance to the Haram","⭐ Reviews: 8.0+ score with 500+ reviews beats a 9.5 with 20; read the recent family reviews","💳 Compare the TOTAL with taxes/fees, not the nightly teaser price; Genius/loyalty discounts help","🛏 Ask for ground floor / quiet side; carry a travel cot sheet for Alina"];
 const ta=["👨‍👩‍👧‍👦 5 பேருக்கு ஒரே குடும்ப அறை (அல்லது இணைப்பு அறைகள்) — எழுத்துப்பூர்வ உறுதி","↩ இலவச ரத்து — சாலைப் பயணத்தில் திட்டம் மாறும்; முன்பணம் வேண்டாம்","🅿 இலவச பார்க்கிங் — தினமும் கார் உண்டு","🍳 5 பேருக்கு காலை உணவு சேர்ந்தது பெரிய மதிப்பு","🏊 நீச்சல் குளம் = குழந்தைகளின் தினசரி பரிசு","📍 நட்சத்திரங்களை விட இடம் முக்கியம்: மாலை இடத்திற்கு அருகில், காலை நெடுஞ்சாலைக்கு எளிதாக","🕐 செக்-இன் நேரம் vs உங்கள் வருகை — தாமதமானால் முன்பே தெரிவிக்கவும்","🧺 4–5 இரவுக்கு ஒரு முறை சமையலறை + சலவை உள்ள அபார்ட்-ஹோட்டல்","🕌 அருகில் மசூதி; மக்கா/மதீனாவில் ஹராமுக்கு நடந்து செல்லும் தூரத்திற்கு பணம் கொடுங்கள்","⭐ 500+ மதிப்புரைகளுடன் 8.0+ சிறந்தது; சமீபத்திய குடும்ப மதிப்புரைகளைப் படியுங்கள்","💳 வரி/கட்டணத்துடன் மொத்தத்தை ஒப்பிடுங்கள், இரவு விலையை அல்ல","🛏 தரை தளம் / அமைதியான பக்கம் கேளுங்கள்"];
 return `<div class="card" style="margin-top:20px"><h4>🧠 ${t("howToChoose")}</h4>
  <div class="grid g2" style="gap:4px 24px">${en.map((x,i)=>`<div class="kv" style="border-bottom:1px dashed var(--line2)"><span class="k" style="color:var(--ink)">${x}${ta[i]?`<div class="ta tam">${ta[i]}</div>`:""}</span></div>`).join("")}</div></div>`}

/* ---------- events ---------- */
function wire(state){
 const id=state.tripId;
 const dayById=x=>state.days.find(d=>d.id===x);
 $("#view").onchange=e=>{const s=e.target.closest("[data-hst]");
  if(s)fs.updateDoc(subDoc(id,"days",s.dataset.hst),{hStatus:s.value}).then(()=>toast("✓"))};
 $("#view").onclick=e=>{
  let el;
  if(el=e.target.closest("[data-hph]"))
   return pickImage(u=>fs.updateDoc(subDoc(id,"days",el.dataset.hph),{hotelPhoto:u}).then(()=>toast("✓")),900,.72);
  if(el=e.target.closest("[data-hedit]")){const d=dayById(el.dataset.hedit);
   return openForm("🏨 "+t("night")+" "+d.ord+" — "+fmtDate(d.date),[
    {k:"hotel",l:t("name"),full:1},
    {k:"hCur",l:t("currency"),type:"select",opts:Object.keys(state.trip.fx||{QAR:1})},
    {k:"hV",l:t("amount")+" / "+t("night").toLowerCase(),type:"number"},
    {k:"hRef",l:"🎫 Booking ref / confirmation no."},
    {k:"stay",l:"📍 City"}],d,
    out=>fs.updateDoc(subDoc(id,"days",d.id),out).then(()=>toast("✓")))}
  if(el=e.target.closest("[data-oadd]")){const d=dayById(el.dataset.oadd);
   return altForm(state,d,null)}
  if(el=e.target.closest("[data-oedit]")){const [did,i]=el.dataset.oedit.split(":");
   return altForm(state,dayById(did),+i)}
  if(el=e.target.closest("[data-pick]")){const [did,i]=el.dataset.pick.split(":");
   const d=dayById(did);const o=(d.hotelOpts||[])[+i];if(!o)return;
   const opts=[...d.hotelOpts];
   opts[+i]=d.hotel?{n:d.hotel,v:d.hV,cur:d.hCur,rating:"",note:t("st_idea"),link:""}:opts[+i];
   if(!d.hotel)opts.splice(+i,1);
   fs.updateDoc(subDoc(id,"days",d.id),{hotel:o.n,hV:o.v||0,hCur:o.cur||d.hCur,hotelOpts:opts,hStatus:"shortlist"})
    .then(()=>toast("✔ "+o.n));return}
 };
}
function altForm(state,d,idx){
 const opts=[...(d.hotelOpts||[])];
 const vals=idx==null?{cur:d.hCur||state.trip.currency}:opts[idx];
 openForm(idx==null?t("addAlt"):"✎ "+vals.n,[
  {k:"n",l:t("name"),full:1},
  {k:"v",l:t("amount")+" / "+t("night").toLowerCase(),type:"number"},
  {k:"cur",l:t("currency"),type:"select",opts:Object.keys(state.trip.fx||{QAR:1})},
  {k:"rating",l:"★ Rating (e.g. 8.4)"},
  {k:"note",l:t("note")+" — distance, breakfast, parking…",full:1},
  {k:"link",l:"🔗 Link (Booking/Agoda/…)",full:1}],vals,
  out=>{if(idx==null)opts.push(out);else opts[idx]=out;
   fs.updateDoc(subDoc(state.tripId,"days",d.id),{hotelOpts:opts}).then(()=>toast("✓"))},
  idx==null?null:()=>{opts.splice(idx,1);
   fs.updateDoc(subDoc(state.tripId,"days",d.id),{hotelOpts:opts}).then(()=>toast("✓"))})}
