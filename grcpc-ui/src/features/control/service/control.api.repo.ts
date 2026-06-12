import { httpClient } from "@/shared/infra/http.client";
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

const BASE_URL = "/api/controls";

function assignmentUrl(controlAssignmentId: string): string {
    return `/api/control-assignments/${controlAssignmentId}`;
}

export class ControlApiRepo implements ControlRepo {
    async getStructure(): Promise<ControlStructureNode[]> {
        return httpClient.get<ControlStructureNode[]>("/api/control-structure");
    }

    async list(): Promise<ControlSummary[]> {
        return httpClient.get<ControlSummary[]>(BASE_URL);
    }

    async getAssignment(controlAssignmentId: string): Promise<ControlDetails> {
        return httpClient.get<ControlDetails>(`/api/control-assignments/${controlAssignmentId}`);
    }

    async createAndAssign(
        subProcessId: string,
        payload: CreateControlAndAssignRequest,
    ): Promise<ControlDetails> {
        return httpClient.post<ControlDetails>(
            `/api/sub-processes/${subProcessId}/controls`,
            payload,
        );
    }

    async attachExisting(
        subProcessId: string,
        payload: AttachExistingControlRequest,
    ): Promise<ControlDetails> {
        return httpClient.post<ControlDetails>(
            `/api/sub-processes/${subProcessId}/control-assignments`,
            payload,
        );
    }

    async updateAssignment(
        controlAssignmentId: string,
        payload: UpdateControlAssignmentRequest,
    ): Promise<ControlDetails> {
        return httpClient.put<ControlDetails>(
            `/api/control-assignments/${controlAssignmentId}`,
            payload,
        );
    }

    async deleteAssignment(controlAssignmentId: string): Promise<void> {
        await httpClient.delete<void>(`/api/control-assignments/${controlAssignmentId}`);
    }

    async listSteps(controlAssignmentId: string): Promise<ControlStep[]> {
        return httpClient.get<ControlStep[]>(`${assignmentUrl(controlAssignmentId)}/steps`);
    }

    async createStep(
        controlAssignmentId: string,
        payload: CreateControlStepRequest,
    ): Promise<ControlStep> {
        return httpClient.post<ControlStep>(
            `${assignmentUrl(controlAssignmentId)}/steps`,
            payload,
        );
    }

    async updateStep(
        controlAssignmentId: string,
        stepId: string,
        payload: UpdateControlStepRequest,
    ): Promise<ControlStep> {
        return httpClient.put<ControlStep>(
            `${assignmentUrl(controlAssignmentId)}/steps/${stepId}`,
            payload,
        );
    }

    async deleteStep(controlAssignmentId: string, stepId: string): Promise<void> {
        await httpClient.delete<void>(`${assignmentUrl(controlAssignmentId)}/steps/${stepId}`);
    }

    async listRegulations(controlAssignmentId: string): Promise<ControlRegulationLink[]> {
        return httpClient.get<ControlRegulationLink[]>(
            `${assignmentUrl(controlAssignmentId)}/regulations`,
        );
    }

    async linkRegulation(
        controlAssignmentId: string,
        regulationId: string,
    ): Promise<ControlRegulationLink> {
        return httpClient.post<ControlRegulationLink>(
            `${assignmentUrl(controlAssignmentId)}/regulations/${regulationId}`,
            {},
        );
    }

    async deleteRegulationLink(controlAssignmentId: string, linkId: string): Promise<void> {
        await httpClient.delete<void>(
            `${assignmentUrl(controlAssignmentId)}/regulations/${linkId}`,
        );
    }

    async listRequirements(controlAssignmentId: string): Promise<ControlRequirementLink[]> {
        return httpClient.get<ControlRequirementLink[]>(
            `${assignmentUrl(controlAssignmentId)}/requirements`,
        );
    }

    async linkRequirement(
        controlAssignmentId: string,
        requirementId: string,
    ): Promise<ControlRequirementLink> {
        return httpClient.post<ControlRequirementLink>(
            `${assignmentUrl(controlAssignmentId)}/requirements/${requirementId}`,
            {},
        );
    }

    async deleteRequirementLink(controlAssignmentId: string, linkId: string): Promise<void> {
        await httpClient.delete<void>(
            `${assignmentUrl(controlAssignmentId)}/requirements/${linkId}`,
        );
    }

    async listRisks(controlAssignmentId: string): Promise<ControlRiskLink[]> {
        return httpClient.get<ControlRiskLink[]>(`${assignmentUrl(controlAssignmentId)}/risks`);
    }

    async linkRisk(controlAssignmentId: string, riskId: string): Promise<ControlRiskLink> {
        return httpClient.post<ControlRiskLink>(
            `${assignmentUrl(controlAssignmentId)}/risks/${riskId}`,
            {},
        );
    }

    async deleteRiskLink(controlAssignmentId: string, linkId: string): Promise<void> {
        await httpClient.delete<void>(`${assignmentUrl(controlAssignmentId)}/risks/${linkId}`);
    }

    async listAccountGroups(controlAssignmentId: string): Promise<ControlAccountGroupLink[]> {
        return httpClient.get<ControlAccountGroupLink[]>(
            `${assignmentUrl(controlAssignmentId)}/account-groups`,
        );
    }

    async linkAccountGroup(
        controlAssignmentId: string,
        accountGroupId: string,
    ): Promise<ControlAccountGroupLink> {
        return httpClient.post<ControlAccountGroupLink>(
            `${assignmentUrl(controlAssignmentId)}/account-groups/${accountGroupId}`,
            {},
        );
    }

    async deleteAccountGroupLink(controlAssignmentId: string, linkId: string): Promise<void> {
        await httpClient.delete<void>(
            `${assignmentUrl(controlAssignmentId)}/account-groups/${linkId}`,
        );
    }

    async listDocuments(controlAssignmentId: string): Promise<ControlDocument[]> {
        return httpClient.get<ControlDocument[]>(
            `${assignmentUrl(controlAssignmentId)}/documents`,
        );
    }

    async createDocument(
        controlAssignmentId: string,
        payload: CreateControlDocumentRequest,
    ): Promise<ControlDocument> {
        return httpClient.post<ControlDocument>(
            `${assignmentUrl(controlAssignmentId)}/documents`,
            payload,
        );
    }

    async updateDocument(
        controlAssignmentId: string,
        documentId: string,
        payload: UpdateControlDocumentRequest,
    ): Promise<ControlDocument> {
        return httpClient.put<ControlDocument>(
            `${assignmentUrl(controlAssignmentId)}/documents/${documentId}`,
            payload,
        );
    }

    async deleteDocument(controlAssignmentId: string, documentId: string): Promise<void> {
        await httpClient.delete<void>(
            `${assignmentUrl(controlAssignmentId)}/documents/${documentId}`,
        );
    }

    async listPerformancePlans(controlAssignmentId: string): Promise<ControlPerformancePlan[]> {
        return httpClient.get<ControlPerformancePlan[]>(
            `${assignmentUrl(controlAssignmentId)}/performance-plans`,
        );
    }

    async createPerformancePlan(
        controlAssignmentId: string,
        payload: CreateControlPerformancePlanRequest,
    ): Promise<ControlPerformancePlan> {
        return httpClient.post<ControlPerformancePlan>(
            `${assignmentUrl(controlAssignmentId)}/performance-plans`,
            payload,
        );
    }

    async updatePerformancePlan(
        controlAssignmentId: string,
        planId: string,
        payload: UpdateControlPerformancePlanRequest,
    ): Promise<ControlPerformancePlan> {
        return httpClient.put<ControlPerformancePlan>(
            `${assignmentUrl(controlAssignmentId)}/performance-plans/${planId}`,
            payload,
        );
    }

    async deletePerformancePlan(controlAssignmentId: string, planId: string): Promise<void> {
        await httpClient.delete<void>(
            `${assignmentUrl(controlAssignmentId)}/performance-plans/${planId}`,
        );
    }
}
