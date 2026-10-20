// Integrantes de cada equipo y las funciones fijas (doctoras y supervisores).
// Se guardan en el equipo. Los nombres de partida vienen de datos-locales (solo en la PC del ministerio);
// en otro aparato llegan con el respaldo. Así el código que se publica no lleva nombres de personas.
import { leerMeta, guardarMeta } from './almacen.js';

const VACIOS = { equipos: [1, 2, 3].map(n => ({ nombre: 'Equipo ' + n, integrantes: [] })), doctoras: [], supervisores: [] };

let dePartida;
async function partida() {
  if (dePartida) return dePartida;
  try {
    const m = await import('../datos-locales/equipos-iniciales.js');
    dePartida = { equipos: m.EQUIPOS, doctoras: m.DOCTORAS, supervisores: m.SUPERVISORES };
  } catch {
    dePartida = VACIOS; // copia publicada: sin nombres hasta cargar un respaldo
  }
  return dePartida;
}

export async function leerEquipos() {
  return (await leerMeta('equipos')) || structuredClone((await partida()).equipos);
}
export const guardarEquipos = equipos => guardarMeta('equipos', equipos);

// { doctoras: [...], supervisores: [...] }
export async function leerFunciones() {
  const p = await partida();
  return (await leerMeta('funciones')) || { doctoras: [...p.doctoras], supervisores: [...p.supervisores] };
}
export const guardarFunciones = funciones => guardarMeta('funciones', funciones);
