import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";

import {
    ShellBarItem,
    Popover,
    List,
    ListItemCustom,
    Switch,
    Label,
    Button,
    Text
} from "@ui5/webcomponents-react";

import type { UiSettings } from "../../ui/ui-settings";
import { applySettings, loadSettings, saveSettings } from "../../ui/ui-settings";

function ToggleRow({
                       title,
                       description,
                       checked,
                       onToggle
                   }: {
    title: string;
    description?: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <ListItemCustom>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Label>{title}</Label>
                    {description ? <Text style={{ fontSize: 12, opacity: 0.7 }}>{description}</Text> : null}
                </div>

                {/* ✅ no stopPropagation here */}
                <Switch checked={checked} onChange={onToggle} />
            </div>
        </ListItemCustom>
    );
}

export default function UiSettingsMenu() {
    const { t } = useTranslation();

    const openerId = "uiSettingsOpener";

    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<UiSettings>(() => loadSettings());

    const popoverRef = useRef<any>(null);

    const commit = (next: UiSettings) => {
        setSettings(next);
        applySettings(next);
        saveSettings(next);
        i18n.changeLanguage(next.lang);
    };

    // ✅ close on outside click only (inside popover never closes)
    useEffect(() => {
        if (!open) return;

        const onDocClick = (ev: MouseEvent) => {
            const target = ev.target as Node | null;
            if (!target) return;

            const openerEl = document.getElementById(openerId);
            const popoverDom: HTMLElement | null = popoverRef.current?.getDomRef?.() ?? null;

            // click on opener => ignore (so it doesn't instantly close)
            if (openerEl && openerEl.contains(target)) return;

            // click inside popover => ignore (so toggles don't close)
            if (popoverDom) {
                if (popoverDom.contains(target)) return;

                // scrollbar click considered inside
                const r = popoverDom.getBoundingClientRect();
                const x = ev.clientX;
                const y = ev.clientY;
                const insideRect = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
                if (insideRect) return;
            }

            setOpen(false);
        };

        // use click (not pointerdown) to avoid interfering with UI5 interactions
        document.addEventListener("click", onDocClick, true);
        return () => document.removeEventListener("click", onDocClick, true);
    }, [open]);

    const summary = useMemo(() => {
        const themeLabel = settings.theme === "sap_horizon_dark" ? t("ui.themeDark") : t("ui.themeLight");
        const dirLabel = settings.dir === "rtl" ? "RTL" : "LTR";
        const langLabel = settings.lang.toUpperCase();
        return `${themeLabel} · ${dirLabel} · ${langLabel}`;
    }, [settings.theme, settings.dir, settings.lang, t]);

    const openMenu = () => queueMicrotask(() => setOpen(true));
    const closeMenu = () => setOpen(false);

    const popoverNode =
        typeof document !== "undefined"
            ? createPortal(
                <Popover
                    ref={popoverRef}
                    open={open}
                    opener={openerId}
                    placementType="Bottom"
                    modal={false}
                    headerText={t("ui.settings")}
                    onAfterClose={() => setOpen(false)}
                    style={{ width: 420, maxWidth: "95vw" }}
                >
                    <div style={{ padding: 12 }}>
                        <Text style={{ fontSize: 12, opacity: 0.7 }}>{summary}</Text>

                        <List mode="None" style={{ marginTop: 8 }}>
                            <ToggleRow
                                title={t("ui.darkMode")}
                                description={t("ui.themeHint")}
                                checked={settings.theme === "sap_horizon_dark"}
                                onToggle={() =>
                                    commit({
                                        ...settings,
                                        theme: settings.theme === "sap_horizon_dark" ? "sap_horizon" : "sap_horizon_dark"
                                    })
                                }
                            />

                            <ToggleRow
                                title={t("ui.rtl")}
                                description={t("ui.dirHint")}
                                checked={settings.dir === "rtl"}
                                onToggle={() =>
                                    commit({
                                        ...settings,
                                        dir: settings.dir === "rtl" ? "ltr" : "rtl"
                                    })
                                }
                            />

                            <ToggleRow
                                title={t("ui.languageFa")}
                                description={t("ui.langHint")}
                                checked={settings.lang === "fa"}
                                onToggle={() => {
                                    const nextLang: UiSettings["lang"] = settings.lang === "fa" ? "en" : "fa";
                                    const nextDir: UiSettings["dir"] = nextLang === "fa" ? "rtl" : "ltr";
                                    commit({ ...settings, lang: nextLang, dir: nextDir });
                                }}
                            />
                        </List>

                        <div style={{ padding: 12, display: "flex", justifyContent: "flex-end" }}>
                            <Button design="Transparent" onClick={closeMenu}>
                                {t("common.close")}
                            </Button>
                        </div>
                    </div>
                </Popover>,
                document.body
            )
            : null;

    return (
        <>
            <ShellBarItem id={openerId} icon="action-settings" text={t("ui.settings")} onClick={openMenu} />
            {popoverNode}
        </>
    );
}
