import { Route } from "react-router-dom";
import LoginFeaturePage from "./pages/LoginFeaturePage";

export const authRoutes = (
    <>
        <Route path="/login" element={<LoginFeaturePage />} />
    </>
);
