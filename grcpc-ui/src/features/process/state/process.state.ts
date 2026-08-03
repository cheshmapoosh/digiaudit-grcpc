import { create } from "zustand";
import type {
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
    ProcessMoveCommand,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
} from "../domain/process.model";
import { processService } from "../service/process.service";

export const ROOT_PARENT = "ROOT_PARENT";

interface ProcessState {
    nodesById: Record<string, ProcessNode>;
    childrenByParent: Record<string, ProcessNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(payload: ProcessNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    updateNode(
        node: ProcessNode,
        payload: ProcessNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse>;
    moveNode(
        node: ProcessNode,
        payload: ProcessMoveCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    activateNode(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    inactivateNode(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    removeNode(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    restoreNode(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    refresh(): Promise<void>;
    reset(): void;
}

function toParentKey(parentId?: string | null): string {
    return parentId ?? ROOT_PARENT;
}

function buildIndexes(nodes: ProcessNode[]) {
    const nodesById: Record<string, ProcessNode> = {};
    const childrenByParent: Record<string, ProcessNode[]> = {};

    nodes.forEach((node) => {
        nodesById[node.id] = node;

        const key = toParentKey(node.parentId);
        const currentChildren = childrenByParent[key] ?? [];
        childrenByParent[key] = [...currentChildren, node];
    });

    return { nodesById, childrenByParent };
}

async function reloadIndexes() {
    const allNodes = await processService.list();
    return buildIndexes(allNodes);
}

type ProcessSetState = (
    partial: Partial<ProcessState> | ((state: ProcessState) => Partial<ProcessState>),
) => void;

async function refreshAfterMutation(set: ProcessSetState): Promise<void> {
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
        console.warn("Process refresh after mutation failed", error);
    }
}

export const useProcessState = create<ProcessState>((set) => ({
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
            const result = await processService.create(payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async updateNode(node, payload) {
        set({ loading: true });

        try {
            const result = await processService.update(node, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async moveNode(node, payload) {
        set({ loading: true });

        try {
            const result = await processService.move(node, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async activateNode(node, payload) {
        set({ loading: true });

        try {
            const result = await processService.activate(node, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async inactivateNode(node, payload) {
        set({ loading: true });

        try {
            const result = await processService.inactivate(node, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async removeNode(node, payload) {
        set({ loading: true });

        try {
            const result = await processService.delete(node, payload);
            await refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async restoreNode(node, payload) {
        set({ loading: true });

        try {
            const result = await processService.restore(node, payload);
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
