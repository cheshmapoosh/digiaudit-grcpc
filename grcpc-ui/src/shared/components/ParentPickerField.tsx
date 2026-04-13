import { Button, Input, Label } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

export interface ParentPickerFieldProps {
    label: string;
    value: string;
    disabled?: boolean;
    placeholder?: string;
    onOpen: () => void;
}

export default function ParentPickerField({
                                              label,
                                              value,
                                              disabled = false,
                                              placeholder = "",
                                              onOpen,
                                          }: ParentPickerFieldProps) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: "0.5rem" }}>
            <Label>{label}</Label>

            <div
                style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: "0.25rem",
                    width: "100%",
                    maxWidth: "32rem",
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Input
                        value={value}
                        placeholder={placeholder}
                        disabled
                        readonly
                        style={{ width: "100%" }}
                    />
                </div>

                <Button
                    design="Transparent"
                    icon="value-help"
                    disabled={disabled}
                    tooltip={t("common.select", { defaultValue: "انتخاب" })}
                    accessibleName={t("common.select", { defaultValue: "انتخاب" })}
                    onClick={onOpen}
                />
            </div>
        </div>
    );
}