import { useMemo } from "react";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";

export function useRiskControlAssignmentPermissions() {
  const control = useMasterDataAccess("CONTROL");
  const risk = useMasterDataAccess("RISK");
  const view = control.view && risk.view;
  const manage = control.manage && risk.view;
  return useMemo(() => ({
    view, create: manage, update: manage, lifecycle: manage, delete: manage, restore: manage,
  }), [view, manage]);
}
