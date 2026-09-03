import { NextResponse } from "next/server";
import { COOKIE_SESION, DIAS_SESION } from "@/lib/sesiones";
import { consumirAcceso, crearSesion } from "@/lib/sesiones-db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/**
 * Consume el link del mail y deja la cookie de sesión. Es un route handler y no
 * una página porque Next sólo permite escribir cookies acá o en un server
 * action. A partir de este punto las URLs no llevan más el token: un link ya
 * usado no sirve aunque lo reenvíen.
 */
/**
 * Location relativo a propósito: `request.url` pierde el subdominio después
 * del rewrite del middleware y mandaría al cliente de app.molpo.ar a
 * molpo.ar/tablero/, que no existe. El navegador resuelve el relativo contra
 * el host que él pidió, que es el correcto.
 */
function irA(destino: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { location: destino } });
}

export async function GET(_request: Request, { params }: Props) {
  const { token } = await params;

  const acceso = await consumirAcceso(token);
  if (!acceso) return irA("/entrar/?expirado=1");

  const sesion = await crearSesion(acceso.rol, acceso.cliente_id);
  const respuesta = irA("/tablero/");
  respuesta.cookies.set(COOKIE_SESION, sesion, {
    httpOnly: true,
    // En local no hay HTTPS y el navegador descartaría la cookie.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DIAS_SESION * 24 * 60 * 60,
  });
  return respuesta;
}
