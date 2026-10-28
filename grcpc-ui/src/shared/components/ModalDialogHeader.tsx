import { Bar, Button, FlexBox, Title } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import "./modal-layout.css";

export interface ModalDialogHeaderProps {
    title: string;
    onClose: (event?: unknown) => void;
    actions?: ReactNode;
}

export function ModalDialogHeader({ title, onClose, actions }: ModalDialogHeaderProps) {
    const { t } = useTranslation();
    const closeText = t("common.close", { defaultValue: "بستن" });

    return (
        <FlexBox slot="header" direction="Column" className="modalDialogHeader">
            <Bar
                startContent={<Title level="H6">{title}</Title>}
                endContent={
                    <>
                    {actions}
                    <Button
                        design="Transparent"
                        icon="decline"
                        tooltip={closeText}
                        accessibleName={closeText}
                        onClick={(event) => onClose(event)}
                    />
                    </>
                }
            />
            <FlexBox direction="Column" data-catalog-parent-header="" />
        </FlexBox>
    );
}
