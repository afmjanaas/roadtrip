/* ================= AI INTEGRATION (multi-provider) =================
   Providers: Groq (FREE — no billing card), Gemini, OpenAI. Keys are stored
   ONLY on this device. Used for voice→journal and the assistant. */
import {sub,subDoc,fs,serverTimestamp,tripRef} from "./db.js";
import {todayISO} from "./util.js";

const PROVIDERS={
 groq:{label:"Groq (free)",base:"https://api.groq.com/openai/v1",chat:"llama-3.3-70b-versatile",
   models:["llama-3.3-70b-versatile","llama-3.1-8b-instant"],whisper:"whisper-large-v3-turbo",keyUrl:"https://console.groq.com/keys",fmt:"openai"},
 gemini:{label:"Google Gemini",chat:"gemini-2.0-flash",
   models:["gemini-2.0-flash","gemini-2.0-flash-lite","gemini-1.5-flash","gemini-1.5-pro"],keyUrl:"https://aistudio.google.com/apikey",fmt:"gemini"},
 openai:{label:"OpenAI",base:"https://api.openai.com/v1",chat:"gpt-4o-mini",
   models:["gpt-4o-mini","gpt-4o"],whisper:"whisper-1",keyUrl:"https://platform.openai.com/api-keys",fmt:"openai"}};
export function providers(){return PROVIDERS}

function migrate(){ // one-time: legacy gemini key -> new scheme
 if(!localStorage.getItem("ftp_ai_provider")){
  const legacy=localStorage.getItem("ftp_gemini_key");
  if(legacy){localStorage.setItem("ftp_ai_provider","gemini");localStorage.setItem("ftp_ai_key_gemini",legacy)}
  else localStorage.setItem("ftp_ai_provider","groq")}}
export function getProvider(){migrate();return localStorage.getItem("ftp_ai_provider")||"groq"}
export function setProvider(p){localStorage.setItem("ftp_ai_provider",p)}
export function getKey(){migrate();return localStorage.getItem("ftp_ai_key_"+getProvider())||""}
export function setKey(k){k?localStorage.setItem("ftp_ai_key_"+getProvider(),k.trim()):localStorage.removeItem("ftp_ai_key_"+getProvider())}
export function getModel(){return localStorage.getItem("ftp_ai_model_"+getProvider())||PROVIDERS[getProvider()].chat}
export function setModel(m){localStorage.setItem("ftp_ai_model_"+getProvider(),m||PROVIDERS[getProvider()].chat)}
export function configured(){return !!getKey()}
export function keyUrl(){return PROVIDERS[getProvider()].keyUrl}

/* ---- core chat call -> returns text or parsed JSON ---- */
async function chat(userText,systemText,jsonMode,inlineAudio,history){
 const key=getKey();if(!key)throw new Error("No AI key set (Settings → AI)");
 const prov=getProvider(),cfg=PROVIDERS[prov];
 if(cfg.fmt==="gemini"){
  const parts=[{text:userText}];if(inlineAudio)parts.push({inline_data:{mime_type:inlineAudio.mime,data:inlineAudio.base64}});
  const contents=(history||[]).map(h=>({role:h.role==="assistant"?"model":"user",parts:[{text:String(h.content||"")}]}));
  contents.push({role:"user",parts});
  const body={contents};
  if(systemText)body.systemInstruction={parts:[{text:systemText}]};
  body.generationConfig={temperature:0.6};if(jsonMode)body.generationConfig.responseMimeType="application/json";
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+getModel()+":generateContent?key="+encodeURIComponent(key);
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){let m="";try{m=(await r.json()).error?.message||""}catch(e){}throw new Error("Gemini "+r.status+(m?": "+m:""))}
  const j=await r.json();const txt=(((j.candidates||[])[0]||{}).content||{}).parts?.map(p=>p.text).join("")||"";
  return jsonMode?safeJSON(txt):txt}
 // OpenAI-compatible (Groq / OpenAI)
 const messages=[];if(systemText)messages.push({role:"system",content:systemText});
 (history||[]).forEach(h=>messages.push({role:h.role==="assistant"?"assistant":"user",content:String(h.content||"")}));
 messages.push({role:"user",content:userText});
 const body={model:getModel(),messages,temperature:0.6};if(jsonMode)body.response_format={type:"json_object"};
 const r=await fetch(cfg.base+"/chat/completions",{method:"POST",
   headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!r.ok){let m="";try{m=(await r.json()).error?.message||""}catch(e){}throw new Error(cfg.label+" "+r.status+(m?": "+m:""))}
 const j=await r.json();const txt=((j.choices||[])[0]||{}).message?.content||"";
 return jsonMode?safeJSON(txt):txt}
function safeJSON(t){try{return JSON.parse(t)}catch(e){const m=t.match(/\{[\s\S]*\}/);if(m){try{return JSON.parse(m[0])}catch(e2){}}throw new Error("AI returned unparseable JSON")}}

/* ---- audio transcription (Groq/OpenAI Whisper) ---- */
/* Whisper (Groq/OpenAI) accepts: flac mp3 mp4 mpeg mpga m4a opus wav webm.
   Android records AAC/ADTS ("audio/aac") which is NOT accepted by name, so we
   upload it as .m4a (same AAC audio) — the API decodes it fine. */
const AUDIO_EXT={"audio/aac":"m4a","audio/aacp":"m4a","audio/x-aac":"m4a","audio/mp4":"m4a","audio/m4a":"m4a",
 "audio/x-m4a":"m4a","audio/mpeg":"mp3","audio/mp3":"mp3","audio/wav":"wav","audio/x-wav":"wav",
 "audio/webm":"webm","audio/ogg":"opus","audio/opus":"opus","audio/flac":"flac"};
async function transcribe(base64,mime){
 const cfg=PROVIDERS[getProvider()];const key=getKey();
 const clean=String(mime||"").split(";")[0].trim().toLowerCase();
 const blob=await (await fetch("data:"+(clean||"audio/m4a")+";base64,"+base64)).blob();
 const ext=AUDIO_EXT[clean]||"m4a";
 const form=new FormData();form.append("file",blob,"audio."+ext);form.append("model",cfg.whisper);
 const r=await fetch(cfg.base+"/audio/transcriptions",{method:"POST",headers:{"Authorization":"Bearer "+key},body:form});
 if(!r.ok){let m="";try{m=(await r.json()).error?.message||""}catch(e){}throw new Error(cfg.label+" transcribe "+r.status+(m?": "+m:""))}
 return (await r.json()).text||""}

/* ---- voice note -> journal entry ---- */
export async function voiceToJournal(base64,mime,lang){
 const sys="You turn a family's spoken travel voice-note into a warm first-person journal entry ("+(lang==="ta"?"Tamil":"same language as spoken")+"). "+
  "Return ONLY JSON {text,best,kids}: text=2-5 sentence entry; best=single best moment (short); kids=what the kids enjoyed (short). Empty string if not mentioned.";
 if(PROVIDERS[getProvider()].fmt==="gemini")
  return chat("Here is the voice note about today on our trip:",sys,true,{base64,mime});
 // Groq/OpenAI: transcribe first, then structure
 const transcript=await transcribe(base64,mime);
 return chat("Voice note transcript:\n"+transcript,sys,true)}
export async function polishText(raw,lang){
 return chat(raw,"Rewrite the note into a warm first-person travel journal entry ("+(lang==="ta"?"Tamil":"same language")+"). Return ONLY JSON {text,best,kids}.",true)}

/* ---- assistant ---- */
export function tripContext(state){
 const tr=state.trip||{};
 const days=(state.days||[]).map(d=>`D${d.ord} ${d.date} ${d.route||""} | stay:${d.hotel||"-"} ${d.hV||0}${d.hCur||""} | km:${d.km||0}`).join("\n");
 return `Trip: ${tr.name} (${tr.start}→${tr.end}), home currency ${tr.currency}, ${(state.days||[]).length} days.\nDays:\n${days}`}
export async function assistant(userText,state,history){
 const sys="You are a trip-planning assistant for a family road-trip app. Either answer, or propose changes as `actions`. "+
  "Return ONLY JSON {reply, actions:[{op,summary,...}]}. Allowed op ONLY: "+
  "addPlace{dayOrd,name,why,city,cur,amount}, editDay{dayOrd,field,value}, setHotel{dayOrd,hotel,cur,amount}, "+
  "addExpense{date,cat,amount,cur,note}, addReminder{title,date,time}, addBooking{title,date,note}. "+
  "cat one of fuel,food,hotel,tickets,parking,shopping,pretrip,other. Dates YYYY-MM-DD. Today "+todayISO()+". "+
  "Never delete. Every action needs a human 'summary'. If unsure, put a question in 'reply' with empty actions.\n\n"+tripContext(state);
 const res=await chat(userText,sys,true,null,history);
 return {reply:res.reply||"",actions:Array.isArray(res.actions)?res.actions:[]}}

/* ---- apply an approved action (logged writes = audit trail) ---- */
export async function applyAction(state,a){
 const id=state.tripId, dayByOrd=o=>(state.days||[]).find(d=>d.ord===o);
 const Q=(cur,v)=>{const fx=(state.trip.fx||{});return +(v*(fx[cur]!=null?fx[cur]:1)).toFixed(2)};
 switch(a.op){
  case "addPlace":{const d=dayByOrd(a.dayOrd)||{};
   return fs.addDoc(sub(id,"places"),{dayOrd:a.dayOrd||1,n:a.name||"Place",city:a.city||d.stay||"",s:4,cur:a.cur||state.trip.currency,
    fam:a.amount||0,cn:a.amount?"":"Free",why:a.why||"",q:(a.name||"")+" "+(a.city||""),wiki:"",on:true,kids:3,ph:3,ta:{}})}
  case "editDay":{const d=dayByOrd(a.dayOrd);if(!d)throw new Error("day not found");
   const patch={};patch[a.field||"route"]=/Q$|hV|km/.test(a.field||"")?(+a.value||0):a.value;
   return fs.updateDoc(subDoc(id,"days",d.id),patch)}
  case "setHotel":{const d=dayByOrd(a.dayOrd);if(!d)throw new Error("day not found");
   return fs.updateDoc(subDoc(id,"days",d.id),{hotel:a.hotel||d.hotel,hCur:a.cur||d.hCur,hV:a.amount!=null?a.amount:d.hV})}
  case "addExpense":{const date=a.date||todayISO();const dd=(state.days||[]).find(x=>x.date===date);
   return fs.addDoc(sub(id,"expenses"),{date,dayOrd:dd?dd.ord:0,cat:a.cat||"other",note:a.note||"",
    cur:a.cur||state.trip.currency,amt:a.amount||0,amtHome:Q(a.cur||state.trip.currency,a.amount||0),by:"🤖 AI",ts:serverTimestamp()})}
  case "addReminder":return fs.addDoc(sub(id,"reminders"),{title:a.title||a.note||"Reminder",date:a.date||todayISO(),time:a.time||"09:00",done:false});
  case "addBooking":return fs.addDoc(sub(id,"bookings"),{type:"other",status:"pending",title:a.title||"Booking",detail:a.note||"",date:a.date||todayISO(),cur:state.trip.currency,voucher:""});
  default:throw new Error("Unknown action: "+a.op)}}
