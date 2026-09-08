import { useMemo } from "react";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { ControlAccountGroupPermissions } from "../domain/controlAccountGroup.model";

export function useControlAccountGroupPermissions(): ControlAccountGroupPermissions {
  const me = useAuthState((state) => state.me);
  return useMemo(() => { const authorities = new Set(me?.authorities ?? []); const root = Boolean(me?.rootUser || authorities.has("ROLE_ROOT_ADMIN")); const has = (suffix: string) => root || authorities.has(`CENTRAL_CONTROL_ACCOUNT_GROUP_${suffix}`); return { view: has("VIEW"), create: has("CREATE"), update: has("UPDATE"), lifecycle: has("LIFECYCLE"), delete: has("DELETE"), restore: has("RESTORE") }; }, [me]);
}

export function useClassificationDestinationPermissions() {
  const me = useAuthState((state) => state.me);
  return useMemo(() => { const values = new Set(me?.authorities ?? []); const root = Boolean(me?.rootUser || values.has("ROLE_ROOT_ADMIN")); return { accountGroupView: root || values.has("CENTRAL_ACCOUNT_GROUP_VIEW"), controlView: root || values.has("CENTRAL_CONTROL_VIEW") }; }, [me]);
}
