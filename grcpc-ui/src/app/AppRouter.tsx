// src/app/AppRouter.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

import DashboardPage from "../pages/DashboardPage";
import RolesListPage from "../pages/RolesListPage";
import RoleObjectPage from "../pages/RoleObjectPage";
import Organizations from "../pages/organizations";
import Processes from "../pages/processes";
export default function AppRouter() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />

                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/access-control/roles" element={<RolesListPage />} />
                <Route path="/access-control/roles/:roleId" element={<RoleObjectPage />} />

                {/* ✅ Organizations with FCL (SAP-like) */}
                <Route path="/organizations" element={<Organizations />} />
                <Route path="/organizations/new" element={<Organizations />} />
                <Route path="/organizations/:orgId" element={<Organizations />} />
                <Route path="/organizations/:orgId/edit" element={<Organizations />} />

                {/* ✅ Processes with FCL (SAP-like) */}
                <Route path="/processes" element={<Processes />} />
                {/* backward compatible */}
                <Route path="/org" element={<Navigate to="/organizations" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
