import { create } from "zustand";
import type { ProcessNode } from "../model/process.types";
import { parentKey, type ParentKey } from "../components/tree.utils";
import { processService } from "../service/process.service";

interface ProcessState {
    nodesById: Record<string, ProcessNode>;
    childrenByParent: Record<ParentKey, string[]>;
    loadedChildren: Record<ParentKey, boolean>;
    expanded: Record<string, boolean>;
    selectedId?: string;

    loadChildren: (parentId: string | null) => Promise<void>;
    toggleExpand: (id: string) => void;
    select: (id?: string) => void;

    // local state helpers
    upsertNode: (node: ProcessNode) => void;
    removeNode: (id: string) => void;

    // use-cases
    createNode: (payload: {
        parentId: string | null;
        title: string;
        code?: string;
        description?: string;
        status: ProcessNode["status"];
    }) => Promise<ProcessNode>;

    updateNode: (id: string, payload: Partial<Omit<ProcessNode, "id">>) => Promise<ProcessNode>;

    moveNode: (id: string, newParentId: string | null, newOrder?: number) => Promise<void>;

    toggleStatus: (id: string) => Promise<void>;

    // optional for later
    // deleteNode: (id: string, cascade?: boolean) => Promise<void>;
}

export const useProcessStore = create<ProcessState>((set, get) => ({
    nodesById: {},
    childrenByParent: {},
    loadedChildren: {},
    expanded: {},

    async loadChildren(parentId) {
        const key = parentKey(parentId);
        if (get().loadedChildren[key]) return;

        const children = await processService.getChildren(parentId);

        set((s) => {
            const nodesById = { ...s.nodesById };
            for (const n of children) nodesById[n.id] = n;

            const sortedIds = [...children]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((x) => x.id);

            return {
                nodesById,
                childrenByParent: { ...s.childrenByParent, [key]: sortedIds },
                loadedChildren: { ...s.loadedChildren, [key]: true },
            };
        });
    },

    toggleExpand(id) {
        set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } }));
    },

    select(id) {
        set({ selectedId: id });
    },

    upsertNode(node) {
        set((s) => {
            const nodesById = { ...s.nodesById, [node.id]: node };
            const key = parentKey(node.parentId);

            const existing = s.childrenByParent[key] ?? [];
            const withId = existing.includes(node.id) ? existing : [...existing, node.id];

            const sorted = [...withId].sort((a, b) => (nodesById[a].order ?? 0) - (nodesById[b].order ?? 0));
            return { nodesById, childrenByParent: { ...s.childrenByParent, [key]: sorted } };
        });
    },

    removeNode(id) {
        set((s) => {
            const node = s.nodesById[id];
            if (!node) return s;

            const nodesById = { ...s.nodesById };
            delete nodesById[id];

            const key = parentKey(node.parentId);
            const children = (s.childrenByParent[key] ?? []).filter((x) => x !== id);

            const expanded = { ...s.expanded };
            delete expanded[id];

            return {
                nodesById,
                childrenByParent: { ...s.childrenByParent, [key]: children },
                expanded,
                selectedId: s.selectedId === id ? undefined : s.selectedId,
            };
        });
    },

    async createNode(payload) {
        // ✅ call service
        const created = await processService.create(payload);

        // update local tree state
        get().upsertNode(created);

        // expand parent to show new child
        if (created.parentId) set((s) => ({ expanded: { ...s.expanded, [created.parentId!]: true } }));

        // mark children list as loaded (or keep it loaded)
        const pk = parentKey(created.parentId);
        set((s) => ({ loadedChildren: { ...s.loadedChildren, [pk]: true } }));

        return created;
    },

    async updateNode(id, payload) {
        // ✅ call service
        const updated = await processService.update(id, payload);
        get().upsertNode(updated);
        return updated;
    },

    async moveNode(id, newParentId, newOrder) {
        // ✅ call service
        const updated = await processService.move(id, { newParentId, newOrder });

        set((s) => {
            const old = s.nodesById[id];
            if (!old) return s;

            const nodesById = { ...s.nodesById, [id]: updated };

            const oldKey = parentKey(old.parentId);
            const newKey = parentKey(newParentId);

            const oldChildren = (s.childrenByParent[oldKey] ?? []).filter((x) => x !== id);
            const newChildrenBase = (s.childrenByParent[newKey] ?? []).filter((x) => x !== id);
            const newChildren = [...newChildrenBase, id].sort(
                (a, b) => (nodesById[a].order ?? 0) - (nodesById[b].order ?? 0)
            );

            return {
                nodesById,
                childrenByParent: { ...s.childrenByParent, [oldKey]: oldChildren, [newKey]: newChildren },
                expanded: newParentId ? { ...s.expanded, [newParentId]: true } : s.expanded,
            };
        });
    },

    async toggleStatus(id) {
        const updated = await processService.toggleStatus(id);
        get().upsertNode(updated);
    },
}));