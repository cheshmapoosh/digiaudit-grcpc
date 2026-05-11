import { create } from "zustand";
import type {
    OrganizationProcessAssignment,
    OrganizationProcessAssignmentCreate,
} from "../domain/organization-process-assignment.model";
import { organizationProcessAssignmentStorageRepo } from "../infra/organization-process-assignment.storage.repo";

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

function indexByOrganization(items: OrganizationProcessAssignment[]) {
    const assignmentsByOrganizationId: Record<string, OrganizationProcessAssignment[]> = {};

    items.forEach((item) => {
        const current = assignmentsByOrganizationId[item.organizationId] ?? [];
        assignmentsByOrganizationId[item.organizationId] = [...current, item];
    });

    return assignmentsByOrganizationId;
}

export const useOrganizationProcessAssignmentState =
    create<OrganizationProcessAssignmentState>((set) => ({
        assignmentsByOrganizationId: {},
        loading: false,

        async loadForOrganization(organizationId) {
            set({ loading: true });

            try {
                const assignments =
                    await organizationProcessAssignmentStorageRepo.listByOrganization(
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
                    await organizationProcessAssignmentStorageRepo.create(payload);
                const allAssignments =
                    await organizationProcessAssignmentStorageRepo.list();

                set({
                    assignmentsByOrganizationId: indexByOrganization(allAssignments),
                });

                return created;
            } finally {
                set({ loading: false });
            }
        },

        async removeAssignment(organizationId, assignmentId) {
            set({ loading: true });

            try {
                await organizationProcessAssignmentStorageRepo.remove(assignmentId);
                const assignments =
                    await organizationProcessAssignmentStorageRepo.listByOrganization(
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
