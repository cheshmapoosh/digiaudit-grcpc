import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
    ShellBarItem,
    ResponsivePopover,
    List,
    ListItemStandard,
    Avatar,
    Button
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
                                            onOpenProfile
                                        }: Props) {
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);

    // ✅ stable opener id
    const openerId = "userProfileOpener";

    // ✅ ref to UI5 popover element (web component)
    const popoverRef = useRef<any>(null);

    const userInitials = useMemo(() => {
        if (initials) return initials;
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        const a = parts[0]?.[0] ?? "U";
        const b = parts[1]?.[0] ?? "";
        return (a + b).toUpperCase();
    }, [fullName, initials]);

    const openMenu = () => queueMicrotask(() => setOpen(true));
    const closeMenu = () => setOpen(false);

    // ✅ Hard guarantee: close on outside click (works even if UI5 doesn't)
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (ev: PointerEvent) => {
            const target = ev.target as Node | null;
            if (!target) return;

            const openerEl = document.getElementById(openerId);
            const popoverDom: HTMLElement | null =
                popoverRef.current?.getDomRef?.() ?? null;

            // click on opener => ignore (it will be handled by button itself)
            if (openerEl && openerEl.contains(target)) return;

            // click inside popover => ignore
            if (popoverDom && popoverDom.contains(target)) return;

            // otherwise => close
            setOpen(false);
        };

        // capture=true to catch events even when UI5 uses shadow DOM
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
                    placementType="Bottom"
                    modal={false}
                    headerText={t("user.menu")}
                    onAfterClose={() => setOpen(false)}
                    style={{ minWidth: 280 }}
                >
                    <div style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                        <Avatar initials={userInitials} />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontWeight: 700 }}>{fullName}</div>
                            {email ? <div style={{ fontSize: 12, opacity: 0.7 }}>{email}</div> : null}
                        </div>
                    </div>

                    {/* mode=None => focus outline روی اولین آیتم نیاید */}
                    <List mode="None">
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

                    <div style={{ padding: 12, display: "flex", justifyContent: "flex-end" }}>
                        <Button design="Transparent" onClick={closeMenu}>
                            {t("common.close")}
                        </Button>
                    </div>
                </ResponsivePopover>,
                document.body
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
