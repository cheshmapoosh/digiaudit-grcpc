import type { TFunction } from "i18next";
import { HttpError } from "@/shared/infra/http.client";

export function requirementScopeErrorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof HttpError ? error.code : undefined;
  switch (code) {
    case "DUPLICATE_RELATION":
      return error instanceof Error && error.message.trim()
        ? error.message
        : t("requirementScope.errors.duplicate");
    case "REQUIREMENT_SCOPE_DEPENDENCY_CONFLICT": return t("requirementScope.errors.dependency");
    case "INVALID_LIFECYCLE_TRANSITION": return t("requirementScope.errors.lifecycle");
    case "VERSION_CONFLICT": return t("requirementScope.errors.version");
    case "REQUIREMENT_SCOPE_ENDPOINT_NOT_ACTIVE": return t("requirementScope.errors.endpointInactive");
    case "REQUIREMENT_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS": return t("requirementScope.errors.validityOutsideEndpoints");
    case "REQUIREMENT_SCOPE_CHANGE_INVALID": return t("requirementScope.errors.invalidChange");
    case "CENTRAL_REQUIREMENT_SCOPE_NOT_FOUND":
    case "REQUIREMENT_SCOPE_ENDPOINT_NOT_FOUND":
    case "NOT_FOUND": return t("requirementScope.errors.notFound");
    case "FORBIDDEN": return t("requirementScope.errors.forbidden");
    default:
      return error instanceof Error && error.message.trim()
        ? error.message
        : t("requirementScope.errors.generic");
  }
}
