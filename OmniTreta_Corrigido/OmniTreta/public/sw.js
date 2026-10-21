const CACHE='omnitreta-v1';const CORE=['/','/catalog.json','/universes/dinotreta/universe.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(res=>{if(res.ok){const cloned=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cloned))}return res}).catch(async()=>{const cached=await caches.match(e.request);if(cached)return cached;if(e.request.mode==='navigate')return caches.match('/');throw Error('Recurso não disponível offline')}))});
