import { create } from "zustand";
import type {
    AccountGroupNode,
    AccountGroupNodeCreate,
    AccountGroupNodeUpdate,
} from "../domain/accountGroup.model";
import { accountGroupService } from "../service/accountGroup.service";

export const ROOT_PARENT = "ROOT_PARENT";

interface AccountGroupState {
    nodesById: Record<string, AccountGroupNode>;
    childrenByParent: Record<string, AccountGroupNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(
        parentId: string | null,
        payload: AccountGroupNodeCreate,
    ): Promise<AccountGroupNode>;
    updateNode(id: string, payload: AccountGroupNodeUpdate): Promise<void>;
    removeNode(id: string): Promise<void>;
    toggleStatus(id: string): Promise<void>;
    refresh(): Promise<void>;
    reset(): void;
}

function toParentKey(parentId?: string | null): string {
    return parentId ?? ROOT_PARENT;
}

function buildIndexes(nodes: AccountGroupNode[]) {
    const nodesById: Record<string, AccountGroupNode> = {};
    const childrenByParent: Record<string, AccountGroupNode[]> = {};

    nodes.forEach((node) => {
        nodesById[node.id] = node;

        const key = toParentKey(node.parentId);
        const currentChildren = childrenByParent[key] ?? [];
        childrenByParent[key] = [...currentChildren, node];
    });

    return { nodesById, childrenByParent };
}

async function reloadIndexes() {
    const allNodes = await accountGroupService.list();
    return buildIndexes(allNodes);
}

export const useAccountGroupState = create<AccountGroupState>((set) => ({
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
            const createdNode = await accountGroupService.create({
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
            await accountGroupService.update(id, payload);

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
            await accountGroupService.remove(id);

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
            await accountGroupService.toggleStatus(id);

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
