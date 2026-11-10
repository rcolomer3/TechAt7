import type {SVGProps} from 'react';
type IconName='share'|'bookmark'|'today'|'archive'|'updates'|'calendar'|'settings'|'refresh'|'sun'|'moon'|'display'|'appearance'|'check'|'bell'|'radar'|'cloud'|'search';
const paths:Record<IconName,React.ReactNode>={
 search:<><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/></>,
 share:<><path d="M12 15V2m-4 4 4-4 4 4M7 10H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2"/></>,
 bookmark:<path d="M6 3h12v18l-6-4-6 4V3z"/>,
 cloud:<><path d="M7 18H6a4 4 0 0 1-.4-8A6.5 6.5 0 0 1 18 8.2a5 5 0 0 1 0 9.8h-1M9 16l3 3 3-3m-3-6v9"/></>,
 sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></>,
 moon:<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14z"/>,
 display:<><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
 appearance:<><circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18" fill="currentColor" stroke="none"/></>,
 check:<path d="m5 12 4 4L19 6"/>,
 bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
 radar:<><path d="M4 20V4m0 16h16M4 4a16 16 0 0 1 16 16M4 10a10 10 0 0 1 10 10m-10 0L15 9"/><circle cx="14" cy="10" r="2" fill="currentColor"/></>,
 today:<><rect x="3" y="4" width="18" height="17" rx="4"/><path d="M7 2v4m10-4v4M3 10h18m-13 5h3m3 0h2m-8 3h3"/></>,
 archive:<><rect x="3" y="3" width="18" height="5" rx="2"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-10 5h6"/></>,
 updates:<><rect x="4" y="3" width="16" height="18" rx="4"/><path d="m8 11 4-4 4 4m-4-4v10"/></>,
 calendar:<><rect x="3" y="4" width="18" height="17" rx="4"/><path d="M7 2v4m10-4v4M3 10h18m-9 3 .9 1.9L15 15l-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1L9 15l2.1-.1z"/></>,
 settings:<><path d="m9 3-.6 2.2-2 .9-2-.6-2 3.5L4 10.6v2.8l-1.6 1.6 2 3.5 2-.6 2 .9L9 21h4l.6-2.2 2-.9 2 .6 2-3.5-1.6-1.6v-2.8L19.6 9l-2-3.5-2 .6-2-.9L13 3z"/><circle cx="11" cy="12" r="3"/></>,
 refresh:<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></>
};
export function Icon({name,...props}:SVGProps<SVGSVGElement>&{name:IconName}){return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>}
export function PlatformIcon({platform}:{platform:string}){
 if(platform==='Windows')return <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true" fill="currentColor"><path d="m3 6 11-1.5V15H3zm13-1.8L29 2v13H16zM3 17h11v10.5L3 26zm13 0h13v13l-13-2.2z"/></svg>;
 return <svg viewBox="0 0 32 32" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{platform==='iOS'?<><rect x="8" y="2" width="16" height="28" rx="4"/><path d="M13 5h6m-4 21h2"/></>:platform==='macOS'?<><rect x="2" y="4" width="28" height="20" rx="3"/><path d="M2 19h28m-17 5-1 5m7-5 1 5m-11 0h14"/><circle cx="16" cy="21.5" r=".4" fill="currentColor"/></>:<><rect x="3" y="5" width="26" height="22" rx="3"/><path d="M9 9v13m7-13v13m7-13v9M7 24h4m3 0h4m3 0h4"/><circle cx="23" cy="21" r="1" fill="currentColor"/></>}</svg>;
}
export function GoogleIcon(){return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M44 24.5c0-1.5-.1-2.7-.4-4.1H24v7.8h11.3a9.7 9.7 0 0 1-4.2 6.3v5.2h6.7c4-3.7 6.2-9 6.2-15.2"/><path fill="#34A853" d="M24 45c5.6 0 10.3-1.9 13.8-5.3l-6.7-5.2c-1.9 1.3-4.3 2.1-7.1 2.1-5.5 0-10.2-3.7-11.9-8.7H5.2v5.4A20.9 20.9 0 0 0 24 45"/><path fill="#FBBC05" d="M12.1 27.9a12.6 12.6 0 0 1 0-7.8v-5.4H5.2a21 21 0 0 0 0 18.6z"/><path fill="#EA4335" d="M24 11.4c3 0 5.6 1 7.7 3l5.8-5.8A20.1 20.1 0 0 0 24 3 20.9 20.9 0 0 0 5.2 14.7l6.9 5.4c1.7-5 6.4-8.7 11.9-8.7"/></svg>}

export function AppIcon({className}:{className?:string}){return <img className={className} src={import.meta.env.BASE_URL+'icon-v3.svg'} alt="" aria-hidden="true" draggable={false}/>;}
