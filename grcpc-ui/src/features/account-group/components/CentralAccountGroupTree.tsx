import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type { CentralAccountGroupSummary } from "../domain/centralAccountGroup.model";
import {
  buildAccountGroupTree,
  collectAccountGroupAncestorIds,
  filterAccountGroupTree,
  type CentralAccountGroupTreeNode,
} from "../utils/centralAccountGroup.tree";

interface Props {
  rows: CentralAccountGroupSummary[];
  selectedId?: string | null;
  expansionAnchorId?: string | null;
  searchText?: string;
  busy?: boolean;
  onSelect?: (node: CentralAccountGroupTreeNode) => void;
}

type TreeEvent = {
  detail?: { item?: HTMLElement & { dataset?: { nodeId?: string } } };
  preventDefault?: () => void;
};

function collectExpandableIds(nodes: CentralAccountGroupTreeNode[]): Set<string> {
  const result = new Set<string>();
  const visit = (node: CentralAccountGroupTreeNode) => {
    if (node.children.length) result.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

function findNode(nodes: CentralAccountGroupTreeNode[], id: string): CentralAccountGroupTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function add(previous: Set<string>, id: string) {
  const next = new Set(previous);
  next.add(id);
  return next;
}

function remove(previous: Set<string>, id: string) {
  const next = new Set(previous);
  next.delete(id);
  return next;
}

function AccountGroupTreeItem({
  node,
  selectedId,
  expandedIds,
}: {
  node: CentralAccountGroupTreeNode;
  selectedId?: string | null;
  expandedIds: Set<string>;
}) {
  const selected = node.id === selectedId;
  return (
    <TreeItemCustom
      data-node-id={node.id}
      expanded={expandedIds.has(node.id)}
      selected={selected}
      content={
        <div className="accountGroupTreeItemContent" title={`${node.code} — ${node.title}`}>
          <span className={selected ? "accountGroupTreeItemTitle accountGroupTreeItemTitleSelected" : "accountGroupTreeItemTitle"}>
            {node.title}
          </span>
        </div>
      }
    >
      {node.children.map((child) => (
        <AccountGroupTreeItem
          key={child.id}
          node={child}
          selectedId={selectedId}
          expandedIds={expandedIds}
        />
      ))}
    </TreeItemCustom>
  );
}

export default function CentralAccountGroupTree({
  rows,
  selectedId,
  expansionAnchorId,
  searchText = "",
  busy = false,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const normalizedSearchText = searchText.trim();
  const tree = useMemo(() => buildAccountGroupTree(rows), [rows]);
  const filteredTree = useMemo(
    () => filterAccountGroupTree(tree, normalizedSearchText),
    [normalizedSearchText, tree],
  );
  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);
  const filteredExpandableIds = useMemo(() => collectExpandableIds(filteredTree), [filteredTree]);
  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set());
  const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(new Set());

  const autoExpandedIds = useMemo(() => {
    const anchor = expansionAnchorId ?? selectedId ?? null;
    const result = new Set(collectAccountGroupAncestorIds(rows, anchor));
    if (expansionAnchorId && expandableIds.has(expansionAnchorId)) result.add(expansionAnchorId);
    if (normalizedSearchText) filteredExpandableIds.forEach((id) => result.add(id));
    return result;
  }, [expandableIds, expansionAnchorId, filteredExpandableIds, normalizedSearchText, rows, selectedId]);

  const expandedIds = useMemo(() => {
    if (normalizedSearchText) return autoExpandedIds;
    const result = new Set<string>();
    autoExpandedIds.forEach((id) => {
      if (!manualCollapsedIds.has(id)) result.add(id);
    });
    manualExpandedIds.forEach((id) => {
      if (!manualCollapsedIds.has(id)) result.add(id);
    });
    return result;
  }, [autoExpandedIds, manualCollapsedIds, manualExpandedIds, normalizedSearchText]);

  const handleItemClick = useCallback((event: TreeEvent) => {
    const id = event.detail?.item?.dataset?.nodeId;
    if (!id) return;
    const node = findNode(tree, id);
    if (node) onSelect?.(node);
  }, [onSelect, tree]);

  const handleItemToggle = useCallback((event: TreeEvent) => {
    event.preventDefault?.();
    const id = event.detail?.item?.dataset?.nodeId;
    if (!id || normalizedSearchText) return;
    if (expandedIds.has(id)) {
      setManualExpandedIds((previous) => remove(previous, id));
      setManualCollapsedIds((previous) => add(previous, id));
    } else {
      setManualCollapsedIds((previous) => remove(previous, id));
      setManualExpandedIds((previous) => add(previous, id));
    }
  }, [expandedIds, normalizedSearchText]);

  if (!rows.length && !busy) {
    return <MessageStrip design="Information" hideCloseButton>{t("accountGroup.list.empty")}</MessageStrip>;
  }

  return (
    <Tree
      accessibleName={t("accountGroup.list.title")}
      onItemClick={handleItemClick}
      onItemToggle={handleItemToggle}
      style={{ minHeight: "100%" }}
    >
      {filteredTree.map((node) => (
        <AccountGroupTreeItem key={node.id} node={node} selectedId={selectedId} expandedIds={expandedIds} />
      ))}
    </Tree>
  );
}
