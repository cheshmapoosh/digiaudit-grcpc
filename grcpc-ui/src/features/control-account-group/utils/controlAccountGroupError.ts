import type { TFunction } from "i18next";
import { HttpError } from "@/shared/infra/http.client";
export function controlAccountGroupErrorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof HttpError ? error.code : undefined;
  const keys: Record<string, string> = { DUPLICATE_RELATION: "duplicate", VERSION_CONFLICT: "version", INVALID_LIFECYCLE_TRANSITION: "lifecycle", CONTROL_ACCOUNT_GROUP_ENDPOINT_NOT_ACTIVE: "endpointInactive", CONTROL_ACCOUNT_GROUP_CHANGE_INVALID: "invalidChange", CENTRAL_CONTROL_ACCOUNT_GROUP_NOT_FOUND: "notFound", CONTROL_ACCOUNT_GROUP_ENDPOINT_NOT_FOUND: "notFound", FORBIDDEN: "forbidden" };
  return keys[code ?? ""] ? t(`controlAccountGroup.errors.${keys[code ?? ""]}`) : error instanceof Error && error.message.trim() ? error.message : t("controlAccountGroup.errors.generic");
}
