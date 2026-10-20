// Guardado en el propio equipo (IndexedDB). Nada sale a internet.
import { normalizar, idsFotos } from './modelo.js';

const NOMBRE = 'intervencion-crisis';
let conexion;

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((ok, mal) => {
    const pet = indexedDB.open(NOMBRE, 1);
    pet.onupgradeneeded = () => {
      const db = pet.result;
      db.createObjectStore('reportes', { keyPath: 'id' });
      db.createObjectStore('fotos', { keyPath: 'id' });
      db.createObjectStore('meta', { keyPath: 'clave' });
    };
    pet.onsuccess = () => ok(pet.result);
    pet.onerror = () => mal(pet.error);
  });
  return conexion;
}

async function operar(almacen, modo, accion) {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const tx = db.transaction(almacen, modo);
    const pet = accion(tx.objectStore(almacen));
    tx.oncomplete = () => ok(pet?.result);
    tx.onerror = () => mal(tx.error);
  });
}

export const todos = almacen => operar(almacen, 'readonly', s => s.getAll());
export const leer = (almacen, id) => operar(almacen, 'readonly', s => s.get(id));
export const guardar = (almacen, dato) => operar(almacen, 'readwrite', s => s.put(dato));
export const borrar = (almacen, id) => operar(almacen, 'readwrite', s => s.delete(id));

export async function leerMeta(clave) {
  return (await leer('meta', clave))?.valor;
}
export const guardarMeta = (clave, valor) => guardar('meta', { clave, valor });

export async function leerReporte(id) {
  return normalizar(await leer('reportes', id));
}

export async function reportesOrdenados() {
  const lista = (await todos('reportes')).map(normalizar);
  return lista.sort((a, b) => (b.fecha + b.turno).localeCompare(a.fecha + a.turno) || b.creado - a.creado);
}

export async function borrarReporte(reporte) {
  for (const id of idsFotos(normalizar(reporte))) await borrar('fotos', id);
  await borrar('reportes', reporte.id);
}
