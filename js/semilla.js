// Carga una sola vez los reportes reales guardados en la carpeta datos-locales (solo existe en la PC del ministerio).
import { guardar, leerMeta, guardarMeta } from './almacen.js';
import { normalizar } from './modelo.js';

const CLAVE = 'reportes-octubre-2026-cargados';

export async function cargarReportesIniciales() {
  if (await leerMeta(CLAVE)) return;
  let modulo;
  try {
    modulo = await import('../datos-locales/reportes-iniciales.js');
  } catch {
    return; // copia sin datos locales (por ejemplo, la instalada en otro equipo)
  }
  for (const { archivosFotos, ...datos } of modulo.REPORTES) {
    const reporte = normalizar(datos);
    reporte.fotos = [];
    for (const archivo of archivosFotos) {
      const resp = await fetch('datos-locales/fotos/' + archivo);
      if (!resp.ok) continue;
      const id = reporte.id + '-' + archivo;
      await guardar('fotos', { id, blob: await resp.blob() });
      reporte.fotos.push({ id, nota: '' });
    }
    reporte.creado = reporte.actualizado = Date.now();
    await guardar('reportes', reporte);
  }
  await guardarMeta(CLAVE, true);
}
