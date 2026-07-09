/* Estaciones Bethel - Service Worker (PWA) */
const CACHE = 'estaciones-bethel-v18';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(CORE); })
      .then(function(){ return self.skipWaiting(); })
      .catch(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function esTile(u){ return /tile|basemaps|cartocdn|openstreetmap|arcgisonline|server\.arcgis/i.test(u); }

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  // Navegacion (HTML): red primero, luego cache
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(r){
        var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put('./index.html', cp); });
        return r;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Mismo origen (app, datos, iconos): cache + actualizacion en segundo plano
  if(url.origin === location.origin){
    e.respondWith(
      caches.match(req).then(function(cached){
        var net = fetch(req).then(function(resp){
          if(resp && resp.status === 200){ var cp = resp.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); }
          return resp;
        }).catch(function(){ return cached; });
        return cached || net;
      })
    );
    return;
  }

  // Tiles del mapa: solo red (no llenar la cache)
  if(esTile(url.href)) return;

  // Otros externos (Leaflet / JSZip CDN, fotos): cache + actualizacion
  e.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(resp){
        try{ var cp = resp.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); }catch(_){}
        return resp;
      }).catch(function(){ return cached; });
      return cached || net;
    })
  );
});
