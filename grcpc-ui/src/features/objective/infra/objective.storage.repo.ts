import { createId } from "@/shared/utils/id.utils";
import type {
    ObjectiveNode,
    ObjectiveNodeCreate,
    ObjectiveNodeUpdate,
} from "../domain/objective.model";
import type { ObjectiveRepo } from "./objective.repo";
import { canCreateChild } from "../utils/objective.tree";

const STORAGE_KEY = "grc:objectives";
const LOCAL_USER = "local-user";

function nowIso(): string {
    return new Date().toISOString();
}

function buildSeedData(): ObjectiveNode[] {
    const now = nowIso();

    const base = {
        status: "active" as const,
        nodeType: "objective" as const,
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
            id: "obj-00",
            code: "00",
            title: "ساختار اهداف",
            parentId: null,
            sortOrder: 0,
            objectiveType: "strategic",
            objectiveClass: "اهداف کلان",
            documentsCount: 0,
        },
        {
            ...base,
            id: "obj-01",
            code: "01",
            title: "بهبود / نگهداری کیفیت",
            parentId: "obj-00",
            sortOrder: 1,
            objectiveType: "operational",
            objectiveClass: "کیفیت",
            strategy: "بهبود مستمر کیفیت محصولات و دارایی‌ها",
            validUntil: "1404/12/29",
            documentsCount: 2,
        },
        {
            ...base,
            id: "obj-01-01",
            code: "01-01",
            title: "بهبود کیفیت محصولات",
            parentId: "obj-01",
            sortOrder: 1,
            objectiveType: "operational",
            objectiveClass: "کیفیت محصول",
            strategy: "کاهش خطا و افزایش کیفیت خروجی‌های اصلی سازمان",
            validUntil: "1404/12/29",
            documentsCount: 1,
        },
        {
            ...base,
            id: "obj-01-02",
            code: "01-02",
            title: "بهبود کیفیت دارایی‌ها",
            parentId: "obj-01",
            sortOrder: 2,
            objectiveType: "operational",
            objectiveClass: "کیفیت دارایی",
            validUntil: "1404/12/29",
        },
        {
            ...base,
            id: "obj-02",
            code: "02",
            title: "بهبود / نگهداری رضایتمندی مشتریان",
            parentId: "obj-00",
            sortOrder: 2,
            objectiveType: "market",
            objectiveClass: "مشتری",
        },
        {
            ...base,
            id: "obj-03",
            code: "03",
            title: "کاهش هزینه‌ها",
            parentId: "obj-00",
            sortOrder: 3,
            objectiveType: "financial",
            objectiveClass: "هزینه",
        },
        {
            ...base,
            id: "obj-04",
            code: "04",
            title: "افزایش درآمدها",
            parentId: "obj-00",
            sortOrder: 4,
            objectiveType: "financial",
            objectiveClass: "درآمد",
        },
        {
            ...base,
            id: "obj-05",
            code: "05",
            title: "ایجاد اطلاعات قابل اتکا کسب و کار",
            parentId: "obj-00",
            sortOrder: 5,
            objectiveType: "reporting",
            objectiveClass: "گزارشگری",
        },
        {
            ...base,
            id: "obj-06",
            code: "06",
            title: "محافظت از دارایی‌ها",
            parentId: "obj-00",
            sortOrder: 6,
            objectiveType: "operational",
            objectiveClass: "دارایی",
        },
        {
            ...base,
            id: "obj-07",
            code: "07",
            title: "امنیت",
            parentId: "obj-00",
            sortOrder: 7,
            objectiveType: "operational",
            objectiveClass: "امنیت",
        },
        {
            ...base,
            id: "obj-08",
            code: "08",
            title: "رعایت قوانین و مقررات",
            parentId: "obj-00",
            sortOrder: 8,
            objectiveType: "compliance",
            objectiveClass: "رعایت",
        },
        {
            ...base,
            id: "obj-09",
            code: "09",
            title: "پیشگیری/ کشف تقلب",
            parentId: "obj-00",
            sortOrder: 9,
            objectiveType: "compliance",
            objectiveClass: "تقلب",
        },
        {
            ...base,
            id: "obj-10",
            code: "10",
            title: "کاهش توقفات تولید",
            parentId: "obj-00",
            sortOrder: 10,
            objectiveType: "operational",
            objectiveClass: "تولید",
        },
    ];
}

function readStorage(): ObjectiveNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        const seedData = buildSeedData();
        writeStorage(seedData);
        return seedData;
    }

    try {
        const parsed = JSON.parse(raw) as ObjectiveNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: ObjectiveNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function buildCreatedEntity(payload: ObjectiveNodeCreate): ObjectiveNode {
    const now = nowIso();

    return {
        id: createId("obj"),
        code: payload.code,
        title: payload.title,
        nodeType: payload.nodeType,
        parentId: payload.parentId ?? null,
        status: payload.status,
        sortOrder: payload.sortOrder,
        description: payload.description,
        strategy: payload.strategy,
        objectiveType: payload.objectiveType,
        objectiveClass: payload.objectiveClass,
        organizationUnitId: payload.organizationUnitId,
        organizationUnitName: payload.organizationUnitName,
        effectiveFrom: payload.effectiveFrom,
        validUntil: payload.validUntil,
        documentsCount: payload.documentsCount,
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

function updateEntity(current: ObjectiveNode, patch: ObjectiveNodeUpdate): ObjectiveNode {
    return {
        ...current,
        ...patch,
        parentId: patch.parentId === undefined ? current.parentId : patch.parentId,
        updatedAt: nowIso(),
        updatedBy: LOCAL_USER,
    };
}

function findIndexById(items: ObjectiveNode[], id: string): number {
    return items.findIndex((item) => item.id === id);
}

function getRequiredById(items: ObjectiveNode[], id: string): ObjectiveNode {
    const entity = items.find((item) => item.id === id);

    if (!entity) {
        throw new Error("NOT_FOUND");
    }

    return entity;
}

function replaceById(
    items: ObjectiveNode[],
    id: string,
    patch: ObjectiveNodeUpdate,
): ObjectiveNode {
    const index = findIndexById(items, id);

    if (index < 0) {
        throw new Error("NOT_FOUND");
    }

    const updated = updateEntity(items[index], patch);
    items[index] = updated;

    return updated;
}

function assertHierarchy(items: ObjectiveNode[], entity: ObjectiveNodeCreate | ObjectiveNode): void {
    const parent = entity.parentId ? getRequiredById(items, entity.parentId) : null;
    const parentType = parent?.nodeType ?? null;

    if (!canCreateChild(parentType, entity.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }
}

export class ObjectiveStorageRepo implements ObjectiveRepo {
    async list(): Promise<ObjectiveNode[]> {
        return readStorage();
    }

    async getById(id: string): Promise<ObjectiveNode | null> {
        const items = readStorage();
        return items.find((item) => item.id === id) ?? null;
    }

    async create(payload: ObjectiveNodeCreate): Promise<ObjectiveNode> {
        const items = readStorage();
        assertHierarchy(items, payload);

        const entity = buildCreatedEntity(payload);
        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(id: string, payload: ObjectiveNodeUpdate): Promise<ObjectiveNode> {
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

    async getChildren(parentId: string | null = null): Promise<ObjectiveNode[]> {
        const items = readStorage();
        return items.filter((item) => (item.parentId ?? null) === parentId);
    }

    async toggleStatus(id: string): Promise<ObjectiveNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);

        const updated = replaceById(items, id, {
            status: current.status === "active" ? "inactive" : "active",
        });

        writeStorage(items);

        return updated;
    }
}
