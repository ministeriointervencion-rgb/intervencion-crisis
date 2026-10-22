// Estructura del reporte de servicio, igual a los reportes en Word del ministerio.

export const IGLESIA = 'Ministerio Internacional Monte de Dios Horeb';
export const MINISTERIO = 'Ministerio de Intervención en Crisis';

export const VISION = 'Nuestra visión consiste en desarrollar una iglesia sin muros que impacte su esfera de influencia para afirmar, consolidar, alimentar, sanar, equipar y restaurar a cada individuo y a cada familia hasta que la gloria de Dios cubra nuestra tierra.';

export const MISION = [
  ['Evangelizar', 'Llevar las buenas nuevas del Reino de Dios a los pobres de espíritu, a los quebrantados de corazón, a los cautivos, a los ciegos, oprimidos, enfermos, deprimidos y a toda persona sobre la faz de la tierra por todos los medios disponibles.'],
  ['Afirmar', 'Llevar a cada creyente a ser un discípulo y un fuerte líder en el Reino de Dios, fundamentándolo en los valores del Reino y en la doctrina apostólica, formando así su mentalidad para que todo su ser, espíritu, alma y cuerpo, sea transformado.'],
  ['Discipular', 'Adiestrar, equipar y ayudar a cada discípulo a descubrir y cumplir su propósito, el llamado y la voluntad de Dios para su vida, llevándolo a conocer su identidad como hijo con derechos, privilegios, herencia y responsabilidades en el Reino de Dios.'],
  ['Enviar', 'Comisionar a cada líder y discípulo para que haga la voluntad de Dios y llegue a su destino, llevando el Reino de Dios adonde quiera que vaya.'],
];

// Conteo de asistencias del servicio: cada número se anota una sola vez y de aquí salen
// el resumen ejecutivo, el total y las sumas de la pantalla principal.
export const GRUPOS_ASISTENCIA = [
  { titulo: 'Atención médica', items: [
    ['clinicos', 'Casos clínicos'],
    ['trauma', 'Traumas'],
    ['presion', 'Toma de presión arterial'],
    ['curas', 'Curas'],
    ['inmovilizaciones', 'Inmovilizaciones'],
    ['medicamentos', 'Solicitud de medicamentos'],
  ] },
  { titulo: 'Espiritual', items: [
    ['sanidad', 'Sanidad'],
    ['liberacion', 'Liberación'],
    ['oraciones', 'Oraciones'],
  ] },
  { titulo: 'Personas con discapacidad', items: [
    ['sillaRuedas', 'Silla de ruedas'],
    ['baston', 'Bastón'],
    ['psicomotriz', 'Discapacidad psicomotriz'],
    ['acompanamientos', 'Acompañamientos'],
  ] },
  { titulo: 'Niños', items: [
    ['ninos', 'Niños extraviados'],
  ] },
];
export const CONTEOS = GRUPOS_ASISTENCIA.flatMap(g => g.items);

// Por ahora el ministerio no entrega medicamentos. La doctora lo habilita con una casilla en cada expediente;
// mientras esté apagada, la palabra «medicamento» no sale en el formulario ni en el reporte.
export const gruposDe = r => r.medicamentosActivos
  ? GRUPOS_ASISTENCIA
  : GRUPOS_ASISTENCIA.map(g => ({ ...g, items: g.items.filter(([k]) => k !== 'medicamentos') }));
export const tratamientosDe = r => (r.medicamentosActivos ? TRATAMIENTOS : TRATAMIENTOS.filter(t => t !== 'Medicamento'));

// Puestos del equipo con los que empezó el programa. Ahora son una lista que el ministerio puede
// renombrar y ampliar (js/lugares.js); estas claves solo sirven para leer reportes viejos.
export const SERVIDORES = [
  ['puertaA', 'Puerta A'],
  ['puertaB', 'Puerta B'],
  ['puertaC', 'Puerta C'],
  ['puertaD', 'Puerta D'],
  ['puertasSuperiores', 'Puertas superiores'],
  ['moviles', 'Móviles'],
];

export const AREAS_EXTERNAS = ['Bautisterio', 'Periferia templo', 'Mana'];

// El sótano se entra por el lobby: tiene aulas, un aula debajo del altar y dos zonas laterales
// con salida de emergencia hacia afuera (la norte da detrás del parqueo administrativo; la sur da a Mana).
export const AREAS_INTERNAS = [
  'Estación 1',
  'Sótano: aulas', 'Sótano: aula debajo del altar',
  'Sótano zona norte: salida de emergencia (da detrás del parqueo administrativo)',
  'Sótano zona sur: salida de emergencia (da a Mana)',
  'Front House', 'Zonas periféricas externas al auditorio', 'Puertas',
  'Zonas detrás del altar', 'Puerta C', 'Lobby', 'Cafetería fría', 'Cafetería lobby',
  'Templo – auditorio', 'Zona de la grúa cámara', 'Luces laterales de salida de emergencia',
  'Zona de butacas', 'Escalinatas laterales internas', 'Pasillo lateral Sur', 'Pasillo lateral norte',
  'Las aulas Horeb Kids',
];

// Fotos fijas de la Estación 1: cómo se recibe al abrir el servicio y cómo se entrega al cerrar
export const ESTADO_APERTURA = ['En orden', 'Desordenada', 'Sucia', 'Faltan insumos', 'Camilla dañada'];
export const ESTADO_CIERRE = ['En perfecto orden', 'Limpia', 'Insumos repuestos', 'Basura retirada'];

// Traslados que hace el equipo del lobby: personas con movilidad reducida o que se sintieron mal
export const MOTIVOS_TRASLADO = ['Movilidad reducida', 'Se sintió mal'];
export const MEDIOS_TRASLADO = ['Silla de ruedas', 'Bastón', 'Caminando acompañado', 'Camilla'];
export const ORIGENES_TRASLADO = ['Lobby', 'Parqueo', 'Entrada principal', 'Dentro del templo', 'Baño'];
export const DESTINOS_TRASLADO = ['Dentro del templo', 'Baño', 'Estación 1', 'Salida / vehículo'];

// Asistencia a pacientes: cómo llegó a la Estación 1 y cómo evolucionó
export const LLEGADAS_PACIENTE = ['Por sus propios medios', 'Lo trajo un servidor', 'En silla de ruedas', 'En camilla', 'Acompañado de un familiar'];
export const EVOLUCIONES = ['Mejoró', 'Estable', 'Se refirió a un centro médico', 'Se retiró por su cuenta'];

// Después de que la doctora lo atiende, se le ora y se le ministra: queda evidenciado en el expediente
export const MINISTRACION = ['Se le oró', 'Se le ministró'];

// Hallazgos en infraestructura: qué se hizo
export const CORRECCIONES = [['corregido', 'Corregido'], ['temporal', 'Corrección temporal'], ['pendiente', 'Pendiente']];

// Presencia de los servidores del equipo
export const ASISTENCIA =[['presente', 'Presente'], ['tarde', 'Llegó tarde'], ['ausente', 'Ausente'], ['excusa', 'Excusado']];

export const TURNOS = ['Matutina', 'Vespertina', 'Nocturna'];
export const EVENTOS = ['Conferencia de jóvenes', 'Servicio dominical', 'Servicio de oración', 'Vigilia'];
export const RESPUESTAS_AREA = ['Sin eventos', 'Todo en orden', 'Fuera de uso', 'Sin iluminación', 'Clausurada'];
export const TRATAMIENTOS = ['Agua', 'Descanso', 'Menta', 'Toma de presión', 'Cura', 'Inmovilización', 'Medicamento'];

// Fecha de hoy según el reloj del equipo (no la hora de Londres)
function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const vacios = lista => Object.fromEntries(lista.map(([k]) => [k, '']));

// Cada área del recorrido: quién la revisó y si estaba sin novedad o tenía un hallazgo.
// Un hallazgo lleva lo que se encontró, si es un riesgo, sus fotos y si se corrigió (qué se hizo y su foto).
export const areaNueva = (nombre = '') => ({
  nombre, estado: '', nota: '', riesgo: false, revisor: '', fotos: [],
  correccion: '', queSeHizo: '', fotosCorreccion: [],
});

export const trasladoNuevo = () => ({
  nombre: '', motivo: '', medio: '', desde: 'Lobby', hacia: '', hora: '', servidor: '', nota: '', fotos: [],
});

export const pacienteNuevo = () => ({
  hora: '', doctora: '', nombre: '', edad: '', telefono: '', llegada: '', px: '', dx: '', tx: '', evolucion: '', fotos: [],
  ministracion: '', ministradoPor: '', ministracionNota: '',
});

export const versiculoNuevo = () => ({ cita: '', texto: '', comentario: '' });

export const servidorNuevo = (nombre = '') => ({ nombre, estado: '', hora: '' });

// Un área vieja sin estado: si solo decía "sin eventos" o parecido, estaba sin novedad; si decía algo más, fue un hallazgo.
const SIN_NOVEDAD = /^\s*(1\s*\.\s*)?(sin eventos?|todo en orden|fuera de uso|sin novedad)\s*\.?\s*$/i;
const estadoDe = a => a.estado || (!String(a.nota || '').trim() ? '' : SIN_NOVEDAD.test(a.nota) ? 'ok' : 'hallazgo');

export const puestoNuevo = (nombre = '') => ({ nombre, persona: '' });

// Lista de lugares con la que arranca el programa (el ministerio la puede cambiar luego)
export const LUGARES_DE_PARTIDA = {
  puestos: SERVIDORES.map(([, t]) => t),
  areasExternas: AREAS_EXTERNAS,
  areasInternas: AREAS_INTERNAS,
};

export function reporteNuevo(lugares = LUGARES_DE_PARTIDA) {
  return {
    id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    equipo: '',
    fecha: hoy(),
    turno: '',
    evento: '',
    tema: '',
    autor: '',
    inicio: '',
    fin: '',
    supervision: '',
    puestos: lugares.puestos.map(puestoNuevo),
    doctoras: '',
    medicamentosActivos: false,
    conteos: vacios(CONTEOS),
    apertura: { foto: '', nota: '' },
    cierre: { foto: '', nota: '' },
    areasExternas: lugares.areasExternas.map(areaNueva),
    areasInternas: lugares.areasInternas.map(areaNueva),
    asistencia: [],
    pacientes: [],
    traslados: [],
    medicamentos: [],
    ninosDatos: '',
    mejoras: [],
    logros: [],
    versiculos: [],
    fotos: [],
    creado: Date.now(),
    actualizado: Date.now(),
  };
}

// Pone al día un reporte guardado con una versión anterior del programa. Versiones anteriores:
// la doctora iba en servidores.estacion1 y los conteos en r.estacion; no había fotos de apertura y cierre;
// las áreas solo tenían nota; los traslados eran una lista simple de personas con discapacidad;
// los puestos eran fijos (r.servidores) y ahora son una lista con nombre y persona (r.puestos);
// no había asistencia de servidores, ni estado de cada área, ni hora/doctora/llegada/evolución/fotos del paciente,
// ni ministración del paciente (la oración iba como tratamiento), ni comentario del versículo.
// Los números se anotaban en tres sitios (resumen, Estación 1 y templo) y ahora van en un solo conteo.
function unirConteos(r, conteosEstacion) {
  const res = r.resumen || {};
  const templo = r.templo || {};
  const est = conteosEstacion || {};
  const primero = (...v) => v.find(x => x !== '' && x != null) ?? '';
  return {
    ...vacios(CONTEOS),
    clinicos: primero(est.clinicos, res.casosClinicos),
    trauma: primero(est.trauma, res.traumas),
    presion: primero(est.presion),
    curas: primero(est.curas, res.curas),
    inmovilizaciones: primero(res.inmovilizaciones),
    medicamentos: primero(est.medicamentos, res.medicamentos),
    sanidad: primero(est.sanidad, res.sanidad),
    liberacion: primero(est.liberacion, res.liberacion),
    oraciones: primero(templo.oraciones),
    sillaRuedas: primero(templo.sillaRuedas, res.sillasRuedas),
    baston: primero(templo.baston, res.bastones),
    psicomotriz: primero(templo.psicomotriz, res.discapacidad),
    acompanamientos: primero(templo.acompanamientos),
    ninos: primero(est.ninos, res.ninosExtraviados),
  };
}

// La oración ya no es tratamiento: si venía en el Tx pasa a la ministración como «Se le oró»
function pasarOracion(p) {
  const tx = String(p.tx || '').split(',').map(t => t.trim()).filter(Boolean);
  if (!tx.some(t => /^oración$/i.test(t))) return p;
  const ministracion = String(p.ministracion || '').split(',').map(t => t.trim()).filter(Boolean);
  return {
    ...p,
    tx: tx.filter(t => !/^oración$/i.test(t)).join(', '),
    ministracion: ministracion.includes('Se le oró') ? ministracion.join(', ') : ['Se le oró', ...ministracion].join(', '),
  };
}

export function normalizar(r) {
  if (!r) return r;
  const { estacion1: doctoraVieja = '', ...servidores } = r.servidores || {};
  const previa = r.estaciones?.[0];
  const { estacion, estaciones, discapacidad, servidores: _viejos, estacion1, resumen, templo, ...n } = r;
  const sinEstacion = lista => (lista || []).map(({ estacion: _, ...p }) => p);
  return {
    ...n,
    puestos: r.puestos || SERVIDORES.map(([k, t]) => ({ nombre: t, persona: servidores[k] || '' })),
    doctoras: r.doctoras ?? estacion1?.doctoras ?? previa?.doctoras ?? doctoraVieja,
    conteos: r.conteos ? { ...vacios(CONTEOS), ...r.conteos } : unirConteos(r, estacion1?.conteos || previa?.conteos || estacion),
    medicamentosActivos: !!r.medicamentosActivos,
    pacientes: sinEstacion(r.pacientes).map(p => pasarOracion({ ...pacienteNuevo(), ...p })),
    medicamentos: sinEstacion(r.medicamentos),
    asistencia: r.asistencia || [],
    versiculos: (r.versiculos || []).map(v => ({ ...versiculoNuevo(), ...v })),
    apertura: r.apertura || { foto: '', nota: '' },
    cierre: r.cierre || { foto: '', nota: '' },
    areasExternas: (r.areasExternas || []).map(a => ({ ...areaNueva(), ...a, estado: estadoDe(a) })),
    areasInternas: (r.areasInternas || []).map(a => ({ ...areaNueva(), ...a, estado: estadoDe(a) })),
    traslados: r.traslados || (discapacidad || []).map(p => ({ ...trasladoNuevo(), desde: '', nombre: p.nombre, medio: p.detalle || '' })),
  };
}

// Todas las fotos de un reporte: apertura, áreas (hallazgo y corrección), pacientes, traslados, anexas y cierre
export const idsFotos = r => [
  r.apertura?.foto,
  ...[...r.areasExternas, ...r.areasInternas].flatMap(a => [...(a.fotos || []), ...(a.fotosCorreccion || [])]),
  ...[...r.pacientes, ...r.traslados].flatMap(x => x.fotos || []),
  ...r.fotos.map(f => f.id),
  r.cierre?.foto,
].filter(Boolean);

export const subtotal = (r, g) => g.items.reduce((s, [k]) => s + numero(r.conteos[k]), 0);
export const totalAsistencias = r => gruposDe(r).reduce((s, g) => s + subtotal(r, g), 0);

// Cosas que no cuadran entre el conteo y las fichas escritas
export function avisosConteo(r) {
  const avisos = [];
  const medicos = numero(r.conteos.clinicos) + numero(r.conteos.trauma);
  if (r.pacientes.length > medicos) avisos.push(`Hay ${r.pacientes.length} ficha(s) de pacientes, pero casos clínicos + traumas suman ${medicos}.`);
  const enLista = r.medicamentos.filter(p => String(p.nombre || p.detalle || '').trim()).length;
  if (r.medicamentosActivos && enLista > numero(r.conteos.medicamentos)) avisos.push(`Hay ${enLista} persona(s) en la lista de medicamentos, pero el conteo dice ${numero(r.conteos.medicamentos)}.`);
  for (const [medio, k] of [['Silla de ruedas', 'sillaRuedas'], ['Bastón', 'baston']]) {
    const n = r.traslados.filter(t => t.medio === medio).length;
    if (n > numero(r.conteos[k])) avisos.push(`Hay ${n} traslado(s) en ${medio.toLowerCase()}, pero el conteo dice ${numero(r.conteos[k])}.`);
  }
  return avisos;
}

// Cifras de las secciones del expediente
export function cifras(r) {
  const areas = [...r.areasExternas, ...r.areasInternas];
  const hallazgos = areas.filter(a => a.estado === 'hallazgo');
  const conMarca = r.asistencia.filter(s => s.estado);
  return {
    asistencias: totalAsistencias(r),
    pacientes: r.pacientes.length,
    traslados: r.traslados.length,
    hallazgos: hallazgos.length,
    pendientes: hallazgos.filter(a => a.correccion === 'pendiente').length,
    riesgos: hallazgos.filter(a => a.riesgo).length,
    servidores: conMarca.filter(s => s.estado === 'presente' || s.estado === 'tarde').length,
    servidoresAnotados: conMarca.length,
  };
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function partes(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return { a, m, d, dia: new Date(a, m - 1, d).getDay() };
}

export const diaSemana = fecha => DIAS[partes(fecha).dia];

export function fechaCorta(fecha) {
  const { a, m, d } = partes(fecha);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(a).slice(2)}`;
}

export function fechaLarga(fecha) {
  const { a, m, d, dia } = partes(fecha);
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]} de ${a}`;
}

// "18:08" → "6:08 pm". Si la hora se escribió de otra forma, se deja igual.
export function horaBonita(h) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(h || '').trim());
  if (!m) return h || '';
  const horas = Number(m[1]);
  return `${horas % 12 || 12}:${m[2]} ${horas < 12 ? 'am' : 'pm'}`;
}

export const numero = v => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));
