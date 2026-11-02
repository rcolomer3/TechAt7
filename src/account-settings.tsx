import {useEffect,useRef,useState} from 'react';
import type {User} from 'firebase/auth';
import {auth,configured,login,logout} from './firebase';
import {GoogleIcon,Icon} from './icons';
type Health='checking'|'ok'|'warning'|'error';
type Status={state:Health;label:string;detail:string};
const checking={state:'checking' as const,label:'Comprobando',detail:'Verificando la conexión…'};
export function AccountSettings({user,busy,onAction,onRefresh}:{user:User|null;busy:boolean;onAction:(fn:()=>Promise<unknown>,message?:string)=>Promise<void>;onRefresh:()=>Promise<boolean>}){
 const [google,setGoogle]=useState<Status>(checking),[firebase,setFirebase]=useState<Status>(checking),[lastVerified,setLastVerified]=useState<Date|null>(null),[checkingNow,setCheckingNow]=useState(false);
 const sequence=useRef(0);
 function offline(){sequence.current++;setCheckingNow(false);setGoogle({state:'warning',label:user?'Sesión guardada':'Sin conexión',detail:'No se puede verificar la sesión sin Internet.'});setFirebase({state:'warning',label:'Sin conexión',detail:'No se ha podido contactar con Firebase. La última comprobación se conserva.'});}
 async function verify(){
  const attempt=++sequence.current;
  if(!configured){setGoogle({state:'warning',label:'Modo demo',detail:'No hay una sesión de Google activa.'});setFirebase({state:'warning',label:'Sin configurar',detail:'La demostración no está conectada a Firebase.'});return;}
  if(!navigator.onLine){offline();return;}
  if(!user||auth?.currentUser?.uid!==user.uid){setGoogle({state:'warning',label:'Sin sesión',detail:'Entra con Google para verificar tu cuenta.'});setFirebase({state:'warning',label:'Pendiente de acceso',detail:'Primero inicia sesión con tu cuenta.'});return;}
  setCheckingNow(true);setGoogle(checking);setFirebase(checking);
  try{
   // Force a server token refresh: a stored user alone is not a successful verification.
   await user.getIdToken(true);
  }catch(error){
   if(attempt!==sequence.current)return;
   const network=(error as {code?:string}).code==='auth/network-request-failed';
   setGoogle({state:network?'warning':'error',label:network?'No verificado':'Revisar sesión',detail:network?'No se pudo verificar Google. Comprueba tu conexión.':'La sesión no se pudo validar. Cierra sesión y vuelve a entrar con Google.'});
   setFirebase({state:network?'warning':'error',label:'No verificado',detail:'No se ha comprobado la sincronización porque la sesión no está verificada.'});setCheckingNow(false);return;
  }
  if(attempt!==sequence.current)return;
  if(!navigator.onLine){offline();return;}
  setGoogle({state:'ok',label:'Conectado con Google',detail:'Sesión verificada correctamente.'});
  const success=await onRefresh();
  if(attempt!==sequence.current)return;
  if(!navigator.onLine){offline();return;}
  if(success){setFirebase({state:'ok',label:'Conectado a Firebase',detail:'Lectura del servidor confirmada. Tu radar está actualizado.'});setLastVerified(new Date());}
  else setFirebase({state:'error',label:'Error de sincronización',detail:'No se pudieron leer los datos del radar. Comprueba tu conexión y vuelve a intentarlo.'});
  setCheckingNow(false);
 }
 useEffect(()=>{void verify();const disconnect=()=>offline();const reconnect=()=>{void verify();};window.addEventListener('offline',disconnect);window.addEventListener('online',reconnect);return()=>{sequence.current++;window.removeEventListener('offline',disconnect);window.removeEventListener('online',reconnect);};},[user?.uid]);
 const verifiedAt=lastVerified?new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Madrid'}).format(lastVerified):null;
 return <section className="settings-panel" aria-label="Cuenta y sincronización"><div className="group-heading"><span className="group-symbol blue"><GoogleIcon/></span><div><h2>Cuenta de Google</h2></div></div><div className="connection-status" role="status" aria-live="polite"><HealthBadge status={google}/><p>{google.detail}</p></div>{user&&<div className="account-details"><strong>{user.displayName||'Tu cuenta'}</strong><span>{user.email}</span></div>}<div className="firebase-connection"><div className="sync-title"><span className="firebase-symbol"><Icon name="cloud"/></span><div><h3>Conexión del radar</h3><span>Noticias y eventos</span></div></div><div className="connection-status" role="status" aria-live="polite"><HealthBadge status={firebase}/><p>{firebase.detail}</p></div><p className="last-sync">{verifiedAt?<>Última comprobación correcta: <time dateTime={lastVerified!.toISOString()}>{verifiedAt}</time></>:'Aún no hay una comprobación correcta en esta visita.'}</p><button className="sync-check" disabled={checkingNow||busy||!configured||!user} onClick={()=>void verify()}><Icon name="refresh" className={checkingNow?'spinning':''}/>{checkingNow?'Comprobando…':'Comprobar conexión'}</button></div><p className="account-session-note">Tu sesión se conserva en este navegador hasta que decidas salir.</p><button className="account-action" disabled={busy} onClick={()=>void onAction(user?logout:login)}>{busy?'Un momento…':user?'Cerrar sesión':'Entrar con Google'}</button></section>;
}
function HealthBadge({status}:{status:Status}){return <span className={'health-badge health-'+status.state}><span className="health-dot" aria-hidden="true"/>{status.label}</span>}
