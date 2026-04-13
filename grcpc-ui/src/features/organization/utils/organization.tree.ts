import type { OrganizationNode } from "@/features/organization";
import { containsText, parentKey } from "./tree.utils";

export interface OrganizationTreeNode extends OrganizationNode {
    children: OrganizationTreeNode[];
    level: number;
}

export function sortOrganizations(items: OrganizationNode[]): OrganizationNode[] {
    return [...items].sort((a, b) => {
        if (a.code !== b.code) {
            return a.code.localeCompare(b.code, "fa");
        }

        return a.name.localeCompare(b.name, "fa");
    });
}

export function buildTree(items: OrganizationNode[]): OrganizationTreeNode[] {
    const sorted = sortOrganizations(items);
    const byId = new Map<string, OrganizationTreeNode>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });
    }

    const roots: OrganizationTreeNode[] = [];

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

export function flattenTree(nodes: OrganizationTreeNode[]): OrganizationTreeNode[] {
    const result: OrganizationTreeNode[] = [];

    const visit = (node: OrganizationTreeNode) => {
        result.push(node);
        node.children.forEach(visit);
    };

    nodes.forEach(visit);

    return result;
}

export function findNodeById(
    nodes: OrganizationTreeNode[],
    id: string | null | undefined,
): OrganizationTreeNode | null {
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
    nodes: OrganizationTreeNode[],
    rootId: string | null | undefined,
): string[] {
    const root = findNodeById(nodes, rootId);

    if (!root) {
        return [];
    }

    const result: string[] = [];

    const walk = (node: OrganizationTreeNode) => {
        for (const child of node.children) {
            result.push(child.id);
            walk(child);
        }
    };

    walk(root);

    return result;
}

export function collectAncestorIds(
    items: OrganizationNode[],
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
    nodes: OrganizationTreeNode[],
    searchText: string,
): OrganizationTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: OrganizationTreeNode): OrganizationTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is OrganizationTreeNode => item !== null);

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
        .filter((item): item is OrganizationTreeNode => item !== null);
}

export function hasChildren(items: OrganizationNode[], id: string): boolean {
    return items.some((item) => parentKey(item.parentId) === id);
}