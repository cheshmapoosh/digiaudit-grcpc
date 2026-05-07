import { omitKeys } from "@/shared/utils/object.utils";
import {
    riskCreateSchema,
    riskUpdateSchema,
} from "../domain/risk.schema";
import type {
    RiskNode,
    RiskNodeCreate,
    RiskNodeUpdate,
    RiskReadonlyKeys,
} from "../domain/risk.model";
import type { RiskRepo } from "../infra/risk.repo";
import { createRiskRepo } from "../infra/risk.factory";
import { canCreateChild, sortRisks } from "../utils/risk.tree";

const READONLY_KEYS: readonly RiskReadonlyKeys[] = [
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

function assertCreateHierarchy(items: RiskNode[], payload: RiskNodeCreate): void {
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

function assertNoCycle(items: RiskNode[], id: string, parentId: string | null): void {
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
    items: RiskNode[],
    current: RiskNode,
    payload: RiskNodeUpdate,
): void {
    const candidate: RiskNode = {
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

export interface RiskService {
    list(): Promise<RiskNode[]>;
    getById(id: string): Promise<RiskNode | null>;
    create(payload: RiskNodeCreate): Promise<RiskNode>;
    update(id: string, payload: RiskNodeUpdate): Promise<RiskNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<RiskNode>;
}

export function createRiskService(repo: RiskRepo): RiskService {
    return {
        async list() {
            const items = await repo.list();
            return sortRisks(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = riskCreateSchema.parse(sanitized);
            const items = await repo.list();

            assertCreateHierarchy(items, parsed);

            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = riskUpdateSchema.parse(sanitized);
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

const riskRepo = createRiskRepo();
export const riskService = createRiskService(riskRepo);
