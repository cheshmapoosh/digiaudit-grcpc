import { Outlet } from "react-router-dom";
import AppToast from "@/shared/components/AppToast";
import SessionExpiredRedirector from "@/features/auth/components/SessionExpiredRedirector";

export default function AppRouterRoot() {
    return <div><SessionExpiredRedirector /><Outlet /><AppToast /></div>;
}
