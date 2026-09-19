import "../components/user-management-forms.css";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    BusyIndicator,
    Button,
    Input,
    Label,
    Table, TableHeaderRow, TableHeaderCell, TableRow, TableCell, Link, ObjectStatus,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type { UserSummary } from "@/features/usermanagement";

type UsersListReportProps = {
    items: UserSummary[];
    selectedId: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onSearchTextChange: (value: string) => void;
    onCreate?: () => void;
    onRefresh: () => void;
    onSelect: (id: string) => void;
};

function normalize(value: string | null | undefined): string {
    return (value ?? "").trim().toLowerCase();
}

function buildFullName(user: UserSummary): string {
    const value = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    return value || user.username;
}

export default function UsersListReport({
                                            items,
                                            selectedId,
                                            searchText,
                                            busy = false,
                                            error = null,
                                            onSearchTextChange,
                                            onRefresh,
                                            onCreate,
                                            onSelect,
                                        }: UsersListReportProps) {
    const { t } = useTranslation();

    const filteredItems = useMemo(() => {
        const query = normalize(searchText);

        if (!query) {
            return items;
        }

        return items.filter((user) => {
            const fullName = normalize(buildFullName(user));
            const username = normalize(user.username);
            const email = normalize(user.email);
            const mobile = normalize(user.mobile);

            return (
                fullName.includes(query) ||
                username.includes(query) ||
                email.includes(query) ||
                mobile.includes(query)
            );
        });
    }, [items, searchText]);

    return (
        <div style={{ display: "grid", gap: "1rem", minWidth: 0 }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {t("usermanagement.users.listTitle", {
                            defaultValue: "فهرست کاربران",
                        })}
                    </Title>
                }
                endContent={
                    <>
                    {onCreate ? <Button design="Emphasized" icon="add" onClick={onCreate}>{t("usermanagement.demo.createUser")}</Button> : null}
                    <Button design="Transparent" icon="refresh" onClick={onRefresh}>
                        {t("common.refresh", { defaultValue: "بازآوری" })}
                    </Button>
                    </>
                }
            />

            <div style={{ display: "grid", gap: ".5rem" }}>
                <Label for="users-search">
                    {t("usermanagement.users.searchLabel", {
                        defaultValue: "جستجو",
                    })}
                </Label>
                <Input
                    id="users-search"
                    value={searchText}
                    placeholder={t("usermanagement.users.searchPlaceholder", {
                        defaultValue: "نام، نام کاربری، ایمیل یا موبایل",
                    })}
                    onInput={(event) => onSearchTextChange(event.target.value)}
                />
            </div>

            {error ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {error}
                </MessageStrip>
            ) : null}

            {busy ? <BusyIndicator active delay={0} /> : null}

            <Table noDataText={t("usermanagement.users.empty")} headerRow={
                <TableHeaderRow>
                    <TableHeaderCell>{t("usermanagement.users.fields.fullName")}</TableHeaderCell>
                    <TableHeaderCell>{t("usermanagement.users.fields.username")}</TableHeaderCell>
                    <TableHeaderCell>{t("usermanagement.roles.fields.status")}</TableHeaderCell>
                </TableHeaderRow>
            }>
                {filteredItems.map((item) => (
                    <TableRow key={item.id} rowKey={item.id} className={selectedId === item.id ? "userManagementSelectedRow" : undefined}>
                        <TableCell><Link onClick={() => onSelect(item.id)}>{buildFullName(item)}</Link></TableCell>
                        <TableCell>{item.username}</TableCell>
                        <TableCell><ObjectStatus state={item.enabled ? "Positive" : "None"}>{t(item.enabled ? "usermanagement.users.status.enabled" : "usermanagement.users.status.disabled")}</ObjectStatus></TableCell>
                    </TableRow>
                ))}
            </Table>
        </div>
    );
}