// Builds a private daily selection for each registered user from the verified catalogue.
// This does not call an AI service or expose user preferences to the public edition.
export function selectArticles(articles, preferences, allowedCategories) {
 const allowed=new Set(allowedCategories);
 const categories=Array.isArray(preferences?.categories)
  ?new Set(preferences.categories.filter(name=>allowed.has(name))):new Set(allowedCategories);
 const raw=preferences?.dailyLimit;
 const cap=Number.isInteger(raw)&&raw>=0&&raw<=50?raw:15;
 const selected=articles.filter(article=>categories.has(article.category));
 return cap===0?selected:selected.slice(0,cap);
}
export async function publishPersonalized({db,edition,date,contentHash,categories}) {
 const snapshots=await db.collectionGroup('preferences').get();
 const results=new Map();
 for(const snapshot of snapshots.docs){
  if(snapshot.id!=='radar'||snapshot.ref.parent.parent?.parent?.id!==undefined)continue;
  const userRef=snapshot.ref.parent.parent;
  if(!userRef||userRef.parent.id!=='users')continue;
  const uid=userRef.id;
  const articles=selectArticles(edition.articles,snapshot.data(),categories);
  const ref=db.doc('users/'+uid+'/editions/'+date);
  // Do not rewrite an already delivered snapshot of this catalogue.
  const old=await ref.get();
  if(!old.exists||old.data()?.contentHash!==contentHash){
   await ref.set({date,contentHash,articles,createdAt:new Date().toISOString(),status:'published'});
  }
  results.set(uid,articles.length);
 }
 return results;
}
