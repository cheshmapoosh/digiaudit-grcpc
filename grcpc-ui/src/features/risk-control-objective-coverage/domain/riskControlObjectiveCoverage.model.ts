import type { CentralSubprocessControlObjectiveScope } from "@/features/control-objective-scope";
import type { CentralSubprocessRiskScope } from "@/features/risk-scope";
import type { TypedCoverageDraftState } from "@/shared/components/TypedCoverageSection";
export interface CentralRiskControlObjectiveCoverage { id:string; subprocessId:string; subprocessCode:string; subprocessTitle:string; riskScopeId:string; riskTemplateId:string; riskTemplateCode:string; riskTemplateTitle:string; riskScopeStatus:"ACTIVE"|"INACTIVE"; riskScopeValidFrom:string|null; riskScopeValidTo:string|null; controlObjectiveScopeId:string; controlObjectiveId:string; controlObjectiveCode:string; controlObjectiveTitle:string; controlObjectiveScopeStatus:"ACTIVE"|"INACTIVE"; controlObjectiveScopeValidFrom:string|null; controlObjectiveScopeValidTo:string|null; status:"ACTIVE"|"INACTIVE"|"DELETED"; validFrom:string|null; validTo:string|null; version:number; }
export interface RiskControlObjectiveCoverageOptions { riskScopes:CentralSubprocessRiskScope[]; controlObjectiveScopes:CentralSubprocessControlObjectiveScope[]; }
export interface RiskControlObjectiveCoverageChange { operation:"CREATE_OR_RESTORE"|"UPDATE"|"ACTIVATE"|"INACTIVATE"|"DELETE"|"RESTORE"; riskScopeId:string; controlObjectiveScopeId:string; coverageId?:string; version?:number; validFrom?:string|null; validTo?:string|null; requestedStatus?:"ACTIVE"|"INACTIVE"; }
export type RiskControlObjectiveCoverageDraftState = Omit<TypedCoverageDraftState,"changes"> & {changes:RiskControlObjectiveCoverageChange[]};
export const EMPTY_RISK_CONTROL_OBJECTIVE_COVERAGE_DRAFT_STATE:RiskControlObjectiveCoverageDraftState={changes:[],dirty:false,ready:true,invalid:false};

