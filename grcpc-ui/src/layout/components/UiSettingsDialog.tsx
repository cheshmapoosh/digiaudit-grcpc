import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Form, FormItem, Label, Option, Select, Switch,
    UserSettingsDialog, UserSettingsItem, UserSettingsView,
} from "@ui5/webcomponents-react";
import { applySettings, loadSettings, saveSettings, type UiSettings } from "@/ui/ui-settings";

export default function UiSettingsDialog({ onClose }: { onClose: () => void }) {
    const { t, i18n } = useTranslation();
    const [settings, setSettings] = useState(loadSettings);
    const id = useId();

    function commit(next: UiSettings) {
        setSettings(next);
        saveSettings(next);
        applySettings(next);
        void i18n.changeLanguage(next.lang);
    }

    return (
        <UserSettingsDialog open headerText={t("nav.settings")} onClose={onClose}>
            <UserSettingsItem text={t("ui.appearance")} headerText={t("ui.appearance")} icon="palette" selected>
                <UserSettingsView>
                    <Form accessibleMode="Edit" accessibleName={t("ui.appearance")} layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
                        <FormItem labelContent={<Label for={`${id}-dark-mode`}>{t("ui.darkMode")}</Label>}>
                            <Switch
                                id={`${id}-dark-mode`}
                                accessibleName={t("ui.darkMode")}
                                checked={settings.theme === "sap_horizon_dark"}
                                onChange={(event) => commit({ ...settings, theme: event.target.checked ? "sap_horizon_dark" : "sap_horizon" })}
                            />
                        </FormItem>
                    </Form>
                </UserSettingsView>
            </UserSettingsItem>
            <UserSettingsItem text={t("ui.languageAndDirection")} headerText={t("ui.languageAndDirection")} icon="world">
                <UserSettingsView>
                    <Form accessibleMode="Edit" accessibleName={t("ui.languageAndDirection")} layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
                        <FormItem labelContent={<Label for={`${id}-language`}>{t("ui.language")}</Label>}>
                            <Select
                                id={`${id}-language`}
                                accessibleName={t("ui.language")}
                                onChange={(event) => {
                                    const lang = event.detail.selectedOption.value;
                                    if (lang === "fa" || lang === "en") {
                                        commit({ ...settings, lang, dir: lang === "fa" ? "rtl" : "ltr" });
                                    }
                                }}
                            >
                                <Option value="fa" selected={settings.lang === "fa"}>{t("ui.languageFa")}</Option>
                                <Option value="en" selected={settings.lang === "en"}>{t("ui.languageEn")}</Option>
                            </Select>
                        </FormItem>
                        <FormItem labelContent={<Label for={`${id}-rtl`}>{t("ui.rtl")}</Label>}>
                            <Switch
                                id={`${id}-rtl`}
                                accessibleName={t("ui.rtl")}
                                checked={settings.dir === "rtl"}
                                onChange={(event) => commit({ ...settings, dir: event.target.checked ? "rtl" : "ltr" })}
                            />
                        </FormItem>
                    </Form>
                </UserSettingsView>
            </UserSettingsItem>
        </UserSettingsDialog>
    );
}
