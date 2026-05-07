import { Route } from "react-router-dom";
import ObjectivesFclShellPage from "./pages/ObjectivesFclShellPage";

export const objectiveRoutes = (
    <>
        <Route path="/objectives" element={<ObjectivesFclShellPage />} />
        <Route path="/objectives/new" element={<ObjectivesFclShellPage />} />
        <Route path="/objectives/:objectiveId" element={<ObjectivesFclShellPage />} />
        <Route path="/objectives/:objectiveId/edit" element={<ObjectivesFclShellPage />} />
    </>
);
