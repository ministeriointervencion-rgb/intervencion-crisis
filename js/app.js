import { cargarReportesIniciales } from './semilla.js';
import { vistaLista } from './vistas/lista.js';
import { vistaFormulario } from './vistas/formulario.js';
import { vistaDocumento } from './vistas/documento.js';

const raiz = document.getElementById('vista');
let limpiar;

async function mostrar() {
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
  // La primera vez se guardan los reportes iniciales con sus fotos: tarda unos segundos.
  raiz.innerHTML = '<p class="cargando">Preparando los expedientes…</p>';
  try {
    await cargarReportesIniciales();
  } catch (err) {
    console.error('No se pudieron cargar los reportes iniciales', err);
  }
  await mostrar();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
