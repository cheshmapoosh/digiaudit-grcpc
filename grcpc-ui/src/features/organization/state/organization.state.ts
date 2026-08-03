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

type OrganizationSetState = (
    partial: Partial<OrganizationState> | ((state: OrganizationState) => Partial<OrganizationState>),
) => void;

async function reloadIndexes() {
    return buildIndexes(await organizationService.list());
}

async function refreshAfterMutation(set: OrganizationSetState): Promise<void> {
    try {
        const indexes = await reloadIndexes();
        set((state) => ({
            ...indexes,
            loadedChildren: { ...state.loadedChildren, [ROOT_PARENT]: true },
        }));
    } catch (error) {
        console.warn("Organization refresh after mutation failed", error);
    }
}

function withActiveNodes(
    state: OrganizationState,
    nodesById: Record<string, OrganizationNode>,
): Partial<OrganizationState> {
    const indexes = buildIndexes(Object.values(nodesById));
    return {
        ...indexes,
        loadedChildren: { ...state.loadedChildren, [ROOT_PARENT]: true },
    };
}

export const useOrganizationState = create<OrganizationState>((set) => ({
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
            set({ deletedNodesById: indexDeleted(await organizationService.listDeleted()) });
        } finally {
            set({ deletedLoading: false });
        }
    },

    async createNode(payload) {
        set({ loading: true });
        try {
            const result = await organizationService.create(payload);
            const confirmed: OrganizationNode = {
                id: result.entityId,
                code: payload.code.trim().toLocaleUpperCase("en-US"),
                displayLabel: payload.code.trim().toLocaleUpperCase("en-US"),
                parentOrganizationId: payload.parentOrganizationId ?? null,
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

    async updateNode(id, payload) {
        set({ loading: true });
        try {
            const result = await organizationService.update(id, payload);
            set((state) => {
                const current = state.nodesById[id];
                if (!current) return {};
                return withActiveNodes(state, {
                    ...state.nodesById,
                    [id]: {
                        ...current,
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

    async moveNode(id, payload) {
        set({ loading: true });
        try {
            const result = await organizationService.move(id, payload);
            set((state) => {
                const current = state.nodesById[id];
                if (!current) return {};
                return withActiveNodes(state, {
                    ...state.nodesById,
                    [id]: {
                        ...current,
                        parentOrganizationId: payload.parentOrganizationId ?? null,
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

    async activateNode(id, payload) {
        set({ loading: true });
        try {
            const result = await organizationService.activate(id, payload);
            set((state) => {
                const current = state.nodesById[id];
                return current
                    ? withActiveNodes(state, {
                          ...state.nodesById,
                          [id]: { ...current, status: "ACTIVE", version: result.version },
                      })
                    : {};
            });
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async inactivateNode(id, payload) {
        set({ loading: true });
        try {
            const result = await organizationService.inactivate(id, payload);
            set((state) => {
                const current = state.nodesById[id];
                return current
                    ? withActiveNodes(state, {
                          ...state.nodesById,
                          [id]: { ...current, status: "INACTIVE", version: result.version },
                      })
                    : {};
            });
            void refreshAfterMutation(set);
            return result;
        } finally {
            set({ loading: false });
        }
    },

    async removeNode(id, payload) {
        set({ loading: true });
        try {
            const result = await organizationService.delete(id, payload);
            set((state) => {
                const current = state.nodesById[id];
                const active = { ...state.nodesById };
                delete active[id];
                return {
                    ...withActiveNodes(state, active),
                    deletedNodesById: current
                        ? {
                              ...state.deletedNodesById,
                              [id]: { ...current, status: "DELETED", version: result.version },
                          }
                        : state.deletedNodesById,
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
            const result = await organizationService.restore(node.id, payload);
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
