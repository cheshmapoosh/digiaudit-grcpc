import type { ProcessNode, ProcessNodeType, ProcessStatus } from "../domain/process.model";

export type ProcessControlNodeType = ProcessNodeType | "control";

export interface ProcessControlTreeItem {
    id: string;
    code: string;
    title: string;
    nodeType: ProcessControlNodeType;
    parentId: string | null;
    status: ProcessStatus;
    sortOrder?: number | null;
    description?: string | null;
    controlId?: string | null;
    controlAssignmentId?: string | null;
    subProcessId?: string | null;
}

const NODE_TYPE_ORDER: Record<ProcessControlNodeType, number> = {
    process: 1,
    subProcess: 2,
    control: 3,
};

export function toProcessControlTreeItem(node: ProcessNode): ProcessControlTreeItem {
    return {
        id: node.id,
        code: node.code,
        title: node.title,
        nodeType: node.nodeType,
        parentId: node.parentId,
        status: node.status,
        sortOrder: node.sortOrder,
        description: node.description,
    };
}

export function findProcessControlItemById(
    items: ProcessControlTreeItem[],
    id: string | null | undefined,
): ProcessControlTreeItem | null {
    if (!id) {
        return null;
    }

    return items.find((item) => item.id === id) ?? null;
}

export function sortProcessControlItems(
    items: ProcessControlTreeItem[],
): ProcessControlTreeItem[] {
    return [...items].sort((a, b) => {
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

export function countSubProcessControls(
    items: ProcessControlTreeItem[],
    subProcessId: string,
): number {
    return items.filter(
        (item) =>
            item.nodeType === "control" &&
            (item.parentId === subProcessId || item.subProcessId === subProcessId),
    ).length;
}
