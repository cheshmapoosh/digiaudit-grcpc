import {
    processCreateSchema,
    processLifecycleSchema,
    processUpdateSchema,
} from "../domain/process.schema";
import type {
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
} from "../domain/process.model";
import type { ProcessRepo } from "../infra/process.repo";
import { createProcessRepo } from "../infra/process.factory";
import { sortProcesses } from "../utils/process.tree";

function normalizeCode(value: string): string {
    return value.trim().toLocaleUpperCase("en-US");
}

function normalizeOptionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizeSortOrder(value: number | null | undefined): number {
    return value ?? 0;
}

function normalizeCreatePayload(payload: ProcessNodeCreate): ProcessNodeCreate {
    const parsed = processCreateSchema.parse(payload);

    return {
        nodeType: parsed.nodeType,
        code: normalizeCode(parsed.code),
        title: parsed.title.trim(),
        parentId: parsed.parentId?.trim() || null,
        description: normalizeOptionalText(parsed.description),
        sortOrder: normalizeSortOrder(parsed.sortOrder),
        validFrom: normalizeOptionalText(parsed.validFrom),
        validTo: normalizeOptionalText(parsed.validTo),
        documents: parsed.documents,
    };
}

function normalizeUpdatePayload(payload: ProcessNodeUpdate): ProcessNodeUpdate {
    const parsed = processUpdateSchema.parse(payload);

    return {
        version: parsed.version,
        title: parsed.title.trim(),
        status: parsed.status,
        parentId: parsed.parentId?.trim() || null,
        description: normalizeOptionalText(parsed.description),
        sortOrder: normalizeSortOrder(parsed.sortOrder),
        validFrom: normalizeOptionalText(parsed.validFrom),
        validTo: normalizeOptionalText(parsed.validTo),
        documents: parsed.documents,
    };
}

function normalizeLifecyclePayload(payload: ProcessLifecycleCommand): ProcessLifecycleCommand {
    return processLifecycleSchema.parse(payload);
}

export interface ProcessService {
    list(): Promise<ProcessNode[]>;
    getById(id: string, node?: ProcessNode): Promise<ProcessNode | null>;
    create(payload: ProcessNodeCreate): Promise<MasterDataAggregateMutationResponse>;
    update(
        node: ProcessNode,
        payload: ProcessNodeUpdate,
    ): Promise<MasterDataAggregateMutationResponse>;
    delete(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
}

export function createProcessService(repo: ProcessRepo): ProcessService {
    return {
        async list() {
            const items = await repo.list();
            return sortProcesses(items);
        },

        async getById(id, node) {
            return repo.getById(id, node?.nodeType);
        },

        async create(payload) {
            const normalized = normalizeCreatePayload(payload);
            return repo.create(normalized);
        },

        async update(node, payload) {
            return repo.update(node, normalizeUpdatePayload(payload));
        },

        async delete(node, payload) {
            return repo.delete(node, normalizeLifecyclePayload(payload));
        },

    };
}

const processRepo = createProcessRepo();
export const processService = createProcessService(processRepo);
