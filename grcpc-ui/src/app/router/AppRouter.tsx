import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../../layout/MainLayout";
import {
    dashboardRoutes,
    organizationRoutes,
    processRoutes,
    regulationRoutes,
} from "@/features";

export default function AppRouter() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                {dashboardRoutes}
                {organizationRoutes}
                {processRoutes}
                {regulationRoutes}
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}