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

const TECHNICAL_EMPTY_VALUE = /^(?:other\s*:\s*)?(?:unresolved|unknown|n\/a|none|null)$/i;

const normalizeVariantText = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized || normalized === "[object Object]") return null;

  const parts = normalized
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const colorNamePart = parts.find((part) => /^color\s*name\s*:/i.test(part));
  const colorPart = parts.find((part) => /^color\s*:/i.test(part));
  const candidatePart = colorNamePart ?? colorPart;

  if (candidatePart) {
    const candidate = candidatePart.replace(/^color(?:\s*name)?\s*:\s*/i, "").trim();
    return candidate && !TECHNICAL_EMPTY_VALUE.test(candidate) ? candidate : null;
  }

  if (
    TECHNICAL_EMPTY_VALUE.test(normalized) ||
    /^g4\s+provider\s+model\b/i.test(normalized) ||
    /^g4_[a-z0-9_]+$/i.test(normalized)
  ) {
    return null;
  }

  return normalized;
};

/**
 * Normalizes the provider/public variant label without coercing objects to
 * "[object Object]". Unknown object shapes intentionally return null so the
 * caller can use its existing neutral fallback instead of inventing a label.
 */
export function normalizeProductVariantLabel(value: unknown, depth = 0, seen = new Set<object>()): string | null {
  if (depth > 4 || value === null || value === undefined) return null;

  if (typeof value === "string") {
    return normalizeVariantText(value);
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

/**
 * Returns only a readable commercial model name. Technical provider labels
 * intentionally return null so callers can use a neutral existing fallback.
 */
export function normalizeProductCommercialName(value: unknown): string | null {
  const normalized = normalizeProductVariantLabel(value);
  if (!normalized) return null;
  if (/^g4\s+provider\s+model\b/i.test(normalized) || /^g4_[a-z0-9_]+$/i.test(normalized)) {
    return null;
  }
  return normalized;
}
