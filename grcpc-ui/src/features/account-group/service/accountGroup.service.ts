import { omitKeys } from "@/shared/utils/object.utils";
import {
    accountGroupCreateSchema,
    accountGroupUpdateSchema,
} from "../domain/accountGroup.schema";
import type {
    AccountGroupNode,
    AccountGroupNodeCreate,
    AccountGroupNodeUpdate,
    AccountGroupReadonlyKeys,
} from "../domain/accountGroup.model";
import type { AccountGroupRepo } from "../infra/accountGroup.repo";
import { createAccountGroupRepo } from "../infra/accountGroup.factory";
import { sortAccountGroups } from "../utils/accountGroup.tree";

const READONLY_KEYS: readonly AccountGroupReadonlyKeys[] = [
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
    items: AccountGroupNode[],
    payload: AccountGroupNodeCreate,
): void {
    if (!payload.parentId) {
        return;
    }

    const parent = items.find((item) => item.id === payload.parentId);

    if (!parent) {
        throw new Error("PARENT_NOT_FOUND");
    }
}

function assertNoCycle(
    items: AccountGroupNode[],
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
    items: AccountGroupNode[],
    current: AccountGroupNode,
    payload: AccountGroupNodeUpdate,
): void {
    const candidate: AccountGroupNode = {
        ...current,
        ...payload,
        parentId: payload.parentId === undefined ? current.parentId : payload.parentId,
    };

    assertNoCycle(items, current.id, candidate.parentId ?? null);

    if (!candidate.parentId) {
        return;
    }

    const parent = items.find((item) => item.id === candidate.parentId);

    if (!parent) {
        throw new Error("PARENT_NOT_FOUND");
    }
}

export interface AccountGroupService {
    list(): Promise<AccountGroupNode[]>;
    getById(id: string): Promise<AccountGroupNode | null>;
    create(payload: AccountGroupNodeCreate): Promise<AccountGroupNode>;
    update(id: string, payload: AccountGroupNodeUpdate): Promise<AccountGroupNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<AccountGroupNode>;
}

export function createAccountGroupService(repo: AccountGroupRepo): AccountGroupService {
    return {
        async list() {
            const items = await repo.list();
            return sortAccountGroups(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = accountGroupCreateSchema.parse(sanitized);
            const items = await repo.list();

            assertCreateHierarchy(items, parsed);

            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = accountGroupUpdateSchema.parse(sanitized);
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

const accountGroupRepo = createAccountGroupRepo();
export const accountGroupService = createAccountGroupService(accountGroupRepo);
