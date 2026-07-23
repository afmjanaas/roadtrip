/* ================= GPS JOURNEY TRACKER =================
   Records the real driving path with watchPosition + a screen wake-lock.
   localStorage is the source of truth (works fully offline, e.g. the
   Empty Quarter); Firestore is a best-effort mirror so the printout can be
   produced from any device once back online. */
import {sub,subDoc,fs,rawGet,rawSet,rawDelete,serverTimestamp} from "./db.js";

/* ---- tunables ---- */
const MIN_M=40;        // don't record a point unless moved >= 40 m
const MIN_S=20;        // ...or 20 s elapsed
const MAX_ACC=120;     // ignore fixes worse than 120 m accuracy
const FLUSH_MS=30000;  // mirror to Firestore every 30 s

/* ---- state ---- */
let TID=null, watchId=null, wake=null, flushTimer=null, last=null;
const listeners=new Set();
export function onTracker(fn){listeners.add(fn);return()=>listeners.delete(fn)}
function emit(){listeners.forEach(f=>{try{f(status())}catch(e){}})}

/* ---- storage ---- */
const TK=id=>"ftp_trk_"+id;      // {days:{date:[[lat,lng,t,acc],...]}, dirty:{date:1}}
const WK=id=>"ftp_wp_"+id;       // [{id,type,lat,lng,ts,note,date,synced}]
const SK=id=>"ftp_trkon_"+id;    // "1" while actively tracking
function load(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function store(){return load(TK(TID),{days:{},dirty:{}})}
function setStore(s){save(TK(TID),s)}
export function waypoints(id){return load(WK(id||TID),[])}
function setWaypoints(w){save(WK(TID),w)}

export function isActive(){return!!watchId}
export function activeTrip(){return TID}
export function status(){
 const s=TID?store():{days:{}};
 let pts=0;Object.values(s.days).forEach(a=>pts+=a.length);
 const wp=TID?waypoints():[];
 const unsynced=Object.keys(s.dirty||{}).length + wp.filter(w=>!w.synced).length;
 return {active:isActive(),trip:TID,points:pts,waypoints:wp.length,unsynced,
  last:last?{t:last.t,acc:last.acc}:null,wake:!!wake,online:navigator.onLine}}

/* ---- geo helpers ---- */
function dm(a,b){const R=6371000,r=x=>x*Math.PI/180;
 const dLat=r(b[0]-a[0]),dLon=r(b[1]-a[1]);
 const h=Math.sin(dLat/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLon/2)**2;
 return 2*R*Math.asin(Math.sqrt(h))}
export function dayDistanceM(points){let d=0;for(let i=1;i<points.length;i++)d+=dm(points[i-1],points[i]);return d}
export function localDate(tSec){const d=new Date(tSec*1000);
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}

/* ---- merge remote (Firestore subscription) into local ---- */
export function hydrate(id,remoteTrack,remoteWps){
 if(!id)return;
 const s=load(TK(id),{days:{},dirty:{}});
 (remoteTrack||[]).forEach(doc=>{
  const date=doc.date||doc.id;const rp=doc.points||[];if(!rp.length)return;
  const cur=s.days[date]||[];const seen=new Set(cur.map(p=>p[2]));
  let added=false;
  rp.forEach(p=>{if(!seen.has(p[2])){cur.push(p);added=true}});
  if(added)cur.sort((a,b)=>a[2]-b[2]);
  s.days[date]=cur});
 save(TK(id),s);
 // waypoints: union by id
 const local=load(WK(id),[]);const byId=new Map(local.map(w=>[w.id,w]));
 (remoteWps||[]).forEach(w=>{byId.set(w.id,{...w,synced:true})});
 save(WK(id),[...byId.values()].sort((a,b)=>a.ts-b.ts))}

/* ---- data access for the view ---- */
export function trackDays(id){const s=load(TK(id||TID||id),{days:{}});return s.days||{}}
export function pointsForDate(id,date){return (load(TK(id),{days:{}}).days||{})[date]||[]}

/* ---- recording ---- */
function record(pos){
 const c=pos.coords;if(c.accuracy>MAX_ACC && last)return;
 const t=Math.round(pos.timestamp/1000);
 const p=[+c.latitude.toFixed(5),+c.longitude.toFixed(5),t,Math.round(c.accuracy)];
 if(last){const gap=t-last.t, moved=dm([last.lat,last.lng],[p[0],p[1]]);
  if(moved<MIN_M && gap<MIN_S)return}
 last={lat:p[0],lng:p[1],t,acc:p[3]};
 const s=store();const date=localDate(t);
 (s.days[date]=s.days[date]||[]).push(p);
 s.dirty[date]=1;setStore(s);emit()}

async function acquireWake(){
 try{if("wakeLock" in navigator){wake=await navigator.wakeLock.request("screen");
  wake.addEventListener("release",()=>{wake=null})}}catch(e){wake=null}}
function reWake(){if(!isActive())return;
 if(document.visibilityState==="visible"){
  if(!wake)acquireWake();
  // dropped a fresh fix each time you return from another app (e.g. Google Maps navigation)
  if("geolocation" in navigator)navigator.geolocation.getCurrentPosition(
   p=>record(p),()=>{},{enableHighAccuracy:true,timeout:12000,maximumAge:5000})}}

export async function start(tripId){
 TID=tripId;
 if(!("geolocation" in navigator))throw new Error("No geolocation on this device");
 last=null;
 watchId=navigator.geolocation.watchPosition(record,e=>{console.warn("geo",e.message);emit()},
  {enableHighAccuracy:true,maximumAge:5000,timeout:20000});
 localStorage.setItem(SK(tripId),"1");
 await acquireWake();
 document.addEventListener("visibilitychange",reWake);
 clearInterval(flushTimer);flushTimer=setInterval(()=>flush(),FLUSH_MS);
 emit();return status()}

export async function stop(){
 if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}
 if(wake){try{await wake.release()}catch(e){}wake=null}
 clearInterval(flushTimer);flushTimer=null;
 if(TID)localStorage.removeItem(SK(TID));
 document.removeEventListener("visibilitychange",reWake);
 await flush();emit();return status()}

/* resume automatically if a session was live before a reload */
export function resumeIfNeeded(tripId){
 if(localStorage.getItem(SK(tripId))==="1" && !isActive()){start(tripId).catch(()=>{})}}

/* ---- waypoints ---- */
export function addWaypoint(type,note){
 return new Promise((res,rej)=>{
  const done=(lat,lng,acc)=>{
   const t=Math.round(Date.now()/1000);
   const w={id:"w"+t.toString(36)+Math.random().toString(36).slice(2,5),
    type,lat:+lat.toFixed(5),lng:+lng.toFixed(5),ts:t,note:note||"",date:localDate(t),acc:acc||null,synced:false};
   const list=waypoints();list.push(w);setWaypoints(list);emit();flush();res(w)};
  if(last)return done(last.lat,last.lng,last.acc);
  if(!("geolocation" in navigator))return rej(new Error("No geolocation"));
  navigator.geolocation.getCurrentPosition(
   p=>done(p.coords.latitude,p.coords.longitude,Math.round(p.coords.accuracy)),
   e=>rej(new Error(e.message)),{enableHighAccuracy:true,timeout:15000,maximumAge:10000})})}
export function editWaypoint(id,patch){
 const list=waypoints();const i=list.findIndex(w=>w.id===id);if(i<0)return;
 list[i]={...list[i],...patch,synced:false};setWaypoints(list);flush();emit()}
export function deleteWaypoint(id){
 const w=waypoints().find(x=>x.id===id);
 setWaypoints(waypoints().filter(x=>x.id!==id));emit();
 if(w&&w.synced&&TID)rawDelete(subDoc(TID,"waypoints",id)).catch(()=>{})}

/* ---- Firestore mirror ---- */
let flushing=false;
export async function flush(){
 if(!TID||flushing||!navigator.onLine)return;
 flushing=true;
 try{
  const s=store();
  for(const date of Object.keys(s.dirty||{})){
   let pts=s.days[date]||[];
   // merge with whatever another device already wrote for this day, so nobody's points are lost
   try{const snap=await rawGet(subDoc(TID,"track",date));
    const remote=(snap&&snap.exists&&snap.exists())?((snap.data()||{}).points||[]):[];
    if(remote.length){const seen=new Set(pts.map(p=>p[2]));
     remote.forEach(p=>{if(!seen.has(p[2]))pts.push(p)});
     pts.sort((a,b)=>a[2]-b[2]);s.days[date]=pts}}catch(e){}
   await rawSet(subDoc(TID,"track",date),{date,points:pts,updated:serverTimestamp()});
   delete s.dirty[date]}
  setStore(s);
  const list=waypoints();let changed=false;
  for(const w of list){if(!w.synced){
   await rawSet(subDoc(TID,"waypoints",w.id),
    {type:w.type,lat:w.lat,lng:w.lng,ts:w.ts,note:w.note,date:w.date,acc:w.acc||null});
   w.synced=true;changed=true}}
  if(changed)setWaypoints(list);
 }catch(e){/* keep dirty, retry next flush */}
 flushing=false;emit()}
window.addEventListener("online",()=>flush());
