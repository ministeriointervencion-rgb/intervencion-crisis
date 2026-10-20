// Pantalla principal: los expedientes de servicio, cada uno como una hoja con su pestaña (equipo y fecha).
import { reportesOrdenados } from '../almacen.js';
import { diaSemana, cifras, horaBonita } from '../modelo.js';
import { leerEquipos } from '../equipos.js';
import { esc, ir, lleno } from '../util.js';
import { exportarRespaldo, importarRespaldo } from '../respaldo.js';

const MES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
// Color de la pestaña de cada equipo
const COLOR_EQUIPO = { 'Equipo 1': 'terracota', 'Equipo 2': 'azul', 'Equipo 3': 'verde' };

function textoBusqueda(r) {
  return [r.fecha, r.equipo, r.evento, r.tema, r.turno, r.supervision, diaSemana(r.fecha), r.estacion1.doctoras,
    ...r.pacientes.map(p => p.nombre), ...r.traslados.map(t => t.nombre), ...r.puestos.map(p => p.persona),
    ...r.asistencia.map(s => s.nombre)].join(' ').toLowerCase();
}

function hoja(r) {
  const [, m, d] = r.fecha.split('-');
  const c = cifras(r);
  const horario = [horaBonita(r.inicio), horaBonita(r.fin)].filter(lleno).join(' a ');
  return `
    <button class="hoja" data-id="${esc(r.id)}" data-equipo="${esc(r.equipo || '')}" data-riesgo="${c.riesgos > 0}">
      <span class="pestana ${COLOR_EQUIPO[r.equipo] || 'gris'}">${esc(r.equipo || 'Sin equipo')} · ${Number(d)} ${MES[Number(m) - 1]}</span>
      <span class="papel">
        <h3>${esc(diaSemana(r.fecha))}${r.turno ? ' ' + esc(r.turno.toLowerCase()) : ''} — ${esc(r.evento || 'Servicio')}</h3>
        <p>${[lleno(r.supervision) && 'Supervisó ' + esc(r.supervision), horario].filter(Boolean).join(' · ') || 'Sin datos de supervisión'}</p>
        <span class="secciones">
          <span>🩺 Pacientes <b>${c.pacientes}</b></span>
          <span>♿ Traslados <b>${c.traslados}</b></span>
          <span>🔧 Hallazgos <b>${c.hallazgos}</b>${c.pendientes ? `<i>${c.pendientes} pend.</i>` : ''}</span>
          <span>🙋 Servidores <b>${c.servidoresAnotados ? c.servidores : '—'}</b></span>
        </span>
        <span class="hoja-pie">
          ${c.riesgos ? `<span class="marca riesgo">⚠ ${c.riesgos} con riesgo</span>` : ''}
          ${r.cierre.foto ? '<span class="marca ok">✓ Estación entregada</span>' : '<span class="marca falta">Sin foto de cierre</span>'}
        </span>
      </span>
    </button>`;
}

export async function vistaLista(raiz) {
  const reportes = await reportesOrdenados();
  const equipos = (await leerEquipos()).map(e => e.nombre);
  const total = reportes.reduce((s, r) => {
    const c = cifras(r);
    return { pacientes: s.pacientes + c.pacientes, hallazgos: s.hallazgos + c.hallazgos, traslados: s.traslados + c.traslados };
  }, { pacientes: 0, hallazgos: 0, traslados: 0 });

  raiz.innerHTML = `
    <header class="portada-lista">
      <h1>Expedientes de servicio</h1>
      <p class="tira">
        <span><b>${reportes.length}</b> expedientes</span>
        <span><b>${total.pacientes}</b> pacientes</span>
        <span><b>${total.traslados}</b> traslados</span>
        <span><b>${total.hallazgos}</b> hallazgos</span>
      </p>
    </header>
    ${reportes.length ? `
      <div class="filtros">
        <input class="buscar" id="buscar" type="search" placeholder="Buscar día, paciente o servidor">
        <div class="chips chips-filtro" id="filtro">
          <button type="button" class="chip activo" data-filtro="">Todos</button>
          ${equipos.map(e => `<button type="button" class="chip" data-filtro="${esc(e)}">${esc(e)}</button>`).join('')}
          <button type="button" class="chip" data-filtro="riesgo">⚠ Con riesgo</button>
        </div>
      </div>
      <div class="pila" id="pila">${reportes.map(hoja).join('')}</div>
      <p class="tenue" id="sin-resultados" hidden>No hay expedientes que coincidan.</p>`
    : `
      <div class="vacio">
        <h3>Todavía no hay expedientes</h3>
        <p>Toca <b>Abrir expediente nuevo</b> para llenar el primero.</p>
      </div>`}
    <div class="respaldo">
      <p>Para pasar los expedientes a otro equipo (por ejemplo, de la PC al teléfono), guarda un respaldo aquí y ábrelo allá.</p>
      <div class="acciones">
        <button class="boton chico" id="exportar">Guardar respaldo</button>
        <button class="boton chico" id="importar">Cargar respaldo</button>
        <input type="file" id="archivo-respaldo" accept=".json,application/json" hidden>
      </div>
    </div>
    <button class="flotante" id="nuevo">✎ Abrir expediente nuevo</button>`;

  raiz.querySelector('#nuevo').onclick = () => ir('#/nuevo');
  raiz.querySelectorAll('.hoja').forEach(b => { b.onclick = () => ir('#/ver/' + b.dataset.id); });

  if (reportes.length) {
    const textos = new Map(reportes.map(r => [r.id, textoBusqueda(r)]));
    const buscar = raiz.querySelector('#buscar');
    const filtro = raiz.querySelector('#filtro');
    let elegido = '';
    const aplicar = () => {
      const q = buscar.value.trim().toLowerCase();
      let visibles = 0;
      raiz.querySelectorAll('.hoja').forEach(b => {
        const pasaFiltro = !elegido || (elegido === 'riesgo' ? b.dataset.riesgo === 'true' : b.dataset.equipo === elegido);
        const ver = pasaFiltro && (!q || textos.get(b.dataset.id).includes(q));
        b.hidden = !ver;
        visibles += ver;
      });
      raiz.querySelector('#sin-resultados').hidden = visibles > 0;
    };
    buscar.oninput = aplicar;
    filtro.onclick = e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      elegido = chip.dataset.filtro;
      filtro.querySelectorAll('.chip').forEach(x => x.classList.toggle('activo', x === chip));
      aplicar();
    };
  }

  raiz.querySelector('#exportar').onclick = exportarRespaldo;
  const archivo = raiz.querySelector('#archivo-respaldo');
  raiz.querySelector('#importar').onclick = () => archivo.click();
  archivo.onchange = async () => {
    if (archivo.files[0] && await importarRespaldo(archivo.files[0])) vistaLista(raiz);
  };
}
