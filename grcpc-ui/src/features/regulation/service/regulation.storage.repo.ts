import type { RegulationEntity, RegulationId, RegulationRepo, RegulationUpsertInput } from "../model/regulation.types";
import type {ProcessRepo} from "../../process/service/process.repo";

const STORAGE_KEY = "grcpc.regulation.items.v1";

function nowIso() {
    return new Date().toISOString();
}

function genId(): RegulationId {
    // ساده و کافی برای UI
    return crypto.randomUUID?.() ?? `reg_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function readAll(): RegulationEntity[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return seedIfEmpty();
        const arr = JSON.parse(raw) as RegulationEntity[];
        if (!Array.isArray(arr)) return seedIfEmpty();
        return arr;
    } catch {
        return seedIfEmpty();
    }
}

function writeAll(items: RegulationEntity[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function seedIfEmpty(): RegulationEntity[] {
    const t = nowIso();
    const root1: RegulationEntity = {
        id: "reg-root-1",
        code: "REG-001",
        title: "قوانین عمومی",
        description: "ریشه قوانین عمومی",
        parentId: null,
        status: "ACTIVE",
        createdAt: t,
        updatedAt: t,
    };
    const child1: RegulationEntity = {
        id: "reg-1-1",
        code: "REG-001-01",
        title: "سیاست امنیت اطلاعات",
        description: "الزامات امنیت اطلاعات",
        parentId: root1.id,
        status: "DRAFT",
        createdAt: t,
        updatedAt: t,
    };
    const items = [root1, child1];
    writeAll(items);
    return items;
}

export const regulationStorageRepo: RegulationRepo = {
    async list(): Promise<RegulationEntity[]> {
        return readAll();
    },

    async getById(id: RegulationId): Promise<RegulationEntity | null> {
        const items = readAll();
        return items.find((x) => x.id === id) ?? null;
    },

    async create(input: RegulationUpsertInput): Promise<RegulationEntity> {
        const items = readAll();
        const t = nowIso();

        const entity: RegulationEntity = {
            id: genId(),
            code: input.code,
            title: input.title,
            description: input.description,
            parentId: input.parentId ?? null,
            status: input.status,
            createdAt: t,
            updatedAt: t,
        };

        items.push(entity);
        writeAll(items);
        return entity;
    },

    async update(id: RegulationId, input: RegulationUpsertInput): Promise<RegulationEntity> {
        const items = readAll();
        const idx = items.findIndex((x) => x.id === id);
        if (idx < 0) throw new Error(`Regulation not found: ${id}`);

        const current = items[idx];
        const updated: RegulationEntity = {
            ...current,
            code: input.code,
            title: input.title,
            description: input.description,
            parentId: input.parentId ?? null,
            status: input.status,
            updatedAt: nowIso(),
        };

        items[idx] = updated;
        writeAll(items);
        return updated;
    },

    async delete(id: RegulationId): Promise<void> {
        const items = readAll();
        // حذف ساده: node + subtree
        const idsToDelete = new Set<string>();
        const childrenOf = new Map<string, string[]>();

        for (const it of items) {
            const p = it.parentId ?? null;
            if (p) {
                childrenOf.set(p, [...(childrenOf.get(p) ?? []), it.id]);
            }
        }

        const stack = [id];
        while (stack.length) {
            const cur = stack.pop()!;
            if (idsToDelete.has(cur)) continue;
            idsToDelete.add(cur);
            const kids = childrenOf.get(cur) ?? [];
            for (const k of kids) stack.push(k);
        }

        const next = items.filter((x) => !idsToDelete.has(x.id));
        writeAll(next);
    },
}