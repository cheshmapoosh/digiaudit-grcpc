import { MASTER_DATA_AREAS, canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import {useEffect, useMemo, useState} from "react";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

import {
    Button,
    FlexBox,
    Input,
    Link,
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

const SIDENAV_WIDTH = 216;
const SIDENAV_COLLAPSED_WIDTH = 56;
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

const MASTER_DATA_PATH_PREFIXES = [
    "/master-data",
    "/organizations",
    "/processes",
    "/controls",
    "/global-controls",
    "/control-objectives",
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

    const {t, i18n} = useTranslation();

    const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 42rem)").matches);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 42rem)");
        const updateCollapsed = (event: MediaQueryListEvent) => setCollapsed(event.matches);
        media.addEventListener("change", updateCollapsed);
        return () => media.removeEventListener("change", updateCollapsed);
    }, []);

    const navigate = useNavigate();
    const location = useLocation();

    const me = useAuthState((state) => state.me);
    const logout = useAuthState((state) => state.logout);

    const selectedPath = useMemo(() => location.pathname, [location.pathname]);
    const isMasterDataPage = selectedPath === "/master-data";
    const masterDataSearch = isMasterDataPage ? new URLSearchParams(location.search).get("q") ?? "" : "";
    const sideNavWidth = collapsed ? SIDENAV_COLLAPSED_WIDTH : SIDENAV_WIDTH;

    function navigateToMasterDataSearch(value: string) {
        navigate({ pathname: "/master-data", search: value ? `?q=${encodeURIComponent(value)}` : "" }, { replace: true });
    }

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
            text: t("nav.home"),
            icon: "home",
            route: "/dashboard",
            selected: selectedPath.startsWith("/dashboard"),
        },
        {
            key: "masterData",
            text: t("nav.governance"),
            icon: "shield",
            route: "/master-data",
            selected: isPathInPrefixes(selectedPath, MASTER_DATA_PATH_PREFIXES),
        },
        { key: "risk", text: t("nav.riskManagement"), icon: "alert", route: "/coming-soon/risk-management", selected: selectedPath === "/coming-soon/risk-management" },
        { key: "compliance", text: t("nav.complianceManagement"), icon: "document-text", route: "/coming-soon/compliance", selected: selectedPath === "/coming-soon/compliance" },
        { key: "audit", text: t("nav.internalAuditManagement"), icon: "search", route: "/coming-soon/internal-audit", selected: selectedPath === "/coming-soon/internal-audit" },
        { key: "reports", text: t("nav.reports"), icon: "pie-chart", route: "/coming-soon/reports", selected: selectedPath === "/coming-soon/reports" },
        { key: "settings", text: t("nav.settings"), icon: "action-settings", route: "/coming-soon/settings", selected: selectedPath === "/coming-soon/settings" },
    ];

    return (
        <div className={`appRoot${isMasterDataPage ? " appRoot--masterData" : ""}${collapsed ? " appRoot--sideNavCollapsed" : ""}`} dir={i18n.language.startsWith("fa") ? "rtl" : "ltr"} data-ui5-compact-size>
            <FlexBox className="governanceHeader" dir="ltr">
                <img className="governanceHeaderLogo" src="/images/digi-audit-mark.svg" alt="Digi Audit" />
                <UserProfileMenu
                    trigger="button"
                    fullName={fullName}
                    onOpenProfile={() => navigate("/profile")}
                    onChangeUsername={() => navigate("/change-username")}
                    onChangePassword={() => navigate("/change-password")}
                    onLogout={() => void handleLogout()}
                />
                <UiSettingsMenu trigger="button" />
                <div className="governanceHeaderSearch">
                    <Input
                        value={masterDataSearch}
                        placeholder={t("masterData.searchPlaceholder")}
                        accessibleName={t("masterData.searchLabel")}
                        icon={<Button design="Transparent" icon="search" accessibleName={t("masterData.searchLabel")} onClick={() => navigateToMasterDataSearch(masterDataSearch)} />}
                        onInput={(event) => navigateToMasterDataSearch(event.target.value)}
                    />
                </div>
                <FlexBox className="governanceHeaderActions" dir="ltr">
                    <NotificationMenu trigger="button" items={EMPTY_NOTIFICATIONS} />
                    <Button icon="menu2" design="Transparent" accessibleName={t("nav.menu")} onClick={() => setCollapsed((value) => !value)} />
                </FlexBox>
            </FlexBox>

            <div className="appBody" dir={i18n.language.startsWith("fa") ? "rtl" : "ltr"}>
                <aside
                    className="sideNav"
                    style={{ width: sideNavWidth }}
                >
                    <div className="sideNavBrand">
                        <Link className="sideNavBrandLink" accessibleName={t("nav.home")} onClick={() => navigateToPath("/dashboard")}>
                            {collapsed ? <img className="sideNavBrandMark" src="/images/digi-audit-mark-light.svg" alt="" /> : <img className="sideNavBrandWordmark" src="/images/digi-audit-wordmark-light.svg" alt="" />}
                        </Link>
                    </div>
                    <SideNavigation collapsed={collapsed} onSelectionChange={onSelectionChange}>
                        {mainItems.filter((item) => item.key !== "masterData" || MASTER_DATA_AREAS.some((area) => canAccessMasterData(me, area))).map((item) => (
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
                                text={t("nav.userManagement")}
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
        </div>
    );
}
