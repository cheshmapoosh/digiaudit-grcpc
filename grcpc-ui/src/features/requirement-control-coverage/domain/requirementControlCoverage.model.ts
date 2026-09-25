import type { CentralSubprocessControlScope } from "@/features/control-scope";
import type { CentralSubprocessRequirementScope } from "@/features/requirement-scope";
import type { TypedCoverageDraftState } from "@/shared/components/TypedCoverageSection";
export interface CentralRequirementControlCoverage { id:string; subprocessId:string; subprocessCode:string; subprocessTitle:string; requirementScopeId:string; requirementId:string; requirementCode:string; requirementTitle:string; requirementScopeStatus:"ACTIVE"|"INACTIVE"; requirementScopeValidFrom:string|null; requirementScopeValidTo:string|null; controlScopeId:string; controlId:string; controlCode:string; controlTitle:string; controlScopeStatus:"ACTIVE"|"INACTIVE"; controlScopeValidFrom:string|null; controlScopeValidTo:string|null; status:"ACTIVE"|"INACTIVE"|"DELETED"; validFrom:string|null; validTo:string|null; version:number; }
export interface RequirementControlCoverageOptions { requirementScopes:CentralSubprocessRequirementScope[]; controlScopes:CentralSubprocessControlScope[]; }
export interface RequirementControlCoverageChange { operation:"CREATE_OR_RESTORE"|"UPDATE"|"ACTIVATE"|"INACTIVATE"|"DELETE"|"RESTORE"; requirementScopeId:string; controlScopeId:string; coverageId?:string; version?:number; validFrom?:string|null; validTo?:string|null; requestedStatus?:"ACTIVE"|"INACTIVE"; }
export type RequirementControlCoverageDraftState = Omit<TypedCoverageDraftState,"changes"> & {changes:RequirementControlCoverageChange[]};
export const EMPTY_REQUIREMENT_CONTROL_COVERAGE_DRAFT_STATE:RequirementControlCoverageDraftState={changes:[],dirty:false,ready:true,invalid:false};

