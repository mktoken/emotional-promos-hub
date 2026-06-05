import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { CrmAuthState } from "@/features/crm/hooks/useCrmAuth";

interface Props {
  auth: CrmAuthState & { signOut: () => Promise<void> };
}

export function CrmTopbar({ auth }: Props) {
  const label =
    auth.profile?.full_name?.trim() || auth.user?.email || "Usuario";
  const roleLabel = auth.roles[0] ?? "viewer";

  return (
    <header className="h-14 flex items-center justify-between border-b border-border bg-background px-2 sm:px-4">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger aria-label="Mostrar/ocultar menú" />
        <div className="font-semibold text-sm sm:text-base truncate">
          CRM <span className="text-primary">Promocionales Emocionales</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right leading-tight">
          <span className="text-xs font-medium truncate max-w-[160px]">{label}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {roleLabel}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => auth.signOut()}
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
