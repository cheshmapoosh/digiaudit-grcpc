import { useCallback } from "react";
import { ReferenceRelationTable } from "@/shared/components/ReferenceRelationTable";
import { requirementControlAssignmentApi } from "../infra/requirementControlAssignment.api.repo";
import { useRequirementControlAssignmentPermissions } from "../security/requirementControlAssignmentPermissions";

export default function RequirementControlAssignmentsTab({ requirementId }: { requirementId: string }) {
  const permissions = useRequirementControlAssignmentPermissions();
  const load = useCallback(async (signal: AbortSignal) => (await requirementControlAssignmentApi.forRequirement(requirementId, signal)).map(row => ({
    id: row.assignmentId, code: row.controlCode, title: row.controlTitle,
    endpointStatus: row.controlStatus, endpointValidFrom: row.controlValidFrom, endpointValidTo: row.controlValidTo,
    status: row.status, validFrom: row.validFrom, validTo: row.validTo,
  })), [requirementId]);
  return permissions.view ? <ReferenceRelationTable load={load} titleKey="requirementControlAssignment.inverse.title" /> : null;
}
