import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { BusyIndicator } from "@ui5/webcomponents-react";

import { useSetupStatus } from "@/features/setup/service/setup.hook";
import { useAuthStatus } from "@/features/auth/service/auth.hook";

type LoginPageGuardProps = {
    children: ReactNode;
};

export default function LoginPageGuard({ children }: LoginPageGuardProps) {
    const { initialized, loading: setupLoading } = useSetupStatus();
    const { authenticated, loading: authLoading } = useAuthStatus();

    if (setupLoading || initialized === null) {
        return <BusyIndicator active />;
    }

    if (!initialized) {
        return <Navigate to="/setup" replace />;
    }

    if (authLoading || authenticated === null) {
        return <BusyIndicator active />;
    }

    if (authenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}