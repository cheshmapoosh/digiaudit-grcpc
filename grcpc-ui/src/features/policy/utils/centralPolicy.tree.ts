import type {
  CentralPolicyGroupSummary,
  CentralPolicyNodeType,
  CentralPolicySummary,
} from "../domain/centralPolicy.model";

export interface CentralPolicyTreeNode {
  id: string;
  code: string;
  title: string;
  type: CentralPolicyNodeType;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  parentId: string | null;
  sortOrder: number;
  children: CentralPolicyTreeNode[];
}

const ORDER = (left: CentralPolicyTreeNode, right: CentralPolicyTreeNode) =>
  left.sortOrder - right.sortOrder ||
  left.title.localeCompare(right.title, "fa") ||
  left.id.localeCompare(right.id);

export function buildCentralPolicyTree(
  groups: CentralPolicyGroupSummary[],
  policies: CentralPolicySummary[],
): CentralPolicyTreeNode[] {
  const nodes = new Map<string, CentralPolicyTreeNode>();
  for (const group of groups) {
    nodes.set(group.id, {
      id: group.id,
      code: group.code,
      title: group.title,
      type: "GROUP",
      status: group.status,
      parentId: group.parentGroupId,
      sortOrder: group.sortOrder,
      children: [],
    });
  }
  for (const policy of policies) {
    nodes.set(policy.id, {
      id: policy.id,
      code: policy.code,
      title: policy.title,
      type: "POLICY",
      status: policy.status,
      parentId: policy.policyGroupId,
      sortOrder: policy.sortOrder,
      children: [],
    });
  }

  const roots: CentralPolicyTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent?.type === "GROUP") parent.children.push(node);
    else roots.push(node);
  }

  const sort = (items: CentralPolicyTreeNode[]) => {
    items.sort(ORDER);
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export function filterCentralPolicyTree(
  nodes: CentralPolicyTreeNode[],
  query: string,
): CentralPolicyTreeNode[] {
  const normalized = query.trim().toLocaleLowerCase("fa");
  if (!normalized) return nodes;
  const visit = (node: CentralPolicyTreeNode): CentralPolicyTreeNode | null => {
    const children = node.children
      .map(visit)
      .filter((item): item is CentralPolicyTreeNode => Boolean(item));
    const matches = `${node.code} ${node.title}`.toLocaleLowerCase("fa").includes(normalized);
    return matches || children.length ? { ...node, children } : null;
  };
  return nodes.map(visit).filter((item): item is CentralPolicyTreeNode => Boolean(item));
}

export function collectCentralPolicyAncestorIds(
  nodes: CentralPolicyTreeNode[],
  id?: string | null,
): string[] {
  if (!id) return [];
  const parentById = new Map<string, string | null>();
  const visit = (node: CentralPolicyTreeNode) => {
    parentById.set(node.id, node.parentId);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  const result: string[] = [];
  let current = parentById.get(id) ?? null;
  while (current) {
    result.push(current);
    current = parentById.get(current) ?? null;
  }
  return result;
}

export function collectPolicyGroupDescendantIds(
  groups: CentralPolicyGroupSummary[],
  groupId: string,
): Set<string> {
  const children = new Map<string, string[]>();
  groups.forEach((group) => {
    if (!group.parentGroupId) return;
    const rows = children.get(group.parentGroupId) ?? [];
    rows.push(group.id);
    children.set(group.parentGroupId, rows);
  });
  const result = new Set<string>();
  const visit = (id: string) => {
    for (const child of children.get(id) ?? []) {
      if (result.has(child)) continue;
      result.add(child);
      visit(child);
    }
  };
  visit(groupId);
  return result;
}
