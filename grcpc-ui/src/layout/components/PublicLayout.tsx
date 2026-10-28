import { Outlet, useLocation } from "react-router-dom";

import { AppFooter } from "@/shared/components/AppFooter";

export default function PublicLayout() {
    const { pathname } = useLocation();
    const hasAuthLayout = pathname === "/login" || pathname === "/setup";
    return (
        <div
            style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
        >
            <main
                style={{
                    flex: 1,
                    paddingBlockEnd: hasAuthLayout ? 0 : "2rem",
                }}
            >
                <Outlet />
            </main>

            {!hasAuthLayout && <AppFooter />}
        </div>
    );
}
