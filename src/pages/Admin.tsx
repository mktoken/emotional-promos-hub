import { Routes, Route, Navigate } from "react-router-dom";
import { CrmLayout } from "@/features/crm/components/CrmLayout";
import GovernanceConsole from "@/features/catalog-governance/pages/GovernanceConsole";
import GovernanceProductDetail from "@/features/catalog-governance/pages/GovernanceProductDetail";

export default function Admin() {
  return (
    <Routes>
      <Route element={<CrmLayout />}>
        <Route path="catalog-governance" element={<GovernanceConsole />} />
        <Route path="catalog-governance/products/:producto_b2b_id" element={<GovernanceProductDetail />} />
        <Route path="*" element={<Navigate to="/admin/catalog-governance" replace />} />
      </Route>
    </Routes>
  );
}
