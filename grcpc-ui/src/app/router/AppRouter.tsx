import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from "react-router-dom";

import MainLayout from "../../layout/MainLayout";
import PublicLayout from "../../layout/components/PublicLayout";

import SetupGuard from "../guards/SetupGuard";
import AuthGuard from "../guards/AuthGuard";

import NotFoundPage from "@/pages/NotFoundPage";
import AppRouterRoot from "./AppRouterRoot";

import {
    setupRoutes,
    loginRoutes,
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

export const appRouter = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<AppRouterRoot />}>
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
        </Route>,
    ),
    { future: { v7_relativeSplatPath: true } },
);
