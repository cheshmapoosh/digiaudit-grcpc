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

import type { ProcessNodeType } from "../domain/process.model";
import ProcessCreateMenu, {
    type ProcessControlCreateAction,
} from "../components/ProcessCreateMenu";
import ProcessControlTree from "../components/ProcessControlTree";
import type { ProcessControlTreeItem } from "../utils/process-control.tree";

export interface ProcessesListReportProps {
    items: ProcessControlTreeItem[];
    selectedItem?: ProcessControlTreeItem | null;
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    createOptions: ProcessNodeType[];
    onSearchTextChange: (value: string) => void;
    onCreate: (nodeType: ProcessNodeType) => void;
    onCreateControlAction: (action: ProcessControlCreateAction) => void;
    onShow: (id: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

export default function ProcessesListReport({
                                                items,
                                                selectedItem,
                                                selectedId,
                                                expansionAnchorId,
                                                searchText,
                                                busy = false,
                                                error,
                                                onErrorClose,
                                                createOptions,
                                                onSearchTextChange,
                                                onCreate,
                                                onCreateControlAction,
                                                onShow,
                                                onDelete,
                                                onSelect,
                                            }: ProcessesListReportProps) {
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

    const canCreate = !busy;

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
                        {t("process.list.title", { defaultValue: "ساختار فرآیند" })}
                    </Title>
                }
                endContent={
                    <div style={actionGroupStyle}>
                        <ProcessCreateMenu
                            disabled={!canCreate}
                            style={actionButtonStyle}
                            nodeTypes={createOptions}
                            onCreateProcess={onCreate}
                            onCreateControl={onCreateControlAction}
                        />

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
                            {selectedItem?.nodeType === "control"
                                ? t("control.actions.deleteAssignment", {
                                    defaultValue: "حذف اتصال کنترل",
                                })
                                : t("common.delete", { defaultValue: "حذف" })}
                        </Button>
                    </div>
                }
            />

            <Input
                value={searchText}
                disabled={busy}
                placeholder={t("process.list.search", {
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

                <ProcessControlTree
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
