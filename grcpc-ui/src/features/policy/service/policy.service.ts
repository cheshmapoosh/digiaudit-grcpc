import { omitKeys } from "@/shared/utils/object.utils";
import {
    policyCreateSchema,
    policyUpdateSchema,
} from "../domain/policy.schema";
import type {
    PolicyNode,
    PolicyNodeCreate,
    PolicyNodeUpdate,
    PolicyReadonlyKeys,
} from "../domain/policy.model";
import type { PolicyRepo } from "../infra/policy.repo";
import { createPolicyRepo } from "../infra/policy.factory";
import { canCreateChild, sortPolicies } from "../utils/policy.tree";

const READONLY_KEYS: readonly PolicyReadonlyKeys[] = [
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

function assertCreateHierarchy(items: PolicyNode[], payload: PolicyNodeCreate): void {
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

function assertNoCycle(items: PolicyNode[], id: string, parentId: string | null): void {
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
    items: PolicyNode[],
    current: PolicyNode,
    payload: PolicyNodeUpdate,
): void {
    const candidate: PolicyNode = {
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

export interface PolicyService {
    list(): Promise<PolicyNode[]>;
    getById(id: string): Promise<PolicyNode | null>;
    create(payload: PolicyNodeCreate): Promise<PolicyNode>;
    update(id: string, payload: PolicyNodeUpdate): Promise<PolicyNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<PolicyNode>;
}

export function createPolicyService(repo: PolicyRepo): PolicyService {
    return {
        async list() {
            const items = await repo.list();
            return sortPolicies(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = policyCreateSchema.parse(sanitized);
            const items = await repo.list();

            assertCreateHierarchy(items, parsed);

            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = policyUpdateSchema.parse(sanitized);
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
                status: current.status === "inactive" ? "draft" : "inactive",
            });
        },
    };
}

const policyRepo = createPolicyRepo();
export const policyService = createPolicyService(policyRepo);
