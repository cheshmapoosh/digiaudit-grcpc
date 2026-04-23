import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
    Avatar,
    Button,
    List,
    ListItemStandard,
    ResponsivePopover,
    ShellBarItem,
    type ResponsivePopoverDomRef,
} from "@ui5/webcomponents-react";

type Props = {
    fullName: string;
    email?: string;
    initials?: string;
    onLogout?: () => void;
    onOpenProfile?: () => void;
};

export default function UserProfileMenu({
                                            fullName,
                                            email,
                                            initials,
                                            onLogout,
                                            onOpenProfile,
                                        }: Props) {
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);

    const openerId = "userProfileOpener";
    const popoverRef = useRef<ResponsivePopoverDomRef | null>(null);

    const userInitials = useMemo(() => {
        if (initials) {
            return initials;
        }

        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        const first = parts[0]?.[0] ?? "U";
        const second = parts[1]?.[0] ?? "";

        return `${first}${second}`.toUpperCase();
    }, [fullName, initials]);

    const openMenu = () => {
        queueMicrotask(() => setOpen(true));
    };

    const closeMenu = () => {
        setOpen(false);
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) {
                return;
            }

            const openerElement = document.getElementById(openerId);
            const popoverElement = popoverRef.current;

            if (openerElement?.contains(target)) {
                return;
            }

            if (popoverElement?.contains(target)) {
                return;
            }

            setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown, true);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, [open]);

    const popoverNode =
        typeof document !== "undefined"
            ? createPortal(
                <ResponsivePopover
                    ref={popoverRef}
                    open={open}
                    opener={openerId}
                    placement="Bottom"
                    modal={false}
                    headerText={t("user.menu")}
                    style={{ minWidth: 280 }}
                >
                    <div
                        style={{
                            padding: 12,
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                        }}
                    >
                        <Avatar initials={userInitials} />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontWeight: 700 }}>{fullName}</div>
                            {email ? (
                                <div style={{ fontSize: 12, opacity: 0.7 }}>{email}</div>
                            ) : null}
                        </div>
                    </div>

                    <List>
                        <ListItemStandard
                            onClick={() => {
                                closeMenu();
                                onOpenProfile?.();
                            }}
                        >
                            {t("user.profile")}
                        </ListItemStandard>

                        <ListItemStandard onClick={closeMenu}>
                            {t("user.preferences")}
                        </ListItemStandard>

                        <ListItemStandard
                            onClick={() => {
                                closeMenu();
                                onLogout?.();
                            }}
                        >
                            {t("user.logout")}
                        </ListItemStandard>
                    </List>

                    <div
                        style={{
                            padding: 12,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <Button design="Transparent" onClick={closeMenu}>
                            {t("common.close")}
                        </Button>
                    </div>
                </ResponsivePopover>,
                document.body,
            )
            : null;

    return (
        <>
            <ShellBarItem
                id={openerId}
                icon="employee"
                text={t("user.me")}
                onClick={openMenu}
            />
            {popoverNode}
        </>
    );
}