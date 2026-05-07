import { omitKeys } from "@/shared/utils/object.utils";
import {
    processCreateSchema,
    processUpdateSchema,
} from "../domain/process.schema";
import type {
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
    ProcessReadonlyKeys,
} from "../domain/process.model";
import type { ProcessRepo } from "../infra/process.repo";
import { createProcessRepo } from "../infra/process.factory";
import { canCreateChild, sortProcesses } from "../utils/process.tree";

const READONLY_KEYS: readonly ProcessReadonlyKeys[] = [
    "id",
    "createdAt",
    "updatedAt",
    "createdBy",
    "updatedBy",
    "deletedAt",
    "deletedBy",
] as const;

function removeReadonlyFields<T extends Record<string, unknown>>(payload: T) {
    return omitKeys(payload, READONLY_KEYS as (keyof T)[]);
}

function assertCreateHierarchy(items: ProcessNode[], payload: ProcessNodeCreate): void {
    const parent = payload.parentId
        ? items.find((item) => item.id === payload.parentId) ?? null
        : null;

    if (payload.parentId && !parent) {
        throw new Error("PARENT_NOT_FOUND");
    }

    const parentType = parent?.nodeType ?? null;

    if (!canCreateChild(parentType, payload.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }
}

function assertNoCycle(items: ProcessNode[], id: string, parentId: string | null): void {
    if (!parentId) {
        return;
    }

    if (id === parentId) {
        throw new Error("INVALID_HIERARCHY");
    }

    const byId = new Map(items.map((item) => [item.id, item]));
    const visited = new Set<string>();
    let currentParentId: string | null | undefined = parentId;

    while (currentParentId) {
        if (currentParentId === id || visited.has(currentParentId)) {
            throw new Error("INVALID_HIERARCHY");
        }

        visited.add(currentParentId);
        currentParentId = byId.get(currentParentId)?.parentId;
    }
}

function assertUpdateHierarchy(
    items: ProcessNode[],
    current: ProcessNode,
    payload: ProcessNodeUpdate,
): void {
    const candidate: ProcessNode = {
        ...current,
        ...payload,
        parentId: payload.parentId === undefined ? current.parentId : payload.parentId,
    };

    assertNoCycle(items, current.id, candidate.parentId ?? null);

    const parent = candidate.parentId
        ? items.find((item) => item.id === candidate.parentId) ?? null
        : null;

    if (candidate.parentId && !parent) {
        throw new Error("PARENT_NOT_FOUND");
    }

    if (!canCreateChild(parent?.nodeType ?? null, candidate.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }

    const directChildren = items.filter((item) => item.parentId === current.id);
    const hasInvalidChild = directChildren.some(
        (child) => !canCreateChild(candidate.nodeType, child.nodeType),
    );

    if (hasInvalidChild) {
        throw new Error("INVALID_HIERARCHY");
    }
}

export interface ProcessService {
    list(): Promise<ProcessNode[]>;
    getById(id: string): Promise<ProcessNode | null>;
    create(payload: ProcessNodeCreate): Promise<ProcessNode>;
    update(id: string, payload: ProcessNodeUpdate): Promise<ProcessNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<ProcessNode>;
}

export function createProcessService(repo: ProcessRepo): ProcessService {
    return {
        async list() {
            const items = await repo.list();
            return sortProcesses(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = processCreateSchema.parse(sanitized);
            const items = await repo.list();

            assertCreateHierarchy(items, parsed);

            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = processUpdateSchema.parse(sanitized);
            const items = await repo.list();
            const current = items.find((item) => item.id === id);

            if (!current) {
                throw new Error("NOT_FOUND");
            }

            assertUpdateHierarchy(items, current, parsed);

            return repo.update(id, parsed);
        },

        async remove(id) {
            await repo.remove(id);
        },

        async toggleStatus(id) {
            if (typeof repo.toggleStatus === "function") {
                return repo.toggleStatus(id);
            }

            const current = await repo.getById(id);
            if (!current) {
                throw new Error("NOT_FOUND");
            }

            return repo.update(id, {
                status: current.status === "active" ? "inactive" : "active",
            });
        },
    };
}

const processRepo = createProcessRepo();
export const processService = createProcessService(processRepo);
