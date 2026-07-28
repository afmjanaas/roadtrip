/* ================= AI ASSISTANT — chat sessions ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,toast,voiceOverlay} from "../util.js";
import * as G from "../gemini.js";
import {sub,subDoc,rawAdd,rawSet,rawDelete} from "../db.js";

let curId=null;
export function render(state){
 if(!G.configured()){
  $("#view").innerHTML=`<section style="max-width:760px"><div class="sec-h">🤖 ${tb("assistant")}</div>
   <div class="rule"></div><div class="note">${t("aiNoKey")} <a data-nav="settings" style="cursor:pointer;text-decoration:underline">${t("settings")}</a>.</div></section>`;
  return}
 const chats=(state.chats||[]).slice().sort((a,b)=>(b.updated||0)-(a.updated||0));
 if(!curId||!chats.find(c=>c.id===curId))curId=chats[0]?chats[0].id:null;
 const chat=chats.find(c=>c.id===curId);
 const msgs=(chat&&chat.messages)||[];

 $("#view").innerHTML=`<section style="max-width:760px">
  <div class="sec-h">🤖 ${tb("assistant")}</div>
  <div class="sec-sub">${t("assistantSub")}</div><div class="rule"></div>
  <div class="aihead">
   <select class="inp" id="aiChatSel" style="flex:1;margin:0">
    ${chats.length?chats.map(c=>`<option value="${c.id}" ${c.id===curId?"selected":""}>${esc(c.title||t("newChat"))}</option>`).join(""):`<option>${t("newChat")}</option>`}</select>
   <button class="tbtn" id="aiNew" title="${t("newChat")}">＋</button>
   ${chat?`<button class="tbtn danger" id="aiDel" title="${t("deleteChat")}">🗑</button>`:""}
  </div>
  <div id="aiLog" class="card" style="min-height:120px;max-height:60vh;overflow:auto">
   ${msgs.length?msgs.map((m,i)=>msgHtml(m,i)).join(""):'<div class="sec-sub">'+t("aiExamples")+'</div>'}</div>
  <div style="display:flex;gap:8px;margin-top:12px">
   <input class="inp" id="aiIn" placeholder="${esc(t("aiPlaceholder"))}" style="flex:1">
   <button class="tbtn" id="aiMic" title="${esc(t("dictate"))}">🎤</button>
   <button class="tbtn primary" id="aiSend">${t("send")}</button></div>
 </section>`;

 const log=$("#aiLog");log.scrollTop=log.scrollHeight;
 $("#aiChatSel").onchange=e=>{curId=e.target.value;render(state)};
 $("#aiNew").onclick=async()=>{const ref=await rawAdd(sub(state.tripId,"chats"),{title:t("newChat"),messages:[],created:Date.now(),updated:Date.now()});curId=ref.id;toast("✓")};
 const del=$("#aiDel");if(del)del.onclick=async()=>{if(!confirm(t("deleteChat")+"?"))return;await rawDelete(subDoc(state.tripId,"chats",curId));curId=null;toast("✓")};
 const send=text=>doSend(state,chat,text);
 $("#aiSend").onclick=()=>send($("#aiIn").value);
 $("#aiIn").addEventListener("keydown",e=>{if(e.key==="Enter")send($("#aiIn").value)});
 $("#aiMic").onclick=async()=>{try{const {base64,mime}=await voiceOverlay("⏹ "+t("stopTranscribe"),t("recording"));
   $("#aiIn").value="⏳…";const out=await G.voiceToJournal(base64,mime,getLang());$("#aiIn").value=out.text||""}
  catch(e){if(e.message!=="cancelled")toast("⚠ "+e.message);$("#aiIn").value=""}};
 // apply buttons
 $$("#aiLog [data-apply]").forEach(btn=>btn.onclick=async()=>{
  const [mi,ai]=btn.dataset.apply.split(":").map(Number);
  const m=msgs[mi];if(!m||!m.actions||!m.actions[ai])return;btn.disabled=true;
  try{await G.applyAction(state,m.actions[ai]);m.actions[ai].applied=true;
   await persist(state,chat,chat.messages,chat.title);btn.textContent="✅ "+t("applied");toast("✓")}
  catch(e){btn.disabled=false;toast("⚠ "+e.message)}});
}
function msgHtml(m,i){
 if(m.role==="user")return `<div class="aimsg you"><b>🧑 ${t("you")}:</b> ${esc(m.text)}</div>`;
 let h=`<div class="aimsg bot"><b>🤖 ${t("assistant")}:</b> ${esc(m.text)}</div>`;
 (m.actions||[]).forEach((a,ai)=>{h+=`<div class="aiaction"><span>✨ ${esc(a.summary||a.op)}</span>
   <span>${a.applied?`<span class="mini" style="opacity:.7">✅ ${t("applied")}</span>`:`<button class="mini apply" data-apply="${i}:${ai}">✓ ${t("apply")}</button>`}</span></div>`});
 return h}
async function persist(state,chat,messages,title){
 return rawSet(subDoc(state.tripId,"chats",chat.id),{title:title||chat.title||"",messages,created:chat.created||Date.now(),updated:Date.now()})}
async function doSend(state,chat,text){
 if(!text||!text.trim())return;text=text.trim();$("#aiIn").value="";
 if(!chat){const ref=await rawAdd(sub(state.tripId,"chats"),{title:text.slice(0,40),messages:[],created:Date.now(),updated:Date.now()});curId=ref.id;
  chat={id:ref.id,title:text.slice(0,40),messages:[],created:Date.now()}}
 const prior=chat.messages||[];
 const withUser=[...prior,{role:"user",text}];
 const title=(!chat.title||chat.title===t("newChat"))&&prior.length===0?text.slice(0,40):chat.title;
 await persist(state,chat,withUser,title);
 // show thinking
 const log=$("#aiLog");if(log){log.innerHTML=withUser.map((m,i)=>msgHtml(m,i)).join("")+'<div class="aimsg bot">⏳ …</div>';log.scrollTop=log.scrollHeight}
 try{
  const history=prior.slice(-12).map(m=>({role:m.role==="ai"?"assistant":"user",content:m.text}));
  const res=await G.assistant(text,state,history);
  const aiMsg={role:"ai",text:res.reply||"",actions:(res.actions||[]).map(a=>({...a,applied:false}))};
  await persist(state,{...chat,messages:withUser,title},[...withUser,aiMsg],title);
 }catch(e){await persist(state,{...chat,messages:withUser,title},[...withUser,{role:"ai",text:"⚠ "+e.message}],title)}
}
