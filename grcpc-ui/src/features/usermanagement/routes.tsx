import { Route } from "react-router-dom";
import UsersFclShellPage from "./pages/UsersFclShellPage";
import RolesFclShellPage from "./pages/RolesFclShellPage";
import LoginPageGuard from "@/app/guards/LoginPageGuard.tsx";
import LoginPage from "@/pages/LoginPage.tsx";

export const usermanagementRoutes = (
    <>
        <Route path="/access-control/users" element={<UsersFclShellPage />} />
        <Route path="/access-control/users/:userId" element={<UsersFclShellPage />} />
        <Route path="/access-control/roles" element={<RolesFclShellPage />} />
        <Route path="/access-control/roles/:roleId" element={<RolesFclShellPage />} />
    </>
);

export const loginRoutes = (<Route
        path="/login"
        element={
            <LoginPageGuard>
                <LoginPage />
            </LoginPageGuard>
        }
    />
);
