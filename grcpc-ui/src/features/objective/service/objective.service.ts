import { omitKeys } from "@/shared/utils/object.utils";
import {
    objectiveCreateSchema,
    objectiveUpdateSchema,
} from "../domain/objective.schema";
import type {
    ObjectiveNode,
    ObjectiveNodeCreate,
    ObjectiveNodeUpdate,
    ObjectiveReadonlyKeys,
} from "../domain/objective.model";
import type { ObjectiveRepo } from "../infra/objective.repo";
import { createObjectiveRepo } from "../infra/objective.factory";
import { canCreateChild, sortObjectives } from "../utils/objective.tree";

const READONLY_KEYS: readonly ObjectiveReadonlyKeys[] = [
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

function assertCreateHierarchy(items: ObjectiveNode[], payload: ObjectiveNodeCreate): void {
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

function assertNoCycle(items: ObjectiveNode[], id: string, parentId: string | null): void {
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
    items: ObjectiveNode[],
    current: ObjectiveNode,
    payload: ObjectiveNodeUpdate,
): void {
    const candidate: ObjectiveNode = {
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
}

export interface ObjectiveService {
    list(): Promise<ObjectiveNode[]>;
    getById(id: string): Promise<ObjectiveNode | null>;
    create(payload: ObjectiveNodeCreate): Promise<ObjectiveNode>;
    update(id: string, payload: ObjectiveNodeUpdate): Promise<ObjectiveNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<ObjectiveNode>;
}

export function createObjectiveService(repo: ObjectiveRepo): ObjectiveService {
    return {
        async list() {
            const items = await repo.list();
            return sortObjectives(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = objectiveCreateSchema.parse(sanitized);
            const items = await repo.list();

            assertCreateHierarchy(items, parsed);

            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = objectiveUpdateSchema.parse(sanitized);
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

const objectiveRepo = createObjectiveRepo();
export const objectiveService = createObjectiveService(objectiveRepo);
