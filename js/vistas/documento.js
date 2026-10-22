// El expediente terminado, como el Word: se puede imprimir, descargar en Word, editar o eliminar.
import { leer, leerReporte, borrarReporte } from '../almacen.js';
import { portada, contenido, datosPaciente, datosTraslado, datosHallazgo } from '../contenido.js';
import { idsFotos } from '../modelo.js';
import { esc, aviso, ir, lleno } from '../util.js';
import { descargarWord } from '../word.js';

const cuadricula = (ids, urls, clase = 'doc-fotos') => ids?.length
  ? `<div class="${clase}">${ids.map((id, i) => `<img src="${urls.get(id) || ''}" alt="Foto ${i + 1}" loading="lazy">`).join('')}</div>`
  : '';

const pares = filas => `<dl class="doc-par">${filas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

function bloqueHtml(b, urls) {
  switch (b.tipo) {
    case 'titulo': return `<h2><span>${esc(b.texto)}</span></h2>`;
    case 'subtitulo': return `<h3>${esc(b.texto)}</h3>`;
    case 'parrafo': return `<p class="${b.suave ? 'doc-mision' : ''}">${esc(b.texto)}</p>`;
    case 'alerta': return `<p class="doc-alerta">⚠ ${esc(b.texto)}</p>`;
    case 'pares': return pares(b.filas);
    case 'tabla': return `<table class="doc-tabla"><tbody>${b.filas.map(([k, v, clase]) =>
      `<tr class="${clase}"><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
    case 'asistencia': return `<ul class="doc-asistencia">${b.filas.map(([nombre, estado, clave]) =>
      `<li><span>${esc(nombre)}</span><b class="marca-${clave}">${esc(estado)}</b></li>`).join('')}</ul>`;
    case 'paciente': return `<article class="doc-ficha">
      <b class="doc-ficha-nombre">${esc(b.nombre || 'Paciente sin nombre')}</b>
      ${pares(datosPaciente(b))}${cuadricula(b.fotos, urls, 'doc-fotos chicas')}</article>`;
    case 'traslado': return `<article class="doc-ficha azul">
      <b class="doc-ficha-nombre">${esc(b.nombre || 'Persona sin nombre')}</b>
      ${pares(datosTraslado(b))}${lleno(b.nota) ? `<p>${esc(b.nota)}</p>` : ''}${cuadricula(b.fotos, urls, 'doc-fotos chicas')}</article>`;
    case 'hallazgo': return `<article class="doc-ficha ${b.riesgo ? 'riesgo' : 'verde'}">
      <b class="doc-ficha-nombre">${esc(b.nombre)}${b.riesgo ? ' <span class="sello-riesgo">⚠ Riesgo</span>' : ''}</b>
      ${pares(datosHallazgo(b))}
      ${b.fotos.length ? `<p class="doc-pie-fotos">Lo que se encontró</p>${cuadricula(b.fotos, urls, 'doc-fotos chicas')}` : ''}
      ${b.fotosCorreccion.length ? `<p class="doc-pie-fotos">Después de la corrección</p>${cuadricula(b.fotosCorreccion, urls, 'doc-fotos chicas')}` : ''}</article>`;
    case 'vinetas': return `<ul>${b.items.map(t => `<li><p>${esc(t)}</p></li>`).join('')}</ul>`;
    case 'versiculo': return `<div class="doc-versiculo"><b>${esc(b.cita)}</b>${lleno(b.texto) ? `<p>“${esc(b.texto)}”</p>` : ''}
      ${lleno(b.comentario) ? `<p class="doc-comentario"><span>Comentario:</span> ${esc(b.comentario)}</p>` : ''}</div>`;
    case 'fotoFija': return `<figure class="doc-foto-fija">
      ${b.id && urls.get(b.id) ? `<img src="${urls.get(b.id)}" alt="Foto de la Estación 1">` : ''}
      ${lleno(b.nota) ? `<figcaption>${esc(b.nota)}</figcaption>` : ''}</figure>`;
    case 'fotos': return cuadricula(b.fotos, urls);
    default: return '';
  }
}

export async function vistaDocumento(raiz, id) {
  const r = await leerReporte(id);
  if (!r) { ir('#/'); return; }

  const urls = new Map();
  for (const fid of idsFotos(r)) {
    const dato = await leer('fotos', fid);
    if (dato) urls.set(fid, URL.createObjectURL(dato.blob));
  }

  const p = portada(r);
  raiz.innerHTML = `
    <div class="barra-documento">
      <button class="boton" id="volver">← Expedientes</button>
      <div class="acciones">
        <button class="boton principal" id="word">Descargar en Word</button>
        <button class="boton" id="imprimir">Imprimir</button>
        <button class="boton" id="editar">Editar</button>
        <button class="boton peligro" id="eliminar">Eliminar</button>
      </div>
    </div>
    <article class="documento">
      <div class="doc-portada">
        <img src="icons/logo-completo.png" alt="Ministerio Internacional Monte de Dios">
        <div class="iglesia">${esc(p.iglesia)}</div>
        <h1>${esc(p.titulo)}</h1>
        <div class="servicio">${esc(p.servicio)}</div>
        ${p.equipo ? `<div class="equipo-sello">${esc(p.equipo)}</div>` : ''}
        ${lleno(p.autor) ? `<div class="autor">${esc(p.autor)}</div>` : ''}
      </div>
      ${contenido(r).map(b => bloqueHtml(b, urls)).join('')}
    </article>`;

  raiz.querySelector('#volver').onclick = () => ir('#/');
  raiz.querySelector('#editar').onclick = () => ir('#/editar/' + r.id);
  raiz.querySelector('#imprimir').onclick = () => window.print();
  raiz.querySelector('#word').onclick = async e => {
    const boton = e.currentTarget;
    boton.disabled = true;
    boton.textContent = 'Preparando Word…';
    try {
      await descargarWord(r);
      aviso('Word guardado en Descargas');
    } catch (err) {
      console.error(err);
      aviso('No se pudo crear el Word. Intenta de nuevo.');
    }
    boton.disabled = false;
    boton.textContent = 'Descargar en Word';
  };
  raiz.querySelector('#eliminar').onclick = async () => {
    if (!confirm('¿Eliminar este expediente y sus fotos? Esto no se puede deshacer.')) return;
    await borrarReporte(r);
    aviso('Expediente eliminado');
    ir('#/');
  };

  return () => urls.forEach(u => URL.revokeObjectURL(u));
}
