import { create } from "zustand";
import type {
    OrganizationReferenceAssignment,
    OrganizationReferenceAssignmentCreate,
    OrganizationReferenceType,
} from "../domain/organization-process-assignment.model";
import { createOrganizationReferenceAssignmentRepo } from "../infra/organization-reference-assignment.factory";

interface OrganizationReferenceAssignmentState {
    assignmentsByOrganizationAndType: Record<string, OrganizationReferenceAssignment[]>;
    loading: boolean;

    loadForOrganization(
        organizationId: string,
        referenceType: OrganizationReferenceType,
    ): Promise<void>;
    assignReference(
        payload: OrganizationReferenceAssignmentCreate,
    ): Promise<OrganizationReferenceAssignment>;
    removeAssignment(
        organizationId: string,
        referenceType: OrganizationReferenceType,
        assignmentId: string,
    ): Promise<void>;
    reset(): void;
}

const referenceAssignmentRepo = createOrganizationReferenceAssignmentRepo();

function toKey(organizationId: string, referenceType: OrganizationReferenceType): string {
    return `${organizationId}:${referenceType}`;
}

export const useOrganizationReferenceAssignmentState =
    create<OrganizationReferenceAssignmentState>((set) => ({
        assignmentsByOrganizationAndType: {},
        loading: false,

        async loadForOrganization(organizationId, referenceType) {
            set({ loading: true });

            try {
                const assignments = await referenceAssignmentRepo.listByOrganization(
                    organizationId,
                    referenceType,
                );

                set((state) => ({
                    assignmentsByOrganizationAndType: {
                        ...state.assignmentsByOrganizationAndType,
                        [toKey(organizationId, referenceType)]: assignments,
                    },
                }));
            } finally {
                set({ loading: false });
            }
        },

        async assignReference(payload) {
            set({ loading: true });

            try {
                const created = await referenceAssignmentRepo.create(payload);
                const assignments = await referenceAssignmentRepo.listByOrganization(
                    payload.organizationId,
                    payload.referenceType,
                );

                set((state) => ({
                    assignmentsByOrganizationAndType: {
                        ...state.assignmentsByOrganizationAndType,
                        [toKey(payload.organizationId, payload.referenceType)]: assignments,
                    },
                }));

                return created;
            } finally {
                set({ loading: false });
            }
        },

        async removeAssignment(organizationId, referenceType, assignmentId) {
            set({ loading: true });

            try {
                await referenceAssignmentRepo.remove(assignmentId);
                const assignments = await referenceAssignmentRepo.listByOrganization(
                    organizationId,
                    referenceType,
                );

                set((state) => ({
                    assignmentsByOrganizationAndType: {
                        ...state.assignmentsByOrganizationAndType,
                        [toKey(organizationId, referenceType)]: assignments,
                    },
                }));
            } finally {
                set({ loading: false });
            }
        },

        reset() {
            set({
                assignmentsByOrganizationAndType: {},
                loading: false,
            });
        },
    }));
