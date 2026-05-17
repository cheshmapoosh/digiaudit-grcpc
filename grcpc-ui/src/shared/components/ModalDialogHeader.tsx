import { Bar, Button, Title } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

export interface ModalDialogHeaderProps {
    title: string;
    onClose: (event?: unknown) => void;
}

export function ModalDialogHeader({ title, onClose }: ModalDialogHeaderProps) {
    const { t } = useTranslation();
    const closeText = t("common.close", { defaultValue: "بستن" });

    return (
        <Bar
            slot="header"
            startContent={<Title level="H6">{title}</Title>}
            endContent={
                <Button
                    design="Transparent"
                    icon="decline"
                    tooltip={closeText}
                    accessibleName={closeText}
                    onClick={(event) => onClose(event)}
                />
            }
        />
    );
}
