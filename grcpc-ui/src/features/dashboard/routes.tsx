import { Route } from "react-router-dom";
import DashboardPage from "./pages/MasterDataDashboardPage";

export const dashboardRoutes = (
    <Route path="/dashboard" element={<DashboardPage />} />
);
