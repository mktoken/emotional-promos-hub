import { describe, expect, it } from "vitest";
import {
  findGalleryImageIndex,
  getGalleryFallbackCandidates,
  getProductGalleryImages,
  getProductMainImageFallbackCandidates,
  getProductTrustedImageCandidates,
  getVisibleGalleryImages,
} from "./product-gallery";

describe("product gallery failure handling", () => {
  const images = ["primary.webp", "secondary.webp", "variant.webp"];

  it("keeps valid thumbnails and their original selection indexes", () => {
    expect(getVisibleGalleryImages(images, new Set(["secondary.webp"]))).toEqual([
      { url: "primary.webp", index: 0 },
      { url: "variant.webp", index: 2 },
    ]);
  });

  it("tries the selected image first and skips known failures", () => {
    expect(getGalleryFallbackCandidates(images, 1, new Set(["secondary.webp"]))).toEqual([
      "variant.webp",
      "primary.webp",
    ]);
  });

  it("returns no candidates when every image has failed", () => {
    expect(getGalleryFallbackCandidates(images, 0, new Set(images))).toEqual([]);
    expect(getVisibleGalleryImages(images, new Set(images))).toEqual([]);
  });

  it("maps the resolved URL back to the canonical selection", () => {
    expect(findGalleryImageIndex(images, "variant.webp")).toBe(2);
  });

  it("builds a gallery only from the selected variant, its own product, and explicit model assets", () => {
    expect(
      getProductGalleryImages({
        selectedVariantImages: ["https://cdn.test/selected-variant.webp"],
        sameProductImages: ["https://cdn.test/same-product.webp"],
        sharedModelImages: ["https://cdn.test/model-master.webp"],
      }),
    ).toEqual([
      "https://cdn.test/selected-variant.webp",
      "https://cdn.test/same-product.webp",
      "https://cdn.test/model-master.webp",
    ]);
  });

  it("does not expose a shared model image when the selected variant has no trusted image", () => {
    expect(
      getProductGalleryImages({
        selectedVariantImages: [],
        sameProductImages: [],
        sharedModelImages: ["https://cdn.test/model-master.webp"],
      }),
    ).toEqual([]);
  });

  it("does not use a shared model image as an automatic fallback after trusted images fail", () => {
    const trustedImages = getProductTrustedImageCandidates({
      selectedVariantImages: ["https://cdn.test/selected-variant.webp"],
      sameProductImages: ["https://cdn.test/same-product.webp"],
    });
    const galleryImages = getProductGalleryImages({
      selectedVariantImages: trustedImages,
      sameProductImages: [],
      sharedModelImages: ["https://cdn.test/model-master.webp"],
    });

    expect(
      getProductMainImageFallbackCandidates({
        trustedImages,
        galleryImages,
        selectedIndex: 0,
        failedUrls: new Set(trustedImages),
      }),
    ).toEqual([]);
  });

  it("allows an explicitly selected shared image without changing variant fallback rules", () => {
    const trustedImages = ["https://cdn.test/selected-variant.webp"];
    const galleryImages = [...trustedImages, "https://cdn.test/model-master.webp"];

    expect(
      getProductMainImageFallbackCandidates({
        trustedImages,
        galleryImages,
        selectedIndex: 1,
        failedUrls: new Set(),
      }),
    ).toEqual(["https://cdn.test/model-master.webp", "https://cdn.test/selected-variant.webp"]);
  });

  it("does not introduce another variant when the selected variant has no image", () => {
    expect(
      getProductGalleryImages({
        selectedVariantImages: [],
        sameProductImages: [],
        sharedModelImages: [],
      }),
    ).toEqual([]);
  });
});
