// Lógica del tablero. Sin acceso a base: lo testeable vive acá.
// La extensión explícita la exige node al correr los tests con type stripping.
import {
  ESTADOS,
  PRIORIDADES,
  TIPOS,
  type Estado,
  type Prioridad,
  type Ticket,
  type Tipo,
} from "./tickets.ts";

/** Columnas del tablero, en el orden en que se leen. */
export const COLUMNAS: readonly Estado[] = ESTADOS;

export function agruparPorEstado(tickets: Ticket[]): Record<Estado, Ticket[]> {
  const columnas = Object.fromEntries(ESTADOS.map((e) => [e, [] as Ticket[]])) as Record<
    Estado,
    Ticket[]
  >;
  for (const ticket of tickets) columnas[ticket.estado].push(ticket);
  return columnas;
}

/** Lo que el client component necesita de cada pedido. Fechas en ms: viajan del server sin ambigüedad. */
export type TarjetaTablero = {
  id: number;
  titulo: string;
  tipo: Tipo;
  prioridad: Prioridad;
  estado: Estado;
  cliente: string;
  reporta: string | null;
  email: string | null;
  url: string | null;
  detalle: string;
  respuesta: string | null;
  creado: number;
  actividad: number;
  adjuntos: { id: number; nombre: string }[];
  /** Link al Hub ya saneado (hrefSeguro), o null si el pedido es propio. */
  externa: string | null;
};

export const DIA_MS = 86_400_000;
export const DIAS_ESTANCADO = 7;

export const ATAJOS = ["sin_respuesta", "estancados", "capturas", "komuk"] as const;
export type Atajo = (typeof ATAJOS)[number];
/** El cliente no responde ni ve tickets del Hub: estos atajos no son para él. */
export const ATAJOS_ADMIN: readonly Atajo[] = ["sin_respuesta", "komuk"];
export const ETIQUETAS_ATAJO: Record<Atajo, string> = {
  sin_respuesta: "Sin respuesta",
  estancados: "Sin movimiento +7 d",
  capturas: "Con capturas",
  komuk: "KOMUK Hub",
};

export const ORDENES = ["prioridad", "actividad", "nuevos", "viejos"] as const;
export type Orden = (typeof ORDENES)[number];
export const ETIQUETAS_ORDEN: Record<Orden, string> = {
  prioridad: "Prioridad",
  actividad: "Última actividad",
  nuevos: "Más nuevos",
  viejos: "Más viejos",
};

export const VISTAS = ["tablero", "lista"] as const;
export type Vista = (typeof VISTAS)[number];

export type Filtros = {
  q: string;
  clientes: string[];
  tipos: Tipo[];
  prioridades: Prioridad[];
  atajos: Atajo[];
  orden: Orden;
  vista: Vista;
};

export const FILTROS_INICIALES: Filtros = {
  q: "",
  clientes: [],
  tipos: [],
  prioridades: [],
  atajos: [],
  orden: "prioridad",
  vista: "tablero",
};

export function diasDesde(ms: number, ahora: number): number {
  return Math.max(0, Math.floor((ahora - ms) / DIA_MS));
}

export function edad(dias: number): string {
  return dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} d`;
}

export function vivo(t: { estado: Estado }): boolean {
  return t.estado === "abierto" || t.estado === "en_curso";
}

export function estancado(t: { estado: Estado; actividad: number }, ahora: number): boolean {
  return vivo(t) && diasDesde(t.actividad, ahora) >= DIAS_ESTANCADO;
}

export function cumpleAtajo(atajo: Atajo, t: TarjetaTablero, ahora: number): boolean {
  switch (atajo) {
    case "sin_respuesta":
      return !t.respuesta && vivo(t);
    case "estancados":
      return estancado(t, ahora);
    case "capturas":
      return t.adjuntos.length > 0;
    case "komuk":
      return t.externa !== null;
  }
}

/** Sin tildes ni mayúsculas: "caneria" tiene que encontrar "Cañería". */
const plano = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function coincide(t: TarjetaTablero, q: string): boolean {
  if (!q) return true;
  const id = q.replace(/^#/, "");
  if (/^\d+$/.test(id) && String(t.id).startsWith(id)) return true;
  return [t.titulo, t.cliente, t.reporta ?? ""].some((campo) => plano(campo).includes(q));
}

const RANGO_PRIORIDAD: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

const COMPARAR: Record<Orden, (a: TarjetaTablero, b: TarjetaTablero) => number> = {
  prioridad: (a, b) => RANGO_PRIORIDAD[a.prioridad] - RANGO_PRIORIDAD[b.prioridad] || b.creado - a.creado,
  actividad: (a, b) => b.actividad - a.actividad,
  nuevos: (a, b) => b.creado - a.creado,
  viejos: (a, b) => a.creado - b.creado,
};

const atajosDelRol = (f: Filtros, esAdmin: boolean) =>
  f.atajos.filter((a) => esAdmin || !ATAJOS_ADMIN.includes(a));

/** Y entre grupos, O dentro de cada grupo. Devuelve una lista nueva, ya ordenada. */
export function filtrar(
  tickets: TarjetaTablero[],
  f: Filtros,
  esAdmin: boolean,
  ahora: number,
): TarjetaTablero[] {
  const q = plano(f.q.trim());
  const atajos = atajosDelRol(f, esAdmin);
  return tickets
    .filter(
      (t) =>
        coincide(t, q) &&
        (!esAdmin || f.clientes.length === 0 || f.clientes.includes(t.cliente)) &&
        (f.tipos.length === 0 || f.tipos.includes(t.tipo)) &&
        (f.prioridades.length === 0 || f.prioridades.includes(t.prioridad)) &&
        atajos.every((a) => cumpleAtajo(a, t, ahora)),
    )
    .sort(COMPARAR[f.orden]);
}

export function hayFiltros(f: Filtros, esAdmin: boolean): boolean {
  return (
    f.q.trim() !== "" ||
    (esAdmin && f.clientes.length > 0) ||
    f.tipos.length > 0 ||
    f.prioridades.length > 0 ||
    atajosDelRol(f, esAdmin).length > 0
  );
}

/** El orden en que j/k y anterior/siguiente recorren los pedidos: el que se ve en pantalla. */
export function ordenNavegacion(
  visibles: TarjetaTablero[],
  vista: Vista,
  colapsadas: Partial<Record<Estado, boolean>>,
): number[] {
  if (vista === "lista") return visibles.map((t) => t.id);
  return COLUMNAS.flatMap((e) => (colapsadas[e] ? [] : visibles.filter((t) => t.estado === e))).map(
    (t) => t.id,
  );
}

type Query = Record<string, string | string[] | undefined>;

const valores = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

function validos<T extends string>(permitidos: readonly T[], v: string | string[] | undefined): T[] {
  return [...new Set(valores(v))].filter((x): x is T => (permitidos as readonly string[]).includes(x));
}

/** Lo que venga en la URL se valida: un link viejo o editado a mano no rompe el tablero. */
export function filtrosDesdeQuery(query: Query): Filtros {
  const [orden] = validos(ORDENES, query.orden);
  const [vista] = validos(VISTAS, query.vista);
  return {
    q: (valores(query.q)[0] ?? "").slice(0, 200),
    clientes: [...new Set(valores(query.cliente))],
    tipos: validos(TIPOS, query.tipo),
    prioridades: validos(PRIORIDADES, query.prio),
    atajos: validos(ATAJOS, query.atajo),
    orden: orden ?? FILTROS_INICIALES.orden,
    vista: vista ?? FILTROS_INICIALES.vista,
  };
}

/** Claves repetidas y no separadas por coma: un cliente puede llamarse "Pérez, Juan SRL". */
export function filtrosAQuery(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  for (const c of f.clientes) p.append("cliente", c);
  for (const t of f.tipos) p.append("tipo", t);
  for (const x of f.prioridades) p.append("prio", x);
  for (const a of f.atajos) p.append("atajo", a);
  if (f.orden !== FILTROS_INICIALES.orden) p.set("orden", f.orden);
  if (f.vista !== FILTROS_INICIALES.vista) p.set("vista", f.vista);
  return p.toString();
}

export function textoSync(ultima: number | null, ahora: number): string {
  if (ultima === null) return "nunca sincronizado";
  const min = Math.floor((ahora - ultima) / 60_000);
  if (min < 1) return "sincronizado recién";
  if (min < 60) return `sincronizado hace ${min} min`;
  if (min < 24 * 60) return `sincronizado hace ${Math.floor(min / 60)} h`;
  return `sincronizado hace ${Math.floor(min / (24 * 60))} d`;
}
