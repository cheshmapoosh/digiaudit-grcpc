import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@ui5/webcomponents-react";
import UiSettingsDialog from "./UiSettingsDialog";

export default function UiSettingsMenu() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button icon="action-settings" design="Transparent" tooltip={t("ui.settings")} accessibleName={t("ui.settings")} onClick={() => setOpen(true)} />
            {open && <UiSettingsDialog onClose={() => setOpen(false)} />}
        </>
    );
}
