import { useMemo, useState } from "react";
import {
  Bar,
  Button,
  MessageStrip,
  Tree,
  TreeItemCustom,
} from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import type { DefinitionListRow } from "./catalogPresentation.model";

interface Props<T extends DefinitionListRow> {
  title: string;
  rows: T[];
  selectedId: string | null;
  busy: boolean;
  canCreate: boolean;
  emptyText?: string;
  getParentId?: (row: T) => string | null;
  deletedMode?: boolean;
  onToggleDeleted?: () => void;
  onSelect: (row: T) => void;
  onCreate: () => void;
}

interface TreeNode<T> {
  row: T;
  children: TreeNode<T>[];
}

type TreeEvent = {
  detail?: { item?: HTMLElement };
  preventDefault?: () => void;
};

function readRowId(event: TreeEvent): string | null {
  return event.detail?.item?.dataset?.catalogRowId ?? null;
}

function buildTree<T extends DefinitionListRow>(
  rows: T[],
  getParentId?: (row: T) => string | null,
): TreeNode<T>[] {
  const nodes = new Map(rows.map((row) => [row.id, { row, children: [] as TreeNode<T>[] }]));
  const roots: TreeNode<T>[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parentId = getParentId?.(row) ?? null;
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

function HierarchyTreeItem<T extends DefinitionListRow>({
  node,
  selectedId,
  expandedIds,
}: {
  node: TreeNode<T>;
  selectedId: string | null;
  expandedIds: Set<string>;
}) {
  const selected = node.row.id === selectedId;
  return (
    <TreeItemCustom
      data-catalog-row-id={node.row.id}
      expanded={expandedIds.has(node.row.id)}
      selected={selected}
      content={
        <div className="catalogTreeRow" data-catalog-row-id={node.row.id}>
          <span className="catalogTreeTitle">
            <bdi>{node.row.code}</bdi> — {node.row.title}
          </span>
        </div>
      }
    >
      {node.children.map((child) => (
        <HierarchyTreeItem
          key={child.row.id}
          node={child}
          selectedId={selectedId}
          expandedIds={expandedIds}
        />
      ))}
    </TreeItemCustom>
  );
}

export function HierarchyColumn<T extends DefinitionListRow>({
  title,
  rows,
  selectedId,
  busy,
  canCreate,
  emptyText,
  getParentId,
  deletedMode = false,
  onToggleDeleted,
  onSelect,
  onCreate,
}: Props<T>) {
  const { t } = useTranslation();
  const tree = useMemo(() => buildTree(rows, getParentId), [getParentId, rows]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const findRow = (id: string | null) => rows.find((row) => row.id === id);

  return (
    <section className="catalogHierarchyColumn">
      <Bar
        startContent={<span className="catalogColumnTitle">{title}</span>}
        endContent={
          <span className="catalogToolbarActions">
            {onToggleDeleted ? (
              <Button disabled={busy} onClick={onToggleDeleted}>
                {deletedMode
                  ? t("common.back", { defaultValue: "بازگشت" })
                  : t("centralCatalog.deleted", { defaultValue: "حذف‌شده‌ها" })}
              </Button>
            ) : null}
            <Button
              design="Emphasized"
              icon="add"
              hidden={!canCreate || deletedMode}
              disabled={busy}
              tooltip={t("common.create", { defaultValue: "ایجاد" })}
              accessibleName={t("common.create", { defaultValue: "ایجاد" })}
              onClick={onCreate}
            />
          </span>
        }
      />
      {rows.length ? (
        <Tree
          accessibleName={title}
          onItemClick={(event) => {
            if (busy) return;
            const row = findRow(readRowId(event));
            if (row) onSelect(row);
          }}
          onItemToggle={(event) => {
            event.preventDefault?.();
            const id = readRowId(event);
            if (!id) return;
            setExpandedIds((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
        >
          {tree.map((node) => (
            <HierarchyTreeItem
              key={node.row.id}
              node={node}
              selectedId={selectedId}
              expandedIds={expandedIds}
            />
          ))}
        </Tree>
      ) : (
        <MessageStrip design="Information" hideCloseButton>
          {emptyText ?? t("common.noData", { defaultValue: "داده‌ای وجود ندارد." })}
        </MessageStrip>
      )}
    </section>
  );
}
