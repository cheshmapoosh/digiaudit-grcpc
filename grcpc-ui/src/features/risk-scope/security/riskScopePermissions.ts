import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { RiskScopePermissions } from "../domain/riskScope.model";

export function useRiskScopePermissions(): RiskScopePermissions {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {
    const authorities = new Set(me?.authorities ?? []);
    const root = Boolean(me?.rootUser || authorities.has("ROLE_ROOT_ADMIN"));
    const has = (suffix: string) => root || authorities.has(`CENTRAL_RISK_SCOPE_${suffix}`);
    return {
      view: has("VIEW"),
      create: has("CREATE"),
      update: has("UPDATE"),
      lifecycle: has("LIFECYCLE"),
      delete: has("DELETE"),
      restore: has("RESTORE"),
      riskTemplateView: root || authorities.has("CENTRAL_RISK_VIEW"),
    };
  }, [me]);
}
