import { descartarReportesIniciales } from './semilla.js';
import { vistaLista } from './vistas/lista.js';
import { vistaFormulario } from './vistas/formulario.js';
import { vistaDocumento } from './vistas/documento.js';

const raiz = document.getElementById('vista');
let limpiar;
let hayVersionNueva = false;
const llenandoFormulario = () => /^#\/(nuevo|editar)/.test(location.hash);

async function mostrar() {
  // Una ventana abierta desde antes sigue con el programa viejo en memoria: al llegar una versión nueva
  // se recarga sola, pero nunca en medio del formulario (espera a que se salga de él)
  if (hayVersionNueva && !llenandoFormulario()) { location.reload(); return; }
  limpiar?.();
  limpiar = null;
  const [, seccion, id] = (location.hash || '#/').slice(1).split('/');
  if (seccion === 'nuevo') limpiar = await vistaFormulario(raiz, null);
  else if (seccion === 'editar' && id) limpiar = await vistaFormulario(raiz, decodeURIComponent(id));
  else if (seccion === 'ver' && id) limpiar = await vistaDocumento(raiz, decodeURIComponent(id));
  else await vistaLista(raiz);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', mostrar);

(async () => {
  raiz.innerHTML = '<p class="cargando">Preparando los expedientes…</p>';
  try {
    await descartarReportesIniciales();
  } catch (err) {
    console.error('No se pudieron descartar los reportes iniciales', err);
  }
  await mostrar();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const habia = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habia) return; // primera vez que se instala: no hay nada viejo que cambiar
      hayVersionNueva = true;
      if (!llenandoFormulario()) location.reload();
    });
    const registro = await navigator.serviceWorker.register('sw.js').catch(() => null);
    // Buscar versión nueva cada vez que se vuelve al programa, no solo al abrirlo
    document.addEventListener('visibilitychange', () => { if (!document.hidden) registro?.update().catch(() => {}); });
  }
})();
