import type { TFunction } from "i18next";
import { HttpError } from "@/shared/infra/http.client";

export function riskScopeErrorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof HttpError ? error.code : undefined;
  switch (code) {
    case "DUPLICATE_RELATION": return error instanceof Error && error.message.trim()
      ? error.message
      : t("riskScope.errors.duplicate");
    case "RISK_SCOPE_DEPENDENCY_CONFLICT": return t("riskScope.errors.dependency");
    case "INVALID_LIFECYCLE_TRANSITION": return t("riskScope.errors.lifecycle");
    case "VERSION_CONFLICT": return t("riskScope.errors.version");
    case "RISK_SCOPE_ENDPOINT_NOT_ACTIVE": return t("riskScope.errors.endpointInactive");
    case "RISK_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS": return t("riskScope.errors.validityOutsideEndpoints");
    case "RISK_SCOPE_CHANGE_INVALID": return t("riskScope.errors.invalidChange");
    case "CENTRAL_RISK_SCOPE_NOT_FOUND":
    case "RISK_SCOPE_ENDPOINT_NOT_FOUND":
    case "NOT_FOUND": return t("riskScope.errors.notFound");
    case "FORBIDDEN": return t("riskScope.errors.forbidden");
    default:
      return error instanceof Error && error.message.trim()
        ? error.message
        : t("riskScope.errors.generic");
  }
}
