/* ================= GUIDES (seeded Gulf guides + custom pages) ================= */
import {t,tb,getLang} from "./i18n.js";
import {$,$$,esc,openForm,toast} from "./util.js";
import {sub,subDoc,fs} from "./db.js";
import {TA} from "./seed-data.js";

let active=null;
export function render(state){
 const gs=state.guides;
 if(!active||!gs.find(g=>g.id===active))active=gs[0]&&gs[0].id;
 const g=gs.find(x=>x.id===active);
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("guides")}</div><div class="rule"></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
   ${gs.map(x=>`<button class="tbtn ${x.id===active?"on":""}" data-g="${x.id}">${esc(x.title)}${x.title_ta?' <span class="ta">· '+esc(x.title_ta)+"</span>":""}</button>`).join("")}
   <button class="tbtn" id="newG">${t("newGuide")}</button></div>
  <div id="gbody">${g?renderGuide(g):""}</div>
  ${g&&!g.key?`<div class="eaddrow"><button class="ebtn" id="editG">✎ Edit</button></div>`:""}
 </section>`;
 if(g&&g.key)injectTamil(g.key);
 if(g&&g.key==="umrah")fillIhram(state);
 if(g&&g.key==="prayer")fillPrayer(state);
 $("#view").onclick=e=>{
  const b=e.target.closest("[data-g]");
  if(b){active=b.dataset.g;render(state);return}
  if(e.target.id==="newG"){
   openForm(t("newGuide"),[{k:"title",l:t("name"),full:1},{k:"text",l:"Content (blank line = new paragraph)",type:"textarea"}],{},
    out=>{const html='<div class="card">'+(out.text||"").split(/\n\s*\n/).map(p=>"<p style='margin:8px 0'>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("")+"</div>";
     fs.addDoc(sub(state.tripId,"guides"),{ord:state.guides.length+1,title:out.title||"Guide",title_ta:"",html,text:out.text||""}).then(()=>toast("✓"))});return}
  if(e.target.id==="editG"){const g2=state.guides.find(x=>x.id===active);
   openForm("✎ "+g2.title,[{k:"title",l:t("name"),full:1},{k:"text",l:"Content",type:"textarea"}],g2,
    out=>{const html='<div class="card">'+(out.text||"").split(/\n\s*\n/).map(p=>"<p style='margin:8px 0'>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("")+"</div>";
     fs.updateDoc(subDoc(state.tripId,"guides",g2.id),{title:out.title,html,text:out.text}).then(()=>toast("✓"))},
    ()=>fs.deleteDoc(subDoc(state.tripId,"guides",g2.id)))}};
}
function fillIhram(state){
 const host=$("#ckIhram");if(!host)return;
 const list=state.lists.find(l=>/ihram/i.test(l.title||""));
 if(!list){host.innerHTML='<div class="sec-sub">See Checklists →</div>';return}
 host.innerHTML=list.items.map((it,i)=>`<label class="ck ${it.done?"done":""}"><input type="checkbox" data-ick="${i}" ${it.done?"checked":""}><span class="tx">${esc(it.t)}${it.ta?'<div class="ta tam">'+esc(it.ta)+"</div>":""}</span></label>`).join("");
 host.onchange=e=>{const c=e.target.closest("[data-ick]");if(!c)return;
  const items=list.items.map((it,i)=>i===+c.dataset.ick?{...it,done:c.checked}:it);
  fs.updateDoc(subDoc(state.tripId,"lists",list.id),{items})}}
async function fillPrayer(state){
 const host=$("#ptimes");if(!host||!navigator.onLine)return;
 const stop=state.stops[0];if(!stop)return;
 try{const pj=await (await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=${stop.lat}&longitude=${stop.lng}&method=4`)).json();
  const p=pj.data&&pj.data.timings;if(!p)return;
  const c=$("#ptCity");if(c)c.textContent=stop.name;
  host.innerHTML=["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"].map(k=>`<div class="kv"><span class="k">${k}</span><span class="v">${p[k]}</span></div>`).join("")}catch(e){}}
function renderGuide(g){
 // seeded guides carry the original section markup — give it the original section id so CSS/JS hooks work
 return `<div id="${g.key||"custom"}">${g.html}</div>`}

/* Tamil overlay for the seeded Gulf guide pages (same logic as the original app) */
function injectTamil(key){
 const el=(tag,cls,html)=>{const e=document.createElement(tag);e.className=cls;e.innerHTML=html;return e};
 const root=$("#"+key);if(!root)return;
 const add=(node,txt)=>{if(node&&txt&&!node.querySelector(":scope > .ta"))node.appendChild(el("div","ta tam",txt))};
 if(key==="docs")$$("#docs .grid > .card").forEach((c,i)=>add(c,TA.docsCards[i]));
 if(key==="umrah"){add($$("#umrah .card")[0],TA.umrahMiqat);
  $$("#umrah .steps .step > div").forEach((s,i)=>add(s,TA.umrahSteps[i]));
  add($("#umrah .note"),TA.umrahKids)}
 if(key==="prayer")$$("#prayer .card").forEach((c,i)=>add(c,TA.prayerCards[i]));
 if(key==="driving")$$("#driving .card").forEach((c,i)=>add(c,TA.drivingCards[i]));
 if(key==="emergency")$$("#emergency .card").forEach((c,i)=>add(c,TA.emergency[i]));
}
