import { Route } from "react-router-dom";
import PoliciesFclShellPage from "./pages/PoliciesFclShellPage";

export const policyRoutes = (
    <>
        <Route path="/policies" element={<PoliciesFclShellPage />} />
        <Route path="/policies/new" element={<PoliciesFclShellPage />} />
        <Route path="/policies/:policyId" element={<PoliciesFclShellPage />} />
        <Route path="/policies/:policyId/edit" element={<PoliciesFclShellPage />} />
    </>
);
