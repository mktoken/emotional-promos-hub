import { Loader2, ShieldAlert, AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GovernanceError } from "../lib/governance-api";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof GovernanceError && error.unauthorized) return <UnauthorizedState />;
  return (
    <div role="alert" className="border border-destructive/40 rounded-md p-4 flex flex-col gap-3 items-start">
      <div className="flex items-center gap-2 text-destructive font-medium">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" /> No se pudo cargar la información.
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
    </div>
  );
}

export function UnauthorizedState() {
  return (
    <div role="alert" className="border border-border rounded-md p-6 flex items-center gap-3">
      <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-medium">Acceso restringido</p>
        <p className="text-sm text-muted-foreground">La consola de Governance solo está disponible para el equipo interno.</p>
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Inbox className="h-4 w-4" aria-hidden="true" /> {label}
    </div>
  );
}

/** Status badge: always text + symbol, never color-only. */
export function StatusBadge({ ok, yes, no }: { ok: boolean | null | undefined; yes: string; no: string }) {
  return (
    <Badge variant={ok ? "default" : "outline"} className="whitespace-nowrap">
      <span aria-hidden="true" className="mr-1">{ok ? "✓" : "✕"}</span>
      {ok ? yes : no}
    </Badge>
  );
}

export function TextBadge({ value }: { value: string | null | undefined }) {
  return <Badge variant="secondary" className="whitespace-nowrap font-mono text-[11px]">{value ?? "—"}</Badge>;
}
