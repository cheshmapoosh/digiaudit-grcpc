import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    BusyIndicator,
    Button,
    Input,
    Label,
    List,
    ListItemCustom,
    MessageStrip,
    Text,
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
                normalize(role.code).includes(query) ||
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

            <List>
                {filteredItems.length === 0 ? (
                    <ListItemCustom>
                        <Text>
                            {t("usermanagement.roles.empty", {
                                defaultValue: "نقشی برای نمایش وجود ندارد",
                            })}
                        </Text>
                    </ListItemCustom>
                ) : (
                    filteredItems.map((item) => {
                        const selected = item.id === selectedId;

                        return (
                            <ListItemCustom key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(item.id)}
                                    style={{
                                        width: "100%",
                                        textAlign: "right",
                                        border: selected
                                            ? "1px solid var(--sapSelectedColor)"
                                            : "1px solid var(--sapGroup_ContentBorderColor)",
                                        borderRadius: "0.875rem",
                                        padding: "0.875rem",
                                        background: selected
                                            ? "var(--sapList_SelectionBackgroundColor)"
                                            : "var(--sapGroup_ContentBackground)",
                                        cursor: "pointer",
                                        display: "grid",
                                        gap: ".45rem",
                                        fontFamily: "inherit",
                                        fontSize: "inherit",
                                        color: "inherit",
                                    }}
                                >
                                    <div style={{ display: "grid", gap: ".35rem", minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontFamily: "inherit" }}>
                                            {item.title || item.code}
                                        </div>
                                        <Text>{item.code}</Text>
                                        {item.description ? <Text>{item.description}</Text> : null}
                                        <Text>
                                            {item.enabled
                                                ? t("usermanagement.roles.status.enabled", { defaultValue: "فعال" })
                                                : t("usermanagement.roles.status.disabled", { defaultValue: "غیرفعال" })}
                                        </Text>
                                    </div>
                                </button>
                            </ListItemCustom>
                        );
                    })
                )}
            </List>
        </div>
    );
}
