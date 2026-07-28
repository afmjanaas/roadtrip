/* ================= GEO — reverse-geocode cities + nearby restaurants =================
   Online-only, results cached so stats/food work offline afterwards. Polite to
   the free OSM services (throttled, one request at a time). */
const CK=id=>"ftp_cities_"+id;
export function citiesCache(id){try{return JSON.parse(localStorage.getItem(CK(id))||"{}")}catch(e){return {}}}
function saveCities(id,o){localStorage.setItem(CK(id),JSON.stringify(o))}
const grid=(lat,lng)=>lat.toFixed(1)+","+lng.toFixed(1);   // ~11 km cells

async function reverse(lat,lng){
 const url="https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat="+lat+"&lon="+lng;
 const r=await fetch(url,{headers:{"Accept":"application/json"}});
 if(!r.ok)throw new Error("geocode "+r.status);
 const j=await r.json();const a=j.address||{};
 return {city:a.city||a.town||a.village||a.municipality||a.county||a.state||"",country:a.country||""}}

/* Detect every city/country from the GPS track + waypoints. onProgress(done,total). */
export async function detectCities(id,trackDays,waypoints,onProgress){
 const cache=citiesCache(id);cache.cells=cache.cells||{};
 // sample points: every point rounded to grid, plus all waypoints
 const cells=new Map();
 Object.values(trackDays||{}).forEach(pts=>pts.forEach(p=>cells.set(grid(p[0],p[1]),[p[0],p[1]])));
 (waypoints||[]).forEach(w=>cells.set(grid(w.lat,w.lng),[w.lat,w.lng]));
 const todo=[...cells.entries()].filter(([g])=>cache.cells[g]===undefined);
 let done=0;const total=todo.length;
 for(const [g,[lat,lng]] of todo){
  if(!navigator.onLine)break;
  try{cache.cells[g]=await reverse(lat,lng)}catch(e){cache.cells[g]=null}
  done++;onProgress&&onProgress(done,total);
  saveCities(id,cache);
  await new Promise(r=>setTimeout(r,1100)); // Nominatim: max ~1 req/sec
 }
 return summary(id)}
export function summary(id){
 const cache=citiesCache(id);const cities=new Set(),countries=new Set();
 Object.values(cache.cells||{}).forEach(v=>{if(v){if(v.city)cities.add(v.city);if(v.country)countries.add(v.country)}});
 return {cities:[...cities],countries:[...countries]}}

/* Nearby restaurants via Overpass around a point. Returns [{name,lat,lng,cuisine,kind}]. */
export async function nearbyRestaurants(lat,lng,radius=3500){
 const q="[out:json][timeout:20];(node(around:"+radius+","+lat+","+lng+")[amenity~\"^(restaurant|cafe|fast_food)$\"];);out 15;";
 const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:"data="+encodeURIComponent(q)});
 if(!r.ok)throw new Error("nearby "+r.status);
 const j=await r.json();
 return (j.elements||[]).filter(e=>e.tags&&e.tags.name).map(e=>({
  name:e.tags.name,lat:e.lat,lng:e.lon,cuisine:(e.tags.cuisine||"").replace(/_/g," "),kind:e.tags.amenity}))
  .slice(0,12)}
