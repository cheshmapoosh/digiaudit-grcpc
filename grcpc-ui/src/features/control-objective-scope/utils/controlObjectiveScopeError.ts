import type { TFunction } from "i18next";
import { HttpError } from "@/shared/infra/http.client";

export function controlObjectiveScopeErrorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof HttpError ? error.code : undefined;
  switch (code) {
    case "DUPLICATE_RELATION": return error instanceof Error && error.message.trim()
      ? error.message
      : t("controlObjectiveScope.errors.duplicate");
    case "CONTROL_OBJECTIVE_SCOPE_DEPENDENCY_CONFLICT": return t("controlObjectiveScope.errors.dependency");
    case "INVALID_LIFECYCLE_TRANSITION": return t("controlObjectiveScope.errors.lifecycle");
    case "VERSION_CONFLICT": return t("controlObjectiveScope.errors.version");
    case "CONTROL_OBJECTIVE_SCOPE_ENDPOINT_NOT_ACTIVE": return t("controlObjectiveScope.errors.endpointInactive");
    case "CONTROL_OBJECTIVE_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS": return t("controlObjectiveScope.errors.validityOutsideEndpoints");
    case "CONTROL_OBJECTIVE_SCOPE_CHANGE_INVALID": return t("controlObjectiveScope.errors.invalidChange");
    case "CENTRAL_CONTROL_OBJECTIVE_SCOPE_NOT_FOUND":
    case "CONTROL_OBJECTIVE_SCOPE_ENDPOINT_NOT_FOUND":
    case "NOT_FOUND": return t("controlObjectiveScope.errors.notFound");
    case "FORBIDDEN": return t("controlObjectiveScope.errors.forbidden");
    default:
      return error instanceof Error && error.message.trim()
        ? error.message
        : t("controlObjectiveScope.errors.generic");
  }
}
