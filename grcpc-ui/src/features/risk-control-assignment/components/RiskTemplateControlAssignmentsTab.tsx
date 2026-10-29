import { useCallback } from "react";
import { ReferenceRelationTable } from "@/shared/components/ReferenceRelationTable";
import { riskControlAssignmentApi } from "../infra/riskControlAssignment.api.repo";
import { useRiskControlAssignmentPermissions } from "../security/riskControlAssignmentPermissions";

export default function RiskTemplateControlAssignmentsTab({ riskTemplateId }: { riskTemplateId: string }) {
  const permissions = useRiskControlAssignmentPermissions();
  const load = useCallback(async (signal: AbortSignal) => (await riskControlAssignmentApi.forRiskTemplate(riskTemplateId, signal)).map(row => ({
    id: row.assignmentId, code: row.controlCode, title: row.controlTitle,
    endpointStatus: row.controlStatus, endpointValidFrom: row.controlValidFrom, endpointValidTo: row.controlValidTo,
    status: row.status, validFrom: row.validFrom, validTo: row.validTo,
  })), [riskTemplateId]);
  return permissions.view ? <ReferenceRelationTable load={load} titleKey="riskControlAssignment.inverse.title" /> : null;
}
