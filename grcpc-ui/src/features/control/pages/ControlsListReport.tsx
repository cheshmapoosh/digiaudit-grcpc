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

import type { ControlStructureNode } from "../domain/control.model";
import ControlActionMenu, {
    type ControlCreateAction,
} from "../components/ControlActionMenu";
import ControlStructureTree from "../components/ControlStructureTree";

export interface ControlsListReportProps {
    items: ControlStructureNode[];
    selectedId?: string | null;
    selectedItem?: ControlStructureNode | null;
    expansionAnchorId?: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSearchTextChange: (value: string) => void;
    onCreateAction: (action: ControlCreateAction) => void;
    onShow: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

export default function ControlsListReport({
    items,
    selectedId,
    selectedItem,
    expansionAnchorId,
    searchText,
    busy = false,
    error,
    onErrorClose,
    onSearchTextChange,
    onCreateAction,
    onShow,
    onEdit,
    onDelete,
    onSelect,
}: ControlsListReportProps) {
    const { t } = useTranslation();
    const selectedControlId = selectedItem?.nodeType === "control" ? selectedId : null;

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
                        {t("control.list.title", { defaultValue: "مرکز کنترل" })}
                    </Title>
                }
                endContent={
                    <div style={actionGroupStyle}>
                        <ControlActionMenu
                            disabled={busy}
                            onAction={onCreateAction}
                        />

                        <Button
                            design="Emphasized"
                            disabled={!selectedControlId || busy}
                            style={actionButtonStyle}
                            onClick={() => selectedControlId && onShow(selectedControlId)}
                        >
                            {t("common.view", { defaultValue: "نمایش" })}
                        </Button>

                        <Button
                            design="Transparent"
                            disabled={!selectedControlId || busy}
                            style={actionButtonStyle}
                            onClick={() => selectedControlId && onEdit(selectedControlId)}
                        >
                            {t("common.edit", { defaultValue: "ویرایش" })}
                        </Button>

                        <Button
                            design="Negative"
                            disabled={!selectedControlId || busy}
                            style={{ ...actionButtonStyle, minWidth: "9rem" }}
                            onClick={() => selectedControlId && onDelete(selectedControlId)}
                        >
                            {t("control.actions.deleteAssignment", {
                                defaultValue: "حذف اتصال کنترل",
                            })}
                        </Button>
                    </div>
                }
            />

            <Input
                value={searchText}
                disabled={busy}
                placeholder={t("control.list.search", {
                    defaultValue: "جستجو بر اساس نام، کد یا توضیحات",
                })}
                onInput={(event) => onSearchTextChange(readInputValue(event))}
            />

            {error ? (
                <MessageStrip design="Negative" onClose={onErrorClose}>
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

                <ControlStructureTree
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
