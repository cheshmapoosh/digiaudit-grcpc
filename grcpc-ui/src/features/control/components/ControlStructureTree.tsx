import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type {
    ControlStructureNode,
    ControlStructureNodeType,
} from "../domain/control.model";
import {
    buildControlTree,
    collectControlAncestorIds,
    filterControlTree,
    type ControlTreeNode,
} from "../utils/control.structure";

export interface ControlStructureTreeProps {
    items: ControlStructureNode[];
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText?: string;
    busy?: boolean;
    onSelect?: (id: string) => void;
}

type TreeEventWithItem = {
    target?: EventTarget | null;
    detail?: {
        item?: HTMLElement & {
            dataset?: {
                id?: string;
                controlNodeId?: string;
            };
            getAttribute?: (name: string) => string | null;
        };
    };
    preventDefault?: () => void;
};

function readTreeItemId(event: TreeEventWithItem): string | null {
    const item = event.detail?.item;

    const itemId =
        item?.dataset?.controlNodeId ??
        item?.dataset?.id ??
        item?.getAttribute?.("data-control-node-id") ??
        item?.getAttribute?.("data-id");

    if (itemId) {
        return itemId;
    }

    if (event.target instanceof HTMLElement) {
        return event.target
            .closest<HTMLElement>("[data-control-node-id]")
            ?.dataset.controlNodeId ?? null;
    }

    return null;
}

function collectExpandableIds(nodes: ControlTreeNode[]): Set<string> {
    const result = new Set<string>();

    const visit = (node: ControlTreeNode) => {
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
    nodeType: ControlStructureNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<ControlStructureNodeType, string> = {
        process: t("control.nodeType.process", { defaultValue: "فرآیند" }),
        subProcess: t("control.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
        control: t("control.nodeType.control", { defaultValue: "کنترل" }),
    };

    return labels[nodeType];
}

interface ControlStructureTreeItemProps {
    node: ControlTreeNode;
    selectedId?: string | null;
    expandedIds: Set<string>;
}

function ControlStructureTreeItem({
    node,
    selectedId,
    expandedIds,
}: ControlStructureTreeItemProps) {
    const { t } = useTranslation();
    const isSelected = node.id === selectedId;
    const displayName = `${node.code} - ${node.title}`;

    return (
        <TreeItemCustom
            data-id={node.id}
            data-control-node-id={node.id}
            expanded={node.nodeType !== "control" && expandedIds.has(node.id)}
            selected={isSelected}
            content={
                <div
                    data-control-node-id={node.id}
                    title={displayName}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(18rem, 1fr) 8rem",
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
                <ControlStructureTreeItem
                    key={child.id}
                    node={child}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                />
            ))}
        </TreeItemCustom>
    );
}

export default function ControlStructureTree({
    items,
    selectedId,
    expansionAnchorId,
    searchText = "",
    busy = false,
    onSelect,
}: ControlStructureTreeProps) {
    const { t } = useTranslation();
    const normalizedSearchText = searchText.trim();

    const tree = useMemo(() => buildControlTree(items), [items]);
    const filteredTree = useMemo(
        () => filterControlTree(tree, normalizedSearchText),
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
        const result = new Set<string>(collectControlAncestorIds(items, anchorId));

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
            setManualExpandedIds((prevExpanded) => {
                if (isExpanded) {
                    return removeFromSet(prevExpanded, id);
                }

                return addToSet(prevExpanded, id);
            });

            setManualCollapsedIds((prevCollapsed) => {
                if (isExpanded) {
                    return addToSet(prevCollapsed, id);
                }

                return removeFromSet(prevCollapsed, id);
            });
        },
        [expandedIds, normalizedSearchText],
    );

    if (!items.length && !busy) {
        return (
            <MessageStrip design="Information" hideCloseButton>
                {t("control.list.empty", {
                    defaultValue: "هیچ کنترلی ثبت نشده است.",
                })}
            </MessageStrip>
        );
    }

    return (
        <div
            style={{
                minWidth: "36rem",
                border: "1px solid var(--sapList_BorderColor)",
                background: "var(--sapList_Background)",
            }}
        >
            <div
                role="row"
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(18rem, 1fr) 8rem",
                    columnGap: "1rem",
                    padding: "0.35rem 0.75rem",
                    borderBlockEnd: "1px solid var(--sapList_BorderColor)",
                    background: "var(--sapList_HeaderBackground)",
                    color: "var(--sapTextColor)",
                    fontWeight: 700,
                    boxSizing: "border-box",
                }}
            >
                <span>{t("control.fields.name", { defaultValue: "نام" })}</span>
                <span style={{ textAlign: "center" }}>
                    {t("control.fields.type", { defaultValue: "نوع" })}
                </span>
            </div>

            <Tree
                accessibleName={t("control.list.title", {
                    defaultValue: "مرکز کنترل",
                })}
                onItemClick={handleItemClick}
                onItemToggle={handleItemToggle}
                style={{
                    minHeight: "100%",
                    width: "100%",
                }}
            >
                {filteredTree.map((node) => (
                    <ControlStructureTreeItem
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
