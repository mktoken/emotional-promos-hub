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
  const [index, setIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(images.length === 0);

  // Reset cuando cambia el array de imágenes.
  useEffect(() => {
    setIndex(0);
    setAllFailed(images.length === 0);
  }, [images]);

  const currentSrc = images[index];

  const handleError = () => {
    if (index + 1 < images.length) {
      setIndex(index + 1);
    } else {
      setAllFailed(true);
    }
  };

  const handleLoad = () => {
    onLoadedIndexChange?.(index);
  };

  if (!currentSrc || allFailed) {
    return (
      <div
        className={
          placeholderClassName ??
          "w-full h-full flex items-center justify-center"
        }
        aria-label={alt}
      >
        <Package
          size={placeholderSize}
          className="opacity-40 text-muted-foreground"
          aria-hidden="true"
        />
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
