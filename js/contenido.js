// Orden y contenido del reporte terminado (el expediente del servicio). Lo usan la vista en pantalla
// y el archivo Word, para que siempre coincidan. Tras Visión y Misión, la síntesis para los líderes, luego el detalle
// (cada intervención en su sección aparte) y al final todas las fotos juntas en un collage numerado.
import {
  IGLESIA, MINISTERIO, VISION, MISION, CORRECCIONES, ASISTENCIA,
  diaSemana, fechaCorta, horaBonita, gruposDe, subtotal, totalAsistencias, numero,
} from './modelo.js';
import { lleno } from './util.js';

const valor = v => (lleno(v) ? String(v).trim() : '—');
const ninguno = texto => ({ tipo: 'parrafo', texto, suave: true });
const ETIQUETA_CORRECCION = Object.fromEntries(CORRECCIONES);
const ETIQUETA_ASISTENCIA = Object.fromEntries(ASISTENCIA);

export function portada(r) {
  return {
    iglesia: IGLESIA,
    titulo: 'Reporte del ' + MINISTERIO,
    servicio: `Servicio ${fechaCorta(r.fecha)}${r.turno ? ' ' + r.turno : ''}`,
    equipo: r.equipo ? 'Reporta: ' + r.equipo : '',
    autor: r.autor,
  };
}

export function contenido(r) {
  const b = [];
  const titulo = texto => b.push({ tipo: 'titulo', texto });
  const sub = texto => b.push({ tipo: 'subtitulo', texto });
  const fotos = fotosDelReporte(r);
  const verFotos = referenciaFotos(fotos);

  titulo('Visión');
  b.push({ tipo: 'parrafo', texto: VISION, suave: true });
  titulo('Misión');
  for (const [nombre, texto] of MISION) { sub(nombre); b.push({ tipo: 'parrafo', texto, suave: true }); }

  titulo('Síntesis del servicio');
  b.push({ tipo: 'sintesis', ...sintesis(r) });

  titulo(`Resumen ejecutivo — Servicio ${diaSemana(r.fecha)} ${r.evento || ''} ${fechaCorta(r.fecha)}`.replace(/\s+/g, ' '));
  if (lleno(r.tema)) b.push({ tipo: 'pares', filas: [['Tema', r.tema]] });
  b.push({ tipo: 'tabla', filas: filasResumen(r) });

  titulo('Desarrollo del servicio');
  b.push({ tipo: 'pares', filas: [
    ['Inicio', valor(horaBonita(r.inicio))],
    ['Finalización', valor(horaBonita(r.fin))],
    ['Rendimiento', valor(r.rendimiento)],
    ['Supervisión general', valor(r.supervision)],
    ['Doctoras en la Estación 1', valor(r.doctoras)],
    ['Estación 1 al recibirla', valor(estacion(r.apertura, verFotos))],
  ] });
  sub('Servidores en cada puesto');
  b.push({ tipo: 'pares', filas: r.puestos.map(p => [p.nombre, valor(p.persona)]) });

  // ---- Sección: presencia de los servidores ----
  titulo('Presencia de los servidores de Intervención en Crisis');
  const marcados = r.asistencia.filter(s => s.estado);
  if (marcados.length) {
    b.push({ tipo: 'asistencia', filas: marcados.map(s => [s.nombre, ETIQUETA_ASISTENCIA[s.estado] + (s.estado === 'tarde' && lleno(s.hora) ? ` (${horaBonita(s.hora)})` : ''), s.estado]) });
  } else b.push(ninguno('No se registró la presencia.'));

  // ---- Sección: asistencia a pacientes ----
  titulo('Reporte de asistencia a pacientes');
  if (r.pacientes.length) r.pacientes.forEach(p => b.push({ tipo: 'paciente', ...p, tx: tratamiento(r, p.tx), hora: horaBonita(p.hora), verFotos: verFotos(p.fotos) }));
  else b.push(ninguno('No hubo pacientes con datos registrados.'));
  if (r.medicamentosActivos) {
    sub('Personas que solicitaron medicamentos en la Estación 1');
    const medicamentos = r.medicamentos.filter(p => lleno(p.nombre) || lleno(p.detalle));
    b.push(medicamentos.length ? { tipo: 'vinetas', items: medicamentos.map(p => [p.nombre, p.detalle].filter(lleno).join(' — ')) } : ninguno('Ninguna.'));
  }
  b.push({ tipo: 'pares', filas: [['Datos de niños extraviados', valor(r.ninosDatos)]] });

  // ---- Sección: traslados ----
  titulo('Traslados y acompañamientos');
  if (r.traslados.length) r.traslados.forEach(t => b.push({ tipo: 'traslado', ...t, hora: horaBonita(t.hora), verFotos: verFotos(t.fotos) }));
  else b.push(ninguno('No hubo traslados.'));

  // ---- Sección: hallazgos en infraestructura ----
  const areas = [...r.areasExternas.map(a => ({ ...a, zona: 'Externa' })), ...r.areasInternas.map(a => ({ ...a, zona: 'Interna' }))];
  const hallazgos = areas.filter(a => a.estado === 'hallazgo');
  titulo('Hallazgos en la infraestructura');
  const conRiesgo = hallazgos.filter(a => a.riesgo).map(a => a.nombre);
  if (conRiesgo.length) b.push({ tipo: 'alerta', texto: 'Áreas con riesgo: ' + conRiesgo.join(', ') });
  if (hallazgos.length) hallazgos.forEach(a => b.push({
    tipo: 'hallazgo', ...a, correccionTexto: ETIQUETA_CORRECCION[a.correccion] || '',
    verFotos: verFotos(a.fotos), verFotosCorreccion: verFotos(a.fotosCorreccion),
  }));
  else b.push(ninguno('No hubo hallazgos.'));
  sub('Recorrido: áreas revisadas sin novedad');
  const sinNovedad = areas.filter(a => a.estado === 'ok');
  b.push(sinNovedad.length
    ? { tipo: 'vinetas', items: sinNovedad.map(a => [a.nombre, lleno(a.nota) && !/^sin|^todo/i.test(a.nota) ? a.nota : '', lleno(a.revisor) ? 'revisó ' + a.revisor : ''].filter(Boolean).join(' — ')) }
    : ninguno('Ninguna marcada.'));
  const sinRevisar = areas.filter(a => !a.estado).map(a => a.nombre);
  if (sinRevisar.length) b.push({ tipo: 'parrafo', texto: 'Sin revisar: ' + sinRevisar.join(', ') + '.', suave: true });

  // ---- Cierre ----
  titulo('Plan propuesto de mejoras para próximos eventos');
  b.push(r.mejoras.some(lleno) ? { tipo: 'vinetas', items: r.mejoras.filter(lleno) } : ninguno('Ninguno.'));
  titulo('Logros');
  b.push(r.logros.some(lleno) ? { tipo: 'vinetas', items: r.logros.filter(lleno) } : ninguno('Ninguno.'));

  const versiculos = r.versiculos.filter(v => lleno(v.cita) || lleno(v.texto) || lleno(v.comentario));
  if (versiculos.length) {
    titulo('Versículos del día');
    versiculos.forEach(v => b.push({ tipo: 'versiculo', cita: v.cita, texto: v.texto, comentario: v.comentario }));
  }
  titulo('Cierre del servicio');
  b.push({ tipo: 'pares', filas: [['Estación 1 al entregarla', valor(estacion(r.cierre, verFotos))]] });

  titulo('Fotos del servicio');
  b.push(fotos.length ? { tipo: 'collage', fotos } : ninguno('No se subieron fotos.'));
  return b;
}

// Resumen ejecutivo: cada grupo con su subtotal, sus renglones y al final el total que se calcula solo.
// Cada fila: [texto, valor, clase] con clase '' | 'grupo' | 'total'.
export function filasResumen(r) {
  return [
    ...gruposDe(r).flatMap(g => [
      [g.titulo, String(subtotal(r, g)), 'grupo'],
      ...g.items.map(([k, t]) => [t, valor(r.conteos[k]), '']),
    ]),
    ['Total de asistencias', String(totalAsistencias(r)), 'total'],
  ];
}

// Cómo estaba la Estación 1 al abrir o al cerrar, con el número de su foto en el collage
export const estacion = ({ foto, nota }, verFotos) => [lleno(nota) ? String(nota).trim() : '', foto ? 'Foto ' + verFotos([foto]) : '']
  .filter(Boolean).join('\n');

// ---------- Fotos: todas juntas al final, numeradas; en el detalle solo se dice su número ----------
const corto = nombre => String(nombre || '').replace(/\s*\(.*\)\s*$/, '');

// Todas las fotos del reporte en orden (apertura, recorrido, pacientes, traslados, anexas y cierre),
// cada una con su número y un pie corto que dice de qué es
export function fotosDelReporte(r) {
  const fotos = [];
  const poner = (ids, pie) => [].concat(ids || []).filter(Boolean).forEach(id => fotos.push({ id, n: fotos.length + 1, pie }));
  poner(r.apertura?.foto, 'Estación 1 al recibirla');
  for (const a of [...r.areasExternas, ...r.areasInternas]) {
    poner(a.fotos, corto(a.nombre) + (a.fotosCorreccion?.length ? ': antes' : ''));
    poner(a.fotosCorreccion, corto(a.nombre) + ': corregido');
  }
  r.pacientes.forEach((p, i) => poner(p.fotos, 'Paciente: ' + (p.nombre || i + 1)));
  r.traslados.forEach((t, i) => poner(t.fotos, 'Traslado: ' + (t.nombre || i + 1)));
  r.fotos.forEach(f => poner(f.id, lleno(f.nota) ? f.nota : 'Servicio'));
  poner(r.cierre?.foto, 'Estación 1 al entregarla');
  return fotos;
}

// «n.º 3, 4 (al final)»: dónde están en el collage las fotos de un paciente, un traslado o un hallazgo
export function referenciaFotos(fotos) {
  const numeros = new Map(fotos.map(f => [f.id, f.n]));
  return ids => {
    const n = (ids || []).map(id => numeros.get(id)).filter(Boolean);
    return n.length ? `n.º ${n.join(', ')} (al final)` : '';
  };
}

// ---------- Síntesis para los líderes ----------
// Lo relevante de cada tema en pocas líneas, para no tener que leer el reporte completo.
// «atencion» junta lo que un líder debe atender: riesgos sin corregir, referidos, niños extraviados…
const primeraLinea = t => String(t || '').split('\n')[0].trim();
const enLista = nombres => (nombres.length > 1 ? nombres.slice(0, -1).join(', ') + ' y ' + nombres.at(-1) : nombres[0] || '');
const cuantos = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
// «Silla de ruedas (3), Bastón»: cada valor con las veces que se repite, el más común primero
function repetidos(valores) {
  const cuenta = new Map();
  for (const v of valores.flatMap(x => String(x || '').split(',')).map(x => x.trim()).filter(Boolean)) cuenta.set(v, (cuenta.get(v) || 0) + 1);
  return [...cuenta].sort((a, b) => b[1] - a[1]).map(([v, n]) => (n > 1 ? `${v} (${n})` : v)).join(', ');
}
const MALA_APERTURA = /desordenada|sucia|faltan|dañada/i;

export function sintesis(r) {
  const atencion = [];
  const temas = [];
  const tema = (nombre, lineas) => { const l = lineas.filter(lleno); if (l.length) temas.push({ nombre, lineas: l }); };

  // Servicio
  const horario = lleno(r.inicio) || lleno(r.fin) ? `De ${horaBonita(r.inicio) || '—'} a ${horaBonita(r.fin) || '—'}` : '';
  tema('Servicio', [
    [r.evento, lleno(r.tema) ? 'Tema: ' + r.tema : ''].filter(lleno).join(' — '),
    [horario, lleno(r.rendimiento) ? 'Rendimiento ' + r.rendimiento : ''].filter(Boolean).join(' · '),
    [lleno(r.supervision) ? 'Supervisión: ' + r.supervision : '', r.equipo ? 'Reporta: ' + r.equipo : ''].filter(Boolean).join(' · '),
  ]);
  const nota = numero(String(r.rendimiento).charAt(0));
  if (nota && nota <= 3) atencion.push(`El rendimiento del servicio fue de ${r.rendimiento}.`);

  // Asistencias: el total y cada grupo con lo que más se dio
  const total = totalAsistencias(r);
  tema('Asistencias', total ? [`Total: ${total}`, ...gruposDe(r).map(g => {
    const n = subtotal(r, g);
    if (!n) return '';
    const detalle = g.items.filter(([k]) => numero(r.conteos[k]))
      .sort(([a], [b]) => numero(r.conteos[b]) - numero(r.conteos[a]))
      .map(([k, t]) => `${numero(r.conteos[k])} ${t.toLowerCase()}`);
    return `${g.titulo}: ${n}${g.items.length > 1 ? ` (${detalle.join(', ')})` : ''}`;
  })] : ['No se anotaron asistencias.']);

  // Equipo de servicio
  const marcados = r.asistencia.filter(s => s.estado);
  const con = estado => marcados.filter(s => s.estado === estado);
  const tarde = con('tarde').map(s => s.nombre + (lleno(s.hora) ? ` (${horaBonita(s.hora)})` : ''));
  const sinPersona = r.puestos.filter(p => !lleno(p.persona)).map(p => p.nombre);
  tema('Equipo de servicio', [
    marcados.length ? `${con('presente').length + tarde.length} de ${marcados.length} servidores presentes` : 'No se registró la presencia.',
    tarde.length ? (tarde.length === 1 ? 'Llegó tarde: ' : 'Llegaron tarde: ') + enLista(tarde) : '',
    con('ausente').length ? 'Ausentes: ' + enLista(con('ausente').map(s => s.nombre)) : '',
    con('excusa').length ? 'Excusados: ' + enLista(con('excusa').map(s => s.nombre)) : '',
    sinPersona.length ? 'Puestos sin persona: ' + enLista(sinPersona) : '',
  ]);

  // Estación 1 y pacientes
  const pacientes = r.pacientes;
  const motivos = repetidos(pacientes.map(p => (lleno(p.dx) ? p.dx : p.px)));
  const evolucion = repetidos(pacientes.map(p => p.evolucion));
  const referidos = pacientes.map((p, i) => [p, i]).filter(([p]) => /refiri/i.test(p.evolucion)).map(([p, i]) => p.nombre || `paciente ${i + 1}`);
  const ministrados = pacientes.filter(p => lleno(p.ministracion)).length;
  tema('Estación 1 y pacientes', [
    [lleno(r.apertura.nota) ? 'Se recibió: ' + primeraLinea(r.apertura.nota) : '', lleno(r.cierre.nota) ? 'Se entregó: ' + primeraLinea(r.cierre.nota) : ''].filter(Boolean).join(' · '),
    lleno(r.doctoras) ? 'Doctoras: ' + r.doctoras : '',
    pacientes.length ? cuantos(pacientes.length, 'paciente con ficha', 'pacientes con ficha') + (motivos ? ': ' + motivos : '') : 'No hubo pacientes con ficha.',
    evolucion ? 'Evolución: ' + evolucion : '',
    referidos.length ? 'Referidos a un centro médico: ' + enLista(referidos) : '',
    ministrados ? `Se les oró o ministró a ${ministrados} de ${pacientes.length}` : '',
  ]);
  if (MALA_APERTURA.test(r.apertura.nota)) atencion.push('La Estación 1 se recibió: ' + primeraLinea(r.apertura.nota));
  if (referidos.length) atencion.push((referidos.length === 1 ? 'Referido' : 'Referidos') + ' a un centro médico: ' + enLista(referidos));

  // Traslados
  const medios = repetidos(r.traslados.map(t => t.medio));
  const motivosTraslado = repetidos(r.traslados.map(t => t.motivo));
  tema('Traslados', r.traslados.length ? [
    cuantos(r.traslados.length, 'traslado', 'traslados') + (medios ? ': ' + medios : ''),
    motivosTraslado ? 'Motivo: ' + motivosTraslado : '',
  ] : ['No hubo traslados.']);

  // Recorrido e infraestructura: cada hallazgo en una línea, con cómo quedó
  const areas = [...r.areasExternas, ...r.areasInternas];
  const hallazgos = areas.filter(a => a.estado === 'hallazgo');
  const sinRevisar = areas.filter(a => !a.estado).map(a => corto(a.nombre));
  const comoQuedo = a => (a.correccion ? ETIQUETA_CORRECCION[a.correccion] : 'Sin corregir');
  const hallazgo = a => `${corto(a.nombre)}${a.riesgo ? ' (riesgo)' : ''}: ${primeraLinea(a.nota) || 'hallazgo'} — ${comoQuedo(a)}`;
  tema('Recorrido e infraestructura', [
    `${areas.length - sinRevisar.length} de ${areas.length} áreas revisadas · ${hallazgos.length ? cuantos(hallazgos.length, 'hallazgo', 'hallazgos') : 'sin hallazgos'}`,
    ...hallazgos.map(hallazgo),
    sinRevisar.length ? 'Sin revisar: ' + (sinRevisar.length <= 4 ? enLista(sinRevisar) : cuantos(sinRevisar.length, 'área', 'áreas')) : '',
  ]);
  atencion.push(...hallazgos.filter(a => (a.riesgo && a.correccion !== 'corregido') || a.correccion === 'pendiente').map(hallazgo));

  // Niños extraviados
  const ninos = numero(r.conteos.ninos);
  const datosNinos = lleno(r.ninosDatos) && String(r.ninosDatos).trim() !== '0' ? r.ninosDatos : '';
  if (ninos || datosNinos) {
    tema('Niños extraviados', [ninos ? cuantos(ninos, 'niño extraviado', 'niños extraviados') : '', datosNinos]);
    atencion.push(ninos ? cuantos(ninos, 'niño extraviado', 'niños extraviados') + ' en el servicio' : 'Hubo niños extraviados');
  }

  tema('Mejoras propuestas', r.mejoras.filter(lleno));
  tema('Logros', r.logros.filter(lleno));
  return { atencion, temas };
}

// Con los medicamentos apagados no sale «Medicamento» en el tratamiento
export const tratamiento = (r, tx) => (r.medicamentosActivos ? tx
  : String(tx || '').split(',').map(x => x.trim()).filter(x => x && !/^medicamento/i.test(x)).join(', '));

// Datos de un paciente, para pantalla y Word
export function datosPaciente(p) {
  return [
    ['Hora', p.hora],
    ['Atendió', p.doctora],
    ['Edad', lleno(p.edad) ? p.edad + ' años' : ''],
    ['Teléfono', p.telefono],
    ['Cómo llegó', p.llegada],
    ['Px — Lo que presenta', p.px],
    ['Dx — Diagnóstico', p.dx],
    ['Tx — Tratamiento', p.tx],
    ['Evolución', p.evolucion],
    ['Ministración', p.ministracion],
    ['Le ministró', p.ministradoPor],
    ['Cómo se le ministró', p.ministracionNota],
    ['Fotos', p.verFotos],
  ].filter(([, v]) => lleno(v));
}

// Datos de un traslado, para pantalla y Word
export function datosTraslado(t) {
  return [
    ['Motivo', t.motivo],
    ['Cómo', t.medio],
    ['Se recogió en', t.desde],
    ['Se llevó a', t.hacia],
    ['Hora', t.hora],
    ['Lo trasladó', t.servidor],
    ['Fotos', t.verFotos],
  ].filter(([, v]) => lleno(v));
}

// Datos de un hallazgo, para pantalla y Word
export function datosHallazgo(a) {
  return [
    ['Área', `${a.nombre} (${a.zona.toLowerCase()})`],
    ['Lo encontró', a.revisor],
    ['Qué se encontró', a.nota],
    ['Corrección', a.correccionTexto],
    ['Qué se hizo', a.queSeHizo],
    ['Fotos de lo encontrado', a.verFotos],
    ['Fotos de la corrección', a.verFotosCorreccion],
  ].filter(([, v]) => lleno(v));
}

export function nombreArchivo(r) {
  return `Reporte de servicio ${r.fecha}${r.turno ? ' ' + r.turno : ''}${r.equipo ? ' ' + r.equipo : ''}`.replace(/[\\/:*?"<>|]/g, '');
}
