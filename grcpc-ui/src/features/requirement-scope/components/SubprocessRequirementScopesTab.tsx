import type { CentralRegulationGroupSummary, CentralRegulationSummary, CentralRegulationRequirementSummary } from "@/features/regulation/domain/centralRegulation.model";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MessageStrip } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";

import type { CentralSubprocessRequirementScope, RequirementScopeChange, RequirementScopeDraftRow, RequirementScopeDraftState } from "../domain/requirementScope.model";
import { requirementScopeApi } from "../infra/requirementScope.api.repo";
import { useRequirementScopePermissions } from "../security/requirementScopePermissions";
import { requirementScopeErrorMessage } from "../utils/requirementScopeError";


const EMPTY_SELECTION = new Set<string>();
interface Props { subprocessId: string | null; readOnly: boolean; busy?: boolean; canonicalRows?: CentralSubprocessRequirementScope[] | null; onDraftStateChange?: (state: RequirementScopeDraftState) => void; }

function persisted(row: CentralSubprocessRequirementScope): RequirementScopeDraftRow {
  return { key: row.id, scopeId: row.id, requirementId: row.requirementId, requirementCode: row.requirementCode, requirementTitle: row.requirementTitle, regulationId: row.regulationId, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row };
}
function normalize(row: RequirementScopeDraftRow): RequirementScopeDraftRow {
  return { ...row, editState: !row.original ? "DRAFT_NEW" : row.status === row.original.status && row.validFrom === row.original.validFrom && row.validTo === row.original.validTo ? "FINAL" : "DRAFT_EDITED" };
}
function changes(rows: RequirementScopeDraftRow[]): RequirementScopeChange[] {
  return rows.flatMap((row): RequirementScopeChange[] => {
    if (row.editState === "FINAL") return [];
    if (row.editState === "DRAFT_PENDING_DELETE") return [{ operation: "DELETE", requirementId: row.requirementId, scopeId: row.scopeId, version: row.version }];
    if (!row.original || row.original.status === "DELETED") return [{ operation: "CREATE_OR_RESTORE", requirementId: row.requirementId, validFrom: row.validFrom, validTo: row.validTo }];
    const metadataChanged = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    return metadataChanged ? [{ operation: "UPDATE", requirementId: row.requirementId, scopeId: row.scopeId, version: row.version, validFrom: row.validFrom, validTo: row.validTo, requestedStatus: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" }]
      : [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", requirementId: row.requirementId, scopeId: row.scopeId, version: row.version }];
  });
}
export default function SubprocessRequirementScopesTab({ subprocessId, readOnly, busy = false, canonicalRows, onDraftStateChange }: Props) {
  const { t } = useTranslation(); const permissions = useRequirementScopePermissions();
  const [rows, setRows] = useState<RequirementScopeDraftRow[]>(() => canonicalRows?.map(persisted) ?? []);
  const [options, setOptions] = useState<CentralRegulationRequirementSummary[]>([]);
  const [groups, setGroups] = useState<CentralRegulationGroupSummary[]>([]);
  const [regulations, setRegulations] = useState<CentralRegulationSummary[]>([]);
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
        requirementScopeApi.options(signal), canonicalRows ? Promise.resolve(canonicalRows) : subprocessId ? requirementScopeApi.listForSubprocess(subprocessId, "ALL", "", signal) : Promise.resolve([]),
        subprocessId ? requirementScopeApi.deletedForSubprocess(subprocessId, signal) : Promise.resolve([]),
      ]);
      if (current !== generation.current) return;
      setOptions(optionResponse.requirements); setGroups(optionResponse.regulationGroups); setRegulations(optionResponse.regulations); setRows([...canonical, ...deleted].map(persisted));
      setLoaded(true); setError(null);
    } catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; if (current === generation.current) setError(requirementScopeErrorMessage(cause, t)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [subprocessId, permissions.view, t, canonicalRows]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const pending = useMemo(() => changes(rows), [rows]);
  const pendingDates = Object.values(dateDrafts).some(draft => draft.dirty);
  const invalid = Object.values(dateDrafts).some(draft => !draft.valid) || rows.some(row => row.editState !== "FINAL" && row.editState !== "DRAFT_PENDING_DELETE" && Boolean(row.validFrom && row.validTo && row.validFrom > row.validTo));
  useEffect(() => onDraftStateChange?.({ changes: pending, dirty: pending.length > 0 || pickerOpen || pendingDates, ready: (loaded || !permissions.view) && !pickerOpen && !pendingDates && !invalid, invalid: Boolean(error) || invalid }), [pending, pickerOpen, pendingDates, invalid, loaded, error, permissions.view, onDraftStateChange]);
  const hasPendingDate = (key: string) => Boolean(dateDrafts[key + ":validFrom"]?.dirty || dateDrafts[key + ":validTo"]?.dirty);
  const visible = rows.filter(row => (hasPendingDate(row.key) || row.editState !== "FINAL" || row.status !== "DELETED" && (filter === "ALL" || row.status === filter)) && (hasPendingDate(row.key) || row.editState !== "FINAL" || (row.requirementCode + " " + row.requirementTitle).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const allOptions = useMemo(() => options, [options]);
  const nodes = useMemo(() => {
    const occupied = new Set(rows.filter(row => row.status !== "DELETED" && row.editState !== "DRAFT_PENDING_DELETE").map(row => row.requirementId));
    const nodes: HierarchySelectionNode[] = groups.map(item => ({ id: `group:${item.id}`, parentId: item.parentGroupId ? `group:${item.parentGroupId}` : null, code: item.code, name: item.title, selectable: false }));
    regulations.forEach(item => nodes.push({ id: `regulation:${item.id}`, parentId: `group:${item.regulationGroupId}`, code: item.code, name: item.title, selectable: false }));
    options.forEach(item => nodes.push({ id: item.id, parentId: `regulation:${item.regulationId}`, code: item.code, name: item.title, selectable: item.status === "ACTIVE" && !occupied.has(item.id) }));
    return nodes;
  }, [options, rows, groups, regulations]);
  const confirmSelection = (ids: Set<string>) => {
    setRows(current => {
      const next = [...current];
      for (const id of ids) {
        const index = next.findIndex(row => row.requirementId === id);
        if (index >= 0) {
          const row = next[index];
          if (row.editState === "DRAFT_PENDING_DELETE") next[index] = normalize(row);
          else if (row.original?.status === "DELETED" && permissions.restore) next[index] = normalize({ ...row, status: "ACTIVE" });
          continue;
        }
        const item = allOptions.find(option => option.id === id);
        if (item?.status !== "ACTIVE" || !permissions.create) continue;
        next.push({ key: `new:${item.id}`, scopeId: null, requirementId: item.id, requirementCode: item.code, requirementTitle: item.title, regulationId: item.regulationId, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
      }
      return next;
    });
    setPickerOpen(false);
  };
  const affected = (status: "ACTIVE" | "INACTIVE" | "DELETED") => rows.filter(row => selected.has(row.key) && (status === "DELETED"
    ? row.editState !== "DRAFT_PENDING_DELETE" && (row.original?.status !== "DELETED" ? Boolean(row.original ? permissions.delete : permissions.create) : permissions.restore)
    : Boolean(row.original && row.original.status !== "DELETED" && permissions.lifecycle && row.editState !== "DRAFT_PENDING_DELETE" && row.status !== status)));
  const batch = (status: "ACTIVE" | "INACTIVE" | "DELETED") => {
    const keys = new Set(affected(status).map(row => row.key));
    if (status === "DELETED") setDateDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => ![...keys].some(rowKey => key === rowKey + ":validFrom" || key === rowKey + ":validTo"))));
    setRows(current => current.flatMap((row): RequirementScopeDraftRow[] => {
      if (!keys.has(row.key)) return [row];
      if (status === "DELETED") return !row.original ? [] : row.original.status === "DELETED" ? [persisted(row.original)] : [{ ...row, editState: "DRAFT_PENDING_DELETE" }];
      return [normalize({ ...row, status })];
    }));
  };
  const updateDate = (key: string, field: "validFrom" | "validTo", value: string | null) => setRows(current => current.map(row => row.key === key ? normalize({ ...row, [field]: value }) : row));
  const reportDate = (key: string, draft: PersianDateDraftState) => setDateDrafts(current => {
    const previous = current[key]; if (previous?.dirty === draft.dirty && previous.valid === draft.valid && previous.draftValue === draft.draftValue) return current;
    return { ...current, [key]: draft };
  });
  const columns: CatalogRelationColumn<RequirementScopeDraftRow>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.requirementCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => <Link href={"/regulations?requirementId=" + row.requirementId} wrappingType="Normal">{row.requirementTitle}</Link> },
    ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: RequirementScopeDraftRow) => <CatalogRelationDate value={row[field]} label={t(`catalogRelation.${field}`)} editable={!readOnly && permissions.update && row.editState !== "DRAFT_PENDING_DELETE"} disabled={busy || loading}
      onChange={value => updateDate(row.key, field, value)} onDraftStateChange={draft => reportDate(row.key + ":" + field, draft)} /> })),
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} draft={row.editState === "FINAL" ? null : row.editState === "DRAFT_PENDING_DELETE" ? "delete" : !row.original || row.original.status === "DELETED" ? "new" : row.status !== row.original.status ? row.status === "ACTIVE" ? "active" : "inactive" : "edit"} /> },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("requirementScope.errors.forbidden")}</MessageStrip>;
  return <section>
    <CatalogRelationToolbar title={t("requirementScope.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} editable={!readOnly} busy={busy || loading}
      canSelect={loaded && (permissions.create || permissions.restore)} onSelect={() => setPickerOpen(true)} canActivate={affected("ACTIVE").length > 0} onActivate={() => batch("ACTIVE")}
      canInactivate={affected("INACTIVE").length > 0} onInactivate={() => batch("INACTIVE")} canDelete={affected("DELETED").length > 0} onDelete={() => batch("DELETED")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton onClick={() => void load()}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
    {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.key} accessibleName={t("requirementScope.title")} selectable={!readOnly} selectedKeys={selected} onSelectionChange={setSelected} loading={loading} busy={busy} emptyText={t("catalogRelation.empty")} />
    <HierarchyMultiSelectionDialog open={pickerOpen} title={t("catalogRelation.select")} searchAccessibleName={t("catalogRelation.search")} nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={loading} error={error}
      confirmDisabled={Boolean(error)} confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")} onConfirm={confirmSelection} onClose={() => setPickerOpen(false)} />
  </section>;
}
