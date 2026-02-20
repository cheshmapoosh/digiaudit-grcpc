import type {
    Organization,
    OrganizationCreateInput,
    OrganizationUpdateInput
} from "../types";

const STORAGE_KEY = "grc.organizations.v1";

function nowIso() {
    return new Date().toISOString();
}

function uuid() {
    return (
        (globalThis as any)?.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
}

function loadAll(): Organization[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const data = JSON.parse(raw) as Organization[];
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveAll(items: Organization[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const organizationService = {
    async list(): Promise<Organization[]> {
        const items = loadAll();
        return items.sort((a, b) =>
            `${a.type} ${a.code}`.localeCompare(`${b.type} ${b.code}`)
        );
    },

    async getById(id: string): Promise<Organization | undefined> {
        return loadAll().find((x) => x.id === id);
    },

    async create(input: OrganizationCreateInput): Promise<Organization> {
        const items = loadAll();

        const nextCode = input.code.trim().toLowerCase();
        if (items.some((x) => x.code.trim().toLowerCase() === nextCode)) {
            throw new Error("DUPLICATE_CODE");
        }

        const entity: Organization = {
            id: uuid(),
            ...input,
            code: input.code.trim(),
            name: input.name.trim(),
            createdAt: nowIso(),
            updatedAt: nowIso()
        };

        saveAll([entity, ...items]);
        return entity;
    },

    async update(id: string, patch: OrganizationUpdateInput): Promise<Organization> {
        const items = loadAll();
        const idx = items.findIndex((x) => x.id === id);
        if (idx < 0) throw new Error("NOT_FOUND");

        if (patch.code) {
            const nextCode = patch.code.trim().toLowerCase();
            const duplicate = items.some(
                (x) => x.id !== id && x.code.trim().toLowerCase() === nextCode
            );
            if (duplicate) throw new Error("DUPLICATE_CODE");
        }

        const current = items[idx];
        const updated: Organization = {
            ...current,
            ...patch,
            code: (patch.code ?? current.code).trim(),
            name: (patch.name ?? current.name).trim(),
            updatedAt: nowIso()
        };

        items[idx] = updated;
        saveAll(items);
        return updated;
    },

    async remove(id: string): Promise<void> {
        const items = loadAll();

        const hasChild = items.some((x) => x.parentId === id);
        if (hasChild) throw new Error("HAS_CHILDREN");

        saveAll(items.filter((x) => x.id !== id));
    }
};
