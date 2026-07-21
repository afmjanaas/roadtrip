/* ================= HELPERS ================= */
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export const uid=()=> Date.now().toString(36)+Math.random().toString(36).slice(2,7);
export const fmt=(n,cur="QAR")=>cur+" "+Math.round(n||0).toLocaleString("en-US");
export const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
export const stars=n=>"★".repeat(Math.max(0,Math.min(5,Math.round(n||0))));
export const dots=n=>"●".repeat(Math.max(0,Math.min(5,n||0)))+"○".repeat(5-Math.max(0,Math.min(5,n||0)));
export const CCOL={QA:"#8A1538",AE:"#1B5FAA",SA:"#0E7A45",OM:"#1a7f6b",RET:"#D97B29"};
export const DOWS=["SUN","MON","TUE","WED","THU","FRI","SAT"];
export function dateRange(a,b){const out=[];const d=new Date(a+"T12:00:00"),e=new Date(b+"T12:00:00");
 while(d<=e){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}return out}
export function fmtDate(iso){if(!iso)return"";const d=new Date(iso+"T12:00:00");
 return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
export function haversine(a,b){const R=6371,rad=x=>x*Math.PI/180;
 const dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
 return Math.round(2*R*Math.asin(Math.sqrt(h)))}
export function toast(msg){let t=$("#toast");
 if(!t){t=document.createElement("div");t.id="toast";document.body.appendChild(t)}
 t.textContent=msg;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),2600)}
export function debounce(fn,ms){let h;return(...a)=>{clearTimeout(h);h=setTimeout(()=>fn(...a),ms)}}

/* ---- CSV ---- */
export function downloadCSV(name,rows){
 const cell=v=>{v=String(v==null?"":v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
 const csv="﻿"+rows.map(r=>r.map(cell).join(",")).join("\r\n");
 const a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 a.download=name;a.click()}

/* ---- image picking + compression (stored as dataURL in Firestore, keep small) ---- */
export function pickImage(cb,maxDim=1100,quality=.78){
 const i=document.createElement("input");i.type="file";i.accept="image/*";
 i.onchange=()=>{const f=i.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{const im=new Image();im.onload=()=>{
    let w=im.width,h=im.height;
    if(Math.max(w,h)>maxDim){const s=maxDim/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}
    const c=document.createElement("canvas");c.width=w;c.height=h;
    c.getContext("2d").drawImage(im,0,0,w,h);
    let q=quality,u=c.toDataURL("image/jpeg",q);
    while(u.length>700000&&q>0.35){q-=0.1;u=c.toDataURL("image/jpeg",q)}   // stay well under 1MB doc limit
    if(u.length>900000){toast("Image too large even after compression");return}
    cb(u)};im.src=rd.result};
  rd.readAsDataURL(f)};
 i.click()}

/* ---- generic form modal ---- */
export function openForm(title,fields,vals,onSave,onDelete,delLabel){
 const ov=document.createElement("div");ov.className="ovl";
 ov.innerHTML='<div class="modal"><h3>'+esc(title)+'</h3><div class="fgrid">'+fields.map(f=>{
  let v=vals[f.k];if(v===undefined||v===null)v=(f.def!==undefined?f.def:"");
  if(f.type==="textarea")return '<label class="f full">'+f.l+'<textarea data-f="'+f.k+'">'+esc(Array.isArray(v)?v.join("\n"):v)+'</textarea></label>';
  if(f.type==="select")return '<label class="f">'+f.l+'<select data-f="'+f.k+'">'+f.opts.map(o=>'<option value="'+esc(o)+'"'+(o==v?" selected":"")+'>'+esc(o)+'</option>').join("")+'</select></label>';
  return '<label class="f'+(f.full?" full":"")+'">'+f.l+'<input data-f="'+f.k+'" type="'+(f.type||"text")+'" step="any" value="'+esc(v)+'"></label>';
 }).join("")+'</div><div class="btns">'+
 (onDelete?'<button class="tbtn danger" data-act="del" style="margin-right:auto">🗑 '+(delLabel||"Delete")+'</button>':"")+
 '<button class="tbtn" data-act="cancel">Cancel</button><button class="tbtn primary" data-act="save">💾 Save</button></div></div>';
 document.body.appendChild(ov);
 ov.addEventListener("click",e=>{
  const act=e.target.dataset&&e.target.dataset.act;
  if(e.target===ov||act==="cancel"){ov.remove();return}
  if(act==="del"){if(confirm("Delete this? It cannot be undone.")){ov.remove();onDelete()}return}
  if(act==="save"){const out={};
   $$("[data-f]",ov).forEach(el=>{const f=fields.find(x=>x.k===el.dataset.f);let v=el.value;
    if(f.type==="number")v=parseFloat(v)||0;
    if(f.arr)v=v.split("\n").map(s=>s.trim()).filter(Boolean);
    out[f.k]=v});
   ov.remove();onSave(out)}});
 return ov}
