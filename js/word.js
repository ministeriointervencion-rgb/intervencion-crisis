// Crea el reporte en Word (.docx) dentro del propio equipo, sin internet, con el logo y las fotos.
import { leer } from './almacen.js';
import { portada, contenido, nombreArchivo, datosTraslado, datosPaciente, datosHallazgo } from './contenido.js';
import { descargar, lleno } from './util.js';

const AZUL = '324098';
const AZUL_TITULO = '232B5E';
const GRIS = '696863';
const TERRACOTA = 'B7674C';
const ROJO = 'A3392B';
const LETRA_TITULOS = 'Georgia';
const LETRA_TEXTO = 'Calibri';

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

async function logoPng(ancho = 1024) {
  const img = new Image();
  img.src = 'icons/logo-completo.png';
  await img.decode();
  const alto = Math.round(ancho * img.naturalHeight / img.naturalWidth);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext('2d').drawImage(img, 0, 0, ancho, alto);
  const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/png'));
  return { datos: await blob.arrayBuffer(), ancho, alto };
}

async function medidas(blob) {
  const bmp = await createImageBitmap(blob);
  const m = { ancho: bmp.width, alto: bmp.height };
  bmp.close();
  return m;
}

export async function descargarWord(r) {
  const d = await cargarLibreria();
  const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak } = d;

  // Texto con saltos de línea respetados
  const corridas = (texto, opciones = {}) => String(texto).split('\n')
    .map((linea, i) => new TextRun({ text: linea, break: i ? 1 : 0, ...opciones }));

  const titulo = texto => new Paragraph({
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E8E2D6', space: 4 } },
    children: [new TextRun({ text: texto, font: LETRA_TITULOS, bold: true, size: 28, color: AZUL_TITULO })],
  });
  const subtitulo = texto => new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: texto, font: LETRA_TITULOS, bold: true, size: 24, color: AZUL_TITULO })],
  });
  const parrafo = (texto, opciones = {}) => new Paragraph({ spacing: { after: 80 }, children: corridas(texto, opciones) });
  const par = (k, v) => new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: k + ': ', bold: true }), ...corridas(v)],
  });
  const celda = (texto, opciones = {}) => new TableCell({
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    shading: opciones.fondo ? { type: ShadingType.CLEAR, color: 'auto', fill: opciones.fondo } : undefined,
    width: opciones.ancho,
    children: [new Paragraph({
      alignment: opciones.centro ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: texto, bold: !!opciones.negrita })],
    })],
  });

  // Fotos en una cuadrícula sin bordes, cada una centrada en su casilla
  async function fotos(ids, { columnas = 2, alto = 330 } = {}) {
    const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const ancho = columnas === 2 ? 290 : 190;
    const porCiento = Math.floor(100 / columnas);
    const casillas = [];
    for (const id of ids) {
      const dato = await leer('fotos', id);
      if (!dato) continue;
      const m = await medidas(dato.blob);
      const escala = Math.min(ancho / m.ancho, alto / m.alto);
      casillas.push(new TableCell({
        width: { size: porCiento, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 60, right: 60 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({
          data: await dato.blob.arrayBuffer(),
          transformation: { width: Math.round(m.ancho * escala), height: Math.round(m.alto * escala) },
        })] })],
      }));
    }
    if (!casillas.length) return [];
    while (casillas.length % columnas) casillas.push(new TableCell({ width: { size: porCiento, type: WidthType.PERCENTAGE }, children: [new Paragraph('')] }));
    const filas = [];
    for (let i = 0; i < casillas.length; i += columnas) filas.push(new TableRow({ cantSplit: true, children: casillas.slice(i, i + columnas) }));
    return [new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde },
      rows: filas,
    })];
  }

  // Foto de apertura o de cierre de la Estación 1: grande y centrada, con su anotación debajo
  async function fotoFija(b) {
    const piezas = [];
    const dato = b.id && await leer('fotos', b.id);
    if (dato) {
      const m = await medidas(dato.blob);
      const escala = Math.min(420 / m.ancho, 420 / m.alto);
      piezas.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, keepNext: true, children: [new ImageRun({
        data: await dato.blob.arrayBuffer(),
        transformation: { width: Math.round(m.ancho * escala), height: Math.round(m.alto * escala) },
      })] }));
    }
    if (lleno(b.nota)) piezas.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: corridas(b.nota, { italics: true, color: GRIS }) }));
    return piezas;
  }

  async function convertir(b) {
    switch (b.tipo) {
      case 'titulo': return [titulo(b.texto)];
      case 'subtitulo': return [subtitulo(b.texto)];
      case 'parrafo': return [parrafo(b.texto, b.suave ? { color: '444444' } : {})];
      case 'alerta': return [parrafo('⚠ ' + b.texto, { bold: true, color: ROJO })];
      case 'pares': return b.filas.map(([k, v]) => par(k, v));
      case 'tabla': return [new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: b.filas.map(([k, v, total], i) => new TableRow({ children: [
          celda(k, { negrita: total, fondo: total ? 'E2ECE3' : i % 2 ? undefined : 'FBFAF6', ancho: { size: 82, type: WidthType.PERCENTAGE } }),
          celda(v, { negrita: true, centro: true, fondo: total ? 'E2ECE3' : i % 2 ? undefined : 'FBFAF6', ancho: { size: 18, type: WidthType.PERCENTAGE } }),
        ] })),
      })];
      case 'asistencia': return [new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: b.filas.map(([nombre, estado, clave], i) => new TableRow({ children: [
          celda(nombre, { fondo: i % 2 ? undefined : 'FBFAF6', ancho: { size: 65, type: WidthType.PERCENTAGE } }),
          celda(estado, { negrita: true, fondo: clave === 'ausente' ? 'FBEAE7' : clave === 'tarde' ? 'FDF1D8' : i % 2 ? undefined : 'FBFAF6', ancho: { size: 35, type: WidthType.PERCENTAGE } }),
        ] })),
      })];
      case 'paciente': return [
        new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: b.nombre || 'Paciente sin nombre', bold: true, color: TERRACOTA })] }),
        ...datosPaciente(b).map(([k, v]) => par(k, v)),
        ...await fotos(b.fotos, { columnas: 3, alto: 200 }),
      ];
      case 'hallazgo': return [
        new Paragraph({ spacing: { before: 160 }, children: [
          new TextRun({ text: b.nombre, bold: true, color: b.riesgo ? ROJO : AZUL_TITULO }),
          ...(b.riesgo ? [new TextRun({ text: '  ⚠ RIESGO', bold: true, color: ROJO })] : []),
        ] }),
        ...datosHallazgo(b).map(([k, v]) => par(k, v)),
        ...(b.fotos.length ? [parrafo('Lo que se encontró:', { color: GRIS, size: 20 }), ...await fotos(b.fotos, { columnas: 3, alto: 200 })] : []),
        ...(b.fotosCorreccion.length ? [parrafo('Después de la corrección:', { color: GRIS, size: 20 }), ...await fotos(b.fotosCorreccion, { columnas: 3, alto: 200 })] : []),
      ];
      case 'traslado': return [
        new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: b.nombre || 'Persona sin nombre', bold: true, color: TERRACOTA })] }),
        ...datosTraslado(b).map(([k, v]) => par(k, v)),
        ...(lleno(b.nota) ? [parrafo(b.nota)] : []),
        ...await fotos(b.fotos, { columnas: 3, alto: 200 }),
      ];
      case 'vinetas': return b.items.map(t => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: corridas(t) }));
      case 'versiculo': return [
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: b.cita, bold: true, color: AZUL_TITULO })] }),
        new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `“${b.texto}”`, italics: true })] }),
      ];
      case 'fotos': return fotos(b.fotos);
      case 'fotoFija': return fotoFija(b);
      default: return [];
    }
  }

  const p = portada(r);
  const logo = await logoPng();
  const centrado = (children, after = 120) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after }, children });

  const hijos = [
    centrado([], 1800),
    centrado([new ImageRun({ data: logo.datos, transformation: { width: 320, height: Math.round(320 * logo.alto / logo.ancho) } })], 300),
    centrado([new TextRun({ text: p.iglesia.toUpperCase(), bold: true, color: GRIS, size: 22 })]),
    centrado([new TextRun({ text: p.titulo, font: LETRA_TITULOS, bold: true, size: 36, color: AZUL_TITULO })], 200),
    centrado([new TextRun({ text: p.servicio.toUpperCase(), font: LETRA_TITULOS, bold: true, size: 40, color: AZUL })], 200),
    ...(p.equipo ? [centrado([new TextRun({ text: p.equipo.toUpperCase(), bold: true, size: 26, color: TERRACOTA })], 200)] : []),
    ...(lleno(p.autor) ? [centrado([new TextRun({ text: p.autor, color: GRIS, size: 24 })])] : []),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  for (const b of contenido(r)) hijos.push(...await convertir(b));

  const documento = new Document({
    creator: 'Ministerio de Intervención en Crisis',
    title: nombreArchivo(r),
    styles: { default: { document: { run: { font: LETRA_TEXTO, size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: hijos,
    }],
  });

  const blob = await Packer.toBlob(documento);
  descargar(blob, nombreArchivo(r) + '.docx');
}
