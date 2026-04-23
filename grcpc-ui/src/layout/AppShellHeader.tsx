import { useTranslation } from "react-i18next";
import {
    Button,
    ShellBar,
} from "@ui5/webcomponents-react";

import UiSettingsMenu from "./components/UiSettingsMenu";
import UserProfileMenu from "./components/UserProfileMenu";
import NotificationMenu from "./components/NotificationMenu";

type NotificationItem = {
    id: string;
    title: string;
    description: string;
    time: string;
    unread: boolean;
};

type AppShellHeaderProps = {
    authenticated: boolean;
    title?: string;
    subtitle?: string;
    showMenuButton?: boolean;
    onToggleMenu?: () => void;
    notifications?: NotificationItem[];
    fullName?: string;
    email?: string;
    onOpenProfile?: () => void;
    onLogout?: () => void;
};

export default function AppShellHeader({
                                           authenticated,
                                           title,
                                           subtitle,
                                           showMenuButton = false,
                                           onToggleMenu,
                                           notifications = [],
                                           fullName,
                                           email,
                                           onOpenProfile,
                                           onLogout,
                                       }: AppShellHeaderProps) {
    const { t } = useTranslation();

    return (
        <ShellBar
            primaryTitle={title ?? t("app.title")}
            secondaryTitle={subtitle ?? t("app.subtitle")}
        >
            {authenticated && showMenuButton ? (
                <Button
                    slot="startButton"
                    icon="menu2"
                    design="Transparent"
                    onClick={onToggleMenu}
                />
            ) : null}

            <UiSettingsMenu trigger="shellbar"/>

            {authenticated ? (
                <NotificationMenu
                    items={notifications}
                    onOpenItem={(item) => console.log("open notification", item.id)}
                    onMarkAllRead={() => console.log("mark all as read")}
                />
            ) : null}

            {authenticated && fullName ? (
                <UserProfileMenu
                    fullName={fullName}
                    email={email}
                    onOpenProfile={onOpenProfile}
                    onLogout={onLogout}
                />
            ) : null}
        </ShellBar>
    );
}