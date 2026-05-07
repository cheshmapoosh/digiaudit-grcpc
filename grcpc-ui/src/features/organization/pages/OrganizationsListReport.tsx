import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    BusyIndicator,
    Input,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type { OrganizationNode } from "@/features/organization";
import OrganizationTree from "../components/OrganizationTree";

export interface OrganizationsListReportProps {
    items: OrganizationNode[];
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

export default function OrganizationsListReport({
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
                                                }: OrganizationsListReportProps) {
    const { t } = useTranslation();

    const actionButtonStyle = useMemo(
        () => ({
            minWidth: "8rem",
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
                        {t("organization.list.title", { defaultValue: "ساختار سازمانی" })}
                    </Title>
                }
                endContent={
                    <>
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
                    </>
                }
            />

            <Input
                value={searchText}
                disabled={busy}
                placeholder={t("organization.list.search", {
                    defaultValue: "جستجو بر اساس نام، کد یا توضیحات",
                })}
                onInput={(event) => onSearchTextChange(event.target.value)}
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
                    overflowX: "hidden",
                    border: "1px solid var(--sapGroup_ContentBorderColor)",
                    borderRadius: "0",
                    padding: "0.75rem",
                    background: "var(--sapList_Background)",
                    boxSizing: "border-box",
                }}
            >
                {busy ? <BusyIndicator active /> : null}

                <OrganizationTree
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