import { create } from "zustand";
import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
} from "@/features/regulation";
import { regulationService } from "@/features/regulation";

export const ROOT_PARENT = "ROOT_PARENT";

interface RegulationState {
    nodesById: Record<string, RegulationNode>;
    childrenByParent: Record<string, RegulationNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(
        parentId: string | null,
        payload: RegulationNodeCreate,
    ): Promise<RegulationNode>;
    updateNode(id: string, payload: RegulationNodeUpdate): Promise<void>;
    removeNode(id: string): Promise<void>;
    toggleStatus(id: string): Promise<void>;
    refresh(): Promise<void>;
    reset(): void;
}

function toParentKey(parentId?: string | null): string {
    return parentId ?? ROOT_PARENT;
}

function buildIndexes(nodes: RegulationNode[]) {
    const nodesById: Record<string, RegulationNode> = {};
    const childrenByParent: Record<string, RegulationNode[]> = {};

    nodes.forEach((node) => {
        nodesById[node.id] = node;

        const key = toParentKey(node.parentId);
        const currentChildren = childrenByParent[key] ?? [];
        childrenByParent[key] = [...currentChildren, node];
    });

    return { nodesById, childrenByParent };
}

export const useRegulationStore = create<RegulationState>((set) => ({
    nodesById: {},
    childrenByParent: {},
    loadedChildren: {},
    loading: false,

    async refresh() {
        set({ loading: true });

        try {
            const allNodes = await regulationService.list();
            const { nodesById, childrenByParent } = buildIndexes(allNodes);

            set((state) => ({
                nodesById,
                childrenByParent,
                loadedChildren: {
                    ...state.loadedChildren,
                    [ROOT_PARENT]: true,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async loadChildren(parentId = ROOT_PARENT) {
        set({ loading: true });

        try {
            const allNodes = await regulationService.list();
            const { nodesById, childrenByParent } = buildIndexes(allNodes);

            set((state) => ({
                nodesById,
                childrenByParent,
                loadedChildren: {
                    ...state.loadedChildren,
                    [parentId]: true,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async createNode(parentId, payload) {
        set({ loading: true });

        try {
            const createdNode = await regulationService.create({
                ...payload,
                parentId: parentId === ROOT_PARENT ? null : parentId,
            });

            const allNodes = await regulationService.list();
            const { nodesById, childrenByParent } = buildIndexes(allNodes);

            set((state) => ({
                nodesById,
                childrenByParent,
                loadedChildren: {
                    ...state.loadedChildren,
                    [toParentKey(parentId)]: true,
                },
            }));

            return createdNode;
        } finally {
            set({ loading: false });
        }
    },

    async updateNode(id, payload) {
        set({ loading: true });

        try {
            await regulationService.update(id, payload);

            const allNodes = await regulationService.list();
            const { nodesById, childrenByParent } = buildIndexes(allNodes);

            set((state) => ({
                nodesById,
                childrenByParent,
                loadedChildren: {
                    ...state.loadedChildren,
                    [ROOT_PARENT]: true,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async removeNode(id) {
        set({ loading: true });

        try {
            await regulationService.remove(id);

            const allNodes = await regulationService.list();
            const { nodesById, childrenByParent } = buildIndexes(allNodes);

            set((state) => ({
                nodesById,
                childrenByParent,
                loadedChildren: {
                    ...state.loadedChildren,
                    [ROOT_PARENT]: true,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async toggleStatus(id) {
        set({ loading: true });

        try {
            await regulationService.toggleStatus(id);

            const allNodes = await regulationService.list();
            const { nodesById, childrenByParent } = buildIndexes(allNodes);

            set((state) => ({
                nodesById,
                childrenByParent,
                loadedChildren: {
                    ...state.loadedChildren,
                    [ROOT_PARENT]: true,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    reset() {
        set({
            nodesById: {},
            childrenByParent: {},
            loadedChildren: {},
            loading: false,
        });
    },
}));