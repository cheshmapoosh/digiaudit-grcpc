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

import type { RoleSummary } from "../domain/usermanagement.model";

type RolesListReportProps = {
    items: RoleSummary[];
    selectedId: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onSearchTextChange: (value: string) => void;
    onRefresh: () => void;
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
    onRefresh,
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
        <div style={{ display: "grid", gap: "1rem", minWidth: 0 }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {t("usermanagement.roles.listTitle", {
                            defaultValue: "فهرست نقش‌ها",
                        })}
                    </Title>
                }
                endContent={
                    <Button design="Transparent" icon="refresh" onClick={onRefresh}>
                        {t("common.refresh", { defaultValue: "بازآوری" })}
                    </Button>
                }
            />

            <div style={{ display: "grid", gap: ".5rem" }}>
                <Label for="roles-search">
                    {t("usermanagement.roles.searchLabel", {
                        defaultValue: "جستجو",
                    })}
                </Label>
                <Input
                    id="roles-search"
                    value={searchText}
                    placeholder={t("usermanagement.roles.searchPlaceholder", {
                        defaultValue: "کد، عنوان یا توضیح نقش",
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

            <Table noDataText={t("usermanagement.roles.empty")} headerRow={
                <TableHeaderRow>
                    <TableHeaderCell>{t("usermanagement.roles.fields.title")}</TableHeaderCell>
                    <TableHeaderCell>{t("usermanagement.roles.fields.status")}</TableHeaderCell>
                </TableHeaderRow>
            }>
                {filteredItems.map((item) => (
                    <TableRow key={item.id} rowKey={item.id} className={selectedId === item.id ? "userManagementSelectedRow" : undefined}>
                        <TableCell><Link onClick={() => onSelect(item.id)}>{item.title && item.title !== item.code ? item.title : t("usermanagement.roles.untitled")}</Link></TableCell>

                        <TableCell><ObjectStatus state={item.enabled ? "Positive" : "None"}>{t(item.enabled ? "usermanagement.roles.status.enabled" : "usermanagement.roles.status.disabled")}</ObjectStatus></TableCell>
                    </TableRow>
                ))}
            </Table>
        </div>
    );
}
