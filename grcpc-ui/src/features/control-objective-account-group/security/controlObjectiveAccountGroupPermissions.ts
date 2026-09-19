import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { ControlObjectiveAccountGroupPermissions } from "../domain/controlObjectiveAccountGroup.model";

export function useControlObjectiveAccountGroupPermissions(): ControlObjectiveAccountGroupPermissions {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {


    const has = (suffix: string) => canAccessMasterData(me, "CONTROL", suffix !== "VIEW") && canAccessMasterData(me, "REFERENCE");
    return {
      view: has("VIEW"),
      create: has("CREATE"),
      update: has("UPDATE"),
      lifecycle: has("LIFECYCLE"),
      delete: has("DELETE"),
      restore: has("RESTORE"),
    };
  }, [me]);
}

export function useControlObjectiveClassificationDestinationPermissions() {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {


    return {
      accountGroupView: canAccessMasterData(me, "REFERENCE"),
      controlObjectiveView: canAccessMasterData(me, "CONTROL"),
    };
  }, [me]);
}
