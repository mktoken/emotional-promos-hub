import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import SafeProductImage from "./SafeProductImage";

interface ProductImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  initialIndex?: number;
  alt: string;
}

export default function ProductImageLightbox({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
  alt,
}: ProductImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
  }, [open, initialIndex, images.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (images.length === 0 ? 0 : (i - 1 + images.length) % images.length));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (images.length === 0 ? 0 : (i + 1) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext]);

  if (images.length === 0) return null;

  // Rotamos las imágenes para que la actual quede primero: así SafeProductImage
  // aplica su fallback automático dentro del lightbox también.
  const rotated = [...images.slice(index), ...images.slice(0, index)];
  const hasMultiple = images.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-[95vw] p-0 bg-card border-border overflow-hidden"
        aria-label={`Vista ampliada: ${alt}`}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>

        <div className="relative w-full aspect-square sm:aspect-[4/3] bg-white flex items-center justify-center">
          <SafeProductImage
            images={rotated}
            alt={`${alt} (${index + 1} de ${images.length})`}
            loading="eager"
            fetchPriority="high"
            imgClassName="max-w-full max-h-full object-contain p-4 sm:p-8"
            placeholderClassName="w-full h-full flex items-center justify-center"
            placeholderSize={160}
          />

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar vista ampliada"
            className="absolute top-3 right-3 bg-foreground/70 hover:bg-foreground text-background rounded-full p-2 shadow-md transition"
          >
            <X size={20} />
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-foreground/70 hover:bg-foreground text-background rounded-full p-2 shadow-md transition"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Imagen siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-foreground/70 hover:bg-foreground text-background rounded-full p-2 shadow-md transition"
              >
                <ChevronRight size={22} />
              </button>

              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-foreground/70 text-background text-xs font-semibold px-3 py-1 rounded-full"
                aria-live="polite"
              >
                {index + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
