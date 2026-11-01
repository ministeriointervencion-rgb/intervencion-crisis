// Permite usar el programa sin internet. Al cambiar archivos, subir VERSION para renovar la copia.
const VERSION = 'intervencion-v18';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/estilos.css',
  'icons/logo-marca.png', 'icons/logo-completo.png', 'icons/icono-192.png', 'icons/icono-512.png',
  'icons/cartel/fondo.png', 'icons/cartel/clinicos.png', 'icons/cartel/medicamentos.png', 'icons/cartel/oracion.png', 'icons/cartel/ministracion.png', 'icons/cartel/sillaRuedas.png', 'icons/cartel/muletas.png',
  'icons/cartel/liberacion.png', 'icons/cartel/trauma.png', 'icons/cartel/presion.png', 'icons/cartel/acompanamientos.png', 'icons/cartel/baston.png', 'icons/cartel/psicomotriz.png', 'icons/cartel/otras.png',
  'fonts/fraunces.woff2', 'fonts/inter.woff2',
  'js/app.js', 'js/almacen.js', 'js/modelo.js', 'js/util.js', 'js/semilla.js', 'js/respaldo.js',
  'js/contenido.js', 'js/word.js', 'js/cartel.js', 'js/lib/docx.umd.js', 'js/equipos.js', 'js/selector.js', 'js/lugares.js',
  'js/vistas/lista.js', 'js/vistas/formulario.js', 'js/vistas/documento.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero la red (para recibir mejoras); sin conexión, la copia guardada.
// Los datos de pacientes (datos-locales) nunca se guardan en la copia.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.includes('/datos-locales/')) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(resp => {
        if (resp.ok) { const copia = resp.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
        return resp;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
