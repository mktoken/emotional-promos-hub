// Helper compartido para normalizar imágenes de productos desde múltiples formatos
// posibles (array de strings, array de objetos, objeto único, JSON serializado, etc.)
//
// No usa `any`. Mantiene tipos locales estrechos.

type ImageObject = Record<string, unknown>;

const URL_FIELDS = [
  "url",
  "image_url",
  "src",
  "imagen",
  "imagen_url",
  "thumbnail",
  "thumbnail_url",
  "original",
  "original_url",
] as const;

const PRIMARY_HINTS = ["principal", "main", "primary", "cover", "portada"];
const SECONDARY_HINTS = ["ambientada", "adicional", "adicionales", "alt", "detalle", "detail"];

const isHttpUrl = (v: unknown): v is string =>
  typeof v === "string" && /^https?:\/\//i.test(v.trim());

const cleanUrl = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return isHttpUrl(trimmed) ? trimmed : null;
};

const extractUrlsFromObject = (obj: ImageObject): string[] => {
  const found: string[] = [];
  for (const field of URL_FIELDS) {
    const value = obj[field];
    const url = cleanUrl(value);
    if (url) found.push(url);
  }
  return found;
};

const rankOf = (obj: ImageObject): number => {
  const hint = String(
    (obj.type as unknown) ??
      (obj.source as unknown) ??
      (obj.role as unknown) ??
      (obj.kind as unknown) ??
      "",
  ).toLowerCase();
  if (!hint) return 1;
  if (PRIMARY_HINTS.some((h) => hint.includes(h))) return 0;
  if (SECONDARY_HINTS.some((h) => hint.includes(h))) return 2;
  return 1;
};

interface RankedUrl {
  url: string;
  rank: number;
  order: number;
}

const collectRanked = (input: unknown, bucket: RankedUrl[], counter: { i: number }): void => {
  if (input === null || input === undefined) return;

  if (typeof input === "string") {
    const url = cleanUrl(input);
    if (url) {
      bucket.push({ url, rank: 1, order: counter.i++ });
      return;
    }
    // Puede ser JSON serializado
    const trimmed = input.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"')) {
      try {
        collectRanked(JSON.parse(trimmed), bucket, counter);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) collectRanked(item, bucket, counter);
    return;
  }

  if (typeof input === "object") {
    const obj = input as ImageObject;
    const urls = extractUrlsFromObject(obj);
    const rank = rankOf(obj);
    for (const url of urls) {
      bucket.push({ url, rank, order: counter.i++ });
    }
    // Objetos anidados frecuentes: { images: [...] }, { data: [...] }
    for (const nestedKey of ["images", "imagenes", "gallery", "galeria", "data", "items"]) {
      const nested = obj[nestedKey];
      if (nested !== undefined) collectRanked(nested, bucket, counter);
    }
  }
};

export function normalizeProductImages(input: unknown): string[] {
  const bucket: RankedUrl[] = [];
  collectRanked(input, bucket, { i: 0 });

  // Orden estable: primero por rank (0=principal, 1=neutro, 2=secundario), luego por orden original.
  bucket.sort((a, b) => (a.rank - b.rank) || (a.order - b.order));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const { url } of bucket) {
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}
