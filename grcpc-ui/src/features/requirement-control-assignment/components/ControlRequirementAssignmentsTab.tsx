import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, ObjectStatus } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { RequirementControlAssignment, RequirementControlAssignmentChange, AssignmentDraftRow, AssignmentDraftState, RequirementOption } from "../domain/requirementControlAssignment.model";
import { requirementControlAssignmentApi } from "../infra/requirementControlAssignment.api.repo";
import { useRequirementControlAssignmentPermissions } from "../security/requirementControlAssignmentPermissions";
import { requirementControlAssignmentErrorMessage } from "../utils/requirementControlAssignmentError";
import { centralRegulationApi } from "@/features/regulation/infra/centralRegulation.api";
import type { CentralRegulationGroupSummary, CentralRegulationSummary, CentralRegulationRequirementSummary } from "@/features/regulation/domain/centralRegulation.model";

const EMPTY_SELECTION = new Set<string>();
interface Props { controlId: string | null; readOnly: boolean; busy?: boolean; canonicalRows?: RequirementControlAssignment[] | null; onDraftStateChange?: (state: AssignmentDraftState) => void; }

function persisted(row: RequirementControlAssignment): AssignmentDraftRow { return { key: row.assignmentId, assignmentId: row.assignmentId, requirementId: row.requirementId, requirementCode: row.requirementCode, requirementTitle: row.requirementTitle, requirementStatus: row.requirementStatus, requirementValidFrom: row.requirementValidFrom, requirementValidTo: row.requirementValidTo, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row }; }
function normalize(row: AssignmentDraftRow): AssignmentDraftRow {
  return { ...row, editState: !row.original ? "DRAFT_NEW" : row.status === row.original.status && row.validFrom === row.original.validFrom && row.validTo === row.original.validTo ? "FINAL" : "DRAFT_EDITED" };
}
function changes(rows: AssignmentDraftRow[]): RequirementControlAssignmentChange[] {
  return rows.flatMap((row): RequirementControlAssignmentChange[] => {
    if (row.editState === "FINAL") return [];
    if (row.editState === "DRAFT_DELETE") return [{ operation: "DELETE", requirementId: row.requirementId, assignmentId: row.assignmentId, version: row.version }];
    if (!row.original || row.original.status === "DELETED") return [{ operation: "CREATE_OR_RESTORE", requirementId: row.requirementId, validFrom: row.validFrom, validTo: row.validTo }];
    const metadataChanged = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    return metadataChanged ? [{ operation: "UPDATE", requirementId: row.requirementId, assignmentId: row.assignmentId, version: row.version, validFrom: row.validFrom, validTo: row.validTo, requestedStatus: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" }]
      : [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", requirementId: row.requirementId, assignmentId: row.assignmentId, version: row.version }];
  });
}
export default function ControlRequirementAssignmentsTab({ controlId, readOnly, busy = false, canonicalRows, onDraftStateChange }: Props) {
  const { t } = useTranslation(); const permissions = useRequirementControlAssignmentPermissions();
  const [rows, setRows] = useState<AssignmentDraftRow[]>(() => canonicalRows?.map(persisted) ?? []);
  const [options, setOptions] = useState<RequirementOption[]>([]);
  const [groups, setGroups] = useState<CentralRegulationGroupSummary[]>([]);
  const [regulations, setRegulations] = useState<CentralRegulationSummary[]>([]);
  const [requirements, setRequirements] = useState<CentralRegulationRequirementSummary[]>([]);
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
      const [optionResponse, canonical, deleted, extra1, extra2, extra3] = await Promise.all([
        requirementControlAssignmentApi.options(signal), canonicalRows ? Promise.resolve(canonicalRows) : controlId ? requirementControlAssignmentApi.forControl(controlId, signal) : Promise.resolve([]),
        controlId ? requirementControlAssignmentApi.deletedForControl(controlId, signal) : Promise.resolve([]), centralRegulationApi.listGroups(), centralRegulationApi.listRegulations(), centralRegulationApi.listRequirements(),
      ]);
      if (current !== generation.current) return;
      setOptions(optionResponse.requirements); setRows([...canonical, ...deleted].map(persisted));
      setGroups(extra1); setRegulations(extra2); setRequirements(extra3);
      setLoaded(true); setError(null);
    } catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; if (current === generation.current) setError(requirementControlAssignmentErrorMessage(cause, t)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [controlId, permissions.view, t, canonicalRows]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const pending = useMemo(() => changes(rows), [rows]);
  const pendingDates = Object.values(dateDrafts).some(draft => draft.dirty);
  const invalid = Object.values(dateDrafts).some(draft => !draft.valid) || rows.some(row => row.editState !== "FINAL" && row.editState !== "DRAFT_DELETE" && Boolean(row.validFrom && row.validTo && row.validFrom > row.validTo));
  useEffect(() => onDraftStateChange?.({ changes: pending, dirty: pending.length > 0 || pickerOpen || pendingDates, ready: (loaded || !permissions.view) && !pickerOpen && !pendingDates && !invalid, invalid: Boolean(error) || invalid }), [pending, pickerOpen, pendingDates, invalid, loaded, error, permissions.view, onDraftStateChange]);
  const hasPendingDate = (key: string) => Boolean(dateDrafts[key + ":validFrom"]?.dirty || dateDrafts[key + ":validTo"]?.dirty);
  const visible = rows.filter(row => (hasPendingDate(row.key) || row.editState !== "FINAL" || row.status !== "DELETED" && (filter === "ALL" || row.status === filter)) && (hasPendingDate(row.key) || row.editState !== "FINAL" || (row.requirementCode + " " + row.requirementTitle).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const allOptions = useMemo(() => options, [options]);
  const nodes = useMemo(() => {
    const occupied = new Set(rows.filter(row => row.status !== "DELETED" && row.editState !== "DRAFT_DELETE").map(row => row.requirementId));
    const nodes: HierarchySelectionNode[] = groups.map(item => ({ id: `group:${item.id}`, parentId: item.parentGroupId ? `group:${item.parentGroupId}` : null, code: item.code, name: item.title, selectable: false }));
    regulations.forEach(item => nodes.push({ id: `regulation:${item.id}`, parentId: `group:${item.regulationGroupId}`, code: item.code, name: item.title, selectable: false }));
    options.forEach(item => nodes.push({ id: item.id, parentId: requirements.find(requirement => requirement.id === item.id)?.regulationId ? `regulation:${requirements.find(requirement => requirement.id === item.id)!.regulationId}` : null, code: item.code, name: item.title, selectable: item.status === "ACTIVE" && !occupied.has(item.id) }));
    return nodes;
  }, [options, rows, groups, regulations, requirements]);
  const confirmSelection = (ids: Set<string>) => {
    setRows(current => {
      const next = [...current];
      for (const id of ids) {
        const index = next.findIndex(row => row.requirementId === id);
        if (index >= 0) {
          const row = next[index];
          if (row.editState === "DRAFT_DELETE") next[index] = normalize(row);
          else if (row.original?.status === "DELETED" && permissions.restore) next[index] = normalize({ ...row, status: "ACTIVE" });
          continue;
        }
        const item = allOptions.find(option => option.id === id);
        if (item?.status !== "ACTIVE" || !permissions.create) continue;
        next.push({ key: `new:${item.id}`, assignmentId: null, requirementId: item.id, requirementCode: item.code, requirementTitle: item.title, requirementStatus: item.status, requirementValidFrom: item.validFrom, requirementValidTo: item.validTo, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
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
    { key: "code", header: t("catalogRelation.code"), cell: row => row.requirementCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.requirementTitle },
    { key: "endpointStatus", header: t("requirementControlAssignment.fields.endpointStatus"), cell: row => <ObjectStatus state={row.requirementStatus === "ACTIVE" ? "Positive" : "None"}>{t(`requirementControlAssignment.status.${row.requirementStatus}`)}</ObjectStatus> },
    { key: "endpointValidity", header: t("requirementControlAssignment.fields.endpointValidity"), cell: row => formatPersianDate(row.requirementValidFrom) + " – " + formatPersianDate(row.requirementValidTo) },
    ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: AssignmentDraftRow) => <CatalogRelationDate value={row[field]} label={t(`catalogRelation.${field}`)} editable={!readOnly && permissions.update && row.editState !== "DRAFT_DELETE"} disabled={busy || loading}
      onChange={value => updateDate(row.key, field, value)} onDraftStateChange={draft => reportDate(row.key + ":" + field, draft)} /> })),
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} draft={row.editState === "FINAL" ? null : row.editState === "DRAFT_DELETE" ? "delete" : !row.original || row.original.status === "DELETED" ? "new" : row.status !== row.original.status ? row.status === "ACTIVE" ? "active" : "inactive" : "edit"} /> },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("requirementControlAssignment.errors.forbidden")}</MessageStrip>;
  return <section>
    <CatalogRelationToolbar title={t("requirementControlAssignment.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} editable={!readOnly} busy={busy || loading}
      canSelect={loaded && (permissions.create || permissions.restore)} onSelect={() => setPickerOpen(true)} canActivate={affected("ACTIVE").length > 0} onActivate={() => batch("ACTIVE")}
      canInactivate={affected("INACTIVE").length > 0} onInactivate={() => batch("INACTIVE")} canDelete={affected("DELETED").length > 0} onDelete={() => batch("DELETED")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton onClick={() => void load()}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
    {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.key} accessibleName={t("requirementControlAssignment.title")} selectable={!readOnly} selectedKeys={selected} onSelectionChange={setSelected} loading={loading} busy={busy} emptyText={t("catalogRelation.empty")} />
    <HierarchyMultiSelectionDialog open={pickerOpen} title={t("catalogRelation.select")} searchAccessibleName={t("catalogRelation.search")} nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={loading} error={error}
      confirmDisabled={Boolean(error)} confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")} onConfirm={confirmSelection} onClose={() => setPickerOpen(false)} />
  </section>;
}
