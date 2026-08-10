import type { CentralAccountGroupSummary } from "../domain/centralAccountGroup.model";

export interface CentralAccountGroupTreeNode extends CentralAccountGroupSummary {
  children: CentralAccountGroupTreeNode[];
}

function compareNodes(left: CentralAccountGroupTreeNode, right: CentralAccountGroupTreeNode) {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  const byTitle = left.title.localeCompare(right.title, "fa");
  if (byTitle !== 0) return byTitle;
  return left.id.localeCompare(right.id);
}

export function buildAccountGroupTree(rows: CentralAccountGroupSummary[]): CentralAccountGroupTreeNode[] {
  const byParent = new Map<string | null, CentralAccountGroupSummary[]>();
  rows.forEach((row) => {
    const siblings = byParent.get(row.parentAccountGroupId) ?? [];
    siblings.push(row);
    byParent.set(row.parentAccountGroupId, siblings);
  });

  const visit = (row: CentralAccountGroupSummary, ancestors: Set<string>): CentralAccountGroupTreeNode => {
    if (ancestors.has(row.id)) return { ...row, children: [] };
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(row.id);
    const children = (byParent.get(row.id) ?? [])
      .map((child) => visit(child, nextAncestors))
      .sort(compareNodes);
    return { ...row, children };
  };

  return (byParent.get(null) ?? []).map((row) => visit(row, new Set())).sort(compareNodes);
}

function matches(node: CentralAccountGroupTreeNode, normalized: string) {
  return `${node.code} ${node.title}`.toLocaleLowerCase("fa").includes(normalized);
}

export function filterAccountGroupTree(
  nodes: CentralAccountGroupTreeNode[],
  searchText: string,
): CentralAccountGroupTreeNode[] {
  const normalized = searchText.trim().toLocaleLowerCase("fa");
  if (!normalized) return nodes;
  return nodes.flatMap((node) => {
    const children = filterAccountGroupTree(node.children, normalized);
    if (!matches(node, normalized) && children.length === 0) return [];
    return [{ ...node, children }];
  });
}

export function collectAccountGroupAncestorIds(
  rows: CentralAccountGroupSummary[],
  id: string | null | undefined,
): string[] {
  if (!id) return [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const result: string[] = [];
  const visited = new Set<string>();
  let parentId = byId.get(id)?.parentAccountGroupId ?? null;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    result.push(parentId);
    parentId = byId.get(parentId)?.parentAccountGroupId ?? null;
  }
  return result;
}

export function collectAccountGroupDescendantIds(
  rows: CentralAccountGroupSummary[],
  id: string | null | undefined,
): string[] {
  if (!id) return [];
  const byParent = new Map<string, string[]>();
  rows.forEach((row) => {
    if (!row.parentAccountGroupId) return;
    const children = byParent.get(row.parentAccountGroupId) ?? [];
    children.push(row.id);
    byParent.set(row.parentAccountGroupId, children);
  });
  const result: string[] = [];
  const queue = [...(byParent.get(id) ?? [])];
  const visited = new Set<string>();
  while (queue.length) {
    const child = queue.shift()!;
    if (visited.has(child)) continue;
    visited.add(child);
    result.push(child);
    queue.push(...(byParent.get(child) ?? []));
  }
  return result;
}
