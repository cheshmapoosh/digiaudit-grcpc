import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { RiskScopePermissions } from "../domain/riskScope.model";

export function useRiskScopePermissions(): RiskScopePermissions {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {


    const has = (suffix: string) => canAccessMasterData(me, "PROCESS", suffix !== "VIEW") && canAccessMasterData(me, "RISK");
    return {
      view: has("VIEW"),
      create: has("CREATE"),
      update: has("UPDATE"),
      lifecycle: has("LIFECYCLE"),
      delete: has("DELETE"),
      restore: has("RESTORE"),
      riskTemplateView: canAccessMasterData(me, "RISK"),
    };
  }, [me]);
}
