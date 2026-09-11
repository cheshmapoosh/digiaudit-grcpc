import type { TFunction } from "i18next";

export function controlObjectiveAccountGroupErrorMessage(error: unknown, t: TFunction): string {
  const candidate = error as { code?: string; message?: string } | null;
  const code = candidate?.code ?? candidate?.message;
  const keys: Record<string, string> = {
    DUPLICATE_RELATION: "duplicate",
    VERSION_CONFLICT: "version",
    INVALID_LIFECYCLE_TRANSITION: "lifecycle",
    CONTROL_OBJECTIVE_ACCOUNT_GROUP_ENDPOINT_NOT_ACTIVE: "endpointInactive",
    CONTROL_OBJECTIVE_ACCOUNT_GROUP_CHANGE_INVALID: "invalidChange",
    CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_NOT_FOUND: "notFound",
    CONTROL_OBJECTIVE_ACCOUNT_GROUP_ENDPOINT_NOT_FOUND: "notFound",
    FORBIDDEN: "forbidden",
  };
  if (code && keys[code]) return t(`controlObjectiveAccountGroup.errors.${keys[code]}`);
  if (error instanceof Error && error.message.trim()) return error.message;
  return t("controlObjectiveAccountGroup.errors.generic");
}
