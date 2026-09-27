import { Outlet, useLocation } from "react-router-dom";

import { AppFooter } from "@/shared/components/AppFooter";

export default function PublicLayout() {
    const { pathname } = useLocation();
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--sapBackgroundColor)",
            }}
        >
            <main
                style={{
                    flex: 1,
                    paddingBlockEnd: pathname === "/login" ? 0 : "2rem",
                }}
            >
                <Outlet />
            </main>

            {pathname !== "/login" && <AppFooter />}
        </div>
    );
}
