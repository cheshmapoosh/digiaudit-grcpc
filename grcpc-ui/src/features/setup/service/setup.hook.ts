import { useEffect } from "react";

import { useSetupState } from "@/features/setup";

export function useSetupStatus() {
    const status = useSetupState((state) => state.status);
    const loading = useSetupState((state) => state.loading);
    const loadStatus = useSetupState((state) => state.loadStatus);

    useEffect(() => {
        if (status !== null) {
            return;
        }

        void loadStatus();
    }, [status, loadStatus]);

    return {
        status,
        initialized: status?.initialized ?? null,
        loading,
    };
}