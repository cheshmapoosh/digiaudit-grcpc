import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type { ProcessNodeType } from "../domain/process.model";
import {
    sortProcessControlItems,
    type ProcessControlNodeType,
    type ProcessControlTreeItem,
} from "../utils/process-control.tree";

interface ProcessControlTreeNode extends ProcessControlTreeItem {
    children: ProcessControlTreeNode[];
    level: number;
}

export interface ProcessControlTreeProps {
    items: ProcessControlTreeItem[];
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
                processNodeId?: string;
            };
            getAttribute?: (name: string) => string | null;
        };
    };
    preventDefault?: () => void;
};

function readTreeItemId(event: TreeEventWithItem): string | null {
    const item = event.detail?.item;

    const itemId =
        item?.dataset?.processNodeId ??
        item?.dataset?.id ??
        item?.getAttribute?.("data-process-node-id") ??
        item?.getAttribute?.("data-id");

    if (itemId) {
        return itemId;
    }

    if (event.target instanceof HTMLElement) {
        return event.target
            .closest<HTMLElement>("[data-process-node-id]")
            ?.dataset.processNodeId ?? null;
    }

    return null;
}

function containsText(value: string | null | undefined, searchText: string): boolean {
    return value?.toLocaleLowerCase("fa").includes(searchText.toLocaleLowerCase("fa")) ?? false;
}

function createsCycle(
    itemId: string,
    parentId: string,
    parentById: Map<string, string | null>,
): boolean {
    let currentParentId: string | null | undefined = parentId;
    const visited = new Set<string>();

    while (currentParentId) {
        if (currentParentId === itemId || visited.has(currentParentId)) {
            return true;
        }

        visited.add(currentParentId);
        currentParentId = parentById.get(currentParentId);
    }

    return false;
}

function buildProcessControlTree(items: ProcessControlTreeItem[]): ProcessControlTreeNode[] {
    const sorted = sortProcessControlItems(items);
    const byId = new Map<string, ProcessControlTreeNode>();
    const parentById = new Map<string, string | null>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });
        parentById.set(item.id, item.parentId ?? null);
    }

    const roots: ProcessControlTreeNode[] = [];

    for (const item of sorted) {
        const current = byId.get(item.id);

        if (!current) {
            continue;
        }

        const parentId = item.parentId;

        if (!parentId || parentId === item.id || !byId.has(parentId)) {
            roots.push(current);
            continue;
        }

        if (createsCycle(item.id, parentId, parentById)) {
            roots.push(current);
            continue;
        }

        const parent = byId.get(parentId);

        if (!parent || parent.nodeType === "control") {
            roots.push(current);
            continue;
        }

        current.level = parent.level + 1;
        parent.children.push(current);
    }

    return roots;
}

function filterProcessControlTree(
    nodes: ProcessControlTreeNode[],
    searchText: string,
): ProcessControlTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: ProcessControlTreeNode): ProcessControlTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is ProcessControlTreeNode => item !== null);

        const matched =
            containsText(node.title, searchText) ||
            containsText(node.code, searchText) ||
            containsText(node.description, searchText);

        if (!matched && filteredChildren.length === 0) {
            return null;
        }

        return {
            ...node,
            children: filteredChildren,
        };
    };

    return nodes
        .map(visit)
        .filter((item): item is ProcessControlTreeNode => item !== null);
}

function collectAncestorIds(
    items: ProcessControlTreeItem[],
    nodeId: string | null | undefined,
): string[] {
    if (!nodeId) {
        return [];
    }

    const byId = new Map(items.map((item) => [item.id, item]));
    const result: string[] = [];
    const visited = new Set<string>();

    let current = byId.get(nodeId);

    while (current?.parentId) {
        if (visited.has(current.parentId)) {
            break;
        }

        visited.add(current.parentId);
        result.push(current.parentId);
        current = byId.get(current.parentId);
    }

    return result;
}

function collectExpandableIds(nodes: ProcessControlTreeNode[]): Set<string> {
    const result = new Set<string>();

    const visit = (node: ProcessControlTreeNode) => {
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
    nodeType: ProcessControlNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (nodeType === "control") {
        return t("control.nodeType.control", { defaultValue: "کنترل" });
    }

    const labels: Record<ProcessNodeType, string> = {
        process: t("process.nodeType.process", { defaultValue: "فرآیند" }),
        subProcess: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
    };

    return labels[nodeType];
}

interface ProcessControlTreeItemProps {
    node: ProcessControlTreeNode;
    selectedId?: string | null;
    expandedIds: Set<string>;
}

function ProcessControlTreeNodeItem({
    node,
    selectedId,
    expandedIds,
}: ProcessControlTreeItemProps) {
    const { t } = useTranslation();
    const isSelected = node.id === selectedId;
    const displayName = node.title;

    return (
        <TreeItemCustom
            data-id={node.id}
            data-process-node-id={node.id}
            expanded={node.nodeType !== "control" && expandedIds.has(node.id)}
            selected={isSelected}
            content={
                <div
                    data-process-node-id={node.id}
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
            {node.nodeType === "control"
                ? null
                : node.children.map((child) => (
                    <ProcessControlTreeNodeItem
                        key={child.id}
                        node={child}
                        selectedId={selectedId}
                        expandedIds={expandedIds}
                    />
                ))}
        </TreeItemCustom>
    );
}

export default function ProcessControlTree({
    items,
    selectedId,
    expansionAnchorId,
    searchText = "",
    busy = false,
    onSelect,
}: ProcessControlTreeProps) {
    const { t } = useTranslation();
    const normalizedSearchText = searchText.trim();

    const tree = useMemo(() => buildProcessControlTree(items), [items]);

    const filteredTree = useMemo(
        () => filterProcessControlTree(tree, normalizedSearchText),
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

            if (!id || normalizedSearchText || !expandableIds.has(id)) {
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
        [expandableIds, expandedIds, normalizedSearchText],
    );

    if (!items.length && !busy) {
        return (
            <MessageStrip design="Information" hideCloseButton>
                {t("process.list.empty", {
                    defaultValue: "هیچ فرآیندی ثبت نشده است.",
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
                <span>{t("process.fields.name", { defaultValue: "نام" })}</span>
                <span style={{ textAlign: "center" }}>
                    {t("process.fields.type", { defaultValue: "نوع" })}
                </span>
            </div>

            <Tree
                accessibleName={t("process.list.title", {
                    defaultValue: "ساختار فرآیند",
                })}
                onItemClick={handleItemClick}
                onItemToggle={handleItemToggle}
                style={{
                    minHeight: "100%",
                    width: "100%",
                }}
            >
                {filteredTree.map((node) => (
                    <ProcessControlTreeNodeItem
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
