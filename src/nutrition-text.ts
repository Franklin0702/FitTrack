import type { Nutrients } from "./model";

const units: Record<string, keyof Nutrients> = {
  k: "calories",
  p: "protein",
  c: "carbs",
  f: "fat",
  fi: "fiber",
};

/** Read explicit nutrition tokens in prose; never infer nutrition from food names. */
function parseTokens(text: string): Partial<Nutrients> {
  const result: Partial<Nutrients> = {};
  const tokens =
    /([+-]?\s*(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*(fi|k|p|c|f)(?![\p{L}\p{N}_])/giu;
  for (const match of text.matchAll(tokens)) {
    const raw = match[1].trimStart();
    const start = match.index! + match[1].length - raw.length;
    // Do not salvage the tail of an identifier, exponent, or malformed number.
    if (start > 0 && /[\p{L}\p{N}_.+,−-]/u.test(text[start - 1])) continue;
    const value = Number(raw.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) continue;
    const key = units[match[2].toLowerCase()];
    const sum = (result[key] ?? 0) + value;
    if (sum <= 1_000_000) result[key] = Number(sum.toFixed(6));
  }
  return result;
}

export function parseSmartEntry(text: string): { label?: string; nutrients: Partial<Nutrients> } {
  const lines = text.split(/\r\n?|\n/).map(line => line.trim()).filter(Boolean);
  const marked = lines.findIndex(line => /\s+L$/i.test(line));
  // A descriptive first line is an implicit label. Nutrition-only first lines
  // keep their original meaning, including compact one-line entries.
  const implicit = marked < 0 && lines.length > 1 && Object.keys(parseTokens(lines[0])).length === 0;
  const label = marked >= 0 ? lines[marked].replace(/\s+L$/i, '').trim() : implicit ? lines[0] : undefined;
  const body = lines.filter((line, i) => !/\s+L$/i.test(line) && !(implicit && i === 0)).join('\n');
  return { ...(label ? { label: label.slice(0, 100) } : {}), nutrients: parseTokens(body) };
}

export function parseNutritionText(text: string): Partial<Nutrients> {
  return parseSmartEntry(text).nutrients;
}

export function nutritionFromText(text: string): Nutrients {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    ...parseNutritionText(text),
  };
}
