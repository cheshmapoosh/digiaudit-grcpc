import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, ObjectStatus } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { HierarchyMultiSelectionDialog } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { ControlControlObjectiveAssignment, ControlControlObjectiveAssignmentChange, AssignmentDraftRow, AssignmentDraftState, ControlObjectiveOption } from "../domain/controlControlObjectiveAssignment.model";
import { controlControlObjectiveAssignmentApi } from "../infra/controlControlObjectiveAssignment.api.repo";
import { useControlControlObjectiveAssignmentPermissions } from "../security/controlControlObjectiveAssignmentPermissions";
import { controlControlObjectiveAssignmentErrorMessage } from "../utils/controlControlObjectiveAssignmentError";


const EMPTY_SELECTION = new Set<string>();
interface Props { controlId: string | null; readOnly: boolean; busy?: boolean; canonicalRows?: ControlControlObjectiveAssignment[] | null; onDraftStateChange?: (state: AssignmentDraftState) => void; }

function persisted(row: ControlControlObjectiveAssignment): AssignmentDraftRow { return { key: row.assignmentId, assignmentId: row.assignmentId, controlObjectiveId: row.controlObjectiveId, controlObjectiveCode: row.controlObjectiveCode, controlObjectiveTitle: row.controlObjectiveTitle, controlObjectiveStatus: row.controlObjectiveStatus, controlObjectiveValidFrom: row.controlObjectiveValidFrom, controlObjectiveValidTo: row.controlObjectiveValidTo, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row }; }
function normalize(row: AssignmentDraftRow): AssignmentDraftRow {
  return { ...row, editState: !row.original ? "DRAFT_NEW" : row.status === row.original.status && row.validFrom === row.original.validFrom && row.validTo === row.original.validTo ? "FINAL" : "DRAFT_EDITED" };
}
function changes(rows: AssignmentDraftRow[]): ControlControlObjectiveAssignmentChange[] {
  return rows.flatMap((row): ControlControlObjectiveAssignmentChange[] => {
    if (row.editState === "FINAL") return [];
    if (row.editState === "DRAFT_DELETE") return [{ operation: "DELETE", controlObjectiveId: row.controlObjectiveId, assignmentId: row.assignmentId, version: row.version }];
    if (!row.original || row.original.status === "DELETED") return [{ operation: "CREATE_OR_RESTORE", controlObjectiveId: row.controlObjectiveId, validFrom: row.validFrom, validTo: row.validTo }];
    const metadataChanged = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    return metadataChanged ? [{ operation: "UPDATE", controlObjectiveId: row.controlObjectiveId, assignmentId: row.assignmentId, version: row.version, validFrom: row.validFrom, validTo: row.validTo, requestedStatus: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" }]
      : [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", controlObjectiveId: row.controlObjectiveId, assignmentId: row.assignmentId, version: row.version }];
  });
}
export default function ControlControlObjectiveAssignmentsTab({ controlId, readOnly, busy = false, canonicalRows, onDraftStateChange }: Props) {
  const { t } = useTranslation(); const permissions = useControlControlObjectiveAssignmentPermissions();
  const [rows, setRows] = useState<AssignmentDraftRow[]>(() => canonicalRows?.map(persisted) ?? []);
  const [options, setOptions] = useState<ControlObjectiveOption[]>([]);

  const [loading, setLoading] = useState(true); const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dateDrafts, setDateDrafts] = useState<Record<string, PersianDateDraftState>>({});
  const generation = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++generation.current;
    if (!permissions.view) { setRows([]); setLoading(false); setLoaded(true); return; }
    setLoading(true); setLoaded(false);
    try {
      const [optionResponse, canonical, deleted] = await Promise.all([
        controlControlObjectiveAssignmentApi.options(signal), canonicalRows ? Promise.resolve(canonicalRows) : controlId ? controlControlObjectiveAssignmentApi.forControl(controlId, signal) : Promise.resolve([]),
        controlId ? controlControlObjectiveAssignmentApi.deletedForControl(controlId, signal) : Promise.resolve([]),
      ]);
      if (current !== generation.current) return;
      setOptions(optionResponse.controlObjectives); setRows([...canonical, ...deleted].map(persisted));

      setLoaded(true); setError(null);
    } catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; if (current === generation.current) setError(controlControlObjectiveAssignmentErrorMessage(cause, t)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [controlId, permissions.view, t, canonicalRows]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const pending = useMemo(() => changes(rows), [rows]);
  const pendingDates = Object.values(dateDrafts).some(draft => draft.dirty);
  const invalid = Object.values(dateDrafts).some(draft => !draft.valid) || rows.some(row => row.editState !== "FINAL" && row.editState !== "DRAFT_DELETE" && Boolean(row.validFrom && row.validTo && row.validFrom > row.validTo));
  useEffect(() => onDraftStateChange?.({ changes: pending, dirty: pending.length > 0 || pickerOpen || pendingDates, ready: (loaded || !permissions.view) && !pickerOpen && !pendingDates && !invalid, invalid: Boolean(error) || invalid }), [pending, pickerOpen, pendingDates, invalid, loaded, error, permissions.view, onDraftStateChange]);
  const hasPendingDate = (key: string) => Boolean(dateDrafts[key + ":validFrom"]?.dirty || dateDrafts[key + ":validTo"]?.dirty);
  const visible = rows.filter(row => (hasPendingDate(row.key) || row.editState !== "FINAL" || row.status !== "DELETED" && (filter === "ALL" || row.status === filter)) && (hasPendingDate(row.key) || row.editState !== "FINAL" || (row.controlObjectiveCode + " " + row.controlObjectiveTitle).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const allOptions = useMemo(() => options, [options]);
  const nodes = useMemo(() => {
    const occupied = new Set(rows.filter(row => row.status !== "DELETED" && row.editState !== "DRAFT_DELETE").map(row => row.controlObjectiveId));
    return options.map(item => ({ id: item.id, parentId: null, code: item.code, name: item.title, selectable: item.status === "ACTIVE" && !occupied.has(item.id) }));
  }, [options, rows]);
  const confirmSelection = (ids: Set<string>) => {
    setRows(current => {
      const next = [...current];
      for (const id of ids) {
        const index = next.findIndex(row => row.controlObjectiveId === id);
        if (index >= 0) {
          const row = next[index];
          if (row.editState === "DRAFT_DELETE") next[index] = normalize(row);
          else if (row.original?.status === "DELETED" && permissions.restore) next[index] = normalize({ ...row, status: "ACTIVE" });
          continue;
        }
        const item = allOptions.find(option => option.id === id);
        if (item?.status !== "ACTIVE" || !permissions.create) continue;
        next.push({ key: `new:${item.id}`, assignmentId: null, controlObjectiveId: item.id, controlObjectiveCode: item.code, controlObjectiveTitle: item.title, controlObjectiveStatus: item.status, controlObjectiveValidFrom: item.validFrom, controlObjectiveValidTo: item.validTo, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
      }
      return next;
    });
    setPickerOpen(false);
  };
  const affected = (status: "ACTIVE" | "INACTIVE" | "DELETED") => rows.filter(row => selected.has(row.key) && (status === "DELETED"
    ? row.editState !== "DRAFT_DELETE" && (row.original?.status !== "DELETED" ? Boolean(row.original ? permissions.delete : permissions.create) : permissions.restore)
    : Boolean(row.original && row.original.status !== "DELETED" && permissions.lifecycle && row.editState !== "DRAFT_DELETE" && row.status !== status)));
  const batch = (status: "ACTIVE" | "INACTIVE" | "DELETED") => {
    const keys = new Set(affected(status).map(row => row.key));
    if (status === "DELETED") setDateDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => ![...keys].some(rowKey => key === rowKey + ":validFrom" || key === rowKey + ":validTo"))));
    setRows(current => current.flatMap((row): AssignmentDraftRow[] => {
      if (!keys.has(row.key)) return [row];
      if (status === "DELETED") return !row.original ? [] : row.original.status === "DELETED" ? [persisted(row.original)] : [{ ...row, editState: "DRAFT_DELETE" }];
      return [normalize({ ...row, status })];
    }));
  };
  const updateDate = (key: string, field: "validFrom" | "validTo", value: string | null) => setRows(current => current.map(row => row.key === key ? normalize({ ...row, [field]: value }) : row));
  const reportDate = (key: string, draft: PersianDateDraftState) => setDateDrafts(current => {
    const previous = current[key]; if (previous?.dirty === draft.dirty && previous.valid === draft.valid && previous.draftValue === draft.draftValue) return current;
    return { ...current, [key]: draft };
  });
  const columns: CatalogRelationColumn<AssignmentDraftRow>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.controlObjectiveCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.controlObjectiveTitle },
    { key: "endpointStatus", header: t("controlControlObjectiveAssignment.fields.endpointStatus"), cell: row => <ObjectStatus state={row.controlObjectiveStatus === "ACTIVE" ? "Positive" : "None"}>{t(`controlControlObjectiveAssignment.status.${row.controlObjectiveStatus}`)}</ObjectStatus> },
    { key: "endpointValidity", header: t("controlControlObjectiveAssignment.fields.endpointValidity"), cell: row => formatPersianDate(row.controlObjectiveValidFrom) + " – " + formatPersianDate(row.controlObjectiveValidTo) },
    ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: AssignmentDraftRow) => <CatalogRelationDate value={row[field]} label={t(`catalogRelation.${field}`)} editable={!readOnly && permissions.update && row.editState !== "DRAFT_DELETE"} disabled={busy || loading}
      onChange={value => updateDate(row.key, field, value)} onDraftStateChange={draft => reportDate(row.key + ":" + field, draft)} /> })),
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} draft={row.editState === "FINAL" ? null : row.editState === "DRAFT_DELETE" ? "delete" : !row.original || row.original.status === "DELETED" ? "new" : row.status !== row.original.status ? row.status === "ACTIVE" ? "active" : "inactive" : "edit"} /> },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("controlControlObjectiveAssignment.errors.forbidden")}</MessageStrip>;
  return <section>
    <CatalogRelationToolbar title={t("controlControlObjectiveAssignment.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} editable={!readOnly} busy={busy || loading}
      canSelect={loaded && (permissions.create || permissions.restore)} onSelect={() => setPickerOpen(true)} canActivate={affected("ACTIVE").length > 0} onActivate={() => batch("ACTIVE")}
      canInactivate={affected("INACTIVE").length > 0} onInactivate={() => batch("INACTIVE")} canDelete={affected("DELETED").length > 0} onDelete={() => batch("DELETED")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton onClick={() => void load()}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
    {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.key} accessibleName={t("controlControlObjectiveAssignment.title")} selectable={!readOnly} selectedKeys={selected} onSelectionChange={setSelected} loading={loading} busy={busy} emptyText={t("catalogRelation.empty")} />
    <HierarchyMultiSelectionDialog open={pickerOpen} title={t("catalogRelation.select")} searchAccessibleName={t("catalogRelation.search")} nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={loading} error={error}
      confirmDisabled={Boolean(error)} confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")} onConfirm={confirmSelection} onClose={() => setPickerOpen(false)} />
  </section>;
}
