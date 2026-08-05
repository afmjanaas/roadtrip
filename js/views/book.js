/* ================= MEMORY BOOK — beautiful printable keepsake ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,fmt,fmtDate,stars,CCOL} from "../util.js";
import {placesOfDay} from "../calc.js";
import * as TK from "../tracker.js";

const CC_COUNTRY={QA:"Qatar",AE:"UAE",SA:"Saudi Arabia",OM:"Oman",RET:"Saudi Arabia"};
const CITYICON={"Abu Dhabi":"🕌","Dubai":"🌆","Muscat":"🕌","Nizwa":"🏰","Bahla":"🏰","Ibri":"🏜","Hofuf (Al Ahsa)":"🏜","Riyadh":"🏙","Buraydah":"🐪","Hail":"🏰","AlUla":"🗿","Madinah":"🕌","Taif":"🌹","Al Baha":"🌲","Abha":"⛰","Rijal Almaa":"🏘","Makkah":"🕋","Al Ain":"🌴"};

export function render(state){
 const tr=state.trip,cur=tr.currency;
 TK.hydrate(tr.id,state.track,state.waypoints);
 const days=(state.days||[]).slice().sort((a,b)=>a.ord-b.ord);
 const places=state.places||[];
 const journalBy={};(state.journal||[]).forEach(j=>{(journalBy[j.dayOrd]=journalBy[j.dayOrd]||[]).push(j)});
 Object.values(journalBy).forEach(a=>a.sort((x,y)=>(x.ts||Date.parse(x.date)||0)-(y.ts||Date.parse(y.date)||0)));
 const tdays=TK.trackDays(tr.id),wps=TK.waypoints(tr.id);
 let actualKm=0;Object.values(tdays).forEach(pts=>actualKm+=TK.dayDistanceM(pts)/1000);
 const plannedKm=days.reduce((s,d)=>s+(d.km||0),0);
 const totalKm=Math.round(actualKm||plannedKm);
 const countries=[...new Set(days.map(d=>CC_COUNTRY[d.cc]).filter(Boolean))];
 const photoCount=(state.journal||[]).reduce((s,j)=>s+((j.photos||[]).length),0);
 const overnights=days.filter(d=>d.hotel&&d.hotel.trim()).length;
 const selPlaces=places.filter(p=>p.on!==false);
 const longest=days.slice().sort((a,b)=>(b.km||0)-(a.km||0))[0];
 const memories=(state.journal||[]).filter(j=>j.best).length;
 const allJournalPhotos=[];(state.journal||[]).forEach(j=>(j.photos||[]).forEach(p=>allJournalPhotos.push({p,ord:j.dayOrd})));

 const wrap=(n,l,sub)=>`<div class="mb-stat"><div class="mb-num">${n}</div><div class="mb-lab">${l}</div>${sub?`<div class="mb-sub">${sub}</div>`:""}</div>`;
 const placeMini=p=>{const img=p.photo||"";
  return `<figure class="mb-place"><div class="mb-pph">${img?`<img src="${img}">`:`<img data-wiki="${esc(p.wiki||"")}" style="display:none"><span class="fall">${CITYICON[p.city]||"📍"}</span>`}</div>
   <figcaption><b>${esc(p.n)}</b>${p.why?`<span>${esc(p.why)}</span>`:""}</figcaption></figure>`};

 $("#view").innerHTML=`<section style="max-width:900px">
  <div class="noprint" style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
   <button class="tbtn primary" id="printBook">🖨 ${t("printBook")}</button>
   <span class="pill">${t("bookHint")}</span>
   <span class="pill">📷 ${photoCount} · 📔 ${(state.journal||[]).length} · 🗺 ${totalKm} km</span></div>

  <div class="mbook">
   <!-- COVER -->
   <div class="mb-cover" ${tr.cover?`style="background-image:linear-gradient(rgba(20,24,30,.55),rgba(42,20,32,.75)),url('${tr.cover}')"`:""}>
    <div class="mb-cov-in">
     <div class="mb-kick">${esc((tr.sub||"A FAMILY EXPEDITION").toUpperCase())}</div>
     <h1>${esc(tr.name)}</h1>${tr.name_ta?`<div class="mb-cov-ta">${esc(tr.name_ta)}</div>`:""}
     <div class="mb-cov-dt">${fmtDate(tr.start)} — ${fmtDate(tr.end)}</div>
     <div class="mb-cov-badges"><span>${days.length} ${t("days")}</span><span>${totalKm.toLocaleString()} km</span><span>${countries.length} ${t("countries")}</span>${tr.vehicle?`<span>🚙 ${esc(tr.vehicle)}</span>`:""}</div>
    </div></div>

   <!-- TRIP WRAPPED -->
   <div class="mb-page">
    <h2 class="mb-h">✨ ${t("tripWrapped")}</h2>
    <div class="mb-stats">
     ${wrap(days.length,t("days"))}
     ${wrap(totalKm.toLocaleString()+" km",actualKm?t("droveActual"):t("distance"))}
     ${wrap(countries.length,t("countries"),countries.join(" · "))}
     ${wrap(selPlaces.length,t("placesToSee"))}
     ${wrap(photoCount,t("photos").replace("📷 ",""))}
     ${wrap(overnights,t("overnights"))}
     ${longest?wrap((longest.km||0)+" km",t("longestDrive"),"Day "+longest.ord):""}
     ${memories?wrap(memories,t("bestMoments")):""}
    </div>
    ${countries.length?`<div class="mb-route-line">${days.map((d,i)=>`<b style="background:${CCOL[d.cc]||'#8A1538'}">${esc((d.stay||d.route||"").replace(/🛏|🏁|\(\d\/\d\)/g,"").split("→").pop().trim().slice(0,16))}</b>`).filter((v,i,a)=>a.indexOf(v)===i).slice(0,14).join("<span>›</span>")}</div>`:""}
   </div>

   <!-- FULL ROUTE MAP -->
   <div class="mb-page">
    <h2 class="mb-h">🗺 ${t("theRoute")}</h2>
    ${svgRoute(allPoints(tdays),wps,720,420)}
    <div class="mb-cap">${totalKm.toLocaleString()} km · ${countries.join(" · ")}</div>
   </div>

   <!-- DAY CHAPTERS -->
   ${days.map(d=>{const jes=journalBy[d.ord]||[];const dp=placesOfDay?places.filter(p=>p.dayOrd===d.ord):[];
    const pts=TK.pointsForDate(tr.id,d.date);const dwps=wps.filter(w=>w.date===d.date);
    const jphotos=[];jes.forEach(e=>(e.photos||[]).forEach(ph=>jphotos.push(ph)));
    return `<div class="mb-chapter">
     <div class="mb-ch-head"><span class="mb-ch-num" style="background:${CCOL[d.cc]||'#8A1538'}">${d.ord}</span>
      <div><div class="mb-ch-t">${esc(d.route||("Day "+d.ord))}</div>
       <div class="mb-ch-d">${fmtDate(d.date)}${d.km?" · "+d.km+" km":""}${d.stay?" · 🛏 "+esc((d.stay||"").replace(/🛏|🏁/g,"").trim()):""}</div></div></div>
     ${(pts.length>1||dwps.length)?svgRoute(pts,dwps,680,240):""}
     ${jes.length?jes.map(e=>e.text?`<p class="mb-journal">${esc(e.text)}</p>`:"").join(""):(d.m||d.a||d.e)?`<p class="mb-plan">${[d.m,d.a,d.e].filter(Boolean).map(esc).join(" ")}</p>`:""}
     ${jphotos.length?`<div class="mb-photos">${jphotos.map(p=>`<img src="${p}">`).join("")}</div>`:""}
     ${dp.length?`<div class="mb-places">${dp.map(placeMini).join("")}</div>`:""}
     ${d.hotel?`<div class="mb-hotel">🏨 ${esc(d.hotel)}</div>`:""}
    </div>`}).join("")}

   <!-- HIGHLIGHTS -->
   ${allJournalPhotos.length?`<div class="mb-page"><h2 class="mb-h">📸 ${t("highlights")}</h2>
     <div class="mb-gallery">${allJournalPhotos.slice(0,24).map(x=>`<img src="${x.p}">`).join("")}</div></div>`:""}

   <!-- CLOSING -->
   <div class="mb-close">
    <div class="mb-close-line">${totalKm.toLocaleString()} km · ${countries.length} ${t("countries")} · ${photoCount} ${t("photos").replace("📷 ","")}</div>
    <div class="mb-close-big">${esc(t("untilNextJourney"))}</div>
    <div class="mb-close-sub">${esc(tr.name)} · ${fmtDate(tr.start)}–${fmtDate(tr.end)}</div>
   </div>
  </div>
 </section>`;
 $("#printBook").onclick=()=>window.print();
 loadWikiPhotos();
}

function allPoints(tdays){const out=[];Object.keys(tdays).sort().forEach(d=>tdays[d].forEach(p=>out.push(p)));return out}

function svgRoute(pts,wps,W=700,H=380){
 const WI={start:"🏳",stay:"🛏",eat:"🍽",fuel:"⛽",photo:"📷",sight:"📍",finish:"🏁"};
 const all=[...(pts||[]).map(p=>[p[0],p[1]]),...(wps||[]).map(w=>[w.lat,w.lng])];
 if(all.length<2)return "";
 let minLa=90,maxLa=-90,minLo=180,maxLo=-180;
 all.forEach(([la,lo])=>{minLa=Math.min(minLa,la);maxLa=Math.max(maxLa,la);minLo=Math.min(minLo,lo);maxLo=Math.max(maxLo,lo)});
 const pad=.12,dLa=(maxLa-minLa)||.01,dLo=(maxLo-minLo)||.01;
 minLa-=dLa*pad;maxLa+=dLa*pad;minLo-=dLo*pad;maxLo+=dLo*pad;
 const X=lo=>((lo-minLo)/(maxLo-minLo))*(W-40)+20,Y=la=>H-(((la-minLa)/(maxLa-minLa))*(H-40)+20);
 const path=(pts&&pts.length)?`<path d="${pts.map((p,i)=>(i?"L":"M")+X(p[1]).toFixed(1)+","+Y(p[0]).toFixed(1)).join(" ")}" fill="none" stroke="#c2582a" stroke-width="2.5" stroke-linejoin="round"/>`:"";
 const marks=(wps||[]).map(w=>{const x=X(w.lng),y=Y(w.lat);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#8A1538" stroke="#fff" stroke-width="1.5"/><text x="${(x+8).toFixed(1)}" y="${(y+4).toFixed(1)}" style="font-size:11px;fill:#333">${WI[w.type]||"📍"} ${esc((w.note||"").slice(0,22))}</text>`}).join("");
 return `<svg class="mb-map" viewBox="0 0 ${W} ${H}">${path}${marks}</svg>`}

async function loadWikiPhotos(){
 const cache=JSON.parse(localStorage.getItem("ftp_wimg")||"{}");
 const apply=()=>$$(".mbook img[data-wiki]").forEach(img=>{const u=cache[img.dataset.wiki];
  if(u){img.src=u;img.style.display="block";const f=img.parentElement.querySelector(".fall");if(f)f.style.display="none"}});
 apply();if(!navigator.onLine)return;
 const need=[...new Set($$(".mbook img[data-wiki]").map(i=>i.dataset.wiki).filter(w=>w&&cache[w]===undefined))].slice(0,50);
 if(!need.length)return;
 await Promise.all(need.map(async w=>{try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(w));
  if(!r.ok){cache[w]=null;return}const j=await r.json();cache[w]=(j.thumbnail&&j.thumbnail.source)?j.thumbnail.source.replace(/\/\d+px-/,"/640px-"):null}catch(e){}}));
 localStorage.setItem("ftp_wimg",JSON.stringify(cache));apply()}
