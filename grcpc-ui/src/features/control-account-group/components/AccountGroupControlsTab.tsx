import CatalogRelationDraftTab, {
  type CatalogRelationDraftRow,
  type CatalogRelationDraftTabProps,
} from "@/shared/components/CatalogRelationDraftTab";
import { centralControlApi } from "@/features/control/infra/centralControl.api.repo";
import type { ControlAccountGroupClassification } from "../domain/controlAccountGroup.model";
import { controlAccountGroupApi } from "../infra/controlAccountGroup.api";
import { controlAccountGroupErrorMessage } from "../utils/controlAccountGroupError";

function toRow(row: ControlAccountGroupClassification): CatalogRelationDraftRow {
  return {
    id: row.controlId, code: row.controlCode, title: row.controlTitle,
    status: row.status, validFrom: row.validFrom, validTo: row.validTo,
    relationId: row.classificationId, version: row.version,
  };
}

const source: CatalogRelationDraftTabProps["source"] = {
  titleKey: "controlAccountGroup.inverse.title",
  pickerTitleKey: "controlAccountGroup.inverse.selectControls",
  inactiveKey: "controlAccountGroup.errors.endpointInactive",
  errorMessage: controlAccountGroupErrorMessage,
  loadRows: async (id, signal) => (await controlAccountGroupApi.forAccountGroup(id, signal)).map(toRow),
  loadOptions: async signal => {
    const [controls, groups] = await Promise.all([
      centralControlApi.list(signal), centralControlApi.listGroups(signal),
    ]);
    return {
      options: controls.map(control => ({
        ...control, parentId: control.controlGroupId ? `group:${control.controlGroupId}` : null,
      })),
      groups: groups.map(group => ({
        id: `group:${group.id}`, parentId: group.parentGroupId ? `group:${group.parentGroupId}` : null,
        code: group.code, name: group.title, selectable: false,
      })),
    };
  },
};

export default function AccountGroupControlsTab({ canonicalRows, ...props }:
  Omit<CatalogRelationDraftTabProps, "source" | "canonicalRows"> & {
    canonicalRows?: ControlAccountGroupClassification[];
  }) {
  return <CatalogRelationDraftTab {...props} source={source} canonicalRows={canonicalRows?.map(toRow)} />;
}
