// Cartel «Reporte general de asistencias y servicios» para el Word. Usa el mismo fondo y los mismos
// dibujos del cartel del ministerio (icons/cartel), pero con los números reales del reporte.
import { gruposDe, numero } from './modelo.js';

const ANCHO = 1024;
const ALTO = 559;
const E = 2; // se dibuja al doble para que las letras salgan nítidas en el Word

// Título, subtítulo y dibujo de cada renglón del conteo
const TARJETAS = {
  clinicos: ['CLÍNICOS', 'Casos clínicos diversos', 'clinicos'],
  trauma: ['TRAUMAS', 'Atención de lesiones', 'trauma'],
  presion: ['TOMA TENSIÓN ARTERIAL', 'Monitoreo de salud', 'presion'],
  curas: ['CURAS', 'Atención de heridas', 'trauma'],
  inmovilizaciones: ['INMOVILIZACIONES', 'Atención de lesiones', 'trauma'],
  medicamentos: ['SOLICITUD DE MEDICAMENTOS', 'Atención farmacológica', 'medicamentos'],
  sanidad: ['SANIDAD', 'Intervenciones de sanidad', 'otras'],
  liberacion: ['LIBERACIÓN', 'Intervenciones de liberación', 'liberacion'],
  ministracion: ['MINISTRACIÓN', 'Acompañamiento espiritual', 'ministracion'],
  oraciones: ['ORACIÓN', 'Intervenciones espirituales', 'oracion'],
  sillaRuedas: ['ACOMPAÑAMIENTO SILLAS DE RUEDAS', 'Apoyo a movilidad reducida', 'sillaRuedas'],
  baston: ['ASISTENCIA CON BASTÓN', 'Ayuda de marcha', 'baston'],
  muletas: ['ACOMPAÑAMIENTO MULETAS', 'Apoyo a movilidad asistida', 'muletas'],
  psicomotriz: ['ASISTENCIA DISCAPACIDAD PSICOMOTRIZ', 'Atención especializada', 'psicomotriz'],
  acompanamientos: ['ACOMPAÑAMIENTOS GENERALES', 'Acompañamiento básico', 'acompanamientos'],
  ninos: ['NIÑOS EXTRAVIADOS', 'Reunidos con su familia', 'acompanamientos'],
  otras: ['OTRAS ASISTENCIAS', 'Servicios diversos', 'otras'],
};
const COLORES_BARRA = ['#3BA3DB', '#3DB5A0', '#6CC484', '#F0A35E', '#8E7CC3'];
const AZUL_NOCHE = '#17375E';
const TINTA = '#1A1A1A';

const imagenes = new Map();
function imagen(nombre) {
  if (!imagenes.has(nombre)) {
    const img = new Image();
    img.src = `icons/cartel/${nombre}.png`;
    imagenes.set(nombre, img.decode().then(() => img));
  }
  return imagenes.get(nombre);
}

function lineas(c, texto, ancho) {
  const salida = [];
  let linea = '';
  for (const palabra of texto.split(' ')) {
    const prueba = linea ? linea + ' ' + palabra : palabra;
    if (linea && c.measureText(prueba).width > ancho) { salida.push(linea); linea = palabra; } else linea = prueba;
  }
  if (linea) salida.push(linea);
  return salida;
}

// Achica la letra hasta que el texto quepa en una sola línea
function enUnaLinea(c, texto, ancho, peso, tamano) {
  for (let t = tamano; t > 7; t -= 0.5) {
    c.font = `${peso} ${t}px Inter`;
    if (c.measureText(texto).width <= ancho) return;
  }
}

function caja(c, x, y, w, h, { borde = '#E3E6EA', grosor = 1, radio = 10 } = {}) {
  c.save();
  c.shadowColor = 'rgba(20, 40, 60, 0.14)';
  c.shadowBlur = 6;
  c.shadowOffsetY = 2;
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.roundRect(x, y, w, h, radio);
  c.fill();
  c.restore();
  c.strokeStyle = borde;
  c.lineWidth = grosor;
  c.stroke();
}

function visto(c, x, y) {
  c.fillStyle = '#B9BEC4';
  c.beginPath();
  c.arc(x, y, 7, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#FFFFFF';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(x - 3.2, y);
  c.lineTo(x - 0.8, y + 2.5);
  c.lineTo(x + 3.5, y - 2.5);
  c.stroke();
}

function centrado(c, texto, x, y, fuente, color = TINTA) {
  c.font = fuente;
  c.fillStyle = color;
  c.textAlign = 'center';
  c.fillText(texto, x, y);
}

// Una tarjeta con su dibujo, su título con el número y su subtítulo. Las que dan cero salen en gris, como en el cartel original.
async function tarjeta(c, x, y, w, h, item, { borde, grande = false } = {}) {
  const [titulo, subtitulo, dibujo] = TARJETAS[item.k];
  caja(c, x, y, w, h, borde ? { borde, grosor: 2.5, radio: 12 } : {});
  const cero = item.n === 0;
  const img = await imagen(dibujo);
  const altoDibujo = h * (grande ? 0.54 : 0.52);
  const escala = Math.min((w - 20) / img.naturalWidth, altoDibujo / img.naturalHeight);
  const iw = img.naturalWidth * escala;
  const ih = img.naturalHeight * escala;
  c.save();
  if (cero) c.filter = 'grayscale(1) opacity(0.55)';
  c.drawImage(img, x + (w - iw) / 2, y + 8, iw, ih);
  c.restore();
  if (cero) visto(c, x + w - 13, y + 13);

  // El texto se achica hasta que quepa en la tarjeta
  const arriba = y + 8 + ih + 6;
  const disponible = y + h - 10 - arriba;
  for (let t = grande ? 17 : 12.5; t >= 8; t -= 0.5) {
    const s = t * 0.78;
    c.font = `700 ${t}px Inter`;
    const lt = lineas(c, `${titulo} (${item.n})`, w - 14);
    c.font = `400 ${s}px Inter`;
    const ls = lineas(c, subtitulo, w - 14);
    const alto = lt.length * t * 1.12 + ls.length * s * 1.15 + 2;
    if (alto > disponible && t > 8) continue;
    let yy = arriba + Math.max(0, (disponible - alto) / 2) + t * 0.9;
    for (const l of lt) { centrado(c, l, x + w / 2, yy, `700 ${t}px Inter`, cero ? '#6B7075' : TINTA); yy += t * 1.12; }
    yy += 2 + s * 0.15;
    for (const l of ls) { centrado(c, l, x + w / 2, yy, `400 ${s}px Inter`, cero ? '#8A8F94' : '#333333'); yy += s * 1.15; }
    break;
  }
}

async function fila(c, items, x0, x1, y, h, separacion, opciones = () => ({})) {
  if (!items.length) return;
  const w = (x1 - x0 - separacion * (items.length - 1)) / items.length;
  for (const [i, item] of items.entries()) await tarjeta(c, x0 + i * (w + separacion), y, w, h, item, opciones(i));
}

function barras(c, x, y, w, h, titulo, filas, total) {
  centrado(c, titulo, x + w / 2, y - 7, '700 11.5px Inter');
  caja(c, x, y, w, h);
  const renglones = [...filas, ...(total ? [total] : [])];
  const alto = Math.min(26, (h - 16) / renglones.length);
  const etiqueta = Math.min(130, w * 0.36);
  const maximo = Math.max(1, ...filas.map(f => f.n));
  const largo = w - etiqueta - 62;
  renglones.forEach((f, i) => {
    const yy = y + 8 + i * alto;
    const medio = yy + alto / 2;
    if (f === total) {
      c.fillStyle = AZUL_NOCHE;
      c.beginPath();
      c.roundRect(x + 10, yy + 3, w - 66, alto - 6, 3);
      c.fill();
      c.font = '700 10.5px Inter';
      c.fillStyle = '#FFFFFF';
      c.textAlign = 'left';
      c.fillText(f.t, x + 18, medio + 4);
    } else {
      enUnaLinea(c, f.t.toUpperCase(), etiqueta - 16, 700, 10.5);
      c.fillStyle = TINTA;
      c.textAlign = 'left';
      c.fillText(f.t.toUpperCase(), x + 12, medio + 4);
      c.fillStyle = COLORES_BARRA[i % COLORES_BARRA.length];
      c.fillRect(x + etiqueta, yy + 4, Math.max(3, largo * f.n / maximo), alto - 8);
    }
    c.font = '700 13px Inter';
    c.fillStyle = TINTA;
    c.textAlign = 'right';
    c.fillText(`(${f.n})`, x + w - 10, medio + 5);
  });
}

function sinIncidencias(c, x, y, w, h, items) {
  centrado(c, 'REGISTROS SIN INCIDENCIAS (0)', x + w / 2, y - 7, '700 11.5px Inter');
  caja(c, x, y, w, h);
  const columnas = items.length > 5 ? 2 : 1;
  const porColumna = Math.ceil(items.length / columnas);
  const alto = Math.min(26, (h - 12) / porColumna);
  const ancho = (w - 12 - (columnas - 1) * 6) / columnas;
  items.forEach((item, i) => {
    const xx = x + 6 + Math.floor(i / porColumna) * (ancho + 6);
    const yy = y + 6 + (i % porColumna) * alto;
    c.fillStyle = '#EEF0F2';
    c.beginPath();
    c.roundRect(xx, yy + 2, ancho, alto - 4, 5);
    c.fill();
    enUnaLinea(c, item.t, ancho - 30, 400, columnas === 2 ? 9.5 : 10.5);
    c.fillStyle = '#333333';
    c.textAlign = 'left';
    c.fillText(item.t, xx + 8, yy + alto / 2 + 3.5);
    visto(c, xx + ancho - 10, yy + alto / 2);
  });
}

// tipo: 'general' (todo el conteo) o 'templo' (asistencias a personas con discapacidad dentro del templo)
export async function cartelPng(r, tipo = 'general') {
  await Promise.all([document.fonts.load('700 16px Inter'), document.fonts.load('400 16px Inter')]);
  const grupos = gruposDe(r);
  const conDatos = g => g.items.map(([k, t]) => ({ k, t, n: numero(r.conteos[k]) }));
  const templo = grupos.find(g => g.items.some(([k]) => k === 'sillaRuedas'));
  const items = tipo === 'templo' ? conDatos(templo) : grupos.flatMap(conDatos);
  const total = items.reduce((s, i) => s + i.n, 0);

  // Las que tienen números van primero (de mayor a menor); los huecos se llenan con las que dan cero
  const conNumero = items.filter(i => i.n > 0).sort((a, b) => b.n - a.n);
  const ceros = items.filter(i => i.n === 0);
  const tarjetas = conNumero.length > 9
    ? [...conNumero.slice(0, 8), { k: 'otras', n: conNumero.slice(8).reduce((s, i) => s + i.n, 0) }]
    : [...conNumero, ...ceros].slice(0, 9);
  const sinCartel = ceros.filter(i => !tarjetas.includes(i));

  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO * E;
  lienzo.height = ALTO * E;
  const c = lienzo.getContext('2d');
  c.scale(E, E);
  c.drawImage(await imagen('fondo'), 0, 0, ANCHO, ALTO);
  c.font = '700 42px Inter';
  c.fillStyle = TINTA;
  c.textAlign = 'left';
  c.fillText(String(total), 288, 120);

  // Arriba a la izquierda, los dos servicios principales
  const [a, b] = tarjetas;
  centrado(c, tipo === 'templo' ? 'SERVICIOS PRINCIPALES' : 'SERVICIOS CON MAYOR DEMANDA', 240, 162, '700 15px Inter');
  if (tipo !== 'templo' && b?.n > 0) {
    centrado(c, a.n === b.n ? `(${a.n} ATENCIONES CADA UNO)` : `(${a.n} Y ${b.n} ATENCIONES)`, 240, 177, '700 10px Inter');
  }
  // Sin tarjetas pequeñas, la distribución ocupa todo el ancho de abajo y las grandes se acortan para dejarle sitio a su título
  const pequenas = tarjetas.slice(6, 9);
  await fila(c, tarjetas.slice(0, 2), 42, 436, 184, pequenas.length ? 186 : 158, 12, i => ({ borde: i ? '#E2873A' : '#2F86C3', grande: true }));

  // Arriba a la derecha, las que siguen
  const derecha = tarjetas.slice(2, 6);
  if (derecha.length) centrado(c, 'OTRAS ASISTENCIAS DESTACADAS', 719, 162, '700 15px Inter');
  await fila(c, derecha, 452, 986, 172, 170, 10);

  // Abajo: las pequeñas, la distribución por tipo y lo que dio cero
  await fila(c, pequenas, 38, 432, 380, 142, 12);
  const anchoCeros = sinCartel.length > 5 ? 290 : sinCartel.length ? 182 : 0;
  const xCeros = 986 - anchoCeros;
  const xBarras = pequenas.length ? 452 : 38;
  const finBarras = anchoCeros ? xCeros - 14 : 986;
  const filasBarras = tipo === 'templo'
    ? items
    : grupos.map(g => ({ t: g.titulo.replace(/^Personas con /i, ''), n: conDatos(g).reduce((s, i) => s + i.n, 0) }));
  barras(c, xBarras, 380, finBarras - xBarras, 142,
    tipo === 'templo' ? 'DISTRIBUCIÓN DENTRO DEL TEMPLO' : 'DISTRIBUCIÓN POR TIPO DE ASISTENCIA',
    filasBarras, tipo === 'templo' ? null : { t: 'TOTAL DE ASISTENCIAS', n: total });
  if (anchoCeros) sinIncidencias(c, xCeros, 380, anchoCeros, 142, sinCartel);

  const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/png'));
  return { datos: await blob.arrayBuffer(), ancho: lienzo.width, alto: lienzo.height };
}
