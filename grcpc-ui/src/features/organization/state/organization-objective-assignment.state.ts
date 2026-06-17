import { create } from "zustand";
import type {
    OrganizationObjectiveAssignment,
    OrganizationObjectiveAssignmentCreate,
} from "../domain/organization-objective-assignment.model";
import { createOrganizationObjectiveAssignmentRepo } from "../infra/organization-objective-assignment.factory";

interface OrganizationObjectiveAssignmentState {
    assignmentsByOrganizationId: Record<string, OrganizationObjectiveAssignment[]>;
    loading: boolean;

    loadForOrganization(organizationId: string): Promise<void>;
    assignObjective(
        payload: OrganizationObjectiveAssignmentCreate,
    ): Promise<OrganizationObjectiveAssignment>;
    removeAssignment(organizationId: string, assignmentId: string): Promise<void>;
    reset(): void;
}

const organizationObjectiveAssignmentRepo =
    createOrganizationObjectiveAssignmentRepo();

export const useOrganizationObjectiveAssignmentState =
    create<OrganizationObjectiveAssignmentState>((set) => ({
        assignmentsByOrganizationId: {},
        loading: false,

        async loadForOrganization(organizationId) {
            set({ loading: true });

            try {
                const assignments =
                    await organizationObjectiveAssignmentRepo.listByOrganization(
                        organizationId,
                    );

                set((state) => ({
                    assignmentsByOrganizationId: {
                        ...state.assignmentsByOrganizationId,
                        [organizationId]: assignments,
                    },
                }));
            } finally {
                set({ loading: false });
            }
        },

        async assignObjective(payload) {
            set({ loading: true });

            try {
                const created =
                    await organizationObjectiveAssignmentRepo.create(payload);
                const assignments =
                    await organizationObjectiveAssignmentRepo.listByOrganization(
                        payload.organizationId,
                    );

                set((state) => ({
                    assignmentsByOrganizationId: {
                        ...state.assignmentsByOrganizationId,
                        [payload.organizationId]: assignments,
                    },
                }));

                return created;
            } finally {
                set({ loading: false });
            }
        },

        async removeAssignment(organizationId, assignmentId) {
            set({ loading: true });

            try {
                await organizationObjectiveAssignmentRepo.remove(assignmentId);
                const assignments =
                    await organizationObjectiveAssignmentRepo.listByOrganization(
                        organizationId,
                    );

                set((state) => ({
                    assignmentsByOrganizationId: {
                        ...state.assignmentsByOrganizationId,
                        [organizationId]: assignments,
                    },
                }));
            } finally {
                set({ loading: false });
            }
        },

        reset() {
            set({
                assignmentsByOrganizationId: {},
                loading: false,
            });
        },
    }));
