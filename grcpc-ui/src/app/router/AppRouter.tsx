import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from "react-router-dom";

import MainLayout from "../../layout/MainLayout";
import PublicLayout from "../../layout/components/PublicLayout";

import SetupGuard from "../guards/SetupGuard";
import BusinessAccessGuard from "../guards/BusinessAccessGuard";
import ChangeUsernamePage from "@/features/auth/pages/ChangeUsernamePage";
import ChangePasswordPage from "@/features/auth/pages/ChangePasswordPage";
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
    centralCatalogRoutes,
    usermanagementRoutes,
} from "@/features";

export const appRouter = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<AppRouterRoot />}>
            <Route element={<PublicLayout />}>
                {setupRoutes}
                {loginRoutes}
                <Route path="/change-username" element={<AuthGuard><ChangeUsernamePage /></AuthGuard>} />
                <Route path="/change-password" element={<AuthGuard><ChangePasswordPage /></AuthGuard>} />
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
                <Route element={<BusinessAccessGuard />}>
                {dashboardRoutes}
                {masterDataRoutes}
                {organizationRoutes}
                {processRoutes}
                {centralCatalogRoutes}
                {usermanagementRoutes}
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Route>,
    ),
    { future: { v7_relativeSplatPath: true } },
);
