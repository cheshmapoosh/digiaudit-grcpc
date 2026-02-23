// src/app/AppRouter.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

import DashboardPage from "../pages/DashboardPage";
import RolesListPage from "../pages/RolesListPage";
import RoleObjectPage from "../pages/RoleObjectPage";
import Organizations from "../pages/organizations";
import Processes from "../pages/processes";
import Regulation from "../pages/regulations";
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
                <Route path="/processes/new" element={<Processes />} />
                <Route path="/processes/:processId" element={<Processes />} />
                <Route path="/processes/:processId/edit" element={<Processes />} />

                {/* ✅ Regulations with FCL (SAP-like) */}
                <Route path="/regulations" element={<Regulation />} />
                <Route path="/regulations/new" element={<Regulation />} />
                <Route path="/regulations/:processId" element={<Regulation />} />
                <Route path="/regulations/:regulationId/edit" element={<Regulation />} />

            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
