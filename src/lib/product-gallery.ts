import { normalizeProductImages } from "@/lib/product-images";

export interface GalleryImageReference {
  url: string;
  index: number;
}

export function getProductGalleryImages({
  selectedVariantImages,
  sameProductImages,
  sharedModelImages,
}: {
  selectedVariantImages: unknown;
  sameProductImages: unknown;
  sharedModelImages: unknown;
}): string[] {
  return normalizeProductImages([selectedVariantImages, sameProductImages, sharedModelImages]);
}

export function getVisibleGalleryImages(
  images: string[],
  failedUrls: ReadonlySet<string>,
): GalleryImageReference[] {
  return images.reduce<GalleryImageReference[]>((visible, url, index) => {
    if (!failedUrls.has(url)) visible.push({ url, index });
    return visible;
  }, []);
}

export function getGalleryFallbackCandidates(
  images: string[],
  selectedIndex: number,
  failedUrls: ReadonlySet<string>,
): string[] {
  if (images.length === 0) return [];

  const safeIndex = Math.min(Math.max(0, selectedIndex), images.length - 1);
  return [...images.slice(safeIndex), ...images.slice(0, safeIndex)].filter((url) => !failedUrls.has(url));
}

export function findGalleryImageIndex(images: string[], url: string): number {
  return images.indexOf(url);
}
