import "../components/user-management-forms.css";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    FlexBox,
    Table, TableHeaderRow, TableHeaderCell, TableRow, TableCell, TableSelectionSingle, ObjectStatus,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import { HeaderSearch } from "@/shared/components/HeaderSearch";
import type { UserSummary } from "@/features/usermanagement";

type UsersListReportProps = {
    items: UserSummary[];
    selectedId: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onSearchTextChange: (value: string) => void;
    onCreate?: () => void;
    actions?: ReactNode;
    onSelect: (id: string | null) => void;
    onShow: (id: string) => void;
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
                                            onCreate,
                                            actions,
                                            onSelect,
                                            onShow,
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
        <FlexBox direction="Column" className="managementListContent">
            <Bar
                startContent={
                    <Title level="H4">
                        {t("usermanagement.users.listTitle", {
                            defaultValue: "کاربران",
                        })}
                    </Title>
                }
                endContent={
                    <>
                    <HeaderSearch value={searchText} onChange={onSearchTextChange} />
                    {onCreate ? <Button design="Emphasized" disabled={busy} onClick={onCreate}>{t("usermanagement.demo.createUser")}</Button> : null}
                    <Button design="Emphasized" disabled={busy || !selectedId} onClick={() => selectedId && onShow(selectedId)}>{t("management.view")}</Button>
                    {actions}
                    </>
                }
            />

            {error ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {error}
                </MessageStrip>
            ) : null}

            <Table loading={busy} features={<TableSelectionSingle selected={selectedId ?? undefined} behavior="RowOnly"
                onChange={(event) => { if (!busy) onSelect(event.target.selected ?? null); }} />}
                noDataText={t("usermanagement.users.empty")}
                headerRow={
                <TableHeaderRow>
                    <TableHeaderCell>{t("usermanagement.users.fields.fullName")}</TableHeaderCell>
                    <TableHeaderCell>{t("usermanagement.users.fields.username")}</TableHeaderCell>
                    <TableHeaderCell>{t("usermanagement.roles.fields.status")}</TableHeaderCell>
                </TableHeaderRow>
            }>
                {filteredItems.map((item) => (
                    <TableRow key={item.id} rowKey={item.id} interactive navigated={selectedId === item.id} className={selectedId === item.id ? "userManagementSelectedRow" : undefined}>
                        <TableCell>{buildFullName(item)}</TableCell>
                        <TableCell>{item.username}</TableCell>
                        <TableCell><ObjectStatus state={item.enabled ? "Positive" : "None"}>{t(item.enabled ? "usermanagement.users.status.enabled" : "usermanagement.users.status.disabled")}</ObjectStatus></TableCell>
                    </TableRow>
                ))}
            </Table>
        </FlexBox>
    );
}
