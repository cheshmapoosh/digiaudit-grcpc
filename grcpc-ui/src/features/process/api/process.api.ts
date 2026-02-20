import type { ProcessNode } from "../model/process.types";

export async function getChildren(parentId: string | null): Promise<ProcessNode[]> {
    // TODO: call backend: GET /process-nodes?parentId=...
    return [];
}

export async function createNode(payload: {
    parentId: string | null;
    title: string;
    code?: string;
    description?: string;
    status: ProcessNode["status"];
}): Promise<ProcessNode> {
    // TODO: POST /process-nodes
    throw new Error("Not implemented");
}

export async function updateNode(id: string, payload: Partial<Omit<ProcessNode, "id">>): Promise<ProcessNode> {
    // TODO: PUT /process-nodes/:id
    throw new Error("Not implemented");
}

export async function moveNode(
    id: string,
    payload: { newParentId: string | null; newOrder?: number },
): Promise<ProcessNode> {
    // TODO: POST /process-nodes/:id/move
    throw new Error("Not implemented");
}
