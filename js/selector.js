// Ventana para elegir personas con un toque, agrupadas por equipo.
import { esc } from './util.js';

const separar = v => String(v || '').split(',').map(t => t.trim()).filter(Boolean);

// grupos: [{ titulo, nombres }]. Devuelve el texto elegido, o null si se cierra sin elegir.
export function elegirPersona({ titulo, grupos, actual = '', multiple = false }) {
  return new Promise(resolver => {
    const elegidos = new Set(separar(actual));
    // Nombres escritos a mano antes (por ejemplo en los reportes cargados del Word) que no están en las listas
    const conocidos = new Set(grupos.flatMap(g => g.nombres));
    const aMano = multiple ? [...elegidos].filter(n => !conocidos.has(n)) : [];
    const textoActual = !multiple && String(actual || '').trim() && !conocidos.has(String(actual).trim()) ? String(actual).trim() : '';
    const todos = [...(aMano.length ? [{ titulo: 'Anotados en este reporte (toca para quitar)', nombres: aMano }] : []), ...grupos];
    const capa = document.createElement('div');
    capa.className = 'capa';
    capa.innerHTML = `
      <div class="hoja-selector" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
        <div class="hoja-cabeza">
          <h2>${esc(titulo)}</h2>
          <button type="button" class="cerrar" data-cerrar aria-label="Cerrar">×</button>
        </div>
        <p class="ayuda">${multiple ? 'Toca todas las personas que estuvieron y luego «Listo». Puedes escribir nombres a mano abajo.' : 'Toca la persona, o escríbela a mano abajo.'}</p>
        <div class="hoja-cuerpo">
          ${textoActual ? `
            <div class="grupo-personas">
              <span class="grupo-titulo">Nombre anotado (puedes corregirlo)</span>
              <div class="otro-nombre">
                <input id="anotado" value="${esc(textoActual)}" autocomplete="off" aria-label="Nombre anotado">
                <button type="button" class="boton chico principal" data-anotado>Guardar</button>
              </div>
            </div>` : ''}
          ${todos.filter(g => g.nombres.length).map(g => `
            <div class="grupo-personas">
              <span class="grupo-titulo">${esc(g.titulo)}</span>
              <div class="chips">${g.nombres.map(n =>
                `<button type="button" class="chip${elegidos.has(n) ? ' activo' : ''}" data-nombre="${esc(n)}">${esc(n)}</button>`).join('')}</div>
            </div>`).join('')}
          <div class="grupo-personas">
            <span class="grupo-titulo">Escribir a mano</span>
            <div class="otro-nombre">
              <input id="otro" placeholder="Nombre de la persona" autocomplete="off">
              <button type="button" class="boton chico" data-otro>Agregar</button>
            </div>
          </div>
        </div>
        <div class="hoja-pie">
          <button type="button" class="boton chico peligro" data-vaciar>Dejar vacío</button>
          ${multiple ? '<button type="button" class="boton principal" data-listo>Listo</button>' : ''}
        </div>
      </div>`;
    document.body.append(capa);
    document.body.classList.add('sin-desplazar');

    const cerrar = valor => {
      capa.remove();
      document.body.classList.remove('sin-desplazar');
      document.removeEventListener('keydown', teclas);
      resolver(valor);
    };
    const teclas = e => { if (e.key === 'Escape') cerrar(null); };
    document.addEventListener('keydown', teclas);

    const otro = capa.querySelector('#otro');
    const agregarOtro = () => {
      const nombre = otro.value.trim();
      if (!nombre) { otro.focus(); return; }
      if (!multiple) { cerrar(nombre); return; }
      elegidos.add(nombre);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip activo';
      chip.dataset.nombre = nombre;
      chip.textContent = nombre;
      otro.parentElement.before(chip);
      otro.value = '';
    };
    otro.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregarOtro(); } });
    const anotado = capa.querySelector('#anotado');
    anotado?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); cerrar(anotado.value.trim()); } });

    capa.addEventListener('click', e => {
      if (e.target === capa || e.target.closest('[data-cerrar]')) return cerrar(null);
      if (e.target.closest('[data-vaciar]')) return cerrar('');
      if (e.target.closest('[data-listo]')) return cerrar([...elegidos].join(', '));
      if (e.target.closest('[data-otro]')) return agregarOtro();
      if (e.target.closest('[data-anotado]')) return cerrar(anotado.value.trim());
      const chip = e.target.closest('[data-nombre]');
      if (!chip) return;
      const nombre = chip.dataset.nombre;
      if (!multiple) return cerrar(nombre);
      elegidos.has(nombre) ? elegidos.delete(nombre) : elegidos.add(nombre);
      chip.classList.toggle('activo', elegidos.has(nombre));
    });
  });
}

// Ventana para renombrar, agregar, quitar y ordenar una lista de lugares (puestos o áreas).
// Devuelve [{ antes, nombre }] (antes = nombre anterior, o null si es nuevo), o null si se cancela.
export function editarLista({ titulo, nombres, singular }) {
  return new Promise(resolver => {
    const filas = nombres.map(n => ({ antes: n, nombre: n }));
    const capa = document.createElement('div');
    capa.className = 'capa';
    const leerCasillas = () => capa.querySelectorAll('[data-fila]').forEach(c => { filas[Number(c.dataset.fila)].nombre = c.value; });
    const dibujar = () => {
      capa.innerHTML = `
        <div class="hoja-selector" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
          <div class="hoja-cabeza">
            <h2>${esc(titulo)}</h2>
            <button type="button" class="cerrar" data-cerrar aria-label="Cerrar">×</button>
          </div>
          <p class="ayuda">Toca un nombre para cambiarlo. Las flechas cambian el orden.</p>
          <div class="hoja-cuerpo">
            <ol class="lista-editable">${filas.map((f, i) => `
              <li>
                <input data-fila="${i}" value="${esc(f.nombre)}" aria-label="${esc(singular)} ${i + 1}">
                <button type="button" class="flecha" data-subir="${i}" aria-label="Subir"${i ? '' : ' disabled'}>↑</button>
                <button type="button" class="flecha" data-bajar="${i}" aria-label="Bajar"${i < filas.length - 1 ? '' : ' disabled'}>↓</button>
                <button type="button" class="flecha quitar-x" data-quitar="${i}" aria-label="Quitar ${esc(f.nombre)}">✕</button>
              </li>`).join('')}</ol>
            <div class="otro-nombre">
              <input id="nuevo" placeholder="Nuevo ${esc(singular.toLowerCase())}" autocomplete="off">
              <button type="button" class="boton chico" data-agregar>Agregar</button>
            </div>
          </div>
          <div class="hoja-pie">
            <button type="button" class="boton chico" data-cerrar>Cancelar</button>
            <button type="button" class="boton principal" data-guardar>Guardar</button>
          </div>
        </div>`;
      capa.querySelector('#nuevo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } });
    };
    const agregar = () => {
      leerCasillas();
      const nombre = capa.querySelector('#nuevo').value.trim();
      if (!nombre) return;
      filas.push({ antes: null, nombre });
      dibujar();
      capa.querySelector('#nuevo').focus();
    };
    const mover = (i, j) => { leerCasillas(); [filas[i], filas[j]] = [filas[j], filas[i]]; dibujar(); };
    const cerrar = valor => {
      capa.remove();
      document.body.classList.remove('sin-desplazar');
      resolver(valor);
    };
    capa.addEventListener('click', e => {
      if (e.target === capa || e.target.closest('[data-cerrar]')) return cerrar(null);
      if (e.target.closest('[data-guardar]')) {
        leerCasillas();
        return cerrar(filas.map(f => ({ ...f, nombre: f.nombre.trim() })).filter(f => f.nombre));
      }
      if (e.target.closest('[data-agregar]')) return agregar();
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.subir) mover(Number(b.dataset.subir), Number(b.dataset.subir) - 1);
      else if (b.dataset.bajar) mover(Number(b.dataset.bajar), Number(b.dataset.bajar) + 1);
      else if (b.dataset.quitar) { leerCasillas(); filas.splice(Number(b.dataset.quitar), 1); dibujar(); }
    });
    dibujar();
    document.body.append(capa);
    document.body.classList.add('sin-desplazar');
  });
}

// Ventana para agregar o quitar integrantes de un equipo. Devuelve la lista nueva, o null si se cancela.
export function editarIntegrantes(equipo) {
  return new Promise(resolver => {
    const lista = [...equipo.integrantes];
    const capa = document.createElement('div');
    capa.className = 'capa';
    const dibujar = () => {
      capa.innerHTML = `
        <div class="hoja-selector" role="dialog" aria-modal="true" aria-label="Integrantes de ${esc(equipo.nombre)}">
          <div class="hoja-cabeza">
            <h2>Integrantes de ${esc(equipo.nombre)}</h2>
            <button type="button" class="cerrar" data-cerrar aria-label="Cerrar">×</button>
          </div>
          <div class="hoja-cuerpo">
            ${lista.length ? `<ol class="integrantes">${lista.map((n, i) => `
              <li><span>${esc(n)}</span><button type="button" class="quitar" data-quitar="${i}">Quitar</button></li>`).join('')}</ol>`
              : '<p class="tenue">Este equipo todavía no tiene integrantes.</p>'}
            <div class="otro-nombre">
              <input id="nuevo" placeholder="Nombre del nuevo integrante" autocomplete="off">
              <button type="button" class="boton chico" data-agregar>Agregar</button>
            </div>
          </div>
          <div class="hoja-pie">
            <button type="button" class="boton chico" data-cerrar>Cancelar</button>
            <button type="button" class="boton principal" data-guardar>Guardar</button>
          </div>
        </div>`;
      capa.querySelector('#nuevo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } });
    };
    const agregar = () => {
      const nombre = capa.querySelector('#nuevo').value.trim();
      if (!nombre) return;
      lista.push(nombre);
      dibujar();
      capa.querySelector('#nuevo').focus();
    };
    const cerrar = valor => {
      capa.remove();
      document.body.classList.remove('sin-desplazar');
      resolver(valor);
    };
    capa.addEventListener('click', e => {
      if (e.target === capa || e.target.closest('[data-cerrar]')) return cerrar(null);
      if (e.target.closest('[data-guardar]')) return cerrar(lista);
      if (e.target.closest('[data-agregar]')) return agregar();
      const quitar = e.target.closest('[data-quitar]');
      if (quitar) { lista.splice(Number(quitar.dataset.quitar), 1); dibujar(); }
    });
    dibujar();
    document.body.append(capa);
    document.body.classList.add('sin-desplazar');
  });
}
