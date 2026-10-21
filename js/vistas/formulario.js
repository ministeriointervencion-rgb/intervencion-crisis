// Abrir o editar un expediente de servicio, paso a paso. Casi todo se elige con toques;
// lo escrito se guarda solo como borrador mientras se llena.
import { leer, leerReporte, guardar, borrar, leerMeta, guardarMeta, reportesOrdenados } from '../almacen.js';
import {
  reporteNuevo, normalizar, idsFotos, areaNueva, trasladoNuevo, puestoNuevo, pacienteNuevo, servidorNuevo, versiculoNuevo,
  RESUMEN, ESTACION, TEMPLO, TURNOS, EVENTOS, TRATAMIENTOS, ESTADO_APERTURA, ESTADO_CIERRE,
  MOTIVOS_TRASLADO, MEDIOS_TRASLADO, ORIGENES_TRASLADO, DESTINOS_TRASLADO, LLEGADAS_PACIENTE, EVOLUCIONES, MINISTRACION,
  CORRECCIONES, ASISTENCIA, fechaLarga, horaBonita,
} from '../modelo.js';
import { leerEquipos, guardarEquipos, leerFunciones, guardarFunciones } from '../equipos.js';
import { leerLugares, guardarLugares } from '../lugares.js';
import { elegirPersona, editarIntegrantes, editarLista } from '../selector.js';
import { esc, aviso, ir, reducirFoto, lleno } from '../util.js';

const PASOS = ['Servicio', 'Resumen', 'Puestos', 'Servidores', 'Estación 1', 'Pacientes', 'Traslados', 'Recorrido', 'Mejoras', 'Cierre'];
const PASO_SERVIDORES = 3;

// Casillas donde se pueden marcar varias personas (en cualquier puesto puede haber más de una)
const variasPersonas = ruta => ruta === 'supervision' || ruta === 'estacion1.doctoras'
  || /^puestos\.\d+\.persona$/.test(ruta) || /^pacientes\.\d+\.ministradoPor$/.test(ruta);

// Listas que el ministerio puede renombrar y ampliar
const LISTAS = {
  puestos: { titulo: 'Puestos del equipo', singular: 'Puesto', crear: puestoNuevo },
  areasExternas: { titulo: 'Áreas externas del recorrido', singular: 'Área', crear: areaNueva },
  areasInternas: { titulo: 'Áreas internas del recorrido', singular: 'Área', crear: areaNueva },
};

const VACIOS = {
  pacientes: pacienteNuevo,
  traslados: trasladoNuevo,
  medicamentos: () => ({ nombre: '', detalle: '' }),
  versiculos: versiculoNuevo,
  areasExternas: () => areaNueva(),
  areasInternas: () => areaNueva(),
  asistencia: () => servidorNuevo(),
  mejoras: () => '',
  logros: () => '',
};

// ---------- lectura y escritura por ruta ("pacientes.0.nombre") ----------
const tomar = (obj, ruta) => ruta.split('.').reduce((o, p) => o?.[p], obj);
function poner(obj, ruta, valor) {
  const partes = ruta.split('.');
  const ultima = partes.pop();
  partes.reduce((o, p) => o[p], obj)[ultima] = valor;
}

const unicos = lista => [...new Set(lista.map(t => String(t).trim()).filter(Boolean))];
const separarNombres = v => String(v || '').split(/[,\/–]| y /).map(t => t.replace(/^\(.*?\):?/, '').trim()).filter(t => t && !/^clausurad/i.test(t));
const tieneToken = (lista, t) => String(lista || '').split(',').map(x => x.trim().toLowerCase()).includes(t.toLowerCase());
const horaActual = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// Sugerencias sacadas de los reportes anteriores
function sugerencias(otros) {
  return {
    diagnosticos: unicos(otros.flatMap(o => o.pacientes.map(p => p.dx))),
    temas: unicos(otros.map(o => o.tema)),
    mejoras: unicos(otros.flatMap(o => o.mejoras)),
    logros: unicos(otros.flatMap(o => o.logros)),
    // El comentario es de cada servicio: al reusar un versículo solo se trae la cita y el texto
    versiculos: otros.flatMap(o => o.versiculos).filter((v, i, todos) => lleno(v.cita) && todos.findIndex(x => x.cita === v.cita) === i)
      .map(v => ({ ...versiculoNuevo(), cita: v.cita, texto: v.texto })),
  };
}

// ---------- piezas del formulario ----------
const texto = (ruta, etiqueta, valor, extra = '') => `
  <label class="campo"><span>${etiqueta}</span>
    <input data-ruta="${ruta}" value="${esc(valor)}" ${extra}></label>`;

const area = (ruta, etiqueta, valor, extra = '') => `
  <label class="campo"><span>${etiqueta}</span>
    <textarea data-ruta="${ruta}" ${extra}>${esc(valor)}</textarea></label>`;

const chip = (accion, ruta, valor, activo = false, etiqueta = valor, clase = '') =>
  `<button type="button" class="chip${activo ? ' activo' : ''}${clase ? ' ' + clase : ''}" data-accion="${accion}" data-ruta="${ruta}" data-valor="${esc(valor)}">${esc(etiqueta)}</button>`;

// Opciones para tocar; con `otro` se puede escribir algo distinto debajo
const opciones = (etiqueta, ruta, lista, actual, otro = false) => `
  <div class="campo"><span>${etiqueta}</span>
    <div class="chips">${lista.map(t => Array.isArray(t)
      ? chip('elegir', ruta, t[0], actual === t[0], t[1])
      : chip('elegir', ruta, t, actual === t)).join('')}</div>
    ${otro ? `<input data-ruta="${ruta}" value="${esc(actual)}" placeholder="Otro: escríbelo aquí" aria-label="${esc(etiqueta)}">` : ''}</div>`;

const contador = (ruta, etiqueta, valor) => `
  <div class="campo-num"><span>${etiqueta}</span>
    <span class="contador">
      <button type="button" data-paso-num="-1" aria-label="Restar">−</button>
      <input data-ruta="${ruta}" value="${esc(valor)}" inputmode="numeric" aria-label="${esc(etiqueta)}">
      <button type="button" data-paso-num="1" aria-label="Sumar">+</button>
    </span></div>`;

const hora = (ruta, etiqueta, valor) => `
  <div class="campo"><span>${etiqueta}</span>
    <div class="hora-con-boton">
      <input type="time" data-ruta="${ruta}" value="${esc(valor)}" aria-label="${esc(etiqueta)}">
      <button type="button" class="boton chico" data-accion="ahora" data-ruta="${ruta}">Ahora</button>
    </div></div>`;

// Casilla que abre la ventana de personas
const persona = (ruta, etiqueta, valor) => `
  <div class="campo"><span>${etiqueta}</span>
    <button type="button" class="selector-campo${lleno(valor) ? '' : ' vacio'}" data-accion="persona" data-ruta="${ruta}" data-etiqueta="${esc(etiqueta)}">
      ${lleno(valor) ? esc(valor) : 'Toca para elegir'}</button></div>`;

// Fotos de un paciente, un traslado o un hallazgo: miniaturas y botones para tomar o elegir
const fotosDe = (ruta, ids, c, etiqueta = 'Fotos') => `
  <div class="campo"><span>${etiqueta}</span>
    <div class="fotos-de">
      ${ids.length ? `<div class="miniaturas">${ids.map((id, i) => `
        <span class="miniatura"><img src="${c.urls.get(id) || ''}" alt="Foto ${i + 1}">
          <button type="button" data-accion="quitar-foto" data-ruta="${ruta}" data-valor="${i}" aria-label="Quitar foto">×</button></span>`).join('')}</div>` : ''}
      <div class="acciones">
        <button type="button" class="boton chico" data-accion="tomar-foto" data-valor="${ruta}">📷 Tomar foto</button>
        <button type="button" class="boton chico" data-accion="galeria" data-valor="${ruta}">Galería</button>
      </div>
    </div></div>`;

// Hoja del expediente: una sección con su pestañita arriba
const hoja = (pestana, titulo, cuerpo, ayuda = '', clase = '') => `
  <section class="seccion${clase ? ' ' + clase : ''}">
    <span class="seccion-pestana">${esc(pestana)}</span>
    <h2>${titulo}</h2>
    ${ayuda ? `<p class="ayuda">${ayuda}</p>` : ''}
    ${cuerpo}
  </section>`;

// Foto fija de la Estación 1 (apertura o cierre) con respuestas rápidas
function fotoFija(r, c, clave, titulo, ayuda, estados) {
  const { foto, nota } = r[clave];
  return hoja(clave === 'apertura' ? 'Apertura' : 'Cierre', titulo, `
    ${foto ? `
      <div class="foto-fija">
        <img src="${c.urls.get(foto) || ''}" alt="${esc(titulo)}">
        <div class="acciones">
          <button type="button" class="boton chico" data-accion="tomar-foto" data-valor="${clave}">📷 Cambiar foto</button>
          <button type="button" class="quitar" data-accion="quitar-foto-fija" data-valor="${clave}">Quitar</button>
        </div>
      </div>` : `
      <div class="acciones">
        <button type="button" class="boton principal" data-accion="tomar-foto" data-valor="${clave}">📷 Tomar foto</button>
        <button type="button" class="boton" data-accion="galeria" data-valor="${clave}">Elegir de la galería</button>
      </div>`}
    <div class="campo" style="margin-top:12px"><span>¿Cómo estaba?</span>
      <div class="chips">${estados.map(t => chip('anotar', clave + '.nota', t)).join('')}</div>
      <textarea data-ruta="${clave}.nota" placeholder="Detalles (opcional)">${esc(nota)}</textarea></div>`,
    ayuda, 'seccion-foto-fija' + (foto ? '' : ' pendiente'));
}

// Lista de fichas (pacientes, traslados, versículos…) con «Quitar» y «Agregar»
function fichas(r, clave, singular, campos) {
  return `
    <div class="lista-bloques">
      ${r[clave].length ? r[clave].map((item, i) => `
        <div class="bloque">
          <div class="bloque-cabeza"><b>${singular} ${i + 1}</b>
            <button type="button" class="quitar" data-quitar="${clave}.${i}">Quitar</button></div>
          ${campos(item, `${clave}.${i}`)}
        </div>`).join('') : '<p class="tenue">Ninguno registrado.</p>'}
    </div>
    <div class="acciones"><button type="button" class="boton chico" data-agregar="${clave}">+ Agregar ${singular.toLowerCase()}</button></div>`;
}

// ---------- pasos ----------
function pasoServicio(r, c) {
  const equipo = c.equipos.find(e => e.nombre === r.equipo);
  return hoja('Equipo', '¿Qué equipo está reportando?', `
      <div class="chips chips-grandes">${c.equipos.map(e => chip('elegir', 'equipo', e.nombre, r.equipo === e.nombre)).join('')}</div>
      ${equipo ? `
        <div class="integrantes-equipo">
          <span class="grupo-titulo">Integrantes del ${esc(equipo.nombre)}</span>
          <p>${equipo.integrantes.length ? equipo.integrantes.map(esc).join(' · ') : 'Este equipo todavía no tiene integrantes.'}</p>
          <div class="acciones">
            <button type="button" class="boton chico" data-accion="editar-equipo">Editar integrantes</button>
            <button type="button" class="boton chico" data-accion="editar-funcion" data-valor="doctoras">Editar doctoras</button>
            <button type="button" class="boton chico" data-accion="editar-funcion" data-valor="supervisores">Editar supervisores</button>
          </div>
        </div>` : ''}`, 'Obligatorio. Queda registrado al inicio del expediente.')
    + hoja('Servicio', 'Datos del servicio', `
      <div class="rejilla">
        ${texto('fecha', 'Fecha del servicio', r.fecha, 'type="date" required')}
        ${texto('inicio', 'Hora de inicio', r.inicio, 'type="time"')}
        ${texto('fin', 'Hora de finalización', r.fin, 'type="time"')}
      </div>
      <div style="margin-top:14px">${opciones('Turno', 'turno', TURNOS, r.turno)}</div>
      <div style="margin-top:14px">${opciones('Servicio o evento', 'evento', EVENTOS, r.evento, true)}</div>
      <div class="rejilla" style="margin-top:14px">
        ${texto('tema', 'Tema', r.tema, 'list="lista-temas" autocomplete="off" placeholder="Tema del servicio"')}
        ${persona('autor', 'Reporte elaborado por', r.autor)}
      </div>
      <datalist id="lista-temas">${c.s.temas.map(t => `<option value="${esc(t)}">`).join('')}</datalist>`,
      'Toca para elegir. Solo escribe si no está en las opciones.')
    + fotoFija(r, c, 'apertura', 'Foto de la Estación 1 al recibirla',
      'Al llegar, toma una foto de cómo recibieron la estación, antes de tocar nada.', ESTADO_APERTURA);
}

function pasoResumen(r) {
  return hoja('Resumen', 'Resumen ejecutivo', RESUMEN.map(([k, t]) => contador('resumen.' + k, t, r.resumen[k])).join(''),
    'Usa − y + para las cantidades. Si no aplica, déjalo en blanco.');
}

function pasoPuestos(r, c) {
  return hoja('Puestos', 'Servidores en cada puesto', `
      ${c.ultimo ? `<div class="acciones" style="margin-bottom:12px">
        <button type="button" class="boton chico" data-accion="copiar-equipo">Copiar los puestos del ${esc(fechaLarga(c.ultimo.fecha).toLowerCase())}</button></div>` : ''}
      <div class="rejilla">
        ${persona('supervision', 'Supervisión general', r.supervision)}
        ${r.puestos.map((p, i) => {
          const cerrado = /^clausurad/i.test(p.persona);
          return `<div class="campo"><span>${esc(p.nombre)}</span>
            <div class="puesto-fila">
              ${cerrado ? '<span class="sello-cerrado">Clausurado</span>' : `<button type="button" class="selector-campo${lleno(p.persona) ? '' : ' vacio'}" data-accion="persona" data-ruta="puestos.${i}.persona" data-etiqueta="${esc(p.nombre)}">${lleno(p.persona) ? esc(p.persona) : 'Toca para elegir'}</button>`}
              ${chip('elegir', `puestos.${i}.persona`, cerrado ? p.persona : 'Clausurado', false, cerrado ? 'Abrir' : 'Clausurado', 'chip-chico')}
            </div></div>`;
        }).join('')}
      </div>
      <div class="acciones" style="margin-top:14px">
        <button type="button" class="boton chico" data-accion="editar-lista" data-valor="puestos">✎ Editar lista de puestos</button>
      </div>`, 'Toca cada puesto y elige la persona. Puedes elegir a alguien de otro equipo si cubrió ese turno.');
}

function pasoServidores(r) {
  const presentes = r.asistencia.filter(s => s.estado === 'presente' || s.estado === 'tarde').length;
  return hoja('Asistencia', 'Asistencia de los servidores', `
      <div class="acciones" style="margin-bottom:12px">
        <button type="button" class="boton chico" data-accion="asistencia-cargar">Cargar equipo y puestos</button>
        <button type="button" class="boton chico" data-accion="asistencia-todos">Marcar a todos presentes</button>
        <span class="tenue">${presentes} de ${r.asistencia.length} presentes</span>
      </div>
      <div class="lista-asistencia">
        ${r.asistencia.map((s, i) => `
          <div class="fila-asistencia marca-${s.estado || 'nada'}">
            <div class="bloque-cabeza"><b>${esc(s.nombre || 'Sin nombre')}</b>
              <button type="button" class="quitar" data-quitar="asistencia.${i}" aria-label="Quitar">×</button></div>
            <div class="chips">${ASISTENCIA.map(([v, t]) => chip('elegir', `asistencia.${i}.estado`, v, s.estado === v, t)).join('')}</div>
            ${s.estado === 'tarde' ? hora(`asistencia.${i}.hora`, 'Hora en que llegó', s.hora) : ''}
          </div>`).join('') || '<p class="tenue">Toca «Cargar equipo y puestos» para traer a los servidores de este servicio.</p>'}
      </div>
      <div class="acciones" style="margin-top:10px">
        <button type="button" class="boton chico" data-accion="asistencia-agregar">+ Agregar servidor</button>
      </div>`, 'Marca a cada servidor: presente, llegó tarde, ausente o excusado.');
}

function pasoEstacion(r) {
  return hoja('Estación 1', 'Estación 1 — Primeros auxilios', `
      <div style="margin:4px 0 6px">${persona('estacion1.doctoras', 'Doctoras en la estación', r.estacion1.doctoras)}</div>
      <p class="ayuda" style="margin-top:12px">Pacientes asistidos en la Estación 1</p>
      ${ESTACION.map(([k, t]) => contador('estacion1.conteos.' + k, t, r.estacion1.conteos[k])).join('')}`)
    + hoja('Templo', 'Asistencias dentro del templo', TEMPLO.map(([k, t]) => contador('templo.' + k, t, r.templo[k])).join(''));
}

function pasoPacientes(r, c) {
  return hoja('Pacientes', 'Reporte de asistencia a pacientes', fichas(r, 'pacientes', 'Paciente', (p, b) => `
      <div class="rejilla">
        ${hora(b + '.hora', 'Hora de llegada', p.hora)}
        ${persona(b + '.doctora', 'Lo atendió', p.doctora)}
        ${texto(b + '.nombre', 'Nombre', p.nombre, 'autocomplete="off"')}
        ${texto(b + '.edad', 'Edad', p.edad, 'type="number" min="0" max="120" inputmode="numeric"')}
        ${texto(b + '.telefono', 'Teléfono', p.telefono, 'type="tel" inputmode="tel" placeholder="809-000-0000"')}
      </div>
      ${opciones('Cómo llegó', b + '.llegada', LLEGADAS_PACIENTE, p.llegada, true)}
      ${area(b + '.px', 'Px — Lo que presenta (por qué vino)', p.px, 'placeholder="Ej.: perdió el equilibrio al bajar del motor, golpe en el codo"')}
      ${texto(b + '.dx', 'Dx — Diagnóstico', p.dx, 'list="lista-diagnosticos" autocomplete="off" placeholder="Toca para elegir o escribe"')}
      <div class="campo"><span>Tx — Tratamiento (toca los que se dieron)</span>
        <div class="chips">${TRATAMIENTOS.map(t => chip('alternar', b + '.tx', t, tieneToken(p.tx, t))).join('')}</div>
        <input data-ruta="${b}.tx" value="${esc(p.tx)}" aria-label="Tratamiento" placeholder="Se llena solo; puedes añadir algo más"></div>
      ${opciones('Evolución', b + '.evolucion', EVOLUCIONES, p.evolucion, true)}
      ${fotosDe(b + '.fotos', p.fotos, c, 'Fotos del paciente o de la lesión')}
      <div class="ministracion">
        <span class="grupo-titulo">Ministración</span>
        <div class="campo"><span>Después de la atención de la doctora (toca lo que se hizo)</span>
          <div class="chips">${MINISTRACION.map(t => chip('alternar', b + '.ministracion', t, tieneToken(p.ministracion, t))).join('')}</div></div>
        ${persona(b + '.ministradoPor', 'Le ministró', p.ministradoPor)}
        ${area(b + '.ministracionNota', 'Cómo se le ministró', p.ministracionNota, 'placeholder="Ej.: se oró por su salud y por paz; recibió palabra de ánimo"')}
      </div>`),
    'La doctora explica cómo llegó el paciente, por qué y cómo lo trataron, y cómo evolucionó. Al final queda anotado si se le oró y se le ministró.')
    + `<datalist id="lista-diagnosticos">${c.s.diagnosticos.map(t => `<option value="${esc(t)}">`).join('')}</datalist>`
    + hoja('Medicamentos', 'Personas que solicitaron medicamentos en la Estación 1', fichas(r, 'medicamentos', 'Solicitud', (p, b) => `
      <div class="rejilla">
        ${texto(b + '.nombre', 'Nombre', p.nombre, 'autocomplete="off"')}
        ${texto(b + '.detalle', 'Medicamento entregado', p.detalle)}
      </div>`))
    + hoja('Niños', 'Niños extraviados', `
        <div class="chips" style="margin-bottom:8px">${chip('elegir', 'ninosDatos', '0', r.ninosDatos === '0', 'Ninguno (0)')}</div>
        ${area('ninosDatos', 'Datos de niños extraviados', r.ninosDatos, 'placeholder="Si hubo, escribe nombre, edad, dónde se encontró y a quién se entregó"')}`);
}

function pasoTraslados(r, c) {
  return hoja('Traslados', 'Traslados y acompañamientos', fichas(r, 'traslados', 'Traslado', (t, b) => `
      <div class="rejilla">
        ${texto(b + '.nombre', 'Paciente trasladado (si compartió su nombre)', t.nombre, 'autocomplete="off"')}
        ${hora(b + '.hora', 'Hora', t.hora)}
        ${persona(b + '.servidor', 'Lo trasladó', t.servidor)}
      </div>
      ${opciones('Motivo', b + '.motivo', MOTIVOS_TRASLADO, t.motivo)}
      ${opciones('Cómo se trasladó', b + '.medio', MEDIOS_TRASLADO, t.medio)}
      ${opciones('Área donde se recogió', b + '.desde', ORIGENES_TRASLADO, t.desde, true)}
      ${opciones('Área a la que se llevó', b + '.hacia', DESTINOS_TRASLADO, t.hacia, true)}
      ${area(b + '.nota', 'Detalles (opcional)', t.nota, 'placeholder="Ej.: se sintió mareada; la Dra. la revisó en la Estación 1"')}
      ${fotosDe(b + '.fotos', t.fotos, c, 'Foto del traslado')}`),
    'Personas con movilidad reducida que el equipo del lobby lleva en silla de ruedas, y personas que se sintieron mal y fueron llevadas a la Estación 1 para que la doctora las revise.');
}

function listaAreas(r, c, clave, titulo) {
  return hoja(clave === 'areasExternas' ? 'Externas' : 'Internas', titulo, `
      <div class="areas">
        ${r[clave].map((a, i) => {
          const b = `${clave}.${i}`;
          const hallazgo = a.estado === 'hallazgo';
          return `
          <div class="area-ficha${hallazgo ? (a.riesgo ? ' riesgo' : ' hallazgo') : a.estado === 'ok' ? ' ok' : ''}">
            <div class="bloque-cabeza">
              <input class="area-nombre" data-ruta="${b}.nombre" value="${esc(a.nombre)}" aria-label="Nombre del área" placeholder="Nombre del área">
              <button type="button" class="quitar" data-quitar="${b}" aria-label="Quitar área">×</button>
            </div>
            <div class="area-estado">
              ${chip('elegir', b + '.estado', 'ok', a.estado === 'ok', '✓ Sin novedad', 'chip-ok')}
              ${chip('elegir', b + '.estado', 'hallazgo', hallazgo, '⚠ Hallazgo', 'chip-hallazgo')}
              <button type="button" class="selector-campo chico${lleno(a.revisor) ? '' : ' vacio'}" data-accion="persona" data-ruta="${b}.revisor" data-etiqueta="Revisó: ${esc(a.nombre)}">
                ${lleno(a.revisor) ? 'Revisó: ' + esc(a.revisor) : 'Revisó: toca para elegir'}</button>
            </div>
            ${hallazgo ? `
              <div class="hallazgo-cuerpo">
                <div class="chips">
                  ${chip('riesgo', b + '.riesgo', '', a.riesgo, a.riesgo ? '⚠ Es un riesgo' : 'Marcar como riesgo', 'chip-riesgo')}
                  ${chip('hora', b + '.nota', '', false, '🕐 Hora actual')}
                </div>
                <textarea data-ruta="${b}.nota" placeholder="Qué se encontró y dónde exactamente">${esc(a.nota)}</textarea>
                ${fotosDe(b + '.fotos', a.fotos, c, 'Foto de lo que se encontró')}
                ${opciones('¿Se corrigió?', b + '.correccion', CORRECCIONES, a.correccion)}
                ${a.correccion && a.correccion !== 'pendiente' ? `
                  ${area(b + '.queSeHizo', 'Qué se hizo', a.queSeHizo, 'placeholder="Ej.: se selló con cinta de precaución a las 10:15 am"')}
                  ${fotosDe(b + '.fotosCorreccion', a.fotosCorreccion, c, 'Foto después de la corrección')}` : ''}
              </div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="acciones" style="margin-top:10px">
        <button type="button" class="boton chico" data-agregar="${clave}">+ Área solo en este expediente</button>
        <button type="button" class="boton chico" data-accion="editar-lista" data-valor="${clave}">✎ Editar lista de áreas</button>
      </div>`, 'Cada servidor revisa su área: toca «Sin novedad» o «Hallazgo». Si hay hallazgo, anota qué se encontró, la foto y si se corrigió.');
}

function pasoRecorrido(r, c) {
  return listaAreas(r, c, 'areasExternas', 'Recorrido: áreas externas del templo')
    + listaAreas(r, c, 'areasInternas', 'Recorrido: áreas internas del templo');
}

function reusar(clave, lista, actuales, etiqueta = t => t) {
  const libres = lista.filter(o => !actuales.some(a => JSON.stringify(a) === JSON.stringify(o)));
  if (!libres.length) return '';
  return `<div class="campo" style="margin-bottom:12px"><span>De reportes anteriores (toca para añadir)</span>
    <div class="chips">${libres.map(o => `<button type="button" class="chip reusar" data-accion="reusar" data-ruta="${clave}" data-valor="${esc(JSON.stringify(o))}">+ ${esc(etiqueta(o))}</button>`).join('')}</div></div>`;
}

function listaSimple(r, c, clave, pestana, titulo, singular) {
  return hoja(pestana, titulo, `
      ${reusar(clave, c.s[clave], r[clave])}
      <div class="areas">
        ${r[clave].map((t, i) => `
          <div class="area-ficha">
            <div class="bloque-cabeza"><b>${singular[0].toUpperCase() + singular.slice(1)} ${i + 1}</b>
              <button type="button" class="quitar" data-quitar="${clave}.${i}">Quitar</button></div>
            <textarea data-ruta="${clave}.${i}">${esc(t)}</textarea>
          </div>`).join('') || '<p class="tenue">Ninguno registrado.</p>'}
      </div>
      <div class="acciones" style="margin-top:10px"><button type="button" class="boton chico" data-agregar="${clave}">+ Escribir ${singular} nuevo</button></div>`);
}

function pasoMejoras(r, c) {
  return listaSimple(r, c, 'mejoras', 'Mejoras', 'Plan propuesto de mejoras para próximos eventos', 'punto')
    + listaSimple(r, c, 'logros', 'Logros', 'Logros', 'logro')
    + hoja('Versículos', 'Versículos del día', `
      ${reusar('versiculos', c.s.versiculos, r.versiculos, v => v.cita)}
      ${fichas(r, 'versiculos', 'Versículo', (v, b) => `
        ${texto(b + '.cita', 'Cita', v.cita, 'placeholder="Ej.: Efesios 6:7"')}
        ${area(b + '.texto', 'Texto', v.texto)}
        ${area(b + '.comentario', 'Comentario', v.comentario, 'placeholder="Lo que el equipo quiere decir sobre este versículo"')}`)}`);
}

function pasoCierre(r, c) {
  return hoja('Anexos', 'Fotos anexas', `
      <div class="fotos">
        ${r.fotos.map((f, i) => `
          <div class="foto"><img src="${c.urls.get(f.id) || ''}" alt="Foto ${i + 1}">
            <button type="button" class="quitar" data-quitar="fotos.${i}">Quitar</button></div>`).join('')}
      </div>
      <div class="acciones">
        <button type="button" class="boton chico" data-accion="tomar-foto" data-valor="anexas">📷 Tomar foto</button>
        <button type="button" class="boton chico" data-accion="galeria" data-valor="anexas">+ Subir de la galería</button>
        <span class="tenue">${r.fotos.length} foto${r.fotos.length === 1 ? '' : 's'}</span>
      </div>`, 'Otras fotos del servicio que no son de un paciente, un traslado o un hallazgo.')
    + fotoFija(r, c, 'cierre', 'Foto de la Estación 1 en perfecto orden',
      'Lo último del servicio: deja la estación en perfecto orden y toma la foto. Con ella se cierra el expediente.', ESTADO_CIERRE);
}

const DIBUJAR = [pasoServicio, pasoResumen, pasoPuestos, pasoServidores, pasoEstacion, pasoPacientes, pasoTraslados, pasoRecorrido, pasoMejoras, pasoCierre];

// ---------- vista ----------
export async function vistaFormulario(raiz, id) {
  const original = id ? await leerReporte(id) : null;
  if (id && !original) { ir('#/'); return; }
  const otros = (await reportesOrdenados()).filter(o => o.id !== id);

  // Contexto que necesitan los pasos
  const c = {
    ultimo: otros[0], s: sugerencias(otros), urls: new Map(),
    equipos: await leerEquipos(), funciones: await leerFunciones(), lugares: await leerLugares(),
  };

  const claveBorrador = 'borrador:' + (id || 'nuevo');
  const borrador = normalizar(await leerMeta(claveBorrador));
  let r = borrador;
  if (!r) {
    r = structuredClone(original || reporteNuevo(c.lugares));
    if (!original && c.ultimo) { r.autor = c.ultimo.autor; r.evento = c.ultimo.evento; }
  }
  const fotosOriginales = new Set(original ? idsFotos(original) : []);
  const fotosSubidas = new Set();
  let paso = 0;
  let destinoFoto = 'anexas'; // adónde va la próxima foto: 'apertura', 'cierre', 'anexas' o la ruta de una lista de fotos

  for (const fid of idsFotos(r)) {
    const dato = await leer('fotos', fid);
    if (dato) c.urls.set(fid, URL.createObjectURL(dato.blob));
  }

  let pendiente;
  const guardarBorrador = () => {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => guardarMeta(claveBorrador, r), 400);
  };

  raiz.innerHTML = `
    <div class="cabeza-formulario">
      <div>
        <span class="kicker">${original ? 'Editando expediente' : 'Expediente nuevo'}</span>
        <h1 class="titulo-pagina" id="titulo"></h1>
      </div>
      <button type="button" class="boton chico peligro" id="descartar">${original ? 'Cancelar' : 'Descartar'}</button>
    </div>
    ${borrador ? '<p class="marca falta" style="display:inline-block;margin:6px 0 0">Continuando lo que dejaste a medias</p>' : ''}
    <nav class="pasos" id="pasos" aria-label="Pasos del expediente"></nav>
    <form class="formulario" id="formulario" novalidate></form>
    <input type="file" id="entrada-camara" accept="image/*" capture="environment" hidden>
    <input type="file" id="entrada-galeria" accept="image/*" hidden>
    <div class="pie-formulario">
      <button type="button" class="boton" id="anterior" aria-label="Paso anterior">←<span class="largo"> Anterior</span></button>
      <button type="button" class="boton" id="siguiente">Siguiente →</button>
      <button type="button" class="boton principal" id="guardar">Guardar<span class="largo"> expediente</span></button>
    </div>`;

  const form = raiz.querySelector('#formulario');
  const nav = raiz.querySelector('#pasos');
  const titulo = () => {
    raiz.querySelector('#titulo').textContent = [r.fecha ? fechaLarga(r.fecha) : 'Elige la fecha', r.turno, r.equipo].filter(Boolean).join(' · ');
  };

  // Los cuadros de texto crecen para mostrar todo lo escrito
  function ajustarAlto(caja) {
    caja.style.height = 'auto';
    caja.style.height = caja.scrollHeight + 2 + 'px';
  }

  function dibujar() {
    titulo();
    nav.innerHTML = PASOS.map((p, i) =>
      `<button type="button" class="paso${i === paso ? ' actual' : ''}" data-ir="${i}"><b>${i + 1}</b>${p}</button>`).join('');
    nav.querySelector('.actual')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    form.innerHTML = DIBUJAR[paso](r, c);
    raiz.querySelector('#anterior').hidden = paso === 0;
    raiz.querySelector('#siguiente').hidden = paso === PASOS.length - 1;
    form.querySelectorAll('textarea').forEach(ajustarAlto);
  }

  // Vuelve a dibujar sin mover la pantalla
  function redibujar() {
    const y = window.scrollY;
    dibujar();
    window.scrollTo(0, y);
  }

  function irPaso(n) {
    paso = Math.max(0, Math.min(PASOS.length - 1, n));
    if (paso === PASO_SERVIDORES && !r.asistencia.length) cargarAsistencia(false);
    dibujar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cambiar(ruta, valor) {
    poner(r, ruta, valor);
    guardarBorrador();
  }

  // Trae a la lista de asistencia a los integrantes del equipo y a quienes están en los puestos
  function cargarAsistencia(avisar = true) {
    const equipo = c.equipos.find(e => e.nombre === r.equipo);
    const nombres = unicos([
      ...(equipo?.integrantes || []),
      ...separarNombres(r.supervision),
      ...r.puestos.flatMap(p => separarNombres(p.persona)),
    ]);
    const ya = new Set(r.asistencia.map(s => s.nombre.toLowerCase()));
    const nuevos = nombres.filter(n => !ya.has(n.toLowerCase()));
    r.asistencia.push(...nuevos.map(servidorNuevo));
    guardarBorrador();
    if (avisar) aviso(nuevos.length ? `${nuevos.length} servidor(es) agregados` : 'Ya estaban todos en la lista');
  }

  // Grupos de nombres para la ventana. Primero las doctoras o los supervisores si es ese puesto,
  // luego el equipo del reporte y después los demás equipos (asignación flexible).
  function gruposPersonas(ruta) {
    const propio = c.equipos.find(e => e.nombre === r.equipo);
    const resto = c.equipos.filter(e => e !== propio);
    const esDoctora = ruta === 'estacion1.doctoras' || /^pacientes\.\d+\.doctora$/.test(ruta);
    return [
      ...(esDoctora ? [{ titulo: 'Doctoras del ministerio', nombres: c.funciones.doctoras }] : []),
      ...(ruta === 'supervision' ? [{ titulo: 'Supervisores (líderes de grupo)', nombres: c.funciones.supervisores }] : []),
      ...(propio ? [{ titulo: propio.nombre + ' (equipo de este reporte)', nombres: propio.integrantes }] : []),
      ...resto.map(e => ({ titulo: e.nombre, nombres: e.integrantes })),
    ];
  }

  // Cambia la lista de puestos o de áreas para todos los expedientes nuevos y la aplica a este:
  // los renombrados conservan lo anotado, los nuevos se agregan y los quitados se van si estaban vacíos.
  async function editarListaLugares(clave) {
    const { titulo: tituloLista, singular, crear } = LISTAS[clave];
    const cambios = await editarLista({ titulo: tituloLista, singular, nombres: c.lugares[clave] });
    if (!cambios) return;
    c.lugares[clave] = cambios.map(x => x.nombre);
    await guardarLugares(c.lugares);

    const sinUsar = new Map(r[clave].map(x => [x.nombre, x]));
    const tomarDe = nombre => { const x = sinUsar.get(nombre); sinUsar.delete(nombre); return x; };
    const nueva = cambios.map(({ antes, nombre }) => {
      const previo = (antes !== null && tomarDe(antes)) || tomarDe(nombre);
      return previo ? { ...previo, nombre } : crear(nombre);
    });
    const tieneDatos = x => JSON.stringify({ ...x, nombre: '' }) !== JSON.stringify(crear(''));
    for (const resto of sinUsar.values()) if (tieneDatos(resto)) nueva.push(resto);
    r[clave] = nueva;
    guardarBorrador();
    redibujar();
    aviso('Lista guardada para todos los expedientes nuevos');
  }

  nav.onclick = e => { const b = e.target.closest('[data-ir]'); if (b) irPaso(Number(b.dataset.ir)); };
  raiz.querySelector('#anterior').onclick = () => irPaso(paso - 1);
  raiz.querySelector('#siguiente').onclick = () => irPaso(paso + 1);

  form.addEventListener('input', e => {
    const ruta = e.target.dataset.ruta;
    if (!ruta || e.target.tagName === 'BUTTON') return;
    cambiar(ruta, e.target.value);
    if (e.target.tagName === 'TEXTAREA') ajustarAlto(e.target);
    // Mantiene sincronizadas otras casillas de la misma ruta y los botones marcados
    form.querySelectorAll(`[data-ruta="${ruta}"]`).forEach(el => {
      if (el === e.target) return;
      if (el.tagName === 'BUTTON') {
        if (el.dataset.accion === 'elegir') el.classList.toggle('activo', el.dataset.valor === e.target.value);
        else if (el.dataset.accion === 'alternar') el.classList.toggle('activo', tieneToken(e.target.value, el.dataset.valor));
      } else el.value = e.target.value;
    });
    if (ruta === 'fecha') titulo();
  });

  form.addEventListener('click', async e => {
    const boton = e.target.closest('button');
    if (!boton) return;
    const { accion, ruta, valor } = boton.dataset;

    if (boton.dataset.pasoNum) {
      const campo = boton.parentElement.querySelector('input');
      campo.value = Math.max(0, (parseInt(campo.value, 10) || 0) + Number(boton.dataset.pasoNum));
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (accion === 'elegir') {
      cambiar(ruta, tomar(r, ruta) === valor ? '' : valor);
      if (ruta === 'equipo' || ruta === 'turno') titulo();
      redibujar();
    } else if (accion === 'riesgo') {
      cambiar(ruta, !tomar(r, ruta));
      redibujar();
    } else if (accion === 'ahora') {
      cambiar(ruta, horaActual());
      redibujar();
    } else if (accion === 'persona') {
      const elegido = await elegirPersona({
        titulo: boton.dataset.etiqueta,
        grupos: gruposPersonas(ruta),
        actual: tomar(r, ruta),
        multiple: variasPersonas(ruta),
      });
      if (elegido !== null) { cambiar(ruta, elegido); redibujar(); }
    } else if (accion === 'editar-lista') {
      await editarListaLugares(valor);
    } else if (accion === 'editar-equipo') {
      const equipo = c.equipos.find(x => x.nombre === r.equipo);
      const lista = equipo && await editarIntegrantes(equipo);
      if (lista) {
        equipo.integrantes = lista;
        await guardarEquipos(c.equipos);
        redibujar();
        aviso(`Integrantes del ${equipo.nombre} guardados`);
      }
    } else if (accion === 'editar-funcion') {
      const cambios = await editarLista({
        titulo: valor === 'doctoras' ? 'Doctoras del ministerio' : 'Supervisores (líderes de grupo)',
        singular: valor === 'doctoras' ? 'Doctora' : 'Supervisor',
        nombres: c.funciones[valor],
      });
      if (cambios) {
        c.funciones[valor] = cambios.map(x => x.nombre);
        await guardarFunciones(c.funciones);
        aviso('Lista guardada');
      }
    } else if (accion === 'asistencia-cargar') {
      cargarAsistencia();
      redibujar();
    } else if (accion === 'asistencia-todos') {
      r.asistencia.forEach(s => { if (!s.estado) s.estado = 'presente'; });
      guardarBorrador();
      redibujar();
    } else if (accion === 'asistencia-agregar') {
      const elegido = await elegirPersona({ titulo: 'Agregar servidor', grupos: gruposPersonas(''), multiple: true });
      if (elegido) {
        const ya = new Set(r.asistencia.map(s => s.nombre.toLowerCase()));
        r.asistencia.push(...separarNombres(elegido).filter(n => !ya.has(n.toLowerCase())).map(servidorNuevo));
        guardarBorrador();
        redibujar();
      }
    } else if (accion === 'anotar' || accion === 'hora') {
      const agregado = accion === 'hora' ? `A las ${horaBonita(horaActual())} ` : valor;
      const actual = tomar(r, ruta) || '';
      cambiar(ruta, actual.trim() ? actual.replace(/\s+$/, '') + (accion === 'hora' ? '\n' : '. ') + agregado : agregado);
      redibujar();
      if (accion === 'hora') {
        const caja = form.querySelector(`textarea[data-ruta="${ruta}"]`);
        caja.focus();
        caja.setSelectionRange(caja.value.length, caja.value.length);
      }
    } else if (accion === 'alternar') {
      const lista = (tomar(r, ruta) || '').split(',').map(t => t.trim()).filter(Boolean);
      const i = lista.findIndex(t => t.toLowerCase() === valor.toLowerCase());
      i >= 0 ? lista.splice(i, 1) : lista.push(valor);
      cambiar(ruta, lista.join(', '));
      redibujar();
    } else if (accion === 'reusar') {
      r[ruta].push(JSON.parse(valor));
      guardarBorrador();
      redibujar();
    } else if (accion === 'copiar-equipo' && c.ultimo) {
      r.supervision = c.ultimo.supervision;
      for (const p of r.puestos) {
        const anterior = c.ultimo.puestos.find(x => x.nombre === p.nombre);
        if (anterior) p.persona = anterior.persona;
      }
      r.estacion1.doctoras = c.ultimo.estacion1.doctoras;
      // Quien revisó cada área la última vez suele revisarla de nuevo
      for (const clave of ['areasExternas', 'areasInternas']) {
        for (const a of r[clave]) {
          const anterior = c.ultimo[clave].find(x => x.nombre === a.nombre);
          if (anterior && lleno(anterior.revisor) && !lleno(a.revisor)) a.revisor = anterior.revisor;
        }
      }
      guardarBorrador();
      redibujar();
      aviso('Puestos copiados. Cambia solo lo que fue distinto.');
    } else if (boton.dataset.agregar) {
      const clave = boton.dataset.agregar;
      r[clave].push(VACIOS[clave]());
      guardarBorrador();
      redibujar();
      form.querySelector(`[data-ruta^="${clave}.${r[clave].length - 1}"]:not(button)`)?.focus();
    } else if (boton.dataset.quitar) {
      const [clave, i] = boton.dataset.quitar.split('.');
      const elemento = r[clave][i];
      const vacio = clave !== 'fotos' && JSON.stringify(elemento) === JSON.stringify(VACIOS[clave]());
      if (clave === 'fotos' ? !confirm('¿Quitar esta foto del expediente?')
        : !vacio && clave !== 'asistencia' && !confirm('¿Quitar este elemento? Se perderá lo que tiene, incluidas sus fotos.')) return;
      r[clave].splice(Number(i), 1);
      guardarBorrador();
      redibujar();
    } else if (accion === 'tomar-foto' || accion === 'galeria') {
      destinoFoto = valor;
      const entrada = raiz.querySelector(accion === 'tomar-foto' ? '#entrada-camara' : '#entrada-galeria');
      entrada.multiple = accion === 'galeria' && valor !== 'apertura' && valor !== 'cierre';
      entrada.value = '';
      entrada.click();
    } else if (accion === 'quitar-foto') {
      if (!confirm('¿Quitar esta foto?')) return;
      tomar(r, ruta).splice(Number(valor), 1);
      guardarBorrador();
      redibujar();
    } else if (accion === 'quitar-foto-fija') {
      if (!confirm('¿Quitar esta foto?')) return;
      r[valor].foto = '';
      guardarBorrador();
      redibujar();
    }
  });

  // Guarda en el equipo las fotos elegidas o tomadas y las pone donde corresponde
  async function recibirFotos(e) {
    const archivos = [...e.target.files];
    if (!archivos.length) return;
    const fija = destinoFoto === 'apertura' || destinoFoto === 'cierre';
    aviso(archivos.length > 1 ? `Preparando ${archivos.length} fotos…` : 'Preparando la foto…');
    for (const archivo of fija ? archivos.slice(0, 1) : archivos) {
      try {
        const blob = await reducirFoto(archivo);
        const fotoId = r.id + '-f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        await guardar('fotos', { id: fotoId, blob });
        fotosSubidas.add(fotoId);
        c.urls.set(fotoId, URL.createObjectURL(blob));
        if (fija) r[destinoFoto].foto = fotoId;
        else if (destinoFoto === 'anexas') r.fotos.push({ id: fotoId, nota: '' });
        else tomar(r, destinoFoto).push(fotoId);
      } catch {
        aviso('La foto no se pudo abrir. Intenta con otra.');
      }
    }
    guardarBorrador();
    redibujar();
    aviso(archivos.length > 1 ? 'Fotos agregadas' : 'Foto guardada');
  }
  raiz.querySelector('#entrada-camara').onchange = recibirFotos;
  raiz.querySelector('#entrada-galeria').onchange = recibirFotos;

  // Borra del equipo las fotos que ya no pertenecen a ningún expediente
  async function limpiarFotos(conservar) {
    const usadas = new Set(conservar);
    const candidatas = new Set([...fotosOriginales, ...fotosSubidas, ...idsFotos(r), ...(borrador ? idsFotos(borrador) : [])]);
    for (const fid of candidatas) if (!usadas.has(fid)) await borrar('fotos', fid);
  }

  raiz.querySelector('#guardar').onclick = async () => {
    if (!r.equipo) { irPaso(0); aviso('Falta elegir qué equipo está reportando'); return; }
    if (!r.fecha) { irPaso(0); aviso('Falta la fecha del servicio'); return; }
    const faltan = [!r.apertura.foto && 'apertura', !r.cierre.foto && 'cierre'].filter(Boolean);
    if (faltan.length && !confirm(`Falta la foto de ${faltan.join(' y la de ')} de la Estación 1.\n\n¿Guardar el expediente de todas formas?`)) {
      irPaso(faltan[0] === 'apertura' ? 0 : PASOS.length - 1);
      return;
    }
    clearTimeout(pendiente);
    r.actualizado = Date.now();
    await guardar('reportes', r);
    await limpiarFotos(idsFotos(r));
    await borrar('meta', claveBorrador);
    aviso('Expediente guardado');
    ir('#/ver/' + r.id);
  };

  raiz.querySelector('#descartar').onclick = async () => {
    const pregunta = original ? '¿Salir sin guardar los cambios?' : '¿Descartar este expediente? Se borrará lo que escribiste.';
    if (!confirm(pregunta)) return;
    clearTimeout(pendiente);
    await limpiarFotos(original ? idsFotos(original) : []);
    await borrar('meta', claveBorrador);
    ir(original ? '#/ver/' + original.id : '#/');
  };

  dibujar();

  return () => c.urls.forEach(u => URL.revokeObjectURL(u));
}
