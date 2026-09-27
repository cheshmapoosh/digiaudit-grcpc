import type { DocumentAggregateRequest } from "@/features/document";

export interface Objective {
  id: string;
  nodeType: "objective";
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
  code: string;
  name: string;
  description: string | null;
  objectiveType: string | null;
  parentObjectiveId: string | null;
  validFrom: string | null;
  validTo: string | null;
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
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  name: string;
  owner: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
}

export interface ObjectiveOrganizationOption {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
}
