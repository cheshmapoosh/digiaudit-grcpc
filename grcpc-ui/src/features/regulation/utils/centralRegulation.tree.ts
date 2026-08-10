import type {
  CentralRegulationGroupSummary,
  CentralRegulationNodeType,
  CentralRegulationRequirementSummary,
  CentralRegulationSummary,
} from "../domain/centralRegulation.model";

export interface CentralRegulationTreeNode {
  id: string;
  code: string;
  title: string;
  type: CentralRegulationNodeType;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  parentId: string | null;
  sortOrder: number;
  children: CentralRegulationTreeNode[];
}

const TYPE_ORDER: Record<CentralRegulationNodeType, number> = {
  GROUP: 0,
  REGULATION: 1,
  REQUIREMENT: 2,
};

function compareNodes(left: CentralRegulationTreeNode, right: CentralRegulationTreeNode) {
  return (
    TYPE_ORDER[left.type] - TYPE_ORDER[right.type] ||
    left.sortOrder - right.sortOrder ||
    left.title.localeCompare(right.title, "fa") ||
    left.id.localeCompare(right.id)
  );
}

function groupNode(row: CentralRegulationGroupSummary): CentralRegulationTreeNode {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    type: "GROUP",
    status: row.status,
    parentId: row.parentGroupId,
    sortOrder: row.sortOrder,
    children: [],
  };
}

function regulationNode(row: CentralRegulationSummary): CentralRegulationTreeNode {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    type: "REGULATION",
    status: row.status,
    parentId: row.regulationGroupId,
    sortOrder: row.sortOrder,
    children: [],
  };
}

function requirementNode(
  row: CentralRegulationRequirementSummary,
): CentralRegulationTreeNode {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    type: "REQUIREMENT",
    status: row.status,
    parentId: row.regulationId,
    sortOrder: row.sortOrder,
    children: [],
  };
}

export function buildCentralRegulationTree(
  groups: CentralRegulationGroupSummary[],
  regulations: CentralRegulationSummary[],
  requirements: CentralRegulationRequirementSummary[],
): CentralRegulationTreeNode[] {
  const rows = [
    ...groups.filter((row) => row.status !== "DELETED").map(groupNode),
    ...regulations.filter((row) => row.status !== "DELETED").map(regulationNode),
    ...requirements.filter((row) => row.status !== "DELETED").map(requirementNode),
  ];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const roots: CentralRegulationTreeNode[] = [];

  for (const row of rows) {
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) parent.children.push(row);
    else roots.push(row);
  }

  const sortRecursively = (nodes: CentralRegulationTreeNode[]) => {
    nodes.sort(compareNodes);
    nodes.forEach((node) => sortRecursively(node.children));
  };
  sortRecursively(roots);
  return roots;
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("fa");
}

export function filterCentralRegulationTree(
  nodes: CentralRegulationTreeNode[],
  searchText: string,
): CentralRegulationTreeNode[] {
  const query = normalized(searchText);
  if (!query) return nodes;

  const filter = (node: CentralRegulationTreeNode): CentralRegulationTreeNode | null => {
    const children = node.children
      .map(filter)
      .filter((child): child is CentralRegulationTreeNode => child !== null);
    const matches = normalized(`${node.code} ${node.title}`).includes(query);
    return matches || children.length ? { ...node, children } : null;
  };

  return nodes
    .map(filter)
    .filter((node): node is CentralRegulationTreeNode => node !== null);
}

function flatten(
  nodes: CentralRegulationTreeNode[],
  parentById = new Map<string, string | null>(),
) {
  const visit = (node: CentralRegulationTreeNode) => {
    parentById.set(node.id, node.parentId);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return parentById;
}

export function collectCentralRegulationAncestorIds(
  nodes: CentralRegulationTreeNode[],
  id?: string | null,
): string[] {
  if (!id) return [];
  const parentById = flatten(nodes);
  const result: string[] = [];
  const visited = new Set<string>();
  let parent = parentById.get(id) ?? null;
  while (parent && !visited.has(parent)) {
    visited.add(parent);
    result.unshift(parent);
    parent = parentById.get(parent) ?? null;
  }
  return result;
}

export function collectRegulationGroupDescendantIds(
  groups: CentralRegulationGroupSummary[],
  id: string,
): Set<string> {
  const children = new Map<string, string[]>();
  groups.forEach((row) => {
    if (!row.parentGroupId || row.status === "DELETED") return;
    const values = children.get(row.parentGroupId) ?? [];
    values.push(row.id);
    children.set(row.parentGroupId, values);
  });
  const result = new Set<string>();
  const visit = (parentId: string) => {
    for (const childId of children.get(parentId) ?? []) {
      if (result.has(childId)) continue;
      result.add(childId);
      visit(childId);
    }
  };
  visit(id);
  return result;
}
