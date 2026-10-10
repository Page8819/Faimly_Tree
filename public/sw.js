/* LEGACY 1.28.0: network-first, offline-capable, no persistent stale app shell. */
const CACHE='legacy-v1.28.0';
const ASSETS=['./','./index.html','./styles.css','./interface.css','./app.js','./living-context.js','./living-psychology.js','./living-decisions.js','./living-storylines.js','./living-impact.js','./attention.js','./calendar.js','./timeline.js','./human.js','./medicine.js','./education.js','./careers.js','./economy.js','./relationships.js','./consequences.js','./events.js','./succession.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('legacy-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok)await cache.put(request,response.clone());
   return response;
  }catch(error){
   const cached=await caches.match(request,{ignoreSearch:true});
   if(cached)return cached;
   if(request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
   return Response.error();
  }
 })());
});
