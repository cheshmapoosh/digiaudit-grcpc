import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
    ShellBarItem,
    ButtonBadge,
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
    trigger?: "shellbar" | "button";
    onOpenItem?: (item: NotificationItem) => void;
    onMarkAllRead?: () => void;
};

export default function NotificationMenu({ items, trigger = "shellbar", onOpenItem, onMarkAllRead }: Props) {
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);

    const openerId = "notificationOpener";
    const [opener, setOpener] = useState<HTMLElement | string>(openerId);
    const popoverRef = useRef<PopoverDomRef | null>(null);

    const unreadCount = useMemo(() => items.filter((x) => x.unread).length, [items]);

    const openMenu = (target?: HTMLElement) => {
        setOpener(target ?? openerId);
        queueMicrotask(() => setOpen(true));
    };
    const closeMenu = () => setOpen(false);

    // ✅ close on outside click (guaranteed)
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (ev: PointerEvent) => {
            const target = ev.target as Node | null;
            if (!target) return;

            const openerEl = typeof opener === "string" ? document.getElementById(opener) : opener;
            const popoverDom: HTMLElement | null = popoverRef.current?.getDomRef?.() ?? null;

            // 1) کلیک روی opener => ignore
            if (openerEl && (openerEl.contains(target) || ev.composedPath().includes(openerEl))) return;

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
    }, [open, opener]);


    const popoverNode =
        typeof document !== "undefined"
            ? createPortal(
                <Popover
                    ref={popoverRef}
                    open={open}
                    opener={opener}
                    placement="Bottom"
                    modal={false}
                    headerText={t("notifications.title")}
                    style={{ width: 360, maxWidth: "90vw", maxHeight: "70vh" }}
                >
                    {items.length > 0 && <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Text>
                            {unreadCount > 0 ? t("notifications.unreadCount", { count: unreadCount }) : t("notifications.allRead")}
                        </Text>

                        <Button
                            design="Transparent"
                            disabled={unreadCount === 0}
                            onClick={() => onMarkAllRead?.()}
                        >
                            {t("notifications.markAllRead")}
                        </Button>
                    </div>}

                    {/* ✅ Scrollable list area */}
                    <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                        <List>
                            {items.length === 0 ? (
                                <ListItemCustom>
                                    <Text>{t("notifications.empty")}</Text>
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
                                            <div>
                                                {n.title}
                                            </div>

                                            {n.description && (
                                                <div>
                                                    {n.description}
                                                </div>
                                            )}

                                            {n.time && (
                                                <div>
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
            {trigger === "shellbar" ? <ShellBarItem
                id={openerId}
                icon="bell"
                text={unreadCount > 0 ? `${t("shell.notifications")} (${unreadCount})` : t("shell.notifications")}
                onClick={(event) => openMenu(event.detail.targetRef)}
            /> : <Button
                id={openerId}
                icon="bell"
                design="Transparent"
                accessibleName={t("shell.notifications")}
                badge={unreadCount > 0 ? <ButtonBadge design="OverlayText" text={String(unreadCount)} /> : undefined}
                onClick={() => openMenu()}
            />}
            {popoverNode}
        </>
    );
}
