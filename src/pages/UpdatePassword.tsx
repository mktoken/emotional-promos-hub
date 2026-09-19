import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validatePasswordChange } from "@/features/crm/lib/password-validation";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setChecking(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePasswordChange(newPassword, confirmPassword);
    if (!validation.valid) {
      setError(validation.error ?? "Revisa los datos de la contraseña.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setNewPassword("");
      setConfirmPassword("");
      setUpdated(true);
      toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch {
      setError("No se pudo actualizar la contraseña. Solicita un nuevo enlace.");
      toast.error("No se pudo actualizar la contraseña. Solicita un nuevo enlace.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToLogin = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Actualizar contraseña</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define una nueva contraseña para recuperar el acceso al CRM.
          </p>
        </CardHeader>
        <CardContent>
          {!hasSession ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive" role="alert">
                El enlace de recuperación no es válido o ya expiró.
              </p>
              <Button type="button" className="w-full" onClick={() => navigate("/login")}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : updated ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" role="status">
                Contraseña actualizada. Ya puedes iniciar sesión.
              </p>
              <Button type="button" className="w-full" onClick={handleReturnToLogin}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="recovery-new-password">Nueva contraseña</Label>
                <Input
                  id="recovery-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-confirm-password">Confirmar nueva contraseña</Label>
                <Input
                  id="recovery-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Actualizando…
                  </>
                ) : (
                  "Actualizar contraseña"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
