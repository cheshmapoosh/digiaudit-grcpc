import { useCallback } from "react";
import { ReferenceRelationTable } from "@/shared/components/ReferenceRelationTable";
import { riskControlObjectiveAssignmentApi } from "../infra/riskControlObjectiveAssignment.api.repo";
import { useRiskControlObjectiveAssignmentPermissions } from "../security/riskControlObjectiveAssignmentPermissions";

export default function RiskTemplateControlObjectiveAssignmentsTab({ riskTemplateId }: { riskTemplateId: string }) {
  const permissions = useRiskControlObjectiveAssignmentPermissions();
  const load = useCallback(async (signal: AbortSignal) => (await riskControlObjectiveAssignmentApi.forRiskTemplate(riskTemplateId, signal)).map(row => ({
    id: row.assignmentId, code: row.controlObjectiveCode, title: row.controlObjectiveTitle, href: `/control-objectives/${row.controlObjectiveId}?tab=risks`,
    endpointStatus: row.controlObjectiveStatus, endpointValidFrom: row.controlObjectiveValidFrom, endpointValidTo: row.controlObjectiveValidTo,
    status: row.status, validFrom: row.validFrom, validTo: row.validTo,
  })), [riskTemplateId]);
  return permissions.view ? <ReferenceRelationTable load={load} titleKey="riskControlObjectiveAssignment.inverse.title" /> : null;
}
