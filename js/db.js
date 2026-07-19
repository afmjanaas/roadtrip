/* ================= FIREBASE / FIRESTORE LAYER (with activity logging) ================= */
import {firebaseConfig} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,onAuthStateChanged,signOut as fbSignOut}
 from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,
 collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,orderBy,limit,writeBatch,serverTimestamp}
 from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export const configured=firebaseConfig.apiKey&&firebaseConfig.apiKey!=="PASTE_ME";
let app,auth,dbi;
if(configured){
 app=initializeApp(firebaseConfig);
 auth=getAuth(app);
 dbi=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
}
export {serverTimestamp};
export const db=()=>dbi;

/* ---- activity log (owner-readable only — see firestore.rules) ---- */
const INTEREST=["n","name","route","title","note","amt","cat","cur","date","hotel","stay","on","done","ord","km","hV"];
function summarize(data){if(!data)return"";
 const parts=[],keys=Object.keys(data);
 INTEREST.forEach(k=>{const v=data[k];
  if(v!==undefined&&typeof v!=="object"){const s=String(v);if(s.length<=60)parts.push(k+"="+s)}});
 const rest=keys.filter(k=>!INTEREST.includes(k));
 if(rest.length)parts.push("fields: "+rest.slice(0,10).join(","));
 return parts.join(" · ").slice(0,300)}
export function logActivity(action,path,summary){
 if(!auth||!auth.currentUser)return Promise.resolve();
 return addDoc(collection(dbi,"activity"),{
  ts:serverTimestamp(),email:auth.currentUser.email,name:auth.currentUser.displayName||"",
  action,path:String(path||"").slice(0,200),summary:String(summary||"").slice(0,300)}).catch(()=>{})}

/* logged wrappers — every write through fs.* is recorded automatically */
async function addDocL(ref,data){const r=await addDoc(ref,data);logActivity("create",ref.path+"/"+r.id,summarize(data));return r}
async function updateDocL(ref,data){const r=await updateDoc(ref,data);logActivity("update",ref.path,summarize(data));return r}
async function deleteDocL(ref){const r=await deleteDoc(ref);logActivity("delete",ref.path,"");return r}
async function setDocL(ref,data,o){const r=o?await setDoc(ref,data,o):await setDoc(ref,data);logActivity("update",ref.path,summarize(data));return r}
function writeBatchL(dbArg){const b=writeBatch(dbArg||dbi);let n=0;const paths=[];
 ["set","update","delete"].forEach(k=>{const o=b[k].bind(b);
  b[k]=(ref,...a)=>{n++;if(paths.length<3&&ref&&ref.path)paths.push(ref.path);return o(ref,...a)}});
 const c=b.commit.bind(b);
 b.commit=async()=>{const r=await c();logActivity("bulk",paths.join(" ; "),n+" changes");return r};
 return b}
export const fs={collection,doc,getDoc,getDocs,onSnapshot,query,orderBy,limit,
 setDoc:setDocL,addDoc:addDocL,updateDoc:updateDocL,deleteDoc:deleteDocL,writeBatch:writeBatchL};

/* ---- auth ---- */
export function onAuth(cb){return onAuthStateChanged(auth,cb)}
export async function signIn(){
 const p=new GoogleAuthProvider();
 try{await signInWithPopup(auth,p)}
 catch(e){if(e.code==="auth/popup-blocked"||e.code==="auth/popup-closed-by-user")await signInWithRedirect(auth,p);
  else throw e}}
export function signOut(){logActivity("logout","","");return fbSignOut(auth)}
export const user=()=>auth&&auth.currentUser;

/* ---- config / allowlist ---- */
export const configRef=()=>doc(dbi,"app","config");
export async function loadConfig(){const s=await getDoc(configRef());return s.exists()?s.data():null}
export async function claimApp(email,name){
 await setDoc(configRef(),{allowedEmails:[email],owner:email,names:{[email.replace(/\./g,"·")]:name||email},created:serverTimestamp()});
 logActivity("create","app/config","claimed app as owner")}

/* ---- generic helpers ---- */
export const tripsCol=()=>collection(dbi,"trips");
export const tripRef=id=>doc(dbi,"trips",id);
export const sub=(tripId,name)=>collection(dbi,"trips",tripId,name);
export const subDoc=(tripId,name,id)=>doc(dbi,"trips",tripId,name,id);
export const activityCol=()=>collection(dbi,"activity");

export function watch(refOrQuery,cb){return onSnapshot(refOrQuery,cb,e=>console.warn("snapshot error",e))}

export async function batchSet(tripId,name,items){
 let b=writeBatch(dbi),n=0;
 for(const it of items){
  const {id,...data}=it;
  const r=id?subDoc(tripId,name,id):doc(sub(tripId,name));
  b.set(r,data);n++;
  if(n===400){await b.commit();b=writeBatch(dbi);n=0}}
 if(n)await b.commit();
 logActivity("bulk","trips/"+tripId+"/"+name,items.length+" items written")}

export async function deleteSub(tripId,name){
 const ss=await getDocs(sub(tripId,name));
 let b=writeBatch(dbi),n=0;
 for(const d of ss.docs){b.delete(d.ref);n++;if(n===400){await b.commit();b=writeBatch(dbi);n=0}}
 if(n)await b.commit()}

export async function deleteTripDeep(tripId){
 for(const s of ["days","places","stops","expenses","lists","guides"])await deleteSub(tripId,s);
 await deleteDoc(tripRef(tripId));
 logActivity("delete","trips/"+tripId,"ENTIRE TRIP deleted")}
