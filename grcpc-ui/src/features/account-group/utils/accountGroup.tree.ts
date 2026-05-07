import type { AccountGroupNode } from "../domain/accountGroup.model";
import { containsText, parentKey } from "./tree.utils";

export interface AccountGroupTreeNode extends AccountGroupNode {
    children: AccountGroupTreeNode[];
    level: number;
}

export function sortAccountGroups(items: AccountGroupNode[]): AccountGroupNode[] {
    return [...items].sort((a, b) => {
        const orderCompare = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderCompare !== 0) {
            return orderCompare;
        }

        const codeCompare = a.code.localeCompare(b.code, "fa");
        if (codeCompare !== 0) {
            return codeCompare;
        }

        return a.title.localeCompare(b.title, "fa");
    });
}

function createsCycle(
    itemId: string,
    parentId: string,
    parentById: Map<string, string | null>,
): boolean {
    let currentParentId: string | null | undefined = parentId;
    const visited = new Set<string>();

    while (currentParentId) {
        if (currentParentId === itemId || visited.has(currentParentId)) {
            return true;
        }

        visited.add(currentParentId);
        currentParentId = parentById.get(currentParentId);
    }

    return false;
}

export function buildTree(items: AccountGroupNode[]): AccountGroupTreeNode[] {
    const sorted = sortAccountGroups(items);
    const byId = new Map<string, AccountGroupTreeNode>();
    const parentById = new Map<string, string | null>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });
        parentById.set(item.id, item.parentId ?? null);
    }

    const roots: AccountGroupTreeNode[] = [];

    for (const item of sorted) {
        const current = byId.get(item.id);

        if (!current) {
            continue;
        }

        const parentId = item.parentId;

        if (!parentId || parentId === item.id || !byId.has(parentId)) {
            roots.push(current);
            continue;
        }

        if (createsCycle(item.id, parentId, parentById)) {
            roots.push(current);
            continue;
        }

        const parent = byId.get(parentId);

        if (!parent) {
            roots.push(current);
            continue;
        }

        current.level = parent.level + 1;
        parent.children.push(current);
    }

    return roots;
}

export function findNodeById(
    nodes: AccountGroupTreeNode[],
    id: string | null | undefined,
): AccountGroupTreeNode | null {
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

export function collectAncestorIds(
    items: AccountGroupNode[],
    nodeId: string | null | undefined,
): string[] {
    if (!nodeId) {
        return [];
    }

    const byId = new Map(items.map((item) => [item.id, item]));
    const result: string[] = [];
    const visited = new Set<string>();

    let current = byId.get(nodeId);

    while (current?.parentId) {
        if (visited.has(current.parentId)) {
            break;
        }

        visited.add(current.parentId);
        result.push(current.parentId);
        current = byId.get(current.parentId);
    }

    return result;
}

export function filterTree(
    nodes: AccountGroupTreeNode[],
    searchText: string,
): AccountGroupTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: AccountGroupTreeNode): AccountGroupTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is AccountGroupTreeNode => item !== null);

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
        .filter((item): item is AccountGroupTreeNode => item !== null);
}

export function hasChildren(items: AccountGroupNode[], id: string): boolean {
    return items.some((item) => parentKey(item.parentId) === id);
}

export function canCreateChild(parentId: string | null | undefined): boolean {
    return parentId !== undefined;
}
