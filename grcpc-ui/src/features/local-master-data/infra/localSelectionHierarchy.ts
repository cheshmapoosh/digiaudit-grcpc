import type { HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import { centralControlApi } from "@/features/control/infra/centralControl.api.repo";
import { centralControlObjectiveApi } from "@/features/control-objective/infra/centralControlObjective.api";
import { centralRiskApi } from "@/features/risk/infra/centralRisk.api";
import { centralRegulationApi } from "@/features/regulation/infra/centralRegulation.api";
import { centralPolicyApi } from "@/features/policy/infra/centralPolicy.api";
import type { OrganizationLocalSection } from "../domain/organizationLocal.model";

/** Display ancestry only; the owner table intersects leaves with the typed Local eligibility options. */
export async function loadLocalSelectionHierarchy(section: OrganizationLocalSection): Promise<HierarchySelectionNode[]> {
  if (section === "control-scopes") {
    const [groups, controls] = await Promise.all([centralControlApi.listGroups(), centralControlApi.list()]);
    return [
      ...groups.filter(row => row.status !== "DELETED").map(row => ({ id: `control-group:${row.id}`,
        parentId: row.parentGroupId ? `control-group:${row.parentGroupId}` : null,
        code: row.code, name: row.title, selectable: false })),
      ...controls.filter(row => row.status === "ACTIVE").map(row => ({ id: row.id,
        parentId: row.controlGroupId ? `control-group:${row.controlGroupId}` : null,
        code: row.code, name: row.title, selectable: true })),
    ];
  }
  if (section === "risk-scopes") {
    const [categories, risks] = await Promise.all([centralRiskApi.listCategories(), centralRiskApi.listTemplates()]);
    return [
      ...categories.filter(row => row.status !== "DELETED").map(row => ({ id: `risk-category:${row.id}`,
        parentId: row.parentCategoryId ? `risk-category:${row.parentCategoryId}` : null,
        code: row.code, name: row.title, selectable: false })),
      ...risks.filter(row => row.status === "ACTIVE").map(row => ({ id: row.id,
        parentId: `risk-category:${row.riskCategoryId}`, code: row.code, name: row.title, selectable: true })),
    ];
  }
  if (section === "control-objective-scopes") {
    const objectives = await centralControlObjectiveApi.list();
    return objectives.filter(row => row.status === "ACTIVE").map(row => ({ id: row.id,
      parentId: null, code: row.code, name: row.title, selectable: true }));
  }
  if (section === "requirement-scopes") {
    const [groups, regulations, requirements] = await Promise.all([
      centralRegulationApi.listGroups(), centralRegulationApi.listRegulations(), centralRegulationApi.listRequirements(),
    ]);
    return [
      ...groups.filter(row => row.status !== "DELETED").map(row => ({ id: `regulation-group:${row.id}`,
        parentId: row.parentGroupId ? `regulation-group:${row.parentGroupId}` : null,
        code: row.code, name: row.title, selectable: false })),
      ...regulations.filter(row => row.status !== "DELETED").map(row => ({ id: `regulation:${row.id}`,
        parentId: `regulation-group:${row.regulationGroupId}`, code: row.code, name: row.title, selectable: false })),
      ...requirements.filter(row => row.status === "ACTIVE").map(row => ({ id: row.id,
        parentId: `regulation:${row.regulationId}`, code: row.code, name: row.title, selectable: true })),
    ];
  }
  const [groups, policies] = await Promise.all([centralPolicyApi.listGroups(), centralPolicyApi.listPolicies()]);
  return [
    ...groups.filter(row => row.status !== "DELETED").map(row => ({ id: `policy-group:${row.id}`,
      parentId: row.parentGroupId ? `policy-group:${row.parentGroupId}` : null,
      code: row.code, name: row.title, selectable: false })),
    ...policies.filter(row => row.status === "ACTIVE").map(row => ({ id: row.id,
      parentId: `policy-group:${row.policyGroupId}`, code: row.code, name: row.title, selectable: true })),
  ];
}
