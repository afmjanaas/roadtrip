/* ================= FIREBASE / FIRESTORE LAYER ================= */
import {firebaseConfig} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,onAuthStateChanged,signOut as fbSignOut}
 from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,
 collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,orderBy,writeBatch,serverTimestamp}
 from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export const configured=firebaseConfig.apiKey&&firebaseConfig.apiKey!=="PASTE_ME";
let app,auth,dbi;
if(configured){
 app=initializeApp(firebaseConfig);
 auth=getAuth(app);
 dbi=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
}
export {serverTimestamp};
export const fs={collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,orderBy,writeBatch};
export const db=()=>dbi;

/* ---- auth ---- */
export function onAuth(cb){return onAuthStateChanged(auth,cb)}
export async function signIn(){
 const p=new GoogleAuthProvider();
 try{await signInWithPopup(auth,p)}
 catch(e){if(e.code==="auth/popup-blocked"||e.code==="auth/popup-closed-by-user")await signInWithRedirect(auth,p);
  else throw e}}
export function signOut(){return fbSignOut(auth)}
export const user=()=>auth&&auth.currentUser;

/* ---- config / allowlist ---- */
export const configRef=()=>doc(dbi,"app","config");
export async function loadConfig(){const s=await getDoc(configRef());return s.exists()?s.data():null}
export async function claimApp(email,name){
 await setDoc(configRef(),{allowedEmails:[email],owner:email,names:{[email.replace(/\./g,"·")]:name||email},created:serverTimestamp()})}

/* ---- generic helpers ---- */
export const tripsCol=()=>collection(dbi,"trips");
export const tripRef=id=>doc(dbi,"trips",id);
export const sub=(tripId,name)=>collection(dbi,"trips",tripId,name);
export const subDoc=(tripId,name,id)=>doc(dbi,"trips",tripId,name,id);

export function watch(refOrQuery,cb){return onSnapshot(refOrQuery,cb,e=>console.warn("snapshot error",e))}

export async function batchSet(tripId,name,items){ // items: [{id?, ...data}]
 let b=writeBatch(dbi),n=0;
 for(const it of items){
  const {id,...data}=it;
  const r=id?subDoc(tripId,name,id):doc(sub(tripId,name));
  b.set(r,data);n++;
  if(n===400){await b.commit();b=writeBatch(dbi);n=0}}
 if(n)await b.commit()}

export async function deleteSub(tripId,name){
 const ss=await getDocs(sub(tripId,name));
 let b=writeBatch(dbi),n=0;
 for(const d of ss.docs){b.delete(d.ref);n++;if(n===400){await b.commit();b=writeBatch(dbi);n=0}}
 if(n)await b.commit()}

export async function deleteTripDeep(tripId){
 for(const s of ["days","places","stops","expenses","lists","guides"])await deleteSub(tripId,s);
 await deleteDoc(tripRef(tripId))}
