import type { ProcessNode } from "../domain/process.model";
import { processControlTreeId, type ProcessControlNode, type ProcessCreateType } from "../domain/processControl.model";
import { buildTree, type ProcessTreeNode } from "./process.tree";
import { containsText } from "./tree.utils";

export interface ProcessDisplayTreeNode {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  nodeType: ProcessCreateType;
  children: ProcessDisplayTreeNode[];
}

export function buildProcessDisplayTree(items: ProcessNode[], controls: ProcessControlNode[]): ProcessDisplayTreeNode[] {
  const bySubprocess = new Map<string, ProcessControlNode[]>();
  for (const control of controls) {
    const rows = bySubprocess.get(control.subprocessId) ?? [];
    rows.push(control);
    bySubprocess.set(control.subprocessId, rows);
  }
  const visit = (node: ProcessTreeNode): ProcessDisplayTreeNode => ({
    ...node,
    children: node.nodeType === "SUBPROCESS"
      ? [...(bySubprocess.get(node.id) ?? [])]
          .sort((a, b) => a.code.localeCompare(b.code, "fa") || a.title.localeCompare(b.title, "fa"))
          .map(control => ({ id: processControlTreeId(control.scopeId), code: control.code,
            title: control.title, nodeType: "CONTROL", children: [] }))
      : node.children.map(visit),
  });
  return buildTree(items).map(visit);
}

export function filterProcessDisplayTree(nodes: ProcessDisplayTreeNode[], search: string): ProcessDisplayTreeNode[] {
  if (!search.trim()) return nodes;
  return nodes.flatMap(node => {
    const children = filterProcessDisplayTree(node.children, search);
    const matches = containsText(node.title, search) || containsText(node.code, search)
      || containsText(node.description, search);
    return matches || children.length ? [{ ...node, children }] : [];
  });
}
