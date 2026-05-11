import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, MessageStrip, Title } from "@ui5/webcomponents-react";

import type { OrganizationNode } from "../domain/organization.model";

export interface OrganizationSummaryPanelProps {
    value?: OrganizationNode | null;
    busy?: boolean;
    error?: string | null;
    onEdit?: (id: string) => void;
    onCancel?: () => void;
}

function mapTypeLabel(type: OrganizationNode["type"], t: ReturnType<typeof useTranslation>["t"]): string {
    switch (type) {
        case "holding":
            return t("organization.type.holding", { defaultValue: "هلدینگ" });
        case "company":
            return t("organization.type.company", { defaultValue: "شرکت" });
        case "deputy":
            return t("organization.type.deputy", { defaultValue: "معاونت" });
        case "office":
            return t("organization.type.office", { defaultValue: "اداره" });
        case "unit":
            return t("organization.type.unit", { defaultValue: "واحد" });
        case "committee":
            return t("organization.type.committee", { defaultValue: "کمیته" });
        case "group":
            return t("organization.type.group", { defaultValue: "گروه" });
        case "department":
            return t("organization.type.department", { defaultValue: "دپارتمان" });
        case "management":
            return t("organization.type.management", { defaultValue: "مدیریت" });
        case "branch":
            return t("organization.type.branch", { defaultValue: "شعبه" });
        default:
            return t("organization.type.other", { defaultValue: "سایر" });
    }
}

export default function OrganizationSummaryPanel({
    value,
    busy = false,
    error,
    onEdit,
    onCancel,
}: OrganizationSummaryPanelProps) {
    const { t } = useTranslation();

    const actionButtonStyle = useMemo(
        () => ({
            minWidth: "8rem",
        }),
        [],
    );

    const rows = useMemo(() => {
        if (!value) {
            return [];
        }

        return [
            {
                label: t("organization.fields.name", { defaultValue: "نام" }),
                value: value.name,
            },
            {
                label: t("organization.fields.code", { defaultValue: "کد" }),
                value: value.code,
            },
            {
                label: t("organization.fields.type", { defaultValue: "نوع" }),
                value: mapTypeLabel(value.type, t),
            },
            {
                label: t("organization.fields.status", { defaultValue: "وضعیت" }),
                value:
                    value.status === "active"
                        ? t("common.active", { defaultValue: "فعال" })
                        : t("common.inactive", { defaultValue: "غیرفعال" }),
            },
            {
                label: t("organization.fields.validFrom", { defaultValue: "از تاریخ" }),
                value: value.validFrom || "-",
            },
            {
                label: t("organization.fields.validTo", { defaultValue: "تا تاریخ" }),
                value: value.validTo || "-",
            },
            {
                label: t("organization.fields.location", { defaultValue: "موقعیت" }),
                value: value.location || "-",
            },
            {
                label: t("organization.fields.description", { defaultValue: "توضیحات" }),
                value: value.description || "-",
            },
        ];
    }, [t, value]);

    return (
        <div
            style={{
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                minHeight: "100%",
                gap: "1rem",
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {t("organization.object.summaryTitle", { defaultValue: "جزئیات واحد سازمانی" })}
                    </Title>
                }
            />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
                {error ? (
                    <MessageStrip design="Negative" hideCloseButton>
                        {error}
                    </MessageStrip>
                ) : null}

                {value ? (
                    <div
                        style={{
                            display: "grid",
                            gap: "0.875rem",
                            padding: "1rem",
                            border: "1px solid var(--sapGroup_ContentBorderColor)",
                            borderRadius: "0",
                            background: "var(--sapGroup_ContentBackground)",
                        }}
                    >
                        {rows.map((row) => (
                            <div
                                key={row.label}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "8rem minmax(0, 1fr)",
                                    gap: "0.75rem",
                                    alignItems: "start",
                                }}
                            >
                                <Label showColon>{row.label}</Label>
                                <span
                                    style={{
                                        minWidth: 0,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("organization.object.selectPrompt", {
                            defaultValue: "برای مشاهده جزئیات، یک واحد سازمانی را انتخاب کنید.",
                        })}
                    </MessageStrip>
                )}
            </div>

            <Bar
                endContent={
                    <>
                        <Button
                            design="Emphasized"
                            disabled={!value || busy}
                            style={actionButtonStyle}
                            onClick={() => value && onEdit?.(value.id)}
                        >
                            {t("common.edit", { defaultValue: "ویرایش" })}
                        </Button>

                        <Button
                            design="Transparent"
                            disabled={busy}
                            style={actionButtonStyle}
                            onClick={onCancel}
                        >
                            {t("common.cancel", { defaultValue: "انصراف" })}
                        </Button>
                    </>
                }
            />
        </div>
    );
}
