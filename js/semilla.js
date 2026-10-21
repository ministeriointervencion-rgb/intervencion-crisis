// Los 3 reportes reales de octubre (15, 16 y 17) se cargaron al principio para probar el programa.
// El ministerio pidió descartarlos (21 oct 2026): se quitan una sola vez de cada equipo, con sus fotos
// y cualquier borrador a medias. Los archivos originales quedaron guardados fuera del programa.
import { leer, borrar, leerMeta, guardarMeta, borrarReporte } from './almacen.js';

const CLAVE = 'reportes-octubre-2026-descartados';
const DESCARTADOS = ['r-2026-10-15', 'r-2026-10-16', 'r-2026-10-17-matutina'];

export async function descartarReportesIniciales() {
  if (await leerMeta(CLAVE)) return;
  for (const id of DESCARTADOS) {
    const reporte = await leer('reportes', id);
    if (reporte) await borrarReporte(reporte);
    const borrador = await leerMeta('borrador:' + id);
    if (borrador) await borrarReporte(borrador);
    await borrar('meta', 'borrador:' + id);
  }
  await guardarMeta(CLAVE, true);
}
