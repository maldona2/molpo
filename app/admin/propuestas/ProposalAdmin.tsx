"use client";

import {
  Fragment,
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./Propuestas.module.css";

const TEMPORARY_PASSWORD = "molpo-admin-2026";
const ACCESS_KEY = "molpo-proposals-access";
const DRAFT_KEY = "molpo-proposals-draft-v1";

type ProposalMeta = {
  cliente: string;
  proyecto: string;
  titulo: string;
  descripcion: string;
  version: string;
  tipo: string;
};

type ProposalDraft = {
  meta: ProposalMeta;
  markdown: string;
};

const DEFAULT_DRAFT: ProposalDraft = {
  meta: {
    cliente: "Empresa · Persona de contacto",
    proyecto: "Nombre del proyecto",
    titulo: "Propuesta técnica",
    descripcion:
      "Una descripción breve del desafío, la solución propuesta y el resultado esperado.",
    version: "1.0 — 2026",
    tipo: "Documento técnico",
  },
  markdown: `# Objetivo de la propuesta

Esta propuesta describe el alcance del proyecto, la solución recomendada y las etapas necesarias para implementarla.

## Situación actual

La operación actual depende de procesos manuales y herramientas desconectadas.

> **Oportunidad**
> Centralizar la información permite reducir tareas repetitivas y tomar mejores decisiones.

## Solución propuesta

- Una plataforma simple y adaptada al negocio.
- Integraciones con las herramientas existentes.
- Una base preparada para sumar nuevas funciones.

## Alcance

| Entregable | Descripción |
| --- | --- |
| Descubrimiento | Relevamiento y definición del alcance. |
| Implementación | Desarrollo, validación y puesta en marcha. |
| Acompañamiento | Capacitación y soporte inicial. |

## Próximos pasos

1. Confirmar el alcance.
2. Definir responsables y fechas.
3. Iniciar la etapa de descubrimiento.`,
};

function parseFrontmatter(source: string): ProposalDraft {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { meta: DEFAULT_DRAFT.meta, markdown: normalized.trim() };
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return { meta: DEFAULT_DRAFT.meta, markdown: normalized.trim() };
  }

  const entries = normalized
    .slice(4, closingIndex)
    .split("\n")
    .reduce<Partial<ProposalMeta>>((result, line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return result;

      const key = line.slice(0, separator).trim() as keyof ProposalMeta;
      if (!(key in DEFAULT_DRAFT.meta)) return result;

      const rawValue = line.slice(separator + 1).trim();
      result[key] = rawValue.replace(/^["']|["']$/g, "");
      return result;
    }, {});

  return {
    meta: { ...DEFAULT_DRAFT.meta, ...entries },
    markdown: normalized.slice(closingIndex + 5).trim(),
  };
}

function serializeDraft({ meta, markdown }: ProposalDraft) {
  const safe = (value: string) => JSON.stringify(value.trim());
  return `---
cliente: ${safe(meta.cliente)}
proyecto: ${safe(meta.proyecto)}
titulo: ${safe(meta.titulo)}
descripcion: ${safe(meta.descripcion)}
version: ${safe(meta.version)}
tipo: ${safe(meta.tipo)}
---

${markdown.trim()}
`;
}

function safeHref(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : "#";
  } catch {
    return "#";
  }
}

function inlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;

  return text
    .split(tokenPattern)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={key}>{part.slice(1, -1)}</code>;
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        return (
          <a key={key} href={safeHref(link[2])} rel="noreferrer">
            {link[1]}
          </a>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={key}>{part.slice(1, -1)}</em>;
      }
      return <Fragment key={key}>{part}</Fragment>;
    });
}

function isTableDivider(line: string) {
  return /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(line);
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  return (
    /^#{1,3}\s/.test(line) ||
    /^>\s?/.test(line) ||
    /^```/.test(line) ||
    /^([-*_])\1{2,}\s*$/.test(line.trim()) ||
    /^[-+*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    (line.includes("|") && isTableDivider(next))
  );
}

function MarkdownDocument({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let section = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (level <= 2) section += 1;
      const content = inlineMarkdown(heading[2], `heading-${index}`);
      if (level <= 2) {
        blocks.push(
          <section className={styles.sectionHeading} key={`heading-${index}`}>
            <span>Sección {section}</span>
            <h2>{content}</h2>
          </section>,
        );
      } else {
        blocks.push(<h3 key={`heading-${index}`}>{content}</h3>);
      }
      index += 1;
      continue;
    }

    if (/^([-*_])\1{2,}\s*$/.test(line.trim())) {
      blocks.push(<hr key={`hr-${index}`} />);
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${index}`} data-language={language || undefined}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`}>
          {quote.map((item, quoteIndex) => (
            <p key={`quote-${index}-${quoteIndex}`}>
              {inlineMarkdown(item, `quote-${index}-${quoteIndex}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] ?? "")) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div className={styles.tableWrap} key={`table-${index}`}>
          <table>
            <thead>
              <tr>
                {headers.map((header, cellIndex) => (
                  <th key={`header-${cellIndex}`}>
                    {inlineMarkdown(header, `table-header-${cellIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {headers.map((_, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>
                      {inlineMarkdown(
                        row[cellIndex] ?? "",
                        `table-cell-${rowIndex}-${cellIndex}`,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const unordered = line.match(/^[-+*]\s+(.+)$/);
    if (unordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^[-+*]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push(
        <ul key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`}>
              {inlineMarkdown(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\d+\.\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push(
        <ol key={`ordered-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`ordered-item-${itemIndex}`}>
              {inlineMarkdown(item, `ordered-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`}>
        {inlineMarkdown(paragraph.join(" "), `paragraph-${index}`)}
      </p>,
    );
  }

  return <>{blocks}</>;
}

function Cover({ meta }: { meta: ProposalMeta }) {
  return (
    <section className={styles.cover}>
      <div className={styles.coverGlow} aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/molpo-blanco.png" alt="molpo" className={styles.coverLogo} />
      <p className={styles.coverType}>{meta.tipo}</p>
      <div className={styles.coverContent}>
        <p className={styles.coverProject}>{meta.proyecto}</p>
        <h1>{meta.titulo}</h1>
        <p className={styles.coverDescription}>{meta.descripcion}</p>
        <dl className={styles.coverMeta}>
          <div>
            <dt>Cliente</dt>
            <dd>{meta.cliente}</dd>
          </div>
          <div>
            <dt>Autor</dt>
            <dd>Matías Maldonado · molpo</dd>
          </div>
          <div>
            <dt>Versión</dt>
            <dd>{meta.version}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.coverFooter}>
        <span>molpo · Software construido sobre bases sólidas</span>
        <span>{meta.tipo} · Confidencial</span>
      </div>
    </section>
  );
}

function ProposalPreview({ draft }: { draft: ProposalDraft }) {
  return (
    <div id="proposal-print-area" className={styles.printArea}>
      <Cover meta={draft.meta} />
      <article className={styles.document}>
        <MarkdownDocument source={draft.markdown} />
        <footer className={styles.documentFooter}>
          <span>molpo · Software construido sobre bases sólidas</span>
          <span>{draft.meta.proyecto} · Confidencial</span>
        </footer>
      </article>
    </div>
  );
}

export default function ProposalAdmin() {
  const [authorized, setAuthorized] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [draft, setDraft] = useState<ProposalDraft>(DEFAULT_DRAFT);
  const [saved, setSaved] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function requestAccess() {
    const password = window.prompt("Contraseña de administrador");
    if (password === TEMPORARY_PASSWORD) {
      window.sessionStorage.setItem(ACCESS_KEY, "granted");
      setAuthorized(true);
      return;
    }
    if (password !== null) window.alert("Contraseña incorrecta.");
  }

  useEffect(() => {
    document.body.dataset.proposalAdmin = "true";
    const hasAccess = window.sessionStorage.getItem(ACCESS_KEY) === "granted";
    setAuthorized(hasAccess);
    setAccessChecked(true);
    if (!hasAccess) requestAccess();

    const storedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (storedDraft) {
      try {
        setDraft(JSON.parse(storedDraft) as ProposalDraft);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }

    return () => {
      delete document.body.dataset.proposalAdmin;
    };
  }, []);

  useEffect(() => {
    if (!accessChecked) return;
    setSaved(false);
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSaved(true);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [accessChecked, draft]);

  function updateMeta(field: keyof ProposalMeta, value: string) {
    setDraft((current) => ({
      ...current,
      meta: { ...current.meta, [field]: value },
    }));
  }

  async function importMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const source = await file.text();
    setDraft(parseFrontmatter(source));
    event.target.value = "";
  }

  function downloadMarkdown() {
    const blob = new Blob([serializeDraft(draft)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = draft.meta.proyecto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.href = url;
    link.download = `${filename || "propuesta"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetDraft() {
    if (!window.confirm("¿Querés reemplazar el borrador actual por la plantilla inicial?")) return;
    setDraft(DEFAULT_DRAFT);
  }

  function signOut() {
    window.sessionStorage.removeItem(ACCESS_KEY);
    setAuthorized(false);
  }

  if (!accessChecked) return null;

  if (!authorized) {
    return (
      <main className={styles.lockScreen}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/molpo-blanco.png" alt="molpo" />
        <div>
          <p>Área privada</p>
          <h1>Generador de propuestas</h1>
          <button type="button" onClick={requestAccess}>
            Ingresar
          </button>
          <a href="/">Volver al sitio</a>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.admin}>
      <header className={styles.toolbar}>
        <a href="/" className={styles.brand} aria-label="Volver a molpo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/molpo-negro.png" alt="molpo" />
        </a>
        <div className={styles.toolbarTitle}>
          <strong>Propuestas</strong>
          <span>{saved ? "Borrador guardado" : "Guardando…"}</span>
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.secondaryButton} onClick={downloadMarkdown}>
            Descargar MD
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => window.print()}>
            Generar PDF
          </button>
          <button type="button" className={styles.iconButton} onClick={signOut}>
            Salir
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.editor}>
          <div className={styles.editorIntro}>
            <div>
              <p className={styles.eyebrow}>Plantilla molpo</p>
              <h1>Nueva propuesta</h1>
            </div>
            <button type="button" className={styles.textButton} onClick={resetDraft}>
              Restablecer
            </button>
          </div>

          <div className={styles.uploadBox}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,text/markdown,text/plain"
              onChange={importMarkdown}
              hidden
            />
            <div>
              <strong>Importar Markdown</strong>
              <span>Se aceptan archivos .md con frontmatter.</span>
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Elegir archivo
            </button>
          </div>

          <section className={styles.formSection}>
            <div className={styles.sectionTitle}>
              <span>01</span>
              <h2>Datos de portada</h2>
            </div>
            <label>
              Tipo de documento
              <input
                value={draft.meta.tipo}
                onChange={(event) => updateMeta("tipo", event.target.value)}
              />
            </label>
            <label>
              Proyecto
              <input
                value={draft.meta.proyecto}
                onChange={(event) => updateMeta("proyecto", event.target.value)}
              />
            </label>
            <label>
              Título
              <input
                value={draft.meta.titulo}
                onChange={(event) => updateMeta("titulo", event.target.value)}
              />
            </label>
            <label>
              Descripción
              <textarea
                rows={4}
                value={draft.meta.descripcion}
                onChange={(event) => updateMeta("descripcion", event.target.value)}
              />
            </label>
            <div className={styles.fieldGrid}>
              <label>
                Cliente
                <input
                  value={draft.meta.cliente}
                  onChange={(event) => updateMeta("cliente", event.target.value)}
                />
              </label>
              <label>
                Versión
                <input
                  value={draft.meta.version}
                  onChange={(event) => updateMeta("version", event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionTitle}>
              <span>02</span>
              <h2>Contenido</h2>
            </div>
            <label>
              Markdown
              <textarea
                className={styles.markdownEditor}
                value={draft.markdown}
                spellCheck
                onChange={(event) =>
                  setDraft((current) => ({ ...current, markdown: event.target.value }))
                }
              />
            </label>
            <p className={styles.help}>
              Admite títulos, listas, tablas, citas, links, negritas y bloques de código.
            </p>
          </section>
        </aside>

        <section className={styles.previewPanel} aria-label="Vista previa de la propuesta">
          <div className={styles.previewHeader}>
            <span>Vista previa</span>
            <span>A4 · {draft.meta.tipo}</span>
          </div>
          <ProposalPreview draft={draft} />
        </section>
      </div>
    </main>
  );
}
