import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  buildPasswordRecoveryRedirect,
  PASSWORD_RECOVERY_MESSAGE,
  validateRecoveryEmail,
} from "@/lib/password-recovery";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/crm";

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate(redirectTo, { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(redirectTo, { replace: true });
      else setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      const msg =
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message;
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success("Sesión iniciada");
    navigate(redirectTo, { replace: true });
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRecoveryEmail(email);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setRecoverySubmitting(true);
    setError(null);
    setRecoverySent(false);
    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildPasswordRecoveryRedirect(window.location.origin),
      });

      if (recoveryError) throw recoveryError;
      setRecoverySent(true);
      toast.success(PASSWORD_RECOVERY_MESSAGE);
    } catch {
      setError("No se pudo procesar la solicitud. Intenta nuevamente.");
      toast.error("No se pudo procesar la solicitud. Intenta nuevamente.");
    } finally {
      setRecoverySubmitting(false);
    }
  };

  const showRecovery = () => {
    setRecoveryMode(true);
    setError(null);
    setRecoverySent(false);
  };

  const showLogin = () => {
    setRecoveryMode(false);
    setError(null);
    setRecoverySent(false);
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
          <div className="mx-auto w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">PE</span>
          </div>
          <CardTitle className="text-2xl">CRM Promocionales Emocionales</CardTitle>
          <p className="text-sm text-muted-foreground">Acceso para equipo comercial</p>
        </CardHeader>
        <CardContent>
          {recoveryMode ? (
            <form onSubmit={handleRecoverySubmit} className="space-y-4" noValidate>
              <p className="text-sm text-muted-foreground">
                Introduce tu correo y te enviaremos instrucciones para recuperar el acceso.
              </p>
              <div className="space-y-2">
                <Label htmlFor="recovery-email">Correo</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                    setRecoverySent(false);
                  }}
                  placeholder="tucorreo@empresa.com"
                  aria-invalid={!!error}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {recoverySent && (
                <p role="status" className="text-sm text-muted-foreground">
                  {PASSWORD_RECOVERY_MESSAGE}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={recoverySubmitting || !email}
                aria-label="Enviar instrucciones de recuperación"
              >
                {recoverySubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…
                  </>
                ) : (
                  "Enviar instrucciones"
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={showLogin}>
                Volver al inicio de sesión
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@empresa.com"
                aria-invalid={!!error}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email || !password}
              aria-label="Iniciar sesión"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Iniciando…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
            <Button type="button" variant="link" className="w-full" onClick={showRecovery}>
              ¿Olvidaste tu contraseña?
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              ¿No tienes cuenta? Contacta al administrador.
            </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
