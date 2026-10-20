// Servidor para abrir el programa en esta PC (lo usa "Abrir Intervencion en Crisis.bat"). Uso: node servidor.mjs <carpeta> <puerto>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(process.argv[2]);
const puerto = Number(process.argv[3] || 8091);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

http.createServer((pet, resp) => {
  let ruta = decodeURIComponent(new URL(pet.url, 'http://x').pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(raiz, ruta);
  if (!archivo.startsWith(raiz)) { resp.writeHead(403); return resp.end(); }
  fs.readFile(archivo, (err, datos) => {
    if (err) { resp.writeHead(404); return resp.end('no existe'); }
    resp.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    resp.end(datos);
  });
}).on('error', err => {
  // Si ya hay uno abierto (se dio doble clic otra vez), este se retira y el navegador usa el que ya está.
  if (err.code === 'EADDRINUSE') process.exit(0);
  throw err;
}).listen(puerto, '127.0.0.1', 511, () => console.log('listo en', puerto));
