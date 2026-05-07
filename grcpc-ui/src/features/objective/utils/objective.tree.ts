import type { ObjectiveNode, ObjectiveNodeType } from "../domain/objective.model";
import { containsText, parentKey } from "./tree.utils";

export interface ObjectiveTreeNode extends ObjectiveNode {
    children: ObjectiveTreeNode[];
    level: number;
}

const NODE_TYPE_ORDER: Record<ObjectiveNodeType, number> = {
    objective: 1,
};

export function sortObjectives(items: ObjectiveNode[]): ObjectiveNode[] {
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

export function buildTree(items: ObjectiveNode[]): ObjectiveTreeNode[] {
    const sorted = sortObjectives(items);
    const byId = new Map<string, ObjectiveTreeNode>();
    const parentById = new Map<string, string | null>();

    for (const item of sorted) {
        byId.set(item.id, {
            ...item,
            children: [],
            level: 0,
        });

        parentById.set(item.id, item.parentId ?? null);
    }

    const roots: ObjectiveTreeNode[] = [];

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

export function flattenTree(nodes: ObjectiveTreeNode[]): ObjectiveTreeNode[] {
    const result: ObjectiveTreeNode[] = [];

    const visit = (node: ObjectiveTreeNode) => {
        result.push(node);
        node.children.forEach(visit);
    };

    nodes.forEach(visit);
    return result;
}

export function findNodeById(
    nodes: ObjectiveTreeNode[],
    id: string | null | undefined,
): ObjectiveTreeNode | null {
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
    items: ObjectiveNode[],
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
    nodes: ObjectiveTreeNode[],
    rootId: string | null | undefined,
): string[] {
    const root = findNodeById(nodes, rootId);

    if (!root) {
        return [];
    }

    const result: string[] = [];

    const walk = (node: ObjectiveTreeNode) => {
        for (const child of node.children) {
            result.push(child.id);
            walk(child);
        }
    };

    walk(root);
    return result;
}

export function filterTree(
    nodes: ObjectiveTreeNode[],
    searchText: string,
): ObjectiveTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: ObjectiveTreeNode): ObjectiveTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is ObjectiveTreeNode => item !== null);

        const matched =
            containsText(node.title, searchText) ||
            containsText(node.code, searchText) ||
            containsText(node.description, searchText) ||
            containsText(node.strategy, searchText) ||
            containsText(node.objectiveClass, searchText) ||
            containsText(node.organizationUnitName, searchText);

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
        .filter((item): item is ObjectiveTreeNode => item !== null);
}

export function hasChildren(items: ObjectiveNode[], id: string): boolean {
    return items.some((item) => parentKey(item.parentId) === id);
}

export function canHaveChildren(_nodeType: ObjectiveNodeType): boolean {
    return true;
}

export function allowedChildTypes(_parentType: ObjectiveNodeType | null): ObjectiveNodeType[] {
    return ["objective"];
}

export function canCreateChild(
    parentType: ObjectiveNodeType | null,
    childType: ObjectiveNodeType,
): boolean {
    return allowedChildTypes(parentType).includes(childType);
}

export function defaultChildType(_parentType: ObjectiveNodeType | null): ObjectiveNodeType {
    return "objective";
}
