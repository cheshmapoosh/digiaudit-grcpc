import type { ProcessNode } from "@/features/process";
import { containsText, parentKey } from "./tree.utils";

export interface ProcessTreeNode extends ProcessNode {
    children: ProcessTreeNode[];
    level: number;
}

export function sortProcesses(items: ProcessNode[]): ProcessNode[] {
    return [...items].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
        }

        if (a.code !== b.code) {
            return a.code.localeCompare(b.code, "fa");
        }

        return a.title.localeCompare(b.title, "fa");
    });
}

export function buildTree(items: ProcessNode[]): ProcessTreeNode[] {
    const sorted = sortProcesses(items);
    const byId = new Map<string, ProcessTreeNode>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });
    }

    const roots: ProcessTreeNode[] = [];

    for (const item of sorted) {
        const current = byId.get(item.id);

        if (!current) {
            continue;
        }

        if (!item.parentId) {
            roots.push(current);
            continue;
        }

        const parent = byId.get(item.parentId);

        if (!parent) {
            roots.push(current);
            continue;
        }

        current.level = parent.level + 1;
        parent.children.push(current);
    }

    return roots;
}

export function flattenTree(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
    const result: ProcessTreeNode[] = [];

    const visit = (node: ProcessTreeNode) => {
        result.push(node);
        node.children.forEach(visit);
    };

    nodes.forEach(visit);

    return result;
}

export function findNodeById(
    nodes: ProcessTreeNode[],
    id: string | null | undefined,
): ProcessTreeNode | null {
    if (!id) {
        return null;
    }

    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }

        const childMatch = findNodeById(node.children, id);

        if (childMatch) {
            return childMatch;
        }
    }

    return null;
}

export function collectDescendantIds(
    nodes: ProcessTreeNode[],
    rootId: string | null | undefined,
): string[] {
    const root = findNodeById(nodes, rootId);

    if (!root) {
        return [];
    }

    const result: string[] = [];

    const walk = (node: ProcessTreeNode) => {
        for (const child of node.children) {
            result.push(child.id);
            walk(child);
        }
    };

    walk(root);

    return result;
}

export function collectAncestorIds(
    items: ProcessNode[],
    nodeId: string | null | undefined,
): string[] {
    if (!nodeId) {
        return [];
    }

    const byId = new Map(items.map((item) => [item.id, item]));
    const result: string[] = [];

    let current = byId.get(nodeId);

    while (current?.parentId) {
        result.push(current.parentId);
        current = byId.get(current.parentId);
    }

    return result;
}

export function filterTree(nodes: ProcessTreeNode[], searchText: string): ProcessTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: ProcessTreeNode): ProcessTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is ProcessTreeNode => item !== null);

        const matched =
            containsText(node.title, searchText) ||
            containsText(node.code, searchText) ||
            containsText(node.description, searchText);

        if (!matched && filteredChildren.length === 0) {
            return null;
        }

        return {
            ...node,
            children: filteredChildren,
        };
    };

    return nodes
        .map(visit)
        .filter((item): item is ProcessTreeNode => item !== null);
}

export function hasChildren(items: ProcessNode[], id: string): boolean {
    return items.some((item) => parentKey(item.parentId) === id);
}