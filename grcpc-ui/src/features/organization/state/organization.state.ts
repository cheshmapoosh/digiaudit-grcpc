import { create } from "zustand";
import type {
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
    OrganizationMoveCommand,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "../domain/organization.model";
import { organizationService } from "../service/organization.service";

export const ROOT_PARENT = "ROOT_PARENT";

interface OrganizationState {
    nodesById: Record<string, OrganizationNode>;
    childrenByParent: Record<string, OrganizationNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(
        payload: OrganizationNodeCreate,
    ): Promise<MasterDataRevisionMutationResponse>;
    updateNode(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse>;
    moveNode(
        id: string,
        payload: OrganizationMoveCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    activateNode(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    inactivateNode(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    removeNode(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    restoreNode(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    refresh(): Promise<void>;
    reset(): void;
}

function toParentKey(parentOrganizationId?: string | null): string {
    return parentOrganizationId ?? ROOT_PARENT;
}

function buildIndexes(nodes: OrganizationNode[]) {
    const nodesById: Record<string, OrganizationNode> = {};
    const childrenByParent: Record<string, OrganizationNode[]> = {};

    nodes.forEach((node) => {
        nodesById[node.id] = node;

        const key = toParentKey(node.parentOrganizationId);
        const currentChildren = childrenByParent[key] ?? [];
        childrenByParent[key] = [...currentChildren, node];
    });

    return { nodesById, childrenByParent };
}

async function reloadIndexes() {
    const allNodes = await organizationService.list();
    return buildIndexes(allNodes);
}

type OrganizationSetState = (
    partial:
        | Partial<OrganizationState>
        | ((state: OrganizationState) => Partial<OrganizationState>),
) => void;

async function refreshAfterMutation(set: OrganizationSetState): Promise<void> {
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
    } catch (error) {
        console.warn("Organization refresh after mutation failed", error);
    }
}

export const useOrganizationState = create<OrganizationState>((set) => ({
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

    async createNode(payload) {
        set({ loading: true });

        try {
            const result = await organizationService.create(payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async updateNode(id, payload) {
        set({ loading: true });

        try {
            const result = await organizationService.update(id, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async moveNode(id, payload) {
        set({ loading: true });

        try {
            const result = await organizationService.move(id, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async activateNode(id, payload) {
        set({ loading: true });

        try {
            const result = await organizationService.activate(id, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async inactivateNode(id, payload) {
        set({ loading: true });

        try {
            const result = await organizationService.inactivate(id, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async removeNode(id, payload) {
        set({ loading: true });

        try {
            const result = await organizationService.delete(id, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async restoreNode(id, payload) {
        set({ loading: true });

        try {
            const result = await organizationService.restore(id, payload);
            await refreshAfterMutation(set);
            return result;
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
