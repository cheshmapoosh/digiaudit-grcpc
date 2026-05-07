import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type { ObjectiveNode, ObjectiveType } from "../domain/objective.model";
import {
    buildTree,
    collectAncestorIds,
    filterTree,
    type ObjectiveTreeNode,
} from "../utils/objective.tree";

export interface ObjectiveTreeProps {
    items: ObjectiveNode[];
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText?: string;
    busy?: boolean;
    manualExpandedIds: Set<string>;
    manualCollapsedIds: Set<string>;
    onManualExpandedIdsChange: Dispatch<SetStateAction<Set<string>>>;
    onManualCollapsedIdsChange: Dispatch<SetStateAction<Set<string>>>;
    onSelect?: (id: string) => void;
}

type TreeEventWithItem = {
    detail?: {
        item?: HTMLElement & {
            dataset?: {
                id?: string;
            };
        };
    };
    preventDefault?: () => void;
};

function readTreeItemId(event: TreeEventWithItem): string | null {
    return event.detail?.item?.dataset?.id ?? null;
}

function collectExpandableIds(nodes: ObjectiveTreeNode[]): Set<string> {
    const result = new Set<string>();

    const visit = (node: ObjectiveTreeNode) => {
        if (node.children.length > 0) {
            result.add(node.id);
            node.children.forEach(visit);
        }
    };

    nodes.forEach(visit);
    return result;
}

function addToSet(previous: Set<string>, id: string): Set<string> {
    const next = new Set(previous);
    next.add(id);
    return next;
}

function removeFromSet(previous: Set<string>, id: string): Set<string> {
    const next = new Set(previous);
    next.delete(id);
    return next;
}

function resolveObjectiveTypeLabel(
    objectiveType: ObjectiveType | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!objectiveType) {
        return "-";
    }

    const labels: Record<ObjectiveType, string> = {
        operational: t("objective.type.operational", { defaultValue: "اهداف عملیاتی" }),
        compliance: t("objective.type.compliance", { defaultValue: "اهداف رعایتی" }),
        strategic: t("objective.type.strategic", { defaultValue: "اهداف استراتژیک" }),
        financial: t("objective.type.financial", { defaultValue: "اهداف مالی" }),
        reporting: t("objective.type.reporting", { defaultValue: "اهداف گزارشگری" }),
        market: t("objective.type.market", { defaultValue: "اهداف بازار" }),
    };

    return labels[objectiveType];
}

interface ObjectiveTreeItemProps {
    node: ObjectiveTreeNode;
    selectedId?: string | null;
    expandedIds: Set<string>;
}

function ObjectiveTreeItem({
    node,
    selectedId,
    expandedIds,
}: ObjectiveTreeItemProps) {
    const { t } = useTranslation();
    const isSelected = node.id === selectedId;
    const displayName = node.title;

    return (
        <TreeItemCustom
            data-id={node.id}
            expanded={expandedIds.has(node.id)}
            selected={isSelected}
            content={
                <div
                    title={displayName}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(18rem, 1fr) 10rem 10rem",
                        alignItems: "center",
                        minWidth: 0,
                        width: "100%",
                        columnGap: "1rem",
                        color: "var(--sapTextColor)",
                        fontWeight: isSelected ? 700 : 400,
                    }}
                >
                    <span
                        style={{
                            display: "block",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {displayName}
                    </span>

                    <span
                        style={{
                            display: "block",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                        }}
                    >
                        {resolveObjectiveTypeLabel(node.objectiveType, t)}
                    </span>

                    <span
                        style={{
                            display: "block",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                        }}
                    >
                        {node.objectiveClass?.trim() ? node.objectiveClass : "-"}
                    </span>
                </div>
            }
        >
            {node.children.map((child) => (
                <ObjectiveTreeItem
                    key={child.id}
                    node={child}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                />
            ))}
        </TreeItemCustom>
    );
}

export default function ObjectiveTree({
    items,
    selectedId,
    expansionAnchorId,
    searchText = "",
    busy = false,
    manualExpandedIds,
    manualCollapsedIds,
    onManualExpandedIdsChange,
    onManualCollapsedIdsChange,
    onSelect,
}: ObjectiveTreeProps) {
    const { t } = useTranslation();
    const normalizedSearchText = searchText.trim();

    const tree = useMemo(() => buildTree(items), [items]);

    const filteredTree = useMemo(
        () => filterTree(tree, normalizedSearchText),
        [tree, normalizedSearchText],
    );

    const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);

    const filteredExpandableIds = useMemo(
        () => collectExpandableIds(filteredTree),
        [filteredTree],
    );

    const autoExpandedIds = useMemo(() => {
        const anchorId = expansionAnchorId ?? selectedId ?? null;
        const result = new Set<string>(collectAncestorIds(items, anchorId));

        if (expansionAnchorId && expandableIds.has(expansionAnchorId)) {
            result.add(expansionAnchorId);
        }

        if (normalizedSearchText) {
            filteredExpandableIds.forEach((id) => result.add(id));
        }

        return result;
    }, [
        expansionAnchorId,
        expandableIds,
        filteredExpandableIds,
        items,
        normalizedSearchText,
        selectedId,
    ]);

    const expandedIds = useMemo(() => {
        if (normalizedSearchText) {
            return autoExpandedIds;
        }

        const result = new Set<string>();

        autoExpandedIds.forEach((id) => {
            if (!manualCollapsedIds.has(id)) {
                result.add(id);
            }
        });

        manualExpandedIds.forEach((id) => {
            if (!manualCollapsedIds.has(id)) {
                result.add(id);
            }
        });

        return result;
    }, [autoExpandedIds, manualCollapsedIds, manualExpandedIds, normalizedSearchText]);

    const handleItemClick = useCallback(
        (event: TreeEventWithItem) => {
            const id = readTreeItemId(event);

            if (id) {
                onSelect?.(id);
            }
        },
        [onSelect],
    );

    const handleItemToggle = useCallback(
        (event: TreeEventWithItem) => {
            event.preventDefault?.();

            const id = readTreeItemId(event);

            if (!id || normalizedSearchText) {
                return;
            }

            const isExpanded = expandedIds.has(id);

            if (isExpanded) {
                onManualExpandedIdsChange((prev) => removeFromSet(prev, id));
                onManualCollapsedIdsChange((prev) => addToSet(prev, id));
                return;
            }

            onManualCollapsedIdsChange((prev) => removeFromSet(prev, id));
            onManualExpandedIdsChange((prev) => addToSet(prev, id));
        },
        [
            expandedIds,
            normalizedSearchText,
            onManualCollapsedIdsChange,
            onManualExpandedIdsChange,
        ],
    );

    if (!items.length && !busy) {
        return (
            <MessageStrip design="Information" hideCloseButton>
                {t("objective.list.empty", {
                    defaultValue: "هیچ هدفی ثبت نشده است.",
                })}
            </MessageStrip>
        );
    }

    return (
        <div
            style={{
                minWidth: "42rem",
                border: "1px solid var(--sapList_BorderColor)",
                background: "var(--sapList_Background)",
            }}
        >
            <div
                role="row"
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(18rem, 1fr) 10rem 10rem",
                    columnGap: "1rem",
                    padding: "0.35rem 0.75rem",
                    borderBlockEnd: "1px solid var(--sapList_BorderColor)",
                    background: "var(--sapList_HeaderBackground)",
                    color: "var(--sapTextColor)",
                    fontWeight: 700,
                    boxSizing: "border-box",
                }}
            >
                <span>{t("objective.fields.name", { defaultValue: "نام" })}</span>
                <span style={{ textAlign: "center" }}>
                    {t("objective.fields.objectiveType", { defaultValue: "نوع هدف" })}
                </span>
                <span style={{ textAlign: "center" }}>
                    {t("objective.fields.objectiveClass", { defaultValue: "طبقه هدف" })}
                </span>
            </div>

            <Tree
                accessibleName={t("objective.list.title", {
                    defaultValue: "ساختار اهداف",
                })}
                onItemClick={handleItemClick}
                onItemToggle={handleItemToggle}
                style={{
                    minHeight: "100%",
                    width: "100%",
                }}
            >
                {filteredTree.map((node) => (
                    <ObjectiveTreeItem
                        key={node.id}
                        node={node}
                        selectedId={selectedId}
                        expandedIds={expandedIds}
                    />
                ))}
            </Tree>
        </div>
    );
}
