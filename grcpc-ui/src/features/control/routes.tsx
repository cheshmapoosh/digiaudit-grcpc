import { Route } from "react-router-dom";
import CentralControlsFclShellPage from "./pages/CentralControlsFclShellPage";

export const centralControlRoutes = (
  <>
    <Route path="/controls" element={<CentralControlsFclShellPage />} />
    <Route path="/controls/new" element={<CentralControlsFclShellPage />} />
    <Route path="/controls/:controlId" element={<CentralControlsFclShellPage />} />
    <Route path="/controls/:controlId/edit" element={<CentralControlsFclShellPage />} />
  </>
);
