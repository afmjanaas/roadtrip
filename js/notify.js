/* ================= NOTIFICATIONS ENGINE =================
   Native (Capacitor @capacitor/local-notifications): real scheduled +
   background notifications that fire when the app is closed.
   Web: best-effort via the Notifications API while the page is open.
   Triggers: prayer times, day/itinerary reminders, custom reminders (time),
   and location alerts (geofence) fed from the GPS tracker. */
import {haversine} from "./util.js";
import {prayerFor} from "./offline.js";

const CAP=(typeof window!=="undefined")&&window.Capacitor;
const isNative=!!(CAP&&CAP.isNativePlatform&&CAP.isNativePlatform());
function LN(){if(!CAP)return null;
 return (CAP.Plugins&&CAP.Plugins.LocalNotifications)||
  (CAP.registerPlugin&&CAP.registerPlugin("LocalNotifications"))||null}

/* module-level current trip state (set by app.js on each render) */
let S=null;
export function setState(state){S=state}

/* settings (per device) */
const SKEY=id=>"ftp_notify_"+id;
export function settings(id){
 const d={prayer:true,day:true,location:true,enabled:false};
 try{return Object.assign(d,JSON.parse(localStorage.getItem(SKEY(id))||"{}"))}catch(e){return d}}
export function setSettings(id,patch){
 const s=Object.assign(settings(id),patch);localStorage.setItem(SKEY(id),JSON.stringify(s));return s}

/* stable positive int id from a string key (native needs int ids) */
export function idFor(key){let h=0;for(let i=0;i<key.length;i++){h=(h*31+key.charCodeAt(i))|0}
 return Math.abs(h)%2000000000+1}

/* ---- permission ---- */
export async function requestPermission(){
 if(isNative){const ln=LN();if(!ln)return false;
  try{const r=await ln.requestPermissions();return r&&(r.display==="granted"||r.display==="prompt-with-rationale"||r.display===undefined)}catch(e){return false}}
 if(typeof Notification!=="undefined"){try{const p=await Notification.requestPermission();return p==="granted"}catch(e){return false}}
 return false}
export function permissionState(){
 if(isNative)return "native";
 if(typeof Notification!=="undefined")return Notification.permission;
 return "unsupported"}

/* ---- low-level fire ---- */
export async function notifyNow(title,body,key){
 const id=idFor((key||title)+"|"+Date.now());
 if(isNative){const ln=LN();if(!ln)return;
  try{await ln.schedule({notifications:[{id,title,body,smallIcon:"ic_stat_icon_config_sample"}]})}catch(e){}
  return}
 try{if(typeof Notification!=="undefined"&&Notification.permission==="granted")new Notification(title,{body})}catch(e){}}

/* ================= TIME-BASED SCHEDULE ================= */
/* Build the list of {id,title,body,at:Date} for the next `days` days. Pure & testable. */
export function buildSchedule(state,now,days=3){
 if(!state||!state.trip)return [];
 const out=[];const set=settings(state.trip.id);
 const today=new Date(now);today.setHours(0,0,0,0);
 const within=iso=>{const d=new Date(iso+"T00:00:00");const diff=(d-today)/864e5;return diff>=0&&diff<days};
 const at=(iso,hhmm)=>{const [h,m]=String(hhmm||"").split(":");const d=new Date(iso+"T00:00:00");
  d.setHours(+h||0,+m||0,0,0);return d};
 (state.days||[]).forEach(dy=>{
  if(!dy.date||!within(dy.date))return;
  // prayer times for this day/city
  if(set.prayer){const p=prayerFor(state.trip.id,dy.date);
   if(p)["Fajr","Dhuhr","Asr","Maghrib","Isha"].forEach(k=>{
    const when=at(dy.date,p[k]);if(when>now)
     out.push({id:idFor("pray|"+dy.date+"|"+k),title:"🕌 "+k+(p.city?" · "+p.city:""),body:k+" "+p[k],at:when})})}
  // day-start reminder (07:00) + special day flags
  if(set.day){const when=at(dy.date,"07:00");
   if(when>now)out.push({id:idFor("day|"+dy.date),title:"📆 Day "+dy.ord,body:dy.route||("Day "+dy.ord),at:when});
   if(/umrah/i.test(dy.route||"")){const w2=at(dy.date,"16:00");
    if(w2>now)out.push({id:idFor("umrah|"+dy.date),title:"🕋 Umrah today",body:"Ihram & Umrah — "+(dy.route||""),at:w2})}
   if((dy.km||0)>=500||/🛂/.test(dy.route||"")){const w3=at(dy.date,"05:00");
    if(w3>now)out.push({id:idFor("early|"+dy.date),title:"⏰ Big drive today",body:"Long/border day — early start: "+(dy.route||""),at:w3})}}
 });
 // custom timed reminders
 (state.reminders||[]).forEach(r=>{
  if(r.done||!r.date||!r.time)return;if(r.lat&&r.lng)return; // geofenced ones handled separately
  if(!within(r.date))return;const when=at(r.date,r.time);
  if(when>now)out.push({id:idFor("rem|"+r.id),title:"🔔 "+(r.title||"Reminder"),body:r.title||"",at:when})});
 return out.sort((a,b)=>a.at-b.at)}

/* schedule everything (native) or set timers for near ones (web) */
let webTimers=[];
export async function rescheduleAll(state){
 const now=new Date();
 const list=buildSchedule(state,now,3);
 if(isNative){const ln=LN();if(!ln)return;
  try{
   const pend=await ln.getPending();
   if(pend&&pend.notifications&&pend.notifications.length)await ln.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
   if(list.length)await ln.schedule({notifications:list.map(n=>({id:n.id,title:n.title,body:n.body,schedule:{at:n.at}}))});
  }catch(e){}
  return list.length}
 // web: timers for the next few hours only (page must stay open)
 webTimers.forEach(clearTimeout);webTimers=[];
 const soon=list.filter(n=>n.at-now<6*3600e3);
 soon.forEach(n=>{const ms=n.at-now;if(ms>0&&ms<6*3600e3)webTimers.push(setTimeout(()=>notifyNow(n.title,n.body,String(n.id)),ms))});
 return soon.length}

/* ================= LOCATION (GEOFENCE) ================= */
/* alert points from planned stops + custom geofenced reminders. Pure. */
const STOPMSG={"🛂":["Border ahead","Have all documents & passports ready"],
 "⛽":["Fuel stop coming up","Top up — long gap after this"],
 "🛏":["Almost at tonight's stop","Arriving soon"],
 "⛰":["Mountains ahead","Cooler air & winding roads"],
 "🕋":["Miqat ahead","Prepare ihram & intention"],
 "🏁":["Almost there","Final stretch"]};
export function buildAlertPoints(state){
 if(!state)return [];
 const pts=[];
 (state.stops||[]).forEach(s=>{const m=STOPMSG[s.icon];
  if(m)pts.push({key:"stop:"+s.id,lat:s.lat,lng:s.lng,title:m[0]+" — "+s.name,body:m[1]})});
 (state.reminders||[]).forEach(r=>{if(r.lat&&r.lng&&!r.done)
  pts.push({key:"rem:"+r.id,lat:r.lat,lng:r.lng,title:"🔔 "+(r.title||"Reminder"),body:r.title||""})});
 return pts}
const FKEY=id=>"ftp_fired_"+id;
function firedSet(id){try{const o=JSON.parse(localStorage.getItem(FKEY(id))||"{}");
 // reset entries older than today
 const today=new Date().toISOString().slice(0,10);const out={};
 Object.entries(o).forEach(([k,v])=>{if(v===today)out[k]=v});return out}catch(e){return {}}}
function markFired(id,key){const o=firedSet(id);o[key]=new Date().toISOString().slice(0,10);
 localStorage.setItem(FKEY(id),JSON.stringify(o))}
export function nearestAlert(points,lat,lng,fired,radiusKm=3){
 for(const p of points){if(fired[p.key])continue;
  const km=haversine({lat,lng},{lat:p.lat,lng:p.lng});
  if(km<=radiusKm)return {...p,km}}
 return null}

/* called by the tracker on every recorded GPS point */
export function onLocation(lat,lng){
 if(!S||!S.trip)return;const set=settings(S.trip.id);if(!set.location)return;
 const hit=nearestAlert(buildAlertPoints(S),lat,lng,firedSet(S.trip.id),3);
 if(hit){markFired(S.trip.id,hit.key);notifyNow(hit.title,hit.body,hit.key)}}
