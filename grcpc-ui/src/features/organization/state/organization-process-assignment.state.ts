import { create } from "zustand";
import type {
    OrganizationProcessAssignment,
    OrganizationProcessAssignmentCreate,
} from "../domain/organization-process-assignment.model";
import { createOrganizationProcessAssignmentRepo } from "../infra/organization-process-assignment.factory";

interface OrganizationProcessAssignmentState {
    assignmentsByOrganizationId: Record<string, OrganizationProcessAssignment[]>;
    loading: boolean;

    loadForOrganization(organizationId: string): Promise<void>;
    assignSubProcess(
        payload: OrganizationProcessAssignmentCreate,
    ): Promise<OrganizationProcessAssignment>;
    removeAssignment(organizationId: string, assignmentId: string): Promise<void>;
    reset(): void;
}

const organizationProcessAssignmentRepo =
    createOrganizationProcessAssignmentRepo();

export const useOrganizationProcessAssignmentState =
    create<OrganizationProcessAssignmentState>((set) => ({
        assignmentsByOrganizationId: {},
        loading: false,

        async loadForOrganization(organizationId) {
            set({ loading: true });

            try {
                const assignments =
                    await organizationProcessAssignmentRepo.listByOrganization(
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

        async assignSubProcess(payload) {
            set({ loading: true });

            try {
                const created =
                    await organizationProcessAssignmentRepo.create(payload);
                const assignments =
                    await organizationProcessAssignmentRepo.listByOrganization(
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
                await organizationProcessAssignmentRepo.remove(assignmentId);
                const assignments =
                    await organizationProcessAssignmentRepo.listByOrganization(
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
