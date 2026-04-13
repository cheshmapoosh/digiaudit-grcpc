import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    Icon,
    List,
    ListItemCustom,
    MessageStrip,
} from "@ui5/webcomponents-react";

import type { ProcessNode } from "@/features/process";
import {
    buildTree,
    collectAncestorIds,
    filterTree,
    type ProcessTreeNode,
} from "../utils/process.tree";

export interface ProcessTreeProps {
    items: ProcessNode[];
    selectedId?: string | null;
    searchText?: string;
    busy?: boolean;
    onSelect?: (id: string) => void;
    onCreateChild?: (parentId: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onToggleStatus?: (id: string) => void;
}

interface TreeRowProps {
    node: ProcessTreeNode;
    selectedId?: string | null;
    expandedIds: Set<string>;
    busy?: boolean;
    onToggleExpand: (id: string) => void;
    onSelect?: (id: string) => void;
    onCreateChild?: (parentId: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onToggleStatus?: (id: string) => void;
}

function TreeRow({
                     node,
                     selectedId,
                     expandedIds,
                     busy,
                     onToggleExpand,
                     onSelect,
                     onCreateChild,
                     onEdit,
                     onDelete,
                     onToggleStatus,
                 }: TreeRowProps) {
    const { t } = useTranslation();

    const isSelected = selectedId === node.id;
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
        <Fragment>
            <ListItemCustom>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: "0.5rem",
                        alignItems: "center",
                        width: "100%",
                        paddingInlineStart: `${node.level * 1.25}rem`,
                        background: isSelected
                            ? "var(--sapList_SelectionBackgroundColor)"
                            : "transparent",
                        borderRadius: "0.75rem",
                        minHeight: "3rem",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center" }}>
                        {hasChildren ? (
                            <Button
                                design="Transparent"
                                icon={isExpanded ? "navigation-down-arrow" : "navigation-right-arrow"}
                                disabled={busy}
                                onClick={() => onToggleExpand(node.id)}
                            />
                        ) : (
                            <span style={{ width: "2.5rem" }} />
                        )}
                    </div>

                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect?.(node.id)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSelect?.(node.id);
                            }
                        }}
                        style={{
                            cursor: "pointer",
                            minWidth: 0,
                            display: "grid",
                            gap: "0.125rem",
                            paddingBlock: "0.5rem",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Icon name="workflow-tasks" />
                            <span
                                style={{
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                {node.title}
              </span>
                        </div>

                        <div
                            style={{
                                color: "var(--sapContent_LabelColor)",
                                fontSize: "0.875rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {[
                                node.code,
                                node.status === "active"
                                    ? t("common.active", { defaultValue: "فعال" })
                                    : t("common.inactive", { defaultValue: "غیرفعال" }),
                            ]
                                .filter(Boolean)
                                .join(" • ")}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <Button
                            design="Transparent"
                            icon="add"
                            disabled={busy}
                            tooltip={t("process.actions.addChild", { defaultValue: "افزودن زیرمجموعه" })}
                            onClick={() => onCreateChild?.(node.id)}
                        />
                        <Button
                            design="Transparent"
                            icon="edit"
                            disabled={busy}
                            tooltip={t("common.edit", { defaultValue: "ویرایش" })}
                            onClick={() => onEdit?.(node.id)}
                        />
                        <Button
                            design="Transparent"
                            icon={node.status === "active" ? "decline" : "accept"}
                            disabled={busy}
                            tooltip={
                                node.status === "active"
                                    ? t("process.actions.deactivate", { defaultValue: "غیرفعال‌سازی" })
                                    : t("process.actions.activate", { defaultValue: "فعال‌سازی" })
                            }
                            onClick={() => onToggleStatus?.(node.id)}
                        />
                        <Button
                            design="Transparent"
                            icon="delete"
                            disabled={busy}
                            tooltip={t("common.delete", { defaultValue: "حذف" })}
                            onClick={() => onDelete?.(node.id)}
                        />
                    </div>
                </div>
            </ListItemCustom>

            {hasChildren && isExpanded
                ? node.children.map((child) => (
                    <TreeRow
                        key={child.id}
                        node={child}
                        selectedId={selectedId}
                        expandedIds={expandedIds}
                        busy={busy}
                        onToggleExpand={onToggleExpand}
                        onSelect={onSelect}
                        onCreateChild={onCreateChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleStatus={onToggleStatus}
                    />
                ))
                : null}
        </Fragment>
    );
}

export default function ProcessTree({
                                        items,
                                        selectedId,
                                        searchText = "",
                                        busy = false,
                                        onSelect,
                                        onCreateChild,
                                        onEdit,
                                        onDelete,
                                        onToggleStatus,
                                    }: ProcessTreeProps) {
    const { t } = useTranslation();

    const tree = useMemo(() => buildTree(items), [items]);
    const filteredTree = useMemo(() => filterTree(tree, searchText), [tree, searchText]);

    const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set());

    const autoExpandedIds = useMemo(() => {
        const result = new Set<string>(collectAncestorIds(items, selectedId));

        if (selectedId) {
            result.add(selectedId);
        }

        return result;
    }, [items, selectedId]);

    const expandedIds = useMemo(() => {
        const result = new Set<string>(manualExpandedIds);
        autoExpandedIds.forEach((id) => result.add(id));
        return result;
    }, [manualExpandedIds, autoExpandedIds]);

    const handleToggleExpand = (id: string) => {
        setManualExpandedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    if (!items.length && !busy) {
        return (
            <MessageStrip design="Information" hideCloseButton>
                {t("process.list.empty", { defaultValue: "هیچ فرآیندی ثبت نشده است." })}
            </MessageStrip>
        );
    }

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <List separators="Inner">
                {filteredTree.map((node) => (
                    <TreeRow
                        key={node.id}
                        node={node}
                        selectedId={selectedId}
                        expandedIds={expandedIds}
                        busy={busy}
                        onToggleExpand={handleToggleExpand}
                        onSelect={onSelect}
                        onCreateChild={onCreateChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleStatus={onToggleStatus}
                    />
                ))}
            </List>
        </div>
    );
}