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
import { sortOrganizations } from "../utils/organization.tree";

export const ROOT_PARENT = "ROOT_PARENT";

interface OrganizationState {
    nodesById: Record<string, OrganizationNode>;
    deletedNodesById: Record<string, OrganizationNode>;
    childrenByParent: Record<string, OrganizationNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;
    deletedLoading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    loadDeleted(): Promise<void>;
    createNode(payload: OrganizationNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    updateNode(id: string, payload: OrganizationNodeUpdate): Promise<MasterDataRevisionMutationResponse>;
    moveNode(id: string, payload: OrganizationMoveCommand): Promise<MasterDataRevisionMutationResponse>;
    activateNode(id: string, payload: OrganizationLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    inactivateNode(id: string, payload: OrganizationLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    removeNode(id: string, payload: OrganizationLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    restoreNode(node: OrganizationNode, payload: OrganizationLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    refresh(): Promise<void>;
    reset(): void;
}

type OrganizationSetState = (
    partial: Partial<OrganizationState> | ((state: OrganizationState) => Partial<OrganizationState>),
) => void;

let stateGeneration = 0;
let activeReadSequence = 0;
let deletedReadSequence = 0;
let activeLoadingCount = 0;
let activeLoadingEpoch = 0;
let deletedLoadingCount = 0;
let deletedLoadingEpoch = 0;

function buildIndexes(nodes: OrganizationNode[]) {
    const nodesById: Record<string, OrganizationNode> = {};
    const childrenByParent: Record<string, OrganizationNode[]> = {};

    sortOrganizations(nodes).forEach((node) => {
        nodesById[node.id] = node;
        const key = node.parentOrganizationId ?? ROOT_PARENT;
        childrenByParent[key] = [...(childrenByParent[key] ?? []), node];
    });

    return { nodesById, childrenByParent };
}

function indexDeleted(nodes: OrganizationNode[]): Record<string, OrganizationNode> {
    return Object.fromEntries(sortOrganizations(nodes).map((node) => [node.id, node]));
}

function withActiveNodes(
    state: OrganizationState,
    nodesById: Record<string, OrganizationNode>,
): Partial<OrganizationState> {
    return {
        ...buildIndexes(Object.values(nodesById)),
        loadedChildren: { ...state.loadedChildren, [ROOT_PARENT]: true },
    };
}

function invalidateReads(): void {
    stateGeneration += 1;
}

function beginActiveLoading(set: OrganizationSetState): number {
    activeLoadingCount += 1;
    set({ loading: true });
    return activeLoadingEpoch;
}

function endActiveLoading(set: OrganizationSetState, epoch: number): void {
    if (epoch !== activeLoadingEpoch) return;
    activeLoadingCount = Math.max(0, activeLoadingCount - 1);
    set({ loading: activeLoadingCount > 0 });
}

function beginDeletedLoading(set: OrganizationSetState): number {
    deletedLoadingCount += 1;
    set({ deletedLoading: true });
    return deletedLoadingEpoch;
}

function endDeletedLoading(set: OrganizationSetState, epoch: number): void {
    if (epoch !== deletedLoadingEpoch) return;
    deletedLoadingCount = Math.max(0, deletedLoadingCount - 1);
    set({ deletedLoading: deletedLoadingCount > 0 });
}

async function runActiveRead(
    set: OrganizationSetState,
    parentId: string,
    blocking: boolean,
): Promise<void> {
    const capturedGeneration = stateGeneration;
    const requestSequence = ++activeReadSequence;
    const loadingEpoch = blocking ? beginActiveLoading(set) : null;
    try {
        const indexes = buildIndexes(await organizationService.list());
        if (capturedGeneration !== stateGeneration || requestSequence !== activeReadSequence) return;
        set((state) => ({
            ...indexes,
            loadedChildren: { ...state.loadedChildren, [parentId]: true },
        }));
    } finally {
        if (loadingEpoch !== null) endActiveLoading(set, loadingEpoch);
    }
}

async function runDeletedRead(set: OrganizationSetState): Promise<void> {
    const capturedGeneration = stateGeneration;
    const requestSequence = ++deletedReadSequence;
    const loadingEpoch = beginDeletedLoading(set);
    try {
        const deletedNodesById = indexDeleted(await organizationService.listDeleted());
        if (capturedGeneration !== stateGeneration || requestSequence !== deletedReadSequence) return;
        set({ deletedNodesById });
    } finally {
        endDeletedLoading(set, loadingEpoch);
    }
}

function refreshAfterMutation(set: OrganizationSetState): void {
    runActiveRead(set, ROOT_PARENT, false).catch((error: unknown) => {
        console.warn("Organization refresh after mutation failed", error);
    });
}

function beginMutation(set: OrganizationSetState): number {
    invalidateReads();
    return beginActiveLoading(set);
}

function completeMutation(set: OrganizationSetState): void {
    invalidateReads();
    refreshAfterMutation(set);
}

function failMutation(): void {
    invalidateReads();
}

function normalizeDate(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized || null;
}

export const useOrganizationState = create<OrganizationState>((set, get) => ({
    nodesById: {},
    deletedNodesById: {},
    childrenByParent: {},
    loadedChildren: {},
    loading: false,
    deletedLoading: false,

    async refresh() {
        await runActiveRead(set, ROOT_PARENT, true);
    },

    async loadChildren(parentId = ROOT_PARENT) {
        await runActiveRead(set, parentId, true);
    },

    async loadDeleted() {
        await runDeletedRead(set);
    },

    async createNode(payload) {
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.create(payload);
            const code = payload.code.trim().toLocaleUpperCase("en-US");
            const confirmed: OrganizationNode = {
                id: result.entityId,
                code,
                displayLabel: code,
                parentOrganizationId: payload.parentOrganizationId?.trim() || null,
                status: "ACTIVE",
                validFrom: normalizeDate(payload.validFrom),
                validTo: normalizeDate(payload.validTo),
                version: result.version,
                deletedAt: null,
                deletedBy: null,
            };
            set((state) => ({
                ...withActiveNodes(state, { ...state.nodesById, [confirmed.id]: confirmed }),
                deletedNodesById: Object.fromEntries(
                    Object.entries(state.deletedNodesById).filter(([id]) => id !== confirmed.id),
                ),
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

    async updateNode(id, payload) {
        const current = get().nodesById[id];
        if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.update(id, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [id]: {
                    ...current,
                    validFrom: normalizeDate(payload.validFrom),
                    validTo: normalizeDate(payload.validTo),
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

    async moveNode(id, payload) {
        const current = get().nodesById[id];
        if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.move(id, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [id]: {
                    ...current,
                    parentOrganizationId: payload.parentOrganizationId?.trim() || null,
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

    async activateNode(id, payload) {
        const current = get().nodesById[id];
        if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.activate(id, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [id]: { ...current, status: "ACTIVE", version: result.version },
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

    async inactivateNode(id, payload) {
        const current = get().nodesById[id];
        if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.inactivate(id, payload);
            set((state) => withActiveNodes(state, {
                ...state.nodesById,
                [id]: { ...current, status: "INACTIVE", version: result.version },
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

    async removeNode(id, payload) {
        const current = get().nodesById[id];
        if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.delete(id, payload);
            set((state) => {
                const active = { ...state.nodesById };
                delete active[id];
                return {
                    ...withActiveNodes(state, active),
                    deletedNodesById: {
                        ...state.deletedNodesById,
                        [id]: { ...current, status: "DELETED", version: result.version },
                    },
                };
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

    async restoreNode(node, payload) {
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.restore(node.id, payload);
            const restored: OrganizationNode = {
                ...node,
                status: "ACTIVE",
                version: result.version,
                deletedAt: null,
                deletedBy: null,
            };
            set((state) => ({
                ...withActiveNodes(state, { ...state.nodesById, [node.id]: restored }),
                deletedNodesById: Object.fromEntries(
                    Object.entries(state.deletedNodesById).filter(([id]) => id !== node.id),
                ),
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

    reset() {
        invalidateReads();
        activeReadSequence += 1;
        deletedReadSequence += 1;
        activeLoadingEpoch += 1;
        deletedLoadingEpoch += 1;
        activeLoadingCount = 0;
        deletedLoadingCount = 0;
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
