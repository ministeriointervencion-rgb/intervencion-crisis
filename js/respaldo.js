// Respaldo en un solo archivo (reportes + fotos) para pasar los datos entre la PC y el teléfono.
import { todos, guardar } from './almacen.js';
import { leerEquipos, guardarEquipos, leerFunciones, guardarFunciones } from './equipos.js';
import { leerLugares, guardarLugares } from './lugares.js';
import { normalizar } from './modelo.js';
import { aviso, descargar } from './util.js';

const aTexto = blob => new Promise(ok => {
  const lector = new FileReader();
  lector.onload = () => ok(lector.result);
  lector.readAsDataURL(blob);
});

export async function exportarRespaldo() {
  const reportes = await todos('reportes');
  const fotos = [];
  for (const f of await todos('fotos')) fotos.push({ id: f.id, datos: await aTexto(f.blob) });
  const equipos = await leerEquipos();
  const lugares = await leerLugares();
  const funciones = await leerFunciones();
  const archivo = new Blob([JSON.stringify({ tipo: 'respaldo-intervencion-crisis', version: 1, equipos, funciones, lugares, reportes, fotos })], { type: 'application/json' });
  descargar(archivo, `respaldo-intervencion-crisis-${new Date().toISOString().slice(0, 10)}.json`);
  aviso('Respaldo guardado en Descargas');
}

export async function importarRespaldo(archivo) {
  let datos;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    datos = null;
  }
  if (datos?.tipo !== 'respaldo-intervencion-crisis') {
    aviso('Ese archivo no es un respaldo de este programa');
    return false;
  }
  if (Array.isArray(datos.equipos)) await guardarEquipos(datos.equipos);
  if (datos.funciones?.doctoras) await guardarFunciones(datos.funciones);
  if (datos.lugares?.puestos) await guardarLugares(datos.lugares);
  const actuales = new Map((await todos('reportes')).map(r => [r.id, r]));
  let nuevos = 0, actualizados = 0;
  for (const f of datos.fotos) {
    const blob = await (await fetch(f.datos)).blob();
    await guardar('fotos', { id: f.id, blob });
  }
  for (const r of datos.reportes) {
    const actual = actuales.get(r.id);
    if (actual && actual.actualizado >= r.actualizado) continue; // se queda la versión más reciente
    await guardar('reportes', normalizar(r));
    actual ? actualizados++ : nuevos++;
  }
  aviso(`Respaldo cargado: ${nuevos} reporte(s) nuevo(s), ${actualizados} actualizado(s)`);
  return true;
}
