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
    const authorities = new Set(me?.authorities ?? []);
    const root = Boolean(me?.rootUser || authorities.has("ROLE_ROOT_ADMIN"));
    const has = (suffix: string) =>
      root || authorities.has(`${prefix}_${suffix}`);

    return {
      create: has("CREATE"),
      update: has("UPDATE"),
      move: has("MOVE"),
      lifecycle: has("LIFECYCLE"),
      delete: has("DELETE"),
      restore: has("RESTORE"),
      publish: has("PUBLISH"),
      documentUpload: root || authorities.has("DOCUMENT_UPLOAD"),
    };
  }, [me, prefix]);
}
