import { Route } from "react-router-dom";
import RisksFclShellPage from "./pages/RisksFclShellPage";

export const riskRoutes = (
    <>
        <Route path="/risks" element={<RisksFclShellPage />} />
        <Route path="/risks/new" element={<RisksFclShellPage />} />
        <Route path="/risks/:riskId" element={<RisksFclShellPage />} />
        <Route path="/risks/:riskId/edit" element={<RisksFclShellPage />} />
    </>
);
