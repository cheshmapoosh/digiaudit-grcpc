import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../../layout/MainLayout";
import SetupGuard from "../guards/SetupGuard";
import AuthGuard from "../guards/AuthGuard";
import LoginPageGuard from "../guards/LoginPageGuard";
import NotFoundPage from "@/pages/NotFoundPage";
import LoginPage from "@/pages/LoginPage";
import {
    setupRoutes,
    dashboardRoutes,
    organizationRoutes,
    processRoutes,
    regulationRoutes,
    usermanagementRoutes,
} from "@/features";

export default function AppRouter() {
    return (
        <Routes>
            {setupRoutes}

            <Route
                path="/login"
                element={
                    <LoginPageGuard>
                        <LoginPage />
                    </LoginPageGuard>
                }
            />

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
                {organizationRoutes}
                {processRoutes}
                {regulationRoutes}
                {usermanagementRoutes}
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}