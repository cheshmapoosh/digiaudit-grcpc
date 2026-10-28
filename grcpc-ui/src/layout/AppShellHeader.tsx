import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Button, ShellBar } from "@ui5/webcomponents-react";
import UserProfileMenu from "./components/UserProfileMenu";
import NotificationMenu, { type NotificationItem } from "./components/NotificationMenu";
import { userInitials } from "./userInitials";

type AppShellHeaderProps = {
    authenticated: boolean;
    title?: string;
    subtitle?: string;
    showMenuButton?: boolean;
    onToggleMenu?: () => void;
    notifications?: NotificationItem[];
    fullName?: string;
    email?: string;
    onChangeUsername?: () => void;
    onChangePassword?: () => void;
    onLogout?: () => void;
};

export default function AppShellHeader({
    authenticated, title, subtitle, showMenuButton = false, onToggleMenu,
    notifications = [], fullName, email, onChangeUsername, onChangePassword, onLogout,
}: AppShellHeaderProps) {
    const { t } = useTranslation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [userMenuOpener, setUserMenuOpener] = useState<HTMLElement | null>(null);

    return (
        <>
            <ShellBar
                primaryTitle={title ?? t("app.title")}
                secondaryTitle={subtitle ?? t("app.subtitle")}
                startButton={authenticated && showMenuButton ? (
                    <Button icon="menu2" design="Transparent" accessibleName={t("nav.menu")} onClick={onToggleMenu} />
                ) : undefined}
                profile={authenticated && fullName ? <Avatar initials={userInitials(fullName)} size="XS" /> : undefined}
                accessibilityAttributes={{ profile: { name: t("user.menu"), expanded: userMenuOpen, hasPopup: "dialog" } }}
                onProfileClick={(event) => {
                    setUserMenuOpener(event.detail.targetRef);
                    setUserMenuOpen(true);
                }}
            >
                {authenticated && <NotificationMenu items={notifications} />}
            </ShellBar>
            {authenticated && fullName && <UserProfileMenu
                open={userMenuOpen}
                opener={userMenuOpener}
                onClose={() => setUserMenuOpen(false)}
                fullName={fullName}
                email={email}
                onChangeUsername={onChangeUsername}
                onChangePassword={onChangePassword}
                onLogout={onLogout}
            />}
        </>
    );
}
