import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import type { ControlObjectiveAccountGroupPermissions } from "../domain/controlObjectiveAccountGroup.model";

export function useControlObjectiveAccountGroupPermissions(): ControlObjectiveAccountGroupPermissions {
  const control = useMasterDataAccess("CONTROL");
  const reference = useMasterDataAccess("REFERENCE");
  const manage = control.manage && reference.view;
  return {
    view: control.view && reference.view,
    create: manage,
    update: manage,
    lifecycle: manage,
    delete: manage,
    restore: manage,
  };
}

export function useControlObjectiveClassificationDestinationPermissions() {
  const reference = useMasterDataAccess("REFERENCE");
  const control = useMasterDataAccess("CONTROL");
  return { accountGroupView: reference.view, controlObjectiveView: control.view };
}
