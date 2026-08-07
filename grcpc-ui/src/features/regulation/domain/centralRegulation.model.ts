import type { DocumentAggregateRequest } from "@/features/document";
import type {
  DefinitionDetailFields,
  MutationResponse,
  RevisionMutationResponse,
} from "@/features/central-catalog/components/catalogPresentation.model";
export interface CentralRegulationGroupSummary extends DefinitionDetailFields {
  parentGroupId: string | null;
  sortOrder: number;
}
export type CentralRegulationGroupDetail = CentralRegulationGroupSummary;
export interface CentralRegulationSummary extends DefinitionDetailFields {
  regulationGroupId: string;
  sortOrder: number;
}
export type CentralRegulationDetail = CentralRegulationSummary;
export interface CentralRegulationRequirementSummary
  extends DefinitionDetailFields {
  regulationId: string;
  sortOrder: number;
}
export type CentralRegulationRequirementDetail =
  CentralRegulationRequirementSummary;
interface CreateBase {
  code: string;
  title: string;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
interface UpdateBase {
  version: number;
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
export interface CreateCentralRegulationGroupCommand extends CreateBase {
  parentGroupId: string | null;
}
export type UpdateCentralRegulationGroupCommand = UpdateBase;
export interface MoveCentralRegulationGroupCommand {
  version: number;
  parentGroupId: string | null;
  sortOrder: number;
}
export interface CreateCentralRegulationCommand extends CreateBase {
  regulationGroupId: string;
}
export type UpdateCentralRegulationCommand = UpdateBase;
export interface MoveCentralRegulationCommand {
  version: number;
  regulationGroupId: string;
  sortOrder: number;
}
export interface CreateCentralRegulationRequirementCommand extends CreateBase {
  regulationId: string;
}
export type UpdateCentralRegulationRequirementCommand = UpdateBase;
export interface MoveCentralRegulationRequirementCommand {
  version: number;
  regulationId: string;
  sortOrder: number;
}
export type CentralRegulationMutationResponse = MutationResponse;
export type CentralRegulationRevisionResponse = RevisionMutationResponse;
