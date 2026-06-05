import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CrmSidebar } from "./CrmSidebar";
import { CrmTopbar } from "./CrmTopbar";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";

export function CrmLayout() {
  const auth = useCrmAuth();
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth.session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CrmSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <CrmTopbar auth={auth} />
          <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
