export type ShareResult='shared'|'copied'|'manual'|'cancelled';
export async function shareNews(article:{title:string;url:string},bridge:{share?:(data:{title:string;url:string})=>Promise<void>;copy?:(text:string)=>Promise<void>}):Promise<ShareResult>{
 if(bridge.share){try{await bridge.share({title:article.title,url:article.url});return 'shared';}catch(error){if((error as {name?:string}).name==='AbortError')return 'cancelled';}}
 if(bridge.copy){try{await bridge.copy(article.url);return 'copied';}catch{}}
 return 'manual';
}
