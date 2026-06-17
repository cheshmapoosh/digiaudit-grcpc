import { omitKeys } from "@/shared/utils/object.utils";
import {
    regulationCreateSchema,
    regulationUpdateSchema,
} from "../domain/regulation.schema";
import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
    RegulationReadonlyKeys,
} from "../domain/regulation.model";
import type { RegulationRepo } from "../infra/regulation.repo";
import { createRegulationRepo } from "../infra/regulation.factory";
import { canCreateChild, sortRegulations } from "../utils/regulation.tree";

const READONLY_KEYS: readonly RegulationReadonlyKeys[] = [
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

function assertCreateHierarchy(
    items: RegulationNode[],
    payload: RegulationNodeCreate,
): void {
    const parent = payload.parentId
        ? items.find((item) => item.id === payload.parentId) ?? null
        : null;

    if (payload.parentId && !parent) {
        throw new Error("PARENT_NOT_FOUND");
    }

    if (!canCreateChild(parent?.nodeType ?? null, payload.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }
}

function assertNoCycle(
    items: RegulationNode[],
    id: string,
    parentId: string | null,
): void {
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
    items: RegulationNode[],
    current: RegulationNode,
    payload: RegulationNodeUpdate,
): void {
    const candidate: RegulationNode = {
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

export interface RegulationService {
    list(): Promise<RegulationNode[]>;
    getById(id: string): Promise<RegulationNode | null>;
    listChildren(parentId: string): Promise<RegulationNode[]>;
    create(payload: RegulationNodeCreate): Promise<RegulationNode>;
    update(id: string, payload: RegulationNodeUpdate): Promise<RegulationNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<RegulationNode>;
}

export function createRegulationService(repo: RegulationRepo): RegulationService {
    return {
        async list() {
            const items = await repo.list();
            return sortRegulations(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async listChildren(parentId) {
            return sortRegulations(await repo.getChildren(parentId));
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = regulationCreateSchema.parse(sanitized);
            const items = await repo.list();

            assertCreateHierarchy(items, parsed);

            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = regulationUpdateSchema.parse(sanitized);
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

const regulationRepo = createRegulationRepo();
export const regulationService = createRegulationService(regulationRepo);
