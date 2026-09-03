// Validación de capturas de pantalla. Sin acceso a base: lo testeable vive acá,
// las consultas en lib/adjuntos-db.ts.

export const MAX_BYTES = 3 * 1024 * 1024;
export const MAX_POR_TICKET = 3;

export type Adjunto = {
  id: number;
  ticket_id: number;
  nombre: string;
  tipo: string;
  bytes: Uint8Array;
  creado: Date;
};

/**
 * Tipo de imagen deducido del contenido, no del Content-Type que manda el
 * navegador: un .html renombrado a .png llega diciendo image/png, y servirlo
 * como HTML desde nuestro dominio sería un XSS. Si no reconocemos la firma,
 * el archivo no entra.
 */
export function detectarTipoImagen(bytes: Uint8Array): string | null {
  const empieza = (...firma: number[]) => firma.every((byte, i) => bytes[i] === byte);

  if (empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (empieza(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (empieza(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  // WebP es un contenedor RIFF: "RIFF" en 0 y "WEBP" en 8.
  if (empieza(0x52, 0x49, 0x46, 0x46) && [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[8 + i] === b)) {
    return "image/webp";
  }
  return null;
}

/** Nombre de archivo seguro para mostrar y para el Content-Disposition. */
export function limpiarNombre(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "captura";
  const limpio = base.replace(/[^\w.\- ]+/g, "").trim();
  return limpio.slice(0, 100) || "captura";
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function validarAdjunto(nombre: string, bytes: Uint8Array): Result<{ nombre: string; tipo: string }> {
  if (bytes.byteLength === 0) return { ok: false, error: "El archivo está vacío" };
  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, error: "Cada captura tiene que pesar menos de 3 MB" };
  }

  const tipo = detectarTipoImagen(bytes);
  if (!tipo) return { ok: false, error: "Sólo se pueden subir imágenes (PNG, JPG, GIF o WebP)" };

  return { ok: true, value: { nombre: limpiarNombre(nombre), tipo } };
}
