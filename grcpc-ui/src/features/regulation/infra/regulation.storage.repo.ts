import { createId } from "@/shared/utils/id.utils";
import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
} from "@/features/regulation";
import type { RegulationRepo } from "./regulation.repo";

const STORAGE_KEY = "grc:regulations";
const LOCAL_USER = "local-user";

function readStorage(): RegulationNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as RegulationNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: RegulationNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function nowIso(): string {
    return new Date().toISOString();
}

function buildCreatedEntity(payload: RegulationNodeCreate): RegulationNode {
    const now = nowIso();

    return {
        id: createId("reg"),
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
    current: RegulationNode,
    patch: RegulationNodeUpdate,
): RegulationNode {
    return {
        ...current,
        ...patch,
        updatedAt: nowIso(),
        updatedBy: LOCAL_USER,
    };
}

function findIndexById(items: RegulationNode[], id: string): number {
    return items.findIndex((item) => item.id === id);
}

function getRequiredById(items: RegulationNode[], id: string): RegulationNode {
    const entity = items.find((item) => item.id === id);

    if (!entity) {
        throw new Error("NOT_FOUND");
    }

    return entity;
}

function replaceById(
    items: RegulationNode[],
    id: string,
    patch: RegulationNodeUpdate,
): RegulationNode {
    const index = findIndexById(items, id);

    if (index < 0) {
        throw new Error("NOT_FOUND");
    }

    const updated = updateEntity(items[index], patch);
    items[index] = updated;

    return updated;
}

export class RegulationStorageRepo implements RegulationRepo {
    async list(): Promise<RegulationNode[]> {
        return readStorage();
    }

    async getById(id: string): Promise<RegulationNode | null> {
        const items = readStorage();
        return items.find((item) => item.id === id) ?? null;
    }

    async create(payload: RegulationNodeCreate): Promise<RegulationNode> {
        const items = readStorage();
        const entity = buildCreatedEntity(payload);

        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(
        id: string,
        payload: RegulationNodeUpdate,
    ): Promise<RegulationNode> {
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

    async getChildren(parentId: string | null = null): Promise<RegulationNode[]> {
        const items = readStorage();
        return items.filter((item) => (item.parentId ?? null) === parentId);
    }

    async toggleStatus(id: string): Promise<RegulationNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);

        const updated = replaceById(items, id, {
            status: current.status === "active" ? "inactive" : "active",
        });

        writeStorage(items);

        return updated;
    }
}