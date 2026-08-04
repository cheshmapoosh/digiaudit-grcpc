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
    childrenByParent: Record<string, ProcessNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(payload: ProcessNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    updateNode(node: ProcessNode, payload: ProcessNodeUpdate): Promise<MasterDataRevisionMutationResponse>;
    moveNode(node: ProcessNode, payload: ProcessMoveCommand): Promise<MasterDataRevisionMutationResponse>;
    removeNode(node: ProcessNode, payload: ProcessLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    refresh(): Promise<void>;
    reset(): void;
}

type ProcessSetState = (
    partial: Partial<ProcessState> | ((state: ProcessState) => Partial<ProcessState>),
) => void;

let stateGeneration = 0;
let activeReadSequence = 0;
let activeLoadingCount = 0;
let activeLoadingEpoch = 0;

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

function withActiveNodes(
    state: ProcessState,
    nodesById: Record<string, ProcessNode>,
): Partial<ProcessState> {
    return {
        ...buildIndexes(Object.values(nodesById)),
        loadedChildren: { ...state.loadedChildren, [ROOT_PARENT]: true },
    };
}

function invalidateReads(): void {
    stateGeneration += 1;
}

function beginActiveLoading(set: ProcessSetState): number {
    activeLoadingCount += 1;
    set({ loading: true });
    return activeLoadingEpoch;
}

function endActiveLoading(set: ProcessSetState, epoch: number): void {
    if (epoch !== activeLoadingEpoch) return;
    activeLoadingCount = Math.max(0, activeLoadingCount - 1);
    set({ loading: activeLoadingCount > 0 });
}

async function runActiveRead(
    set: ProcessSetState,
    parentId: string,
    blocking: boolean,
): Promise<void> {
    const capturedGeneration = stateGeneration;
    const requestSequence = ++activeReadSequence;
    const loadingEpoch = blocking ? beginActiveLoading(set) : null;
    try {
        const indexes = buildIndexes(await processService.list());
        if (capturedGeneration !== stateGeneration || requestSequence !== activeReadSequence) return;
        set((state) => ({
            ...indexes,
            loadedChildren: { ...state.loadedChildren, [parentId]: true },
        }));
    } finally {
        if (loadingEpoch !== null) endActiveLoading(set, loadingEpoch);
    }
}

function refreshAfterMutation(set: ProcessSetState): void {
    runActiveRead(set, ROOT_PARENT, false).catch((error: unknown) => {
        console.warn("Process refresh after mutation failed", error);
    });
}

function beginMutation(set: ProcessSetState): number {
    invalidateReads();
    return beginActiveLoading(set);
}

function completeMutation(set: ProcessSetState): void {
    invalidateReads();
    refreshAfterMutation(set);
}

function failMutation(): void {
    invalidateReads();
}

function normalizeOptional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized || null;
}

export const useProcessState = create<ProcessState>((set, get) => ({
    nodesById: {},
    childrenByParent: {},
    loadedChildren: {},
    loading: false,

    async refresh() {
        await runActiveRead(set, ROOT_PARENT, true);
    },

    async loadChildren(parentId = ROOT_PARENT) {
        await runActiveRead(set, parentId, true);
    },

    async createNode(payload) {
        const loadingEpoch = beginMutation(set);
        try {
            const result = await processService.create(payload);
            const confirmed: ProcessNode = {
                id: result.entityId,
                nodeType: payload.nodeType,
                code: payload.code.trim().toLocaleUpperCase("en-US"),
                title: payload.title.trim(),
                parentId: payload.parentId?.trim() || null,
                description: normalizeOptional(payload.description),
                sortOrder: payload.sortOrder ?? 0,
                status: "ACTIVE",
                validFrom: normalizeOptional(payload.validFrom),
                validTo: normalizeOptional(payload.validTo),
                version: result.version,
                deletedAt: null,
                deletedBy: null,
            };
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [confirmed.id]: confirmed,
            }));
            completeMutation(set);
            return result;
        } catch (error) {
            failMutation();
            throw error;
        } finally {
            endActiveLoading(set, loadingEpoch);
        }
    },

    async updateNode(node, payload) {
        const current = get().nodesById[node.id] ?? node;
        const loadingEpoch = beginMutation(set);
        try {
            const result = await processService.update(node, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [node.id]: {
                    ...current,
                    title: payload.title.trim(),
                    status: payload.status,
                    description: normalizeOptional(payload.description),
                    sortOrder: payload.sortOrder ?? 0,
                    validFrom: normalizeOptional(payload.validFrom),
                    validTo: normalizeOptional(payload.validTo),
                    version: result.version,
                },
            }));
            completeMutation(set);
            return result;
        } catch (error) {
            failMutation();
            throw error;
        } finally {
            endActiveLoading(set, loadingEpoch);
        }
    },

    async moveNode(node, payload) {
        const current = get().nodesById[node.id] ?? node;
        const loadingEpoch = beginMutation(set);
        try {
            const result = await processService.move(node, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [node.id]: {
                    ...current,
                    parentId: payload.parentId?.trim() || null,
                    version: result.version,
                },
            }));
            completeMutation(set);
            return result;
        } catch (error) {
            failMutation();
            throw error;
        } finally {
            endActiveLoading(set, loadingEpoch);
        }
    },

    async removeNode(node, payload) {
        const loadingEpoch = beginMutation(set);
        try {
            const result = await processService.delete(node, payload);
            set((state) => {
                const active = { ...state.nodesById };
                delete active[node.id];
                return withActiveNodes(state, active);
            });
            completeMutation(set);
            return result;
        } catch (error) {
            failMutation();
            throw error;
        } finally {
            endActiveLoading(set, loadingEpoch);
        }
    },

    reset() {
        invalidateReads();
        activeReadSequence += 1;
        activeLoadingEpoch += 1;
        activeLoadingCount = 0;
        set({
            nodesById: {},
            childrenByParent: {},
            loadedChildren: {},
            loading: false,
        });
    },
}));
