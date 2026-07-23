/* ================= SOS — emergency, medical & Arabic card =================
   Works fully offline. Country-aware: shows the right numbers for wherever
   you are today, based on the day's country code. */
import {t,tb} from "../i18n.js";
import {$,esc,fmtDate,todayISO,openForm,toast} from "../util.js";
import {tripRef,subDoc,fs} from "../db.js";

const COUNTRY={
 QA:{f:"🇶🇦",n:"Qatar",n_ta:"கத்தார்",nums:[["Emergency (all)","999"],["Hamad road service","40407407"]],
     emb:["Sri Lanka Embassy, Doha","+974 4467 4038"]},
 AE:{f:"🇦🇪",n:"UAE",n_ta:"UAE",nums:[["Police","999"],["Ambulance","998"],["Fire","997"],["Saaed (Abu Dhabi accidents)","80072233"]],
     emb:["Sri Lanka Embassy, Abu Dhabi","+971 2 631 6444"]},
 SA:{f:"🇸🇦",n:"Saudi Arabia",n_ta:"சவூதி அரேபியா",nums:[["Emergency (unified)","911"],["Ambulance","997"],["Traffic / accidents","993"],["Highway security","996"],["Najm (insurance)","920000560"]],
     emb:["Sri Lanka Embassy, Riyadh","+966 11 460 8689"]},
 OM:{f:"🇴🇲",n:"Oman",n_ta:"ஓமான்",nums:[["Emergency (all)","9999"],["Royal Oman Police","24560099"]],
     emb:["Sri Lanka Embassy, Muscat","+968 2469 8383"]},
 RET:{f:"🇸🇦",n:"Saudi Arabia",n_ta:"சவூதி அரேபியா",nums:[["Emergency (unified)","911"],["Ambulance","997"],["Traffic / accidents","993"],["Najm (insurance)","920000560"]],
     emb:["Sri Lanka Embassy, Riyadh","+966 11 460 8689"]}};

const PHRASES=[
 ["Help!","النجدة","an-najda","உதவி!"],
 ["I need a doctor","أحتاج طبيب","ahtaj tabeeb","எனக்கு மருத்துவர் வேண்டும்"],
 ["My child is sick","طفلي مريض","tifli mareed","என் குழந்தை நோய்வாய்ப்பட்டுள்ளது"],
 ["Where is the hospital?","أين المستشفى؟","ayna al-mustashfa","மருத்துவமனை எங்கே?"],
 ["Where is the pharmacy?","أين الصيدلية؟","ayna as-saydaliya","மருந்தகம் எங்கே?"],
 ["Please call this number","من فضلك اتصل بهذا الرقم","min fadlik ittasil bihadha ar-raqam","இந்த எண்ணுக்கு அழையுங்கள்"],
 ["Take me to this address","خذني إلى هذا العنوان","khudhni ila hadha al-unwan","இந்த முகவரிக்கு அழைத்துச் செல்லுங்கள்"],
 ["My car broke down","سيارتي تعطلت","sayyarati ta'attalat","என் கார் பழுதாகிவிட்டது"],
 ["I need a tow truck","أحتاج سطحة","ahtaj sat-ha","இழுவை வண்டி வேண்டும்"],
 ["My tyre is punctured","إطاري مثقوب","itari mathqoob","டயர் பஞ்சர் ஆகிவிட்டது"],
 ["Where is the nearest petrol station?","أين أقرب محطة وقود؟","ayna aqrab mahattat wuqood","அருகில் எரிபொருள் நிலையம் எங்கே?"],
 ["We are lost","نحن تائهون","nahnu ta'ihoon","நாங்கள் வழி தவறிவிட்டோம்"],
 ["Water, please","ماء من فضلك","ma' min fadlik","தண்ணீர், தயவுசெய்து"],
 ["Where is the toilet?","أين الحمام؟","ayna al-hammam","கழிவறை எங்கே?"],
 ["Where is the mosque?","أين المسجد؟","ayna al-masjid","மசூதி எங்கே?"],
 ["I don't speak Arabic","لا أتكلم العربية","la atakallam al-arabiya","எனக்கு அரபு தெரியாது"]];

export function render(state){
 const tr=state.trip,today=todayISO();
 let d=state.days.find(x=>x.date===today);
 if(!d)d=(today<tr.start)?state.days[0]:state.days[state.days.length-1];
 const c=COUNTRY[d&&d.cc]||COUNTRY.SA;
 const sos=tr.sos||{};
 const med=sos.medical||[],pol=sos.policies||[],con=sos.contacts||[];
 const city=(d&&d.stay||"").replace(/🛏|🏁|HOME —|\(\d\/\d\)/g,"").trim();
 $("#view").innerHTML=`<section style="max-width:820px">
  <div class="sec-h">🆘 ${tb("sos")}</div>
  <div class="sec-sub">${t("sosSub")}</div><div class="rule"></div>

  <div class="card" style="border-color:var(--bad);border-width:2px">
   <h4 style="color:var(--bad)">${c.f} ${t("youAreIn")} ${esc(c.n)}
    <span class="chip" style="float:right">${d?t("day")+" "+d.ord+" · "+fmtDate(d.date):""}</span></h4>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px">
    ${c.nums.map((n,i)=>`<a href="tel:${n[1]}" class="sosbtn ${i===0?"big":""}">
      <span class="lbl">${esc(n[0])}</span><span class="num">${esc(n[1])}</span></a>`).join("")}
   </div>
   <div class="kv" style="margin-top:12px"><span class="k">🇱🇰 ${esc(c.emb[0])}</span>
    <span class="v"><a href="tel:${c.emb[1].replace(/\s/g,"")}">${esc(c.emb[1])}</a></span></div>
   <div style="font-size:11px;color:var(--ink3);margin-top:6px">${t("verifyNumbers")}</div>
  </div>

  <div class="card" style="margin-top:14px"><h4>🏨 ${t("tonightWhere")}
    <button class="tbtn" data-arabic="${d?d.id:""}" style="float:right">✎ ${t("arabicAddress")}</button></h4>
   ${d?`<div style="font-family:var(--serif);font-size:18px">${esc(d.hotel||"—")}</div>
   <div style="font-size:13px;color:var(--ink2)">${esc(city)}${d.hRef?" · 🎫 "+esc(d.hRef):""}</div>
   ${d.hotelAr?`<div class="arcard">${esc(d.hotelAr)}</div>`:`<div class="sec-sub" style="margin:8px 0 0">${t("noArabic")}</div>`}
   <div style="margin-top:10px"><a class="gm" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((d.hotel||"")+" "+city)}&travelmode=driving">🧭 ${t("navigate")}</a></div>`:"—"}
  </div>

  <div class="card" style="margin-top:14px"><h4>🩺 ${t("medical")}
    <button class="tbtn" id="addMed" style="float:right">＋</button></h4>
   ${med.length?med.map((m,i)=>`<div class="exrow"><span class="cat">🧍</span>
     <span class="h"><b>${esc(m.name)}</b>${m.dob?" · "+esc(m.dob):""}
      <div class="sub2">🩸 ${esc(m.blood||"—")} · ${t("allergies")}: ${esc(m.allergy||"—")}${m.meds?" · "+esc(m.meds):""}</div></span>
     <button class="mini" data-med="${i}">✎</button></div>`).join("")
   :`<div class="sec-sub" style="margin:0">${t("noMedical")}</div>`}
  </div>

  <div class="card" style="margin-top:14px"><h4>📄 ${t("policies")}
    <button class="tbtn" id="addPol" style="float:right">＋</button></h4>
   ${pol.length?pol.map((p,i)=>`<div class="kv"><span class="k">${esc(p.n)}</span>
     <span class="v">${esc(p.v)}${p.tel?` · <a href="tel:${esc(p.tel.replace(/\s/g,""))}">${esc(p.tel)}</a>`:""}
     <button class="mini" data-pol="${i}">✎</button></span></div>`).join("")
   :`<div class="sec-sub" style="margin:0">${t("noPolicies")}</div>`}
  </div>

  <div class="card" style="margin-top:14px"><h4>🗣 ${t("arabicCard")}</h4>
   <div class="sec-sub" style="margin-bottom:8px">${t("arabicCardSub")}</div>
   ${PHRASES.map(p=>`<div class="phrase">
     <div class="en">${esc(p[0])}<div class="ta tam">${esc(p[3])}</div></div>
     <div class="ar">${esc(p[1])}<div class="tr">${esc(p[2])}</div></div></div>`).join("")}
  </div>
 </section>`;

 $("#addMed").onclick=()=>medForm(state,null);
 $("#addPol").onclick=()=>polForm(state,null);
 $("#view").addEventListener("click",e=>{
  let el;
  if(el=e.target.closest("[data-med]"))return medForm(state,+el.dataset.med);
  if(el=e.target.closest("[data-pol]"))return polForm(state,+el.dataset.pol);
  if(el=e.target.closest("[data-arabic]")){
   const day=state.days.find(x=>x.id===el.dataset.arabic);if(!day)return;
   openForm("🏨 "+t("arabicAddress"),[{k:"hotelAr",l:t("arabicAddressHint"),type:"textarea"}],day,
    out=>fs.updateDoc(subDoc(state.tripId,"days",day.id),{hotelAr:out.hotelAr}).then(()=>toast("✓")))}});
}
function saveSos(state,patch){
 const sos={...(state.trip.sos||{}),...patch};
 return fs.updateDoc(tripRef(state.tripId),{sos}).then(()=>toast("✓"))}
function medForm(state,idx){
 const list=[...((state.trip.sos||{}).medical||[])];
 openForm(idx==null?t("medical"):"✎ "+list[idx].name,[
  {k:"name",l:t("name"),full:1},{k:"dob",l:t("dob")},{k:"blood",l:"🩸 "+t("bloodType")},
  {k:"allergy",l:t("allergies"),full:1},{k:"meds",l:t("medications"),full:1}],
  idx==null?{}:list[idx],
  out=>{if(idx==null)list.push(out);else list[idx]=out;saveSos(state,{medical:list})},
  idx==null?null:()=>{list.splice(idx,1);saveSos(state,{medical:list})})}
function polForm(state,idx){
 const list=[...((state.trip.sos||{}).policies||[])];
 openForm(idx==null?t("policies"):"✎ "+list[idx].n,[
  {k:"n",l:t("name")+" (e.g. Car insurance)",full:1},{k:"v",l:t("policyNo"),full:1},{k:"tel",l:t("hotline")}],
  idx==null?{}:list[idx],
  out=>{if(idx==null)list.push(out);else list[idx]=out;saveSos(state,{policies:list})},
  idx==null?null:()=>{list.splice(idx,1);saveSos(state,{policies:list})})}
