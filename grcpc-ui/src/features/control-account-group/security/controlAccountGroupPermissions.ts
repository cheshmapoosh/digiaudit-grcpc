import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { ControlAccountGroupPermissions } from "../domain/controlAccountGroup.model";

export function useControlAccountGroupPermissions(): ControlAccountGroupPermissions {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {   const has = (suffix: string) => canAccessMasterData(me, "CONTROL", suffix !== "VIEW") && canAccessMasterData(me, "REFERENCE"); return { view: has("VIEW"), create: has("CREATE"), update: has("UPDATE"), lifecycle: has("LIFECYCLE"), delete: has("DELETE"), restore: has("RESTORE") }; }, [me]);
}

export function useClassificationDestinationPermissions() {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {   return { accountGroupView: canAccessMasterData(me, "REFERENCE"), controlView: canAccessMasterData(me, "CONTROL"), controlObjectiveView: canAccessMasterData(me, "CONTROL") }; }, [me]);
}
