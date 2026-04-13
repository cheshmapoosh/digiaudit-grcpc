import { Route } from "react-router-dom";
import ProcessesFclShellPage from "./pages/ProcessesFclShellPage";

export const processRoutes = (
    <>
        <Route path="/processes" element={<ProcessesFclShellPage />} />
        <Route path="/processes/new" element={<ProcessesFclShellPage />} />
        <Route path="/processes/:processId" element={<ProcessesFclShellPage />} />
        <Route path="/processes/:processId/edit" element={<ProcessesFclShellPage />} />
    </>
);