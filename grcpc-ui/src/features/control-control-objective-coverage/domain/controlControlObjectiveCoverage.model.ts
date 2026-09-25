import type { CentralSubprocessControlObjectiveScope } from "@/features/control-objective-scope";
import type { CentralSubprocessControlScope } from "@/features/control-scope";
import type { TypedCoverageDraftState } from "@/shared/components/TypedCoverageSection";
export interface CentralControlControlObjectiveCoverage { id:string; subprocessId:string; subprocessCode:string; subprocessTitle:string; controlScopeId:string; controlId:string; controlCode:string; controlTitle:string; controlScopeStatus:"ACTIVE"|"INACTIVE"; controlScopeValidFrom:string|null; controlScopeValidTo:string|null; controlObjectiveScopeId:string; controlObjectiveId:string; controlObjectiveCode:string; controlObjectiveTitle:string; controlObjectiveScopeStatus:"ACTIVE"|"INACTIVE"; controlObjectiveScopeValidFrom:string|null; controlObjectiveScopeValidTo:string|null; status:"ACTIVE"|"INACTIVE"|"DELETED"; validFrom:string|null; validTo:string|null; version:number; }
export interface ControlControlObjectiveCoverageOptions { controlScopes:CentralSubprocessControlScope[]; controlObjectiveScopes:CentralSubprocessControlObjectiveScope[]; }
export interface ControlControlObjectiveCoverageChange { operation:"CREATE_OR_RESTORE"|"UPDATE"|"ACTIVATE"|"INACTIVATE"|"DELETE"|"RESTORE"; controlScopeId:string; controlObjectiveScopeId:string; coverageId?:string; version?:number; validFrom?:string|null; validTo?:string|null; requestedStatus?:"ACTIVE"|"INACTIVE"; }
export type ControlControlObjectiveCoverageDraftState = Omit<TypedCoverageDraftState,"changes"> & {changes:ControlControlObjectiveCoverageChange[]};
export const EMPTY_CONTROL_CONTROL_OBJECTIVE_COVERAGE_DRAFT_STATE:ControlControlObjectiveCoverageDraftState={changes:[],dirty:false,ready:true,invalid:false};


