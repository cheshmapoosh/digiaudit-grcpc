import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Link, MessageStrip, ObjectStatus, Text, TextArea } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CatalogRelationTable } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { ObjectiveOrganizationLink, OrganizationObjective, OrganizationObjectiveChange } from "../domain/objective.model";
import { objectiveApi } from "../infra/objective.api.repo";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import ObjectiveSelectionDialog from "./ObjectiveSelectionDialog";

type Canonical = { id: string; targetId: string; code: string; targetName: string; name: string;
  description: string | null; owner: string | null; validFrom: string | null; validTo: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED"; version: number };
type Row = Canonical & { draft?: OrganizationObjectiveChange };
export interface OrganizationObjectiveRelationsProps {
  side: "organization" | "objective"; ownerId: string | null; ownerName?: string;
  manage: boolean; busy?: boolean; resetKey?: string | number;
  changes: OrganizationObjectiveChange[]; onChangesChange: (changes: OrganizationObjectiveChange[]) => void;
  onDirtyChange?: (dirty: boolean) => void; onReadinessChange?: (ready: boolean) => void;
  canonicalRows?: OrganizationObjective[] | ObjectiveOrganizationLink[];
  onRowsChange?: (rows: ObjectiveOrganizationLink[]) => void;
}

const metadata = (row: Pick<Canonical, "name" | "description" | "owner" | "validFrom" | "validTo">) => ({
  name: row.name, description: row.description, owner: row.owner, validFrom: row.validFrom, validTo: row.validTo,
});
function sameMetadata(a: ReturnType<typeof metadata>, b: ReturnType<typeof metadata>) {
  return Object.keys(a).every(key => a[key as keyof typeof a] === b[key as keyof typeof b]);
}

export function OrganizationObjectiveRelations({ side, ownerId, ownerName = "", manage, busy = false,
  resetKey, changes, onChangesChange, onDirtyChange, onReadinessChange, canonicalRows, onRowsChange }: OrganizationObjectiveRelationsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const targetAccess = useMasterDataAccess(side === "organization" ? "REFERENCE" : "ORGANIZATION");
  const [baseline, setBaseline] = useState<Canonical[]>([]);
  const [baselineOwner, setBaselineOwner] = useState<string | null>(ownerId);
  const [nodes, setNodes] = useState<HierarchySelectionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const beforeDelete = useRef(new Map<string, OrganizationObjectiveChange | undefined>());
  const identity = (id: string) => side === "organization" ? { objectiveId: id } : { organizationId: id };
  const targetId = (change: OrganizationObjectiveChange) => side === "organization" ? change.objectiveId! : change.organizationId!;
  const toCanonical = (row: OrganizationObjective | ObjectiveOrganizationLink): Canonical => "objectiveCode" in row
    ? { ...row, targetId: row.objectiveId, code: row.objectiveCode, targetName: row.name }
    : { ...row, targetId: row.organizationId, code: row.organizationCode, targetName: row.organizationName };

  useEffect(() => {
    let current = true;
    void Promise.resolve().then(() => { if (current) setLoading(true); });
    const read = async () => {
      const options = side === "organization" ? await objectiveApi.list() : await objectiveApi.organizationOptions();
      const currentRows = ownerId ? side === "organization"
        ? await objectiveApi.listForOrganization(ownerId) : await objectiveApi.organizations(ownerId) : canonicalRows ?? [];
      const deleted = ownerId ? side === "organization" ? await objectiveApi.listForOrganization(ownerId, true)
        : await objectiveApi.organizations(ownerId, true) : [];
      if (!current) return;
      const canonical = (row: OrganizationObjective | ObjectiveOrganizationLink): Canonical => "objectiveCode" in row
        ? { ...row, targetId: row.objectiveId, code: row.objectiveCode, targetName: row.name }
        : { ...row, targetId: row.organizationId, code: row.organizationCode, targetName: row.organizationName };
      setBaseline([...currentRows, ...deleted].map(canonical));
      setBaselineOwner(ownerId);
      if (side === "objective") onRowsChange?.(currentRows as ObjectiveOrganizationLink[]);
      setNodes(side === "organization" ? (options as Awaited<ReturnType<typeof objectiveApi.list>>).map(item => ({
        id: item.id, parentId: item.parentObjectiveId, code: item.code, name: item.name,
        selectable: item.kind === "OBJECTIVE" && item.status === "ACTIVE"
          && options.some(parent => parent.id === item.parentObjectiveId && "kind" in parent
            && parent.kind === "STRATEGY" && !("parentObjectiveId" in parent && parent.parentObjectiveId)),
      })) : (options as Awaited<ReturnType<typeof objectiveApi.organizationOptions>>).map(item => ({
        id: item.id, parentId: item.parentOrganizationId, code: item.code, name: item.name, selectable: item.status === "ACTIVE",
      })));
      setError(null);
    };
    void read().catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [side, ownerId, resetKey, canonicalRows, onRowsChange, retry]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setInvalid({}); setSelected(new Set()); beforeDelete.current.clear(); }, 0);
    return () => window.clearTimeout(timer);
  }, [ownerId, resetKey]);

  const baselineByPair = new Map<string, Canonical>();
  for (const row of [...(baselineOwner === ownerId ? baseline : []), ...(canonicalRows ?? []).map(toCanonical)]) {
    const previous = baselineByPair.get(row.targetId);
    if (!previous || previous.version <= row.version) baselineByPair.set(row.targetId, row);
  }
  const effectiveBaseline = [...baselineByPair.values()];
  const rows: Row[] = effectiveBaseline.filter(row => row.status !== "DELETED" || changes.some(change => targetId(change) === row.targetId))
    .map(row => {
      const draft = changes.find(change => targetId(change) === row.targetId);
      const status = draft?.operation === "DELETE" ? "DELETED" : draft?.operation === "INACTIVATE" ? "INACTIVE"
        : draft?.operation === "ACTIVATE" || draft?.operation === "RESTORE" || draft?.operation === "CREATE_OR_RESTORE" ? "ACTIVE"
          : draft?.requestedStatus ?? row.status;
      return { ...row, ...draft, name: draft?.name ?? row.name,
        targetName: side === "organization" ? nodes.find(node => node.id === row.targetId)?.name ?? row.targetName : row.targetName,
        status, draft };
    });
  for (const change of changes) {
    const id = targetId(change);
    if (effectiveBaseline.some(row => row.targetId === id)) continue;
    const option = nodes.find(node => node.id === id);
    if (!option || !option.selectable) continue;
    rows.push({ id: `draft:${id}`, targetId: id, code: option.code, targetName: option.name,
      name: change.name ?? (side === "organization" ? option.name : ownerName), description: change.description ?? null,
      owner: change.owner ?? null, validFrom: change.validFrom ?? null, validTo: change.validTo ?? null,
      status: "ACTIVE", version: 0, draft: change });
  }
  const invalidDraft = Object.entries(invalid).some(([key, value]) => value
    && rows.some(row => key.startsWith(`${row.targetId}:`) && row.draft?.operation !== "DELETE")) || rows.some(row => row.draft?.operation !== "DELETE" && (!row.name.trim()
    || Boolean(row.validFrom && row.validTo && row.validFrom > row.validTo)));
  const dirty = changes.length > 0 || picker || invalidDraft;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onReadinessChange?.(!picker && !invalidDraft && !loading && !error); }, [picker, invalidDraft, loading, error, onReadinessChange]);

  const commit = (id: string, change: OrganizationObjectiveChange | null) => {
    onChangesChange([...changes.filter(item => targetId(item) !== id), ...(change ? [change] : [])]);
  };
  const edit = (row: Row, patch: Partial<ReturnType<typeof metadata>>, status = row.status) => {
    const original = effectiveBaseline.find(item => item.targetId === row.targetId);
    const fields = { ...metadata(row), ...patch };
    if (!original || original.status === "DELETED") {
      commit(row.targetId, { ...identity(row.targetId), operation: "CREATE_OR_RESTORE", ...fields,
        ...(original ? { assignmentId: original.id, version: original.version } : {}) });
      return;
    }
    const metadataChanged = !sameMetadata(metadata(original), fields);
    if (!metadataChanged && status === original.status) { commit(row.targetId, null); return; }
    commit(row.targetId, { ...identity(row.targetId), assignmentId: original.id, version: original.version,
      operation: metadataChanged ? "UPDATE" : status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE",
      ...(metadataChanged ? { ...fields, requestedStatus: status as "ACTIVE" | "INACTIVE" } : {}) });
  };
  const eligible = rows.filter(row => selected.has(row.targetId));
  const lifecycleEligible = (row: Row, status: "ACTIVE" | "INACTIVE") => row.status !== status
    && !["CREATE_OR_RESTORE", "RESTORE"].includes(row.draft?.operation ?? "")
    && effectiveBaseline.some(item => item.targetId === row.targetId && item.status !== "DELETED");
  const batch = (status: "ACTIVE" | "INACTIVE" | "DELETED") => {
    const next = new Map(changes.map(change => [targetId(change), change]));
    for (const row of eligible) {
      const original = effectiveBaseline.find(item => item.targetId === row.targetId);
      if (status === "DELETED") {
        if (!original || original.status === "DELETED") next.delete(row.targetId);
        else if (row.draft?.operation !== "DELETE") {
          beforeDelete.current.set(row.targetId, row.draft);
          next.set(row.targetId, { ...identity(row.targetId), operation: "DELETE", assignmentId: original.id, version: original.version });
        }
      } else if (original && lifecycleEligible(row, status)) {
        const fields = metadata(row); const changed = !sameMetadata(metadata(original), fields);
        if (!changed && status === original.status) next.delete(row.targetId);
        else next.set(row.targetId, { ...identity(row.targetId), assignmentId: original.id, version: original.version,
          operation: changed ? "UPDATE" : status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE",
          ...(changed ? { ...fields, requestedStatus: status } : {}) });
      }
    }
    onChangesChange([...next.values()]);
  };
  const needle = query.trim().toLocaleLowerCase();
  const visible = rows.filter(row => (row.draft || filter === "ALL" || row.status === filter)
    && (!needle || `${row.code} ${row.targetName} ${row.name} ${row.owner ?? ""}`.toLocaleLowerCase().includes(needle)));
  const selectionNodes = useMemo(() => nodes.map(node => ({ ...node, selectable: node.selectable
    && !rows.some(row => row.targetId === node.id && row.draft?.operation !== "DELETE") })), [nodes, rows]);
  const pickerSelection = useMemo(() => new Set<string>(), []);
  const editable = manage && !busy;
  const title = t(side === "organization" ? "objective.organization.title" : "objective.tabs.organizations");
  const confirmSelection = (ids: Set<string>) => {
    const next = new Map(changes.map(change => [targetId(change), change]));
    for (const id of ids) {
      if (!selectionNodes.some(node => node.id === id && node.selectable)) continue;
      const existing = effectiveBaseline.find(row => row.targetId === id);
      if (existing && existing.status !== "DELETED") {
        const previous = beforeDelete.current.get(id);
        if (previous) next.set(id, previous); else next.delete(id);
        beforeDelete.current.delete(id);
      } else if (existing) next.set(id, { ...identity(id), operation: "RESTORE", assignmentId: existing.id, version: existing.version });
      else next.set(id, { ...identity(id), operation: "CREATE_OR_RESTORE", name: side === "organization" ? nodes.find(node => node.id === id)!.name : ownerName });
    }
    onChangesChange([...next.values()]); setPicker(false);
  };
  return <div className="objectiveOrganizationTab">
    <CatalogRelationToolbar title={title} search={query} onSearch={setQuery} filter={filter} onFilter={setFilter}
      editable={manage} busy={busy} canSelect={!loading && !error && (side === "organization" || Boolean(ownerName.trim()))} canActivate={eligible.some(row => lifecycleEligible(row, "ACTIVE"))}
      canInactivate={eligible.some(row => lifecycleEligible(row, "INACTIVE"))}
      canDelete={eligible.some(row => row.draft?.operation !== "DELETE")} onSelect={() => setPicker(true)}
      onActivate={() => batch("ACTIVE")} onInactivate={() => batch("INACTIVE")} onDelete={() => batch("DELETED")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    {error ? <Link onClick={() => setRetry(value => value + 1)}>{t("catalogRelation.retry")}</Link> : null}
    <CatalogRelationTable rows={visible} rowKey={row => row.targetId} accessibleName={title} selectedKeys={selected}
      onSelectionChange={setSelected} selectable={manage} busy={busy} loading={loading} emptyText={t("catalogRelation.empty")}
      columns={[
        { key: "code", header: t("catalogRelation.code"), cell: row => <Text>{row.code}</Text> },
        { key: "target", header: t("catalogRelation.name"), cell: row => targetAccess.view
          ? <Link onClick={() => navigate(side === "organization" ? `/objectives?objectiveId=${row.targetId}` : `/organizations/${row.targetId}`)}>{row.targetName}</Link>
          : <Text>{row.targetName}</Text> },
        { key: "status", header: t("catalogRelation.status"), cell: row => <ObjectStatus state={row.draft ? "Information" : row.status === "ACTIVE" ? "Positive" : "None"}>
          {t(row.draft ? row.draft.operation === "DELETE" ? "catalogRelation.draftDelete"
            : row.draft.operation === "CREATE_OR_RESTORE" || row.draft.operation === "RESTORE" ? "catalogRelation.draft"
            : row.draft.operation === "UPDATE" && row.status === effectiveBaseline.find(item => item.targetId === row.targetId)?.status ? "catalogRelation.draftEdit"
              : row.status === "ACTIVE" ? "catalogRelation.draftActive" : "catalogRelation.draftInactive"
            : row.status === "ACTIVE" ? "catalogRelation.active" : "catalogRelation.inactive")}</ObjectStatus> },
        { key: "name", header: t("objective.organizations.assignment"), cell: row => editable && row.draft?.operation !== "DELETE"
          ? <Input value={row.name} accessibleName={t("objective.name")} onInput={event => edit(row, { name: event.target.value })} /> : row.name },
        { key: "owner", header: t("objective.owner"), cell: row => editable && row.draft?.operation !== "DELETE"
          ? <Input value={row.owner ?? ""} accessibleName={t("objective.owner")} onInput={event => edit(row, { owner: event.target.value || null })} /> : row.owner ?? "—" },
        ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: Row) =>
          <CatalogRelationDate key={`${resetKey}:${row.targetId}:${field}`} value={row[field]} editable={editable && row.draft?.operation !== "DELETE"} label={t(`catalogRelation.${field}`)}
            onChange={value => edit(row, { [field]: value })} onDraftStateChange={state => setInvalid(old => old[`${row.targetId}:${field}`] === !state.valid ? old : { ...old, [`${row.targetId}:${field}`]: !state.valid })} /> })),
        { key: "description", header: t("objective.description"), cell: row => editable && row.draft?.operation !== "DELETE"
          ? <TextArea value={row.description ?? ""} accessibleName={t("objective.description")} onInput={event => edit(row, { description: event.target.value || null })} /> : row.description ?? "—" },
      ]} />
    {side === "organization" ? <ObjectiveSelectionDialog open={picker} nodes={selectionNodes} selectedIds={pickerSelection}
      busy={busy} loading={loading} error={error} onConfirm={confirmSelection} onClose={() => setPicker(false)} />
      : <HierarchyMultiSelectionDialog open={picker} title={t("objective.organizations.select")} searchAccessibleName={t("catalogRelation.search")}
        nodes={selectionNodes} selectedIds={pickerSelection} busy={busy} loading={loading} error={error}
        confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")} onClose={() => setPicker(false)} onConfirm={confirmSelection} />}
  </div>;
}
