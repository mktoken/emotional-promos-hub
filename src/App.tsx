import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import UpdatePassword from "./pages/UpdatePassword";
import Crm from "./pages/Crm";
import NotFound from "./pages/NotFound";
import { pilotEnabled } from "./features/agent/lib/agent-pilot";

const AgentPilotPage = lazy(() => import("./features/agent/pages/AgentPilotPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/update-password" element={<UpdatePassword />} />
          <Route path="/crm/*" element={<Crm />} />
          {pilotEnabled(window.location.hostname) && <Route path="/agente-piloto" element={<Suspense fallback={<p className="p-6">Cargando asistente…</p>}><AgentPilotPage /></Suspense>} />}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
