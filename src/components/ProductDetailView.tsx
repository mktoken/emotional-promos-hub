import { useState, useEffect } from "react";
import {
  ChevronLeft,
  CheckCircle2,
  Package,
  Minus,
  Plus,
  ShoppingCart,
  Loader2,
  Clock,
  MessageSquare,
  ShieldCheck,
  Info,
  Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ProductColor,
  QuoteItem,
  PersonalizationCapabilities,
  PersonalizationOptionKey,
  PersonalizationOptionRule,
} from "@/data/mockData";

interface ProductDetailViewProps {
  productId: string | null;
  onBack: () => void;
  onAddToQuote: (item: Omit<QuoteItem, "cartId">) => void;
}

interface ProductoB2B {
  id: string;
  id_interno: string;
  sku_base: string | null;
  categoria_principal: string | null;
  datos_generales: {
    nombre?: string;
    descripcion?: string;
    clave_producto?: string;
    modelo_comercial?: string;
    entrega_estimada?: string;
    entrega_nota?: string;
    personalizacion_publica?: string;
    precio_nota?: string;
    agregable_a_propuesta?: boolean;
    stock_status_publico?: string;
    personalizacion_capacidades?: PersonalizationCapabilities;
  } | null;
  variantes: Array<{
    sku_variante?: string;
    clave_variante?: string;
    color_nombre?: string;
    color_hex?: string;
    stock_total?: number;
    agregable_a_propuesta?: boolean;
    imagen_url?: string;
    material?: string;
    disponibilidad?: string;
  }> | null;
  imagenes: unknown[] | null;
  motor_de_personalizacion: Record<string, unknown> | null;
  activo: boolean | null;
  updated_at: string | null;
  precio_desde_mxn: number | null;
}

const QUICK_QUANTITIES = [100, 250, 500, 1000];

const PERSONALIZATION_OPTIONS: Array<{ key: PersonalizationOptionKey; fallbackLabel: string }> = [
  { key: "none", fallbackLabel: "Sin personalización" },
  { key: "logo_1_ink", fallbackLabel: "Logo a 1 tinta" },
  { key: "logo_2_ink", fallbackLabel: "Logo a 2 tintas" },
  { key: "logo_3_plus_ink", fallbackLabel: "Logo a 3+ tintas" },
  { key: "full_color", fallbackLabel: "Full color" },
  { key: "engraving", fallbackLabel: "Grabado" },
  { key: "advisor_review", fallbackLabel: "Por definir con asesor" },
];

const FALLBACK_PERSONALIZATION_RULES: Record<PersonalizationOptionKey, PersonalizationOptionRule> = {
  none: {
    label: "Sin personalización",
    status: "allowed",
    message: "Cotizaremos el producto sin impresión ni grabado.",
  },
  logo_1_ink: {
    label: "Logo a 1 tinta",
    status: "recommended_economy",
    message: "Suele ser la opción más económica para propuestas promocionales.",
  },
  logo_2_ink: {
    label: "Logo a 2 tintas",
    status: "allowed_with_validation",
    message: "Sujeto a validación de arte, área disponible y material.",
  },
  logo_3_plus_ink: {
    label: "Logo a 3+ tintas",
    status: "manual_review",
    message: "Puede requerir técnica especial o alternativa económica.",
  },
  full_color: {
    label: "Full color",
    status: "manual_review",
    message: "Requiere revisión técnica según material, logo y área disponible.",
  },
  engraving: {
    label: "Grabado",
    status: "manual_review",
    message: "Sujeto a validación técnica.",
  },
  advisor_review: {
    label: "Por definir con asesor",
    status: "allowed",
    message: "Nuestro equipo recomendará la opción adecuada.",
  },
};

const PERSONALIZATION_STATUS_META: Record<string, { label: string; className: string }> = {
  allowed: {
    label: "Disponible",
    className: "bg-success/10 text-success border-success/20",
  },
  recommended_economy: {
    label: "Opción económica",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  allowed_with_validation: {
    label: "Con validación",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  manual_review: {
    label: "Revisión técnica",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  not_recommended: {
    label: "No recomendado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export default function ProductDetailView({ productId, onBack, onAddToQuote }: ProductDetailViewProps) {
  const [product, setProduct] = useState<ProductoB2B | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(100);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [estimatedUnit, setEstimatedUnit] = useState(0);
  const [selectedPersonalization, setSelectedPersonalization] = useState<PersonalizationOptionKey>("logo_1_ink");
  const [includeEconomyAlternative, setIncludeEconomyAlternative] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("productos_publicos")
        .select(
          "id,id_interno,sku_base,categoria_principal,datos_generales,variantes,imagenes,motor_de_personalizacion,activo,updated_at,precio_desde_mxn",
        )
        .eq("id", productId)
        .maybeSingle();

      if (!error && data) {
        setProduct(data as unknown as ProductoB2B);
        setSelectedColorIndex(0);
        setSelectedImageIndex(0);
        setQuantity(100);
      }

      setLoading(false);
    }

    fetchProduct();
  }, [productId]);

  const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

  const pickUrlFromItem = (item: unknown): string | null => {
    if (!item) return null;
    if (isHttpUrl(item)) return item;

    if (typeof item === "object") {
      const url = (item as { url?: unknown; imagen_url?: unknown; src?: unknown }).url;
      const imagenUrl = (item as { url?: unknown; imagen_url?: unknown; src?: unknown }).imagen_url;
      const src = (item as { url?: unknown; imagen_url?: unknown; src?: unknown }).src;
      if (isHttpUrl(url)) return url;
      if (isHttpUrl(imagenUrl)) return imagenUrl;
      if (isHttpUrl(src)) return src;
    }

    return null;
  };

  const getImageUrls = (imgData: unknown): string[] => {
    if (!imgData) return [];

    if (Array.isArray(imgData)) {
      return imgData.map(pickUrlFromItem).filter((url): url is string => Boolean(url));
    }

    if (typeof imgData === "string") {
      if (isHttpUrl(imgData)) return [imgData];
      try {
        return getImageUrls(JSON.parse(imgData));
      } catch {
        return [];
      }
    }

    const url = pickUrlFromItem(imgData);
    return url ? [url] : [];
  };

  const formatMoney = (value: number) =>
    value.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getPersonalizationRule = (
    key: PersonalizationOptionKey,
    capabilities?: PersonalizationCapabilities,
  ): PersonalizationOptionRule => ({
    ...FALLBACK_PERSONALIZATION_RULES[key],
    ...(capabilities?.options?.[key] ?? {}),
  });

  const getPersonalizationStatus = (status?: string) =>
    PERSONALIZATION_STATUS_META[status || "allowed"] ?? {
      label: "Revisión",
      className: "bg-muted text-muted-foreground border-border",
    };

  const productName =
    product?.datos_generales?.modelo_comercial?.trim() ||
    product?.datos_generales?.nombre?.trim() ||
    product?.id_interno ||
    "";

  const productDesc = product?.datos_generales?.descripcion?.trim() || "";
  const productClave = (product?.datos_generales?.clave_producto?.trim() || product?.sku_base?.trim() || "").trim();
  const basePrice = Number(product?.precio_desde_mxn ?? 0);
  const deliveryEstimate =
    product?.datos_generales?.entrega_estimada || "10 a 15 días hábiles después de aprobación de arte";
  const deliveryNote =
    product?.datos_generales?.entrega_nota || "Puede variar por temporada, cantidad, disponibilidad y carga de taller.";
  const personalizationText =
    product?.datos_generales?.personalizacion_publica ||
    "Nuestro equipo definirá la técnica adecuada según material, logo y cantidad.";
  const priceNote =
    product?.datos_generales?.precio_nota || "Precio antes de IVA e impresión. Sujeto a validación comercial.";

  const personalizationCapabilities = product?.datos_generales?.personalizacion_capacidades;
  const economyRecommendation =
    personalizationCapabilities?.economy_recommendation &&
    FALLBACK_PERSONALIZATION_RULES[personalizationCapabilities.economy_recommendation]
      ? personalizationCapabilities.economy_recommendation
      : "logo_1_ink";
  const selectedPersonalizationRule = getPersonalizationRule(selectedPersonalization, personalizationCapabilities);
  const selectedPersonalizationStatus = getPersonalizationStatus(selectedPersonalizationRule.status);
  const economyPersonalizationRule = getPersonalizationRule(economyRecommendation, personalizationCapabilities);
  const shouldShowEconomyAlternative =
    selectedPersonalization !== "none" &&
    economyRecommendation !== "none" &&
    selectedPersonalization !== economyRecommendation;
  const requiresTechnicalReview =
    Boolean(personalizationCapabilities?.requires_manual_review) ||
    ["allowed_with_validation", "manual_review", "not_recommended"].includes(selectedPersonalizationRule.status || "");

  const colors: ProductColor[] = (product?.variantes ?? []).map((v, i) => ({
    id: `c${i}`,
    name: v.color_nombre ?? "Disponible",
    hex: v.color_hex ?? "#94a3b8",
    stock: Number(v.stock_total ?? 0),
    imgAlt: `${productName} ${v.color_nombre ?? "Disponible"}`.trim(),
    imageUrl: v.imagen_url,
    agregableToProposal: Boolean(v.agregable_a_propuesta ?? Number(v.stock_total ?? 0) > 0),
    disponibilidad: v.disponibilidad,
    material: v.material,
    claveVariante: v.clave_variante ?? v.sku_variante,
  }));

  const currentColor = colors[selectedColorIndex] ?? {
    id: "c0",
    name: "Disponible",
    hex: "#94a3b8",
    stock: 0,
    imgAlt: productName,
    agregableToProposal: false,
  };

  const productImages = getImageUrls(product?.imagenes);
  const variantImages = colors.map((color) => color.imageUrl).filter((url): url is string => Boolean(url));
  const galleryImages = Array.from(
    new Set([currentColor.imageUrl, ...productImages, ...variantImages].filter(Boolean)),
  ) as string[];
  const mainImage = galleryImages[selectedImageIndex] || currentColor.imageUrl || productImages[0] || null;
  const material = currentColor.material?.trim() || "Por confirmar con asesor";
  const availableStock = Number(currentColor.stock ?? 0);
  const productAllowsProposal = Boolean(product?.datos_generales?.agregable_a_propuesta ?? true);
  const canAddToProposal = productAllowsProposal && Boolean(currentColor.agregableToProposal) && availableStock > 0;
  const stockLabel = canAddToProposal
    ? `${availableStock.toLocaleString("es-MX")} piezas disponibles`
    : "Consultar disponibilidad";

  useEffect(() => {
    const subtotal = basePrice * quantity;
    setEstimatedTotal(subtotal);
    setEstimatedUnit(quantity > 0 ? basePrice : 0);
  }, [quantity, basePrice]);

  useEffect(() => {
    if (availableStock > 0 && quantity > availableStock) {
      setQuantity(availableStock);
    }
  }, [availableStock, quantity]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColorIndex]);

  useEffect(() => {
    if (!product) return;

    const nextDefault = product.datos_generales?.personalizacion_capacidades?.economy_recommendation || "logo_1_ink";
    setSelectedPersonalization(FALLBACK_PERSONALIZATION_RULES[nextDefault] ? nextDefault : "logo_1_ink");
    setIncludeEconomyAlternative(true);
  }, [product?.id]);

  const setSafeQuantity = (value: number) => {
    const maxStock = availableStock > 0 ? availableStock : Number.MAX_SAFE_INTEGER;
    const normalizedValue = Number.isFinite(value) ? value : 1;
    setQuantity(Math.max(1, Math.min(Math.trunc(normalizedValue), maxStock)));
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseInt(e.target.value, 10);
    setSafeQuantity(Number.isNaN(nextValue) ? 1 : nextValue);
  };

  const increaseQuantity = () => setSafeQuantity(quantity + 1);
  const decreaseQuantity = () => setSafeQuantity(quantity - 1);

  const handleAddToProposal = () => {
    if (!product || !canAddToProposal) return;

    const economySuggestion =
      shouldShowEconomyAlternative && includeEconomyAlternative
        ? {
            tipo: economyRecommendation,
            label: economyPersonalizationRule.label,
            incluida: true,
            motivo: "Suele ser la opción más económica para comparar en la propuesta.",
          }
        : null;

    const quoteItem = {
      productId: product.id,
      name: productName,
      sku: productClave,
      claveProducto: productClave,
      modeloComercial: productName,
      color: currentColor,
      quantity,
      logoFormat: selectedPersonalization,
      personalizacionSolicitadaCliente: {
        tipo: selectedPersonalization,
        label: selectedPersonalizationRule.label,
        status: selectedPersonalizationRule.status,
        message: selectedPersonalizationRule.message,
        requiereRevision: requiresTechnicalReview,
      },
      personalizacionSugeridaEconomica: economySuggestion,
      requiereRevisionTecnica: requiresTechnicalReview,
      personalizationCompatibilityNote: selectedPersonalizationRule.message,
      estimatedTotal,
      estimatedUnit,
      hasVirtualSample: false,
      imageUrl: mainImage ?? undefined,
      entregaEstimada: deliveryEstimate,
      personalizacionPublica: personalizationText,
      material,
    };

    onAddToQuote(quoteItem);
  };

  const handleWhatsAppConsult = () => {
    const economyText =
      shouldShowEconomyAlternative && includeEconomyAlternative
        ? `\nTambién me interesa comparar la opción económica sugerida: ${economyPersonalizationRule.label}.`
        : "";

    const message = `Hola, quiero consultar disponibilidad y propuesta para este producto:\n\nClave: ${
      productClave || "Por confirmar"
    }\nModelo: ${productName}\nColor: ${currentColor.name}\nCantidad estimada: ${quantity.toLocaleString(
      "es-MX",
    )} piezas\nPersonalización solicitada: ${selectedPersonalizationRule.label}${economyText}\n\nPrecio desde: $${formatMoney(basePrice)} MXN + IVA, antes de impresión.\n\nQuedo atento a su asesoría.`;

    window.open(`https://wa.me/5215530311686?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="font-medium">Cargando producto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-32 text-muted-foreground">
        <p>Producto no encontrado.</p>
        <button onClick={onBack} className="mt-4 text-primary underline">
          Volver al catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-surface">
      <div className="bg-card border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition font-medium text-sm"
          >
            <ChevronLeft size={16} /> Volver al Catálogo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5 mb-10 lg:mb-0">
            <div className="sticky top-28">
              <div className="w-full aspect-square rounded-3xl border border-border flex items-center justify-center mb-4 relative overflow-hidden bg-white shadow-sm">
                <div
                  className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border flex items-center gap-1.5 z-20 ${
                    canAddToProposal
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${canAddToProposal ? "bg-success animate-pulse" : "bg-destructive"}`}
                  />
                  {stockLabel}
                </div>

                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={productName}
                    className="max-w-[82%] max-h-[82%] object-contain z-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                    }}
                  />
                ) : null}

                <Package
                  size={180}
                  className={`opacity-30 text-muted-foreground absolute z-0 ${mainImage ? "hidden" : ""}`}
                />
              </div>

              {galleryImages.length > 1 && (
                <div className="grid grid-cols-5 gap-3">
                  {galleryImages.slice(0, 10).map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square rounded-xl border overflow-hidden bg-white transition ${
                        selectedImageIndex === index
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={`${productName} ${index + 1}`}
                        className="w-full h-full object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <section className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {productClave ? (
                  <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold">
                    Clave: {productClave}
                  </span>
                ) : null}
                {product?.categoria_principal ? (
                  <span className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-xs font-bold">
                    {product.categoria_principal}
                  </span>
                ) : null}
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight">{productName}</h1>

              {productDesc ? (
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-6">{productDesc}</p>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface rounded-2xl p-4 border border-border">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Precio desde</p>
                  <p className="text-2xl font-black text-success">${formatMoney(basePrice)}</p>
                  <p className="text-xs text-muted-foreground mt-1">MXN · antes de IVA e impresión</p>
                </div>
                <div className="bg-surface rounded-2xl p-4 border border-border">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Disponibilidad</p>
                  <p className="text-lg font-black text-foreground">{stockLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">Stock sujeto a confirmación</p>
                </div>
                <div className="bg-surface rounded-2xl p-4 border border-border">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Entrega estimada</p>
                  <p className="text-lg font-black text-foreground">10 a 15 días</p>
                  <p className="text-xs text-muted-foreground mt-1">Después de aprobación de arte</p>
                </div>
              </div>
            </section>

            {colors.length > 0 && (
              <section className="bg-card rounded-3xl border border-border shadow-sm p-6">
                <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Palette size={18} className="text-primary" /> Selecciona color / variante
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {colors.map((color, idx) => {
                    const colorAvailable = Boolean(color.agregableToProposal) && color.stock > 0;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColorIndex(idx)}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                          selectedColorIndex === idx
                            ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                            : "border-border bg-surface hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-full border border-border shrink-0"
                            style={{ backgroundColor: color.hex }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground truncate">{color.name}</p>
                            <p className={`text-xs ${colorAvailable ? "text-success" : "text-destructive"}`}>
                              {colorAvailable
                                ? `${color.stock.toLocaleString("es-MX")} disponibles`
                                : "Consultar disponibilidad"}
                            </p>
                          </div>
                          {selectedColorIndex === idx && <CheckCircle2 size={20} className="text-primary shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="bg-card rounded-3xl border border-border shadow-sm p-6">
              <h2 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" /> Personalización deseada
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5">{personalizationText}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERSONALIZATION_OPTIONS.map((option) => {
                  const rule = getPersonalizationRule(option.key, personalizationCapabilities);
                  const statusMeta = getPersonalizationStatus(rule.status);
                  const selected = selectedPersonalization === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedPersonalization(option.key)}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                          : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-foreground">{rule.label || option.fallbackLabel}</p>
                          {rule.message ? (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rule.message}</p>
                          ) : null}
                        </div>
                        {selected && <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />}
                      </div>
                      {rule.status ? (
                        <span
                          className={`inline-flex mt-3 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className={`mt-5 rounded-2xl border p-4 ${selectedPersonalizationStatus.className}`}>
                <p className="text-sm font-bold">Selección actual: {selectedPersonalizationRule.label}</p>
                <p className="text-sm mt-1">
                  {selectedPersonalizationRule.message ||
                    "Nuestro equipo validará técnica, área de impresión, material, cantidad y viabilidad del arte."}
                </p>
              </div>

              {shouldShowEconomyAlternative && (
                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-success/20 bg-success/5 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEconomyAlternative}
                    onChange={(event) => setIncludeEconomyAlternative(event.target.checked)}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <p className="font-bold text-foreground">
                      Incluir alternativa económica: {economyPersonalizationRule.label}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      La incluiremos como opción comparativa para que ventas pueda proponerte la alternativa más
                      conveniente si tu solicitud original no es la más económica o requiere revisión.
                    </p>
                  </div>
                </label>
              )}

              <div className="mt-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
                <Info size={18} className="text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  No necesitas elegir técnica ni subir logo en esta ficha. Compártenos tu logo después y nuestro equipo
                  ajustará la propuesta según material, tamaño, colores, cantidad y viabilidad de impresión.
                </p>
              </div>

              {personalizationCapabilities?.restriction_note && (
                <p className="text-xs text-muted-foreground mt-3">{personalizationCapabilities.restriction_note}</p>
              )}
            </section>

            <section className="bg-card rounded-3xl border border-border shadow-sm p-6">
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock size={18} className="text-primary" /> Entrega estimada
              </h2>
              <p className="font-semibold text-foreground">{deliveryEstimate}</p>
              <p className="text-sm text-muted-foreground mt-2">{deliveryNote}</p>
            </section>

            <section className="bg-dark-section p-6 rounded-3xl shadow-xl border border-dark-section text-dark-section-foreground">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm text-dark-section-foreground/60 mb-2">Cantidad estimada</label>

                  <div className="bg-dark-section/80 rounded-xl p-2 flex items-center justify-between border border-dark-section-foreground/10 w-full mb-3">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      className="p-3 hover:bg-dark-section-foreground/10 rounded-lg text-dark-section-foreground/60 hover:text-dark-section-foreground transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={availableStock > 0 ? availableStock : undefined}
                      inputMode="numeric"
                      value={quantity}
                      onChange={handleQuantityInputChange}
                      aria-label="Cantidad estimada"
                      className="w-28 bg-transparent text-center font-black text-2xl tracking-tight text-dark-section-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={increaseQuantity}
                      className="p-3 hover:bg-dark-section-foreground/10 rounded-lg text-dark-section-foreground/60 hover:text-dark-section-foreground transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_QUANTITIES.map((quickQty) => {
                      const disabled = availableStock > 0 && quickQty > availableStock;
                      return (
                        <button
                          key={quickQty}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSafeQuantity(quickQty)}
                          className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                            quantity === quickQty
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-dark-section-foreground/10 text-dark-section-foreground/70 hover:bg-dark-section-foreground/10"
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {quickQty.toLocaleString("es-MX")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:border-l lg:border-dark-section-foreground/10 lg:pl-6">
                  <p className="text-sm text-dark-section-foreground/60 mb-1">Precio desde estimado</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-success">${formatMoney(estimatedUnit)}</span>
                    <span className="text-sm text-dark-section-foreground/60 mb-1.5">MXN · antes de IVA e impresión</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dark-section-foreground/10">
                    <p className="text-xs text-dark-section-foreground/50 mb-1">Subtotal preliminar</p>
                    <p className="text-2xl font-black text-dark-section-foreground">
                      ${formatMoney(estimatedTotal)} MXN
                    </p>
                    <p className="text-[11px] text-dark-section-foreground/50 mt-1">
                      + IVA 16% · sin impresión/personalización
                    </p>
                  </div>

                  <p className="text-xs text-dark-section-foreground/50 mt-3">{priceNote}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAddToProposal}
                  disabled={!canAddToProposal}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-glow-primary flex justify-center items-center gap-2 text-lg hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {canAddToProposal ? (
                    <>
                      Agregar a propuesta <ShoppingCart size={20} />
                    </>
                  ) : (
                    "Sin stock para propuesta"
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppConsult}
                  className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2"
                >
                  Consultar por WhatsApp <MessageSquare size={20} />
                </button>
              </div>

              <p className="text-xs text-dark-section-foreground/60 text-center mt-4">
                Sin pago en línea. La propuesta formal será validada por nuestro equipo comercial.
              </p>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="font-bold text-foreground mb-1">Clave</p>
                <p className="text-muted-foreground">{productClave || "Por confirmar"}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="font-bold text-foreground mb-1">Material</p>
                <p className="text-muted-foreground">{material}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="font-bold text-foreground mb-1">Color seleccionado</p>
                <p className="text-muted-foreground">{currentColor.name}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
