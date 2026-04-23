import { useTranslation } from "react-i18next";
import { Bar, Button, Card, CardHeader, Label, MessageStrip, Text, Title } from "@ui5/webcomponents-react";
import type { UserDetail } from "@/features/usermanagement";
import UserAssignmentsList from "../components/UserAssignmentsList";

export interface UserObjectPageProps {
    value: UserDetail | null;
    busy?: boolean;
    error?: string | null;
    onCancel: () => void;
}

function formatDate(value?: string | null): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function UserObjectPage({ value, busy = false, error, onCancel }: UserObjectPageProps) {
    const { t } = useTranslation();

    if (!value) {
        return null;
    }

    return (
        <div style={{ display: "grid", gap: "1rem" }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {t("usermanagement.users.detailTitle", {
                            defaultValue: "جزئیات کاربر",
                        })}
                    </Title>
                }
                endContent={
                    <Button design="Transparent" disabled={busy} onClick={onCancel}>
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                }
            />

            {error ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {error}
                </MessageStrip>
            ) : null}

            <div
                style={{
                    display: "grid",
                    gap: "1rem",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
            >
                <div style={{ display: "grid", gap: ".5rem" }}>
                    <Label>{t("usermanagement.users.fields.username", { defaultValue: "نام کاربری" })}</Label>
                    <Text>{value.username}</Text>
                </div>

                <div style={{ display: "grid", gap: ".5rem" }}>
                    <Label>{t("usermanagement.users.fields.fullName", { defaultValue: "نام و نام خانوادگی" })}</Label>
                    <Text>{`${value.firstName} ${value.lastName}`.trim() || "-"}</Text>
                </div>

                <div style={{ display: "grid", gap: ".5rem" }}>
                    <Label>{t("usermanagement.users.fields.email", { defaultValue: "ایمیل" })}</Label>
                    <Text>{value.email || "-"}</Text>
                </div>

                <div style={{ display: "grid", gap: ".5rem" }}>
                    <Label>{t("usermanagement.users.fields.mobile", { defaultValue: "موبایل" })}</Label>
                    <Text>{value.mobile || "-"}</Text>
                </div>

                <div style={{ display: "grid", gap: ".5rem" }}>
                    <Label>{t("usermanagement.users.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}</Label>
                    <Text>{formatDate(value.createdAt)}</Text>
                </div>

                <div style={{ display: "grid", gap: ".5rem" }}>
                    <Label>{t("usermanagement.users.fields.lastLoginAt", { defaultValue: "آخرین ورود" })}</Label>
                    <Text>{formatDate(value.lastLoginAt)}</Text>
                </div>
            </div>

            <Card
                header={
                    <CardHeader
                        titleText={t("usermanagement.users.assignmentsTitle", {
                            defaultValue: "نقش‌های تخصیص‌یافته",
                        })}
                    />
                }
            >
                <div style={{ padding: "1rem" }}>
                    <UserAssignmentsList items={value.assignments} />
                </div>
            </Card>
        </div>
    );
}
