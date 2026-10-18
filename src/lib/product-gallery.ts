import { normalizeProductImages } from "@/lib/product-images";

export interface GalleryImageReference {
  url: string;
  index: number;
}

export function getProductTrustedImageCandidates({
  selectedVariantImages,
  sameProductImages,
}: {
  selectedVariantImages: unknown;
  sameProductImages: unknown;
}): string[] {
  return normalizeProductImages([selectedVariantImages, sameProductImages]);
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
  const trustedImages = getProductTrustedImageCandidates({ selectedVariantImages, sameProductImages });

  // A model-scoped image may enrich a gallery only when the selected variant
  // already has a trusted image source. It must never become the automatic
  // primary image for a variant without an exact/product-scoped candidate.
  if (trustedImages.length === 0) return [];

  return normalizeProductImages([trustedImages, sharedModelImages]);
}

export function getProductMainImageFallbackCandidates({
  trustedImages,
  galleryImages,
  selectedIndex,
  failedUrls,
}: {
  trustedImages: string[];
  galleryImages: string[];
  selectedIndex: number;
  failedUrls: ReadonlySet<string>;
}): string[] {
  const selectedImage = galleryImages[selectedIndex];
  const trustedIndex = selectedImage ? trustedImages.indexOf(selectedImage) : -1;

  // A shared model image can be shown after an explicit thumbnail selection,
  // but it is never used as an automatic fallback for a variant image.
  const candidates =
    trustedIndex >= 0 || !selectedImage ? trustedImages : [selectedImage, ...trustedImages];
  const startIndex = trustedIndex >= 0 ? trustedIndex : 0;
  return getGalleryFallbackCandidates(candidates, startIndex, failedUrls);
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
