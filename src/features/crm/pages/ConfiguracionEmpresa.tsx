import { useEffect, useState } from "react";
import { Loader2, Save, ShieldAlert, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  useCompanySettings,
  useUpdateCompanySettings,
  type CompanySettingsUpdate,
} from "@/features/crm/hooks/useCompanySettings";

const emptyForm: Required<CompanySettingsUpdate> = {
  nombre_empresa: "",
  email_general: "",
  whatsapp_general: "",
  telefono: "",
  direccion: "",
  firma_default: "",
};

export default function ConfiguracionEmpresa() {
  const auth = useCrmAuth();
  const isAdmin = auth.roles.includes("admin");
  const settings = useCompanySettings();
  const updater = useUpdateCompanySettings(settings.data?.id);

  const [form, setForm] = useState<Required<CompanySettingsUpdate>>(emptyForm);

  useEffect(() => {
    if (settings.data) {
      setForm({
        nombre_empresa: settings.data.nombre_empresa ?? "",
        email_general: settings.data.email_general ?? "",
        whatsapp_general: settings.data.whatsapp_general ?? "",
        telefono: settings.data.telefono ?? "",
        direccion: settings.data.direccion ?? "",
        firma_default: settings.data.firma_default ?? "",
      });
    }
  }, [settings.data]);

  if (auth.loading || settings.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Acceso denegado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Solo administradores pueden editar la configuración de la empresa.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!settings.data) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No hay configuración de empresa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea el registro inicial en la tabla company_settings.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updater.mutateAsync({
        nombre_empresa: form.nombre_empresa.trim() || null,
        email_general: form.email_general.trim() || null,
        whatsapp_general: form.whatsapp_general.trim() || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        firma_default: form.firma_default.trim() || null,
      } as CompanySettingsUpdate);
      toast.success("Configuración actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Configuración de empresa</h1>
        <p className="text-sm text-muted-foreground">
          Datos por defecto cuando el asesor asignado no tiene información propia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos default</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="nombre_empresa">Nombre empresa</Label>
                <Input
                  id="nombre_empresa"
                  value={form.nombre_empresa}
                  onChange={(e) => set("nombre_empresa", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email_general">Email general</Label>
                <Input
                  id="email_general"
                  type="email"
                  value={form.email_general}
                  onChange={(e) => set("email_general", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp_general">WhatsApp general</Label>
                <Input
                  id="whatsapp_general"
                  value={form.whatsapp_general}
                  onChange={(e) => set("whatsapp_general", e.target.value)}
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={form.telefono}
                  onChange={(e) => set("telefono", e.target.value)}
                  inputMode="tel"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="firma_default">Firma default</Label>
                <Textarea
                  id="firma_default"
                  rows={4}
                  value={form.firma_default}
                  onChange={(e) => set("firma_default", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updater.isPending} aria-label="Guardar configuración">
                {updater.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Guardar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
