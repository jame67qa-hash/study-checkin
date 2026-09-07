/* 學習打卡 - Service Worker（離線快取） */
var CACHE = 'study-checkin-v2';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(ASSETS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  /* 導航（HTML 頁面）：網路優先，離線時退回快取 → 線上時永遠拿到最新版 */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function(res){
        var clone = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, clone); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* 靜態資源：快取優先，未命中才上網並寫入快取 */
  e.respondWith(
    caches.match(req).then(function(hit){
      if (hit) return hit;
      return fetch(req).then(function(res){
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, clone); });
        }
        return res;
      }).catch(function(){
        return caches.match('./index.html');
      });
    })
  );
});
