import { create } from "zustand";
import type {
    OrganizationControlView,
    OrganizationRiskAssignment,
    OrganizationRiskAssignmentCreate,
} from "../domain/organization-process-assignment.model";
import { createOrganizationProcessRelationshipRepo } from "../infra/organization-process-relationship.factory";

interface OrganizationProcessRelationshipState {
    controlsByOrganizationId: Record<string, OrganizationControlView[]>;
    risksByOrganizationId: Record<string, OrganizationRiskAssignment[]>;
    loading: boolean;

    loadControlsForOrganization(organizationId: string): Promise<void>;
    loadRisksForOrganization(organizationId: string): Promise<void>;
    assignRisk(payload: OrganizationRiskAssignmentCreate): Promise<OrganizationRiskAssignment>;
    removeRiskAssignment(organizationId: string, assignmentId: string): Promise<void>;
    reset(): void;
}

const relationshipRepo = createOrganizationProcessRelationshipRepo();

export const useOrganizationProcessRelationshipState =
    create<OrganizationProcessRelationshipState>((set) => ({
        controlsByOrganizationId: {},
        risksByOrganizationId: {},
        loading: false,

        async loadControlsForOrganization(organizationId) {
            set({ loading: true });

            try {
                const controls =
                    await relationshipRepo.listControlsByOrganization(organizationId);

                set((state) => ({
                    controlsByOrganizationId: {
                        ...state.controlsByOrganizationId,
                        [organizationId]: controls,
                    },
                }));
            } finally {
                set({ loading: false });
            }
        },

        async loadRisksForOrganization(organizationId) {
            set({ loading: true });

            try {
                const risks =
                    await relationshipRepo.listRisksByOrganization(organizationId);

                set((state) => ({
                    risksByOrganizationId: {
                        ...state.risksByOrganizationId,
                        [organizationId]: risks,
                    },
                }));
            } finally {
                set({ loading: false });
            }
        },

        async assignRisk(payload) {
            set({ loading: true });

            try {
                const created = await relationshipRepo.assignRisk(payload);
                const [controls, risks] = await Promise.all([
                    relationshipRepo.listControlsByOrganization(payload.organizationId),
                    relationshipRepo.listRisksByOrganization(payload.organizationId),
                ]);

                set((state) => ({
                    controlsByOrganizationId: {
                        ...state.controlsByOrganizationId,
                        [payload.organizationId]: controls,
                    },
                    risksByOrganizationId: {
                        ...state.risksByOrganizationId,
                        [payload.organizationId]: risks,
                    },
                }));

                return created;
            } finally {
                set({ loading: false });
            }
        },

        async removeRiskAssignment(organizationId, assignmentId) {
            set({ loading: true });

            try {
                await relationshipRepo.removeRiskAssignment(assignmentId);
                const risks =
                    await relationshipRepo.listRisksByOrganization(organizationId);

                set((state) => ({
                    risksByOrganizationId: {
                        ...state.risksByOrganizationId,
                        [organizationId]: risks,
                    },
                }));
            } finally {
                set({ loading: false });
            }
        },

        reset() {
            set({
                controlsByOrganizationId: {},
                risksByOrganizationId: {},
                loading: false,
            });
        },
    }));
