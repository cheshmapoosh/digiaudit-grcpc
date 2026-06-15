import { create } from "zustand";
import type {
    AttachExistingControlRequest,
    ControlDetails,
    ControlStructureNode,
    CreateControlAndAssignRequest,
    UpdateControlAssignmentRequest,
} from "../domain/control.model";
import { controlService } from "../service/control.service";
import { normalizeControlStructureNode } from "../utils/control.structure";

interface ControlState {
    structureNodes: ControlStructureNode[];
    assignmentsById: Record<string, ControlDetails>;
    selectedId: string | null;
    loading: boolean;
    error: string | null;

    setSelectedId(id: string | null): void;
    clearError(): void;
    refreshStructure(): Promise<void>;
    loadAssignment(id: string): Promise<ControlDetails>;
    createAndAssign(
        subProcessId: string,
        payload: CreateControlAndAssignRequest,
    ): Promise<ControlDetails>;
    attachExisting(
        subProcessId: string,
        payload: AttachExistingControlRequest,
    ): Promise<ControlDetails>;
    updateAssignment(
        id: string,
        payload: UpdateControlAssignmentRequest,
    ): Promise<ControlDetails>;
    deleteAssignment(id: string): Promise<void>;
    reset(): void;
}

function normalizeStructure(items: ControlStructureNode[]): ControlStructureNode[] {
    return items.map(normalizeControlStructureNode);
}

function setErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : "UNKNOWN_ERROR";
}

export const useControlState = create<ControlState>((set) => ({
    structureNodes: [],
    assignmentsById: {},
    selectedId: null,
    loading: false,
    error: null,

    setSelectedId(id) {
        set({ selectedId: id });
    },

    clearError() {
        set({ error: null });
    },

    async refreshStructure() {
        set({ loading: true, error: null });

        try {
            const structureNodes = normalizeStructure(await controlService.getStructure());
            set({ structureNodes });
        } catch (error) {
            set({ error: setErrorMessage(error) });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    async loadAssignment(id) {
        set({ loading: true, error: null });

        try {
            const assignment = await controlService.getAssignment(id);
            set((state) => ({
                assignmentsById: {
                    ...state.assignmentsById,
                    [id]: assignment,
                },
                selectedId: id,
            }));
            return assignment;
        } catch (error) {
            set({ error: setErrorMessage(error) });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    async createAndAssign(subProcessId, payload) {
        set({ loading: true, error: null });

        try {
            const assignment = await controlService.createAndAssign(subProcessId, payload);
            const structureNodes = normalizeStructure(await controlService.getStructure());
            set((state) => ({
                structureNodes,
                assignmentsById: {
                    ...state.assignmentsById,
                    [assignment.controlAssignmentId]: assignment,
                },
                selectedId: assignment.controlAssignmentId,
            }));
            return assignment;
        } catch (error) {
            set({ error: setErrorMessage(error) });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    async attachExisting(subProcessId, payload) {
        set({ loading: true, error: null });

        try {
            const assignment = await controlService.attachExisting(subProcessId, payload);
            const structureNodes = normalizeStructure(await controlService.getStructure());
            set((state) => ({
                structureNodes,
                assignmentsById: {
                    ...state.assignmentsById,
                    [assignment.controlAssignmentId]: assignment,
                },
                selectedId: assignment.controlAssignmentId,
            }));
            return assignment;
        } catch (error) {
            set({ error: setErrorMessage(error) });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    async updateAssignment(id, payload) {
        set({ loading: true, error: null });

        try {
            const assignment = await controlService.updateAssignment(id, payload);
            const structureNodes = normalizeStructure(await controlService.getStructure());
            set((state) => ({
                structureNodes,
                assignmentsById: {
                    ...state.assignmentsById,
                    [id]: assignment,
                },
                selectedId: id,
            }));
            return assignment;
        } catch (error) {
            set({ error: setErrorMessage(error) });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    async deleteAssignment(id) {
        set({ loading: true, error: null });

        try {
            await controlService.deleteAssignment(id);
            const structureNodes = normalizeStructure(await controlService.getStructure());
            set((state) => {
                const nextAssignments = { ...state.assignmentsById };
                delete nextAssignments[id];

                return {
                    structureNodes,
                    assignmentsById: nextAssignments,
                    selectedId: state.selectedId === id ? null : state.selectedId,
                };
            });
        } catch (error) {
            set({ error: setErrorMessage(error) });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    reset() {
        set({
            structureNodes: [],
            assignmentsById: {},
            selectedId: null,
            loading: false,
            error: null,
        });
    },
}));
