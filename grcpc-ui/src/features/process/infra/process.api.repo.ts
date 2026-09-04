import { httpClient } from "@/shared/infra/http.client";
import type {
    CentralProcessResponse,
    CentralSubprocessResponse,
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
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
        documents: payload.documents,
        riskScopeChanges: [],
        controlObjectiveScopeChanges: [],
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
        documents: payload.documents,
        controlScopeChanges: payload.controlScopeChanges,
        riskScopeChanges: payload.riskScopeChanges,
        controlObjectiveScopeChanges: payload.controlObjectiveScopeChanges,
    };
}

function toProcessUpdateBody(payload: ProcessNodeUpdate) {
    return {
        version: payload.version,
        title: payload.title,
        status: payload.status,
        parentProcessId: payload.parentId ?? null,
        description: payload.description ?? null,
        sortOrder: payload.sortOrder ?? 0,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
        documents: payload.documents,
        riskScopeChanges: [],
        controlObjectiveScopeChanges: [],
    };
}

function toSubprocessUpdateBody(payload: ProcessNodeUpdate) {
    return {
        version: payload.version,
        title: payload.title,
        status: payload.status,
        processId: payload.parentId,
        description: payload.description ?? null,
        sortOrder: payload.sortOrder ?? 0,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
        documents: payload.documents,
        controlScopeChanges: payload.controlScopeChanges,
        riskScopeChanges: payload.riskScopeChanges,
        controlObjectiveScopeChanges: payload.controlObjectiveScopeChanges,
    };
}

function endpointForNode(node: ProcessNode): string {
    return node.nodeType === "PROCESS"
        ? `${PROCESS_URL}/${node.id}`
        : `${SUBPROCESS_URL}/${node.id}`;
}

export class ProcessApiRepo implements ProcessRepo {
    async list(): Promise<ProcessNode[]> {
        const [processes, subprocesses] = await Promise.all([
            httpClient.get<CentralProcessResponse[]>(PROCESS_URL),
            httpClient.get<CentralSubprocessResponse[]>(SUBPROCESS_URL),
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
    ): Promise<MasterDataAggregateMutationResponse> {
        if (payload.nodeType === "PROCESS") {
            return httpClient.post<MasterDataAggregateMutationResponse>(
                PROCESS_URL,
                toProcessCreateBody(payload),
            );
        }

        return httpClient.post<MasterDataAggregateMutationResponse>(
            SUBPROCESS_URL,
            toSubprocessCreateBody(payload),
        );
    }

    async update(
        node: ProcessNode,
        payload: ProcessNodeUpdate,
    ): Promise<MasterDataAggregateMutationResponse> {
        return httpClient.patch<MasterDataAggregateMutationResponse>(
            endpointForNode(node),
            node.nodeType === "PROCESS"
                ? toProcessUpdateBody(payload)
                : toSubprocessUpdateBody(payload),
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

}
