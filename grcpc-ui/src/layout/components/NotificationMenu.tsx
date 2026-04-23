import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
    ShellBarItem,
    Popover,
    List,
    ListItemCustom,
    Button,
    Text, type PopoverDomRef
} from "@ui5/webcomponents-react";

export type NotificationItem = {
    id: string;
    title: string;
    description?: string;
    time?: string; // e.g. "5m", "10:30", "Yesterday"
    unread?: boolean;
};

type Props = {
    items: NotificationItem[];
    onOpenItem?: (item: NotificationItem) => void;
    onMarkAllRead?: () => void;
};

export default function NotificationMenu({ items, onOpenItem, onMarkAllRead }: Props) {
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);

    const openerId = "notificationOpener";
    const popoverRef = useRef<PopoverDomRef | null>(null);

    const unreadCount = useMemo(() => items.filter((x) => x.unread).length, [items]);

    const openMenu = () => queueMicrotask(() => setOpen(true));
    const closeMenu = () => setOpen(false);

    // ✅ close on outside click (guaranteed)
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (ev: PointerEvent) => {
            const target = ev.target as Node | null;
            if (!target) return;

            const openerEl = document.getElementById(openerId);
            const popoverDom: HTMLElement | null = popoverRef.current?.getDomRef?.() ?? null;

            // 1) کلیک روی opener => ignore
            if (openerEl && openerEl.contains(target)) return;

            // 2) اگر UI5 target را درست بدهد
            if (popoverDom && popoverDom.contains(target)) return;

            // 3) ✅ مهم: اگر روی scrollbar/داخل محدوده popover کلیک شد، نبند
            if (popoverDom) {
                const r = popoverDom.getBoundingClientRect();
                const x = ev.clientX;
                const y = ev.clientY;

                const insideRect = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
                if (insideRect) return;
            }

            // خارج از popover => close
            setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown, true);
        return () => document.removeEventListener("pointerdown", onPointerDown, true);
    }, [open, openerId]);


    const popoverNode =
        typeof document !== "undefined"
            ? createPortal(
                <Popover
                    ref={popoverRef}
                    open={open}
                    opener={openerId}
                    placement="Bottom"
                    modal={false}
                    headerText={t("notifications.title")}
                    style={{ width: 360, maxWidth: "90vw", maxHeight: "70vh" }}
                >
                    {/* Header actions (بدون دکمه بستن) */}
                    <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 12, opacity: 0.7 }}>
                            {unreadCount > 0 ? t("notifications.unreadCount", { count: unreadCount }) : t("notifications.allRead")}
                        </Text>

                        <Button
                            design="Transparent"
                            disabled={unreadCount === 0}
                            onClick={() => onMarkAllRead?.()}
                        >
                            {t("notifications.markAllRead")}
                        </Button>
                    </div>

                    {/* ✅ Scrollable list area */}
                    <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                        <List>
                            {items.length === 0 ? (
                                <ListItemCustom>
                                    <Text style={{ opacity: 0.7 }}>{t("notifications.empty")}</Text>
                                </ListItemCustom>
                            ) : (
                                items.map((n) => (
                                    <ListItemCustom
                                        key={n.id}
                                        onClick={() => {
                                            closeMenu();
                                            onOpenItem?.(n);
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 4,
                                                padding: "8px 0"
                                            }}
                                        >
                                            <div style={{ fontWeight: n.unread ? 700 : 500 }}>
                                                {n.title}
                                            </div>

                                            {n.description && (
                                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                                    {n.description}
                                                </div>
                                            )}

                                            {n.time && (
                                                <div style={{ fontSize: 11, opacity: 0.6 }}>
                                                    {n.time}
                                                </div>
                                            )}
                                        </div>
                                    </ListItemCustom>
                                ))
                            )}
                        </List>
                    </div>

                    {/* ✅ Footer پایین (مثل پروفایل) */}
                    <div style={{ padding: 12, display: "flex", justifyContent: "flex-end" }}>
                        <Button design="Transparent" onClick={closeMenu}>
                            {t("common.close")}
                        </Button>
                    </div>
                </Popover>,
                document.body
            )
            : null;

    return (
        <>
            <ShellBarItem
                id={openerId}
                icon="bell"
                text={unreadCount > 0 ? `${t("shell.notifications")} (${unreadCount})` : t("shell.notifications")}
                onClick={openMenu}
            />
            {popoverNode}
        </>
    );
}
