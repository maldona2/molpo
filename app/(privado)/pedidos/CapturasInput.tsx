"use client";

import { MAX_BYTES, MAX_POR_TICKET } from "@/lib/adjuntos";

/**
 * Los límites se chequean también acá porque un body grande corta antes de
 * llegar al server action: Next tira la página con "Application error" y la
 * validación del server nunca llega a responder.
 */
export function CapturasInput() {
  return (
    <input
      type="file"
      name="capturas"
      accept="image/png,image/jpeg,image/gif,image/webp"
      multiple
      onChange={(event) => {
        const input = event.currentTarget;
        const archivos = Array.from(input.files ?? []);
        let error = "";
        if (archivos.length > MAX_POR_TICKET) {
          error = `Podés adjuntar hasta ${MAX_POR_TICKET} capturas por pedido`;
        } else if (archivos.some((archivo) => archivo.size > MAX_BYTES)) {
          error = "Cada captura tiene que pesar menos de 3 MB";
        }
        input.setCustomValidity(error);
        input.reportValidity();
      }}
    />
  );
}
