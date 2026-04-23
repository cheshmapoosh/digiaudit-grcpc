import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
    Button,
    Label,
    List,
    ListItemCustom,
    Popover,
    ShellBarItem,
    Switch,
    Text,
    type PopoverDomRef,
} from "@ui5/webcomponents-react";

import type { UiSettings } from "@/ui/ui-settings";
import { applySettings, loadSettings, saveSettings } from "@/ui/ui-settings";

type UiSettingsMenuProps = {
    trigger?: "shellbar" | "button";
};

type ToggleRowProps = {
    title: string;
    description?: string;
    checked: boolean;
    onToggle: () => void;
};

function ToggleRow({ title, description, checked, onToggle }: ToggleRowProps) {
    return (
        <ListItemCustom>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    gap: 12,
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Label>{title}</Label>
                    {description ? (
                        <Text style={{ fontSize: 12, opacity: 0.7 }}>{description}</Text>
                    ) : null}
                </div>

                <Switch checked={checked} onChange={() => onToggle()} />
            </div>
        </ListItemCustom>
    );
}

export default function UiSettingsMenu({
                                           trigger = "shellbar",
                                       }: UiSettingsMenuProps) {
    const { t, i18n } = useTranslation();

    const openerId = useId().replace(/:/g, "_");

    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<UiSettings>(() => loadSettings());

    const popoverRef = useRef<PopoverDomRef | null>(null);

    const commit = useCallback(
        (next: UiSettings) => {
            setSettings(next);
            applySettings(next);
            saveSettings(next);
            void i18n.changeLanguage(next.lang);
        },
        [i18n],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        const onDocumentClick = (event: MouseEvent) => {
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

        document.addEventListener("click", onDocumentClick, true);

        return () => {
            document.removeEventListener("click", onDocumentClick, true);
        };
    }, [open, openerId]);

    const summary = useMemo(() => {
        const themeLabel =
            settings.theme === "sap_horizon_dark"
                ? t("ui.themeDark")
                : t("ui.themeLight");

        const directionLabel = settings.dir === "rtl" ? "RTL" : "LTR";
        const languageLabel = settings.lang.toUpperCase();

        return `${themeLabel} · ${directionLabel} · ${languageLabel}`;
    }, [settings.theme, settings.dir, settings.lang, t]);

    const openMenu = useCallback(() => {
        queueMicrotask(() => setOpen(true));
    }, []);

    const closeMenu = useCallback(() => {
        setOpen(false);
    }, []);

    const toggleTheme = useCallback(() => {
        commit({
            ...settings,
            theme:
                settings.theme === "sap_horizon_dark"
                    ? "sap_horizon"
                    : "sap_horizon_dark",
        });
    }, [commit, settings]);

    const toggleDirection = useCallback(() => {
        commit({
            ...settings,
            dir: settings.dir === "rtl" ? "ltr" : "rtl",
        });
    }, [commit, settings]);

    const toggleLanguage = useCallback(() => {
        const nextLang: UiSettings["lang"] = settings.lang === "fa" ? "en" : "fa";
        const nextDir: UiSettings["dir"] = nextLang === "fa" ? "rtl" : "ltr";

        commit({
            ...settings,
            lang: nextLang,
            dir: nextDir,
        });
    }, [commit, settings]);

    const triggerNode =
        trigger === "shellbar" ? (
            <ShellBarItem
                id={openerId}
                icon="action-settings"
                text={t("ui.settings")}
                onClick={openMenu}
            />
        ) : (
            <Button
                id={openerId}
                icon="action-settings"
                design="Transparent"
                tooltip={t("ui.settings")}
                accessibleName={t("ui.settings")}
                onClick={openMenu}
            />
        );

    const popoverNode =
        typeof document !== "undefined"
            ? createPortal(
                <Popover
                    ref={popoverRef}
                    open={open}
                    opener={openerId}
                    placement="Bottom"
                    modal={false}
                    headerText={t("ui.settings")}
                    style={{ width: 420, maxWidth: "95vw" }}
                >
                    <div style={{ padding: 12 }}>
                        <Text style={{ fontSize: 12, opacity: 0.7 }}>{summary}</Text>

                        <List style={{ marginTop: 8 }}>
                            <ToggleRow
                                title={t("ui.darkMode")}
                                description={t("ui.themeHint")}
                                checked={settings.theme === "sap_horizon_dark"}
                                onToggle={toggleTheme}
                            />

                            <ToggleRow
                                title={t("ui.rtl")}
                                description={t("ui.dirHint")}
                                checked={settings.dir === "rtl"}
                                onToggle={toggleDirection}
                            />

                            <ToggleRow
                                title={t("ui.languageFa")}
                                description={t("ui.langHint")}
                                checked={settings.lang === "fa"}
                                onToggle={toggleLanguage}
                            />
                        </List>

                        <div
                            style={{
                                paddingTop: 12,
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <Button design="Transparent" onClick={closeMenu}>
                                {t("common.close")}
                            </Button>
                        </div>
                    </div>
                </Popover>,
                document.body,
            )
            : null;

    return (
        <>
            {triggerNode}
            {popoverNode}
        </>
    );
}