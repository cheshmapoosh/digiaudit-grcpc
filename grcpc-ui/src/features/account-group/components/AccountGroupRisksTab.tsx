import { centralRiskApi } from "@/features/risk/infra/centralRisk.api";
import type { AccountGroupRiskAssignment } from "../domain/centralAccountGroup.model";
import { centralAccountGroupApi } from "../infra/centralAccountGroup.api";
import CatalogRelationDraftTab, {
  type CatalogRelationDraftRow,
  type CatalogRelationDraftTabProps,
} from "@/shared/components/CatalogRelationDraftTab";

function toRow(assignment: AccountGroupRiskAssignment): CatalogRelationDraftRow {
  return {
    id: assignment.riskTemplateId,
    code: assignment.riskTemplateCode,
    title: assignment.riskTemplateTitle,
    targetStatus: assignment.riskTemplateStatus,
    status: assignment.status,
    validFrom: assignment.validFrom,
    validTo: assignment.validTo,
    relationId: assignment.assignmentId,
    version: assignment.version,
  };
}

const source: CatalogRelationDraftTabProps["source"] = {
  titleKey: "accountGroup.tabs.risks",
  pickerTitleKey: "accountGroup.riskAssignments.select",
  inactiveKey: "accountGroup.riskAssignments.inactive",
  errorMessage: (error, t) => error instanceof Error && error.message.trim()
    ? error.message
    : t("accountGroup.riskAssignments.loadError"),
  loadRows: async (id, signal) => (await centralAccountGroupApi.riskAssignments(id, signal)).map(toRow),
  loadOptions: async signal => {
    const [risks, categories] = await Promise.all([
      centralRiskApi.listTemplates(undefined, false, signal),
      centralRiskApi.listCategories(false, signal),
    ]);
    return {
      options: risks.map(risk => ({ ...risk, parentId: `category:${risk.riskCategoryId}` })),
      groups: categories.map(category => ({
        id: `category:${category.id}`,
        parentId: category.parentCategoryId ? `category:${category.parentCategoryId}` : null,
        code: category.code,
        name: category.title,
        selectable: false,
      })),
    };
  },
};

export default function AccountGroupRisksTab({ canonicalRows, ...props }:
  Omit<CatalogRelationDraftTabProps, "source" | "canonicalRows"> & {
    canonicalRows?: AccountGroupRiskAssignment[];
  }) {
  return <CatalogRelationDraftTab {...props} source={source} canonicalRows={canonicalRows?.map(toRow)} />;
}
