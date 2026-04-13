import { Route } from "react-router-dom";
import OrganizationsFclShellPage from "./pages/OrganizationsFclShellPage";

export const organizationRoutes = (
    <>
        <Route path="/organizations" element={<OrganizationsFclShellPage />} />
        <Route path="/organizations/new" element={<OrganizationsFclShellPage />} />
        <Route path="/organizations/:organizationId" element={<OrganizationsFclShellPage />} />
        <Route path="/organizations/:organizationId/edit" element={<OrganizationsFclShellPage />} />
    </>
);