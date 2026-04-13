import { createId } from "@/shared/utils/id.utils";
import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";
import type { OrganizationRepo } from "./organization.repo";

const STORAGE_KEY = "grc:organizations";
const LOCAL_USER = "local-user";

function readStorage(): OrganizationNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as OrganizationNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: OrganizationNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function nowIso(): string {
    return new Date().toISOString();
}

function buildCreatedEntity(payload: OrganizationNodeCreate): OrganizationNode {
    const now = nowIso();

    return {
        id: createId("org"),
        code: payload.code,
        name: payload.name,
        type: payload.type,
        parentId: payload.parentId ?? null,
        status: payload.status,
        validFrom: payload.validFrom,
        validTo: payload.validTo,
        description: payload.description,
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

function updateEntity(
    current: OrganizationNode,
    patch: OrganizationNodeUpdate,
): OrganizationNode {
    return {
        ...current,
        ...patch,
        updatedAt: nowIso(),
        updatedBy: LOCAL_USER,
    };
}

function findIndexById(items: OrganizationNode[], id: string): number {
    return items.findIndex((item) => item.id === id);
}

function getRequiredById(items: OrganizationNode[], id: string): OrganizationNode {
    const entity = items.find((item) => item.id === id);

    if (!entity) {
        throw new Error("NOT_FOUND");
    }

    return entity;
}

function replaceById(
    items: OrganizationNode[],
    id: string,
    patch: OrganizationNodeUpdate,
): OrganizationNode {
    const index = findIndexById(items, id);

    if (index < 0) {
        throw new Error("NOT_FOUND");
    }

    const updated = updateEntity(items[index], patch);
    items[index] = updated;

    return updated;
}

export class OrganizationStorageRepo implements OrganizationRepo {
    async list(): Promise<OrganizationNode[]> {
        return readStorage();
    }

    async getById(id: string): Promise<OrganizationNode | null> {
        const items = readStorage();
        return items.find((item) => item.id === id) ?? null;
    }

    async create(payload: OrganizationNodeCreate): Promise<OrganizationNode> {
        const items = readStorage();
        const entity = buildCreatedEntity(payload);

        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<OrganizationNode> {
        const items = readStorage();
        const updated = replaceById(items, id, payload);

        writeStorage(items);

        return updated;
    }

    async remove(id: string): Promise<void> {
        const items = readStorage();

        const target = getRequiredById(items, id);
        const hasChildren = items.some((item) => item.parentId === target.id);

        if (hasChildren) {
            throw new Error("HAS_CHILDREN");
        }

        const next = items.filter((item) => item.id !== id);
        writeStorage(next);
    }

    async getChildren(parentId: string | null = null): Promise<OrganizationNode[]> {
        const items = readStorage();
        return items.filter((item) => (item.parentId ?? null) === parentId);
    }

    async toggleStatus(id: string): Promise<OrganizationNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);

        const updated = replaceById(items, id, {
            status: current.status === "active" ? "inactive" : "active",
        });

        writeStorage(items);

        return updated;
    }
}