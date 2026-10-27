import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";

export function useControlControlObjectiveAssignmentPermissions() {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {
    const view = canAccessMasterData(me, "CONTROL") && canAccessMasterData(me, "CONTROL");
    const manage = canAccessMasterData(me, "CONTROL", true) && canAccessMasterData(me, "CONTROL");
    return { view, create: manage, update: manage, lifecycle: manage, delete: manage, restore: manage };
  }, [me]);
}
