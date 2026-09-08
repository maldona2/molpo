// Siembra una vez para toda la corrida y deja las sesiones listas en disco:
// cada test arranca ya logueado en vez de repetir el canje del link.
import { writeFileSync, mkdirSync } from "node:fs";
import { BASE_URL, HOST_APP, TITULOS, sembrar } from "./sembrar.ts";

const ESTADO_DIR = "e2e/.estado";

function guardarSesion(archivo: string, cookie: string): void {
  const [nombre, valor] = cookie.split("=");
  writeFileSync(
    `${ESTADO_DIR}/${archivo}`,
    JSON.stringify({
      cookies: [
        {
          name: nombre,
          value: valor,
          domain: HOST_APP,
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}

export default async function globalSetup(): Promise<void> {
  const semilla = await sembrar();

  // La siembra escribe por SQL y los tests leen por HTTP: si el servidor bajo
  // prueba apunta a otra base, los ids existen de un lado y no del otro y los
  // tests fallan por todos lados menos por el motivo real.
  const respuesta = await fetch(`${BASE_URL}/tablero/${semilla.ticketCompleto}/`, {
    headers: { cookie: semilla.cookieAdmin },
  });
  if (!respuesta.ok || !(await respuesta.text()).includes(TITULOS.completo)) {
    throw new Error(
      "El servidor bajo prueba no ve la siembra: casi seguro está apuntando a otra " +
        "DATABASE_URL. Cerrá el `pnpm dev` que tengas abierto y dejá que Playwright lo levante.",
    );
  }

  mkdirSync(ESTADO_DIR, { recursive: true });
  guardarSesion("admin.json", semilla.cookieAdmin);
  guardarSesion("cliente.json", semilla.cookieCliente);
  writeFileSync(
    `${ESTADO_DIR}/tickets.json`,
    JSON.stringify({
      completo: semilla.ticketCompleto,
      pelado: semilla.ticketPelado,
      ajeno: semilla.ticketAjeno,
    }),
  );
}
