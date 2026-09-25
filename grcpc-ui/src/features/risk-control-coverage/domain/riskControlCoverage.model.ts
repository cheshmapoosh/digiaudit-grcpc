import type { CentralSubprocessControlScope } from "@/features/control-scope";
import type { CentralSubprocessRiskScope } from "@/features/risk-scope";
import type { TypedCoverageDraftState } from "@/shared/components/TypedCoverageSection";
export interface CentralRiskControlCoverage { id:string; subprocessId:string; subprocessCode:string; subprocessTitle:string; riskScopeId:string; riskTemplateId:string; riskTemplateCode:string; riskTemplateTitle:string; riskScopeStatus:"ACTIVE"|"INACTIVE"; riskScopeValidFrom:string|null; riskScopeValidTo:string|null; controlScopeId:string; controlId:string; controlCode:string; controlTitle:string; controlScopeStatus:"ACTIVE"|"INACTIVE"; controlScopeValidFrom:string|null; controlScopeValidTo:string|null; status:"ACTIVE"|"INACTIVE"|"DELETED"; validFrom:string|null; validTo:string|null; version:number; }
export interface RiskControlCoverageOptions { riskScopes:CentralSubprocessRiskScope[]; controlScopes:CentralSubprocessControlScope[]; }
export interface RiskControlCoverageChange { operation:"CREATE_OR_RESTORE"|"UPDATE"|"ACTIVATE"|"INACTIVATE"|"DELETE"|"RESTORE"; riskScopeId:string; controlScopeId:string; coverageId?:string; version?:number; validFrom?:string|null; validTo?:string|null; requestedStatus?:"ACTIVE"|"INACTIVE"; }
export type RiskControlCoverageDraftState = Omit<TypedCoverageDraftState,"changes"> & {changes:RiskControlCoverageChange[]};
export const EMPTY_RISK_CONTROL_COVERAGE_DRAFT_STATE:RiskControlCoverageDraftState={changes:[],dirty:false,ready:true,invalid:false};
