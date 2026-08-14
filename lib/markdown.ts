// Tokeniza el markdown inline: **negrita**, `código`, [texto](url), *cursiva*.
// La negrita admite asteriscos sueltos adentro y la cursiva nunca se come un `**`.
export const INLINE_TOKEN_PATTERN =
  /(\*\*(?:[^*]|\*(?!\*))+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*(?!\*)[^*]+\*(?!\*))/g;

export function splitInline(text: string) {
  return text.split(INLINE_TOKEN_PATTERN).filter(Boolean);
}

export const UNORDERED_ITEM = /^\s*[-+*]\s+(.+)$/;
export const ORDERED_ITEM = /^\s*\d+\.\s+(.+)$/;

export function isTableDivider(line: string) {
  return /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(line);
}

export function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  return (
    /^#{1,3}\s/.test(line) ||
    /^>\s?/.test(line) ||
    /^```/.test(line) ||
    /^([-*_])\1{2,}\s*$/.test(line.trim()) ||
    UNORDERED_ITEM.test(line) ||
    ORDERED_ITEM.test(line) ||
    (line.includes("|") && isTableDivider(next))
  );
}

export const LIST_ITEM = /^(\s*)([-+*]|\d+\.)\s+(.+)$/;

export type MarkdownListItem = { text: string; children: MarkdownList[] };
export type MarkdownList = { ordered: boolean; items: MarkdownListItem[] };

function nextContentLine(lines: string[], index: number) {
  let cursor = index;
  while (cursor < lines.length && !lines[cursor].trim()) cursor += 1;
  return cursor;
}

// Junta una lista completa: pliega las líneas de continuación (el texto que
// sigue envuelto debajo de una viñeta) dentro de su ítem, y anida las viñetas
// más indentadas dentro del ítem que las precede.
export function collectList(lines: string[], start: number) {
  const first = lines[start].match(LIST_ITEM);
  if (!first) return { list: { ordered: false, items: [] } as MarkdownList, index: start };

  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items: MarkdownListItem[] = [];
  let index = start;

  while (index < lines.length) {
    // Una línea en blanco no corta la lista si abajo sigue habiendo ítems.
    const cursor = lines[index].trim() ? index : nextContentLine(lines, index);
    const item = (lines[cursor] ?? "").match(LIST_ITEM);
    if (!item || item[1].length < baseIndent) break;
    index = cursor;

    if (item[1].length > baseIndent) {
      const nested = collectList(lines, index);
      if (items.length) items[items.length - 1].children.push(nested.list);
      index = nested.index;
      continue;
    }

    if (/\d/.test(item[2]) !== ordered) break;

    let text = item[3].trim();
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      text += ` ${lines[index].trim()}`;
      index += 1;
    }
    items.push({ text, children: [] });
  }

  return { list: { ordered, items }, index };
}
