import type { DocumentLinkTargetType } from "@/features/document";

export type CatalogLifecycleStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export interface DefinitionListRow {
  id: string;
  code: string;
  title: string;
  status: CatalogLifecycleStatus;
  version: number;
}

export interface DefinitionDetailFields extends DefinitionListRow {
  description?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface DefinitionDraft {
  code: string;
  title: string;
  description: string;
  validFrom: string;
  validTo: string;
}

export interface DefinitionPresentationOptions {
  title: string;
  documentTarget: DocumentLinkTargetType;
}

export interface MutationResponse {
  entityId: string;
  revisionId: string;
  version: number;
  finalizedDocuments: unknown[];
}

export interface RevisionMutationResponse {
  entityId: string;
  revisionId: string;
  version: number;
}
