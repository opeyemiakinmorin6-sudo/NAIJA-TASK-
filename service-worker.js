const CACHE_NAME='naija-task-shell-v17-seasonal-role-themes';
const APP_SHELL=[
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/assets/naija-task-logo.svg',
  '/assets/naija-task-logo-seasonal.svg',
  '/assets/naija-task-tasker.svg',
  '/assets/naija-task-tasker-seasonal.svg',
  '/assets/naija-task-share.jpg',
  '/brain-battle.html',
  '/naija-games.html',
  '/arena.html'
];
self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request,{cache:'no-store'}).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>caches.match(request).then(cached=>cached||caches.match('/index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
      }
      return response;
    }))
  );
});
