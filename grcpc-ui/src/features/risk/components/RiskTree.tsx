import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type { RiskNode, RiskNodeType } from "../domain/risk.model";
import {
    buildTree,
    collectAncestorIds,
    filterTree,
    type RiskTreeNode,
} from "../utils/risk.tree";

export interface RiskTreeProps {
    items: RiskNode[];
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText?: string;
    busy?: boolean;
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

function collectExpandableIds(nodes: RiskTreeNode[]): Set<string> {
    const result = new Set<string>();

    const visit = (node: RiskTreeNode) => {
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

function resolveNodeTypeLabel(
    nodeType: RiskNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<RiskNodeType, string> = {
        riskCategory: t("risk.nodeType.riskCategory", { defaultValue: "طبقه ریسک" }),
        riskTemplate: t("risk.nodeType.riskTemplate", { defaultValue: "الگوی ریسک" }),
    };

    return labels[nodeType];
}

interface RiskTreeItemProps {
    node: RiskTreeNode;
    selectedId?: string | null;
    expandedIds: Set<string>;
}

function RiskTreeItem({
                          node,
                          selectedId,
                          expandedIds,
                      }: RiskTreeItemProps) {
    const { t } = useTranslation();
    const isSelected = node.id === selectedId;
    const displayName = `${node.title}`;

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
                        gridTemplateColumns: "minmax(16rem, 1fr) 9rem",
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
                        {resolveNodeTypeLabel(node.nodeType, t)}
                    </span>
                </div>
            }
        >
            {node.children.map((child) => (
                <RiskTreeItem
                    key={child.id}
                    node={child}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                />
            ))}
        </TreeItemCustom>
    );
}

export default function RiskTree({
                                     items,
                                     selectedId,
                                     expansionAnchorId,
                                     searchText = "",
                                     busy = false,
                                     onSelect,
                                 }: RiskTreeProps) {
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

    const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set());
    const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(new Set());

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
                setManualExpandedIds((prev) => removeFromSet(prev, id));
                setManualCollapsedIds((prev) => addToSet(prev, id));
                return;
            }

            setManualCollapsedIds((prev) => removeFromSet(prev, id));
            setManualExpandedIds((prev) => addToSet(prev, id));
        },
        [expandedIds, normalizedSearchText],
    );

    if (!items.length && !busy) {
        return (
            <MessageStrip design="Information" hideCloseButton>
                {t("risk.list.empty", {
                    defaultValue: "هیچ دسته‌بندی ریسکی ثبت نشده است.",
                })}
            </MessageStrip>
        );
    }

    return (
        <div
            style={{
                minWidth: "34rem",
                border: "1px solid var(--sapList_BorderColor)",
                background: "var(--sapList_Background)",
            }}
        >
            <div
                role="row"
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(16rem, 1fr) 9rem",
                    columnGap: "1rem",
                    padding: "0.35rem 0.75rem",
                    borderBlockEnd: "1px solid var(--sapList_BorderColor)",
                    background: "var(--sapList_HeaderBackground)",
                    color: "var(--sapTextColor)",
                    fontWeight: 700,
                    boxSizing: "border-box",
                }}
            >
                <span>{t("risk.fields.name", { defaultValue: "نام" })}</span>
                <span style={{ textAlign: "center" }}>
                    {t("risk.fields.type", { defaultValue: "نوع" })}
                </span>
            </div>

            <Tree
                accessibleName={t("risk.list.title", {
                    defaultValue: "ساختار دسته‌بندی ریسک",
                })}
                onItemClick={handleItemClick}
                onItemToggle={handleItemToggle}
                style={{
                    minHeight: "100%",
                    width: "100%",
                }}
            >
                {filteredTree.map((node) => (
                    <RiskTreeItem
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
