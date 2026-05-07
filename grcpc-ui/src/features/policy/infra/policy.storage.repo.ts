import { createId } from "@/shared/utils/id.utils";
import type {
    PolicyNode,
    PolicyNodeCreate,
    PolicyNodeUpdate,
} from "../domain/policy.model";
import type { PolicyRepo } from "./policy.repo";
import { canCreateChild } from "../utils/policy.tree";

const STORAGE_KEY = "grc:policies";
const LOCAL_USER = "local-user";

function nowIso(): string {
    return new Date().toISOString();
}

function buildSeedData(): PolicyNode[] {
    const now = nowIso();

    const base = {
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
            id: "polgrp-00",
            code: "00",
            title: "ساختار سیاست",
            nodeType: "policyGroup",
            parentId: null,
            status: "draft",
            sortOrder: 0,
            policyCategory: "it",
            documentsCount: 0,
            validFrom: "1404/01/01",
            validTo: "1404/12/29",
        },
        {
            ...base,
            id: "polgrp-01",
            code: "01",
            title: "سیاست داخلی",
            nodeType: "policyGroup",
            parentId: "polgrp-00",
            status: "draft",
            sortOrder: 1,
            policyCategory: "it",
            description: "گروه سیاست‌های داخلی سازمان.",
            documentsCount: 1,
            validFrom: "1404/01/01",
            validTo: "1404/12/29",
        },
        {
            ...base,
            id: "policy-01-01",
            code: "01-01",
            title: "سیاست خرید",
            nodeType: "policy",
            parentId: "polgrp-01",
            status: "draft",
            sortOrder: 1,
            policyCategory: "purchase",
            policyKind: "policy",
            ownerOrganization: "واحد خرید",
            creatorName: LOCAL_USER,
            version: "01",
            validFrom: "1404/01/01",
            validTo: "1404/12/29",
            nextReviewDate: "1404/09/30",
            communicationMethod: "announcement",
            communicationLanguage: "فارسی",
            objective: "ایجاد چارچوب یکپارچه برای خریدهای سازمانی.",
            documentsCount: 2,
        },
        {
            ...base,
            id: "polgrp-02",
            code: "02",
            title: "فناوری اطلاعات",
            nodeType: "policyGroup",
            parentId: "polgrp-00",
            status: "draft",
            sortOrder: 2,
            policyCategory: "it",
        },
    ];
}

function readStorage(): PolicyNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        const seedData = buildSeedData();
        writeStorage(seedData);
        return seedData;
    }

    try {
        const parsed = JSON.parse(raw) as PolicyNode[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: PolicyNode[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function buildCreatedEntity(payload: PolicyNodeCreate): PolicyNode {
    const now = nowIso();

    return {
        id: createId("policy"),
        code: payload.code,
        title: payload.title,
        nodeType: payload.nodeType,
        parentId: payload.parentId ?? null,
        status: payload.status,
        sortOrder: payload.sortOrder,
        description: payload.description,
        policyCategory: payload.policyCategory,
        policyKind: payload.policyKind,
        ownerId: payload.ownerId,
        ownerName: payload.ownerName,
        ownerOrganization: payload.ownerOrganization,
        creatorName: payload.creatorName,
        documentsCount: payload.documentsCount,
        version: payload.version,
        validFrom: payload.validFrom,
        validTo: payload.validTo,
        nextReviewDate: payload.nextReviewDate,
        communicationMethod: payload.communicationMethod,
        communicationLanguage: payload.communicationLanguage,
        objective: payload.objective,
        note: payload.note,
        evaluationConfirmed: payload.evaluationConfirmed,
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

function updateEntity(current: PolicyNode, patch: PolicyNodeUpdate): PolicyNode {
    return {
        ...current,
        ...patch,
        parentId: patch.parentId === undefined ? current.parentId : patch.parentId,
        updatedAt: nowIso(),
        updatedBy: LOCAL_USER,
    };
}

function findIndexById(items: PolicyNode[], id: string): number {
    return items.findIndex((item) => item.id === id);
}

function getRequiredById(items: PolicyNode[], id: string): PolicyNode {
    const entity = items.find((item) => item.id === id);

    if (!entity) {
        throw new Error("NOT_FOUND");
    }

    return entity;
}

function replaceById(
    items: PolicyNode[],
    id: string,
    patch: PolicyNodeUpdate,
): PolicyNode {
    const index = findIndexById(items, id);

    if (index < 0) {
        throw new Error("NOT_FOUND");
    }

    const updated = updateEntity(items[index], patch);
    items[index] = updated;

    return updated;
}

function assertHierarchy(items: PolicyNode[], entity: PolicyNodeCreate | PolicyNode): void {
    const parent = entity.parentId ? getRequiredById(items, entity.parentId) : null;
    const parentType = parent?.nodeType ?? null;

    if (!canCreateChild(parentType, entity.nodeType)) {
        throw new Error("INVALID_HIERARCHY");
    }
}

export class PolicyStorageRepo implements PolicyRepo {
    async list(): Promise<PolicyNode[]> {
        return readStorage();
    }

    async getById(id: string): Promise<PolicyNode | null> {
        const items = readStorage();
        return items.find((item) => item.id === id) ?? null;
    }

    async create(payload: PolicyNodeCreate): Promise<PolicyNode> {
        const items = readStorage();
        assertHierarchy(items, payload);

        const entity = buildCreatedEntity(payload);
        items.push(entity);
        writeStorage(items);

        return entity;
    }

    async update(id: string, payload: PolicyNodeUpdate): Promise<PolicyNode> {
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

    async getChildren(parentId: string | null = null): Promise<PolicyNode[]> {
        const items = readStorage();
        return items.filter((item) => (item.parentId ?? null) === parentId);
    }

    async toggleStatus(id: string): Promise<PolicyNode> {
        const items = readStorage();
        const current = getRequiredById(items, id);

        const updated = replaceById(items, id, {
            status: current.status === "inactive" ? "draft" : "inactive",
        });

        writeStorage(items);

        return updated;
    }
}
