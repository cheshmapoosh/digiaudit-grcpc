import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type { OrganizationNode } from "../domain/organization.model";
import {
    buildTree,
    collectAncestorIds,
    filterTree,
    type OrganizationTreeNode,
} from "../utils/organization.tree";

export interface OrganizationTreeProps {
    items: OrganizationNode[];
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

function collectExpandableIds(nodes: OrganizationTreeNode[]): Set<string> {
    const result = new Set<string>();

    const visit = (node: OrganizationTreeNode) => {
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

interface OrganizationTreeItemProps {
    node: OrganizationTreeNode;
    selectedId?: string | null;
    expandedIds: Set<string>;
}

function OrganizationTreeItem({
                                  node,
                                  selectedId,
                                  expandedIds,
                              }: OrganizationTreeItemProps) {
    const isSelected = node.id === selectedId;

    return (
        <TreeItemCustom
            icon="+"
            data-id={node.id}
            expanded={expandedIds.has(node.id)}
            selected={isSelected}
            content={
                <span
                    title={node.name}
                    style={{
                        display: "block",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--sapTextColor)",
                        fontWeight: isSelected ? 700 : 400,
                    }}
                >
          {node.name}
        </span>
            }
        >
            {node.children.map((child) => (
                <OrganizationTreeItem
                    key={child.id}
                    node={child}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                />
            ))}
        </TreeItemCustom>
    );
}

export default function OrganizationTree({
                                             items,
                                             selectedId,
                                             expansionAnchorId,
                                             searchText = "",
                                             busy = false,
                                             onSelect,
                                         }: OrganizationTreeProps) {
    const { t } = useTranslation();

    const normalizedSearchText = searchText.trim();

    const tree = useMemo(() => buildTree(items), [items]);

    const filteredTree = useMemo(
        () => filterTree(tree, normalizedSearchText),
        [tree, normalizedSearchText],
    );

    const expandableIds = useMemo(
        () => collectExpandableIds(tree),
        [tree],
    );

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
                {t("organization.list.empty", {
                    defaultValue: "هیچ واحد سازمانی ثبت نشده است.",
                })}
            </MessageStrip>
        );
    }

    return (
        <Tree
            accessibleName={t("organization.list.title", {
                defaultValue: "ساختار سازمانی",
            })}
            onItemClick={handleItemClick}
            onItemToggle={handleItemToggle}
            style={{ minHeight: "100%" }}
        >
            {filteredTree.map((node) => (
                <OrganizationTreeItem
                    key={node.id}
                    node={node}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                />
            ))}
        </Tree>
    );
}