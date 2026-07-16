/* ================= SEED: GULF GRAND EXPEDITION 2026 ================= */
import {ATTS,DAYS,PRETRIP,CITIES,CHECKLISTS,TA,GUIDE_HTML,SEED_STOPS} from "./seed-data.js";
import {fs,db,tripsCol,batchSet,serverTimestamp} from "./db.js";

const DATE0="2026-08-05";
function isoFor(ord){const d=new Date(DATE0+"T12:00:00");d.setDate(d.getDate()+ord-1);return d.toISOString().slice(0,10)}

export async function seedGulfTrip(){
 const tripDoc=await fs.addDoc(tripsCol(),{
  name:"Gulf Grand Expedition 2026",
  name_ta:"கல்ஃப் மாபெரும் பயணம் 2026",
  sub:"18-Day Family Road Trip & Umrah — Doha · UAE · Saudi Arabia",
  start:"2026-08-05",end:"2026-08-22",currency:"QAR",
  fx:{QAR:1,SAR:0.9707,AED:0.9913},
  color:"#8A1538",travelers:5,vehicle:"Nissan X-Trail",
  pretrip:PRETRIP.map(p=>({n:p.n,v:p.v})),
  createdAt:serverTimestamp()});
 const id=tripDoc.id;

 // days (with Tamil)
 await batchSet(id,"days",DAYS.map(d=>{const ta=TA.days[d.d]||{};
  return {ord:d.d,date:isoFor(d.d),dow:d.dow,route:d.route,cc:d.cc,km:d.km||0,drv:d.drv||"",
   stay:d.stay||"",hotel:d.hotel||"",hCur:d.hCur||"QAR",hV:d.hV||0,
   m:d.m||"",a:d.a||"",e:d.e||"",n:d.n||"",fuel:d.fuel||[],food:d.food||"",fam:d.fam||"",
   kids:d.kids||"",wx:d.wx||"",road:d.road||"",alt:d.alt||"",
   fuelQ:d.fuelQ||0,foodQ:d.foodQ||0,parkQ:d.parkQ||0,miscQ:d.miscQ||0,done:false,
   ta:{m:ta.m||"",a:ta.a||"",e:ta.e||"",n:ta.n||"",fam:ta.fam||"",kids:ta.kids||"",wx:ta.wx||"",road:ta.road||"",food:ta.food||"",alt:ta.alt||""}}}));

 // places (with Tamil)
 await batchSet(id,"places",ATTS.map(a=>{const tr=TA.atts[a.id]||["",""];
  return {dayOrd:a.d,city:a.city,n:a.n,s:a.s,cur:a.cur,fam:a.fam,cn:a.cn,t:a.t,best:a.best,
   park:a.park,pray:a.pray,kids:a.kids,ph:a.ph,why:a.why,q:a.q,wiki:a.wiki,on:!!a.on,
   ta:{n:tr[0]||"",why:tr[1]||""}}}));

 // route stops
 await batchSet(id,"stops",SEED_STOPS.map((s,i)=>{const c=CITIES[s[1]];
  return {ord:i+1,name:s[0],lat:c.ll[1],lng:c.ll[0],icon:c.icon||"📍",day:s[2],km:0}}));

 // checklists (with Tamil per item)
 const keys=["docs","vehicle","packing","ihram"];
 await batchSet(id,"lists",keys.map((k,i)=>({ord:i+1,title:CHECKLISTS[k].t,
  items:CHECKLISTS[k].items.map((it,j)=>({t:it,ta:(TA.ck[k]&&TA.ck[k][j])||"",done:false}))})));

 // guides (verbatim HTML sections; Tamil injected at render)
 const G=[["docs","🛂 Visas & Borders","விசா & எல்லைகள்"],["umrah","🕋 Umrah Guide","உம்ரா வழிகாட்டி"],
  ["prayer","🕌 Prayer Guide","தொழுகை வழிகாட்டி"],["driving","🚙 Driving & Safety","ஓட்டுதல் & பாதுகாப்பு"],
  ["emergency","🚨 Emergency","அவசரம்"]];
 await batchSet(id,"guides",G.map((g,i)=>({id:g[0],ord:i+1,key:g[0],title:g[1],title_ta:g[2],html:GUIDE_HTML[g[0]]})));

 return id}
