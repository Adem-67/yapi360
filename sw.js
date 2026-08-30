const CACHE_NAME="yapi360-v3.1.1";
const APP_SHELL=["./","./index.html","./styles.css?v=3.1.1","./data.js?v=3.1.1","./app.js?v=3.1.1","./manifest.webmanifest?v=3.1.1","./icon.svg?v=3.1.1"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("yapi360-")&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:"window"});
    clients.forEach(client=>client.postMessage({type:"YAPI360_UPDATED",version:"3.1.1"}));
  })());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET"||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(new Request(request,{cache:"reload"})).then(response=>{
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put("./index.html",copy));
      return response;
    }).catch(()=>caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
    }
    return response;
  })));
});
