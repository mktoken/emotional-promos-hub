import { describe, expect, it } from "vitest";
import {
  findGalleryImageIndex,
  getGalleryFallbackCandidates,
  getProductGalleryImages,
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
