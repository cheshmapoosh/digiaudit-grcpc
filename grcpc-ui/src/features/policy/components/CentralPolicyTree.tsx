import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type { CentralPolicyGroupSummary, CentralPolicySummary } from "../domain/centralPolicy.model";
import {
  buildCentralPolicyTree,
  collectCentralPolicyAncestorIds,
  filterCentralPolicyTree,
  type CentralPolicyTreeNode,
} from "../utils/centralPolicy.tree";

interface Props {
  groups: CentralPolicyGroupSummary[];
  policies: CentralPolicySummary[];
  selectedId?: string | null;
  expansionAnchorId?: string | null;
  searchText?: string;
  busy?: boolean;
  onSelect?: (node: CentralPolicyTreeNode) => void;
}

type TreeEvent = {
  detail?: { item?: HTMLElement & { dataset?: { nodeId?: string } } };
  preventDefault?: () => void;
};

function collectExpandableIds(nodes: CentralPolicyTreeNode[]) {
  const result = new Set<string>();
  const visit = (node: CentralPolicyTreeNode) => {
    if (node.children.length) result.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

function findNode(nodes: CentralPolicyTreeNode[], id: string): CentralPolicyTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function PolicyTreeItem({ node, selectedId, expandedIds }: {
  node: CentralPolicyTreeNode;
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
        <div className="policyTreeItemContent" title={node.title}>
          <span className={selected ? "policyTreeTitle policyTreeTitleSelected" : "policyTreeTitle"}>
            {node.title}
          </span>
          <span className="policyTreeType">
            {node.type === "GROUP"
              ? t("policy.nodeType.group", { defaultValue: "گروه سیاست" })
              : t("policy.nodeType.policy", { defaultValue: "سیاست" })}
          </span>
        </div>
      }
    >
      {node.children.map((child) => (
        <PolicyTreeItem key={child.id} node={child} selectedId={selectedId} expandedIds={expandedIds} />
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

export default function CentralPolicyTree({
  groups,
  policies,
  selectedId,
  expansionAnchorId,
  searchText = "",
  busy = false,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const query = searchText.trim();
  const tree = useMemo(() => buildCentralPolicyTree(groups, policies), [groups, policies]);
  const filteredTree = useMemo(() => filterCentralPolicyTree(tree, query), [query, tree]);
  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);
  const filteredExpandableIds = useMemo(() => collectExpandableIds(filteredTree), [filteredTree]);
  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set());
  const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(new Set());

  const autoExpandedIds = useMemo(() => {
    const anchor = expansionAnchorId ?? selectedId ?? null;
    const result = new Set(collectCentralPolicyAncestorIds(tree, anchor));
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

  if (!groups.length && !policies.length && !busy) {
    return (
      <MessageStrip design="Information" hideCloseButton>
        {t("policy.list.empty", { defaultValue: "هیچ سیاستی ثبت نشده است." })}
      </MessageStrip>
    );
  }

  return (
    <Tree
      accessibleName={t("policy.list.title", { defaultValue: "ساختار سیاست" })}
      onItemClick={handleItemClick}
      onItemToggle={handleItemToggle}
      style={{ minHeight: "100%" }}
    >
      {filteredTree.map((node) => (
        <PolicyTreeItem key={node.id} node={node} selectedId={selectedId} expandedIds={expandedIds} />
      ))}
    </Tree>
  );
}
