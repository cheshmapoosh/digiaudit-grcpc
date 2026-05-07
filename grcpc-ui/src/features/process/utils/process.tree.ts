import type { ProcessNode, ProcessNodeType } from "../domain/process.model";
import { containsText, parentKey } from "./tree.utils";

export interface ProcessTreeNode extends ProcessNode {
    children: ProcessTreeNode[];
    level: number;
}

const NODE_TYPE_ORDER: Record<ProcessNodeType, number> = {
    process: 1,
    subProcess: 2,
    control: 3,
};

export function sortProcesses(items: ProcessNode[]): ProcessNode[] {
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
        if (currentParentId === itemId) {
            return true;
        }

        if (visited.has(currentParentId)) {
            return true;
        }

        visited.add(currentParentId);
        currentParentId = parentById.get(currentParentId);
    }

    return false;
}

export function buildTree(items: ProcessNode[]): ProcessTreeNode[] {
    const sorted = sortProcesses(items);
    const byId = new Map<string, ProcessTreeNode>();
    const parentById = new Map<string, string | null>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });

        parentById.set(item.id, item.parentId ?? null);
    }

    const roots: ProcessTreeNode[] = [];

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

export function collectAncestorIds(
    items: ProcessNode[],
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

export function filterTree(
    nodes: ProcessTreeNode[],
    searchText: string,
): ProcessTreeNode[] {
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

export function canHaveChildren(nodeType: ProcessNodeType): boolean {
    return nodeType !== "control";
}

export function allowedChildTypes(parentType: ProcessNodeType | null): ProcessNodeType[] {
    if (!parentType) {
        return ["process"];
    }

    if (parentType === "process") {
        return ["process", "subProcess"];
    }

    if (parentType === "subProcess") {
        return ["control"];
    }

    return [];
}

export function canCreateChild(
    parentType: ProcessNodeType | null,
    childType: ProcessNodeType,
): boolean {
    return allowedChildTypes(parentType).includes(childType);
}

export function defaultChildType(parentType: ProcessNodeType | null): ProcessNodeType {
    if (parentType === "subProcess") {
        return "control";
    }

    return "process";
}
