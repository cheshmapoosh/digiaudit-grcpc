import { ObjectStatus } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

export function CatalogRelationStatus({ status, draft }: {
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  draft?: "new" | "active" | "inactive" | "delete" | "edit" | null;
}) {
  const { t } = useTranslation();
  const key = draft === "new" ? "draft" : draft === "active" ? "draftActive"
    : draft === "inactive" ? "draftInactive" : draft === "delete" ? "draftDelete"
    : draft === "edit" ? "draftEdit" : status === "ACTIVE" ? "active" : "inactive";
  return <ObjectStatus state={draft ? "Information" : status === "ACTIVE" ? "Positive" : "None"}>
    {t(`catalogRelation.${key}`)}
  </ObjectStatus>;
}
