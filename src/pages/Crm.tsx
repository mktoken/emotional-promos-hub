import { Routes, Route } from "react-router-dom";
import { CrmLayout } from "@/features/crm/components/CrmLayout";
import CrmDashboard from "@/features/crm/pages/CrmDashboard";
import ProspectList from "@/features/crm/pages/ProspectList";
import ProspectDetail from "@/features/crm/pages/ProspectDetail";
import CampaignList from "@/features/crm/pages/CampaignList";
import CotizacionesList from "@/features/crm/pages/CotizacionesList";
import CotizacionDetail from "@/features/crm/pages/CotizacionDetail";
import MiPerfil from "@/features/crm/pages/MiPerfil";
import ConfiguracionEmpresa from "@/features/crm/pages/ConfiguracionEmpresa";
import FormalQuotesList from "@/features/crm/pages/FormalQuotesList";
import FormalQuoteEditor from "@/features/crm/pages/FormalQuoteEditor";
import FormalQuotePrint from "@/features/crm/pages/FormalQuotePrint";

export default function Crm() {
  return (
    <Routes>
      {/* Print view: sin CrmLayout, layout limpio */}
      <Route
        path="cotizaciones-formales/:quoteId/imprimir"
        element={<FormalQuotePrint />}
      />
      <Route element={<CrmLayout />}>
        <Route index element={<CrmDashboard />} />
        <Route path="prospectos" element={<ProspectList />} />
        <Route path="prospectos/:id" element={<ProspectDetail />} />
        <Route path="cotizaciones" element={<CotizacionesList />} />
        <Route path="cotizaciones/:id" element={<CotizacionDetail />} />
        <Route path="cotizaciones-formales" element={<FormalQuotesList />} />
        <Route
          path="cotizaciones-formales/:quoteId"
          element={<FormalQuoteEditor />}
        />
        <Route path="campanas" element={<CampaignList />} />
        <Route path="mi-perfil" element={<MiPerfil />} />
        <Route path="configuracion" element={<ConfiguracionEmpresa />} />
      </Route>
    </Routes>
  );
}
