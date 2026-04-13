import { Route } from "react-router-dom";
import RegulationsFclShellPage from "./pages/RegulationsFclShellPage";

export const regulationRoutes = (
    <>
        <Route path="/regulations" element={<RegulationsFclShellPage />} />
        <Route path="/regulations/new" element={<RegulationsFclShellPage />} />
        <Route path="/regulations/:regulationId" element={<RegulationsFclShellPage />} />
        <Route path="/regulations/:regulationId/edit" element={<RegulationsFclShellPage />} />
    </>
);