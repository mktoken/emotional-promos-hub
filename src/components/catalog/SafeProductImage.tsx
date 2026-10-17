import { useEffect, useState } from "react";
import { Package } from "lucide-react";

interface SafeProductImageProps {
  images: string[];
  alt: string;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
  placeholderSize?: number;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  onLoadedIndexChange?: (index: number) => void;
  onClick?: () => void;
}

/**
 * Renderiza una imagen de producto con fallback automático:
 * si images[0] falla, intenta images[1], etc.
 * Solo muestra placeholder si TODAS fallan.
 */
export default function SafeProductImage({
  images,
  alt,
  className,
  imgClassName,
  placeholderClassName,
  placeholderSize = 80,
  loading = "lazy",
  fetchPriority,
  onLoadedIndexChange,
  onClick,
}: SafeProductImageProps) {
  const candidateImages = images
    .map((url, originalIndex) => ({ url, originalIndex }))
    .filter(({ url }) => typeof url === "string" && url.trim().length > 0);
  const candidateCount = candidateImages.length;
  const imageSignature = candidateImages.map(({ url }) => url).join("\u0000");
  const [index, setIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(candidateCount === 0);

  // Reset cuando cambia el array de imágenes.
  useEffect(() => {
    setIndex(0);
    setAllFailed(candidateCount === 0);
  }, [imageSignature, candidateCount]);

  const currentImage = candidateImages[index];
  const currentSrc = currentImage?.url;

  const handleError = () => {
    if (index + 1 < candidateImages.length) {
      setIndex(index + 1);
    } else {
      setAllFailed(true);
    }
  };

  const handleLoad = () => {
    onLoadedIndexChange?.(currentImage?.originalIndex ?? index);
  };

  if (!currentSrc || allFailed) {
    return (
      <div
        className={
          placeholderClassName ??
          "w-full h-full flex items-center justify-center px-4"
        }
        role="img"
        aria-label={`${alt}: Imagen en actualización`}
      >
        <div className="flex max-w-[14rem] flex-col items-center text-center text-muted-foreground">
          <Package
            size={placeholderSize}
            className="opacity-40"
            aria-hidden="true"
          />
          <span className="mt-3 text-sm font-medium">Imagen en actualización</span>
          <span className="mt-1 text-xs">Consulta disponibilidad</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={handleLoad}
      onClick={onClick}
      className={imgClassName ?? className}
    />
  );
}
