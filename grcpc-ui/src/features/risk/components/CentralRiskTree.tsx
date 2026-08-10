import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, Tree, TreeItemCustom } from "@ui5/webcomponents-react";

import type {
  CentralRiskCategorySummary,
  CentralRiskTemplateSummary,
} from "../domain/centralRisk.model";
import {
  buildRiskTree,
  collectRiskAncestorKeys,
  filterRiskTree,
  type CentralRiskTreeNode,
} from "../utils/centralRisk.tree";

interface Props {
  categories: CentralRiskCategorySummary[];
  templates: CentralRiskTemplateSummary[];
  selectedKey?: string | null;
  expansionAnchorKey?: string | null;
  searchText?: string;
  busy?: boolean;
  onSelect?: (node: CentralRiskTreeNode) => void;
}

type TreeEvent = {
  detail?: {
    item?: HTMLElement & { dataset?: { nodeKey?: string } };
  };
  preventDefault?: () => void;
};

function collectExpandableKeys(nodes: CentralRiskTreeNode[]): Set<string> {
  const result = new Set<string>();
  const visit = (node: CentralRiskTreeNode) => {
    if (node.children.length > 0) result.add(node.key);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

function findNode(nodes: CentralRiskTreeNode[], key: string): CentralRiskTreeNode | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    const child = findNode(node.children, key);
    if (child) return child;
  }
  return null;
}

function add(previous: Set<string>, key: string) {
  const next = new Set(previous);
  next.add(key);
  return next;
}

function remove(previous: Set<string>, key: string) {
  const next = new Set(previous);
  next.delete(key);
  return next;
}

interface ItemProps {
  node: CentralRiskTreeNode;
  selectedKey?: string | null;
  expandedKeys: Set<string>;
}

function RiskTreeItem({ node, selectedKey, expandedKeys }: ItemProps) {
  const { t } = useTranslation();
  const selected = node.key === selectedKey;
  return (
    <TreeItemCustom
      data-node-key={node.key}
      expanded={expandedKeys.has(node.key)}
      selected={selected}
      content={
        <div className="riskTreeItemContent" title={`${node.code} — ${node.title}`}>
          <span className={selected ? "riskTreeItemTitle riskTreeItemTitleSelected" : "riskTreeItemTitle"}>
            {node.title}
          </span>
          <span className="riskTreeItemType">
            {t(`risk.nodeType.${node.kind}`)}
          </span>
        </div>
      }
    >
      {node.children.map((child) => (
        <RiskTreeItem
          key={child.key}
          node={child}
          selectedKey={selectedKey}
          expandedKeys={expandedKeys}
        />
      ))}
    </TreeItemCustom>
  );
}

export default function CentralRiskTree({
  categories,
  templates,
  selectedKey,
  expansionAnchorKey,
  searchText = "",
  busy = false,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const normalizedSearchText = searchText.trim();
  const tree = useMemo(() => buildRiskTree(categories, templates), [categories, templates]);
  const filteredTree = useMemo(
    () => filterRiskTree(tree, normalizedSearchText),
    [normalizedSearchText, tree],
  );
  const expandableKeys = useMemo(() => collectExpandableKeys(tree), [tree]);
  const filteredExpandableKeys = useMemo(
    () => collectExpandableKeys(filteredTree),
    [filteredTree],
  );
  const [manualExpandedKeys, setManualExpandedKeys] = useState<Set<string>>(new Set());
  const [manualCollapsedKeys, setManualCollapsedKeys] = useState<Set<string>>(new Set());

  const autoExpandedKeys = useMemo(() => {
    const anchor = expansionAnchorKey ?? selectedKey ?? null;
    const result = new Set(
      collectRiskAncestorKeys(categories, templates, anchor),
    );
    if (expansionAnchorKey && expandableKeys.has(expansionAnchorKey)) {
      result.add(expansionAnchorKey);
    }
    if (normalizedSearchText) {
      filteredExpandableKeys.forEach((key) => result.add(key));
    }
    return result;
  }, [
    categories,
    expandableKeys,
    expansionAnchorKey,
    filteredExpandableKeys,
    normalizedSearchText,
    selectedKey,
    templates,
  ]);

  const expandedKeys = useMemo(() => {
    if (normalizedSearchText) return autoExpandedKeys;
    const result = new Set<string>();
    autoExpandedKeys.forEach((key) => {
      if (!manualCollapsedKeys.has(key)) result.add(key);
    });
    manualExpandedKeys.forEach((key) => {
      if (!manualCollapsedKeys.has(key)) result.add(key);
    });
    return result;
  }, [autoExpandedKeys, manualCollapsedKeys, manualExpandedKeys, normalizedSearchText]);

  const handleItemClick = useCallback(
    (event: TreeEvent) => {
      const key = event.detail?.item?.dataset?.nodeKey;
      if (!key) return;
      const node = findNode(tree, key);
      if (node) onSelect?.(node);
    },
    [onSelect, tree],
  );

  const handleItemToggle = useCallback(
    (event: TreeEvent) => {
      event.preventDefault?.();
      const key = event.detail?.item?.dataset?.nodeKey;
      if (!key || normalizedSearchText) return;
      if (expandedKeys.has(key)) {
        setManualExpandedKeys((previous) => remove(previous, key));
        setManualCollapsedKeys((previous) => add(previous, key));
      } else {
        setManualCollapsedKeys((previous) => remove(previous, key));
        setManualExpandedKeys((previous) => add(previous, key));
      }
    },
    [expandedKeys, normalizedSearchText],
  );

  if (!categories.length && !templates.length && !busy) {
    return (
      <MessageStrip design="Information" hideCloseButton>
        {t("risk.list.empty")}
      </MessageStrip>
    );
  }

  return (
    <Tree
      accessibleName={t("risk.list.title")}
      onItemClick={handleItemClick}
      onItemToggle={handleItemToggle}
      style={{ minHeight: "100%" }}
    >
      {filteredTree.map((node) => (
        <RiskTreeItem
          key={node.key}
          node={node}
          selectedKey={selectedKey}
          expandedKeys={expandedKeys}
        />
      ))}
    </Tree>
  );
}
