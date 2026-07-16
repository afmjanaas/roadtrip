/* ================= CHECKLISTS ================= */
import {t,tb} from "../i18n.js";
import {$,esc,openForm,toast} from "../util.js";
import {sub,subDoc,fs} from "../db.js";

export function render(state){
 $("#view").innerHTML=`<section>
  <div class="sec-h">${tb("checklists")}</div>
  <div class="sec-sub">${esc(state.trip.name)}</div><div class="rule"></div>
  <div class="grid g2" id="ckGrid">${state.lists.map(l=>block(l)).join("")}</div>
  <div style="margin-top:16px"><button class="tbtn" id="newList">${t("newList")}</button></div>
 </section>`;
 $("#newList").onclick=()=>openForm(t("newList"),[{k:"title",l:t("name"),full:1}],{},
  out=>fs.addDoc(sub(state.tripId,"lists"),{ord:state.lists.length+1,title:out.title||"List",items:[]}).then(()=>toast("✓")));
 $("#ckGrid").onclick=e=>{
  const li=e.target.closest("[data-lid]");if(!li)return;
  const list=state.lists.find(x=>x.id===li.dataset.lid);if(!list)return;
  if(e.target.matches("[data-add]")){
   openForm(t("addItem"),[{k:"t",l:t("name"),full:1}],{},out=>{
    if(!out.t)return;
    fs.updateDoc(subDoc(state.tripId,"lists",list.id),{items:[...list.items,{t:out.t,ta:"",done:false}]}).then(()=>toast("✓"))});return}
  if(e.target.matches("[data-del]")){
   if(confirm("Delete list \""+list.title+"\"?"))fs.deleteDoc(subDoc(state.tripId,"lists",list.id));return}
  const rm=e.target.closest("[data-rm]");
  if(rm){const i=+rm.dataset.rm;const items=list.items.filter((_,j)=>j!==i);
   fs.updateDoc(subDoc(state.tripId,"lists",list.id),{items});return}};
 $("#ckGrid").onchange=e=>{
  const ck=e.target.closest("[data-ck]");if(!ck)return;
  const li=e.target.closest("[data-lid]");
  const list=state.lists.find(x=>x.id===li.dataset.lid);
  const items=list.items.map((it,i)=>i===+ck.dataset.ck?{...it,done:ck.checked}:it);
  fs.updateDoc(subDoc(state.tripId,"lists",list.id),{items})};
}
function block(l){
 const done=l.items.filter(i=>i.done).length;
 return `<div class="card" data-lid="${l.id}"><h4>${esc(l.title)} <span class="chip">${done}/${l.items.length}</span>
   <button class="ebtn danger" data-del style="float:right">🗑</button></h4>
  <div class="ckbar"><i style="width:${l.items.length?done/l.items.length*100:0}%"></i></div>
  ${l.items.map((it,i)=>`<label class="ck ${it.done?"done":""}"><input type="checkbox" data-ck="${i}" ${it.done?"checked":""}>
   <span class="tx">${esc(it.t)}${it.ta?'<div class="ta tam">'+esc(it.ta)+"</div>":""}</span>
   <button class="ebtn danger" data-rm="${i}">✖</button></label>`).join("")}
  <div class="eaddrow"><button class="ebtn" data-add>${t("addItem")}</button></div></div>`}
