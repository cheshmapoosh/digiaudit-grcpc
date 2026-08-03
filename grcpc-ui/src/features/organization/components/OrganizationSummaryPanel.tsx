import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, MessageStrip, Title } from "@ui5/webcomponents-react";

import type { OrganizationNode } from "../domain/organization.model";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";

export interface OrganizationSummaryPanelProps {
    value?: OrganizationNode | null;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onEdit?: (id: string) => void;
    onCancel?: () => void;
}

function resolveStatusLabel(
    status: OrganizationNode["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (status === "ACTIVE") {
        return t("common.active", { defaultValue: "فعال" });
    }

    if (status === "INACTIVE") {
        return t("common.inactive", { defaultValue: "غیرفعال" });
    }

    return t("common.deleted", { defaultValue: "حذف‌شده" });
}

export default function OrganizationSummaryPanel({
    value,
    busy = false,
    error,
    onErrorClose,
    onEdit,
    onCancel,
}: OrganizationSummaryPanelProps) {
    const { t } = useTranslation();
    const summaryTitle = value?.displayLabel?.trim()
        ? t("organization.object.summaryTitleWithName", {
              defaultValue: "واحد سازمانی {{name}}",
              name: value.displayLabel,
          })
        : t("organization.object.summaryTitle", { defaultValue: "واحد سازمانی" });

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
                label: t("organization.fields.code", { defaultValue: "کد" }),
                value: value.code,
            },
            {
                label: t("organization.fields.parent", { defaultValue: "والد" }),
                value: value.parentOrganizationId ?? "-",
            },
            {
                label: t("organization.fields.status", { defaultValue: "وضعیت" }),
                value: resolveStatusLabel(value.status, t),
            },
            {
                label: t("organization.fields.validFrom", { defaultValue: "از تاریخ" }),
                value: formatPersianDate(value.validFrom),
            },
            {
                label: t("organization.fields.validTo", { defaultValue: "تا تاریخ" }),
                value: formatPersianDate(value.validTo),
            },
            {
                label: t("organization.fields.version", { defaultValue: "نسخه" }),
                value: String(value.version),
            },
            {
                label: t("organization.fields.createdAt", { defaultValue: "تاریخ ایجاد" }),
                value: formatPersianDateTime(value.createdAt),
            },
            {
                label: t("organization.fields.updatedAt", { defaultValue: "تاریخ بروزرسانی" }),
                value: formatPersianDateTime(value.updatedAt),
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
            <Bar startContent={<Title level="H4">{summaryTitle}</Title>} />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
                {error ? (
                    <MessageStrip design="Negative" onClose={onErrorClose}>
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
