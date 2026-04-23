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

import type { UserSummary } from "@/features/usermanagement";

type UsersListReportProps = {
    items: UserSummary[];
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
                    <Button design="Transparent" icon="refresh" onClick={onRefresh}>
                        {t("common.refresh", { defaultValue: "بازآوری" })}
                    </Button>
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

            <List>
                {filteredItems.length === 0 ? (
                    <ListItemCustom>
                        <div
                            style={{
                                padding: ".5rem 0",
                                display: "grid",
                                gap: ".25rem",
                            }}
                        >
                            <Text>
                                {t("usermanagement.users.empty", {
                                    defaultValue: "کاربری برای نمایش وجود ندارد",
                                })}
                            </Text>
                        </div>
                    </ListItemCustom>
                ) : (
                    filteredItems.map((item) => {
                        const selected = item.id === selectedId;
                        const fullName = buildFullName(item);

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
                                        gap: ".5rem",
                                        fontFamily: "inherit",
                                        fontSize: "inherit",
                                        color: "inherit",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: "1rem",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "grid",
                                                gap: ".35rem",
                                                minWidth: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontFamily: "inherit",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {fullName}
                                            </div>

                                            <Text>{item.username}</Text>

                                            {item.email ? <Text>{item.email}</Text> : null}

                                            {item.mobile ? <Text>{item.mobile}</Text> : null}
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gap: ".35rem",
                                                justifyItems: "end",
                                                flex: "0 0 auto",
                                            }}
                                        >
                                            <Text>
                                                {item.enabled
                                                    ? t("usermanagement.users.status.enabled", {
                                                        defaultValue: "فعال",
                                                    })
                                                    : t("usermanagement.users.status.disabled", {
                                                        defaultValue: "غیرفعال",
                                                    })}
                                            </Text>

                                            {item.rootUser ? (
                                                <Text>
                                                    {t("usermanagement.users.status.rootUser", {
                                                        defaultValue: "ریشه",
                                                    })}
                                                </Text>
                                            ) : null}
                                        </div>
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