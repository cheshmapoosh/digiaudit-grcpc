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
    CreateControlDocumentRequest,
    CreateControlAndAssignRequest,
    CreateControlPerformancePlanRequest,
    CreateControlStepRequest,
    UpdateControlDocumentRequest,
    UpdateControlPerformancePlanRequest,
    UpdateControlAssignmentRequest,
    UpdateControlStepRequest,
} from "../domain/control.model";

export interface ControlRepo {
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
