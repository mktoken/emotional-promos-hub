import { useEffect, useState } from "react";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  useMyProfile,
  useUpdateMyProfile,
  type MyProfileUpdate,
} from "@/features/crm/hooks/useMyProfile";

const STAFF_ROLES = new Set(["admin", "sales_manager", "sales_agent"]);

const emptyForm: Required<MyProfileUpdate> = {
  full_name: "",
  cargo: "",
  phone: "",
  whatsapp: "",
  email_comercial: "",
  firma: "",
};

export default function MiPerfil() {
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF_ROLES.has(r));
  const profile = useMyProfile(auth.user?.id);
  const updater = useUpdateMyProfile(auth.user?.id);

  const [form, setForm] = useState<Required<MyProfileUpdate>>(emptyForm);

  useEffect(() => {
    if (profile.data) {
      setForm({
        full_name: profile.data.full_name ?? "",
        cargo: profile.data.cargo ?? "",
        phone: profile.data.phone ?? "",
        whatsapp: profile.data.whatsapp ?? "",
        email_comercial: profile.data.email_comercial ?? "",
        firma: profile.data.firma ?? "",
      });
    }
  }, [profile.data]);

  if (auth.loading || profile.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Acceso denegado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Necesitas rol de asesor para editar tu perfil.
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
        full_name: form.full_name.trim() || null,
        cargo: form.cargo.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email_comercial: form.email_comercial.trim() || null,
        firma: form.firma.trim() || null,
      } as MyProfileUpdate);
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Estos datos se usan como remitente en emails y WhatsApp del CRM.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos comerciales</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => set("cargo", e.target.value)}
                  placeholder="Ej. Asesor comercial"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  inputMode="tel"
                  placeholder="52 55 …"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="email_comercial">Email comercial</Label>
                <Input
                  id="email_comercial"
                  type="email"
                  value={form.email_comercial}
                  onChange={(e) => set("email_comercial", e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="firma">Firma</Label>
                <Textarea
                  id="firma"
                  rows={4}
                  value={form.firma}
                  onChange={(e) => set("firma", e.target.value)}
                  placeholder={"Saludos,\n\nTu nombre\nPromocionales Emocionales"}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updater.isPending} aria-label="Guardar perfil">
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
