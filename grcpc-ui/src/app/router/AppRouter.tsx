import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../../layout/MainLayout";
import PublicLayout from "../../layout/components/PublicLayout";

import SetupGuard from "../guards/SetupGuard";
import AuthGuard from "../guards/AuthGuard";

import NotFoundPage from "@/pages/NotFoundPage";

import {
    setupRoutes,
    loginRoutes,
    controlRoutes,
    dashboardRoutes,
    masterDataRoutes,
    organizationRoutes,
    processRoutes,
    regulationRoutes,
    policyRoutes,
    riskRoutes,
    objectiveRoutes,
    accountGroupRoutes,
    usermanagementRoutes,
} from "@/features";

export default function AppRouter() {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                {setupRoutes}
                {loginRoutes}
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
                element={
                    <SetupGuard>
                        <AuthGuard>
                            <MainLayout />
                        </AuthGuard>
                    </SetupGuard>
                }
            >
                {dashboardRoutes}
                {masterDataRoutes}
                {controlRoutes}
                {organizationRoutes}
                {processRoutes}
                {regulationRoutes}
                {policyRoutes}
                {riskRoutes}
                {objectiveRoutes}
                {accountGroupRoutes}
                {usermanagementRoutes}

                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
