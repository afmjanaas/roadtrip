/* ================= APP SHELL / ROUTER ================= */
import {configured,onAuth,signIn,signOut,user,loadConfig,claimApp,tripRef,sub,fs,watch,logActivity} from "./db.js";
import {t,tb,getLang,setLang} from "./i18n.js";
import {$,$$,esc,toast,debounce} from "./util.js";
import * as vTrips from "./views/trips.js";
import * as vOverview from "./views/overview.js";
import * as vItin from "./views/itinerary.js";
import * as vRoute from "./views/route.js";
import * as vBudget from "./views/budget.js";
import * as vExp from "./views/expenses.js";
import * as vCmp from "./views/compare.js";
import * as vCk from "./views/checklists.js";
import * as vGuides from "./views/guides.js";
import * as vSet from "./views/settings.js";
import * as vAct from "./views/activity.js";
import * as vStays from "./views/stays.js";
import * as vToday from "./views/today.js";
import * as vJournal from "./views/journal.js";
import * as vFuel from "./views/fuel.js";
import * as vVault from "./views/vault.js";
import * as vBook from "./views/book.js";
import * as vSos from "./views/sos.js";
import * as vBookings from "./views/bookings.js";
import * as vJourneylog from "./views/journeylog.js";
import * as TK from "./tracker.js";
import * as vShare from "./views/share.js";
import * as vAlerts from "./views/alerts.js";
import * as notify from "./notify.js";
import * as vAssistant from "./views/assistant.js";
import * as vPlaces from "./views/places.js";
import * as vFood from "./views/food.js";
import * as vStats from "./views/stats.js";
import * as vTravellers from "./views/travellers.js";

export const state={user:null,config:null,tripId:null,trip:null,
 days:[],places:[],stops:[],expenses:[],lists:[],guides:[],journal:[],fuel:[],bookings:[],track:[],waypoints:[],reminders:[],chats:[],travellers:[],unsubs:[],ready:{}};

const PAGES={overview:vOverview,itinerary:vItin,route:vRoute,budget:vBudget,
 expenses:vExp,compare:vCmp,checklists:vCk,guides:vGuides,settings:vSet,activity:vAct,stays:vStays,
 today:vToday,journal:vJournal,fuel:vFuel,vault:vVault,book:vBook,sos:vSos,bookings:vBookings,journeylog:vJourneylog,alerts:vAlerts,assistant:vAssistant,places:vPlaces,food:vFood,stats:vStats,travellers:vTravellers};
const NAVKEY={route:"routeMap",fuel:"fuelLog"};
const GROUPS=[
 ["gPlan","🧭",[["overview","⌂"],["itinerary","📅"],["places","📌"],["stays","🏨"],["food","🍽"],["route","🗺"],["bookings","🧾"]]],
 ["gRoad","🚗",[["today","📆"],["journeylog","🛰"],["checklists","☑"],["alerts","🔔"],["sos","🆘"]]],
 ["gMoney","💰",[["budget","💰"],["expenses","💳"],["compare","⚖"],["fuel","⛽"]]],
 ["gMemories","📸",[["journal","📔"],["stats","📈"],["book","📕"]]],
 ["gPeople","👪",[["travellers","👨‍👩‍👧"],["assistant","🤖"],["guides","📖"]]]];
const navCollapsed=()=>{try{return JSON.parse(localStorage.getItem("ftp_navcol")||"{}")}catch(e){return {}}};

document.documentElement.dataset.theme=localStorage.getItem("ftp_theme")||"light";
document.documentElement.dataset.lang=getLang();

/* ---------- gates ---------- */
function gate(html){document.body.className="notrip";
 $("#app").innerHTML='<div id="main"><div class="gate"><div class="card">'+html+'</div></div></div>'}
function showSetup(){gate('<h1>🔥 '+t("setupTitle")+'</h1><div class="sub">'+t("setupText")+'</div>'+
 '<pre>1. console.firebase.google.com → Add project\n2. Build → Authentication → Google → Enable\n3. Build → Firestore → Create database\n4. Project settings → Web app → copy config\n5. Paste into js/firebase-config.js</pre>')}
function showLogin(){gate('<h1>🧭 '+t("appName")+'</h1><div class="sub">'+t("welcome")+'</div>'+
 '<button class="gbtn" id="gsi"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.7 2.2-6.3 0-11.7-3.7-13.6-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg> '+t("signIn")+'</button>');
 $("#gsi").onclick=()=>signIn().catch(e=>toast(e.message))}
function showClaim(u){gate('<h1>👋 '+t("claimTitle")+'</h1><div class="sub">'+t("claimText")+'</div>'+
 '<div class="pill" style="margin-bottom:14px">'+esc(u.email)+'</div><br>'+
 '<button class="tbtn primary" id="claim">'+t("claimBtn")+'</button>');
 $("#claim").onclick=async()=>{await claimApp(u.email,u.displayName);boot()}}
function showDenied(u){gate('<h1>🚫 '+t("deniedTitle")+'</h1><div class="sub"><b>'+esc(u.email)+'</b> '+t("deniedText")+'</div>'+
 '<button class="tbtn" id="so">'+t("signOut")+'</button>');$("#so").onclick=()=>signOut()}

/* ---------- shell ---------- */
function shell(){
 document.body.className="";
 $("#app").innerHTML=`
 <nav id="sidebar"><div class="sb-logo"><h1 id="sbTrip"></h1><div class="sub" id="sbSub"></div></div>
  <div class="sb-nav"><a class="sb-a" data-nav="home"><span class="ico">🧳</span>${t("backToTrips")}</a>
  <div class="sb-h">${t("appName")}</div><div id="sbLinks"></div></div></nav>
 <div id="sbBackdrop"></div>
 <div id="main">
  <div id="topbar"><button id="burger">☰</button><span class="crumb" id="crumb"></span>
   <div class="tb-right">
    <span class="pill"><span id="netdot"></span><span id="netlbl"></span></span>
    <button class="tbtn" id="editBtn" title="${t("editOn")}">${t("edit")}</button>
    <button class="tbtn" id="langBtn" title="${t("language")}">${getLang()==="ta"?"A·அ":"அ"}</button>
    <button class="tbtn" id="darkBtn" title="${t("theme")}">◐</button>
    <button class="tbtn" id="recChip" style="display:none;border-color:var(--bad);color:var(--bad);font-weight:700" title="${t("recording")}">● REC</button>
    <button class="tbtn" id="printBtn">${t("print")}</button>
    <img class="avatar" id="avatar" alt="">
    <button class="tbtn" id="outBtn">${t("signOut")}</button>
   </div></div>
  <div id="view"></div>
  <footer>🧭 ${t("appName")} — ACT family · Firestore-synced · <span id="ftinfo"></span></footer>
  <nav id="btmnav">
   <button data-nav="overview"><span>🏠</span>${t("bnHome")}</button>
   <button data-nav="today"><span>📆</span>${t("bnToday")}</button>
   <button data-nav="route"><span>🗺</span>${t("bnMap")}</button>
   <button data-nav="expenses"><span>💳</span>${t("bnMoney")}</button>
   <button data-nav="__more"><span>☰</span>${t("bnMore")}</button>
  </nav>
 </div>`;
 $("#burger").onclick=()=>document.body.classList.toggle("navopen");
 $("#editBtn").onclick=()=>{const on=document.body.classList.toggle("editing");$("#editBtn").classList.toggle("on",on)};
 $("#darkBtn").onclick=()=>{const h=document.documentElement;h.dataset.theme=h.dataset.theme==="dark"?"light":"dark";
  localStorage.setItem("ftp_theme",h.dataset.theme);render()};
 $("#langBtn").onclick=()=>{setLang(getLang()==="ta"?"en":"ta");location.reload()};
 $("#printBtn").onclick=()=>{$$(".day").forEach(d=>d.classList.add("open"));window.print()};
 $("#outBtn").onclick=()=>signOut();
 const av=$("#avatar");if(state.user&&state.user.photoURL)av.src=state.user.photoURL;else av.style.display="none";
 updateNet();window.addEventListener("online",updateNet);window.addEventListener("offline",updateNet);
 $("#recChip").onclick=()=>{location.hash="#/t/"+state.tripId+"/journeylog"};
 TK.onTracker(s=>{const c=$("#recChip");if(c)c.style.display=(s.active&&s.trip===state.tripId)?"inline-block":"none"});
 initGlobalClicks();
}
let _clicksInit=false;
function initGlobalClicks(){
 if(_clicksInit)return;_clicksInit=true;
 document.addEventListener("click",e=>{
  // tap the dimmed backdrop -> close the drawer
  if(e.target.id==="sbBackdrop"){document.body.classList.remove("navopen");return}
  // collapse/expand a sidebar group
  const g=e.target.closest("[data-grptoggle]");
  if(g){const key=g.dataset.grptoggle,col=navCollapsed();col[key]=!col[key];localStorage.setItem("ftp_navcol",JSON.stringify(col));
   const grp=g.closest(".sb-group");if(grp)grp.classList.toggle("collapsed");return}
  const n=e.target.closest("[data-nav]");if(!n)return;
  if(n.dataset.nav==="__more"){document.body.classList.toggle("navopen");return}
  document.body.classList.remove("navopen");
  if(n.dataset.nav==="home")location.hash="#/";else location.hash="#/t/"+state.tripId+"/"+n.dataset.nav});
}
function updateNet(){const on=navigator.onLine;const d=$("#netdot"),l=$("#netlbl");
 if(d){d.classList.toggle("on",on);l.textContent=on?t("live"):t("offline")}}

/* ---------- trip subscription ---------- */
function clearTrip(){state.unsubs.forEach(u=>u());state.unsubs=[];
 state.tripId=null;state.trip=null;state.days=[];state.places=[];state.stops=[];
 state.expenses=[];state.lists=[];state.guides=[];state.journal=[];state.fuel=[];state.bookings=[];state.track=[];state.waypoints=[];state.reminders=[];state.chats=[];state.travellers=[];state.ready={}}
const rerender=debounce(()=>render(),80);
function subscribeTrip(id){
 if(state.tripId===id)return;
 clearTrip();state.tripId=id;
 state.unsubs.push(watch(tripRef(id),s=>{state.trip=s.exists()?{id:s.id,...s.data()}:null;state.ready.trip=1;rerender()}));
 TK.resumeIfNeeded(id);
 const subs=[["days","ord"],["places","dayOrd"],["stops","ord"],["expenses","date"],["lists","ord"],["guides","ord"],["journal","dayOrd"],["fuel","date"],["bookings","date"],["track","date"],["waypoints","ts"],["reminders","date"],["chats","updated"],["travellers","created"]];
 subs.forEach(([name,ord])=>{
  state.unsubs.push(watch(fs.query(sub(id,name),fs.orderBy(ord)),ss=>{
   state[name]=ss.docs.map(d=>({id:d.id,...d.data()}));state.ready[name]=1;rerender()}))});
}

/* ---------- router ---------- */
function route(){
 const h=location.hash.replace(/^#\/?/,"");
 if(!h){clearTrip();return{page:"home"}}
 const m=h.match(/^t\/([^/]+)\/?(\w*)/);
 if(m)return{page:m[2]||"overview",tripId:m[1]};
 return{page:"home"}}

function errCard(where,err,onDash){
 console.error("[view error]",where,err);
 return '<section style="max-width:640px"><div class="card" style="border-color:var(--warn);text-align:center;padding:26px">'+
  '<div style="font-size:34px">😌</div>'+
  '<h3 style="font-family:var(--serif);margin:8px 0">'+t("errTitle")+'</h3>'+
  '<div class="sec-sub">'+t("errBody")+'</div>'+
  '<div style="font-size:11px;color:var(--ink3);margin:8px 0;word-break:break-word">'+esc(String(err&&err.message||err||"")).slice(0,180)+'</div>'+
  '<div class="btns" style="justify-content:center">'+
   (onDash?'<button class="tbtn" id="errDash">'+t("goDashboard")+'</button>':'')+
   '<button class="tbtn primary" id="errReload">'+t("reload")+'</button></div></div></section>'}
function wireErr(state){
 const rl=$("#errReload");if(rl)rl.onclick=()=>location.reload();
 const dh=$("#errDash");if(dh)dh.onclick=()=>{location.hash="#/t/"+(state&&state.tripId||"")+"/overview";location.reload()}}
function safe(fn,where,into,state,onDash){
 try{fn()}catch(e){const el=into?$(into):null;if(el)el.innerHTML=errCard(where,e,onDash);wireErr(state)}}

export function render(){
 const r=route();
 if(r.page==="home"){document.body.classList.add("notrip");safe(()=>vTrips.render(state),"trips","#app",state,false);return}
 document.body.classList.remove("notrip");
 if(!$("#sidebar"))shell();
 if(r.tripId)subscribeTrip(r.tripId);
 if(!state.trip||!state.ready.days){$("#view").innerHTML='<section><div class="sec-sub">⏳ …</div></section>';return}
 // sidebar (guarded)
 try{
 $("#sbTrip").textContent=state.trip.name;
 $("#sbSub").textContent=(state.trip.start||"")+" → "+(state.trip.end||"");
 const admin=[];const owner=state.config&&state.user&&state.config.owner===state.user.email;
 if(owner)admin.push(["activity","📜"],["vault","🪪"]);
 admin.push(["settings","⚙"]);
 const groups=[...GROUPS,["gAdmin","🔒",admin]];
 const col=navCollapsed();
 $("#sbLinks").innerHTML=groups.map(([g,gi,items])=>{
  const isCol=!!col[g]&&!items.some(it=>it[0]===r.page);
  return '<div class="sb-group'+(isCol?" collapsed":"")+'" data-grp="'+g+'">'+
   '<div class="sb-h" data-grptoggle="'+g+'"><span class="sb-h-i">'+gi+'</span><span class="sb-h-t">'+t(g)+'</span><span class="sb-h-c">▾</span></div>'+
   '<div class="sb-items">'+items.map(([k,i])=>'<a class="sb-a'+(r.page===k?" active":"")+'" data-nav="'+k+'"><span class="ico">'+i+'</span><span class="sb-a-t">'+tb(NAVKEY[k]||k)+'</span></a>').join("")+'</div></div>'}).join("");
 $("#crumb").textContent=state.trip.name+" — "+t(NAVKEY[r.page]||r.page);
 try{$$("#btmnav button").forEach(b=>b.classList.toggle("on",b.dataset.nav===r.page))}catch(e){}
 try{notify.setState(state);if(notify.settings(state.tripId).enabled)notify.rescheduleAll(state)}catch(e){}
 }catch(e){console.error("sidebar",e)}
 const mod=PAGES[r.page]||vOverview;
 safe(()=>mod.render(state),r.page,"#view",state,r.page!=="overview");
 try{window.scrollTo(0,0)}catch(e){}}

window.addEventListener("hashchange",()=>{
 const sid=shareId();if(sid){startShare(sid);return}
 const r=route();
 if(r.page==="home"){if($("#sidebar"))$("#app").innerHTML="";}
 if($("#sidebar")&&r.page!=="home"){render()}else{shellOrHome()}});
function shellOrHome(){const r=route();
 if(r.page==="home"){document.body.classList.add("notrip");vTrips.render(state)}
 else{shell();render()}}

/* ---------- boot ---------- */
function shareId(){const m=location.hash.match(/^#\/share\/([^/]+)/);return m?m[1]:null}
let shareSubs=[];
function startShare(id){
 shareSubs.forEach(u=>u());shareSubs=[];
 state.tripId=id;state.ready={};
 document.documentElement.dataset.theme=localStorage.getItem("ftp_theme")||"light";
 const paint=debounce(()=>{try{vShare.render(state)}catch(e){console.error("share",e);$("#app").innerHTML='<div class="gate"><div class="card"><h1>😌</h1><div class="sub">'+t("errBody")+'</div></div></div>'}},80);
 shareSubs.push(watch(tripRef(id),s=>{state.trip=s.exists()?{id:s.id,...s.data()}:null;state.ready.trip=1;paint()}));
 [["days","ord"],["places","dayOrd"],["stops","ord"],["journal","dayOrd"],["track","date"],["waypoints","ts"],["guides","ord"],["lists","ord"]]
  .forEach(([n,o])=>shareSubs.push(watch(fs.query(sub(id,n),fs.orderBy(o)),ss=>{state[n]=ss.docs.map(d=>({id:d.id,...d.data()}));paint()})));
 try{vShare.render(state)}catch(e){console.error("share",e)}}

let _errShown=0;
window.addEventListener("error",e=>{const now=Date.now();if(now-_errShown<8000)return;_errShown=now;try{toast("⚠ "+t("errToast"))}catch(_){}}); 
window.addEventListener("unhandledrejection",e=>{const now=Date.now();if(now-_errShown<8000)return;_errShown=now;try{toast("⚠ "+t("errToast"))}catch(_){}});

async function boot(){
 if(!configured){showSetup();return}
 const sid=shareId();if(sid){startShare(sid);return}
 onAuth(async u=>{
  state.user=u;
  if(!u){showLogin();return}
  let cfg=null;
  try{cfg=await loadConfig()}catch(e){/* rules may block reads for non-family */}
  state.config=cfg;
  if(!cfg){showClaim(u);return}
  if(!(cfg.allowedEmails||[]).includes(u.email)){showDenied(u);return}
  if(!sessionStorage.getItem("ftp_loggedin")){sessionStorage.setItem("ftp_loggedin","1");logActivity("login","","")}
  shellOrHome()});
}
boot();
