// Orden y contenido del reporte terminado (el expediente del servicio). Lo usan la vista en pantalla
// y el archivo Word, para que siempre coincidan. Las intervenciones van cada una en su sección aparte.
import {
  IGLESIA, MINISTERIO, VISION, MISION, RESUMEN, ESTACION, TEMPLO, CORRECCIONES, ASISTENCIA,
  diaSemana, fechaCorta, horaBonita,
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

  titulo('Visión');
  b.push({ tipo: 'parrafo', texto: VISION, suave: true });
  titulo('Misión');
  for (const [nombre, texto] of MISION) { sub(nombre); b.push({ tipo: 'parrafo', texto, suave: true }); }

  titulo(`Resumen ejecutivo — Servicio ${diaSemana(r.fecha)} ${r.evento || ''} ${fechaCorta(r.fecha)}`.replace(/\s+/g, ' '));
  if (lleno(r.tema)) b.push({ tipo: 'pares', filas: [['Tema', r.tema]] });
  b.push({ tipo: 'tabla', filas: RESUMEN.map(([k, t]) => [t, valor(r.resumen[k]), k === 'totalAsistencias']) });

  titulo('Desarrollo del servicio');
  b.push({ tipo: 'pares', filas: [
    ['Inicio', valor(horaBonita(r.inicio))],
    ['Finalización', valor(horaBonita(r.fin))],
    ['Supervisión general', valor(r.supervision)],
  ] });
  sub('Apertura: así se recibió la Estación 1');
  b.push(fotoFija(r.apertura));
  sub('Servidores en cada puesto');
  b.push({ tipo: 'pares', filas: r.puestos.map(p => [p.nombre, valor(p.persona)]) });

  // ---- Sección: asistencia de los servidores ----
  titulo('Asistencia de los servidores de Intervención en Crisis');
  const marcados = r.asistencia.filter(s => s.estado);
  if (marcados.length) {
    b.push({ tipo: 'asistencia', filas: marcados.map(s => [s.nombre, ETIQUETA_ASISTENCIA[s.estado] + (s.estado === 'tarde' && lleno(s.hora) ? ` (${horaBonita(s.hora)})` : ''), s.estado]) });
  } else b.push(ninguno('No se registró la asistencia.'));

  // ---- Estación 1 ----
  titulo('Estación 1 — Primeros auxilios');
  b.push({ tipo: 'pares', filas: [
    ['Doctoras', valor(r.estacion1.doctoras)],
    ...ESTACION.map(([k, t]) => [t, valor(r.estacion1.conteos[k])]),
  ] });
  sub('Asistencias dentro del templo');
  b.push({ tipo: 'pares', filas: TEMPLO.map(([k, t]) => [t, valor(r.templo[k])]) });

  // ---- Sección: asistencia a pacientes ----
  titulo('Reporte de asistencia a pacientes');
  if (r.pacientes.length) r.pacientes.forEach(p => b.push({ tipo: 'paciente', ...p, hora: horaBonita(p.hora) }));
  else b.push(ninguno('No hubo pacientes con datos registrados.'));
  sub('Personas que solicitaron medicamentos en la Estación 1');
  const medicamentos = r.medicamentos.filter(p => lleno(p.nombre) || lleno(p.detalle));
  b.push(medicamentos.length ? { tipo: 'vinetas', items: medicamentos.map(p => [p.nombre, p.detalle].filter(lleno).join(' — ')) } : ninguno('Ninguna.'));
  b.push({ tipo: 'pares', filas: [['Datos de niños extraviados', valor(r.ninosDatos)]] });

  // ---- Sección: traslados ----
  titulo('Traslados y acompañamientos');
  if (r.traslados.length) r.traslados.forEach(t => b.push({ tipo: 'traslado', ...t, hora: horaBonita(t.hora) }));
  else b.push(ninguno('No hubo traslados.'));

  // ---- Sección: hallazgos en infraestructura ----
  const areas = [...r.areasExternas.map(a => ({ ...a, zona: 'Externa' })), ...r.areasInternas.map(a => ({ ...a, zona: 'Interna' }))];
  const hallazgos = areas.filter(a => a.estado === 'hallazgo');
  titulo('Hallazgos en la infraestructura');
  const conRiesgo = hallazgos.filter(a => a.riesgo).map(a => a.nombre);
  if (conRiesgo.length) b.push({ tipo: 'alerta', texto: 'Áreas con riesgo: ' + conRiesgo.join(', ') });
  if (hallazgos.length) hallazgos.forEach(a => b.push({ tipo: 'hallazgo', ...a, correccionTexto: ETIQUETA_CORRECCION[a.correccion] || '' }));
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
  if (r.fotos.length) {
    titulo('Fotos anexas');
    b.push({ tipo: 'fotos', fotos: r.fotos.map(f => f.id) });
  }
  titulo('Cierre del servicio: Estación 1 entregada');
  b.push(fotoFija(r.cierre));
  return b;
}

const fotoFija = ({ foto, nota }) => (foto || lleno(nota)
  ? { tipo: 'fotoFija', id: foto, nota }
  : { tipo: 'parrafo', texto: 'No se subió foto.', suave: true });

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
  ].filter(([, v]) => lleno(v));
}

export function nombreArchivo(r) {
  return `Reporte de servicio ${r.fecha}${r.turno ? ' ' + r.turno : ''}${r.equipo ? ' ' + r.equipo : ''}`.replace(/[\\/:*?"<>|]/g, '');
}
