/* ================= AI ASSISTANT (Gemini) ================= */
import {t,tb,getLang} from "../i18n.js";
import {$,$$,esc,toast,voiceOverlay} from "../util.js";
import * as G from "../gemini.js";

let logHtml="";
export function render(state){
 if(!G.configured()){
  $("#view").innerHTML=`<section style="max-width:760px"><div class="sec-h">🤖 ${tb("assistant")}</div>
   <div class="rule"></div><div class="note">${t("aiNoKey")} <a data-nav="settings" style="cursor:pointer;text-decoration:underline">${t("settings")}</a>.</div></section>`;
  return}
 $("#view").innerHTML=`<section style="max-width:760px">
  <div class="sec-h">🤖 ${tb("assistant")}</div>
  <div class="sec-sub">${t("assistantSub")}</div><div class="rule"></div>
  <div id="aiLog" class="card" style="min-height:80px">${logHtml||'<div class="sec-sub">'+t("aiExamples")+'</div>'}</div>
  <div style="display:flex;gap:8px;margin-top:12px">
   <input class="inp" id="aiIn" placeholder="${esc(t("aiPlaceholder"))}" style="flex:1">
   <button class="tbtn" id="aiMic" title="${esc(t("dictate"))}">🎤</button>
   <button class="tbtn primary" id="aiSend">${t("send")}</button>
  </div></section>`;
 const send=async(text)=>{
  if(!text||!text.trim())return;
  logHtml+=`<div class="aimsg you"><b>🧑 ${t("you")}:</b> ${esc(text)}</div>`;
  $("#aiLog").innerHTML=logHtml+'<div class="aimsg bot">⏳ …</div>';$("#aiIn").value="";
  try{
   const res=await G.assistant(text,state);
   let html=`<div class="aimsg bot"><b>🤖 ${t("assistant")}:</b> ${esc(res.reply||"")}</div>`;
   (res.actions||[]).forEach((a,i)=>{
    html+=`<div class="aiaction" data-idx="${i}"><span>✨ ${esc(a.summary||a.op)}</span>
      <span><button class="mini apply" data-apply="${i}">✓ ${t("apply")}</button></span></div>`});
   logHtml+=html;$("#aiLog").innerHTML=logHtml;
   window._aiActions=res.actions||[];
   $$("#aiLog [data-apply]").forEach(btn=>btn.onclick=async()=>{
    const a=window._aiActions[+btn.dataset.apply];if(!a)return;btn.disabled=true;
    try{await G.applyAction(state,a);btn.textContent="✅ "+t("applied");toast("✓ "+(a.summary||""))}
    catch(e){btn.disabled=false;toast("⚠ "+e.message)}});
  }catch(e){logHtml+=`<div class="aimsg bot" style="color:var(--bad)">⚠ ${esc(e.message)}</div>`;$("#aiLog").innerHTML=logHtml}
  $("#aiLog").scrollTop=$("#aiLog").scrollHeight};
 $("#aiSend").onclick=()=>send($("#aiIn").value);
 $("#aiIn").addEventListener("keydown",e=>{if(e.key==="Enter")send($("#aiIn").value)});
 $("#aiMic").onclick=async()=>{
  try{const {base64,mime}=await voiceOverlay("⏹ "+t("stopTranscribe"),t("recording"));
   $("#aiIn").value="⏳…";const out=await G.voiceToJournal(base64,mime,getLang());
   $("#aiIn").value=out.text||"";toast("✓")}catch(e){if(e.message!=="cancelled")toast("⚠ "+e.message);$("#aiIn").value=""}};
}
