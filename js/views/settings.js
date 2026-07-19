/* ================= SETTINGS ================= */
import {t,tb,getLang,setLang} from "../i18n.js";
import {$,esc,toast,pickImage} from "../util.js";
import {tripRef,fs,configRef,deleteTripDeep,user,tripsCol,batchSet,serverTimestamp} from "../db.js";
async function writeTrip(d,name){
 const clean=o=>{const {id,...rest}=o;return rest};
 const ref=await fs.addDoc(tripsCol(),{...d.trip,name,createdAt:serverTimestamp()});
 for(const k of ["days","places","stops","expenses","lists","guides","journal","fuel"])
  if(d[k]&&d[k].length)await batchSet(ref.id,k,d[k].map(clean));
 return ref.id}

export function render(state){
 const tr=state.trip,cfg=state.config||{allowedEmails:[]};
 const curs=Object.keys(tr.fx||{QAR:1});
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("settings")}</div><div class="rule"></div>
  <div class="grid g2">
   <div class="card"><h4>🧳 ${t("tripSettings")}</h4>
    <label class="f">${t("name")}<input class="inp" id="sName" value="${esc(tr.name)}"></label>
    <label class="f" style="margin-top:8px">${t("name")} (தமிழ்)<input class="inp" id="sNameTa" value="${esc(tr.name_ta||"")}"></label>
    <div style="display:flex;gap:10px;margin-top:8px">
     <label class="f" style="flex:1">${t("startDate")}<input class="inp" type="date" id="sStart" value="${esc(tr.start)}"></label>
     <label class="f" style="flex:1">${t("endDate")}<input class="inp" type="date" id="sEnd" value="${esc(tr.end)}"></label></div>
    <div style="display:flex;gap:10px;margin-top:8px">
     <label class="f" style="flex:1">👨‍👩‍👧 Travelers<input class="inp" type="number" id="sTrav" value="${tr.travelers||1}"></label>
     <label class="f" style="flex:1">🚙 Vehicle<input class="inp" id="sVeh" value="${esc(tr.vehicle||"")}"></label></div>
    <label class="f" style="margin-top:8px">${t("colour")}<input class="inp" type="color" id="sColor" value="${esc(tr.color||"#8A1538")}"></label>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
     <button class="tbtn primary" id="sSave">${t("save")}</button>
     <button class="tbtn" id="sCover">${t("cover")}</button></div></div>
   <div class="card"><h4>💱 ${t("homeCur")}: ${esc(tr.currency)}</h4>
    <div class="sec-sub" style="margin-bottom:8px">${t("fxNote")}</div>
    <div id="fxRows">${curs.map(c=>`<div class="kv"><span class="k">1 ${c} =</span>
     <span class="v"><input class="inp" style="width:110px;text-align:right" data-fx="${c}" type="number" step="any" value="${tr.fx[c]}" ${c===tr.currency?"disabled":""}> ${esc(tr.currency)}</span></div>`).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
     <input class="inp" id="fxNew" placeholder="Add currency e.g. USD" style="max-width:160px;text-transform:uppercase">
     <button class="tbtn" id="fxAdd">＋</button><button class="tbtn primary" id="fxSave">${t("save")}</button></div></div>
   <div class="card"><h4>👨‍👩‍👧 ${t("family")}</h4>
    <div class="sec-sub" style="margin-bottom:8px">${t("allowedEmails")} — <b>also update firestore.rules if you hardcoded emails there</b></div>
    <textarea class="inp" id="famEmails" style="min-height:90px">${esc((cfg.allowedEmails||[]).join("\n"))}</textarea>
    <div style="margin-top:10px"><button class="tbtn primary" id="famSave">${t("save")}</button></div></div>
   <div class="card"><h4>⚙ ${t("appSettings")}</h4>
    <div class="kv"><span class="k">${t("language")}</span><span class="v"><button class="tbtn" id="sLang">${getLang()==="ta"?"தமிழ் + English ✓":"English"}</button></span></div>
    <div class="kv"><span class="k">${t("theme")}</span><span class="v"><button class="tbtn" id="sDark">◐</button></span></div>
    <div class="kv"><span class="k">Signed in</span><span class="v">${esc(user()?user().email:"")}</span></div></div>
  </div>
  <div class="card" style="margin-top:16px"><h4>🗃 ${t("dataTools")}</h4>
   <div style="display:flex;gap:10px;flex-wrap:wrap">
    <button class="tbtn" id="expTrip">${t("exportTrip")}</button>
    <button class="tbtn" id="impTrip">${t("importTrip")}</button>
    <button class="tbtn" id="dupTrip">${t("duplicateTrip")}</button></div>
   <div style="font-size:12px;color:var(--ink3);margin-top:8px">${t("dataToolsNote")}</div></div>
  <div class="card" style="margin-top:16px;border-color:var(--warn)"><h4 style="color:var(--warn)">⚠ ${t("dangerZone")}</h4>
   <button class="tbtn danger" id="delTrip">${t("deleteTrip")}</button></div>
 </section>`;
 $("#sSave").onclick=()=>fs.updateDoc(tripRef(tr.id),{
   name:$("#sName").value.trim()||tr.name,name_ta:$("#sNameTa").value.trim(),
   start:$("#sStart").value||tr.start,end:$("#sEnd").value||tr.end,
   travelers:parseInt($("#sTrav").value)||1,vehicle:$("#sVeh").value.trim(),color:$("#sColor").value})
  .then(()=>toast("✓"));
 $("#sCover").onclick=()=>pickImage(u=>fs.updateDoc(tripRef(tr.id),{cover:u}).then(()=>toast("✓")),900,.7);
 $("#fxAdd").onclick=()=>{const c=$("#fxNew").value.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(c)){toast("3-letter code");return}
  fs.updateDoc(tripRef(tr.id),{["fx."+c]:1}).then(()=>toast("✓"))};
 $("#fxSave").onclick=()=>{const fx={...tr.fx};
  document.querySelectorAll("[data-fx]").forEach(i=>{fx[i.dataset.fx]=parseFloat(i.value)||1});
  fx[tr.currency]=1;fs.updateDoc(tripRef(tr.id),{fx}).then(()=>toast("✓"))};
 $("#famSave").onclick=()=>{const emails=$("#famEmails").value.split("\n").map(s=>s.trim()).filter(Boolean);
  if(user()&&!emails.includes(user().email)){toast("Keep your own email in the list!");return}
  fs.updateDoc(configRef(),{allowedEmails:emails}).then(()=>toast("✓")).catch(e=>toast(e.message))};
 $("#sLang").onclick=()=>{setLang(getLang()==="ta"?"en":"ta");location.reload()};
 $("#sDark").onclick=()=>{const h=document.documentElement;h.dataset.theme=h.dataset.theme==="dark"?"light":"dark";localStorage.setItem("ftp_theme",h.dataset.theme)};
 $("#expTrip").onclick=()=>{
  const data={v:1,app:"ftp-trip",trip:{...tr},days:state.days,places:state.places,stops:state.stops,
   expenses:state.expenses,lists:state.lists,guides:state.guides,journal:state.journal||[],fuel:state.fuel||[]};
  delete data.trip.id;delete data.trip.createdAt;
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}));
  a.download=(tr.name||"trip").replace(/\W+/g,"-").toLowerCase()+"-export.json";a.click()};
 $("#impTrip").onclick=()=>{const i=document.createElement("input");i.type="file";i.accept=".json,application/json";
  i.onchange=async()=>{const f=i.files[0];if(!f)return;
   try{const d=JSON.parse(await f.text());if(d.app!=="ftp-trip")throw 0;
    toast("Importing…");const id=await writeTrip(d,d.trip.name+" (imported)");
    toast("✓");location.hash="#/t/"+id+"/overview"}
   catch(e){toast("Not a valid trip export file")}};
  i.click()};
 $("#dupTrip").onclick=async()=>{
  const data={trip:{...tr},days:state.days,places:state.places,stops:state.stops,
   expenses:[],lists:state.lists.map(l=>({...l,items:l.items.map(x=>({...x,done:false}))})),guides:state.guides,journal:[],fuel:[]};
  delete data.trip.id;delete data.trip.createdAt;
  toast("Duplicating…");const id=await writeTrip(data,tr.name+" (copy)");
  toast("✓");location.hash="#/t/"+id+"/overview"};
 $("#delTrip").onclick=async()=>{
  const typed=prompt(t("confirmDelTrip")+"\n\n"+tr.name);
  if(typed!==tr.name){toast("Name didn't match — nothing deleted");return}
  toast("Deleting…");await deleteTripDeep(tr.id);location.hash="#/"};
}
