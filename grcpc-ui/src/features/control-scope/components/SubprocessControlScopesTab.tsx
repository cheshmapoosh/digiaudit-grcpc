import { centralControlApi } from "@/features/control/infra/centralControl.api.repo";
import type { CentralControlGroupSummary, CentralControlSummary } from "@/features/control/domain/centralControl.model";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";

import type { CentralSubprocessControlScope, ControlScopeChange, ControlScopeDraftRow, ControlScopeDraftState } from "../domain/controlScope.model";
import { controlScopeApi } from "../infra/controlScope.api.repo";
import { useControlScopePermissions } from "../security/controlScopePermissions";
import { controlScopeErrorMessage } from "../utils/controlScopeError";


const EMPTY_SELECTION = new Set<string>();
interface Props { subprocessId: string | null; readOnly: boolean; busy?: boolean; canonicalRows?: CentralSubprocessControlScope[] | null; onDraftStateChange?: (state: ControlScopeDraftState) => void; }

function persisted(row: CentralSubprocessControlScope): ControlScopeDraftRow {
  return { key: row.id, scopeId: row.id, controlId: row.controlId, controlCode: row.controlCode, controlTitle: row.controlTitle, recommendedFrequencyCode: row.recommendedFrequencyCode, recommendedExecutionMethodCode: row.recommendedExecutionMethodCode, recommendedTestMethodCode: row.recommendedTestMethodCode, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row };
}
function normalize(row: ControlScopeDraftRow): ControlScopeDraftRow {
  return { ...row, editState: !row.original ? "DRAFT_NEW" : row.recommendedFrequencyCode === row.original.recommendedFrequencyCode && row.recommendedExecutionMethodCode === row.original.recommendedExecutionMethodCode && row.recommendedTestMethodCode === row.original.recommendedTestMethodCode && row.status === row.original.status && row.validFrom === row.original.validFrom && row.validTo === row.original.validTo ? "FINAL" : "DRAFT_EDITED" };
}
function changes(rows: ControlScopeDraftRow[]): ControlScopeChange[] {
  return rows.flatMap((row): ControlScopeChange[] => {
    if (row.editState === "FINAL") return [];
    if (row.editState === "DRAFT_PENDING_DELETE") return [{ operation: "DELETE", controlId: row.controlId, scopeId: row.scopeId, version: row.version }];
    if (!row.original || row.original.status === "DELETED") return [{ operation: "CREATE_OR_RESTORE", controlId: row.controlId, recommendedFrequencyCode: row.recommendedFrequencyCode, recommendedExecutionMethodCode: row.recommendedExecutionMethodCode, recommendedTestMethodCode: row.recommendedTestMethodCode, validFrom: row.validFrom, validTo: row.validTo }];
    const metadataChanged = row.recommendedFrequencyCode !== row.original.recommendedFrequencyCode || row.recommendedExecutionMethodCode !== row.original.recommendedExecutionMethodCode || row.recommendedTestMethodCode !== row.original.recommendedTestMethodCode || row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    return metadataChanged ? [{ operation: "UPDATE", controlId: row.controlId, scopeId: row.scopeId, version: row.version, recommendedFrequencyCode: row.recommendedFrequencyCode, recommendedExecutionMethodCode: row.recommendedExecutionMethodCode, recommendedTestMethodCode: row.recommendedTestMethodCode, validFrom: row.validFrom, validTo: row.validTo, requestedStatus: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" }]
      : [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", controlId: row.controlId, scopeId: row.scopeId, version: row.version }];
  });
}
export default function SubprocessControlScopesTab({ subprocessId, readOnly, busy = false, canonicalRows, onDraftStateChange }: Props) {
  const { t } = useTranslation(); const permissions = useControlScopePermissions();
  const [rows, setRows] = useState<ControlScopeDraftRow[]>(() => canonicalRows?.map(persisted) ?? []);
  const [options, setOptions] = useState<CentralControlSummary[]>([]);
  const [groups, setGroups] = useState<CentralControlGroupSummary[]>([]);
  const [loading, setLoading] = useState(true); const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++generation.current;
    if (!permissions.view) { setRows([]); setLoading(false); setLoaded(true); return; }
    setLoading(true); setLoaded(false);
    try {
      const [canonical, deleted, choices, groups] = await Promise.all([
        canonicalRows ? Promise.resolve(canonicalRows) : subprocessId ? controlScopeApi.listForSubprocess(subprocessId, "ALL", "", signal) : Promise.resolve([]),
        subprocessId ? controlScopeApi.deletedForSubprocess(subprocessId, signal) : Promise.resolve([]), controlScopeApi.eligibleControls(signal), centralControlApi.listGroups(),
      ]);
      if (current !== generation.current) return;
      setOptions(choices); setGroups(groups); setRows([...canonical, ...deleted].map(persisted));
      setLoaded(true); setError(null);
    } catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; if (current === generation.current) setError(controlScopeErrorMessage(cause, t)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [subprocessId, permissions.view, t, canonicalRows]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const pending = useMemo(() => changes(rows), [rows]);
  const invalid = rows.some(row => row.editState !== "FINAL" && row.editState !== "DRAFT_PENDING_DELETE" && Boolean(row.validFrom && row.validTo && row.validFrom > row.validTo));
  useEffect(() => onDraftStateChange?.({ changes: pending, dirty: pending.length > 0 || pickerOpen, ready: (loaded || !permissions.view) && !pickerOpen && !invalid, invalid: Boolean(error) || invalid }), [pending, pickerOpen, invalid, loaded, error, permissions.view, onDraftStateChange]);
  const visible = rows.filter(row => (row.editState !== "FINAL" || row.status !== "DELETED" && (filter === "ALL" || row.status === filter)) && (row.editState !== "FINAL" || (row.controlCode + " " + row.controlTitle).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const allOptions = useMemo(() => options, [options]);
  const nodes = useMemo(() => {
    const occupied = new Set(rows.filter(row => row.status !== "DELETED" && row.editState !== "DRAFT_PENDING_DELETE").map(row => row.controlId));
    const nodes: HierarchySelectionNode[] = groups.map(item => ({ id: `group:${item.id}`, parentId: item.parentGroupId ? `group:${item.parentGroupId}` : null, code: item.code, name: item.title, selectable: false }));
    options.forEach(item => nodes.push({ id: item.id, parentId: item.controlGroupId ? `group:${item.controlGroupId}` : null, code: item.code, name: item.title, selectable: item.status === "ACTIVE" && !occupied.has(item.id) }));
    return nodes;
  }, [options, rows, groups]);
  const confirmSelection = (ids: Set<string>) => {
    setRows(current => {
      const next = [...current];
      for (const id of ids) {
        const index = next.findIndex(row => row.controlId === id);
        if (index >= 0) {
          const row = next[index];
          if (row.editState === "DRAFT_PENDING_DELETE") next[index] = normalize(row);
          else if (row.original?.status === "DELETED" && permissions.restore) next[index] = normalize({ ...row, status: "ACTIVE" });
          continue;
        }
        const item = allOptions.find(option => option.id === id);
        if (item?.status !== "ACTIVE" || !permissions.create) continue;
        next.push({ key: `new:${item.id}`, scopeId: null, controlId: item.id, controlCode: item.code, controlTitle: item.title, recommendedFrequencyCode: null, recommendedExecutionMethodCode: null, recommendedTestMethodCode: null, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
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
    setRows(current => current.flatMap((row): ControlScopeDraftRow[] => {
      if (!keys.has(row.key)) return [row];
      if (status === "DELETED") return !row.original ? [] : row.original.status === "DELETED" ? [persisted(row.original)] : [{ ...row, editState: "DRAFT_PENDING_DELETE" }];
      return [normalize({ ...row, status })];
    }));
  };
  const columns: CatalogRelationColumn<ControlScopeDraftRow>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.controlCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.controlTitle },
    ...([
      ["recommendedFrequencyCode", "frequency", "control.operationFrequency"],
      ["recommendedExecutionMethodCode", "executionMethod", "control.automationType"],
      ["recommendedTestMethodCode", "testMethod", "control.testingTechnique"],
    ] as const).map(([field, label, translation]) => ({
      key: field, header: t(`controlScope.fields.${label}`),
      cell: (row: ControlScopeDraftRow) => row[field] ? t(`${translation}.${row[field]}`) : "—",
    })),
    ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: ControlScopeDraftRow) => <CatalogRelationDate value={row[field]} /> })),
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} draft={row.editState === "FINAL" ? null : row.editState === "DRAFT_PENDING_DELETE" ? "delete" : !row.original || row.original.status === "DELETED" ? "new" : row.status !== row.original.status ? row.status === "ACTIVE" ? "active" : "inactive" : "edit"} /> },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("controlScope.errors.forbidden")}</MessageStrip>;
  const title = t("process.tabs.controls");
  return <section>
    <CatalogRelationToolbar title={title} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} editable={!readOnly} busy={busy || loading}
      canSelect={loaded && (permissions.create || permissions.restore)} onSelect={() => setPickerOpen(true)} canActivate={affected("ACTIVE").length > 0} onActivate={() => batch("ACTIVE")}
      canInactivate={affected("INACTIVE").length > 0} onInactivate={() => batch("INACTIVE")} canDelete={affected("DELETED").length > 0} onDelete={() => batch("DELETED")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton onClick={() => void load()}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
    {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.key} accessibleName={title} selectable={!readOnly} selectedKeys={selected} onSelectionChange={setSelected} loading={loading} busy={busy} emptyText={t("catalogRelation.empty")} />
    <HierarchyMultiSelectionDialog open={pickerOpen} title={t("catalogRelation.select")} searchAccessibleName={t("catalogRelation.search")} nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={loading} error={error}
      confirmDisabled={Boolean(error)} confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")} onConfirm={confirmSelection} onClose={() => setPickerOpen(false)} />
  </section>;
}
