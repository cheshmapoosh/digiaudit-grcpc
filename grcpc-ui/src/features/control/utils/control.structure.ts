import type {
    ControlStructureNode,
    ControlStructureNodeType,
} from "../domain/control.model";

export interface ControlTreeNode extends ControlStructureNode {
    children: ControlTreeNode[];
    level: number;
}

const NODE_TYPE_ORDER: Record<ControlStructureNodeType, number> = {
    process: 1,
    subProcess: 2,
    control: 3,
};

function containsText(value: string | null | undefined, searchText: string): boolean {
    return value?.toLocaleLowerCase("fa").includes(searchText.toLocaleLowerCase("fa")) ?? false;
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

export function getControlNodeId(node: ControlStructureNode): string {
    return node.nodeType === "control" ? node.controlAssignmentId ?? node.id : node.id;
}

export function normalizeControlStructureNode(
    node: ControlStructureNode,
): ControlStructureNode {
    if (node.nodeType !== "control") {
        return node;
    }

    const controlAssignmentId = node.controlAssignmentId ?? node.id;

    return {
        ...node,
        id: controlAssignmentId,
        controlAssignmentId,
    };
}

export function sortControlStructureNodes(
    items: ControlStructureNode[],
): ControlStructureNode[] {
    return [...items].map(normalizeControlStructureNode).sort((a, b) => {
        const parentCompare = (a.parentId ?? "").localeCompare(b.parentId ?? "", "fa");
        if (parentCompare !== 0) {
            return parentCompare;
        }

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

export function buildControlTree(items: ControlStructureNode[]): ControlTreeNode[] {
    const sorted = sortControlStructureNodes(items);
    const byId = new Map<string, ControlTreeNode>();
    const parentById = new Map<string, string | null>();

    for (const item of sorted) {
        const nodeId = getControlNodeId(item);

        byId.set(nodeId, {
            ...item,
            id: nodeId,
            children: [],
            level: 0,
        });

        parentById.set(nodeId, item.parentId ?? null);
    }

    const roots: ControlTreeNode[] = [];

    for (const item of sorted) {
        const nodeId = getControlNodeId(item);
        const current = byId.get(nodeId);

        if (!current) {
            continue;
        }

        const parentId = item.parentId;

        if (!parentId || parentId === nodeId || !byId.has(parentId)) {
            roots.push(current);
            continue;
        }

        if (createsCycle(nodeId, parentId, parentById)) {
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

export function filterControlTree(
    nodes: ControlTreeNode[],
    searchText: string,
): ControlTreeNode[] {
    if (!searchText.trim()) {
        return nodes;
    }

    const visit = (node: ControlTreeNode): ControlTreeNode | null => {
        const filteredChildren = node.children
            .map(visit)
            .filter((item): item is ControlTreeNode => item !== null);

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
        .filter((item): item is ControlTreeNode => item !== null);
}

export function collectControlAncestorIds(
    items: ControlStructureNode[],
    nodeId: string | null | undefined,
): string[] {
    if (!nodeId) {
        return [];
    }

    const byId = new Map(
        items.map((item) => {
            const normalized = normalizeControlStructureNode(item);
            return [normalized.id, normalized] as const;
        }),
    );
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

export function findControlNodeById(
    items: ControlStructureNode[],
    nodeId: string | null | undefined,
): ControlStructureNode | null {
    if (!nodeId) {
        return null;
    }

    return items
        .map(normalizeControlStructureNode)
        .find((item) => item.id === nodeId) ?? null;
}

export function isControlNode(node: ControlStructureNode | null | undefined): boolean {
    return node?.nodeType === "control";
}

export function resolveSubProcessContext(
    node: ControlStructureNode | null | undefined,
): { subProcessId: string; subProcessTitle?: string | null } | null {
    if (!node) {
        return null;
    }

    if (node.nodeType === "subProcess") {
        return {
            subProcessId: node.id,
            subProcessTitle: node.title,
        };
    }

    if (node.nodeType === "control" && node.subProcessId) {
        return {
            subProcessId: node.subProcessId,
            subProcessTitle: undefined,
        };
    }

    return null;
}
