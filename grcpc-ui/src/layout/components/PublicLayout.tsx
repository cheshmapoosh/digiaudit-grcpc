import { Outlet } from "react-router-dom";

import { AppFooter } from "@/shared/components/AppFooter";

export default function PublicLayout() {
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
                    paddingBlockEnd: "2rem",
                }}
            >
                <Outlet />
            </main>

            <AppFooter />
        </div>
    );
}