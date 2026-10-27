import type { TFunction } from "i18next";
import { HttpError } from "@/shared/infra/http.client";
export function requirementControlAssignmentErrorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof HttpError ? error.code : undefined;
  const keys: Record<string, string> = { DUPLICATE_RELATION: "duplicate", VERSION_CONFLICT: "version", INVALID_LIFECYCLE_TRANSITION: "lifecycle", REQUIREMENT_CONTROL_ASSIGNMENT_ENDPOINT_NOT_ACTIVE: "endpointInactive", REQUIREMENT_CONTROL_ASSIGNMENT_CHANGE_INVALID: "invalidChange", CENTRAL_REQUIREMENT_CONTROL_ASSIGNMENT_NOT_FOUND: "notFound", REQUIREMENT_CONTROL_ASSIGNMENT_ENDPOINT_NOT_FOUND: "notFound", FORBIDDEN: "forbidden" };
  return keys[code ?? ""] ? t(`requirementControlAssignment.errors.${keys[code ?? ""]}`) : error instanceof Error && error.message.trim() ? error.message : t("requirementControlAssignment.errors.generic");
}
