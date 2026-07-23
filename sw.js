/* Family Trip Planner — offline app shell */
const CACHE="ftp-v4";
const SHELL=["./","./index.html","./css/app.css","./manifest.json",
 "./js/app.js","./js/db.js","./js/util.js","./js/i18n.js","./js/calc.js","./js/seed.js","./js/seed-data.js","./js/firebase-config.js",
 "./js/views/trips.js","./js/views/overview.js","./js/views/today.js","./js/views/itinerary.js","./js/views/stays.js",
 "./js/views/route.js","./js/views/budget.js","./js/views/expenses.js","./js/views/compare.js","./js/views/checklists.js",
 "./js/views/guides.js","./js/views/settings.js","./js/views/activity.js","./js/views/journal.js","./js/views/fuel.js",
 "./js/views/vault.js","./js/views/book.js","./js/views/sos.js","./js/offline.js",
 "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css","https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
self.addEventListener("install",e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=="GET")return;
 // never intercept Firebase/Google traffic — auth and Firestore manage themselves
 if(/googleapis\.com|gstatic\.com|firebaseapp\.com|google\.com|open-meteo|aladhan|wikipedia|openstreetmap|tile/.test(u.host))return;
 e.respondWith(
  caches.match(e.request).then(hit=>{
   const net=fetch(e.request).then(r=>{
    if(r.ok&&(u.origin===location.origin||u.host==="unpkg.com"))
     caches.open(CACHE).then(c=>c.put(e.request,r.clone())).catch(()=>{});
    return r.clone()}).catch(()=>hit);
   return hit||net}))});
