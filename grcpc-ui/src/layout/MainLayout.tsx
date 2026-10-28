import ProfileSelector from "@/features/dataset-profile/components/ProfileSelector";
import { useProfileState } from "@/features/dataset-profile/state/profile.state";
import { MASTER_DATA_AREAS, canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import {useMemo, useRef, useState} from "react";
import { isPhone } from "@ui5/webcomponents-base/dist/Device.js";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

import {
    Avatar,
    Button,
    Breadcrumbs,
    BreadcrumbsItem,
    FlexBox,
    Link,
    NavigationLayout,
    ShellBar,
    SideNavigation,
    SideNavigationItem,
    SideNavigationSubItem,
    type NavigationLayoutDomRef,
} from "@ui5/webcomponents-react";

import "./layout.css";

import { userInitials } from "./userInitials";
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
    preventDefault?: () => void;
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

const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

// Catalog URLs are flat, but their navigation parent is Governance and Control.
const MASTER_DATA_CATALOG_ROUTES = [
    { route: "/organizations", labelKey: "masterData.items.organizations" },
    { route: "/processes", labelKey: "masterData.items.processes" },
    { route: "/controls", labelKey: "masterData.items.controls" },
    { route: "/global-controls", labelKey: "masterData.items.globalControls" },
    { route: "/control-objectives", labelKey: "masterData.items.objectives" },
    { route: "/objectives", labelKey: "masterData.items.businessObjectives" },
    { route: "/regulations", labelKey: "masterData.items.regulations" },
    { route: "/risks", labelKey: "masterData.items.risks" },
    { route: "/account-groups", labelKey: "masterData.items.accountGroups" },
    { route: "/policies", labelKey: "masterData.items.policies" },
];
const MASTER_DATA_PATH_PREFIXES = ["/master-data", ...MASTER_DATA_CATALOG_ROUTES.map((item) => item.route)];

function isPathInPrefixes(path: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export default function MainLayout() {
    useInitialAppReady();
    useProfileState((state) => state.profiles);

    const {t, i18n} = useTranslation();

    const navigationLayoutRef = useRef<NavigationLayoutDomRef>(null);
    const [navigationMode, setNavigationMode] = useState<"Auto" | "Collapsed" | "Expanded">("Auto");
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [userMenuOpener, setUserMenuOpener] = useState<HTMLElement | null>(null);

    const navigate = useNavigate();
    const location = useLocation();

    const me = useAuthState((state) => state.me);
    const logout = useAuthState((state) => state.logout);

    const selectedPath = useMemo(() => location.pathname, [location.pathname]);

    async function handleLogout() {
        try {
            await logout();
            navigate("/login", {replace: true});
        } catch {
            // بعدا toast یا MessageStrip اضافه می‌کنیم
        }
    }

    function navigateToPath(path: string) {
        if (isPhone()) setNavigationMode("Auto");
        if (path !== location.pathname) {
            navigate(path);
        }
    }

    function onSelectionChange(event: SelectionChangeEvent) {
        // Route state remains authoritative if an unsaved-changes guard blocks navigation.
        event.preventDefault?.();
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

    const isRootAdmin = Boolean(me?.rootUser);
    const canViewUsers = isRootAdmin || authoritySet.has("ROLE_PROFILE_ADMIN");
    const canViewRoles = isRootAdmin;

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
    ];

    const currentSection = mainItems.find((item) => item.selected);
    const currentCatalog = MASTER_DATA_CATALOG_ROUTES.find((item) => isPathInPrefixes(selectedPath, [item.route]));
    const breadcrumbItems = [{ route: "/dashboard", text: t("nav.home") }];
    if (selectedPath !== "/dashboard") {
        if (currentSection) {
            breadcrumbItems.push({ route: currentSection.route, text: currentSection.text });
            if (currentCatalog) breadcrumbItems.push({ route: currentCatalog.route, text: t(currentCatalog.labelKey) });
        } else if (isPathInPrefixes(selectedPath, ["/access-control"])) {
            breadcrumbItems.push({ route: "/access-control/users", text: t("nav.userManagement") });
            const roles = isPathInPrefixes(selectedPath, ["/access-control/roles"]);
            breadcrumbItems.push({ route: roles ? "/access-control/roles" : "/access-control/users", text: t(roles ? "nav.roles" : "nav.users") });
        } else if (isPathInPrefixes(selectedPath, ["/profiles"])) {
            breadcrumbItems.push({ route: "/profiles", text: t("profile.management") });
        } else {
            breadcrumbItems.push({ route: selectedPath, text: t("app.platformTitle") });
        }
    }

    return (
        <NavigationLayout
            ref={navigationLayoutRef}
            className="appNavigationLayout"
            mode={navigationMode}
            dir={i18n.language.startsWith("fa") ? "rtl" : "ltr"}
            header={
                <ShellBar
                    primaryTitle={t("auth.login.hero.platform")}
                    logo={<img src="/images/digi-grc-reference-login-logo.png" alt={t("brand.referenceLogoAlt")} />}
                    onLogoClick={() => navigateToPath("/dashboard")}
                    profile={<Avatar initials={userInitials(fullName)} size="XS" />}
                    accessibilityAttributes={{ profile: { name: t("user.menu"), expanded: userMenuOpen, hasPopup: "dialog" } }}
                    onProfileClick={(event) => {
                        setUserMenuOpener(event.detail.targetRef);
                        setUserMenuOpen(true);
                    }}
                    content={<ProfileSelector />}
                    startButton={<Button
                        icon="menu2"
                        design="Transparent"
                        accessibleName={t("nav.menu")}
                        onClick={() => setNavigationMode(navigationLayoutRef.current?.isSideCollapsed() ? "Expanded" : "Collapsed")}
                    />}
                >
                    <NotificationMenu items={EMPTY_NOTIFICATIONS} />
                </ShellBar>
            }
            sideContent={
                <SideNavigation
                    accessibleName={t("nav.mainNavigation")}
                    onSelectionChange={onSelectionChange}
                    header={<FlexBox direction="Column" alignItems="Center" className="sideNavBrand">
                        <Link accessibleName={t("nav.home")} onClick={() => navigateToPath("/dashboard")}>
                            <img className="sideNavBrandImage" src="/images/digi-grc-reference-navigation-logo.png" alt={t("brand.referenceLogoAlt")} />
                        </Link>
                    </FlexBox>}
                    fixedItems={[
                        <SideNavigationItem
                            key="help"
                            text={t("nav.help")}
                            icon="sys-help"
                            data-route="/help"
                            selected={selectedPath.startsWith("/help")}
                        />,
                        <SideNavigationItem key="logout" text={t("user.logout")} icon="log" onClick={() => void handleLogout()} />,
                    ]}
                >
                    {mainItems.filter((item) => item.key !== "masterData" || MASTER_DATA_AREAS.some((area) => canAccessMasterData(me, area))).map((item) => (
                        <SideNavigationItem
                            key={item.key}
                            text={item.text}
                            icon={item.icon}
                            selected={item.selected}
                            data-route={item.route}
                        />
                    ))}
                    {showAccessControl ? (
                        <SideNavigationItem
                            text={t("nav.userManagement")}
                            icon="key-user-settings"
                            selected={selectedPath.startsWith("/access-control")}
                        >
                            {canViewUsers ? <SideNavigationSubItem
                                text={t("nav.users")}
                                selected={selectedPath.startsWith("/access-control/users")}
                                data-route="/access-control/users"
                            /> : null}
                            {canViewRoles ? <SideNavigationSubItem
                                text={t("nav.roles")}
                                selected={selectedPath.startsWith("/access-control/roles")}
                                data-route="/access-control/roles"
                            /> : null}
                        </SideNavigationItem>
                    ) : null}
                    {isRootAdmin ? <SideNavigationItem text={t("profile.management")} icon="database" data-route="/profiles" selected={isPathInPrefixes(selectedPath, ["/profiles"])} /> : null}
                </SideNavigation>
            }
        >
            <main className="mainContent">
                <Breadcrumbs className="pageBreadcrumbs" data-ui5-compact-size="" onItemClick={(event) => {
                    event.preventDefault();
                    const path = event.detail.item.href;
                    if (path) navigateToPath(path);
                }}>
                    {breadcrumbItems.map((item, index) => (
                        <BreadcrumbsItem key={`${item.route}-${index}`} href={index < breadcrumbItems.length - 1 ? item.route : undefined}>
                            {item.text}
                        </BreadcrumbsItem>
                    ))}
                </Breadcrumbs>
                <Outlet />
                <UserProfileMenu
                    open={userMenuOpen}
                    opener={userMenuOpener}
                    onClose={() => setUserMenuOpen(false)}
                    fullName={fullName}
                    username={me?.username ?? undefined}
                    onChangeUsername={() => navigateToPath("/change-username")}
                    onChangePassword={() => navigateToPath("/change-password")}
                    onLogout={() => void handleLogout()}
                />
            </main>
        </NavigationLayout>
    );
}
