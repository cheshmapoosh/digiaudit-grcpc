import { createId } from "@/shared/utils/id.utils";
import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
} from "../domain/regulation.model";
import type { RegulationRepo } from "./regulation.repo";
import { canCreateChild } from "../utils/regulation.tree";

const STORAGE_KEY = "grc:regulations";
const LOCAL_USER = "local-user";

function nowIso(): string {
    return new Date().toISOString();
}

function buildSeedData(): RegulationNode[] {
    const now = nowIso();

    const base = {
        status: "active" as const,
        effectiveDate: "1404/01/01",
        validTo: "1404/12/29",
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };

    return [
        {
            ...base,
            id: "lawgrp-00",
            code: "00",
            title: "ساختار قانون",
            nodeType: "lawGroup",
            parentId: null,
            sortOrder: 0,
            description: "ریشه ساختار قوانین و مقررات",
            documentsCount: 0,
        },
        {
            ...base,
            id: "lawgrp-01",
            code: "01",
            title: "قانون مالیاتی",
            nodeType: "lawGroup",
            parentId: "lawgrp-00",
            sortOrder: 1,
            description: "گروه قوانین مرتبط با مالیات و تکالیف مالیاتی",
            documentsCount: 0,
        },
        {
            ...base,
            id: "law-01-01",
            code: "01-01",
            title: "ارزش افزوده",
            nodeType: "law",
            parentId: "lawgrp-01",
            sortOrder: 1,
            description: "قانون مالیات بر ارزش افزوده",
            issuer: "سازمان امور مالیاتی",
            documentsCount: 0,
        },
        {
            ...base,
            id: "req-01-01-01",
            code: "01-01-01",
            title: "دریافت 10 درصد ارزش افزوده",
            nodeType: "lawRequirement",
            parentId: "law-01-01",
            sortOrder: 1,
            description: "دریافت مالیات و عوارض ارزش افزوده مطابق نرخ ابلاغی",
            documentsCount: 0,
        },
        {
            ...base,
            id: "req-01-01-02",
            code: "01-01-02",
            title: "ثبت فاکتور در سامانه مودیان",
            nodeType: "lawRequirement",
            parentId: "law-01-01",
            sortOrder: 2,
            description: "ثبت صورتحساب در سامانه مودیان در بازه زمانی مقرر",
            documentsCount: 0,
        },
    ];
}

function writeStorage(items: RegulationNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function readStorage(): RegulationNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        const seedData = buildSeedData();
        writeStorage(seedData);
        return seedData;
    }

    try {
        const parsed = JSON.parse(raw) as RegulationNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function buildCreatedEntity(payload: RegulationNodeCreate): RegulationNode {
    const now = nowIso();

    return {
        id: createId("reg"),
        code: payload.code,
        title: payload.title,
        nodeType: payload.nodeType,
        parentId: payload.parentId ?? null,
        status: payload.status,
        sortOrder: payload.sortOrder,
        description: payload.description,
        effectiveDate: payload.effectiveDate,
        validTo: payload.validTo,
        issuer: payload.issuer,
        ownerName: payload.ownerName,
        documentsCount: payload.documentsCount,
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

function updateEntity(current: RegulationNode, patch: RegulationNodeUpdate): RegulationNode {
    return {
        ...current,
        ...patch,
        parentId: patch.parentId === undefined ? current.parentId : patch.parentId,
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

function assertHierarchy(
    items: RegulationNode[],
    entity: RegulationNodeCreate | RegulationNode,
): void {
    const parent = entity.parentId ? getRequiredById(items, entity.parentId) : null;
    const parentType = parent?.nodeType ?? null;

    if (!canCreateChild(parentType, entity.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }
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
        assertHierarchy(items, payload);

        const entity = buildCreatedEntity(payload);
        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(id: string, payload: RegulationNodeUpdate): Promise<RegulationNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);
        const candidate = updateEntity(current, payload);

        if (candidate.parentId === candidate.id) {
            throw new Error("INVALID_HIERARCHY");
        }

        assertHierarchy(
            items.filter((item) => item.id !== id),
            candidate,
        );

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

        writeStorage(items.filter((item) => item.id !== id));
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
