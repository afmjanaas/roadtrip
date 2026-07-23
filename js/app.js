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

export const state={user:null,config:null,tripId:null,trip:null,
 days:[],places:[],stops:[],expenses:[],lists:[],guides:[],journal:[],fuel:[],unsubs:[],ready:{}};

const PAGES={overview:vOverview,itinerary:vItin,route:vRoute,budget:vBudget,
 expenses:vExp,compare:vCmp,checklists:vCk,guides:vGuides,settings:vSet,activity:vAct,stays:vStays,
 today:vToday,journal:vJournal,fuel:vFuel,vault:vVault,book:vBook,sos:vSos};
const NAVKEY={route:"routeMap",fuel:"fuelLog"};
const GROUPS=[
 ["gTrip",[["overview","⌂"],["today","📆"],["itinerary","📅"],["stays","🏨"],["route","🗺"],["book","🖨"]]],
 ["gMoney",[["budget","💰"],["expenses","🧾"],["compare","📊"],["fuel","⛽"]]],
 ["gMore",[["journal","📔"],["checklists","☑"],["guides","📖"],["sos","🆘"],["settings","⚙"]]]];

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
 <div id="main">
  <div id="topbar"><button id="burger">☰</button><span class="crumb" id="crumb"></span>
   <div class="tb-right">
    <span class="pill"><span id="netdot"></span><span id="netlbl"></span></span>
    <button class="tbtn" id="editBtn" title="${t("editOn")}">${t("edit")}</button>
    <button class="tbtn" id="langBtn" title="${t("language")}">${getLang()==="ta"?"A·அ":"அ"}</button>
    <button class="tbtn" id="darkBtn" title="${t("theme")}">◐</button>
    <button class="tbtn" id="printBtn">${t("print")}</button>
    <img class="avatar" id="avatar" alt="">
    <button class="tbtn" id="outBtn">${t("signOut")}</button>
   </div></div>
  <div id="view"></div>
  <footer>🧭 ${t("appName")} — ACT family · Firestore-synced · <span id="ftinfo"></span></footer>
 </div>`;
 $("#burger").onclick=()=>$("#sidebar").classList.toggle("open");
 $("#editBtn").onclick=()=>{const on=document.body.classList.toggle("editing");$("#editBtn").classList.toggle("on",on)};
 $("#darkBtn").onclick=()=>{const h=document.documentElement;h.dataset.theme=h.dataset.theme==="dark"?"light":"dark";
  localStorage.setItem("ftp_theme",h.dataset.theme);render()};
 $("#langBtn").onclick=()=>{setLang(getLang()==="ta"?"en":"ta");location.reload()};
 $("#printBtn").onclick=()=>{$$(".day").forEach(d=>d.classList.add("open"));window.print()};
 $("#outBtn").onclick=()=>signOut();
 const av=$("#avatar");if(state.user&&state.user.photoURL)av.src=state.user.photoURL;else av.style.display="none";
 updateNet();window.addEventListener("online",updateNet);window.addEventListener("offline",updateNet);
 document.addEventListener("click",e=>{const n=e.target.closest("[data-nav]");if(!n)return;
  $("#sidebar").classList.remove("open");
  if(n.dataset.nav==="home")location.hash="#/";else location.hash="#/t/"+state.tripId+"/"+n.dataset.nav});
}
function updateNet(){const on=navigator.onLine;const d=$("#netdot"),l=$("#netlbl");
 if(d){d.classList.toggle("on",on);l.textContent=on?t("live"):t("offline")}}

/* ---------- trip subscription ---------- */
function clearTrip(){state.unsubs.forEach(u=>u());state.unsubs=[];
 state.tripId=null;state.trip=null;state.days=[];state.places=[];state.stops=[];
 state.expenses=[];state.lists=[];state.guides=[];state.journal=[];state.fuel=[];state.ready={}}
const rerender=debounce(()=>render(),80);
function subscribeTrip(id){
 if(state.tripId===id)return;
 clearTrip();state.tripId=id;
 state.unsubs.push(watch(tripRef(id),s=>{state.trip=s.exists()?{id:s.id,...s.data()}:null;state.ready.trip=1;rerender()}));
 const subs=[["days","ord"],["places","dayOrd"],["stops","ord"],["expenses","date"],["lists","ord"],["guides","ord"],["journal","dayOrd"],["fuel","date"]];
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

export function render(){
 const r=route();
 if(r.page==="home"){document.body.classList.add("notrip");vTrips.render(state);return}
 document.body.classList.remove("notrip");
 if(!$("#sidebar"))shell();
 if(r.tripId)subscribeTrip(r.tripId);
 if(!state.trip||!state.ready.days){$("#view").innerHTML='<section><div class="sec-sub">⏳ …</div></section>';return}
 // sidebar
 $("#sbTrip").textContent=state.trip.name;
 $("#sbSub").textContent=(state.trip.start||"")+" → "+(state.trip.end||"");
 const groups=[...GROUPS];
 if(state.config&&state.user&&state.config.owner===state.user.email)groups.push(["gAdmin",[["activity","📜"],["vault","🪪"]]]);
 $("#sbLinks").innerHTML=groups.map(([g,items])=>'<div class="sb-h">'+t(g)+'</div>'+items.map(([k,i])=>'<a class="sb-a'+(r.page===k?" active":"")+'" data-nav="'+k+'"><span class="ico">'+i+'</span>'+tb(NAVKEY[k]||k)+'</a>').join("")).join("");
 $("#crumb").textContent=state.trip.name+" — "+t(NAVKEY[r.page]||r.page);
 const mod=PAGES[r.page]||vOverview;
 mod.render(state);
 window.scrollTo(0,0)}

window.addEventListener("hashchange",()=>{const r=route();
 if(r.page==="home"){if($("#sidebar"))$("#app").innerHTML="";}
 if($("#sidebar")&&r.page!=="home"){render()}else{shellOrHome()}});
function shellOrHome(){const r=route();
 if(r.page==="home"){document.body.classList.add("notrip");vTrips.render(state)}
 else{shell();render()}}

/* ---------- boot ---------- */
async function boot(){
 if(!configured){showSetup();return}
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
