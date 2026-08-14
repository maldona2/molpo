// Tokeniza el markdown inline: **negrita**, `código`, [texto](url), *cursiva*.
// La negrita admite asteriscos sueltos adentro y la cursiva nunca se come un `**`.
export const INLINE_TOKEN_PATTERN =
  /(\*\*(?:[^*]|\*(?!\*))+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*(?!\*)[^*]+\*(?!\*))/g;

export function splitInline(text: string) {
  return text.split(INLINE_TOKEN_PATTERN).filter(Boolean);
}
