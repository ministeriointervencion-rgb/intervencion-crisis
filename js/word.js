// Crea el reporte en Word (.docx) dentro del propio equipo, sin internet. Sigue el formato del Word
// del ministerio: portada azul con el logo, Visión y Misión, resumen con el cartel, tablas con rayas,
// el recorrido del día y las fotos anexas de dos en dos. Hoja A4, márgenes de 3 cm, letra Aptos.
import { leer } from './almacen.js';
import { nombreArchivo, datosTraslado, tratamiento } from './contenido.js';
import { cartelPng } from './cartel.js';
import {
  IGLESIA, MINISTERIO, VISION, MISION, ASISTENCIA, CORRECCIONES,
  diaSemana, fechaCorta, horaBonita, gruposDe, idsFotos, numero, totalAsistencias,
} from './modelo.js';
import { descargar, lleno } from './util.js';

const AZUL = '156082';
const LETRA = 'Aptos';
const LETRA_PORTADA = 'Aptos Display';
const CM3 = 1701; // 3 cm en veinteavos de punto
const ANCHO_TEXTO = 11906 - 2 * CM3; // A4 menos los márgenes

// Renglones de cada tabla, en el orden del Word del ministerio
const TABLA_GENERAL = [
  ['trauma', 'Traumas'], ['clinicos', 'Clínicos'], ['medicamentos', 'Solicitud de medicamentos'],
  ['sillaRuedas', 'Acompañamiento de personal con discapacidad sillas de ruedas'],
  ['baston', 'Acompañamiento de personal con discapacidad bastones'],
  ['muletas', 'Acompañamiento de personal con discapacidad muletas'],
  ['acompanamientos', 'Acompañamientos'], ['psicomotriz', 'Asistencia a personas con discapacidad psicomotrices'],
  ['curas', 'Curas'], ['inmovilizaciones', 'Inmovilizaciones'], ['presion', 'Toma tensión arterial'],
  ['sanidad', 'Sanidad'], ['liberacion', 'Liberación'], ['ministracion', 'Ministración'], ['oraciones', 'Oración'],
  ['ninos', 'Niños extraviados'],
];
const TABLA_ESTACION = [
  ['trauma', 'Traumas'], ['clinicos', 'Clínicos'], ['curas', 'Curas'], ['inmovilizaciones', 'Inmovilizaciones'],
  ['presion', 'Toma tensión arterial'], ['liberacion', 'Liberación'], ['sanidad', 'Sanidad'],
  ['ministracion', 'Ministración'], ['oraciones', 'Oración'], ['medicamentos', 'Solicitud de medicamentos'],
  ['ninos', 'Niños extraviados'],
];
const TABLA_TEMPLO = [
  ['acompanamientos', 'Acompañamientos'], ['baston', 'Asistencia a personas con bastón'],
  ['muletas', 'Asistencia a personas con muletas'], ['psicomotriz', 'Asistencia a personas con discapacidad psicomotrices'],
  ['sillaRuedas', 'Traslado en silla de ruedas'],
];

const ETIQUETA_ASISTENCIA = Object.fromEntries(ASISTENCIA);
const ETIQUETA_CORRECCION = Object.fromEntries(CORRECCIONES);

let cargando;
function cargarLibreria() {
  if (window.docx) return Promise.resolve(window.docx);
  cargando ??= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'js/lib/docx.umd.js';
    s.onload = () => ok(window.docx);
    s.onerror = mal;
    document.head.append(s);
  });
  return cargando;
}

// El logo tal cual, dentro de un recuadro blanco para que se vea sobre el azul de la portada
async function logoEnRecuadro() {
  const img = new Image();
  img.src = 'icons/logo-completo.png';
  await img.decode();
  const borde = 40;
  const lienzo = document.createElement('canvas');
  lienzo.width = img.naturalWidth + 2 * borde;
  lienzo.height = img.naturalHeight + 2 * borde;
  const c = lienzo.getContext('2d');
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.roundRect(0, 0, lienzo.width, lienzo.height, 36);
  c.fill();
  c.drawImage(img, borde, borde);
  const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/png'));
  return { datos: await blob.arrayBuffer(), ancho: lienzo.width, alto: lienzo.height };
}

async function medidas(blob) {
  const bmp = await createImageBitmap(blob);
  const m = { ancho: bmp.width, alto: bmp.height };
  bmp.close();
  return m;
}

export async function descargarWord(r) {
  const d = await cargarLibreria();
  const {
    Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType,
    BorderStyle, ShadingType, HeightRule, VerticalAlign, TableLayoutType, TabStopType,
  } = d;

  const enUso = new Set(gruposDe(r).flatMap(g => g.items.map(([k]) => k)));
  const renglones = lista => lista.filter(([k]) => enUso.has(k));
  const dia = `${diaSemana(r.fecha)} ${Number(r.fecha.slice(8))}`;

  // ---------- piezas de texto ----------
  const corridas = (texto, opciones = {}) => String(texto).split('\n')
    .map((linea, i) => new TextRun({ text: linea, break: i ? 1 : 0, ...opciones }));
  const parrafo = (hijos, { justificado = false, despues = 160, antes = 0 } = {}) => new Paragraph({
    alignment: justificado ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    spacing: { before: antes, after: despues, line: 276 },
    children: hijos,
  });
  const negrita = (texto, opciones) => parrafo(corridas(texto, { bold: true }), opciones);
  const texto = (t, opciones) => parrafo(corridas(t), opciones);
  // «Etiqueta: valor», con la etiqueta en negrita
  const par = (k, v, opciones) => parrafo([new TextRun({ text: k + ': ', bold: true }), ...corridas(v)], opciones);
  // Lista numerada a mano (1., 2., …) con sangría francesa; cada elemento puede tener varias líneas
  const numerada = (items, despues = 120) => items.map((lineasItem, i) => new Paragraph({
    spacing: { after: despues, line: 276 },
    indent: { left: 720, hanging: 360 },
    tabStops: [{ type: TabStopType.LEFT, position: 720 }],
    children: [new TextRun({ text: `${i + 1}.\t` }), ...corridas([].concat(lineasItem).filter(lleno).join('\n'))],
  }));
  const ninguno = () => texto('Ninguno.');

  // ---------- tablas con rayas, como en el Word del ministerio ----------
  const raya = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const sinRaya = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const celda = (t, { negrita: n = false, centro = false, ancho } = {}) => new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    margins: { top: 20, bottom: 20, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: centro ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: corridas(t, { bold: n, size: 20 }),
    })],
  });
  function tabla(encabezado, filas, anchos = [5900, ANCHO_TEXTO - 5900]) {
    const fila = (valores, esEncabezado) => new TableRow({
      tableHeader: esEncabezado,
      cantSplit: true,
      children: valores.map((v, i) => celda(v, { negrita: esEncabezado, centro: esEncabezado || i > 0, ancho: anchos[i] })),
    });
    return new Table({
      width: { size: ANCHO_TEXTO, type: WidthType.DXA },
      columnWidths: anchos,
      layout: TableLayoutType.FIXED,
      borders: { top: raya, bottom: raya, left: raya, right: raya, insideHorizontal: raya, insideVertical: raya },
      rows: [fila(encabezado, true), ...filas.map(f => fila(f, false))],
    });
  }
  const columnaDia = r.turno ? `${dia}\n${r.turno}` : dia;
  const tablaConteo = (lista, conTotal) => tabla(['Asistencia', columnaDia], [
    ...renglones(lista).map(([k, t]) => [t, String(numero(r.conteos[k]))]),
    ...(conTotal ? [[conTotal[0], String(conTotal[1])]] : []),
  ]);
  const espacio = () => parrafo([], { despues: 120 });

  // ---------- imágenes ----------
  const imagen = (img, anchoPx) => new ImageRun({
    data: img.datos,
    transformation: { width: anchoPx, height: Math.round(anchoPx * img.alto / img.ancho) },
  });
  const cartel = async tipo => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [imagen(await cartelPng(r, tipo), 567)],
  });

  // Fotos anexas de dos en dos, dentro de un cuadro con rayas
  async function fotosAnexas(ids) {
    const mitad = ANCHO_TEXTO / 2;
    const casillas = [];
    for (const id of ids) {
      const dato = await leer('fotos', id);
      if (!dato) continue;
      const m = await medidas(dato.blob);
      const escala = Math.min(272 / m.ancho, 340 / m.alto);
      casillas.push(new TableCell({
        width: { size: mitad, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({
          data: await dato.blob.arrayBuffer(),
          transformation: { width: Math.round(m.ancho * escala), height: Math.round(m.alto * escala) },
        })] })],
      }));
    }
    if (!casillas.length) return [texto('No se subieron fotos.')];
    if (casillas.length % 2) casillas.push(new TableCell({ width: { size: mitad, type: WidthType.DXA }, children: [new Paragraph('')] }));
    const filas = [];
    for (let i = 0; i < casillas.length; i += 2) filas.push(new TableRow({ cantSplit: true, children: casillas.slice(i, i + 2) }));
    return [new Table({
      width: { size: ANCHO_TEXTO, type: WidthType.DXA },
      columnWidths: [mitad, mitad],
      layout: TableLayoutType.FIXED,
      borders: { top: raya, bottom: raya, left: raya, right: raya, insideHorizontal: raya, insideVertical: raya },
      rows: filas,
    })];
  }

  // ---------- portada ----------
  // Los bloques azules salen de orilla a orilla como en el original (más anchos que los márgenes)
  const anchoBloque = 10500;
  const sangriaBloque = (11906 - anchoBloque) / 2 - CM3;
  const bloque = (alto, hijos, alinear = VerticalAlign.CENTER) => new Table({
    width: { size: anchoBloque, type: WidthType.DXA },
    columnWidths: [anchoBloque],
    indent: { size: sangriaBloque, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: { top: sinRaya, bottom: sinRaya, left: sinRaya, right: sinRaya, insideHorizontal: sinRaya, insideVertical: sinRaya },
    rows: [new TableRow({
      height: { value: alto, rule: HeightRule.EXACT },
      children: [new TableCell({
        width: { size: anchoBloque, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: AZUL },
        verticalAlign: alinear,
        margins: { bottom: alinear === VerticalAlign.BOTTOM ? 900 : 0 },
        children: hijos,
      })],
    })],
  });
  const tituloPortada = (t, tamano = 52, despues = 0) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: despues },
    children: [new TextRun({ text: t.toUpperCase(), font: LETRA_PORTADA, bold: true, size: tamano, color: AZUL })],
  });
  const blanco = t => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: t, color: 'FFFFFF' })],
  });
  const logo = await logoEnRecuadro();
  const evento = [r.evento, r.tema].filter(lleno).join(' ');
  const servicio = `${diaSemana(r.fecha)} ${fechaCorta(r.fecha)}${r.turno ? ' · ' + r.turno : ''}`;
  const portada = [
    bloque(2160, [new Paragraph({ alignment: AlignmentType.CENTER, children: [imagen(logo, 280)] })]),
    new Paragraph({ spacing: { before: 280 }, children: [] }),
    tituloPortada(`${IGLESIA} reporte del ${MINISTERIO}`, 52, 360),
    ...(lleno(evento) ? [tituloPortada(evento)] : []),
    tituloPortada(servicio, 36, 280),
    bloque(6800, [
      ...(lleno(r.autor) ? [blanco(r.autor)] : []),
      blanco(MINISTERIO.toUpperCase()),
      ...(lleno(r.equipo) ? [blanco(r.equipo)] : []),
    ], VerticalAlign.BOTTOM),
    new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: '', size: 2 })] }),
  ];

  // ---------- cuerpo ----------
  const cuerpo = [];
  const poner = (...piezas) => cuerpo.push(...piezas.flat());

  poner(negrita('Visión'), texto(VISION, { justificado: true }), negrita('Misión'));
  for (const [nombre, t] of MISION) poner(negrita(nombre), texto(t, { justificado: true }));

  poner(negrita(`Resumen ejecutivo ${[r.evento, r.tema].filter(lleno).join(' - ').toUpperCase()} - ${fechaCorta(r.fecha)}`.replace(/\s+/g, ' ')));
  if (lleno(r.tema)) poner(negrita('Tema: ' + r.tema.toUpperCase()));
  poner(await cartel('general'));

  poner(tablaConteo(TABLA_GENERAL, ['Total asistencias', totalAsistencias(r)]), espacio());
  poner(tabla(['Desarrollo', columnaDia], [
    ['Inicio', horaBonita(r.inicio) || '---'],
    ['Finalización', horaBonita(r.fin) || '---'],
    ['Rendimiento', r.rendimiento || '---'],
  ]), espacio());

  poner(par('Supervisión General', r.supervision || '---'));
  poner(tabla(['Equipo de Servicio', columnaDia], [
    ['Estación 1', r.doctoras || '---'],
    ...r.puestos.map(p => [p.nombre, p.persona || '---']),
  ]), espacio());

  const marcados = r.asistencia.filter(s => s.estado);
  if (marcados.length) {
    poner(negrita('Presencia de los servidores:'));
    poner(tabla(['Servidor', 'Presencia'], marcados.map(s => [
      s.nombre,
      ETIQUETA_ASISTENCIA[s.estado] + (s.estado === 'tarde' && lleno(s.hora) ? ` (${horaBonita(s.hora)})` : ''),
    ])), espacio());
  }

  const estacion = renglones(TABLA_ESTACION).reduce((s, [k]) => s + numero(r.conteos[k]), 0);
  poner(negrita('Pacientes asistidos en la estación 1:'), tablaConteo(TABLA_ESTACION, ['Total', estacion]), espacio());

  poner(negrita('Asistencias dentro del templo:'), await cartel('templo'), tablaConteo(TABLA_TEMPLO), espacio());

  // El día: recorrido, personas atendidas, mejoras, logros, versículos y fotos
  poner(negrita(`${diaSemana(r.fecha).toUpperCase()} ${fechaCorta(r.fecha)}${r.turno ? ' — ' + r.turno.toUpperCase() : ''}`, { antes: 240 }));

  const area = a => {
    const nota = lleno(a.nota) ? a.nota : 'Sin eventos';
    if (a.estado !== 'hallazgo') return par(a.nombre, nota);
    const detalle = [
      a.riesgo ? 'Riesgo' : '',
      lleno(a.revisor) ? 'Lo encontró: ' + a.revisor : '',
      a.correccion ? 'Corrección: ' + ETIQUETA_CORRECCION[a.correccion] + (lleno(a.queSeHizo) ? ' — ' + a.queSeHizo : '') : '',
    ].filter(Boolean);
    return par(a.nombre, [nota, ...detalle].join('\n'));
  };
  const revisadas = lista => lista.filter(a => a.estado);
  poner(negrita('Áreas externas del templo supervisadas'));
  poner(revisadas(r.areasExternas).length ? revisadas(r.areasExternas).map(area) : [texto('Sin revisar.')]);
  poner(negrita('Áreas internas al templo supervisadas:'));
  poner(revisadas(r.areasInternas).length ? revisadas(r.areasInternas).map(area) : [texto('Sin revisar.')]);

  poner(negrita('Datos de las personas asistidos, que se animaron a compartir sus datos:'));
  poner(r.pacientes.length ? numerada(r.pacientes.map(p => [
    p.nombre || 'Paciente sin nombre',
    lleno(p.edad) ? p.edad + ' años' : '',
    lleno(p.telefono) ? 'Tel: ' + p.telefono : '',
    lleno(p.hora) ? 'Hora: ' + horaBonita(p.hora) : '',
    lleno(p.doctora) ? 'Atendió: ' + p.doctora : '',
    lleno(p.llegada) ? 'Cómo llegó: ' + p.llegada : '',
    lleno(p.px) ? 'Px: ' + p.px : '',
    lleno(p.dx) ? 'DX: ' + p.dx : '',
    lleno(tratamiento(r, p.tx)) ? 'TX: ' + tratamiento(r, p.tx) : '',
    lleno(p.evolucion) ? 'Evolución: ' + p.evolucion : '',
    lleno(p.ministracion) ? 'Ministración: ' + p.ministracion : '',
    lleno(p.ministradoPor) ? 'Le ministró: ' + p.ministradoPor : '',
    lleno(p.ministracionNota) ? 'Cómo se le ministró: ' + p.ministracionNota : '',
  ]), 200) : [texto('Ninguna.')]);

  poner(negrita('Datos de personas con limitación psicomotriz y/o asistencia por bastón o sillas de ruedas que se animaron a compartir sus datos:'));
  poner(r.traslados.length ? numerada(r.traslados.map(t => [
    t.nombre || 'Persona sin nombre',
    ...datosTraslado({ ...t, hora: horaBonita(t.hora) }).map(([k, v]) => `${k}: ${v}`),
    t.nota,
  ]), 200) : [texto('Ninguna.')]);

  if (r.medicamentosActivos) {
    const medicamentos = r.medicamentos.filter(p => lleno(p.nombre) || lleno(p.detalle));
    poner(par('Personas que solicitaron medicamentos en la estación 1', String(medicamentos.length)));
    poner(numerada(medicamentos.map(p => [p.nombre, p.detalle].filter(lleno).join(' — '))));
  }
  poner(par('Datos de niños extraviados', lleno(r.ninosDatos) ? r.ninosDatos : '0'));

  poner(negrita('Plan propuesto de mejoras para próximos eventos:'));
  poner(r.mejoras.some(lleno) ? numerada(r.mejoras.filter(lleno)) : [ninguno()]);
  poner(negrita('Logros:'));
  poner(r.logros.some(lleno) ? numerada(r.logros.filter(lleno)) : [ninguno()]);

  const versiculos = r.versiculos.filter(v => lleno(v.cita) || lleno(v.texto) || lleno(v.comentario));
  if (versiculos.length) {
    poner(negrita('Versículos del día que ministraron nuestro servicio:'));
    for (const v of versiculos) {
      if (lleno(v.cita)) poner(negrita(v.cita));
      if (lleno(v.texto)) poner(texto(`"${v.texto.trim()}"`, { justificado: true }));
      if (lleno(v.comentario)) poner(texto(v.comentario, { justificado: true }));
    }
  }

  poner(negrita('Fotos anexas'), await fotosAnexas(idsFotos(r)));

  const documento = new Document({
    creator: MINISTERIO,
    title: nombreArchivo(r),
    styles: { default: { document: { run: { font: LETRA, size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 760, bottom: 600, left: CM3, right: CM3 } } },
        children: portada,
      },
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, bottom: 1134, left: CM3, right: CM3 } } },
        children: cuerpo,
      },
    ],
  });

  const blob = await Packer.toBlob(documento);
  descargar(blob, nombreArchivo(r) + '.docx');
}
