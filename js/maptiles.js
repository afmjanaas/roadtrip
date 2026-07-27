/* ================= OFFLINE MAP TILES =================
   Caches OpenStreetMap tiles along the route in IndexedDB so the maps keep
   working with no signal. offlineLayer() serves cached tiles first, falling
   back to network. downloadRoute() pre-fetches the corridor at chosen zooms. */

/* ---- tile math (pure) ---- */
export function lon2x(lon,z){return Math.floor((lon+180)/360*Math.pow(2,z))}
export function lat2y(lat,z){const r=lat*Math.PI/180;
 return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z))}

/* set of "z/x/y" covering a route corridor. Pure & testable. */
export function tilesForRoute(stops,zooms=[5,6,7,8,9,10],stepDeg=0.15,pad=1){
 const set=new Set();
 const pts=(stops||[]).filter(s=>typeof s.lat==="number"&&typeof s.lng==="number");
 const add=(lat,lng)=>{for(const z of zooms){const n=Math.pow(2,z);
  const cx=lon2x(lng,z),cy=lat2y(lat,z);
  for(let dx=-pad;dx<=pad;dx++)for(let dy=-pad;dy<=pad;dy++){
   const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=n||y>=n)continue;set.add(z+"/"+x+"/"+y)}}};
 if(pts.length===1)add(pts[0].lat,pts[0].lng);
 for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];
  const dist=Math.hypot(b.lat-a.lat,b.lng-a.lng);
  const steps=Math.max(1,Math.ceil(dist/stepDeg));
  for(let s=0;s<=steps;s++){add(a.lat+(b.lat-a.lat)*s/steps,a.lng+(b.lng-a.lng)*s/steps)}}
 return set}

/* ---- IndexedDB tile store ---- */
const DB="gge_tiles",ST="t";let _db=null;
function db(){return new Promise((res,rej)=>{if(_db)return res(_db);
 const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);
 r.onsuccess=()=>{_db=r.result;res(_db)};r.onerror=()=>rej(r.error)})}
async function tGet(k){const d=await db();return new Promise((res)=>{const q=d.transaction(ST).objectStore(ST).get(k);
 q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)})}
async function tPut(k,v){const d=await db();return new Promise((res)=>{const t=d.transaction(ST,"readwrite");t.objectStore(ST).put(v,k);t.oncomplete=()=>res();t.onerror=()=>res()})}
export async function tileCount(){try{const d=await db();return new Promise(res=>{const q=d.transaction(ST).objectStore(ST).count();q.onsuccess=()=>res(q.result||0);q.onerror=()=>res(0)})}catch(e){return 0}}
export async function clearTiles(){try{const d=await db();return new Promise(res=>{const t=d.transaction(ST,"readwrite");t.objectStore(ST).clear();t.oncomplete=()=>res();t.onerror=()=>res()})}catch(e){}}

const SUBS=["a","b","c"];
function tileUrl(z,x,y){return "https://"+SUBS[(x+y)%3]+".tile.openstreetmap.org/"+z+"/"+x+"/"+y+".png"}

/* ---- offline-first Leaflet layer ---- */
export function offlineLayer(L){
 if(!L||!L.TileLayer||!L.TileLayer.extend)
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"});
 const Off=L.TileLayer.extend({
  createTile:function(coords,done){
   const img=document.createElement("img");
   img.setAttribute("role","presentation");img.alt="";
   const key=coords.z+"/"+coords.x+"/"+coords.y;
   tGet(key).then(blob=>{
    if(blob){try{img.src=URL.createObjectURL(blob)}catch(e){img.src=this.getTileUrl(coords)}
     img.onload=()=>done(null,img);img.onerror=()=>done(null,img);return}
    img.src=this.getTileUrl(coords);
    img.onload=()=>done(null,img);
    img.onerror=()=>{img.onerror=null;img.src=tileUrl(coords.z,coords.x,coords.y);done(null,img)};
   }).catch(()=>{img.src=this.getTileUrl(coords);done(null,img)});
   return img}
 });
 return new Off("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"})}

/* ---- download the route corridor (throttled, skips cached) ---- */
export async function downloadRoute(stops,zooms,onProgress){
 const keys=[...tilesForRoute(stops,zooms||[5,6,7,8,9,10])];
 const total=keys.length;let done=0,failed=0;
 const queue=keys.slice();
 async function worker(){
  while(queue.length){const key=queue.shift();
   try{const have=await tGet(key);if(have){done++;onProgress&&onProgress(done,total,failed);continue}
    const [z,x,y]=key.split("/");
    const r=await fetch(tileUrl(z,x,y),{headers:{}});
    if(r.ok){const b=await r.blob();await tPut(key,b)}else failed++;
   }catch(e){failed++}
   done++;onProgress&&onProgress(done,total,failed);
   await new Promise(r=>setTimeout(r,40)); // be gentle on the tile server
  }}
 const N=5;await Promise.all(Array.from({length:N},worker));
 return {total,failed}}

export function estimateTiles(stops,zooms){return tilesForRoute(stops,zooms||[5,6,7,8,9,10]).size}
