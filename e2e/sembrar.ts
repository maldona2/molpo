// Siembra la base de pruebas para los tests E2E.
//
// El esquema lo crean los propios módulos del app en su primer uso (ver
// lib/db.ts → ensureSchema), así que acá NO se repite ningún `create table`:
// se le pega al app para que las cree y recién después se insertan las filas.
// Duplicar el DDL sería la forma más rápida de que los tests dejen de probar
// el esquema real.
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

/** El mismo host que exige el middleware para servir el área privada. */
export const HOST_APP = "app.localhost";
/**
 * Node resuelve `*.localhost` al loopback igual que el navegador, así que la
 * siembra pega al mismo host que el middleware exige. No sirve mandar el Host
 * a mano en un header: `fetch` lo ignora por ser un header prohibido, la
 * petición cae en la rama del dominio público y el área privada devuelve 404.
 */
export const BASE_URL = `http://${HOST_APP}:3000`;

export const CLIENTE = "Panadería Sol";
export const OTRO_CLIENTE = "Otra SRL";
export const EMAIL_CLIENTE = "sol@panaderia.test";

/** Títulos sembrados: los specs los buscan por texto, así que viven acá. */
export const TITULOS = {
  completo: "No puedo guardar una factura con descuento",
  pelado: "Sumar un filtro por fecha",
  ajeno: "Secreto de otro cliente",
} as const;

/** PNG de 1x1 transparente: alcanza para que detectarTipoImagen lo acepte. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function pegarle(ruta: string, cookie?: string): Promise<Response> {
  return fetch(`${BASE_URL}${ruta}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
}

/** Canjea un link de acceso por la cookie de sesión, como haría el navegador. */
async function cookieDeSesion(sql: postgres.Sql, rol: string, clienteId: number | null) {
  const token = randomBytes(32).toString("hex");
  await sql`
    insert into accesos (token_hash, email, rol, cliente_id, expira)
    values (${hash(token)}, ${"e2e@molpo.test"}, ${rol}, ${clienteId}, ${new Date(Date.now() + 900_000)})
  `;
  const respuesta = await pegarle(`/entrar/${token}/`);
  const cookie = respuesta.headers.getSetCookie().find((c) => c.startsWith("molpo_sesion="));
  if (!cookie) throw new Error(`No se pudo abrir sesión de ${rol}: ${respuesta.status}`);
  return cookie.split(";")[0];
}

export type Semilla = {
  cookieAdmin: string;
  cookieCliente: string;
  ticketCompleto: number;
  ticketPelado: number;
  ticketAjeno: number;
};

/**
 * Un ticket recién hecho, para el test que va a escribirle encima. Compartir
 * filas entre tests que mutan las deja dependientes del orden.
 */
export async function altaTicket(datos: Record<string, unknown>): Promise<number> {
  const sql = postgres(process.env.DATABASE_URL ?? "", { ssl: "prefer" });
  try {
    const [fila] = await sql<{ id: number }[]>`
      insert into tickets ${sql({ cliente: CLIENTE, tipo: "mejora", prioridad: "baja", estado: "abierto", detalle: "Sembrado por un test.", ...datos })}
      returning id
    `;
    return fila.id;
  } finally {
    await sql.end();
  }
}

export async function sembrar(): Promise<Semilla> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL: los tests E2E necesitan la base local de pruebas");
  // Guardarraíl: un descuido de env no puede vaciar la base de producción.
  if (!/molpo_soporte_test/.test(url)) {
    throw new Error(`DATABASE_URL no apunta a la base de pruebas: ${url.replace(/\/\/.*@/, "//***@")}`);
  }

  const sql = postgres(url, { ssl: "prefer" });
  try {
    // `/adjuntos/1` con una cookie cualquiera hace que el app lea la sesión, y
    // eso crea clientes + accesos + sesiones antes de devolver 404.
    await pegarle("/adjuntos/1", "molpo_sesion=inexistente");
    await sql`truncate table accesos, sesiones, adjuntos, tickets, clientes restart identity cascade`;

    const [cliente] = await sql<{ id: number }[]>`
      insert into clientes (token, nombre, email)
      values (${randomBytes(8).toString("hex")}, ${CLIENTE}, ${EMAIL_CLIENTE})
      returning id
    `;
    await sql`
      insert into clientes (token, nombre, email)
      values (${randomBytes(8).toString("hex")}, ${OTRO_CLIENTE}, ${"otro@otra.test"})
    `;

    const cookieAdmin = await cookieDeSesion(sql, "admin", null);
    const cookieCliente = await cookieDeSesion(sql, "cliente", cliente.id);
    // `/tablero/` con sesión válida crea tickets + adjuntos.
    await pegarle("/tablero/", cookieAdmin);

    const alta = async (datos: Record<string, unknown>) => {
      const [fila] = await sql<{ id: number }[]>`
        insert into tickets ${sql(datos)} returning id
      `;
      return fila.id;
    };

    // Con todo lleno: es el que prueba que el detalle muestra cada campo.
    const ticketCompleto = await alta({
      cliente: CLIENTE,
      tipo: "bug",
      prioridad: "alta",
      estado: "abierto",
      titulo: TITULOS.completo,
      detalle: "Cargo el descuento y al guardar salta un error.\n\nSegunda línea del detalle.",
      url: "Facturación → Nueva",
      reporta: "Ana",
      email: EMAIL_CLIENTE,
      respuesta: "Lo estamos mirando.",
    });
    // Pelado: sin url, sin reporta, sin respuesta y sin capturas.
    const ticketPelado = await alta({
      cliente: CLIENTE,
      tipo: "mejora",
      prioridad: "baja",
      estado: "abierto",
      titulo: TITULOS.pelado,
      detalle: "Estaría bueno filtrar por mes.",
      email: EMAIL_CLIENTE,
    });
    // De otro cliente: el que no tiene que poder ver el cliente logueado.
    const ticketAjeno = await alta({
      cliente: OTRO_CLIENTE,
      tipo: "bug",
      prioridad: "media",
      estado: "en_curso",
      titulo: TITULOS.ajeno,
      detalle: "Esto no lo tiene que ver Panadería Sol.",
    });

    await sql`
      insert into adjuntos (ticket_id, nombre, tipo, bytes)
      values (${ticketCompleto}, ${"pantalla.png"}, ${"image/png"}, ${PNG_1X1})
    `;

    return { cookieAdmin, cookieCliente, ticketCompleto, ticketPelado, ticketAjeno };
  } finally {
    await sql.end();
  }
}
