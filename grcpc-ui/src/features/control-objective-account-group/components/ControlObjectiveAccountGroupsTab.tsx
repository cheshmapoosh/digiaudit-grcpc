import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MessageStrip } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { HierarchyMultiSelectionDialog } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { ControlObjectiveAccountGroupClassification, ControlObjectiveAccountGroupChange, ControlObjectiveClassificationDraftRow, ControlObjectiveClassificationDraftState, ControlObjectiveAccountGroupOption } from "../domain/controlObjectiveAccountGroup.model";
import { controlObjectiveAccountGroupApi } from "../infra/controlObjectiveAccountGroup.api";
import { useControlObjectiveAccountGroupPermissions } from "../security/controlObjectiveAccountGroupPermissions";
import { controlObjectiveAccountGroupErrorMessage } from "../utils/controlObjectiveAccountGroupError";


const EMPTY_SELECTION = new Set<string>();
interface Props { controlObjectiveId: string | null; readOnly: boolean; busy?: boolean; onDraftStateChange?: (state: ControlObjectiveClassificationDraftState) => void; adoptedCanonical?: ControlObjectiveAccountGroupClassification[] | null; allowAccountGroupNavigation?: boolean; }
function flatten(nodes: ControlObjectiveAccountGroupOption[]): ControlObjectiveAccountGroupOption[] { return nodes.flatMap(node => [node, ...flatten(node.children)]); }
function persisted(
  row: ControlObjectiveAccountGroupClassification,
): ControlObjectiveClassificationDraftRow {
  return {
    key: row.classificationId,
    classificationId: row.classificationId,
    accountGroupId: row.accountGroupId,
    accountGroupCode: row.accountGroupCode,
    accountGroupTitle: row.accountGroupTitle,
    parentAccountGroupId: row.parentAccountGroupId,
    accountGroupStatus: row.accountGroupStatus,
    status: row.status,
    validFrom: row.validFrom,
    validTo: row.validTo,
    version: row.version,
    editState: "FINAL",
    original: row,
  };
}

function normalize(row: ControlObjectiveClassificationDraftRow): ControlObjectiveClassificationDraftRow {
  return { ...row, editState: !row.original ? "DRAFT_NEW" : row.status === row.original.status && row.validFrom === row.original.validFrom && row.validTo === row.original.validTo ? "FINAL" : "DRAFT_EDITED" };
}
function changes(rows: ControlObjectiveClassificationDraftRow[]): ControlObjectiveAccountGroupChange[] {
  return rows.flatMap((row): ControlObjectiveAccountGroupChange[] => {
    if (row.editState === "FINAL") return [];
    if (row.editState === "DRAFT_DELETE") return [{ operation: "DELETE", accountGroupId: row.accountGroupId, classificationId: row.classificationId, version: row.version }];
    if (!row.original || row.original.status === "DELETED") return [{ operation: "CREATE_OR_RESTORE", accountGroupId: row.accountGroupId, validFrom: row.validFrom, validTo: row.validTo }];
    const metadataChanged = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    return metadataChanged ? [{ operation: "UPDATE", accountGroupId: row.accountGroupId, classificationId: row.classificationId, version: row.version, validFrom: row.validFrom, validTo: row.validTo, requestedStatus: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" }]
      : [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", accountGroupId: row.accountGroupId, classificationId: row.classificationId, version: row.version }];
  });
}
export default function ControlObjectiveAccountGroupsTab({ controlObjectiveId, readOnly, busy = false, onDraftStateChange, adoptedCanonical, allowAccountGroupNavigation = true }: Props) {
  const { t } = useTranslation(); const permissions = useControlObjectiveAccountGroupPermissions();
  const [rows, setRows] = useState<ControlObjectiveClassificationDraftRow[]>(() => adoptedCanonical?.map(persisted) ?? []);
  const [options, setOptions] = useState<ControlObjectiveAccountGroupOption[]>([]);

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
        controlObjectiveAccountGroupApi.options(signal), adoptedCanonical ? Promise.resolve(adoptedCanonical) : controlObjectiveId ? controlObjectiveAccountGroupApi.forControlObjective(controlObjectiveId, signal) : Promise.resolve([]),
        controlObjectiveId ? controlObjectiveAccountGroupApi.deletedForControlObjective(controlObjectiveId, signal) : Promise.resolve([]),
      ]);
      if (current !== generation.current) return;
      setOptions(optionResponse.accountGroups); setRows([...canonical, ...deleted].map(persisted));

      setLoaded(true); setError(null);
    } catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; if (current === generation.current) setError(controlObjectiveAccountGroupErrorMessage(cause, t)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [controlObjectiveId, permissions.view, t, adoptedCanonical]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { if (!adoptedCanonical) return; const timer = window.setTimeout(() => { setRows(adoptedCanonical.map(persisted)); setDateDrafts({}); }, 0); return () => window.clearTimeout(timer); }, [adoptedCanonical]);
  const pending = useMemo(() => changes(rows), [rows]);
  const pendingDates = Object.values(dateDrafts).some(draft => draft.dirty);
  const invalid = Object.values(dateDrafts).some(draft => !draft.valid) || rows.some(row => row.editState !== "FINAL" && row.editState !== "DRAFT_DELETE" && Boolean(row.validFrom && row.validTo && row.validFrom > row.validTo));
  useEffect(() => onDraftStateChange?.({ changes: pending, dirty: pending.length > 0 || pickerOpen || pendingDates, ready: (loaded || !permissions.view) && !pickerOpen && !pendingDates && !invalid, invalid: Boolean(error) || invalid }), [pending, pickerOpen, pendingDates, invalid, loaded, error, permissions.view, onDraftStateChange]);
  const hasPendingDate = (key: string) => Boolean(dateDrafts[key + ":validFrom"]?.dirty || dateDrafts[key + ":validTo"]?.dirty);
  const visible = rows.filter(row => (hasPendingDate(row.key) || row.editState !== "FINAL" || row.status !== "DELETED" && (filter === "ALL" || row.status === filter)) && (hasPendingDate(row.key) || row.editState !== "FINAL" || (row.accountGroupCode + " " + row.accountGroupTitle).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const allOptions = useMemo(() => flatten(options), [options]);
  const nodes = useMemo(() => {
    const occupied = new Set(rows.filter(row => row.status !== "DELETED" && row.editState !== "DRAFT_DELETE").map(row => row.accountGroupId));
    return allOptions.map(item => ({ id: item.id, parentId: item.parentAccountGroupId, code: item.code, name: item.title, selectable: item.status === "ACTIVE" && !occupied.has(item.id) }));
  }, [rows, allOptions]);
  const confirmSelection = (ids: Set<string>) => {
    setRows(current => {
      const next = [...current];
      for (const id of ids) {
        const index = next.findIndex(row => row.accountGroupId === id);
        if (index >= 0) {
          const row = next[index];
          if (row.editState === "DRAFT_DELETE") next[index] = normalize(row);
          else if (row.original?.status === "DELETED" && permissions.restore) next[index] = normalize({ ...row, status: "ACTIVE" });
          continue;
        }
        const item = allOptions.find(option => option.id === id);
        if (item?.status !== "ACTIVE" || !permissions.create) continue;
        next.push({ key: `new:${item.id}`, classificationId: null, accountGroupId: item.id, accountGroupCode: item.code, accountGroupTitle: item.title, parentAccountGroupId: item.parentAccountGroupId, accountGroupStatus: item.status, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
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
    setRows(current => current.flatMap((row): ControlObjectiveClassificationDraftRow[] => {
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
  const columns: CatalogRelationColumn<ControlObjectiveClassificationDraftRow>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.accountGroupCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => allowAccountGroupNavigation ? <Link href={"/account-groups"} wrappingType="Normal">{row.accountGroupTitle}</Link> : row.accountGroupTitle },

    ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: ControlObjectiveClassificationDraftRow) => <CatalogRelationDate value={row[field]} label={t(`catalogRelation.${field}`)} editable={!readOnly && permissions.update && row.editState !== "DRAFT_DELETE"} disabled={busy || loading}
      onChange={value => updateDate(row.key, field, value)} onDraftStateChange={draft => reportDate(row.key + ":" + field, draft)} /> })),
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} draft={row.editState === "FINAL" ? null : row.editState === "DRAFT_DELETE" ? "delete" : !row.original || row.original.status === "DELETED" ? "new" : row.status !== row.original.status ? row.status === "ACTIVE" ? "active" : "inactive" : "edit"} /> },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("controlObjectiveAccountGroup.errors.forbidden")}</MessageStrip>;
  return <section>
    <CatalogRelationToolbar title={t("controlObjectiveAccountGroup.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} editable={!readOnly} busy={busy || loading}
      canSelect={loaded && (permissions.create || permissions.restore)} onSelect={() => setPickerOpen(true)} canActivate={affected("ACTIVE").length > 0} onActivate={() => batch("ACTIVE")}
      canInactivate={affected("INACTIVE").length > 0} onInactivate={() => batch("INACTIVE")} canDelete={affected("DELETED").length > 0} onDelete={() => batch("DELETED")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton onClick={() => void load()}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
    {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.key} accessibleName={t("controlObjectiveAccountGroup.title")} selectable={!readOnly} selectedKeys={selected} onSelectionChange={setSelected} loading={loading} busy={busy} emptyText={t("catalogRelation.empty")} />
    <HierarchyMultiSelectionDialog open={pickerOpen} title={t("catalogRelation.select")} searchAccessibleName={t("catalogRelation.search")} nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={loading} error={error}
      confirmDisabled={Boolean(error)} confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")} onConfirm={confirmSelection} onClose={() => setPickerOpen(false)} />
  </section>;
}
