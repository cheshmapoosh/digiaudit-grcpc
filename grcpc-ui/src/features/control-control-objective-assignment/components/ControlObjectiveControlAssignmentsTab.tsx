import { useCallback } from "react";
import { ReferenceRelationTable } from "@/shared/components/ReferenceRelationTable";
import { controlControlObjectiveAssignmentApi } from "../infra/controlControlObjectiveAssignment.api.repo";
import { useControlControlObjectiveAssignmentPermissions } from "../security/controlControlObjectiveAssignmentPermissions";

export default function ControlObjectiveControlAssignmentsTab({ controlObjectiveId }: { controlObjectiveId: string }) {
  const permissions = useControlControlObjectiveAssignmentPermissions();
  const load = useCallback(async (signal: AbortSignal) => (await controlControlObjectiveAssignmentApi.forControlObjective(controlObjectiveId, signal)).map(row => ({
    id: row.assignmentId, code: row.controlCode, title: row.controlTitle,
    endpointStatus: row.controlStatus, endpointValidFrom: row.controlValidFrom, endpointValidTo: row.controlValidTo,
    status: row.status, validFrom: row.validFrom, validTo: row.validTo,
  })), [controlObjectiveId]);
  return permissions.view ? <ReferenceRelationTable load={load} titleKey="controlControlObjectiveAssignment.inverse.title" /> : null;
}
