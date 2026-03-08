import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
    ShellBar,
    Button,
    SideNavigation,
    SideNavigationItem,
    SideNavigationSubItem
} from "@ui5/webcomponents-react";

import "./layout.css";

import UiSettingsMenu from "./components/UiSettingsMenu";
import UserProfileMenu from "./components/UserProfileMenu";
import NotificationMenu from "./components/NotificationMenu";

function getPathFromSelectionEvent(e: any): string | null {
    const item = e?.detail?.item ?? e?.detail?.selectedItem ?? null;
    const route = item?.dataset?.route ?? item?.getAttribute?.("data-route") ?? null;
    return route || null;
}

const SIDENAV_WIDTH = 280;
// در UI5 معمولاً 48 یا 56. اگر دیدی هنوز overlap هست، 48 را تست کن.
const SIDENAV_COLLAPSED_WIDTH = 56;

export default function MainLayout() {
    const { t } = useTranslation();

    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const selectedPath = useMemo(() => location.pathname, [location.pathname]);
    const sideNavWidth = collapsed ? SIDENAV_COLLAPSED_WIDTH : SIDENAV_WIDTH;

    const onSelectionChange = (e: any) => {
        const path = getPathFromSelectionEvent(e);
        if (path && path !== location.pathname) navigate(path);
    };

    // TODO: بعداً به state واقعی/Backend وصل شود
    const notifications: any[] = [
        {
            id: "1",
            title: t("notifications.sample1.title"),
            description: t("notifications.sample1.desc"),
            time: "5m",
            unread: true
        },
        {
            id: "2",
            title: t("notifications.sample2.title"),
            description: t("notifications.sample2.desc"),
            time: "Yesterday",
            unread: false
        }
    ];

    return (
        <div className="appRoot" data-ui5-compact-size>
            {/* ShellBar (global header) */}
            <ShellBar primaryTitle={t("app.title")} secondaryTitle={t("app.subtitle")}>
                <Button
                    slot="startButton"
                    icon="menu2"
                    design="Transparent"
                    onClick={() => setCollapsed((v) => !v)}
                />

                <UiSettingsMenu />

                <NotificationMenu
                    items={notifications}
                    onOpenItem={(n: any) => console.log("open notification", n.id)}
                    onMarkAllRead={() => console.log("mark all as read")}
                />

                <UserProfileMenu
                    fullName="Abbas"
                    email="abbas@example.com"
                    onOpenProfile={() => navigate("/profile")}
                    onLogout={() => navigate("/login")}
                />
            </ShellBar>

            {/* Body: SideNav + Content */}
            <div className="appBody">
                <aside
                    className="sideNav"
                    style={{
                        width: sideNavWidth,
                        flex: `0 0 ${sideNavWidth}px`
                    }}
                >
                    <SideNavigation collapsed={collapsed} onSelectionChange={onSelectionChange}>
                        <div slot="header" style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                            {collapsed ? t("app.title") : t("app.platformTitle")}
                        </div>

                        <SideNavigationItem
                            text={t("nav.dashboard")}
                            icon="home"
                            selected={selectedPath.startsWith("/dashboard")}
                            data-route="/dashboard"
                        />

                        <SideNavigationItem text={t("nav.accessControl")} icon="key-user-settings">
                            <SideNavigationSubItem
                                text={t("nav.roles")}
                                icon="role"
                                selected={selectedPath.startsWith("/access-control/roles")}
                                data-route="/access-control/roles"
                            />
                        </SideNavigationItem>

                        {/* Organizations */}
                        <SideNavigationItem
                            text={t("nav.organizations")}
                            icon="org-chart"
                            selected={selectedPath.startsWith("/organizations")}
                            data-route="/organizations"
                        />
                        <SideNavigationItem
                            text={t("nav.processes")}
                            icon="process"
                            selected={selectedPath.startsWith("/processes")}
                            data-route="/processes"
                        />
                        <SideNavigationItem
                            text={t("nav.regulation", "قوانین و مقررات")}
                            icon="process"
                            selected={selectedPath.startsWith("/regulations")}
                            data-route="/regulations"
                        />

                        <SideNavigationItem
                            slot="fixedItems"
                            text={t("nav.help")}
                            icon="sys-help"
                            data-route="/help"
                            selected={selectedPath.startsWith("/help")}
                        />
                    </SideNavigation>
                </aside>

                <main className="mainContent">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
