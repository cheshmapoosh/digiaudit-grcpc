import { canAccessMasterData, type MasterDataArea } from "@/features/master-data/security/masterDataAccess";
import { useMemo } from "react";

import { useAuthState } from "@/features/auth";

export type CatalogPermissionPrefix =
  | "CENTRAL_CONTROL"
  | "CENTRAL_CONTROL_OBJECTIVE"
  | "CENTRAL_RISK"
  | "CENTRAL_ACCOUNT_GROUP"
  | "CENTRAL_REGULATION"
  | "CENTRAL_POLICY";

export interface CatalogActionPermissions {
  create: boolean;
  update: boolean;
  move: boolean;
  lifecycle: boolean;
  delete: boolean;
  restore: boolean;
  publish: boolean;
  documentUpload: boolean;
}

export function useCatalogActionPermissions(
  prefix: CatalogPermissionPrefix,
): CatalogActionPermissions {
  const me = useAuthState((state) => state.me);

  return useMemo(() => {
    const areas: Record<CatalogPermissionPrefix, MasterDataArea> = {
      CENTRAL_CONTROL: "CONTROL", CENTRAL_CONTROL_OBJECTIVE: "CONTROL", CENTRAL_RISK: "RISK",
      CENTRAL_ACCOUNT_GROUP: "REFERENCE", CENTRAL_REGULATION: "GOVERNANCE", CENTRAL_POLICY: "GOVERNANCE",
    };
    const manage = canAccessMasterData(me, areas[prefix], true);

    return {
      create: manage,
      update: manage,
      move: manage,
      lifecycle: manage,
      delete: manage,
      restore: manage,
      publish: manage,
      documentUpload: manage,
    };
  }, [me, prefix]);
}
