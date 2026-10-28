import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppToast from "@/shared/components/AppToast";
import SessionExpiredRedirector from "@/features/auth/components/SessionExpiredRedirector";

export default function AppRouterRoot() {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        // Native density applies to lists, trees, dialog top layers and React portals.
        const compact = pathname !== "/login";
        document.documentElement.toggleAttribute("data-ui5-compact-size", compact);
        document.body.toggleAttribute("data-ui5-compact-size", compact);
    }, [pathname]);
    return <div><SessionExpiredRedirector /><Outlet /><AppToast /></div>;
}
