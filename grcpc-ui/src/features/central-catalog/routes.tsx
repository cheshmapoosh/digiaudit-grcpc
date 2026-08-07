import { centralAccountGroupRoutes } from "@/features/account-group";
import { centralControlObjectiveRoutes } from "@/features/control-objective";
import { centralControlRoutes } from "@/features/control";
import { centralPolicyRoutes } from "@/features/policy";
import { centralRegulationRoutes } from "@/features/regulation";
import { centralRiskRoutes } from "@/features/risk";
import "./components/central-catalog.css";

export const centralCatalogRoutes = (
  <>
    {centralControlRoutes}
    {centralControlObjectiveRoutes}
    {centralRiskRoutes}
    {centralAccountGroupRoutes}
    {centralRegulationRoutes}
    {centralPolicyRoutes}
  </>
);
