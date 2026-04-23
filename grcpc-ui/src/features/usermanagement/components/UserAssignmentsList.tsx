import { useTranslation } from "react-i18next";
import { List, ListItemCustom, Text, Title } from "@ui5/webcomponents-react";
import type { UserRoleAssignment } from "@/features/usermanagement";

export interface UserAssignmentsListProps {
    items: UserRoleAssignment[];
}

function formatDate(value?: string | null): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function UserAssignmentsList({ items }: UserAssignmentsListProps) {
    const { t } = useTranslation();

    if (items.length === 0) {
        return (
            <Text>
                {t("usermanagement.users.noAssignments", {
                    defaultValue: "برای این کاربر هنوز نقشی ثبت نشده است.",
                })}
            </Text>
        );
    }

    return (
        <List>
            {items.map((assignment) => (
                <ListItemCustom key={assignment.id}>
                    <div style={{ display: "grid", gap: ".35rem", width: "100%" }}>
                        <Title level="H6">{assignment.roleTitle || assignment.roleCode}</Title>
                        <Text>{assignment.roleCode}</Text>
                        <Text>
                            {t("usermanagement.users.assignment.scope", {
                                defaultValue: "دامنه",
                            })}: {assignment.scopeType}
                        </Text>
                        <Text>
                            {t("usermanagement.users.assignment.validity", {
                                defaultValue: "اعتبار",
                            })}: {formatDate(assignment.validFrom)} - {formatDate(assignment.validTo)}
                        </Text>
                    </div>
                </ListItemCustom>
            ))}
        </List>
    );
}
