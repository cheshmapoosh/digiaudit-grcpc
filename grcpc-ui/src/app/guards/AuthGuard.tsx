import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { BusyIndicator } from "@ui5/webcomponents-react";

import { useAuthStatus } from "@/features/auth/service/auth.hook";

type AuthGuardProps = {
    children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
    const { authenticated, loading } = useAuthStatus();
    const location = useLocation();

    if (loading || authenticated === null) {
        return <BusyIndicator active />;
    }

    if (!authenticated) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return <>{children}</>;
}