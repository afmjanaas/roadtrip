/* ================= OFFLINE ARMOUR =================
   Pre-caches every trip document (and therefore every photo, since photos
   live inside the documents) plus prayer times for every day of the route,
   so the whole app keeps working with zero signal. */
import {fs,sub,tripRef} from "./db.js";

const PKEY=id=>"ftp_pray_"+id;
const SKEY=id=>"ftp_prep_"+id;
const SUBS=["days","places","stops","expenses","lists","guides","journal","fuel","bookings"];

export function prayerCache(tripId){
 try{return JSON.parse(localStorage.getItem(PKEY(tripId))||"{}")}catch(e){return{}}}
export function prayerFor(tripId,iso){
 const c=prayerCache(tripId);return c[iso]||null}
export function preparedAt(tripId){return localStorage.getItem(SKEY(tripId))||""}
export function preparedDaysAgo(tripId){
 const s=preparedAt(tripId);if(!s)return null;
 return Math.floor((Date.now()-new Date(s).getTime())/864e5)}

/* pick the route stop that applies to a given day */
export function stopForDay(stops,ord){
 if(!stops||!stops.length)return null;
 const before=stops.filter(s=>(s.day||0)<=ord).sort((a,b)=>(b.day||0)-(a.day||0));
 return before[0]||stops[0]}

/* download prayer times for one date + coords */
async function fetchPrayer(lat,lng,iso){
 const [y,m,d]=iso.split("-");
 const url=`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lng}&method=4`;
 const r=await fetch(url);
 if(!r.ok)throw new Error("prayer "+r.status);
 const j=await r.json();
 const t=j&&j.data&&j.data.timings;
 if(!t)throw new Error("prayer shape");
 return {Fajr:t.Fajr,Sunrise:t.Sunrise,Dhuhr:t.Dhuhr,Asr:t.Asr,Maghrib:t.Maghrib,Isha:t.Isha}}

/* main routine — onProgress(done,total,label) */
export async function prepareOffline(state,onProgress){
 const id=state.tripId;
 const total=SUBS.length+state.days.length+1;
 let done=0;
 const step=l=>{done++;onProgress&&onProgress(done,total,l)};
 const report={docs:0,prayer:0,failed:0};

 await fs.getDoc(tripRef(id)).catch(()=>{});
 step("trip");

 for(const name of SUBS){
  try{const ss=await fs.getDocs(sub(id,name));report.docs+=ss.size||0}
  catch(e){report.failed++}
  step(name)}

 const cache=prayerCache(id);
 for(const d of state.days){
  const s=stopForDay(state.stops,d.ord);
  if(s&&d.date){
   try{cache[d.date]={...await fetchPrayer(s.lat,s.lng,d.date),city:s.name};report.prayer++}
   catch(e){report.failed++}
  }
  step("prayer "+(d.date||d.ord));
 }
 localStorage.setItem(PKEY(id),JSON.stringify(cache));
 localStorage.setItem(SKEY(id),new Date().toISOString());
 return report}
