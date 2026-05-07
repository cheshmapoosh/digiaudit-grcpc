import { createId } from "@/shared/utils/id.utils";
import type {
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
} from "../domain/process.model";
import type { ProcessRepo } from "./process.repo";
import { canCreateChild } from "../utils/process.tree";

const STORAGE_KEY = "grc:processes";
const LOCAL_USER = "local-user";

function nowIso(): string {
    return new Date().toISOString();
}

function buildSeedData(): ProcessNode[] {
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
            id: "proc-00",
            code: "00",
            title: "ساختار فرآیند",
            nodeType: "process",
            parentId: null,
            sortOrder: 0,
            processCategory: "operational",
            documentsCount: 0,
        },
        {
            ...base,
            id: "proc-01",
            code: "01",
            title: "فرآیند تامین",
            nodeType: "process",
            parentId: "proc-00",
            sortOrder: 1,
            processCategory: "operational",
            description:
                "فرآیند تامین جهت خریدهای مواد اولیه، پشتیبانی و خارجی شرکت است.",
            documentsCount: 4,
        },
        {
            ...base,
            id: "subproc-01-01",
            code: "01-01",
            title: "زیر فرآیند درخواست",
            nodeType: "subProcess",
            parentId: "proc-01",
            sortOrder: 1,
            processCategory: "operational",
        },
        {
            ...base,
            id: "ctrl-01-01-01",
            code: "01-01-01",
            title: "تایید درخواست توسط مدیر مربوطه",
            nodeType: "control",
            parentId: "subproc-01-01",
            sortOrder: 1,
            objective: "اطمینان از اعتبار درخواست پیش از ورود به مرحله تامین",
            controlAutomation: "manual",
            importance: "high",
            controlOwner: "مدیر مربوطه",
        },
        {
            ...base,
            id: "ctrl-01-01-02",
            code: "01-01-02",
            title: "برنامه ریزی جهت تجمیع درخواست ها",
            nodeType: "control",
            parentId: "subproc-01-01",
            sortOrder: 2,
            objective: "کاهش هزینه و جلوگیری از خریدهای پراکنده",
            controlAutomation: "manual",
            importance: "medium",
        },
        {
            ...base,
            id: "proc-02",
            code: "02",
            title: "فرآیند منابع انسانی",
            nodeType: "process",
            parentId: "proc-00",
            sortOrder: 2,
            processCategory: "operational",
        },
        {
            ...base,
            id: "proc-03",
            code: "03",
            title: "فرآیند مالی",
            nodeType: "process",
            parentId: "proc-00",
            sortOrder: 3,
            processCategory: "financial",
        },
    ];
}

function readStorage(): ProcessNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        const seedData = buildSeedData();
        writeStorage(seedData);
        return seedData;
    }

    try {
        const parsed = JSON.parse(raw) as ProcessNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: ProcessNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function buildCreatedEntity(payload: ProcessNodeCreate): ProcessNode {
    const now = nowIso();

    return {
        id: createId("proc"),
        code: payload.code,
        title: payload.title,
        nodeType: payload.nodeType,
        parentId: payload.parentId ?? null,
        status: payload.status,
        sortOrder: payload.sortOrder,
        description: payload.description,
        processCategory: payload.processCategory,
        ownerId: payload.ownerId,
        ownerName: payload.ownerName,
        documentsCount: payload.documentsCount,
        objective: payload.objective,
        operationCycle: payload.operationCycle,
        controlAutomation: payload.controlAutomation,
        controlFrequency: payload.controlFrequency,
        controlClassification: payload.controlClassification,
        controlOwner: payload.controlOwner,
        testDirection: payload.testDirection,
        testType: payload.testType,
        testProgram: payload.testProgram,
        importance: payload.importance,
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

function updateEntity(current: ProcessNode, patch: ProcessNodeUpdate): ProcessNode {
    return {
        ...current,
        ...patch,
        parentId: patch.parentId === undefined ? current.parentId : patch.parentId,
        updatedAt: nowIso(),
        updatedBy: LOCAL_USER,
    };
}

function findIndexById(items: ProcessNode[], id: string): number {
    return items.findIndex((item) => item.id === id);
}

function getRequiredById(items: ProcessNode[], id: string): ProcessNode {
    const entity = items.find((item) => item.id === id);

    if (!entity) {
        throw new Error("NOT_FOUND");
    }

    return entity;
}

function replaceById(
    items: ProcessNode[],
    id: string,
    patch: ProcessNodeUpdate,
): ProcessNode {
    const index = findIndexById(items, id);

    if (index < 0) {
        throw new Error("NOT_FOUND");
    }

    const updated = updateEntity(items[index], patch);
    items[index] = updated;

    return updated;
}

function assertHierarchy(items: ProcessNode[], entity: ProcessNodeCreate | ProcessNode): void {
    const parent = entity.parentId ? getRequiredById(items, entity.parentId) : null;
    const parentType = parent?.nodeType ?? null;

    if (!canCreateChild(parentType, entity.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }
}

export class ProcessStorageRepo implements ProcessRepo {
    async list(): Promise<ProcessNode[]> {
        return readStorage();
    }

    async getById(id: string): Promise<ProcessNode | null> {
        const items = readStorage();
        return items.find((item) => item.id === id) ?? null;
    }

    async create(payload: ProcessNodeCreate): Promise<ProcessNode> {
        const items = readStorage();
        assertHierarchy(items, payload);

        const entity = buildCreatedEntity(payload);
        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(id: string, payload: ProcessNodeUpdate): Promise<ProcessNode> {
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

    async getChildren(parentId: string | null = null): Promise<ProcessNode[]> {
        const items = readStorage();
        return items.filter((item) => (item.parentId ?? null) === parentId);
    }

    async toggleStatus(id: string): Promise<ProcessNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);

        const updated = replaceById(items, id, {
            status: current.status === "active" ? "inactive" : "active",
        });

        writeStorage(items);

        return updated;
    }
}
