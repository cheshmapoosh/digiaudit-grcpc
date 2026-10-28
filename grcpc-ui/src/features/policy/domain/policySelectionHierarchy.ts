import type { HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";

/** Display-only adaptation; endpointId remains the concrete typed Policy Scope destination. */
export interface PolicyHierarchyChoice {
  endpointId: string;
  parentNodeId: string | null;
  code: string;
  title: string;
  eligible: boolean;
  ancestors?: HierarchySelectionNode[];
}

/** Keep only option branches, so different Policy families do not show the same empty Process tree. */
export function policySelectionHierarchy(ancestors: HierarchySelectionNode[], options: PolicyHierarchyChoice[],
  occupied: ReadonlySet<string>, labels: { assigned: string; unavailable: string }): HierarchySelectionNode[] {
  const nodes = new Map(ancestors.map(node => [node.id, { ...node, selectable: false }]));
  for (const option of options) {
    for (const ancestor of option.ancestors ?? []) if (!nodes.has(ancestor.id)) nodes.set(ancestor.id, { ...ancestor, selectable: false });
    const assigned = occupied.has(option.endpointId);
    const suffix = assigned ? labels.assigned : !option.eligible ? labels.unavailable : "";
    nodes.set(option.endpointId, { id: option.endpointId, parentId: option.parentNodeId, code: option.code,
      name: suffix ? `${option.title} (${suffix})` : option.title, selectable: option.eligible && !assigned });
  }
  const retained = new Set<string>();
  for (const option of options) {
    const seen = new Set<string>();
    let node = nodes.get(option.endpointId);
    while (node && !seen.has(node.id)) {
      seen.add(node.id); retained.add(node.id);
      node = node.parentId ? nodes.get(node.parentId) : undefined;
    }
  }
  return [...nodes.values()].filter(node => retained.has(node.id));
}
