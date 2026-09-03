import { NextResponse, type NextRequest } from "next/server";

/**
 * Un solo servicio sirve los dos dominios y el hostname decide qué se ve:
 * `app.molpo.ar` sólo el área privada, `molpo.ar` sólo el sitio público.
 *
 * A propósito no hay rewrite de por medio: las rutas privadas viven en la raíz
 * y acá sólo se bloquean donde no corresponden. Con un prefijo interno la URL
 * del navegador y la ruta real no coinciden, y el router de cliente de Next
 * tira 404 después de cada redirect de un server action.
 *
 * En local, `app.localhost:3000` hace de app.molpo.ar sin tocar /etc/hosts.
 */
const RUTAS_PRIVADAS = [
  "/entrar",
  "/tablero",
  "/pedidos",
  "/clientes",
  "/opiniones",
  "/opinar",
];

/** Se sirven en los dos hosts: las capturas se ven desde el tablero. */
const COMPARTIDAS = ["/adjuntos"];

function esHostDeApp(host: string): boolean {
  const sinPuerto = host.split(":")[0].toLowerCase();
  return sinPuerto === "app.molpo.ar" || sinPuerto === "app.localhost";
}

function empiezaCon(pathname: string, rutas: string[]): boolean {
  return rutas.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (esHostDeApp(host)) {
    if (empiezaCon(pathname, COMPARTIDAS)) return NextResponse.next();
    // El subdominio no tiene home propia: entra directo al tablero.
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/tablero/", request.url));
    }
    // El sitio público no se sirve acá: una sola URL por página.
    if (!empiezaCon(pathname, RUTAS_PRIVADAS)) {
      return new NextResponse("No encontrado", { status: 404 });
    }
    return NextResponse.next();
  }

  // En el dominio público el área privada no existe.
  if (empiezaCon(pathname, RUTAS_PRIVADAS)) {
    return new NextResponse("No encontrado", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  // Los assets y las rutas internas de Next no pasan por acá.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|fonts).*)"],
};
