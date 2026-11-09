import { centralControlApi } from "@/features/control/infra/centralControl.api.repo";
import { centralControlObjectiveApi } from "@/features/control-objective/infra/centralControlObjective.api";
import { riskControlAssignmentApi } from "@/features/risk-control-assignment/infra/riskControlAssignment.api.repo";
import { riskControlObjectiveAssignmentApi } from "@/features/risk-control-objective-assignment/infra/riskControlObjectiveAssignment.api.repo";
import type { CatalogRelationDraftTabProps } from "@/shared/components/CatalogRelationDraftTab";

export const riskTemplateControlsSource: CatalogRelationDraftTabProps["source"] = {
  titleKey: "risk.tabs.controls",
  pickerTitleKey: "risk.assignment.selectControls",
  inactiveKey: "centralAssignment.errors.endpointInactive",
  errorMessage: (_, t) => t("centralAssignment.errors.generic"),
  loadRows: async (id, signal) => (await riskControlAssignmentApi.forRiskTemplate(id, signal)).map(row => ({
    id: row.controlId, code: row.controlCode, title: row.controlTitle, targetStatus: row.controlStatus,
    status: row.status, validFrom: row.validFrom, validTo: row.validTo, relationId: row.assignmentId, version: row.version,
  })),
  loadOptions: async signal => {
    const [controls, groups] = await Promise.all([centralControlApi.list(signal), centralControlApi.listGroups(signal)]);
    return {
      options: controls.map(control => ({
        ...control,
        parentId: control.controlGroupId ? `group:${control.controlGroupId}` : null,
      })),
      groups: groups.map(group => ({
        id: `group:${group.id}`,
        parentId: group.parentGroupId ? `group:${group.parentGroupId}` : null,
        code: group.code, name: group.title, selectable: false,
      })),
    };
  },
};

export const riskTemplateControlObjectivesSource: CatalogRelationDraftTabProps["source"] = {
  titleKey: "risk.tabs.controlObjectives",
  pickerTitleKey: "risk.assignment.selectControlObjectives",
  inactiveKey: "centralAssignment.errors.endpointInactive",
  errorMessage: (_, t) => t("centralAssignment.errors.generic"),
  loadRows: async (id, signal) => (await riskControlObjectiveAssignmentApi.forRiskTemplate(id, signal)).map(row => ({
    id: row.controlObjectiveId, code: row.controlObjectiveCode, title: row.controlObjectiveTitle,
    targetStatus: row.controlObjectiveStatus, status: row.status, validFrom: row.validFrom, validTo: row.validTo,
    relationId: row.assignmentId, version: row.version,
  })),
  loadOptions: async signal => ({ options: await centralControlObjectiveApi.list(signal), groups: [] }),
};
