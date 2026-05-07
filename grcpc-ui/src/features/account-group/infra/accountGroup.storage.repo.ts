import { createId } from "@/shared/utils/id.utils";
import type {
    AccountGroupAssertions,
    AccountGroupNode,
    AccountGroupNodeCreate,
    AccountGroupNodeUpdate,
} from "../domain/accountGroup.model";
import type { AccountGroupRepo } from "./accountGroup.repo";

const STORAGE_KEY = "grc:account-groups";
const LOCAL_USER = "local-user";

const DEFAULT_ASSERTIONS: AccountGroupAssertions = {
    existence: false,
    completeness: false,
    valuation: false,
    disclosure: false,
};

function nowIso(): string {
    return new Date().toISOString();
}

function buildSeedData(): AccountGroupNode[] {
    const now = nowIso();

    const base = {
        status: "active" as const,
        importance: "medium" as const,
        reasonableAssurance: true,
        assertions: DEFAULT_ASSERTIONS,
        objectives: [],
        accountRanges: [],
        risks: [],
        documentsCount: 0,
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
            id: "ag-balance-sheet",
            code: "BS",
            title: "حساب‌های ترازنامه",
            parentId: null,
            sortOrder: 1,
            description: "گروه اصلی حساب‌های ترازنامه",
            assertions: {
                existence: true,
                completeness: true,
                valuation: true,
                disclosure: true,
            },
            accountRanges: [
                {
                    id: "range-bs-1",
                    fromAccount: "1000",
                    toAccount: "3999",
                    description: "بازه حساب‌های ترازنامه",
                },
            ],
        },
        {
            ...base,
            id: "ag-current-assets",
            code: "BS-01",
            title: "دارایی جاری",
            parentId: "ag-balance-sheet",
            sortOrder: 1,
            accountRanges: [
                {
                    id: "range-current-assets-1",
                    fromAccount: "1100",
                    toAccount: "1999",
                },
            ],
        },
        {
            ...base,
            id: "ag-receivables",
            code: "BS-01-01",
            title: "حساب‌های دریافتنی",
            parentId: "ag-current-assets",
            sortOrder: 1,
            accountRanges: [
                {
                    id: "range-receivables-1",
                    fromAccount: "1200",
                    toAccount: "1299",
                },
            ],
            risks: [
                {
                    id: "risk-receivables-1",
                    name: "عدم وصول مطالبات",
                    description: "ریسک ثبت مطالبات غیرقابل وصول یا فاقد پشتوانه",
                    source: "ارزیابی حسابرسی",
                },
            ],
        },
        {
            ...base,
            id: "ag-fixed-assets",
            code: "BS-02",
            title: "دارایی ثابت",
            parentId: "ag-balance-sheet",
            sortOrder: 2,
        },
        {
            ...base,
            id: "ag-profit-loss",
            code: "PL",
            title: "حساب‌های سود و زیان",
            parentId: null,
            sortOrder: 2,
            description: "گروه اصلی حساب‌های سود و زیان",
            accountRanges: [
                {
                    id: "range-pl-1",
                    fromAccount: "4000",
                    toAccount: "8999",
                },
            ],
        },
    ];
}

function readStorage(): AccountGroupNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        const seedData = buildSeedData();
        writeStorage(seedData);
        return seedData;
    }

    try {
        const parsed = JSON.parse(raw) as AccountGroupNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: AccountGroupNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function buildCreatedEntity(payload: AccountGroupNodeCreate): AccountGroupNode {
    const now = nowIso();

    return {
        id: createId("ag"),
        code: payload.code,
        title: payload.title,
        parentId: payload.parentId ?? null,
        status: payload.status,
        sortOrder: payload.sortOrder,
        description: payload.description,
        importance: payload.importance,
        reasonableAssurance: payload.reasonableAssurance,
        effectiveDate: payload.effectiveDate,
        documentsCount: payload.documentsCount ?? 0,
        assertions: payload.assertions ?? DEFAULT_ASSERTIONS,
        objectives: payload.objectives ?? [],
        accountRanges: payload.accountRanges ?? [],
        risks: payload.risks ?? [],
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

function updateEntity(
    current: AccountGroupNode,
    patch: AccountGroupNodeUpdate,
): AccountGroupNode {
    return {
        ...current,
        ...patch,
        parentId: patch.parentId === undefined ? current.parentId : patch.parentId,
        updatedAt: nowIso(),
        updatedBy: LOCAL_USER,
    };
}

function findIndexById(items: AccountGroupNode[], id: string): number {
    return items.findIndex((item) => item.id === id);
}

function getRequiredById(items: AccountGroupNode[], id: string): AccountGroupNode {
    const entity = items.find((item) => item.id === id);

    if (!entity) {
        throw new Error("NOT_FOUND");
    }

    return entity;
}

function replaceById(
    items: AccountGroupNode[],
    id: string,
    patch: AccountGroupNodeUpdate,
): AccountGroupNode {
    const index = findIndexById(items, id);

    if (index < 0) {
        throw new Error("NOT_FOUND");
    }

    const updated = updateEntity(items[index], patch);
    items[index] = updated;

    return updated;
}

function assertParentExists(
    items: AccountGroupNode[],
    parentId: string | null | undefined,
): void {
    if (!parentId) {
        return;
    }

    getRequiredById(items, parentId);
}

export class AccountGroupStorageRepo implements AccountGroupRepo {
    async list(): Promise<AccountGroupNode[]> {
        return readStorage();
    }

    async getById(id: string): Promise<AccountGroupNode | null> {
        const items = readStorage();
        return items.find((item) => item.id === id) ?? null;
    }

    async create(payload: AccountGroupNodeCreate): Promise<AccountGroupNode> {
        const items = readStorage();
        assertParentExists(items, payload.parentId);

        const entity = buildCreatedEntity(payload);
        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(
        id: string,
        payload: AccountGroupNodeUpdate,
    ): Promise<AccountGroupNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);
        const candidate = updateEntity(current, payload);

        if (candidate.parentId === candidate.id) {
            throw new Error("INVALID_HIERARCHY");
        }

        assertParentExists(
            items.filter((item) => item.id !== id),
            candidate.parentId,
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

    async getChildren(parentId: string | null = null): Promise<AccountGroupNode[]> {
        const items = readStorage();
        return items.filter((item) => (item.parentId ?? null) === parentId);
    }

    async toggleStatus(id: string): Promise<AccountGroupNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);

        const updated = replaceById(items, id, {
            status: current.status === "active" ? "inactive" : "active",
        });

        writeStorage(items);

        return updated;
    }
}
