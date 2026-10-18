const LABEL_KEYS = [
  "name",
  "label",
  "value",
  "color_nombre",
  "color",
  "nombre",
  "variant_value",
  "variant",
  "title",
  "text",
] as const;

/**
 * Normalizes the provider/public variant label without coercing objects to
 * "[object Object]". Unknown object shapes intentionally return null so the
 * caller can use its existing neutral fallback instead of inventing a label.
 */
export function normalizeProductVariantLabel(value: unknown, depth = 0, seen = new Set<object>()): string | null {
  if (depth > 4 || value === null || value === undefined) return null;

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeProductVariantLabel(item, depth + 1, seen);
      if (normalized) return normalized;
    }
    return null;
  }

  if (typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of LABEL_KEYS) {
    if (!(key in record)) continue;
    const normalized = normalizeProductVariantLabel(record[key], depth + 1, seen);
    if (normalized) return normalized;
  }

  return null;
}
