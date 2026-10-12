// service-worker.js
// Cache offline do app Mamãe & Bento

const CACHE_NAME = 'mamae-bento-v1';

const ARQUIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon.svg',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/firebase-config.js',
  './assets/icones/icon-192.png',
  './assets/icones/icon-512.png',
  './assets/icones/apple-touch-icon.png',
  './assets/icones/favicon-96x96.png',
  './assets/imagens/mamae-bento-logo.webp',
  './assets/imagens/lanche.webp',
  './assets/imagens/quarto-acordada.webp',
  './assets/imagens/quarto-dormindo.webp'
];

// Instala e faz o cache inicial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache inicial criado');
      return cache.addAll(ARQUIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: cache-first, depois rede
self.addEventListener('fetch', (event) => {
  // Ignora requisições do Firebase (sempre online)
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((resposta) => {
      return resposta || fetch(event.request).then((res) => {
        // Cache dinâmico: guarda o que for novo
        if (event.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return res;
      });
    }).catch(() => caches.match('./index.html'))
  );
});