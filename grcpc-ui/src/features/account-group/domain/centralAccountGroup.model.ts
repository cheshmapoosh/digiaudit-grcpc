import type { DocumentAggregateRequest } from "@/features/document";
import type { AccountGroupControlSelection, ControlAccountGroupClassification } from "@/features/control-account-group";
import type { AccountGroupControlObjectiveSelection, ControlObjectiveAccountGroupClassification } from "@/features/control-objective-account-group";

export type CentralAccountGroupStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type CentralAccountGroupEditableStatus = Exclude<CentralAccountGroupStatus, "DELETED">;
export type CentralAccountGroupImportance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AccountGroupClassificationOperation = "ACTIVATE" | "INACTIVATE" | "DELETE";

interface ClassificationLifecycleChange {
  classificationId: string;
  version: number;
  operation: AccountGroupClassificationOperation;
}

interface AccountGroupRiskSelection {
  riskTemplateId: string;
  version: number;
}

interface AccountGroupRiskLifecycleChange extends AccountGroupRiskSelection {
  assignmentId: string;
  operation: AccountGroupClassificationOperation;
}

export interface AccountGroupRiskAssignment {
  assignmentId: string;
  riskTemplateId: string;
  riskTemplateCode: string;
  riskTemplateTitle: string;
  riskTemplateStatus: CentralAccountGroupStatus;
  status: CentralAccountGroupStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

export const CENTRAL_ACCOUNT_GROUP_IMPORTANCE: CentralAccountGroupImportance[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export interface CentralAccountGroupSummary {
  id: string;
  code: string;
  title: string;
  parentAccountGroupId: string | null;
  importance: CentralAccountGroupImportance;
  reasonableAssurance: boolean;
  sortOrder: number;
  status: CentralAccountGroupStatus;
  validFrom?: string | null;
  validTo?: string | null;
  version: number;
}

export interface CentralAccountGroupDetail extends CentralAccountGroupSummary {
  controlClassifications?: ControlAccountGroupClassification[];
  controlObjectiveClassifications?: ControlObjectiveAccountGroupClassification[];
  riskAssignments?: AccountGroupRiskAssignment[];
  description?: string | null;
  createdAt: string;
  createdBy?: string | null;
  updatedAt: string;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CreateCentralAccountGroupCommand {
  riskTemplatesToAdd?: AccountGroupRiskSelection[];
  controlsToAdd?: AccountGroupControlSelection[];
  controlObjectivesToAdd?: AccountGroupControlObjectiveSelection[];
  code: string;
  title: string;
  parentAccountGroupId: string | null;
  importance: CentralAccountGroupImportance;
  reasonableAssurance: boolean;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface UpdateCentralAccountGroupCommand {
  riskTemplatesToAdd?: AccountGroupRiskSelection[];
  riskAssignmentLifecycleChanges?: AccountGroupRiskLifecycleChange[];
  controlsToAdd?: AccountGroupControlSelection[];
  controlObjectivesToAdd?: AccountGroupControlObjectiveSelection[];
  controlLifecycleChanges?: (ClassificationLifecycleChange & { controlId: string })[];
  controlObjectiveLifecycleChanges?: (ClassificationLifecycleChange & { controlObjectiveId: string })[];
  parentChange?: { parentAccountGroupId: string | null };
  sortOrder?: number;
  status?: "ACTIVE" | "INACTIVE";
  version: number;
  title: string;
  importance: CentralAccountGroupImportance;
  reasonableAssurance: boolean;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface EditCentralAccountGroupCommand extends UpdateCentralAccountGroupCommand {
  parentAccountGroupId: string | null;
  sortOrder: number;
  status: CentralAccountGroupEditableStatus;
}

export interface MoveCentralAccountGroupCommand {
  version: number;
  parentAccountGroupId: string | null;
  sortOrder: number;
}

export interface CentralAccountGroupMutationResponse {
  riskAssignments?: AccountGroupRiskAssignment[];
  controlClassifications?: ControlAccountGroupClassification[];
  controlObjectiveClassifications?: ControlObjectiveAccountGroupClassification[];
  entity: CentralAccountGroupDetail;
  entityId: string;
  revisionId: string;
  version: number;
  finalizedDocuments: unknown[];
}

export interface CentralAccountGroupRevisionResponse {
  entityId: string;
  revisionId: string;
  version: number;
}
