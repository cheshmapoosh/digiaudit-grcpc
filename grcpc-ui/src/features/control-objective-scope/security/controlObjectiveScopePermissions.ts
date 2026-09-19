import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { ControlObjectiveScopePermissions } from "../domain/controlObjectiveScope.model";

export function useControlObjectiveScopePermissions(): ControlObjectiveScopePermissions {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {


    const has = (suffix: string) => canAccessMasterData(me, "PROCESS", suffix !== "VIEW") && canAccessMasterData(me, "CONTROL");
    return {
      view: has("VIEW"),
      create: has("CREATE"),
      update: has("UPDATE"),
      lifecycle: has("LIFECYCLE"),
      delete: has("DELETE"),
      restore: has("RESTORE"),
      controlObjectiveView: canAccessMasterData(me, "CONTROL"),
    };
  }, [me]);
}
