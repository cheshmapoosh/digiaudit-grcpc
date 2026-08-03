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
import { sortProcesses } from "../utils/process.tree";

export const ROOT_PARENT = "ROOT_PARENT";

interface ProcessState {
    nodesById: Record<string, ProcessNode>;
    deletedNodesById: Record<string, ProcessNode>;
    childrenByParent: Record<string, ProcessNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;
    deletedLoading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    loadDeleted(): Promise<void>;
    createNode(payload: ProcessNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    updateNode(node: ProcessNode, payload: ProcessNodeUpdate): Promise<MasterDataRevisionMutationResponse>;
    moveNode(node: ProcessNode, payload: ProcessMoveCommand): Promise<MasterDataRevisionMutationResponse>;
    activateNode(node: ProcessNode, payload: ProcessLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    inactivateNode(node: ProcessNode, payload: ProcessLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    removeNode(node: ProcessNode, payload: ProcessLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    restoreNode(node: ProcessNode, payload: ProcessLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    refresh(): Promise<void>;
    reset(): void;
}

function buildIndexes(nodes: ProcessNode[]) {
    const nodesById: Record<string, ProcessNode> = {};
    const childrenByParent: Record<string, ProcessNode[]> = {};

    sortProcesses(nodes).forEach((node) => {
        nodesById[node.id] = node;
        const key = node.parentId ?? ROOT_PARENT;
        childrenByParent[key] = [...(childrenByParent[key] ?? []), node];
    });

    return { nodesById, childrenByParent };
}

function indexDeleted(nodes: ProcessNode[]): Record<string, ProcessNode> {
    return Object.fromEntries(sortProcesses(nodes).map((node) => [node.id, node]));
}

type ProcessSetState = (
    partial: Partial<ProcessState> | ((state: ProcessState) => Partial<ProcessState>),
) => void;

async function reloadIndexes() {
    return buildIndexes(await processService.list());
}

async function refreshAfterMutation(set: ProcessSetState): Promise<void> {
    try {
        const indexes = await reloadIndexes();
        set((state) => ({
            ...indexes,
            loadedChildren: { ...state.loadedChildren, [ROOT_PARENT]: true },
        }));
    } catch (error) {
        console.warn("Process refresh after mutation failed", error);
    }
}

function withActiveNodes(
    state: ProcessState,
    nodesById: Record<string, ProcessNode>,
): Partial<ProcessState> {
    return {
        ...buildIndexes(Object.values(nodesById)),
        loadedChildren: { ...state.loadedChildren, [ROOT_PARENT]: true },
    };
}

export const useProcessState = create<ProcessState>((set) => ({
    nodesById: {},
    deletedNodesById: {},
    childrenByParent: {},
    loadedChildren: {},
    loading: false,
    deletedLoading: false,

    async refresh() {
        set({ loading: true });
        try {
            const indexes = await reloadIndexes();
            set((state) => ({
                ...indexes,
                loadedChildren: { ...state.loadedChildren, [ROOT_PARENT]: true },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async loadChildren(parentId = ROOT_PARENT) {
        set({ loading: true });
        try {
            const indexes = await reloadIndexes();
            set((state) => ({
                ...indexes,
                loadedChildren: { ...state.loadedChildren, [parentId]: true },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async loadDeleted() {
        set({ deletedLoading: true });
        try {
            set({ deletedNodesById: indexDeleted(await processService.listDeleted()) });
        } finally {
            set({ deletedLoading: false });
        }
    },

    async createNode(payload) {
        set({ loading: true });
        try {
            const result = await processService.create(payload);
            const confirmed: ProcessNode = {
                id: result.entityId,
                nodeType: payload.nodeType,
                code: payload.code.trim().toLocaleUpperCase("en-US"),
                title: payload.title.trim(),
                parentId: payload.parentId ?? null,
                description: payload.description ?? null,
                sortOrder: payload.sortOrder ?? 0,
                status: "ACTIVE",
                validFrom: payload.validFrom ?? null,
                validTo: payload.validTo ?? null,
                version: result.version,
            };
            set((state) => ({
                ...withActiveNodes(state, { ...state.nodesById, [confirmed.id]: confirmed }),
                deletedNodesById: Object.fromEntries(
                    Object.entries(state.deletedNodesById).filter(([id]) => id !== confirmed.id),
                ),
            }));
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async updateNode(node, payload) {
        set({ loading: true });
        try {
            const result = await processService.update(node, payload);
            set((state) => {
                const current = state.nodesById[node.id] ?? node;
                return withActiveNodes(state, {
                    ...state.nodesById,
                    [node.id]: {
                        ...current,
                        title: payload.title.trim(),
                        description: payload.description ?? null,
                        sortOrder: payload.sortOrder ?? 0,
                        validFrom: payload.validFrom ?? null,
                        validTo: payload.validTo ?? null,
                        version: result.version,
                    },
                });
            });
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async moveNode(node, payload) {
        set({ loading: true });
        try {
            const result = await processService.move(node, payload);
            set((state) => {
                const current = state.nodesById[node.id] ?? node;
                return withActiveNodes(state, {
                    ...state.nodesById,
                    [node.id]: {
                        ...current,
                        parentId: payload.parentId ?? null,
                        version: result.version,
                    },
                });
            });
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async activateNode(node, payload) {
        set({ loading: true });
        try {
            const result = await processService.activate(node, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [node.id]: { ...(state.nodesById[node.id] ?? node), status: "ACTIVE", version: result.version },
            }));
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async inactivateNode(node, payload) {
        set({ loading: true });
        try {
            const result = await processService.inactivate(node, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [node.id]: { ...(state.nodesById[node.id] ?? node), status: "INACTIVE", version: result.version },
            }));
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async removeNode(node, payload) {
        set({ loading: true });
        try {
            const result = await processService.delete(node, payload);
            set((state) => {
                const active = { ...state.nodesById };
                delete active[node.id];
                return {
                    ...withActiveNodes(state, active),
                    deletedNodesById: {
                        ...state.deletedNodesById,
                        [node.id]: { ...node, status: "DELETED", version: result.version },
                    },
                };
            });
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async restoreNode(node, payload) {
        set({ loading: true });
        try {
            const result = await processService.restore(node, payload);
            const restored = { ...node, status: "ACTIVE" as const, version: result.version };
            set((state) => ({
                ...withActiveNodes(state, { ...state.nodesById, [node.id]: restored }),
                deletedNodesById: Object.fromEntries(
                    Object.entries(state.deletedNodesById).filter(([id]) => id !== node.id),
                ),
            }));
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    reset() {
        set({
            nodesById: {},
            deletedNodesById: {},
            childrenByParent: {},
            loadedChildren: {},
            loading: false,
            deletedLoading: false,
        });
    },
}));
