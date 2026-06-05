import { Routes, Route } from "react-router-dom";
import { CrmLayout } from "@/features/crm/components/CrmLayout";
import CrmDashboard from "@/features/crm/pages/CrmDashboard";
import ProspectList from "@/features/crm/pages/ProspectList";
import ProspectDetail from "@/features/crm/pages/ProspectDetail";
import CampaignList from "@/features/crm/pages/CampaignList";

export default function Crm() {
  return (
    <Routes>
      <Route element={<CrmLayout />}>
        <Route index element={<CrmDashboard />} />
        <Route path="prospectos" element={<ProspectList />} />
        <Route path="prospectos/:id" element={<ProspectDetail />} />
        <Route path="campanas" element={<CampaignList />} />
      </Route>
    </Routes>
  );
}
