import {
    attachExistingControlSchema,
    createControlAndAssignSchema,
    updateControlAssignmentSchema,
} from "../domain/control.schema";
import type {
    AttachExistingControlRequest,
    ControlDetails,
    ControlStructureNode,
    ControlSummary,
    CreateControlAndAssignRequest,
    UpdateControlAssignmentRequest,
} from "../domain/control.model";
import type { ControlRepo } from "./control.repo";
import { createControlRepo } from "./control.repo.provider";
import { sortControlStructureNodes } from "../utils/control.structure";

export interface ControlService {
    getStructure(): Promise<ControlStructureNode[]>;
    list(): Promise<ControlSummary[]>;
    getAssignment(controlAssignmentId: string): Promise<ControlDetails>;
    createAndAssign(
        subProcessId: string,
        payload: CreateControlAndAssignRequest,
    ): Promise<ControlDetails>;
    attachExisting(
        subProcessId: string,
        payload: AttachExistingControlRequest,
    ): Promise<ControlDetails>;
    updateAssignment(
        controlAssignmentId: string,
        payload: UpdateControlAssignmentRequest,
    ): Promise<ControlDetails>;
    deleteAssignment(controlAssignmentId: string): Promise<void>;
}

function sortControls(items: ControlSummary[]): ControlSummary[] {
    return [...items].sort((a, b) => {
        const codeCompare = a.code.localeCompare(b.code, "fa");
        if (codeCompare !== 0) {
            return codeCompare;
        }

        return a.name.localeCompare(b.name, "fa");
    });
}

export function createControlService(repo: ControlRepo): ControlService {
    return {
        async getStructure() {
            const items = await repo.getStructure();
            return sortControlStructureNodes(items);
        },

        async list() {
            const items = await repo.list();
            return sortControls(items);
        },

        async getAssignment(controlAssignmentId) {
            return repo.getAssignment(controlAssignmentId);
        },

        async createAndAssign(subProcessId, payload) {
            const parsed = createControlAndAssignSchema.parse(payload);
            return repo.createAndAssign(subProcessId, parsed);
        },

        async attachExisting(subProcessId, payload) {
            const parsed = attachExistingControlSchema.parse(payload);
            return repo.attachExisting(subProcessId, parsed);
        },

        async updateAssignment(controlAssignmentId, payload) {
            const parsed = updateControlAssignmentSchema.parse(payload);
            return repo.updateAssignment(controlAssignmentId, parsed);
        },

        async deleteAssignment(controlAssignmentId) {
            await repo.deleteAssignment(controlAssignmentId);
        },
    };
}

const controlRepo = createControlRepo();
export const controlService = createControlService(controlRepo);
