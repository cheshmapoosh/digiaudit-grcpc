import "../components/user-management-forms.css";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    FlexBox,
    Table, TableHeaderRow, TableHeaderCell, TableRow, TableCell, Text, ObjectStatus,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import { HeaderSearch } from "@/shared/components/HeaderSearch";
import type { RoleSummary } from "../domain/usermanagement.model";

type RolesListReportProps = {
    items: RoleSummary[];
    selectedId: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onSearchTextChange: (value: string) => void;
    onSelect: (id: string) => void;
};

function normalize(value: string | null | undefined): string {
    return (value ?? "").trim().toLowerCase();
}

export default function RolesListReport({
    items,
    selectedId,
    searchText,
    busy = false,
    error = null,
    onSearchTextChange,
    onSelect,
}: RolesListReportProps) {
    const { t } = useTranslation();

    const filteredItems = useMemo(() => {
        const query = normalize(searchText);
        if (!query) {
            return items;
        }

        return items.filter((role) => {
            return (
                normalize(role.title).includes(query) ||
                normalize(role.description).includes(query)
            );
        });
    }, [items, searchText]);

    return (
        <FlexBox direction="Column" className="managementListContent">
            <Bar
                startContent={
                    <Title level="H4">
                        {t("usermanagement.roles.listTitle", {
                            defaultValue: "نقش ها",
                        })}
                    </Title>
                }
                endContent={
                    <HeaderSearch value={searchText} onChange={onSearchTextChange} />
                }
            />

            {error ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {error}
                </MessageStrip>
            ) : null}

            <Table loading={busy} onRowClick={(event) => { if (event.detail.row.rowKey) onSelect(event.detail.row.rowKey); }} noDataText={t("usermanagement.roles.empty")} headerRow={
                <TableHeaderRow>
                    <TableHeaderCell>{t("usermanagement.roles.fields.title")}</TableHeaderCell>
                    <TableHeaderCell>{t("usermanagement.roles.fields.status")}</TableHeaderCell>
                </TableHeaderRow>
            }>
                {filteredItems.map((item) => (
                    <TableRow key={item.id} rowKey={item.id} interactive navigated={selectedId === item.id} className={selectedId === item.id ? "userManagementSelectedRow" : undefined}>
                        <TableCell><Text>{item.title && item.title !== item.code ? item.title : t("usermanagement.roles.untitled")}</Text></TableCell>

                        <TableCell><ObjectStatus state={item.enabled ? "Positive" : "None"}>{t(item.enabled ? "usermanagement.roles.status.enabled" : "usermanagement.roles.status.disabled")}</ObjectStatus></TableCell>
                    </TableRow>
                ))}
            </Table>
        </FlexBox>
    );
}
