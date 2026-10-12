// service-worker.js
// Estratégia Network-First: sempre busca da rede, cache só como fallback offline.
// Versionamento automático: mudando a versão, o cache antigo se autodestrói.

const VERSAO = 'v2'; // 👈 Mude isso a cada deploy importante
const CACHE_NAME = `mamae-bento-${VERSAO}`;

// Arquivos que ficam em cache (fallback offline)
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
  './assets/imagens/remedio.webp',
  './assets/imagens/chutando.webp',
  './assets/imagens/quarto-acordada.webp',
  './assets/imagens/quarto-dormindo.webp'
];

/* =============================================
   INSTALL — pré-carrega o cache inicial
   ============================================= */
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versão:', VERSAO);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS_CACHE).catch((err) => {
        console.warn('[SW] Falha ao cachear alguns arquivos:', err);
      });
    })
  );
  // Força o novo SW a ativar imediatamente (não espera fechar abas)
  self.skipWaiting();
});

/* =============================================
   ACTIVATE — limpa caches antigos
   ============================================= */
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando versão:', VERSAO);
  event.waitUntil(
    caches.keys().then((nomes) => {
      return Promise.all(
        nomes
          .filter((nome) => nome.startsWith('mamae-bento-') && nome !== CACHE_NAME)
          .map((nome) => {
            console.log('[SW] Removendo cache antigo:', nome);
            return caches.delete(nome);
          })
      );
    })
  );
  self.clients.claim();
});

/* =============================================
   FETCH — Network-First
   Sempre tenta rede primeiro. Se falhar, usa cache.
   ============================================= */
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  // Ignora Firebase, Google APIs e fontes externas
  const url = event.request.url;
  if (url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com') ||
      url.includes('firebaseio.com') ||
      url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        // Sucesso: atualiza o cache com a versão nova
        if (resposta && resposta.status === 200 && resposta.type === 'basic') {
          const clone = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return resposta;
      })
      .catch(() => {
        // Falha de rede: usa o cache
        return caches.match(event.request).then((resposta) => {
          if (resposta) return resposta;
          // Fallback final: devolve o index.html (SPA)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

/* =============================================
   MESSAGE — permite o app forçar skipWaiting
   ============================================= */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});