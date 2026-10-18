import { describe, expect, it } from "vitest";
import {
  findGalleryImageIndex,
  getGalleryFallbackCandidates,
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
});
