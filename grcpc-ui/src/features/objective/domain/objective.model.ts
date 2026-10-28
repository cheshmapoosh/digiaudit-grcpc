import type { DocumentAggregateRequest } from "@/features/document";

export type ObjectiveKind = "STRATEGY" | "OBJECTIVE";

export interface Objective {
  id: string;
  nodeType: "objective";
  kind: ObjectiveKind;
  code: string;
  name: string;
  description: string | null;
  objectiveType: string | null;
  parentObjectiveId: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveCreate {
  kind: ObjectiveKind;
  code: string;
  name: string;
  description: string | null;
  objectiveType: string | null;
  parentObjectiveId: string | null;
  validFrom: string | null;
  validTo: string | null;
  organizationChanges?: OrganizationObjectiveChange[];
  documents: DocumentAggregateRequest;
}

export type ObjectiveUpdate = Omit<ObjectiveCreate, "code"> & { version: number };

export interface OrganizationObjective {
  id: string;
  organizationId: string;
  objectiveId: string;
  objectiveCode: string;
  name: string;
  description: string | null;
  owner: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveOrganizationLink {
  id: string;
  objectiveId: string;
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  name: string;
  description: string | null;
  owner: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
}

export interface OrganizationObjectiveChange {
  operation: "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE" | "RESTORE";
  assignmentId?: string;
  version?: number;
  objectiveId?: string;
  organizationId?: string;
  name?: string | null;
  description?: string | null;
  owner?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  requestedStatus?: "ACTIVE" | "INACTIVE";
}

export interface ObjectiveMutation {
  entityId: string; version: number; revisionId: string;
  objective: Objective;
  organizations: ObjectiveOrganizationLink[];
}

export interface ObjectiveOrganizationOption {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  parentOrganizationId: string | null;
}
