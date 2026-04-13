import type { RegulationNode } from "@/features/regulation";
import { containsText, parentKey } from "./tree.utils";

export interface RegulationTreeNode extends RegulationNode {
    children: RegulationTreeNode[];
    level: number;
}

export function sortRegulations(items: RegulationNode[]): RegulationNode[] {
    return [...items].sort((a, b) => {
        if (a.code !== b.code) {
            return a.code.localeCompare(b.code, "fa");
        }

        return a.name.localeCompare(b.name, "fa");
    });
}

export function buildTree(items: RegulationNode[]): RegulationTreeNode[] {
    const sorted = sortRegulations(items);
    const byId = new Map<string, RegulationTreeNode>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });
    }

    const roots: RegulationTreeNode[] = [];

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

export function flattenTree(nodes: RegulationTreeNode[]): RegulationTreeNode[] {
    const result: RegulationTreeNode[] = [];

    const visit = (node: RegulationTreeNode) => {
        result.push(node);
        node.children.forEach(visit);
    };

    nodes.forEach(visit);

    return result;
}

export function findNodeById(
    nodes: RegulationTreeNode[],
    id: string | null | undefined,
): RegulationTreeNode | null {
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
    nodes: RegulationTreeNode[],
    rootId: string | null | undefined,
): string[] {
    const root = findNodeById(nodes, rootId);

    if (!root) {
        return [];
    }

    const result: string[] = [];

    const walk = (node: RegulationTreeNode) => {
        for (const child of node.children) {
            result.push(child.id);
            walk(child);
        }
    };

    walk(root);

    return result;
}

export function collectAncestorIds(
    items: RegulationNode[],
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

export function filterTree(
    nodes: RegulationTreeNode[],
    searchText: string,
): RegulationTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: RegulationTreeNode): RegulationTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is RegulationTreeNode => item !== null);

        const matched =
            containsText(node.name, searchText) ||
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
        .filter((item): item is RegulationTreeNode => item !== null);
}

export function hasChildren(items: RegulationNode[], id: string): boolean {
    return items.some((item) => parentKey(item.parentId) === id);
}