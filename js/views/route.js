/* ================= ROUTE MAP (Leaflet) ================= */
import {t,tb} from "../i18n.js";
import {$,esc,haversine,openForm,toast} from "../util.js";
import {sub,subDoc,fs,db} from "../db.js";

let map=null,layer=null;
export function render(state){
 const stops=state.stops;
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("routeMap")}</div>
  <div class="sec-sub">${t("tapMap")}</div><div class="rule"></div>
  <div id="lmap"></div>
  <div class="grid g2" style="margin-top:18px">
   <div class="card"><h4>📍 ${t("stop")}s <button class="ebtn" id="addStopBtn">${t("addStop")}</button></h4><div id="stopList"></div></div>
   <div class="card"><h4>🛣 ${t("legs")}</h4><div id="legList"></div></div>
  </div></section>`;
 map=null; buildMap(state); paintLists(state);
 $("#addStopBtn").onclick=()=>{const c=map?map.getCenter():{lat:24.5,lng:46};stopForm(state,{lat:+c.lat.toFixed(4),lng:+c.lng.toFixed(4),ord:stops.length+1,day:0,km:0,icon:"📍"})};
}
function buildMap(state){
 const L=window.L;if(!L){$("#lmap").innerHTML="Leaflet failed to load";return}
 map=L.map("lmap");
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(map);
 layer=L.layerGroup().addTo(map);
 const stops=[...state.stops].sort((a,b)=>a.ord-b.ord);
 if(stops.length){
  const pts=stops.map(s=>[s.lat,s.lng]);
  L.polyline(pts,{color:state.trip.color||"#8A1538",weight:4,opacity:.85,dashArray:"1 0"}).addTo(layer);
  stops.forEach(s=>{
   const mk=L.marker([s.lat,s.lng],{draggable:document.body.classList.contains("editing"),
    icon:L.divIcon({className:"",html:`<div style="font-size:20px;text-shadow:0 0 3px #fff">${s.icon||"📍"}</div><div style="font-size:10px;font-weight:700;background:#fff;border-radius:6px;padding:0 4px;white-space:nowrap;transform:translateX(-25%)">${s.ord}. ${esc(s.name)}</div>`,iconAnchor:[10,10]})}).addTo(layer);
   mk.bindPopup(`<b>${s.ord}. ${esc(s.name)}</b>${s.day?"<br>Day "+s.day:""}<br><a target="_blank" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}">Google Maps</a>`);
   mk.on("dragend",()=>{const p=mk.getLatLng();
    fs.updateDoc(subDoc(state.tripId,"stops",s.id),{lat:+p.lat.toFixed(4),lng:+p.lng.toFixed(4)}).then(()=>toast("✓"))})});
  map.fitBounds(L.latLngBounds(pts).pad(0.15));
 }else map.setView([24.5,46],5);
 map.on("click",e=>{if(!document.body.classList.contains("editing"))return;
  stopForm(state,{lat:+e.latlng.lat.toFixed(4),lng:+e.latlng.lng.toFixed(4),ord:state.stops.length+1,day:0,km:0,icon:"📍"})});
}
function stopForm(state,vals,docId){
 openForm(docId?"✎ "+vals.name:t("addStop"),[
  {k:"name",l:t("name"),full:1},{k:"ord",l:"#",type:"number"},{k:"day",l:t("day"),type:"number"},
  {k:"lat",l:"Lat",type:"number"},{k:"lng",l:"Lng",type:"number"},
  {k:"icon",l:"Icon",type:"select",opts:["📍","🛏","🛂","⛽","⛰","🕋","🏁"]},
  {k:"km",l:t("km")+" (0 = auto straight-line)",type:"number"}],vals,
  out=>{const p=docId?fs.updateDoc(subDoc(state.tripId,"stops",docId),out):fs.addDoc(sub(state.tripId,"stops"),out);
   p.then(()=>toast("✓"))},
  docId?()=>fs.deleteDoc(subDoc(state.tripId,"stops",docId)):null)}
function paintLists(state){
 const stops=[...state.stops].sort((a,b)=>a.ord-b.ord);
 $("#stopList").innerHTML=stops.map((s,i)=>`
  <div class="stoprow"><span>${s.icon||"📍"}</span><span class="h"><b>${s.ord}. ${esc(s.name)}</b>${s.day?' <span class="sub2" style="color:var(--ink3);font-size:11px">Day '+s.day+"</span>":""}</span>
   <button class="mini" data-up="${s.id}" ${i===0?"disabled":""}>↑</button>
   <button class="mini" data-dn="${s.id}" ${i===stops.length-1?"disabled":""}>↓</button>
   <button class="mini" data-ed="${s.id}">✎</button></div>`).join("")||"—";
 let tot=0;
 $("#legList").innerHTML=stops.slice(1).map((s,i)=>{
  const a=stops[i],km=s.km||haversine(a,s);tot+=km;
  return `<div class="stoprow"><span class="h">${esc(a.name)} → ${esc(s.name)}</span>
   <b>${km} ${t("km")}${s.km?"":" *"}</b>
   <a class="gm" target="_blank" href="https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${s.lat},${s.lng}&travelmode=driving">🗺</a></div>`}).join("")+
  `<div class="stoprow" style="border-top:2px solid var(--gold)"><span class="h"><b>${t("total")}</b></span><b>${tot} ${t("km")}</b></div>
  <div style="font-size:11px;color:var(--ink3);margin-top:6px">* straight-line estimate — set real km on the stop (✎)</div>`;
 $("#stopList").onclick=e=>{
  const up=e.target.closest("[data-up]"),dn=e.target.closest("[data-dn]"),ed=e.target.closest("[data-ed]");
  if(ed){const s=state.stops.find(x=>x.id===ed.dataset.ed);stopForm(state,s,s.id);return}
  const el=up||dn;if(!el)return;
  const s=state.stops.find(x=>x.id===(el.dataset.up||el.dataset.dn));
  const other=stops[stops.indexOf(stops.find(x=>x.id===s.id))+(up?-1:1)];
  if(!other)return;
  const b=fs.writeBatch(db());
  b.update(subDoc(state.tripId,"stops",s.id),{ord:other.ord});
  b.update(subDoc(state.tripId,"stops",other.id),{ord:s.ord});
  b.commit().then(()=>toast("✓"))}}
