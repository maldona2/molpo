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

1. Mantener `molpo.ar` como dominio principal y canónico.
2. Asociar `molpo.ar` al servicio de Railway para que el origen reconozca el host.
3. Configurar `www.molpo.ar` en Cloudflare para responder con 301 hacia
   `https://molpo.ar`, conservando ruta y query string.
4. Redirigir `molpo.com.ar` y `www.molpo.com.ar` con 301 hacia el mismo path en
   `https://molpo.ar` durante la migración.
5. Mantener ambas zonas en Search Console y conservar los redirects al menos
   doce meses.
6. Verificar raíz, variantes `www`, HTTP y HTTPS antes de activar HSTS.

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

1. Crear la propiedad de dominio `molpo.ar` y conservar la de `molpo.com.ar`.
2. Agregar y conservar el TXT de verificación en DNS.
3. Enviar `https://molpo.ar/sitemap.xml`.
4. Inspeccionar la home, metodología, privacidad y cada caso publicado.
5. Usar la herramienta de cambio de dirección si Search Console la ofrece para
   ambas propiedades.
