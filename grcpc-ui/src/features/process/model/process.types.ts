export type ProcessNodeStatus = "ACTIVE" | "INACTIVE";

export interface ProcessNode {
    id: string;
    parentId: string | null;

    title: string;
    code?: string;
    description?: string;

    status: ProcessNodeStatus;

    order: number;
    depth?: number;
    path?: string;

    createdAt?: string;
    updatedAt?: string;
}

export interface ProcessNodeTreeItem extends ProcessNode {
    children?: ProcessNodeTreeItem[];
    hasChildren?: boolean; // برای lazy-load
}
