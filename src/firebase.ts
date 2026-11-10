import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {getFirestore,collection,getDocsFromServer,getDocFromServer,query,orderBy,limit,where,doc,setDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
import {getMessaging,getToken,deleteToken,isSupported,onMessage} from 'firebase/messaging';
import {madridDate,type RadarData,type Digest,type Update,type LaunchEvent} from './models';
import {firebaseConfig,webPushPublicKey} from './firebase-config';
const e=import.meta.env;
const vapidKey=e.VITE_FIREBASE_VAPID_KEY||webPushPublicKey;
const config={apiKey:e.VITE_FIREBASE_API_KEY||firebaseConfig.apiKey,authDomain:e.VITE_FIREBASE_AUTH_DOMAIN||firebaseConfig.authDomain,projectId:e.VITE_FIREBASE_PROJECT_ID||firebaseConfig.projectId,messagingSenderId:e.VITE_FIREBASE_MESSAGING_SENDER_ID||firebaseConfig.messagingSenderId,appId:e.VITE_FIREBASE_APP_ID||firebaseConfig.appId};
export const configured=e.VITE_DEMO!=='true'&&Object.values(config).every(Boolean);
const app=configured?initializeApp(config):null;
export const auth=app?getAuth(app):null;
if(auth)auth.languageCode='es';
export const db=app?getFirestore(app):null;
export async function login(){
 if(!auth)throw new Error('La demo no inicia sesión. Desactiva VITE_DEMO para conectar con Firebase.');
 try{return await signInWithPopup(auth,new GoogleAuthProvider());}
 catch(error){
  const code=(error as {code?:string}).code;
  const messages:Record<string,string>={
   'auth/unauthorized-domain':'Este dominio todavía no está autorizado en Firebase. Abre la dirección oficial de TechAt7.',
   'auth/operation-not-allowed':'El proveedor Google aún no está habilitado en Firebase Authentication.',
   'auth/popup-blocked':'El navegador ha bloqueado Google. Permite ventanas emergentes para TechAt7 y vuelve a pulsar Entrar.',
   'auth/popup-closed-by-user':'No se ha terminado el acceso con Google. Puedes volver a intentarlo.',
   'auth/network-request-failed':'No se pudo conectar con Google. Revisa Internet y abre TechAt7 en Safari o Chrome.',
  };
  if(code&&messages[code])throw new Error(messages[code]);throw error;
 }
}
export const logout=()=>auth?signOut(auth):Promise.resolve();
async function queryRadar():Promise<RadarData>{
 if(!db)throw new Error('Falta configuración de Firebase.');
 const [d,u,v]=await Promise.all([
  getDocsFromServer(query(collection(db,'digests'),where('status','==','published'),orderBy('date','desc'))),
  getDocsFromServer(query(collection(db,'updates'),orderBy('publishedAt','desc'),limit(40))),
  getDocsFromServer(query(collection(db,'events'),where('confirmed','==',true),where('date','>=',madridDate()),orderBy('date','asc'),limit(40)))
 ]);
 return {digests:d.docs.map(x=>({...x.data(),id:x.id} as Digest)),updates:u.docs.map(x=>({...x.data(),id:x.id} as Update)),events:v.docs.map(x=>({...x.data(),id:x.id} as LaunchEvent))};
}
export async function loadRadar():Promise<RadarData>{
 try{return await queryRadar();}catch(error){
  console.warn('TechAt7: no se pudo consultar Firestore', error);
  const code=(error as {code?:string}).code;
  if(code==='failed-precondition')throw new Error('Estamos terminando de preparar el radar. Vuelve a intentarlo dentro de unos minutos.');
  if(code==='unavailable')throw new Error('No se pudo conectar con el radar. Comprueba tu conexión y vuelve a intentarlo.');
  if(code==='permission-denied')throw new Error('El radar no puede leer los datos todavía. Revisa el acceso e inténtalo de nuevo.');
  throw error;
 }
}
export type PushState='enabled'|'disabled'|'blocked'|'unsupported'|'unverified';
export async function getPushState():Promise<PushState>{
 if(!configured||!db||!auth?.currentUser)return 'disabled';
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!window.isSecureContext)return 'unsupported';
 if(Notification.permission==='denied')return 'blocked';
 if(Notification.permission!=='granted')return 'disabled';
 try{
  const reg=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if(!reg||!await reg.pushManager.getSubscription())return 'disabled';
  const hash=localStorage.getItem('radar-token-id');
  if(!hash||!(/^[a-f0-9]{64}$/).test(hash))return 'disabled';
  const registration=await getDocFromServer(doc(db,'users',auth.currentUser.uid,'tokens',hash));
  return registration.exists()?'enabled':'disabled';
 }catch{return 'unverified';}
}
let foregroundUnsubscribe:(()=>void)|undefined;
export async function enablePush(){
 if(!app||!db||!auth?.currentUser)throw new Error('Inicia sesión con Google para activar avisos.');
 const ownerUid=auth.currentUser.uid;
 if(!vapidKey)throw new Error('Falta configurar la clave pública VAPID.');
 if(!('Notification' in window)||!window.isSecureContext)throw new Error('Se requiere HTTPS y un navegador con notificaciones.');
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 if(ios&&!matchMedia('(display-mode: standalone)').matches)throw new Error('En iOS 16.4 o posterior: Compartir → Añadir a pantalla de inicio. Abre la app instalada y activa los avisos.');
 // Request immediately from the click gesture, before asynchronous capability checks.
 if(await Notification.requestPermission()!=='granted')throw new Error('Permiso no concedido. Puedes cambiarlo en los ajustes del navegador.');
 if(!await isSupported())throw new Error('Este navegador no admite Firebase Messaging.');
 const reg=await navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js');await navigator.serviceWorker.ready;
 const messaging=getMessaging(app);
 const token=await getToken(messaging,{vapidKey,serviceWorkerRegistration:reg});
 if(!token)throw new Error('No se pudo registrar este dispositivo.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 if(auth.currentUser?.uid!==ownerUid)throw new Error('La sesión ha cambiado. Vuelve a activar los avisos.');
 await setDoc(doc(db,'users',ownerUid,'tokens',hash),{token,updatedAt:serverTimestamp()});
 localStorage.setItem('radar-token-id',hash);
 foregroundUnsubscribe?.();
 foregroundUnsubscribe=onMessage(messaging,()=>window.dispatchEvent(new Event('radar-digest')));
}
export async function disablePush(){
 if(!app||!db||!auth?.currentUser)throw new Error('Inicia sesión para quitar este dispositivo.');
 const hash=localStorage.getItem('radar-token-id');
 if(hash)await deleteDoc(doc(db,'users',auth.currentUser.uid,'tokens',hash));
 await deleteToken(getMessaging(app));localStorage.removeItem('radar-token-id');
 foregroundUnsubscribe?.();foregroundUnsubscribe=undefined;
}
