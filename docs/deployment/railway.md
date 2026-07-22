# Publicación de molpo en Railway

## Build y medición

- Build: `pnpm build`
- Directorio estático: `out`
- Variable opcional: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...`

La variable de GA4 se incorpora durante el build. Cambiarla requiere un nuevo
deploy. Sin esa variable, no se muestra consentimiento y Google Analytics no se
carga.

Si Railway ejecuta `serve` para publicar `out`, el archivo `public/serve.json`
se copia al export y agrega los headers de seguridad. Validar el comando real de
inicio en Railway antes del deploy.

## Dominios

1. Mantener `molpo.com.ar` como dominio principal.
2. Agregar `www.molpo.com.ar` al mismo servicio para que Railway emita SSL.
3. Crear en DNS el registro indicado por Railway.
4. Configurar `www` para responder con 301 hacia `https://molpo.com.ar`.
5. Verificar raíz, `www`, HTTP y HTTPS antes de activar HSTS.

## Headers

`serve.json` incorpora una CSP en modo `Report-Only`, Referrer Policy,
Permissions Policy, protección MIME y bloqueo de iframes. La CSP permite sólo
los orígenes necesarios para el sitio y GA4.

Después de navegar todas las páginas con GA4 aceptado y rechazado, revisar que
no existan recursos legítimos bloqueados. Recién entonces:

1. cambiar `Content-Security-Policy-Report-Only` por
   `Content-Security-Policy`;
2. añadir `upgrade-insecure-requests` a la CSP obligatoria;
3. agregar `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
4. desplegar y comprobar los headers con `curl -I`.

No agregar `preload` a HSTS durante esta primera activación: su reversión no es
inmediata.

## Search Console

1. Crear la propiedad de dominio `molpo.com.ar`.
2. Agregar y conservar el TXT de verificación en DNS.
3. Enviar `https://molpo.com.ar/sitemap.xml`.
4. Inspeccionar la home, metodología, privacidad y cada caso publicado.
