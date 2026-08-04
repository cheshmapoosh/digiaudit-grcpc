import { useCallback, useEffect, useRef } from "react";
import { useBeforeUnload, useBlocker, useLocation } from "react-router-dom";

export function useUnsavedChangesGuard(dirty: boolean) {
    const bypassRef = useRef(false);
    const location = useLocation();
    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        dirty
        && !bypassRef.current
        && `${currentLocation.pathname}${currentLocation.search}`
            !== `${nextLocation.pathname}${nextLocation.search}`,
    );

    useEffect(() => {
        bypassRef.current = false;
    }, [location.key]);

    useBeforeUnload(useCallback((event) => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    }, [dirty]));

    const allowNextNavigation = useCallback(() => {
        bypassRef.current = true;
    }, []);

    return { blocker, allowNextNavigation };
}
