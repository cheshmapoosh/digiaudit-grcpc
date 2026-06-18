import { useEffect } from "react";

import { markInitialAppReady } from "./initialLoader";

export function useInitialAppReady(): void {
    useEffect(() => {
        markInitialAppReady();
    }, []);
}

