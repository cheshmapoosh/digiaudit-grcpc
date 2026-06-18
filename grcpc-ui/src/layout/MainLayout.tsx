import {useMemo, useState} from "react";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

import {
    Button,
    ShellBar,
    SideNavigation,
    SideNavigationItem,
    SideNavigationSubItem,
} from "@ui5/webcomponents-react";

import "./layout.css";

import UiSettingsMenu from "./components/UiSettingsMenu";
import NotificationMenu, {
    type NotificationItem,
} from "./components/NotificationMenu";
import UserProfileMenu from "./components/UserProfileMenu";
import {useAuthState} from "@/features/auth";
import {AppFooter} from "@/shared/components/AppFooter.tsx";
import { useInitialAppReady } from "@/shared/bootstrap/useInitialAppReady";

type SelectionChangeDetail = {
    item?: HTMLElement;
    selectedItem?: HTMLElement;
};

type SelectionChangeEvent = {
    detail?: SelectionChangeDetail;
};

type NavItem = {
    key: string;
    text: string;
    icon: string;
    route: string;
    selected: boolean;
};

function getPathFromSelectionEvent(event: SelectionChangeEvent): string | null {
    const item = event.detail?.item ?? event.detail?.selectedItem ?? null;
    const route =
        item?.dataset?.route ?? item?.getAttribute?.("data-route") ?? null;

    return route || null;
}

const SIDENAV_WIDTH = 280;
const SIDENAV_COLLAPSED_WIDTH = 56;

const MASTER_DATA_PATH_PREFIXES = [
    "/master-data",
    "/organizations",
    "/processes",
    "/objectives",
    "/regulations",
    "/risks",
    "/account-groups",
    "/policies",
];

function hasAnyAuthority(authorities: Set<string>, required: string[]): boolean {
    return required.some((authority) => authorities.has(authority));
}

function isPathInPrefixes(path: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export default function MainLayout() {
    useInitialAppReady();

    const {t} = useTranslation();

    const [collapsed, setCollapsed] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const me = useAuthState((state) => state.me);
    const logout = useAuthState((state) => state.logout);

    const selectedPath = useMemo(() => location.pathname, [location.pathname]);
    const sideNavWidth = collapsed ? SIDENAV_COLLAPSED_WIDTH : SIDENAV_WIDTH;

    const notifications: NotificationItem[] = [
        {
            id: "1",
            title: t("notifications.sample1.title"),
            description: t("notifications.sample1.desc"),
            time: "5m",
            unread: true,
        },
        {
            id: "2",
            title: t("notifications.sample2.title"),
            description: t("notifications.sample2.desc"),
            time: "Yesterday",
            unread: false,
        },
    ];

    async function handleLogout() {
        try {
            await logout();
            navigate("/login", {replace: true});
        } catch {
            // بعدا toast یا MessageStrip اضافه می‌کنیم
        }
    }

    function navigateToPath(path: string) {
        if (path !== location.pathname) {
            navigate(path);
        }
    }

    function onSelectionChange(event: SelectionChangeEvent) {
        const path = getPathFromSelectionEvent(event);
        if (path) {
            navigateToPath(path);
        }
    }

    const fullName =
        me?.firstName && me?.lastName
            ? `${me.firstName} ${me.lastName}`
            : me?.username ?? t("user.unknown", {defaultValue: "کاربر"});

    const authoritySet = useMemo(
        () => new Set(me?.authorities ?? []),
        [me?.authorities],
    );

    const isRootAdmin =
        Boolean(me?.rootUser) ||
        authoritySet.has("ROLE_ROOT") ||
        authoritySet.has("ROLE_ROOT_ADMIN");

    const canViewUsers =
        isRootAdmin ||
        hasAnyAuthority(authoritySet, [
            "USER_VIEW",
            "USER_CREATE",
            "USER_EDIT",
            "USER_DISABLE",
            "USER_ASSIGN_ROLE",
        ]);

    const canViewRoles =
        isRootAdmin ||
        hasAnyAuthority(authoritySet, [
            "ROLE_VIEW",
            "ROLE_CREATE",
            "ROLE_EDIT",
            "ROLE_ASSIGN_PERMISSION",
            "ROLE_ASSIGN_BUSINESS_PERMISSION",
            "ROLE_ASSIGN_DELEGATION",
        ]);

    const showAccessControl = canViewUsers || canViewRoles;

    const mainItems: NavItem[] = [
        {
            key: "dashboard",
            text: t("nav.dashboard"),
            icon: "home",
            route: "/dashboard",
            selected: selectedPath.startsWith("/dashboard"),
        },
        {
            key: "masterData",
            text: t("nav.masterData", {defaultValue: "اطلاعات پایه"}),
            icon: "database",
            route: "/master-data",
            selected: isPathInPrefixes(selectedPath, MASTER_DATA_PATH_PREFIXES),
        },
    ];

    return (
        <div className="appRoot" data-ui5-compact-size
             style={{
                 minHeight: "100vh",
                 paddingBottom: "2rem",
             }}
        >
            <ShellBar primaryTitle={t("app.title")} secondaryTitle={t("app.subtitle")}>
                <Button
                    slot="startButton"
                    icon="menu2"
                    design="Transparent"
                    onClick={() => setCollapsed((value) => !value)}
                />

                <UiSettingsMenu/>

                <NotificationMenu
                    items={notifications}
                    onOpenItem={(item) => console.log("open notification", item.id)}
                    onMarkAllRead={() => console.log("mark all as read")}
                />

                <UserProfileMenu
                    fullName={fullName}
                    email={undefined}
                    onOpenProfile={() => navigate("/profile")}
                    onLogout={() => void handleLogout()}
                />
            </ShellBar>

            <div className="appBody">
                <aside
                    className="sideNav"
                    style={{
                        width: sideNavWidth,
                        flex: `0 0 ${sideNavWidth}px`,
                    }}
                >
                    <SideNavigation collapsed={collapsed} onSelectionChange={onSelectionChange}>
                        <div slot="header" style={{padding: 12, fontSize: 12, opacity: 0.8}}>
                            {collapsed ? t("app.title") : t("app.platformTitle")}
                        </div>

                        {mainItems.map((item) => (
                            <SideNavigationItem
                                key={item.key}
                                text={item.text}
                                icon={item.icon}
                                selected={item.selected}
                                data-route={item.route}
                                onClick={() => navigateToPath(item.route)}
                            />
                        ))}

                        {showAccessControl ? (
                            <SideNavigationItem
                                text={t("nav.accessControl")}
                                icon="key-user-settings"
                                selected={selectedPath.startsWith("/access-control")}
                            >
                                {canViewUsers ? (
                                    <SideNavigationSubItem
                                        text={t("nav.users", {defaultValue: "کاربران"})}
                                        icon="group"
                                        selected={selectedPath.startsWith("/access-control/users")}
                                        data-route="/access-control/users"
                                    />
                                ) : null}

                                {canViewRoles ? (
                                    <SideNavigationSubItem
                                        text={t("nav.roles")}
                                        icon="role"
                                        selected={selectedPath.startsWith("/access-control/roles")}
                                        data-route="/access-control/roles"
                                    />
                                ) : null}
                            </SideNavigationItem>
                        ) : null}

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
                    <Outlet/>
                </main>
            </div>
            <AppFooter />
        </div>
    );
}
