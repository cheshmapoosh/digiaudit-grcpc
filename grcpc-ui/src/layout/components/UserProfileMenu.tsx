import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { UserMenu, UserMenuAccount, UserMenuItem } from "@ui5/webcomponents-react";
import { userInitials } from "../userInitials";
import UiSettingsDialog from "./UiSettingsDialog";

type MenuAction = "settings" | "change-username" | "change-password" | "sign-out";

type Props = {
    open: boolean;
    opener: HTMLElement | null;
    onClose: () => void;
    fullName: string;
    username?: string;
    email?: string;
    onLogout?: () => void;
    onChangeUsername?: () => void;
    onChangePassword?: () => void;
};

export default function UserProfileMenu({
    open, opener, onClose, fullName, username, email,
    onLogout, onChangeUsername, onChangePassword,
}: Props) {
    const { t } = useTranslation();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const pendingAction = useRef<MenuAction | null>(null);

    function handleClose() {
        onClose();
        const action = pendingAction.current;
        pendingAction.current = null;
        // Open the next dialog/page only after the native menu restores focus.
        if (action === "settings") setSettingsOpen(true);
        else if (action === "change-username") onChangeUsername?.();
        else if (action === "change-password") onChangePassword?.();
        else if (action === "sign-out") onLogout?.();
    }

    if (typeof document === "undefined") return null;

    return createPortal(
        <>
            <UserMenu
                open={open}
                opener={opener}
                showOtherAccounts={false}
                showManageAccount={false}
                showEditAccounts={false}
                showEditButton={false}
                accounts={<UserMenuAccount
                    selected
                    avatarInitials={userInitials(fullName)}
                    titleText={fullName}
                    subtitleText={email || username}
                />}
                onClose={handleClose}
                onItemClick={(event) => {
                    const action = event.detail.item.dataset.action;
                    if (action === "settings" || action === "change-username" || action === "change-password") {
                        pendingAction.current = action;
                        onClose();
                    }
                }}
                onSignOutClick={() => {
                    pendingAction.current = "sign-out";
                    onClose();
                }}
            >
                <UserMenuItem text={t("nav.settings")} icon="action-settings" data-action="settings" />
                {onChangeUsername && <UserMenuItem text={t("user.changeUsername")} icon="employee" data-action="change-username" />}
                {onChangePassword && <UserMenuItem text={t("user.changePassword")} icon="key" data-action="change-password" />}
            </UserMenu>
            {settingsOpen && <UiSettingsDialog onClose={() => setSettingsOpen(false)} />}
        </>,
        document.body,
    );
}
