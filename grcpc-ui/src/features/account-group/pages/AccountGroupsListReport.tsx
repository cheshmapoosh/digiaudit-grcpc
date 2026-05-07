import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    BusyIndicator,
    Button,
    Input,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type { AccountGroupNode } from "../domain/accountGroup.model";
import AccountGroupTree from "../components/AccountGroupTree";

export interface AccountGroupsListReportProps {
    items: AccountGroupNode[];
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onSearchTextChange: (value: string) => void;
    onCreate: () => void;
    onShow: (id: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

export default function AccountGroupsListReport({
    items,
    selectedId,
    expansionAnchorId,
    searchText,
    busy = false,
    error,
    onSearchTextChange,
    onCreate,
    onShow,
    onDelete,
    onSelect,
}: AccountGroupsListReportProps) {
    const { t } = useTranslation();

    const actionButtonStyle = useMemo<CSSProperties>(
        () => ({
            minWidth: "6rem",
        }),
        [],
    );

    const actionGroupStyle = useMemo<CSSProperties>(
        () => ({
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "nowrap",
            whiteSpace: "nowrap",
        }),
        [],
    );

    return (
        <div
            style={{
                display: "grid",
                gridTemplateRows: "auto auto auto minmax(0, 1fr)",
                gap: "1rem",
                height: "100%",
                minHeight: 0,
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {t("accountGroup.list.title", {
                            defaultValue: "ساختار گروه حساب‌ها",
                        })}
                    </Title>
                }
                endContent={
                    <div style={actionGroupStyle}>
                        <Button
                            design="Emphasized"
                            disabled={busy}
                            style={actionButtonStyle}
                            onClick={onCreate}
                        >
                            {t("common.create", { defaultValue: "ایجاد" })}
                        </Button>

                        <Button
                            design="Emphasized"
                            disabled={!selectedId || busy}
                            style={actionButtonStyle}
                            onClick={() => selectedId && onShow(selectedId)}
                        >
                            {t("common.view", { defaultValue: "نمایش" })}
                        </Button>

                        <Button
                            design="Negative"
                            disabled={!selectedId || busy}
                            style={actionButtonStyle}
                            onClick={() => selectedId && onDelete(selectedId)}
                        >
                            {t("common.delete", { defaultValue: "حذف" })}
                        </Button>
                    </div>
                }
            />

            <Input
                value={searchText}
                disabled={busy}
                placeholder={t("accountGroup.list.search", {
                    defaultValue: "جستجو بر اساس نام، کد یا توضیحات",
                })}
                onInput={(event) => onSearchTextChange(readInputValue(event))}
            />

            {error ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {error}
                </MessageStrip>
            ) : null}

            <div
                style={{
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "auto",
                    border: "1px solid var(--sapGroup_ContentBorderColor)",
                    borderRadius: "0",
                    padding: "0.75rem",
                    background: "var(--sapList_Background)",
                    boxSizing: "border-box",
                }}
            >
                {busy ? <BusyIndicator active /> : null}

                <AccountGroupTree
                    items={items}
                    selectedId={selectedId}
                    expansionAnchorId={expansionAnchorId}
                    searchText={searchText}
                    busy={busy}
                    onSelect={onSelect}
                />
            </div>
        </div>
    );
}
