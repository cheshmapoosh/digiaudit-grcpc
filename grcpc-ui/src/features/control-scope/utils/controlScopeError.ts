import type { TFunction } from "i18next";
import { HttpError } from "@/shared/infra/http.client";

export function controlScopeErrorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof HttpError ? error.code : undefined;
  switch (code) {
    case "DUPLICATE_RELATION": return t("controlScope.errors.duplicate");
    case "CONTROL_SCOPE_DEPENDENCY_CONFLICT": return t("controlScope.errors.dependency");
    case "INVALID_LIFECYCLE_TRANSITION": return t("controlScope.errors.lifecycle");
    case "VERSION_CONFLICT": return t("controlScope.errors.version");
    case "CONTROL_SCOPE_ENDPOINT_NOT_ACTIVE": return t("controlScope.errors.endpointInactive");
    case "CONTROL_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS": return t("controlScope.errors.validityOutsideEndpoints");
    case "CONTROL_SCOPE_CATALOG_CODE_INVALID": return t("controlScope.errors.invalidCatalog");
    case "CONTROL_SCOPE_CHANGE_INVALID": return t("controlScope.errors.invalidChange");
    case "CENTRAL_CONTROL_SCOPE_NOT_FOUND":
    case "CONTROL_SCOPE_ENDPOINT_NOT_FOUND":
    case "NOT_FOUND": return t("controlScope.errors.notFound");
    case "FORBIDDEN": return t("controlScope.errors.forbidden");
    default:
      return error instanceof Error && error.message.trim()
        ? error.message
        : t("controlScope.errors.generic");
  }
}
