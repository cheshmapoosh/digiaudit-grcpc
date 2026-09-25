import { httpClient } from "@/shared/infra/http.client";
import type { CentralControlControlObjectiveCoverage,ControlControlObjectiveCoverageOptions } from "../domain/controlControlObjectiveCoverage.model";
const base=(id:string)=>`/api/master-data/central/subprocesses/${id}/control-control-objective-coverages`;
export const controlControlObjectiveCoverageApi={list:(id:string,signal?:AbortSignal)=>httpClient.get<CentralControlControlObjectiveCoverage[]>(base(id),{signal}),deleted:(id:string,signal?:AbortSignal)=>httpClient.get<CentralControlControlObjectiveCoverage[]>(`${base(id)}/deleted`,{signal}),options:(id:string,signal?:AbortSignal)=>httpClient.get<ControlControlObjectiveCoverageOptions>(`${base(id)}/options`,{signal}),forControlObjective:(id:string,signal?:AbortSignal)=>httpClient.get<CentralControlControlObjectiveCoverage[]>(`/api/master-data/central/control-objectives/${id}/control-coverages`,{signal}),forControl:(id:string,signal?:AbortSignal)=>httpClient.get<CentralControlControlObjectiveCoverage[]>(`/api/master-data/central/controls/${id}/control-objective-coverages`,{signal})};



