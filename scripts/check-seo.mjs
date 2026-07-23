import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const origin = "https://molpo.ar";
const failures = [];

async function getRoutes() {
  const fixedRoutes = ["/", "/como-trabajamos/", "/privacidad/"];
  try {
    const caseEntries = await readdir(resolve("out", "casos"), { withFileTypes: true });
    const serviceEntries = await readdir(resolve("out", "servicios"), { withFileTypes: true });
    const caseRoutes = caseEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => `/casos/${entry.name}/`)
      .sort();
    const serviceRoutes = serviceEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => `/servicios/${entry.name}/`)
      .sort();
    expect(caseRoutes.length > 0, "No se exportó ningún caso");
    expect(serviceRoutes.length === 3, `Deben exportarse 3 servicios y se exportaron ${serviceRoutes.length}`);
    return [...fixedRoutes, ...caseRoutes, ...serviceRoutes];
  } catch {
    failures.push("Falta el directorio exportado de casos o servicios");
    return fixedRoutes;
  }
}

async function readOutput(path) {
  try {
    return await readFile(resolve("out", path), "utf8");
  } catch {
    failures.push(`Falta el archivo exportado: out/${path}`);
    return "";
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function getAttribute(html, tagPattern, attribute) {
  const tag = html.match(tagPattern)?.[0];
  return tag?.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"))?.[1];
}

const routes = await getRoutes();

for (const route of routes) {
  const outputPath = route === "/" ? "index.html" : `${route.slice(1)}index.html`;
  const html = await readOutput(outputPath);
  const expectedUrl = `${origin}${route}`;

  if (!html) continue;

  const canonical = getAttribute(html, /<link\b[^>]*rel=["']canonical["'][^>]*>/i, "href");
  const openGraphUrl = getAttribute(html, /<meta\b[^>]*property=["']og:url["'][^>]*>/i, "content");

  expect(canonical === expectedUrl, `${route}: canonical esperado ${expectedUrl}, recibido ${canonical ?? "ninguno"}`);
  expect(openGraphUrl === expectedUrl, `${route}: og:url esperado ${expectedUrl}, recibido ${openGraphUrl ?? "ninguno"}`);
  expect(!/https?:\/\/(?:www\.)?molpo\.com(?!\.ar)/i.test(html), `${route}: contiene una URL del dominio molpo.com`);
  expect(!/https?:\/\/(?:www\.)?molpo\.com\.ar/i.test(html), `${route}: contiene una URL del dominio anterior molpo.com.ar`);
  expect(!/https?:\/\/(?!molpo\.ar)(?:[^/"'\s]+)/i.test(canonical ?? ""), `${route}: canonical usa un host inesperado`);
}

const robots = await readOutput("robots.txt");
expect(robots.includes(`Host: ${origin}`), `robots.txt no declara Host: ${origin}`);
expect(robots.includes(`Sitemap: ${origin}/sitemap.xml`), "robots.txt referencia un sitemap incorrecto");

const sitemap = await readOutput("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedUrls = routes.map((route) => `${origin}${route}`);
expect(sitemapUrls.length === expectedUrls.length, `sitemap.xml debe contener ${expectedUrls.length} URLs y contiene ${sitemapUrls.length}`);

for (const expectedUrl of expectedUrls) {
  expect(sitemapUrls.includes(expectedUrl), `sitemap.xml no contiene ${expectedUrl}`);
}

for (const url of sitemapUrls) {
  expect(url.startsWith(`${origin}/`), `sitemap.xml contiene un host inesperado: ${url}`);
}

if (failures.length > 0) {
  console.error("La verificación SEO falló:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SEO correcto: ${routes.length} rutas canónicas bajo ${origin}`);
