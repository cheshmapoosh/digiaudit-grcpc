// src/features/process/service/process.service.ts
import type { ProcessNode } from "../model/process.types";
import { processStorage } from "./process.storage";
import { isDescendant, recomputeDepthAndPath } from "./process.tree";

function nowIso() {
    return new Date().toISOString();
}

function uuid() {
    // برای MVP: ساده. اگر lib داری (nanoid/uuid) بهتره.
    return crypto.randomUUID();
}

function nextOrder(nodes: ProcessNode[], parentId: string | null): number {
    const siblings = nodes.filter((n) => (n.parentId ?? null) === parentId);
    const max = siblings.reduce((m, n) => Math.max(m, n.order ?? 0), -1);
    return max + 1;
}

export interface ProcessService {
    getChildren(parentId: string | null): Promise<ProcessNode[]>;
    getById(id: string): Promise<ProcessNode | undefined>;

    create(input: {
        parentId: string | null;
        title: string;
        code?: string;
        description?: string;
        status: ProcessNode["status"];
    }): Promise<ProcessNode>;

    update(id: string, patch: Partial<Omit<ProcessNode, "id">>): Promise<ProcessNode>;

    move(id: string, payload: { newParentId: string | null; newOrder?: number }): Promise<ProcessNode>;

    toggleStatus(id: string): Promise<ProcessNode>;
    delete(id: string, opts?: { cascade?: boolean }): Promise<void>;
}

export const processService: ProcessService = {
    async getChildren(parentId) {
        const nodes = processStorage.load();
        return nodes
            .filter((n) => (n.parentId ?? null) === parentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },

    async getById(id) {
        const nodes = processStorage.load();
        return nodes.find((n) => n.id === id);
    },

    async create(input) {
        const nodes = processStorage.load();

        const node: ProcessNode = {
            id: uuid(),
            parentId: input.parentId,
            title: input.title,
            code: input.code,
            description: input.description,
            status: input.status ?? "ACTIVE",
            order: nextOrder(nodes, input.parentId),
            createdAt: nowIso(),
            updatedAt: nowIso(),
        };

        const updated = recomputeDepthAndPath([...nodes, node]);
        processStorage.save(updated);
        return updated.find((n) => n.id === node.id)!;
    },

    async update(id, patch) {
        const nodes = processStorage.load();
        const idx = nodes.findIndex((n) => n.id === id);
        if (idx < 0) throw new Error("Node not found");

        const next: ProcessNode = {
            ...nodes[idx],
            ...patch,
            id,
            updatedAt: nowIso(),
        };

        const updated = recomputeDepthAndPath(nodes.map((n) => (n.id === id ? next : n)));
        processStorage.save(updated);
        return updated.find((n) => n.id === id)!;
    },

    async move(id, payload) {
        const nodes = processStorage.load();
        const byId: Record<string, ProcessNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
        const node = byId[id];
        if (!node) throw new Error("Node not found");

        const newParentId = payload.newParentId ?? null;

        if (newParentId === id) throw new Error("Parent cannot be the node itself");

        if (newParentId && isDescendant(byId, id, newParentId)) {
            // یعنی داری node رو می‌بری زیر یکی از فرزندان خودش => cycle
            throw new Error("Cannot move a node under its own descendant");
        }

        const newOrder =
            payload.newOrder != null ? payload.newOrder : nextOrder(nodes.filter((n) => n.id !== id), newParentId);

        const moved: ProcessNode = {
            ...node,
            parentId: newParentId,
            order: newOrder,
            updatedAt: nowIso(),
        };

        const updated = recomputeDepthAndPath(nodes.map((n) => (n.id === id ? moved : n)));
        processStorage.save(updated);
        return updated.find((n) => n.id === id)!;
    },

    async toggleStatus(id) {
        const node = await this.getById(id);
        if (!node) throw new Error("Node not found");
        return this.update(id, { status: node.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
    },

    async delete(id, opts) {
        const nodes = processStorage.load();
        const byId: Record<string, ProcessNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
        if (!byId[id]) return;

        const cascade = opts?.cascade ?? false;

        if (!cascade) {
            const hasChild = nodes.some((n) => n.parentId === id);
            if (hasChild) throw new Error("Node has children. Use cascade delete.");
            processStorage.save(nodes.filter((n) => n.id !== id));
            return;
        }

        // cascade: delete subtree
        const toDelete = new Set<string>();
        const stack = [id];

        while (stack.length) {
            const cur = stack.pop()!;
            if (toDelete.has(cur)) continue;
            toDelete.add(cur);

            for (const n of nodes) {
                if (n.parentId === cur) stack.push(n.id);
            }
        }

        const remaining = nodes.filter((n) => !toDelete.has(n.id));
        const updated = recomputeDepthAndPath(remaining);
        processStorage.save(updated);
    },
};
