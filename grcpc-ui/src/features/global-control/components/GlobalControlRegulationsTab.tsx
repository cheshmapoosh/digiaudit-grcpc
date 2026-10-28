import { useEffect, useMemo, useState } from "react";
import { Link, MessageStrip, ObjectStatus, Text } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CatalogRelationTable } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { HierarchyMultiSelectionDialog } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { GlobalControlRegulation, GlobalControlRegulationChange, RegulationSelectionOptions } from "../domain/global-control.model";
import { globalControlApi } from "../infra/global-control.api.repo";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";

type Row = { regulationId: string; code: string; name: string; status: "ACTIVE" | "INACTIVE" | "DELETED";
  regulationStatus: "ACTIVE" | "INACTIVE" | "DELETED"; draft?: GlobalControlRegulationChange };
export function GlobalControlRegulationsTab({ ownerId, rows: baseline, changes, onChangesChange,
  manage, busy, resetKey, onDirtyChange, onReadinessChange, onRowsChange }: {
  ownerId: string | null; rows: GlobalControlRegulation[]; changes: GlobalControlRegulationChange[];
  onChangesChange: (changes: GlobalControlRegulationChange[]) => void;
  manage: boolean; busy: boolean; resetKey?: number;
  onDirtyChange: (dirty: boolean) => void; onReadinessChange: (ready: boolean) => void;
  onRowsChange: (rows: GlobalControlRegulation[]) => void;
}) {
  const { t } = useTranslation(); const navigate = useNavigate();
  const targetAccess = useMasterDataAccess("GOVERNANCE");
  const [options, setOptions] = useState<RegulationSelectionOptions>({ groups: [], regulations: [] });
  const [deleted, setDeleted] = useState<GlobalControlRegulation[]>([]);
  const [deletedOwner, setDeletedOwner] = useState<string | null>(ownerId);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0); const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const emptySelection = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    let current = true;
    void Promise.resolve().then(() => { if (current) setLoading(true); });
    void Promise.all([globalControlApi.regulationSelection(), ownerId
      ? globalControlApi.relatedRegulations(ownerId, true) : Promise.resolve([]), ownerId
      ? globalControlApi.relatedRegulations(ownerId) : Promise.resolve([])]).then(([choices, removed, currentRows]) => {
      if (current) { setOptions(choices); setDeleted(removed); setDeletedOwner(ownerId); setError(null); }
      if (current) onRowsChange(currentRows);
    }).catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [ownerId, resetKey, retry, onRowsChange]);
  useEffect(() => { onDirtyChange(changes.length > 0 || picker); }, [changes.length, picker, onDirtyChange]);
  useEffect(() => { onReadinessChange(!picker && !loading && !error); }, [picker, loading, error, onReadinessChange]);
  const all = [...baseline, ...(deletedOwner === ownerId ? deleted : []).filter(row => !baseline.some(item => item.id === row.id))];
  const rows: Row[] = all.filter(row => row.status !== "DELETED" || changes.some(change => change.regulationId === row.regulationId))
    .map(row => {
      const draft = changes.find(change => change.regulationId === row.regulationId);
      return { regulationId: row.regulationId, code: row.regulationCode, name: row.regulationName,
        regulationStatus: row.regulationStatus, draft, status: draft?.operation === "DELETE" ? "DELETED"
          : draft?.operation === "INACTIVATE" ? "INACTIVE" : draft ? "ACTIVE" : row.status };
    });
  for (const change of changes) {
    if (all.some(row => row.regulationId === change.regulationId)) continue;
    const option = options.regulations.find(item => item.id === change.regulationId);
    if (option) rows.push({ regulationId: option.id, code: option.code, name: option.name,
      status: "ACTIVE", regulationStatus: "ACTIVE", draft: change });
  }
  const needs = (row: Row, status: "ACTIVE" | "INACTIVE") => row.status !== status
    && !["CREATE_OR_RESTORE", "RESTORE"].includes(row.draft?.operation ?? "");
  const checked = rows.filter(row => selected.has(row.regulationId));
  const batch = (target: "ACTIVE" | "INACTIVE" | "DELETED") => {
    const next = new Map(changes.map(change => [change.regulationId, change]));
    for (const row of checked) {
      const original = all.find(item => item.regulationId === row.regulationId);
      if (target === "DELETED") {
        if (!original || original.status === "DELETED") next.delete(row.regulationId);
        else if (row.draft?.operation !== "DELETE") next.set(row.regulationId,
          { regulationId: row.regulationId, operation: "DELETE", relationId: original.id, version: original.version });
      } else if (original && original.status !== "DELETED" && needs(row, target)) {
        if (original.status === target) next.delete(row.regulationId);
        else next.set(row.regulationId, { regulationId: row.regulationId, relationId: original.id,
          version: original.version, operation: target === "ACTIVE" ? "ACTIVATE" : "INACTIVATE" });
      }
    }
    onChangesChange([...next.values()]);
  };
  const nodes = [
    ...options.groups.map(item => ({ ...item, selectable: false })),
    ...options.regulations.map(item => ({ ...item, parentId: item.groupId,
      selectable: !rows.some(row => row.regulationId === item.id && row.draft?.operation !== "DELETE") })),
  ];
  const needle = search.trim().toLocaleLowerCase();
  const visible = rows.filter(row => (row.draft || filter === "ALL" || row.status === filter)
    && (!needle || `${row.code} ${row.name}`.toLocaleLowerCase().includes(needle)));
  return <div className="globalControlRelationTab">
    <CatalogRelationToolbar title={t("globalControl.tabs.regulations")} search={search} onSearch={setSearch}
      filter={filter} onFilter={setFilter} editable={manage} busy={busy} canSelect={!loading && !error}
      canActivate={checked.some(row => needs(row, "ACTIVE"))} canInactivate={checked.some(row => needs(row, "INACTIVE"))}
      canDelete={checked.some(row => row.draft?.operation !== "DELETE")} onSelect={() => setPicker(true)}
      onActivate={() => batch("ACTIVE")} onInactivate={() => batch("INACTIVE")} onDelete={() => batch("DELETED")} />
    {error ? <><MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip>
      <Link onClick={() => setRetry(value => value + 1)}>{t("catalogRelation.retry")}</Link></> : null}
    <CatalogRelationTable rows={visible} rowKey={row => row.regulationId} accessibleName={t("globalControl.tabs.regulations")}
      selectedKeys={selected} onSelectionChange={setSelected} selectable={manage} loading={loading} busy={busy}
      emptyText={t("catalogRelation.empty")} columns={[
        { key: "code", header: t("catalogRelation.code"), cell: row => <Text>{row.code}</Text> },
        { key: "name", header: t("catalogRelation.name"), cell: row => targetAccess.view
          ? <Link onClick={() => navigate(`/regulations?regulationId=${row.regulationId}`)}>{row.name}</Link> : <Text>{row.name}</Text> },
        { key: "status", header: t("catalogRelation.status"), cell: row => <ObjectStatus state={row.draft ? "Information" : row.status === "ACTIVE" ? "Positive" : "None"}>
          {t(row.draft ? row.draft.operation === "DELETE" ? "catalogRelation.draftDelete"
            : row.draft.operation === "CREATE_OR_RESTORE" || row.draft.operation === "RESTORE" ? "catalogRelation.draft"
              : row.status === "ACTIVE" ? "catalogRelation.draftActive" : "catalogRelation.draftInactive"
            : row.status === "ACTIVE" ? "catalogRelation.active" : "catalogRelation.inactive")}</ObjectStatus> },
        { key: "endpointStatus", header: t("globalControl.regulations.endpointStatus"), cell: row => <ObjectStatus state={row.regulationStatus === "ACTIVE" ? "Positive" : "None"}>{t(`catalog.parentHeader.status.${row.regulationStatus}`)}</ObjectStatus> },
      ]} />
    <HierarchyMultiSelectionDialog open={picker} title={t("globalControl.regulations.select")} searchAccessibleName={t("catalogRelation.search")}
      nodes={nodes} selectedIds={emptySelection} busy={busy} loading={loading} error={error}
      confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")} onClose={() => setPicker(false)} onConfirm={ids => {
        const next = new Map(changes.map(change => [change.regulationId, change]));
        for (const id of ids) {
          if (!nodes.some(node => node.id === id && node.selectable)) continue;
          const original = all.find(row => row.regulationId === id);
          if (original && original.status !== "DELETED") next.delete(id);
          else next.set(id, original ? { regulationId: id, operation: "RESTORE", relationId: original.id, version: original.version }
            : { regulationId: id, operation: "CREATE_OR_RESTORE" });
        }
        onChangesChange([...next.values()]); setPicker(false);
      }} />
  </div>;
}
