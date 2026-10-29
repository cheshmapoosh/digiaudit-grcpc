import { CatalogOrderedTreeItem as TreeItemCustom } from "@/shared/components/CatalogTreeOrder";
import { orderKey, useCatalogTreeOrder } from "@/shared/components/catalogOrder.context";
import { CatalogSelectableRow } from "@/shared/components/CatalogSelection";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree } from "@ui5/webcomponents-react";

import type { ProcessNode } from "../domain/process.model";
import { processControlTreeId, type ProcessControlNode, type ProcessCreateType } from "../domain/processControl.model";
import { collectAncestorIds } from "../utils/process.tree";
import { buildProcessDisplayTree, filterProcessDisplayTree, type ProcessDisplayTreeNode } from "../utils/processControl.tree";

const NO_CONTROLS: ProcessControlNode[] = [];

export interface ProcessTreeProps {
    items: ProcessNode[];
    controls?: ProcessControlNode[];
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

function collectExpandableIds(nodes: ProcessDisplayTreeNode[]): Set<string> {
    const result = new Set<string>();

    const visit = (node: ProcessDisplayTreeNode) => {
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
    nodeType: ProcessCreateType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<ProcessCreateType, string> = {
        PROCESS: t("process.nodeType.process", { defaultValue: "فرآیند" }),
        SUBPROCESS: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
        CONTROL: t("control.nodeType.control"),
    };

    return labels[nodeType];
}

interface ProcessTreeItemProps {
    node: ProcessDisplayTreeNode;
    selectedId?: string | null;
    expandedIds: Set<string>;
}

function ProcessTreeItem({
                             node,
                             selectedId,
                             expandedIds,
                         }: ProcessTreeItemProps) {
    const { t } = useTranslation();
    const isSelected = node.id === selectedId;
    const displayName = `${node.title}`;

    return (
        <TreeItemCustom orderId={node.id} orderType={node.nodeType === "PROCESS" ? "CENTRAL_PROCESS" : node.nodeType === "SUBPROCESS" ? "CENTRAL_SUBPROCESS" : undefined}
            data-id={node.id}
            data-process-node-id={node.id}
            expanded={expandedIds.has(node.id)}
            selected={isSelected}
            content={<CatalogSelectableRow itemKey={node.id}>
                <div
                    data-process-node-id={node.id}
                    title={displayName}
                    style={{ display: "grid", gridTemplateColumns: "minmax(16rem, 1fr) 9rem", alignItems: "center", minWidth: 0, width: "100%", columnGap: "1rem" }}
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
            </CatalogSelectableRow>}
        >
            {node.children.map((child) => (
                <ProcessTreeItem
                    key={child.id}
                    node={child}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                />
            ))}
        </TreeItemCustom>
    );
}

export default function ProcessTree({
                                        items,
                                        controls = NO_CONTROLS,
                                        selectedId,
                                        expansionAnchorId,
                                        searchText = "",
                                        busy = false,
                                        onSelect,
                                    }: ProcessTreeProps) {
    const { t } = useTranslation();
    const normalizedSearchText = searchText.trim();

    const sourceTree = useMemo(() => buildProcessDisplayTree(items, controls), [items, controls]);

    const displayOrder = useCatalogTreeOrder();

    const tree = useMemo(() => displayOrder?.sortTree(sourceTree, (node) => orderKey(node.nodeType === "PROCESS" ? "CENTRAL_PROCESS" : node.nodeType === "SUBPROCESS" ? "CENTRAL_SUBPROCESS" : "", node.id)) ?? sourceTree, [sourceTree, displayOrder]);

    const filteredTree = useMemo(
        () => filterProcessDisplayTree(tree, normalizedSearchText),
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
        const selectedAnchor = expansionAnchorId ?? selectedId ?? null;
        const selectedControl = controls.find(control => processControlTreeId(control.scopeId) === selectedAnchor);
        const anchorId = selectedControl?.subprocessId ?? selectedAnchor;
        const result = new Set<string>(collectAncestorIds(items, anchorId));

        if (selectedControl) result.add(selectedControl.subprocessId);

        if (expansionAnchorId && expandableIds.has(expansionAnchorId)) {
            result.add(expansionAnchorId);
        }

        if (normalizedSearchText) {
            filteredExpandableIds.forEach((id) => result.add(id));
        }

        return result;
    }, [
        expansionAnchorId,
        controls,
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
                {t("process.list.empty", {
                    defaultValue: "هیچ فرآیندی ثبت نشده است.",
                })}
            </MessageStrip>
        );
    }

    return (
        <div
            style={{ minWidth: "34rem" }}
        >
            <div
                role="row"
                style={{ display: "grid", gridTemplateColumns: "minmax(16rem, 1fr) 9rem", columnGap: "1rem", padding: "0.35rem 0.75rem", boxSizing: "border-box" }}
            >
                <span>{t("process.fields.name", { defaultValue: "نام" })}</span>
                <span style={{ textAlign: "center" }}>
                    {t("process.fields.type", { defaultValue: "نوع" })}
                </span>
            </div>

            <Tree inert={displayOrder?.busy} onMove={(event) => displayOrder?.onMove(event, (item) => {
                if (item.dataset.processNodeId) onSelect?.(item.dataset.processNodeId);
            })} onMoveOver={displayOrder?.onMoveOver}
                onDragEnd={(event) => displayOrder?.onDragEnd(event, (item) => {
                    if (item.dataset.processNodeId) onSelect?.(item.dataset.processNodeId);
                })}
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
                    <ProcessTreeItem
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
