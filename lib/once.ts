// Memoiza una promesa por clave. A diferencia de `x ??= f()`, si la promesa
// falla la borra: así el próximo intento reintenta, en vez de quedar pegado al
// error hasta reiniciar el proceso.

export type Once = (clave: string, fn: () => Promise<void>) => Promise<void>;

export function crearMemo(): Once {
  const pendientes = new Map<string, Promise<void>>();

  return function once(clave, fn) {
    let pendiente = pendientes.get(clave);
    if (!pendiente) {
      pendiente = fn().catch((error) => {
        pendientes.delete(clave);
        throw error;
      });
      pendientes.set(clave, pendiente);
    }
    return pendiente;
  };
}
