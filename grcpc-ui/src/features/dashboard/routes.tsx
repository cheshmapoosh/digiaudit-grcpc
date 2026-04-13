import { Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardFeaturePage";

export const dashboardRoutes = (
    <Route path="/dashboard" element={<DashboardPage />} />
);
