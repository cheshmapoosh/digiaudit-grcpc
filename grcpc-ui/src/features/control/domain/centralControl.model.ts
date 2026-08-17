import type { DocumentAggregateRequest } from "@/features/document";

export type CentralControlStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type CentralControlEditableStatus = Exclude<CentralControlStatus, "DELETED">;
export type CentralControlNodeType = "GROUP" | "CONTROL";
export type CentralControlClass = "ACTIVITY_LEVEL" | "ENTITY_LEVEL";
export type CentralControlImportance = "PRIMARY" | "SECONDARY";
export type CentralControlRisk = "LOW" | "MEDIUM" | "HIGH";
export type CentralControlAutomationType = "MANUAL" | "SYSTEM" | "SEMI_AUTOMATED";
export type CentralControlPurpose = "PREVENTIVE" | "DETECTIVE";
export type CentralControlNature =
  | "ADJUSTMENT"
  | "AUTHORIZATION"
  | "INITIATION"
  | "MATCH"
  | "PROCESSING"
  | "RECONCILIATION"
  | "RECORDING"
  | "RESTRICTED_ACCESS"
  | "REVIEW"
  | "SAFEGUARDING_OF_ASSETS"
  | "SEGREGATION_OF_DUTIES";
export type CentralControlRelevance =
  | "CONTROL_ACTIVITIES"
  | "CONTROL_ENVIRONMENT"
  | "INFORMATION_AND_COMMUNICATION"
  | "MONITORING"
  | "FRAUD_PREVENTION_AND_DETECTION"
  | "RISK_ASSESSMENT";
export type CentralControlTriggerType = "EVENT" | "DATE";
export type CentralControlOperationFrequency =
  | "ANNUAL"
  | "BI_WEEKLY"
  | "CONTINUAL"
  | "DAILY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI_MONTHLY"
  | "WEEKLY";
export type CentralControlTestAutomationType = "AUTOMATED" | "MANUAL" | "SEMI_AUTOMATED";
export type CentralControlTestingTechnique =
  | "ATTRIBUTE_SAMPLING"
  | "DOCUMENT_INSPECTION_WITH_INQUIRY"
  | "CONTROL_OBSERVATION_WITH_INQUIRY"
  | "CONTROL_REPERFORMANCE_WITH_INQUIRY";
export type CentralControlEvidenceLevel =
  | "NO_TESTING"
  | "SELF_ASSESSMENT"
  | "CONTROL_DESIGN_AND_EFFECTIVENESS"
  | "NOT_APPLICABLE";

export interface CentralControlGroupSummary {
  id: string;
  code: string;
  title: string;
  parentGroupId: string | null;
  sortOrder: number;
  status: CentralControlStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

export interface CentralControlGroupDetail extends CentralControlGroupSummary {
  description: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CentralControlSummary {
  id: string;
  code: string;
  title: string;
  controlGroupId: string | null;
  status: CentralControlStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

export interface CentralControlDetail extends CentralControlSummary {
  description: string | null;
  controlClass: CentralControlClass | null;
  importance: CentralControlImportance | null;
  controlRisk: CentralControlRisk | null;
  automationType: CentralControlAutomationType | null;
  controlPurpose: CentralControlPurpose | null;
  nature: CentralControlNature | null;
  controlRelevance: CentralControlRelevance[];
  triggerType: CentralControlTriggerType | null;
  eventDescription: string | null;
  operationFrequency: CentralControlOperationFrequency | null;
  toBeTested: boolean | null;
  testAutomationType: CentralControlTestAutomationType | null;
  testingTechnique: CentralControlTestingTechnique | null;
  evidenceLevel: CentralControlEvidenceLevel | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CreateCentralControlGroupCommand {
  code: string;
  title: string;
  parentGroupId: string | null;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
}

export interface UpdateCentralControlGroupCommand {
  title: string;
  parentGroupId: string | null;
  description: string | null;
  sortOrder: number;
  status: CentralControlEditableStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

export interface CreateCentralControlCommand {
  code: string;
  title: string;
  description: string | null;
  controlGroupId: string | null;
  controlClass: CentralControlClass | null;
  importance: CentralControlImportance | null;
  controlRisk: CentralControlRisk | null;
  automationType: CentralControlAutomationType | null;
  controlPurpose: CentralControlPurpose | null;
  nature: CentralControlNature | null;
  controlRelevance: CentralControlRelevance[];
  triggerType: CentralControlTriggerType | null;
  eventDescription: string | null;
  operationFrequency: CentralControlOperationFrequency | null;
  toBeTested: boolean | null;
  testAutomationType: CentralControlTestAutomationType | null;
  testingTechnique: CentralControlTestingTechnique | null;
  evidenceLevel: CentralControlEvidenceLevel | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface UpdateCentralControlCommand extends Omit<CreateCentralControlCommand, "code"> {
  version: number;
  status: CentralControlEditableStatus;
}

export interface CentralControlMutationResponse {
  entityId: string;
  revisionId: string;
  version: number;
  finalizedDocuments: unknown[];
}

export interface CentralControlRevisionResponse {
  entityId: string;
  revisionId: string;
  version: number;
}
