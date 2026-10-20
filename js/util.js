export const esc = v => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const lleno = v => String(v ?? '').trim() !== '';

let reloj;
export function aviso(texto) {
  const caja = document.getElementById('aviso');
  caja.textContent = texto;
  caja.classList.add('visible');
  clearTimeout(reloj);
  reloj = setTimeout(() => caja.classList.remove('visible'), 2600);
}

export const ir = ruta => { location.hash = ruta; };

// Reduce una foto del teléfono a un tamaño práctico (máx. 1600 px) manteniendo buena calidad.
export async function reducirFoto(archivo, maximo = 1600) {
  const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  const escala = Math.min(1, maximo / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bmp.width * escala);
  lienzo.height = Math.round(bmp.height * escala);
  lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  bmp.close();
  return new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', 0.85));
}

export function descargar(blob, nombre) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
