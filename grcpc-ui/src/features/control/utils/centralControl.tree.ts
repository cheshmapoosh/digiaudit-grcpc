import type {
  CentralControlGroupSummary,
  CentralControlNodeType,
  CentralControlSummary,
} from "../domain/centralControl.model";

export interface CentralControlTreeNode {
  id: string;
  code: string;
  title: string;
  type: CentralControlNodeType;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  parentId: string | null;
  sortOrder: number;
  children: CentralControlTreeNode[];
}

const ORDER = (left: CentralControlTreeNode, right: CentralControlTreeNode) =>
  left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, "fa") || left.id.localeCompare(right.id);

export function buildCentralControlTree(
  groups: CentralControlGroupSummary[],
  controls: CentralControlSummary[],
): CentralControlTreeNode[] {
  const nodes = new Map<string, CentralControlTreeNode>();
  groups.forEach((group) => {
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
  });
  controls.forEach((control) => {
    nodes.set(control.id, {
      id: control.id,
      code: control.code,
      title: control.title,
      type: "CONTROL",
      status: control.status,
      parentId: control.controlGroupId,
      sortOrder: Number.MAX_SAFE_INTEGER,
      children: [],
    });
  });

  const roots: CentralControlTreeNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent?.type === "GROUP") parent.children.push(node);
    else roots.push(node);
  });

  const sort = (items: CentralControlTreeNode[]) => {
    items.sort(ORDER);
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export function filterCentralControlTree(nodes: CentralControlTreeNode[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("fa");
  if (!normalized) return nodes;
  const visit = (node: CentralControlTreeNode): CentralControlTreeNode | null => {
    const children = node.children
      .map(visit)
      .filter((item): item is CentralControlTreeNode => Boolean(item));
    const matches = `${node.code} ${node.title}`.toLocaleLowerCase("fa").includes(normalized);
    return matches || children.length ? { ...node, children } : null;
  };
  return nodes.map(visit).filter((item): item is CentralControlTreeNode => Boolean(item));
}

export function collectCentralControlAncestorIds(
  nodes: CentralControlTreeNode[],
  id?: string | null,
): string[] {
  if (!id) return [];
  const parentById = new Map<string, string | null>();
  const visit = (node: CentralControlTreeNode) => {
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

export function collectControlGroupDescendantIds(
  groups: CentralControlGroupSummary[],
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
    (children.get(id) ?? []).forEach((child) => {
      if (result.has(child)) return;
      result.add(child);
      visit(child);
    });
  };
  visit(groupId);
  return result;
}
