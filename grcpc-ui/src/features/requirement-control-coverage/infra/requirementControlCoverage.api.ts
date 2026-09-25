import { httpClient } from "@/shared/infra/http.client";
import type { CentralRequirementControlCoverage,RequirementControlCoverageOptions } from "../domain/requirementControlCoverage.model";
const base=(id:string)=>`/api/master-data/central/subprocesses/${id}/requirement-control-coverages`;
export const requirementControlCoverageApi={list:(id:string,signal?:AbortSignal)=>httpClient.get<CentralRequirementControlCoverage[]>(base(id),{signal}),deleted:(id:string,signal?:AbortSignal)=>httpClient.get<CentralRequirementControlCoverage[]>(`${base(id)}/deleted`,{signal}),options:(id:string,signal?:AbortSignal)=>httpClient.get<RequirementControlCoverageOptions>(`${base(id)}/options`,{signal}),forControl:(id:string,signal?:AbortSignal)=>httpClient.get<CentralRequirementControlCoverage[]>(`/api/master-data/central/controls/${id}/requirement-coverages`,{signal}),forRequirement:(id:string,signal?:AbortSignal)=>httpClient.get<CentralRequirementControlCoverage[]>(`/api/master-data/central/regulation-requirements/${id}/control-coverages`,{signal})};


