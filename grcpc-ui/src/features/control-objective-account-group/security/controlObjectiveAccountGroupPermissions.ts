import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { ControlObjectiveAccountGroupPermissions } from "../domain/controlObjectiveAccountGroup.model";

export function useControlObjectiveAccountGroupPermissions(): ControlObjectiveAccountGroupPermissions {
  const me = useAuthState((state) => state.me);
  return useMemo(() => {
    const authorities = new Set(me?.authorities ?? []);
    const root = Boolean(me?.rootUser || authorities.has("ROLE_ROOT_ADMIN"));
    const has = (suffix: string) =>
      root || authorities.has(`CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_${suffix}`);
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
    const authorities = new Set(me?.authorities ?? []);
    const root = Boolean(me?.rootUser || authorities.has("ROLE_ROOT_ADMIN"));
    return {
      accountGroupView: root || authorities.has("CENTRAL_ACCOUNT_GROUP_VIEW"),
      controlObjectiveView: root || authorities.has("CENTRAL_CONTROL_OBJECTIVE_VIEW"),
    };
  }, [me]);
}
