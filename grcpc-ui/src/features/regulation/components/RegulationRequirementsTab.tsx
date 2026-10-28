import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox, MessageStrip, Text } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import RequirementImportDialog from "./RequirementImportDialog";
import { CatalogRelationTable } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralRegulationRequirementSummary } from "../domain/centralRegulation.model";
import { changeRequirementStatus, regulationRequirementRows, requirementImportDrafts,
  type RegulationRequirementDraft, type RegulationRequirementStatus } from "../domain/regulationRequirementDrafts.model";
import type { RequirementImportRow } from "../domain/requirementImport.model";

interface Props {
  regulationId: string | null;
  regulationTitle: string;
  requirements: CentralRegulationRequirementSummary[];
  changes: RegulationRequirementDraft[];
  onChange: (changes: RegulationRequirementDraft[]) => void;
  busy: boolean;
  canImport: boolean;
  editable: boolean;
  onPendingChange: (pending: boolean) => void;
  onReadyChange: (ready: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** Structural child drafts join the Regulation's single aggregate Save. */
export default function RegulationRequirementsTab({ regulationId, regulationTitle, requirements, changes, onChange,
  busy, canImport, editable, onPendingChange, onReadyChange, onDirtyChange }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const rows = regulationRequirementRows(requirements, changes);
  const query = search.trim().toLocaleLowerCase();
  const displayed = rows.filter(row => row.change || (filter === "ALL" || row.status === filter)
    && (!query || `${row.code} ${row.title}`.toLocaleLowerCase().includes(query)));
  const checked = displayed.filter(row => selected.has(row.key));
  const affected = (status: RegulationRequirementStatus) => checked.filter(row => row.status !== status
    && (status === "DELETED" || row.original && row.original.status !== "DELETED"));
  const reservedCodes = [...new Set([
    ...requirements.map(row => row.code), ...changes.filter(change => change.operation === "CREATE").map(change => change.code),
  ])];
  const seenCodes = new Set(requirements.map(row => row.code.trim()));
  const invalid = changes.some(change => {
    if (change.operation !== "CREATE") return !change.requirementId || change.version === undefined;
    const code = change.code.trim();
    const duplicate = seenCodes.has(code); seenCodes.add(code);
    return duplicate || !code || !change.title.trim() || Boolean(change.validFrom && change.validTo && change.validFrom > change.validTo);
  });
  const pending = importOpen;
  const ready = !pending && !invalid;
  const dirty = pending || changes.length > 0;
  useEffect(() => { onPendingChange(pending); }, [onPendingChange, pending]);
  useEffect(() => { onReadyChange(ready); }, [onReadyChange, ready]);
  useEffect(() => { onDirtyChange(dirty); }, [onDirtyChange, dirty]);
  useEffect(() => () => { onPendingChange(false); onReadyChange(true); onDirtyChange(false); }, [onPendingChange, onReadyChange, onDirtyChange]);

  const changeStatus = (status: RegulationRequirementStatus) => {
    if (!editable || busy || pending) return;
    const affectedRows = affected(status);
    const keys = new Set(affectedRows.map(row => row.key));
    const next = changes.filter(change => !keys.has(change.key));
    for (const row of affectedRows) {
      const change = changeRequirementStatus(row, status);
      if (change) next.push(change);
    }
    onChange(next);
    if (status === "DELETED") setSelected(previous => new Set([...previous].filter(key => !keys.has(key))));
  };
  const stageImport = (imported: RequirementImportRow[]) => {
    if (!editable || busy || !regulationId || !canImport) return;
    onChange([...changes, ...requirementImportDrafts(imported)]);
    setImportOpen(false);
  };
  return <FlexBox direction="Column" className="regulationRequirementsTab">
    <CatalogRelationToolbar title={t("regulation.tabs.requirements")} search={search} onSearch={setSearch}
      filter={filter} onFilter={setFilter} editable={editable} busy={busy || pending}
      selectionAction={canImport ? <CatalogActionButton design="Emphasized" icon="excel-attachment"
        disabled={busy || pending || !editable || !regulationId} onClick={() => setImportOpen(true)}>{t("regulation.import.action")}</CatalogActionButton> : null}
      canActivate={affected("ACTIVE").length > 0} canInactivate={affected("INACTIVE").length > 0}
      canDelete={affected("DELETED").length > 0} onActivate={() => changeStatus("ACTIVE")}
      onInactivate={() => changeStatus("INACTIVE")} onDelete={() => changeStatus("DELETED")} />
    {changes.length ? <MessageStrip design="Information" hideCloseButton>{t("regulation.requirements.draftHint")}</MessageStrip> : null}
    {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("regulation.requirements.invalidDraft")}</MessageStrip> : null}
    <CatalogRelationTable rows={displayed} rowKey={row => row.key} accessibleName={t("regulation.tabs.requirements")}
      busy={busy || pending} emptyText={t("regulation.import.emptyList")} selectable={editable} selectedKeys={selected} onSelectionChange={setSelected}
      columns={[
        { key: "code", header: t("regulation.import.fields.code"), cell: row => <Text>{row.code}</Text> },
        { key: "title", header: t("regulation.import.fields.title"), cell: row => <Text>{row.title}</Text> },
        { key: "status", header: t("regulation.fields.status"), cell: row => <CatalogRelationStatus status={row.status}
          draft={!row.change ? null : row.change.operation === "DELETE" ? "delete" : row.change.operation === "INACTIVATE" ? "inactive" : "active"} /> },
        { key: "validFrom", header: t("regulation.fields.validFrom"), cell: row => formatPersianDate(row.validFrom) },
        { key: "validTo", header: t("regulation.fields.validTo"), cell: row => formatPersianDate(row.validTo) },
      ]} />
    {importOpen && regulationId ? <RequirementImportDialog regulationId={regulationId} regulationTitle={regulationTitle}
      reservedCodes={reservedCodes} onClose={() => setImportOpen(false)} onStaged={stageImport} /> : null}
  </FlexBox>;
}
