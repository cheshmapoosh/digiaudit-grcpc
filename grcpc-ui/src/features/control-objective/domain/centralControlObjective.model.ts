import type { DocumentAggregateRequest } from "@/features/document";
import type {
  ControlObjectiveAccountGroupChange,
  ControlObjectiveAccountGroupClassification,
} from "@/features/control-objective-account-group";

export type CentralControlObjectiveStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type CentralControlObjectiveEditableStatus = Exclude<CentralControlObjectiveStatus, "DELETED">;

export interface CentralControlObjectiveSummary {
  id: string;
  code: string;
  title: string;
  objectiveClass: string | null;
  status: CentralControlObjectiveStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

export interface CentralControlObjectiveDetail extends CentralControlObjectiveSummary {
  description: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CreateCentralControlObjectiveCommand {
  code: string;
  title: string;
  description: string | null;
  objectiveClass: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
  accountGroupChanges: ControlObjectiveAccountGroupChange[];
}

export interface UpdateCentralControlObjectiveCommand {
  version: number;
  title: string;
  description: string | null;
  objectiveClass: string | null;
  status: CentralControlObjectiveEditableStatus;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
  accountGroupChanges: ControlObjectiveAccountGroupChange[];
}

export interface CentralControlObjectiveMutationResponse {
  entityId: string;
  revisionId: string;
  version: number;
  finalizedDocuments: unknown[];
  accountGroupClassifications: ControlObjectiveAccountGroupClassification[];
}

export interface CentralControlObjectiveRevisionResponse {
  entityId: string;
  revisionId: string;
  version: number;
}
