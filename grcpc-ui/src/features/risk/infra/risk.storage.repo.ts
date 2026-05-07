import { createId } from "@/shared/utils/id.utils";
import type {
    RiskNode,
    RiskNodeCreate,
    RiskNodeUpdate,
} from "../domain/risk.model";
import type { RiskRepo } from "./risk.repo";
import { canCreateChild } from "../utils/risk.tree";

const STORAGE_KEY = "grc:risks";
const LOCAL_USER = "local-user";

function nowIso(): string {
    return new Date().toISOString();
}

function buildSeedData(): RiskNode[] {
    const now = nowIso();

    const base = {
        status: "active" as const,
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
            id: "risk-cat-00",
            code: "00",
            title: "ساختار دسته‌بندی",
            nodeType: "riskCategory",
            parentId: null,
            sortOrder: 0,
            allowReference: true,
            analysisProfile: "پروفایل پیش‌فرض",
            documentsCount: 0,
        },
        {
            ...base,
            id: "risk-cat-01",
            code: "01",
            title: "ریسک عملیاتی",
            nodeType: "riskCategory",
            parentId: "risk-cat-00",
            sortOrder: 1,
            allowReference: true,
            analysisProfile: "تحلیل عملیاتی",
            documentsCount: 2,
        },
        {
            ...base,
            id: "risk-template-01-01",
            code: "01-01",
            title: "ریسک مستند نبودن فرآیند",
            nodeType: "riskTemplate",
            parentId: "risk-cat-01",
            sortOrder: 1,
            description: "عدم وجود مستندات کامل فرآیندی می‌تواند اجرای کنترل‌ها را با ابهام مواجه کند.",
            riskType: "operational",
            companyOperation: "عملیات داخلی",
            causes: "نبود مالک مشخص، تغییرات فرآیندی بدون ثبت رسمی",
            effects: [
                {
                    id: "effect-01",
                    effect: "کاهش اثربخشی کنترل",
                    effectCategory: "کنترلی",
                    effectCategoryDescription: "ابهام در مسئولیت‌ها و مسیر اجرای فرآیند",
                },
            ],
            documentsCount: 1,
            existingRisksCount: 0,
            responsePatternsCount: 0,
            controlCentersCount: 0,
        },
        {
            ...base,
            id: "risk-template-01-02",
            code: "01-02",
            title: "ریسک قطعی سیستم‌ها",
            nodeType: "riskTemplate",
            parentId: "risk-cat-01",
            sortOrder: 2,
            description: "اختلال در سامانه‌های عملیاتی و پشتیبان باعث توقف یا کندی خدمت‌رسانی می‌شود.",
            riskType: "technology",
            companyOperation: "فناوری اطلاعات",
            causes: "خرابی زیرساخت، ضعف مانیتورینگ، نبود سناریوی بازیابی",
            documentsCount: 1,
        },
        {
            ...base,
            id: "risk-cat-02",
            code: "02",
            title: "ریسک منابع انسانی",
            nodeType: "riskCategory",
            parentId: "risk-cat-00",
            sortOrder: 2,
            allowReference: true,
            analysisProfile: "تحلیل منابع انسانی",
        },
        {
            ...base,
            id: "risk-cat-03",
            code: "03",
            title: "ریسک مالی",
            nodeType: "riskCategory",
            parentId: "risk-cat-00",
            sortOrder: 3,
            allowReference: true,
            analysisProfile: "تحلیل مالی",
        },
    ];
}

function readStorage(): RiskNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        const seedData = buildSeedData();
        writeStorage(seedData);
        return seedData;
    }

    try {
        const parsed = JSON.parse(raw) as RiskNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: RiskNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function buildCreatedEntity(payload: RiskNodeCreate): RiskNode {
    const now = nowIso();

    return {
        id: createId("risk"),
        code: payload.code,
        title: payload.title,
        nodeType: payload.nodeType,
        parentId: payload.parentId ?? null,
        status: payload.status,
        sortOrder: payload.sortOrder,
        description: payload.description,
        validFrom: payload.validFrom,
        validTo: payload.validTo,
        allowReference: payload.allowReference,
        analysisProfile: payload.analysisProfile,
        ownerId: payload.ownerId,
        ownerName: payload.ownerName,
        documentsCount: payload.documentsCount,
        companyOperation: payload.companyOperation,
        riskType: payload.riskType,
        causes: payload.causes,
        effects: payload.effects,
        existingRisksCount: payload.existingRisksCount,
        responsePatternsCount: payload.responsePatternsCount,
        controlCentersCount: payload.controlCentersCount,
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

function updateEntity(current: RiskNode, patch: RiskNodeUpdate): RiskNode {
    return {
        ...current,
        ...patch,
        parentId: patch.parentId === undefined ? current.parentId : patch.parentId,
        updatedAt: nowIso(),
        updatedBy: LOCAL_USER,
    };
}

function findIndexById(items: RiskNode[], id: string): number {
    return items.findIndex((item) => item.id === id);
}

function getRequiredById(items: RiskNode[], id: string): RiskNode {
    const entity = items.find((item) => item.id === id);

    if (!entity) {
        throw new Error("NOT_FOUND");
    }

    return entity;
}

function replaceById(
    items: RiskNode[],
    id: string,
    patch: RiskNodeUpdate,
): RiskNode {
    const index = findIndexById(items, id);

    if (index < 0) {
        throw new Error("NOT_FOUND");
    }

    const updated = updateEntity(items[index], patch);
    items[index] = updated;

    return updated;
}

function assertHierarchy(items: RiskNode[], entity: RiskNodeCreate | RiskNode): void {
    const parent = entity.parentId ? getRequiredById(items, entity.parentId) : null;
    const parentType = parent?.nodeType ?? null;

    if (!canCreateChild(parentType, entity.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }
}

export class RiskStorageRepo implements RiskRepo {
    async list(): Promise<RiskNode[]> {
        return readStorage();
    }

    async getById(id: string): Promise<RiskNode | null> {
        const items = readStorage();
        return items.find((item) => item.id === id) ?? null;
    }

    async create(payload: RiskNodeCreate): Promise<RiskNode> {
        const items = readStorage();
        assertHierarchy(items, payload);

        const entity = buildCreatedEntity(payload);
        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(id: string, payload: RiskNodeUpdate): Promise<RiskNode> {
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

    async getChildren(parentId: string | null = null): Promise<RiskNode[]> {
        const items = readStorage();
        return items.filter((item) => (item.parentId ?? null) === parentId);
    }

    async toggleStatus(id: string): Promise<RiskNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);

        const updated = replaceById(items, id, {
            status: current.status === "active" ? "inactive" : "active",
        });

        writeStorage(items);

        return updated;
    }
}
