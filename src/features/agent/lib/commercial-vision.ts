import { supabase } from "@/integrations/supabase/client";
import { isCommercialVisualAnalysis, type CommercialAttachment, type CommercialVisualAnalysis } from "./agent-attachments";

export interface CommercialVisionProcessorInput {
  attachment: Pick<CommercialAttachment, "attachmentId" | "type" | "filename" | "mimeType" | "size">;
  dataUrl: string;
  commercialContext?: { productInterest?: string; useCase?: string; lineIds?: string[] };
}

export interface CommercialVisionProcessor {
  analyzeCommercialImage(input: CommercialVisionProcessorInput): Promise<CommercialVisualAnalysis>;
}

export const lovableCommercialVisionProcessor: CommercialVisionProcessor = {
  async analyzeCommercialImage(input) {
    const { data, error } = await supabase.functions.invoke("analyze-commercial-image", { body: input });
    if (error) throw new Error(error.message || "No fue posible analizar la imagen.");
    if (!isCommercialVisualAnalysis(data)) throw new Error("La respuesta visual no cumple el contrato estructurado.");
    return data;
  },
};

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Archivo sin contenido legible."));
    reader.readAsDataURL(file);
  });
}
