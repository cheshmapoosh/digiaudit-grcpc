import { useTranslation } from "react-i18next";
import { Bar, Button, Label, Text, Title } from "@ui5/webcomponents-react";

import type { RoleDetail } from "../domain/usermanagement.model";
import PermissionCatalogList from "../components/PermissionCatalogList";

type RoleObjectPageProps = {
    value: RoleDetail;
    busy?: boolean;
    error?: string | null;
    onCancel: () => void;
};

function formatDateTime(value?: string | null): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

export default function RoleObjectPage({ value, onCancel }: RoleObjectPageProps) {
    const { t } = useTranslation();

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
                    <Label>{t("usermanagement.roles.fields.code", { defaultValue: "کد نقش" })}</Label>
                    <Text>{value.code}</Text>
                </div>
                <div style={{ display: "grid", gap: ".35rem" }}>
                    <Label>{t("usermanagement.roles.fields.title", { defaultValue: "عنوان نقش" })}</Label>
                    <Text>{value.title}</Text>
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
                    <Text>
                        {value.enabled
                            ? t("usermanagement.roles.status.enabled", { defaultValue: "فعال" })
                            : t("usermanagement.roles.status.disabled", { defaultValue: "غیرفعال" })}
                    </Text>
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

            <div style={{ display: "grid", gap: ".75rem" }}>
                <Title level="H5">
                    {t("usermanagement.roles.translationsTitle", {
                        defaultValue: "ترجمه‌ها",
                    })}
                </Title>

                {value.translations.length === 0 ? (
                    <Text>
                        {t("usermanagement.roles.noTranslations", {
                            defaultValue: "ترجمه‌ای برای این نقش ثبت نشده است",
                        })}
                    </Text>
                ) : (
                    value.translations.map((translation) => (
                        <div
                            key={translation.locale}
                            style={{
                                border: "1px solid var(--sapGroup_ContentBorderColor)",
                                borderRadius: ".75rem",
                                padding: ".75rem",
                                display: "grid",
                                gap: ".25rem",
                            }}
                        >
                            <div style={{ fontWeight: 700 }}>{translation.locale}</div>
                            <Text>{translation.title}</Text>
                            {translation.description ? <Text>{translation.description}</Text> : null}
                        </div>
                    ))
                )}
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
