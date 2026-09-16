const MAX_SIDE = 1920;
const QUALITY = 0.85;

/**
 * Achica una foto antes de subirla: lado mayor a 1920 px y JPEG al 85 %.
 * Una foto de celular pasa de 3-8 MB a unos 300-600 KB, y así no choca con
 * el límite de nginx ni el de multer.
 *
 * Si el navegador no puede decodificar la imagen (por ejemplo HEIC en
 * Chrome de Windows) o el resultado no es más chico, devuelve el original
 * y el backend decide.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation respeta la rotación EXIF de las fotos de celular
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Fondo blanco para PNG con transparencia (JPEG no tiene canal alfa)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
}
