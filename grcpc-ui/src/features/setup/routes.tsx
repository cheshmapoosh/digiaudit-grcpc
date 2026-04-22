import { Route } from "react-router-dom";

import SetupPageGuard from "@/app/guards/SetupPageGuard";
import SetupFeaturePage from "./pages/SetupFeaturePage";

export const setupRoutes = (
    <Route
        path="/setup"
        element={
            <SetupPageGuard>
                <SetupFeaturePage />
            </SetupPageGuard>
        }
    />
);