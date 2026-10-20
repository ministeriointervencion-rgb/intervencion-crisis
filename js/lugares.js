// Listas de puestos y de áreas del recorrido. El ministerio las puede renombrar, ampliar y ordenar;
// se guardan en el equipo y las usan los reportes nuevos.
import { leerMeta, guardarMeta } from './almacen.js';
import { LUGARES_DE_PARTIDA } from './modelo.js';

const CLAVE = 'lugares';

export async function leerLugares() {
  return { ...structuredClone(LUGARES_DE_PARTIDA), ...((await leerMeta(CLAVE)) || {}) };
}

export const guardarLugares = lugares => guardarMeta(CLAVE, lugares);
