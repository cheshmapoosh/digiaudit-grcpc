import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import type { ControlObjectiveScopePermissions } from "../domain/controlObjectiveScope.model";

export function useControlObjectiveScopePermissions(): ControlObjectiveScopePermissions {
  const process = useMasterDataAccess("PROCESS");
  const control = useMasterDataAccess("CONTROL");
  const manage = process.manage && control.view;
  return {
    view: process.view && control.view,
    create: manage,
    update: manage,
    lifecycle: manage,
    delete: manage,
    restore: manage,
    controlObjectiveView: control.view,
  };
}
