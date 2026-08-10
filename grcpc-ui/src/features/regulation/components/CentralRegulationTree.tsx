import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type {
  CentralRegulationGroupSummary,
  CentralRegulationRequirementSummary,
  CentralRegulationSummary,
} from "../domain/centralRegulation.model";
import {
  buildCentralRegulationTree,
  collectCentralRegulationAncestorIds,
  filterCentralRegulationTree,
  type CentralRegulationTreeNode,
} from "../utils/centralRegulation.tree";

interface Props {
  groups: CentralRegulationGroupSummary[];
  regulations: CentralRegulationSummary[];
  requirements: CentralRegulationRequirementSummary[];
  selectedId?: string | null;
  expansionAnchorId?: string | null;
  searchText?: string;
  busy?: boolean;
  onSelect?: (node: CentralRegulationTreeNode) => void;
}

type TreeEvent = {
  detail?: { item?: HTMLElement & { dataset?: { nodeId?: string } } };
  preventDefault?: () => void;
};

function collectExpandableIds(nodes: CentralRegulationTreeNode[]) {
  const result = new Set<string>();
  const visit = (node: CentralRegulationTreeNode) => {
    if (node.children.length) result.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

function findNode(
  nodes: CentralRegulationTreeNode[],
  id: string,
): CentralRegulationTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function RegulationTreeItem({
  node,
  selectedId,
  expandedIds,
}: {
  node: CentralRegulationTreeNode;
  selectedId?: string | null;
  expandedIds: Set<string>;
}) {
  const { t } = useTranslation();
  const selected = node.id === selectedId;
  const typeKey =
    node.type === "GROUP"
      ? "group"
      : node.type === "REGULATION"
        ? "regulation"
        : "requirement";

  return (
    <TreeItemCustom
      data-node-id={node.id}
      expanded={expandedIds.has(node.id)}
      selected={selected}
      content={
        <div className="regulationTreeItemContent" title={node.title}>
          <span className={selected ? "regulationTreeTitle regulationTreeTitleSelected" : "regulationTreeTitle"}>
            {node.title}
          </span>
          <span className="regulationTreeType">
            {t(`regulation.nodeType.${typeKey}`)}
          </span>
        </div>
      }
    >
      {node.children.map((child) => (
        <RegulationTreeItem
          key={child.id}
          node={child}
          selectedId={selectedId}
          expandedIds={expandedIds}
        />
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

export default function CentralRegulationTree({
  groups,
  regulations,
  requirements,
  selectedId,
  expansionAnchorId,
  searchText = "",
  busy = false,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const query = searchText.trim();
  const tree = useMemo(
    () => buildCentralRegulationTree(groups, regulations, requirements),
    [groups, regulations, requirements],
  );
  const filteredTree = useMemo(
    () => filterCentralRegulationTree(tree, query),
    [query, tree],
  );
  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);
  const filteredExpandableIds = useMemo(
    () => collectExpandableIds(filteredTree),
    [filteredTree],
  );
  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set());
  const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(new Set());

  const autoExpandedIds = useMemo(() => {
    const anchor = expansionAnchorId ?? selectedId ?? null;
    const result = new Set(collectCentralRegulationAncestorIds(tree, anchor));
    if (expansionAnchorId && expandableIds.has(expansionAnchorId)) {
      result.add(expansionAnchorId);
    }
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

  const handleItemClick = useCallback(
    (event: TreeEvent) => {
      const id = event.detail?.item?.dataset?.nodeId;
      if (!id) return;
      const node = findNode(tree, id);
      if (node) onSelect?.(node);
    },
    [onSelect, tree],
  );

  const handleItemToggle = useCallback(
    (event: TreeEvent) => {
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
    },
    [expandedIds, query],
  );

  const totalRows = groups.length + regulations.length + requirements.length;
  if (!totalRows && !busy) {
    return (
      <MessageStrip design="Information" hideCloseButton>
        {t("regulation.list.empty")}
      </MessageStrip>
    );
  }

  return (
    <Tree
      accessibleName={t("regulation.list.title")}
      onItemClick={handleItemClick}
      onItemToggle={handleItemToggle}
      style={{ minHeight: "100%" }}
    >
      {filteredTree.map((node) => (
        <RegulationTreeItem
          key={node.id}
          node={node}
          selectedId={selectedId}
          expandedIds={expandedIds}
        />
      ))}
    </Tree>
  );
}
