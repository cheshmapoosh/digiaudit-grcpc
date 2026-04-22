import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { BusyIndicator } from "@ui5/webcomponents-react";

import { useSetupStatus } from "@/features/setup/service/setup.hook";

type SetupGuardProps = {
    children: ReactNode;
};

export default function SetupGuard({ children }: SetupGuardProps) {
    const { initialized, loading } = useSetupStatus();

    if (loading || initialized === null) {
        return <BusyIndicator active />;
    }

    if (!initialized) {
        return <Navigate to="/setup" replace />;
    }

    return <>{children}</>;
}