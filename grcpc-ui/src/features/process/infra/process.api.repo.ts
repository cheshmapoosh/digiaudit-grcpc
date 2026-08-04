import { httpClient } from "@/shared/infra/http.client";
import type {
    CentralProcessResponse,
    CentralSubprocessResponse,
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
    ProcessMoveCommand,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeType,
    ProcessNodeUpdate,
} from "../domain/process.model";
import type { ProcessRepo } from "./process.repo";

const PROCESS_URL = "/api/master-data/central/processes";
const SUBPROCESS_URL = "/api/master-data/central/subprocesses";

function mapProcess(row: CentralProcessResponse): ProcessNode {
    return {
        id: row.id,
        code: row.code,
        title: row.title,
        nodeType: "PROCESS",
        parentId: row.parentProcessId,
        description: row.description,
        sortOrder: row.sortOrder,
        status: row.status,
        validFrom: row.validFrom,
        validTo: row.validTo,
        version: row.version,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        deletedAt: row.deletedAt,
        deletedBy: row.deletedBy,
    };
}

function mapSubprocess(row: CentralSubprocessResponse): ProcessNode {
    return {
        id: row.id,
        code: row.code,
        title: row.title,
        nodeType: "SUBPROCESS",
        parentId: row.processId,
        description: row.description,
        sortOrder: row.sortOrder,
        status: row.status,
        validFrom: row.validFrom,
        validTo: row.validTo,
        version: row.version,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        deletedAt: row.deletedAt,
        deletedBy: row.deletedBy,
    };
}

function toProcessCreateBody(payload: ProcessNodeCreate) {
    return {
        code: payload.code,
        title: payload.title,
        parentProcessId: payload.parentId || null,
        description: payload.description ?? null,
        sortOrder: payload.sortOrder ?? 0,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
    };
}

function toSubprocessCreateBody(payload: ProcessNodeCreate) {
    return {
        code: payload.code,
        title: payload.title,
        processId: payload.parentId,
        description: payload.description ?? null,
        sortOrder: payload.sortOrder ?? 0,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
    };
}

function toUpdateBody(payload: ProcessNodeUpdate) {
    return {
        version: payload.version,
        title: payload.title,
        description: payload.description ?? null,
        sortOrder: payload.sortOrder ?? 0,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
    };
}

function endpointForNode(node: ProcessNode): string {
    return node.nodeType === "PROCESS"
        ? `${PROCESS_URL}/${node.id}`
        : `${SUBPROCESS_URL}/${node.id}`;
}

export class ProcessApiRepo implements ProcessRepo {
    async list(lifecycleStatus?: "DELETED"): Promise<ProcessNode[]> {
        const query = lifecycleStatus
            ? `?lifecycleStatus=${encodeURIComponent(lifecycleStatus)}`
            : "";
        const [processes, subprocesses] = await Promise.all([
            httpClient.get<CentralProcessResponse[]>(`${PROCESS_URL}${query}`),
            httpClient.get<CentralSubprocessResponse[]>(`${SUBPROCESS_URL}${query}`),
        ]);

        return [...processes.map(mapProcess), ...subprocesses.map(mapSubprocess)];
    }

    async getById(id: string, nodeType?: ProcessNodeType): Promise<ProcessNode | null> {
        try {
            if (nodeType === "SUBPROCESS") {
                return mapSubprocess(
                    await httpClient.get<CentralSubprocessResponse>(`${SUBPROCESS_URL}/${id}`),
                );
            }

            if (nodeType === "PROCESS") {
                return mapProcess(
                    await httpClient.get<CentralProcessResponse>(`${PROCESS_URL}/${id}`),
                );
            }

            const rows = await this.list();
            return rows.find((row) => row.id === id) ?? null;
        } catch {
            return null;
        }
    }

    async create(
        payload: ProcessNodeCreate,
    ): Promise<MasterDataRevisionMutationResponse> {
        if (payload.nodeType === "PROCESS") {
            return httpClient.post<MasterDataRevisionMutationResponse>(
                PROCESS_URL,
                toProcessCreateBody(payload),
            );
        }

        return httpClient.post<MasterDataRevisionMutationResponse>(
            SUBPROCESS_URL,
            toSubprocessCreateBody(payload),
        );
    }

    async update(
        node: ProcessNode,
        payload: ProcessNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.patch<MasterDataRevisionMutationResponse>(
            endpointForNode(node),
            toUpdateBody(payload),
        );
    }

    async move(
        node: ProcessNode,
        payload: ProcessMoveCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        const body =
            node.nodeType === "PROCESS"
                ? { parentProcessId: payload.parentId ?? null, version: payload.version }
                : { processId: payload.parentId, version: payload.version };

        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${endpointForNode(node)}/move`,
            body,
        );
    }

    async activate(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${endpointForNode(node)}/activate`,
            payload,
        );
    }

    async inactivate(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${endpointForNode(node)}/inactivate`,
            payload,
        );
    }

    async delete(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${endpointForNode(node)}/delete`,
            payload,
        );
    }

    async restore(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${endpointForNode(node)}/restore`,
            payload,
        );
    }
}
