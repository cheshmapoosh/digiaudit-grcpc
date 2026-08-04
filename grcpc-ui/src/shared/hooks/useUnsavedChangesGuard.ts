import { useCallback, useEffect, useRef } from "react";
import { useBeforeUnload, useBlocker, useLocation } from "react-router-dom";

export function useUnsavedChangesGuard(dirty: boolean) {
    const bypassRef = useRef(false);
    const location = useLocation();
    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        const locationChanges = `${currentLocation.pathname}${currentLocation.search}`
            !== `${nextLocation.pathname}${nextLocation.search}`;
        if (!dirty || !locationChanges) return false;
        if (bypassRef.current) {
            bypassRef.current = false;
            return false;
        }
        return true;
    });

    useEffect(() => {
        bypassRef.current = false;
    }, [location.key]);

    useBeforeUnload(useCallback((event) => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    }, [dirty]));

    const runWithNavigationBypass = useCallback((action: () => void) => {
        bypassRef.current = true;
        try {
            action();
        } catch (error) {
            bypassRef.current = false;
            throw error;
        }
        queueMicrotask(() => {
            bypassRef.current = false;
        });
    }, []);

    return { blocker, runWithNavigationBypass };
}
