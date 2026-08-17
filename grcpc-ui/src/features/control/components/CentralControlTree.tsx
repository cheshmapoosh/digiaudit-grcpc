import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type { CentralControlGroupSummary, CentralControlSummary } from "../domain/centralControl.model";
import {
  buildCentralControlTree,
  collectCentralControlAncestorIds,
  filterCentralControlTree,
  type CentralControlTreeNode,
} from "../utils/centralControl.tree";

interface Props {
  groups: CentralControlGroupSummary[];
  controls: CentralControlSummary[];
  selectedId?: string | null;
  expansionAnchorId?: string | null;
  searchText?: string;
  busy?: boolean;
  onSelect?: (node: CentralControlTreeNode) => void;
}

type TreeEvent = {
  detail?: { item?: HTMLElement & { dataset?: { nodeId?: string } } };
  preventDefault?: () => void;
};

function collectExpandableIds(nodes: CentralControlTreeNode[]) {
  const result = new Set<string>();
  const visit = (node: CentralControlTreeNode) => {
    if (node.children.length) result.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

function findNode(nodes: CentralControlTreeNode[], id: string): CentralControlTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function ControlTreeItem({ node, selectedId, expandedIds }: {
  node: CentralControlTreeNode;
  selectedId?: string | null;
  expandedIds: Set<string>;
}) {
  const { t } = useTranslation();
  const selected = node.id === selectedId;
  return (
    <TreeItemCustom
      data-node-id={node.id}
      expanded={expandedIds.has(node.id)}
      selected={selected}
      content={
        <div className="controlTreeItemContent" title={node.title}>
          <span className={selected ? "controlTreeTitle controlTreeTitleSelected" : "controlTreeTitle"}>
            {node.title}
          </span>
          <span className="controlTreeType">
            {node.type === "GROUP"
              ? t("control.nodeType.group", { defaultValue: "گروه کنترل" })
              : t("control.nodeType.control", { defaultValue: "کنترل" })}
          </span>
        </div>
      }
    >
      {node.children.map((child) => (
        <ControlTreeItem key={child.id} node={child} selectedId={selectedId} expandedIds={expandedIds} />
      ))}
    </TreeItemCustom>
  );
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

export default function CentralControlTree({
  groups,
  controls,
  selectedId,
  expansionAnchorId,
  searchText = "",
  busy = false,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const query = searchText.trim();
  const tree = useMemo(() => buildCentralControlTree(groups, controls), [controls, groups]);
  const filteredTree = useMemo(() => filterCentralControlTree(tree, query), [query, tree]);
  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);
  const filteredExpandableIds = useMemo(() => collectExpandableIds(filteredTree), [filteredTree]);
  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set());
  const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(new Set());

  const autoExpandedIds = useMemo(() => {
    const anchor = expansionAnchorId ?? selectedId ?? null;
    const result = new Set(collectCentralControlAncestorIds(tree, anchor));
    if (expansionAnchorId && expandableIds.has(expansionAnchorId)) result.add(expansionAnchorId);
    if (query) filteredExpandableIds.forEach((id) => result.add(id));
    return result;
  }, [expandableIds, expansionAnchorId, filteredExpandableIds, query, selectedId, tree]);

  const expandedIds = useMemo(() => {
    if (query) return autoExpandedIds;
    const result = new Set<string>();
    autoExpandedIds.forEach((id) => {
      if (!manualCollapsedIds.has(id)) result.add(id);
    });
    manualExpandedIds.forEach((id) => {
      if (!manualCollapsedIds.has(id)) result.add(id);
    });
    return result;
  }, [autoExpandedIds, manualCollapsedIds, manualExpandedIds, query]);

  const handleItemClick = useCallback((event: TreeEvent) => {
    const id = event.detail?.item?.dataset?.nodeId;
    if (!id || id === selectedId) return;
    const node = findNode(tree, id);
    if (node) onSelect?.(node);
  }, [onSelect, selectedId, tree]);

  const handleItemToggle = useCallback((event: TreeEvent) => {
    event.preventDefault?.();
    const id = event.detail?.item?.dataset?.nodeId;
    if (!id || query) return;
    if (expandedIds.has(id)) {
      setManualExpandedIds((previous) => remove(previous, id));
      setManualCollapsedIds((previous) => add(previous, id));
    } else {
      setManualCollapsedIds((previous) => remove(previous, id));
      setManualExpandedIds((previous) => add(previous, id));
    }
  }, [expandedIds, query]);

  if (!groups.length && !controls.length && !busy) {
    return <MessageStrip design="Information" hideCloseButton>{t("control.list.empty")}</MessageStrip>;
  }

  return (
    <Tree
      accessibleName={t("control.list.title")}
      onItemClick={handleItemClick}
      onItemToggle={handleItemToggle}
      style={{ minHeight: "100%" }}
    >
      {filteredTree.map((node) => (
        <ControlTreeItem key={node.id} node={node} selectedId={selectedId} expandedIds={expandedIds} />
      ))}
    </Tree>
  );
}
