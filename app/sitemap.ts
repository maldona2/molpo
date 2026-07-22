import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { proyectos } from "@/content/portfolio";
import { serviciosDetalle } from "@/content/services";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${site.url}/`,
      lastModified: new Date("2026-07-21"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/como-trabajamos/`,
      lastModified: new Date("2026-07-21"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/privacidad/`,
      lastModified: new Date("2026-07-22"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...serviciosDetalle.map((servicio) => ({
      url: `${site.url}/servicios/${servicio.slug}/`,
      lastModified: new Date("2026-07-22"),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...proyectos.map((p) => ({
      url: `${site.url}/casos/${p.slug}/`,
      lastModified: new Date("2026-07-21"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
