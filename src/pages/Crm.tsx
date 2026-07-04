import { Routes, Route } from "react-router-dom";
import { CrmLayout } from "@/features/crm/components/CrmLayout";
import CrmDashboard from "@/features/crm/pages/CrmDashboard";
import ProspectList from "@/features/crm/pages/ProspectList";
import ProspectDetail from "@/features/crm/pages/ProspectDetail";
import CampaignList from "@/features/crm/pages/CampaignList";
import CotizacionesList from "@/features/crm/pages/CotizacionesList";
import CotizacionDetail from "@/features/crm/pages/CotizacionDetail";

export default function Crm() {
  return (
    <Routes>
      <Route element={<CrmLayout />}>
        <Route index element={<CrmDashboard />} />
        <Route path="prospectos" element={<ProspectList />} />
        <Route path="prospectos/:id" element={<ProspectDetail />} />
        <Route path="cotizaciones" element={<CotizacionesList />} />
        <Route path="cotizaciones/:id" element={<CotizacionDetail />} />
        <Route path="campanas" element={<CampaignList />} />
      </Route>
    </Routes>
  );
}
