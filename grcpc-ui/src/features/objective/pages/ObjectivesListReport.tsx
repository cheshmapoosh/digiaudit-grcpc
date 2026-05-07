import { useMemo, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    BusyIndicator,
    Button,
    Input,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type { ObjectiveNode, ObjectiveNodeType } from "../domain/objective.model";
import CreateObjectiveButton from "../components/CreateObjectiveButton";
import ObjectiveTree from "../components/ObjectiveTree";

export interface ObjectivesListReportProps {
    items: ObjectiveNode[];
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    createOptions: ObjectiveNodeType[];
    manualExpandedIds: Set<string>;
    manualCollapsedIds: Set<string>;
    onManualExpandedIdsChange: Dispatch<SetStateAction<Set<string>>>;
    onManualCollapsedIdsChange: Dispatch<SetStateAction<Set<string>>>;
    onSearchTextChange: (value: string) => void;
    onCreate: (nodeType: ObjectiveNodeType) => void;
    onShow: (id: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

export default function ObjectivesListReport({
    items,
    selectedId,
    expansionAnchorId,
    searchText,
    busy = false,
    error,
    createOptions,
    manualExpandedIds,
    manualCollapsedIds,
    onManualExpandedIdsChange,
    onManualCollapsedIdsChange,
    onSearchTextChange,
    onCreate,
    onShow,
    onDelete,
    onSelect,
}: ObjectivesListReportProps) {
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

    const canCreate = !busy && createOptions.length > 0;

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
                        {t("objective.list.title", { defaultValue: "ساختار اهداف" })}
                    </Title>
                }
                endContent={
                    <div style={actionGroupStyle}>
                        <CreateObjectiveButton
                            disabled={!canCreate}
                            onCreate={onCreate}
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
                            {t("common.delete", { defaultValue: "حذف" })}
                        </Button>
                    </div>
                }
            />

            <Input
                value={searchText}
                disabled={busy}
                placeholder={t("objective.list.search", {
                    defaultValue: "جستجو بر اساس نام، کد، شرح یا استراتژی",
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

                <ObjectiveTree
                    items={items}
                    selectedId={selectedId}
                    expansionAnchorId={expansionAnchorId}
                    searchText={searchText}
                    busy={busy}
                    manualExpandedIds={manualExpandedIds}
                    manualCollapsedIds={manualCollapsedIds}
                    onManualExpandedIdsChange={onManualExpandedIdsChange}
                    onManualCollapsedIdsChange={onManualCollapsedIdsChange}
                    onSelect={onSelect}
                />
            </div>
        </div>
    );
}
