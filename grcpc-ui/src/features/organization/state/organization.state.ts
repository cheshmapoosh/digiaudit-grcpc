import { create } from "zustand";
import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";
import { organizationService } from "@/features/organization";

export const ROOT_PARENT = "ROOT_PARENT";

interface OrganizationState {
    nodesById: Record<string, OrganizationNode>;
    childrenByParent: Record<string, OrganizationNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(
        parentId: string | null,
        payload: OrganizationNodeCreate,
    ): Promise<OrganizationNode>;
    updateNode(id: string, payload: OrganizationNodeUpdate): Promise<void>;
    removeNode(id: string): Promise<void>;
    toggleStatus(id: string): Promise<void>;
    refresh(): Promise<void>;
    reset(): void;
}

function toParentKey(parentId?: string | null): string {
    return parentId ?? ROOT_PARENT;
}

function buildIndexes(nodes: OrganizationNode[]) {
    const nodesById: Record<string, OrganizationNode> = {};
    const childrenByParent: Record<string, OrganizationNode[]> = {};

    nodes.forEach((node) => {
        nodesById[node.id] = node;

        const key = toParentKey(node.parentId);
        const currentChildren = childrenByParent[key] ?? [];
        childrenByParent[key] = [...currentChildren, node];
    });

    return { nodesById, childrenByParent };
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
    nodesById: {},
    childrenByParent: {},
    loadedChildren: {},
    loading: false,

    async refresh() {
        set({ loading: true });

        try {
            const allNodes = await organizationService.list();
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
            const allNodes = await organizationService.list();
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
            const createdNode = await organizationService.create({
                ...payload,
                parentId: parentId === ROOT_PARENT ? null : parentId,
            });

            const allNodes = await organizationService.list();
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
            await organizationService.update(id, payload);

            const allNodes = await organizationService.list();
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
            await organizationService.remove(id);

            const allNodes = await organizationService.list();
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
            await organizationService.toggleStatus(id);

            const allNodes = await organizationService.list();
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