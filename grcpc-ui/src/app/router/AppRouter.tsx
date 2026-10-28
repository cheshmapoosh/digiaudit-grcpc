import { BasicDataTypesPage } from "@/features/basic-data";
import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from "react-router-dom";

import ProfilesPage from "@/features/dataset-profile/pages/ProfilesPage";
import MainLayout from "../../layout/MainLayout";
import PublicLayout from "../../layout/components/PublicLayout";

import SetupGuard from "../guards/SetupGuard";
import BusinessAccessGuard from "../guards/BusinessAccessGuard";
import ChangeUsernamePage from "@/features/auth/pages/ChangeUsernamePage";
import ChangePasswordPage from "@/features/auth/pages/ChangePasswordPage";
import AuthGuard from "../guards/AuthGuard";

import NotFoundPage from "@/pages/NotFoundPage";
import ComingSoonPage from "@/pages/ComingSoonPage";
import AppRouterRoot from "./AppRouterRoot";

import {
    setupRoutes,
    loginRoutes,
    dashboardRoutes,
    masterDataRoutes,
    organizationRoutes,
    objectiveRoutes,
    globalControlRoutes,
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
                {objectiveRoutes}
                {globalControlRoutes}
                {processRoutes}
                {centralCatalogRoutes}
                {usermanagementRoutes}
                <Route path="/basic-data" element={<Navigate to="/basic-data/organization-types" replace />} />
                <Route path="/basic-data/organization-types" element={<BasicDataTypesPage key="organization-types" kind="organization-types" />} />
                <Route path="/basic-data/organization-types/:typeId" element={<BasicDataTypesPage key="organization-types" kind="organization-types" />} />
                <Route path="/basic-data/document-types" element={<BasicDataTypesPage key="document-types" kind="document-types" />} />
                <Route path="/basic-data/document-types/:typeId" element={<BasicDataTypesPage key="document-types" kind="document-types" />} />
                <Route path="/profiles" element={<ProfilesPage />} />
                <Route path="/profiles/:profileId" element={<ProfilesPage />} />
                <Route path="/settings/profiles" element={<Navigate to="/profiles" replace />} />
                <Route path="/coming-soon/:section" element={<ComingSoonPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Route>,
    ),
    { future: { v7_relativeSplatPath: true } },
);
