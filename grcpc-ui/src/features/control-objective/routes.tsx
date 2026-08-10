import { Route } from "react-router-dom";
import CentralControlObjectivesFclShellPage from "./pages/CentralControlObjectivesFclShellPage";

export const centralControlObjectiveRoutes = (
  <>
    <Route path="/control-objectives" element={<CentralControlObjectivesFclShellPage />} />
    <Route path="/control-objectives/new" element={<CentralControlObjectivesFclShellPage />} />
    <Route path="/control-objectives/:controlObjectiveId" element={<CentralControlObjectivesFclShellPage />} />
    <Route path="/control-objectives/:controlObjectiveId/edit" element={<CentralControlObjectivesFclShellPage />} />
  </>
);
