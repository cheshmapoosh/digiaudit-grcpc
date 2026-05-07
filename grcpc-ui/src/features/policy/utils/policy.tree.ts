import type { PolicyNode, PolicyNodeType } from "../domain/policy.model";
import { containsText, parentKey } from "./tree.utils";

export interface PolicyTreeNode extends PolicyNode {
    children: PolicyTreeNode[];
    level: number;
}

const NODE_TYPE_ORDER: Record<PolicyNodeType, number> = {
    policyGroup: 1,
    policy: 2,
};

export function sortPolicies(items: PolicyNode[]): PolicyNode[] {
    return [...items].sort((a, b) => {
        const orderCompare = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderCompare !== 0) {
            return orderCompare;
        }

        const typeCompare = NODE_TYPE_ORDER[a.nodeType] - NODE_TYPE_ORDER[b.nodeType];
        if (typeCompare !== 0) {
            return typeCompare;
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

export function buildTree(items: PolicyNode[]): PolicyTreeNode[] {
    const sorted = sortPolicies(items);
    const byId = new Map<string, PolicyTreeNode>();
    const parentById = new Map<string, string | null>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });

        parentById.set(item.id, item.parentId ?? null);
    }

    const roots: PolicyTreeNode[] = [];

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

export function flattenTree(nodes: PolicyTreeNode[]): PolicyTreeNode[] {
    const result: PolicyTreeNode[] = [];

    const visit = (node: PolicyTreeNode) => {
        result.push(node);
        node.children.forEach(visit);
    };

    nodes.forEach(visit);
    return result;
}

export function findNodeById(
    nodes: PolicyTreeNode[],
    id: string | null | undefined,
): PolicyTreeNode | null {
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
    items: PolicyNode[],
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

export function collectDescendantIds(
    nodes: PolicyTreeNode[],
    rootId: string | null | undefined,
): string[] {
    const root = findNodeById(nodes, rootId);

    if (!root) {
        return [];
    }

    const result: string[] = [];

    const walk = (node: PolicyTreeNode) => {
        for (const child of node.children) {
            result.push(child.id);
            walk(child);
        }
    };

    walk(root);
    return result;
}

export function filterTree(
    nodes: PolicyTreeNode[],
    searchText: string,
): PolicyTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: PolicyTreeNode): PolicyTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is PolicyTreeNode => item !== null);

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
        .filter((item): item is PolicyTreeNode => item !== null);
}

export function hasChildren(items: PolicyNode[], id: string): boolean {
    return items.some((item) => parentKey(item.parentId) === id);
}

export function canHaveChildren(nodeType: PolicyNodeType): boolean {
    return nodeType === "policyGroup";
}

export function allowedChildTypes(parentType: PolicyNodeType | null): PolicyNodeType[] {
    if (!parentType) {
        return ["policyGroup"];
    }

    if (parentType === "policyGroup") {
        return ["policyGroup", "policy"];
    }

    return [];
}

export function canCreateChild(
    parentType: PolicyNodeType | null,
    childType: PolicyNodeType,
): boolean {
    return allowedChildTypes(parentType).includes(childType);
}

export function defaultChildType(parentType: PolicyNodeType | null): PolicyNodeType {
    return parentType === "policyGroup" ? "policy" : "policyGroup";
}
