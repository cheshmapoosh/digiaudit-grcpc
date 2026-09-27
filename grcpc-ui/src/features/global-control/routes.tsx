import { Route } from "react-router-dom";
import GlobalControlManagementPage from "./pages/GlobalControlManagementPage";

export const globalControlRoutes = (
  <Route path="/global-controls" element={<GlobalControlManagementPage />} />
);
