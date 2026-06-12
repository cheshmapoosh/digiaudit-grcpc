import { Route } from "react-router-dom";

import ControlsFclShellPage from "./pages/ControlsFclShellPage";

export const controlRoutes = (
    <>
        <Route path="/controls" element={<ControlsFclShellPage />} />
        <Route path="/controls/:controlAssignmentId" element={<ControlsFclShellPage />} />
        <Route path="/controls/:controlAssignmentId/edit" element={<ControlsFclShellPage />} />
    </>
);
