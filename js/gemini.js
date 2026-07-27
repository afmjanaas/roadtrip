/* ================= GEMINI (Google AI) INTEGRATION =================
   The API key is stored ONLY on this device (localStorage) — never in the
   repo, never on the public share link. Used for: (1) voice notes -> polished
   journal entries, (2) an assistant that PROPOSES trip changes you approve. */
import {sub,subDoc,fs,serverTimestamp,tripRef} from "./db.js";
import {todayISO} from "./util.js";

const KKEY="ftp_gemini_key", MKEY="ftp_gemini_model";
export function getKey(){return localStorage.getItem(KKEY)||""}
export function setKey(k){k?localStorage.setItem(KKEY,k.trim()):localStorage.removeItem(KKEY)}
export function getModel(){return localStorage.getItem(MKEY)||"gemini-2.0-flash"}
export function setModel(m){localStorage.setItem(MKEY,m||"gemini-2.0-flash")}
export function configured(){return !!getKey()}

async function call(parts,schema,systemText){
 const key=getKey();if(!key)throw new Error("No Gemini API key set (Settings → AI)");
 const body={contents:[{role:"user",parts}]};
 if(systemText)body.systemInstruction={parts:[{text:systemText}]};
 body.generationConfig={temperature:0.6};
 if(schema){body.generationConfig.responseMimeType="application/json";body.generationConfig.responseSchema=schema}
 const url="https://generativelanguage.googleapis.com/v1beta/models/"+getModel()+":generateContent?key="+encodeURIComponent(key);
 const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!r.ok){let m="";try{m=(await r.json()).error?.message||""}catch(e){}throw new Error("Gemini "+r.status+(m?": "+m:""))}
 const j=await r.json();
 const txt=(((j.candidates||[])[0]||{}).content||{}).parts?.map(p=>p.text).join("")||"";
 if(schema){try{return JSON.parse(txt)}catch(e){throw new Error("Gemini returned unparseable JSON")}}
 return txt}

/* ---- voice note -> journal entry ---- */
const JSCHEMA={type:"object",properties:{
 text:{type:"string"},best:{type:"string"},kids:{type:"string"}},required:["text"]};
export async function voiceToJournal(base64,mime,lang){
 const sys="You turn a family's spoken travel voice-note into a warm, first-person journal entry. "+
  "Keep the traveller's own voice and language ("+(lang==="ta"?"Tamil":"English/Tamil as spoken")+"). "+
  "Return JSON: text = 2-5 sentence journal entry; best = the single best moment (short); kids = what the kids enjoyed (short). "+
  "If something isn't mentioned, leave that field empty.";
 return call([{text:"Here is the voice note about today on our trip:"},{inline_data:{mime_type:mime,data:base64}}],JSCHEMA,sys)}
export async function polishText(raw,lang){
 const sys="Rewrite the user's rough note into a warm first-person travel journal entry ("+(lang==="ta"?"Tamil":"same language as input")+"). Return JSON {text,best,kids}.";
 return call([{text:raw}],JSCHEMA,sys)}

/* ---- assistant: propose trip changes (previewed, never auto-applied) ---- */
const ASCHEMA={type:"object",properties:{
 reply:{type:"string"},
 actions:{type:"array",items:{type:"object",properties:{
   op:{type:"string"},   // addPlace | editDay | addExpense | addReminder | addBooking | setHotel
   dayOrd:{type:"integer"}, name:{type:"string"}, why:{type:"string"}, city:{type:"string"},
   cur:{type:"string"}, amount:{type:"number"}, cat:{type:"string"}, note:{type:"string"},
   date:{type:"string"}, time:{type:"string"}, title:{type:"string"},
   hotel:{type:"string"}, field:{type:"string"}, value:{type:"string"},
   summary:{type:"string"}
 },required:["op","summary"]}}},required:["reply"]};
export function tripContext(state){
 const tr=state.trip||{};
 const days=(state.days||[]).map(d=>`D${d.ord} ${d.date} ${d.route||""} | stay:${d.hotel||"-"} ${d.hV||0}${d.hCur||""} | km:${d.km||0}`).join("\n");
 return `Trip: ${tr.name} (${tr.start}→${tr.end}), home currency ${tr.currency}, ${(state.days||[]).length} days.\nDays:\n${days}`}
export async function assistant(userText,state){
 const sys="You are a helpful trip-planning assistant for a family road-trip app. "+
  "Given the user's request and the current trip, either answer, or propose concrete changes as `actions`. "+
  "Allowed op values ONLY: addPlace{dayOrd,name,why,city,cur,amount}, editDay{dayOrd,field,value}, "+
  "setHotel{dayOrd,hotel,cur,amount}, addExpense{date,cat,amount,cur,note}, addReminder{title,date,time}, addBooking{title,date,note}. "+
  "cat is one of fuel,food,hotel,tickets,parking,shopping,pretrip,other. Dates are YYYY-MM-DD. Today is "+todayISO()+". "+
  "Never delete anything. Every action MUST include a human 'summary'. If unsure, ask in 'reply' with no actions.\n\n"+tripContext(state);
 return call([{text:userText}],ASCHEMA,sys)}

/* ---- apply an approved action to Firestore (uses logged writes = audit trail) ---- */
export async function applyAction(state,a){
 const id=state.tripId, dayByOrd=o=>(state.days||[]).find(d=>d.ord===o);
 const dateFor=o=>{const d=dayByOrd(o);return d?d.date:todayISO()};
 const Q=(cur,v)=>{const fx=(state.trip.fx||{});return +(v*(fx[cur]!=null?fx[cur]:1)).toFixed(2)};
 switch(a.op){
  case "addPlace":{const d=dayByOrd(a.dayOrd)||{};
   return fs.addDoc(sub(id,"places"),{dayOrd:a.dayOrd||1,n:a.name||"Place",city:a.city||d.stay||"",
    s:4,cur:a.cur||state.trip.currency,fam:a.amount||0,cn:a.amount?"":"Free",why:a.why||"",q:(a.name||"")+" "+(a.city||""),wiki:"",on:true,kids:3,ph:3,ta:{}})}
  case "editDay":{const d=dayByOrd(a.dayOrd);if(!d)throw new Error("day not found");
   const patch={};patch[a.field||"route"]=/Q$|hV|km/.test(a.field||"")?(+a.value||0):a.value;
   return fs.updateDoc(subDoc(id,"days",d.id),patch)}
  case "setHotel":{const d=dayByOrd(a.dayOrd);if(!d)throw new Error("day not found");
   return fs.updateDoc(subDoc(id,"days",d.id),{hotel:a.hotel||d.hotel,hCur:a.cur||d.hCur,hV:a.amount!=null?a.amount:d.hV})}
  case "addExpense":{const date=a.date||todayISO();
   return fs.addDoc(sub(id,"expenses"),{date,dayOrd:(dayByOrd_byDate(state,date)||0),cat:a.cat||"other",note:a.note||"",
    cur:a.cur||state.trip.currency,amt:a.amount||0,amtHome:Q(a.cur||state.trip.currency,a.amount||0),by:"🤖 AI",ts:serverTimestamp()})}
  case "addReminder":
   return fs.addDoc(sub(id,"reminders"),{title:a.title||a.note||"Reminder",date:a.date||todayISO(),time:a.time||"09:00",done:false});
  case "addBooking":
   return fs.addDoc(sub(id,"bookings"),{type:"other",status:"pending",title:a.title||"Booking",detail:a.note||"",date:a.date||todayISO(),cur:state.trip.currency,voucher:""});
  default:throw new Error("Unknown action: "+a.op)}
}
function dayByOrd_byDate(state,date){const d=(state.days||[]).find(x=>x.date===date);return d?d.ord:0}
