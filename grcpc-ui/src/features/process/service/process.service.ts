// src/features/process/service/process.service.ts
import type {ProcessNode} from "../model/process.types";
import {processRepo} from "./process.repo.provider";
import {isDescendant, recomputeDepthAndPath} from "./process.tree";
import {ensureArray} from "../../../utils/array.utils";

function nowIso() {
    return new Date().toISOString();
}

function uuid() {
    // اگر randomUUID نبود fallback
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
        return (crypto as any).randomUUID();
    }
    return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nextOrder(nodes: ProcessNode[], parentId: string | null): number {
    const siblings = nodes.filter((n) => (n.parentId ?? null) === parentId);
    const max = siblings.reduce((m, n) => Math.max(m, n.order ?? 0), -1);
    return max + 1;
}

export interface ProcessService {
    list(): Promise<ProcessNode[]>;

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
    async list(): Promise<ProcessNode[]> {
        const nodes = ensureArray<ProcessNode>(await processRepo.listAll());
        return [...nodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },

    async getChildren(parentId) {
        const nodes = ensureArray<ProcessNode>(await processRepo.listAll());
        return nodes
            .filter((n) => (n.parentId ?? null) === parentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },

    async getById(id) {
        const nodes = ensureArray<ProcessNode>(await processRepo.listAll());
        return nodes.find((n) => n.id === id);
    },

    async create(input) {
        try {
            const nodes = ensureArray<ProcessNode>(await processRepo.listAll());

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
            await processRepo.saveAll(updated);

            return updated.find((n) => n.id === node.id)!;
        } catch (e) {
            console.error("[processService.create] failed", {input, error: e});
            throw e;
        }
    },

    async update(id, patch) {
        const nodes = ensureArray<ProcessNode>(await processRepo.listAll());
        const idx = nodes.findIndex((n) => n.id === id);
        if (idx < 0) throw new Error("Node not found");

        const next: ProcessNode = {
            ...nodes[idx],
            ...patch,
            id,
            updatedAt: nowIso(),
        };

        const updated = recomputeDepthAndPath(nodes.map((n) => (n.id === id ? next : n)));
        await processRepo.saveAll(updated);

        return updated.find((n) => n.id === id)!;
    },

    async move(id, payload) {
        const nodes = ensureArray<ProcessNode>(await processRepo.listAll());
        const byId: Record<string, ProcessNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
        const node = byId[id];
        if (!node) throw new Error("Node not found");

        const newParentId = payload.newParentId ?? null;
        if (newParentId === id) throw new Error("Parent cannot be the node itself");

        if (newParentId && isDescendant(byId, id, newParentId)) {
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
        await processRepo.saveAll(updated);

        return updated.find((n) => n.id === id)!;
    },

    async toggleStatus(id) {
        const node = await this.getById(id);
        if (!node) throw new Error("Node not found");
        return this.update(id, {status: node.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"});
    },

    async delete(id, opts) {
        const nodes = ensureArray<ProcessNode>(await processRepo.listAll());
        const byId: Record<string, ProcessNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
        if (!byId[id]) return;

        const cascade = opts?.cascade ?? false;

        if (!cascade) {
            const hasChild = nodes.some((n) => n.parentId === id);
            if (hasChild) throw new Error("Node has children. Use cascade delete.");
            await processRepo.saveAll(nodes.filter((n) => n.id !== id));
            return;
        }

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
        await processRepo.saveAll(updated);
    },
};