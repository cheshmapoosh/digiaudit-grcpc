import { create } from "zustand";
import type {
    PolicyNode,
    PolicyNodeCreate,
    PolicyNodeUpdate,
} from "../domain/policy.model";
import { policyService } from "../service/policy.service";

export const ROOT_PARENT = "ROOT_PARENT";

interface PolicyState {
    nodesById: Record<string, PolicyNode>;
    childrenByParent: Record<string, PolicyNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(
        parentId: string | null,
        payload: PolicyNodeCreate,
    ): Promise<PolicyNode>;
    updateNode(id: string, payload: PolicyNodeUpdate): Promise<void>;
    removeNode(id: string): Promise<void>;
    toggleStatus(id: string): Promise<void>;
    refresh(): Promise<void>;
    reset(): void;
}

function toParentKey(parentId?: string | null): string {
    return parentId ?? ROOT_PARENT;
}

function buildIndexes(nodes: PolicyNode[]) {
    const nodesById: Record<string, PolicyNode> = {};
    const childrenByParent: Record<string, PolicyNode[]> = {};

    nodes.forEach((node) => {
        nodesById[node.id] = node;

        const key = toParentKey(node.parentId);
        const currentChildren = childrenByParent[key] ?? [];
        childrenByParent[key] = [...currentChildren, node];
    });

    return { nodesById, childrenByParent };
}

async function reloadIndexes() {
    const allNodes = await policyService.list();
    return buildIndexes(allNodes);
}

export const usePolicyState = create<PolicyState>((set) => ({
    nodesById: {},
    childrenByParent: {},
    loadedChildren: {},
    loading: false,

    async refresh() {
        set({ loading: true });

        try {
            const { nodesById, childrenByParent } = await reloadIndexes();

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
            const { nodesById, childrenByParent } = await reloadIndexes();

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
            const createdNode = await policyService.create({
                ...payload,
                parentId: parentId === ROOT_PARENT ? null : parentId,
            });

            const { nodesById, childrenByParent } = await reloadIndexes();

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
            await policyService.update(id, payload);

            const { nodesById, childrenByParent } = await reloadIndexes();

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
            await policyService.remove(id);

            const { nodesById, childrenByParent } = await reloadIndexes();

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
            await policyService.toggleStatus(id);

            const { nodesById, childrenByParent } = await reloadIndexes();

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
