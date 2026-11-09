import CatalogRelationDraftTab, {
  type CatalogRelationDraftRow,
  type CatalogRelationDraftTabProps,
} from "@/shared/components/CatalogRelationDraftTab";
import { centralControlObjectiveApi } from "@/features/control-objective/infra/centralControlObjective.api";
import type { ControlObjectiveAccountGroupClassification } from "../domain/controlObjectiveAccountGroup.model";
import { controlObjectiveAccountGroupApi } from "../infra/controlObjectiveAccountGroup.api";
import { controlObjectiveAccountGroupErrorMessage } from "../utils/controlObjectiveAccountGroupError";

function toRow(row: ControlObjectiveAccountGroupClassification): CatalogRelationDraftRow {
  return {
    id: row.controlObjectiveId, code: row.controlObjectiveCode, title: row.controlObjectiveTitle,
    status: row.status, validFrom: row.validFrom, validTo: row.validTo,
    relationId: row.classificationId, version: row.version,
  };
}

const source: CatalogRelationDraftTabProps["source"] = {
  titleKey: "controlObjectiveAccountGroup.inverse.title",
  pickerTitleKey: "controlObjectiveAccountGroup.inverse.selectObjectives",
  inactiveKey: "controlObjectiveAccountGroup.errors.endpointInactive",
  errorMessage: controlObjectiveAccountGroupErrorMessage,
  loadRows: async (id, signal) => (await controlObjectiveAccountGroupApi.forAccountGroup(id, signal)).map(toRow),
  loadOptions: async signal => ({ options: await centralControlObjectiveApi.list(signal), groups: [] }),
};

export default function AccountGroupControlObjectivesTab({ canonicalRows, ...props }:
  Omit<CatalogRelationDraftTabProps, "source" | "canonicalRows"> & {
    canonicalRows?: ControlObjectiveAccountGroupClassification[];
  }) {
  return <CatalogRelationDraftTab {...props} source={source} canonicalRows={canonicalRows?.map(toRow)} />;
}
