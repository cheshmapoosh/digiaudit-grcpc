import { useEffect } from "react";

import { useAuthState } from "@/features/auth";

export function useAuthStatus() {
    const me = useAuthState((state) => state.me);
    const loading = useAuthState((state) => state.loading);
    const loadMe = useAuthState((state) => state.loadMe);

    useEffect(() => {
        if (me !== null) {
            return;
        }

        void loadMe();
    }, [me, loadMe]);

    return {
        me,
        authenticated: me?.authenticated ?? null,
        loading,
    };
}