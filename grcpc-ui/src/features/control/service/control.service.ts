import {
    attachExistingControlSchema,
    createControlAndAssignSchema,
    updateControlAssignmentSchema,
} from "../domain/control.schema";
import type {
    AttachExistingControlRequest,
    ControlAccountGroupLink,
    ControlDetails,
    ControlDocument,
    ControlPerformancePlan,
    ControlRegulationLink,
    ControlRequirementLink,
    ControlRiskLink,
    ControlStep,
    ControlStructureNode,
    ControlSummary,
    CreateControlAndAssignRequest,
    CreateControlDocumentRequest,
    CreateControlPerformancePlanRequest,
    CreateControlStepRequest,
    UpdateControlAssignmentRequest,
    UpdateControlDocumentRequest,
    UpdateControlPerformancePlanRequest,
    UpdateControlStepRequest,
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
    listSteps(controlAssignmentId: string): Promise<ControlStep[]>;
    createStep(
        controlAssignmentId: string,
        payload: CreateControlStepRequest,
    ): Promise<ControlStep>;
    updateStep(
        controlAssignmentId: string,
        stepId: string,
        payload: UpdateControlStepRequest,
    ): Promise<ControlStep>;
    deleteStep(controlAssignmentId: string, stepId: string): Promise<void>;
    listRegulations(controlAssignmentId: string): Promise<ControlRegulationLink[]>;
    linkRegulation(
        controlAssignmentId: string,
        regulationId: string,
    ): Promise<ControlRegulationLink>;
    deleteRegulationLink(controlAssignmentId: string, linkId: string): Promise<void>;
    listRequirements(controlAssignmentId: string): Promise<ControlRequirementLink[]>;
    linkRequirement(
        controlAssignmentId: string,
        requirementId: string,
    ): Promise<ControlRequirementLink>;
    deleteRequirementLink(controlAssignmentId: string, linkId: string): Promise<void>;
    listRisks(controlAssignmentId: string): Promise<ControlRiskLink[]>;
    linkRisk(controlAssignmentId: string, riskId: string): Promise<ControlRiskLink>;
    deleteRiskLink(controlAssignmentId: string, linkId: string): Promise<void>;
    listAccountGroups(controlAssignmentId: string): Promise<ControlAccountGroupLink[]>;
    linkAccountGroup(
        controlAssignmentId: string,
        accountGroupId: string,
    ): Promise<ControlAccountGroupLink>;
    deleteAccountGroupLink(controlAssignmentId: string, linkId: string): Promise<void>;
    listDocuments(controlAssignmentId: string): Promise<ControlDocument[]>;
    createDocument(
        controlAssignmentId: string,
        payload: CreateControlDocumentRequest,
    ): Promise<ControlDocument>;
    updateDocument(
        controlAssignmentId: string,
        documentId: string,
        payload: UpdateControlDocumentRequest,
    ): Promise<ControlDocument>;
    deleteDocument(controlAssignmentId: string, documentId: string): Promise<void>;
    listPerformancePlans(controlAssignmentId: string): Promise<ControlPerformancePlan[]>;
    createPerformancePlan(
        controlAssignmentId: string,
        payload: CreateControlPerformancePlanRequest,
    ): Promise<ControlPerformancePlan>;
    updatePerformancePlan(
        controlAssignmentId: string,
        planId: string,
        payload: UpdateControlPerformancePlanRequest,
    ): Promise<ControlPerformancePlan>;
    deletePerformancePlan(controlAssignmentId: string, planId: string): Promise<void>;
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

function compareOptionalNumber(a?: number | null, b?: number | null): number {
    if (a == null && b == null) {
        return 0;
    }

    if (a == null) {
        return 1;
    }

    if (b == null) {
        return -1;
    }

    return a - b;
}

function compareOptionalText(a?: string | null, b?: string | null): number {
    return (a ?? "").localeCompare(b ?? "", "fa");
}

function sortSteps(items: ControlStep[]): ControlStep[] {
    return [...items].sort((a, b) => {
        const sortOrderCompare = compareOptionalNumber(a.sortOrder, b.sortOrder);
        if (sortOrderCompare !== 0) {
            return sortOrderCompare;
        }

        return compareOptionalText(a.title, b.title);
    });
}

function sortLinkedItems<T extends { code?: string | null; title?: string | null }>(
    items: T[],
): T[] {
    return [...items].sort((a, b) => {
        const codeCompare = compareOptionalText(a.code, b.code);
        if (codeCompare !== 0) {
            return codeCompare;
        }

        return compareOptionalText(a.title, b.title);
    });
}

function sortDocuments(items: ControlDocument[]): ControlDocument[] {
    return [...items].sort((a, b) => compareOptionalText(a.name, b.name));
}

function sortPerformancePlans(items: ControlPerformancePlan[]): ControlPerformancePlan[] {
    return [...items].sort((a, b) => {
        const dateCompare = compareOptionalText(a.plannedDate, b.plannedDate);
        if (dateCompare !== 0) {
            return dateCompare;
        }

        return compareOptionalText(a.title, b.title);
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

        async listSteps(controlAssignmentId) {
            return sortSteps(await repo.listSteps(controlAssignmentId));
        },

        async createStep(controlAssignmentId, payload) {
            return repo.createStep(controlAssignmentId, payload);
        },

        async updateStep(controlAssignmentId, stepId, payload) {
            return repo.updateStep(controlAssignmentId, stepId, payload);
        },

        async deleteStep(controlAssignmentId, stepId) {
            await repo.deleteStep(controlAssignmentId, stepId);
        },

        async listRegulations(controlAssignmentId) {
            return sortLinkedItems(await repo.listRegulations(controlAssignmentId));
        },

        async linkRegulation(controlAssignmentId, regulationId) {
            return repo.linkRegulation(controlAssignmentId, regulationId);
        },

        async deleteRegulationLink(controlAssignmentId, linkId) {
            await repo.deleteRegulationLink(controlAssignmentId, linkId);
        },

        async listRequirements(controlAssignmentId) {
            return sortLinkedItems(await repo.listRequirements(controlAssignmentId));
        },

        async linkRequirement(controlAssignmentId, requirementId) {
            return repo.linkRequirement(controlAssignmentId, requirementId);
        },

        async deleteRequirementLink(controlAssignmentId, linkId) {
            await repo.deleteRequirementLink(controlAssignmentId, linkId);
        },

        async listRisks(controlAssignmentId) {
            return sortLinkedItems(await repo.listRisks(controlAssignmentId));
        },

        async linkRisk(controlAssignmentId, riskId) {
            return repo.linkRisk(controlAssignmentId, riskId);
        },

        async deleteRiskLink(controlAssignmentId, linkId) {
            await repo.deleteRiskLink(controlAssignmentId, linkId);
        },

        async listAccountGroups(controlAssignmentId) {
            return sortLinkedItems(await repo.listAccountGroups(controlAssignmentId));
        },

        async linkAccountGroup(controlAssignmentId, accountGroupId) {
            return repo.linkAccountGroup(controlAssignmentId, accountGroupId);
        },

        async deleteAccountGroupLink(controlAssignmentId, linkId) {
            await repo.deleteAccountGroupLink(controlAssignmentId, linkId);
        },

        async listDocuments(controlAssignmentId) {
            return sortDocuments(await repo.listDocuments(controlAssignmentId));
        },

        async createDocument(controlAssignmentId, payload) {
            return repo.createDocument(controlAssignmentId, payload);
        },

        async updateDocument(controlAssignmentId, documentId, payload) {
            return repo.updateDocument(controlAssignmentId, documentId, payload);
        },

        async deleteDocument(controlAssignmentId, documentId) {
            await repo.deleteDocument(controlAssignmentId, documentId);
        },

        async listPerformancePlans(controlAssignmentId) {
            return sortPerformancePlans(await repo.listPerformancePlans(controlAssignmentId));
        },

        async createPerformancePlan(controlAssignmentId, payload) {
            return repo.createPerformancePlan(controlAssignmentId, payload);
        },

        async updatePerformancePlan(controlAssignmentId, planId, payload) {
            return repo.updatePerformancePlan(controlAssignmentId, planId, payload);
        },

        async deletePerformancePlan(controlAssignmentId, planId) {
            await repo.deletePerformancePlan(controlAssignmentId, planId);
        },
    };
}

const controlRepo = createControlRepo();
export const controlService = createControlService(controlRepo);
