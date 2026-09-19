import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import type { RoleDetail } from "@/features/usermanagement";
import PermissionCatalogList from "../components/PermissionCatalogList";
import { formatPersianDateTime } from "@/shared/utils/date.utils";

type RoleObjectPageProps = {
    value: RoleDetail;
    busy?: boolean;
    error?: string | null;
    onCancel: () => void;
};

function formatDateTime(value?: string | null): string {
    return formatPersianDateTime(value);
}

export default function RoleObjectPage({ value, onCancel }: RoleObjectPageProps) {
    const { t, i18n } = useTranslation();

    const resolvedText = useMemo(() => {
        const currentLocale = (i18n.resolvedLanguage || i18n.language || "fa").toLowerCase();

        const exact =
            value.translations.find((item) => item.locale.toLowerCase() === currentLocale) ??
            value.translations.find((item) => item.locale.toLowerCase().startsWith(currentLocale)) ??
            value.translations.find((item) => item.locale === "fa") ??
            null;

        return {
            title: exact?.title ?? t("usermanagement.roles.untitled"),
            description: exact?.description ?? null,
        };
    }, [i18n.language, i18n.resolvedLanguage, t, value.translations]);

    return (
        <div style={{ display: "grid", gap: "1rem", minWidth: 0 }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {t("usermanagement.roles.detailTitle", {
                            defaultValue: "جزئیات نقش",
                        })}
                    </Title>
                }
                endContent={
                    <Button design="Transparent" onClick={onCancel}>
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                }
            />

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "1rem",
                }}
            >
                <div style={{ display: "grid", gap: ".35rem" }}>
                    <Label>{t("usermanagement.roles.fields.title", { defaultValue: "عنوان نقش" })}</Label>
                    <Text>{resolvedText.title}</Text>
                </div>

                <div style={{ display: "grid", gap: ".35rem", gridColumn: "1 / -1" }}>
                    <Label>{t("usermanagement.roles.fields.description", { defaultValue: "توضیحات" })}</Label>
                    <Text>{resolvedText.description || "-"}</Text>
                </div>

                <div style={{ display: "grid", gap: ".35rem" }}>
                    <Label>{t("usermanagement.roles.fields.systemDefined", { defaultValue: "سیستمی" })}</Label>
                    <Text>
                        {value.systemDefined
                            ? t("common.yes", { defaultValue: "بله" })
                            : t("common.no", { defaultValue: "خیر" })}
                    </Text>
                </div>

                <div style={{ display: "grid", gap: ".35rem" }}>
                    <Label>{t("usermanagement.roles.fields.status", { defaultValue: "وضعیت" })}</Label>
                    <ObjectStatus state={value.enabled ? "Positive" : "None"}>
                        {value.enabled
                            ? t("usermanagement.roles.status.enabled", { defaultValue: "فعال" })
                            : t("usermanagement.roles.status.disabled", { defaultValue: "غیرفعال" })}
                    </ObjectStatus>
                </div>

                <div style={{ display: "grid", gap: ".35rem" }}>
                    <Label>{t("usermanagement.roles.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}</Label>
                    <Text>{formatDateTime(value.createdAt)}</Text>
                </div>

                <div style={{ display: "grid", gap: ".35rem" }}>
                    <Label>{t("usermanagement.roles.fields.updatedAt", { defaultValue: "آخرین بروزرسانی" })}</Label>
                    <Text>{formatDateTime(value.updatedAt)}</Text>
                </div>
            </div>

            <PermissionCatalogList
                title={t("usermanagement.roles.systemPermissionsTitle", {
                    defaultValue: "مجوزهای سیستمی",
                })}
                items={value.systemPermissions}
                emptyTextKey="usermanagement.roles.noSystemPermissions"
                emptyTextDefault="برای این نقش هنوز مجوز سیستمی ثبت نشده است"
            />

            <PermissionCatalogList
                title={t("usermanagement.roles.businessPermissionsTitle", {
                    defaultValue: "مجوزهای کسب‌وکاری",
                })}
                items={value.businessPermissions}
                emptyTextKey="usermanagement.roles.noBusinessPermissions"
                emptyTextDefault="برای این نقش هنوز مجوز کسب‌وکاری ثبت نشده است"
            />
        </div>
    );
}
