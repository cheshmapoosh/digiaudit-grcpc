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
    childrenByParent: Record<string, OrganizationNode[]>;
    loadedChildren: Record<string, boolean>;
    loading: boolean;

    loadChildren(parentId?: string): Promise<void>;
    createNode(payload: OrganizationNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    updateNode(id: string, payload: OrganizationNodeUpdate): Promise<MasterDataRevisionMutationResponse>;
    moveNode(id: string, payload: OrganizationMoveCommand): Promise<MasterDataRevisionMutationResponse>;
    removeNode(id: string, payload: OrganizationLifecycleCommand): Promise<MasterDataRevisionMutationResponse>;
    refresh(): Promise<void>;
    reset(): void;
}

type OrganizationSetState = (
    partial: Partial<OrganizationState> | ((state: OrganizationState) => Partial<OrganizationState>),
) => void;

let stateGeneration = 0;
let activeReadSequence = 0;
let activeLoadingCount = 0;
let activeLoadingEpoch = 0;

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

function normalizeOptional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized || null;
}

export const useOrganizationState = create<OrganizationState>((set, get) => ({
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
            const result = await organizationService.create(payload);
            const code = payload.code.trim().toLocaleUpperCase("en-US");
            const confirmed: OrganizationNode = {
                id: result.entityId,
                code,
                name: payload.name.trim(),
                organizationType: payload.organizationType,
                displayLabel: payload.name.trim(),
                parentOrganizationId: payload.parentOrganizationId?.trim() || null,
                status: "ACTIVE",
                location: normalizeOptional(payload.location),
                description: normalizeOptional(payload.description),
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
                    name: payload.name.trim(),
                    organizationType: payload.organizationType,
                    displayLabel: payload.name.trim(),
                    status: payload.status,
                    location: normalizeOptional(payload.location),
                    description: normalizeOptional(payload.description),
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

    async removeNode(id, payload) {
        const current = get().nodesById[id];
        if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
        const loadingEpoch = beginMutation(set);
        try {
            const result = await organizationService.delete(id, payload);
            set((state) => {
                const active = { ...state.nodesById };
                delete active[id];
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
