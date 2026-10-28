import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MessageStrip } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { ProcessApiRepo } from "@/features/process/infra/process.api.repo";
import { OrganizationApiRepo } from "@/features/organization/infra/organization.api.repo";
import { centralPolicyApi } from "../infra/centralPolicy.api";
import { policySelectionHierarchy, type PolicyHierarchyChoice } from "../domain/policySelectionHierarchy";
import PolicyReferenceView from "./PolicyReferenceView";
import type { PolicyControlOption, PolicyControlScopeRow, PolicyOrganizationOption, PolicyOrganizationScopeRow, PolicyRequirementOption, PolicyRequirementScopeRow, PolicyScopeOperation, PolicySubprocessOption, PolicySubprocessScopeRow } from "../domain/centralPolicy.model";
const EMPTY_SELECTION = new Set<string>();
export type PolicyRelationKind = "subprocess" | "organization" | "control" | "requirement";
export interface PolicyRelationDraft {
  endpointId: string;
  relationId: string | null;
  version: number | null;
  operation: PolicyScopeOperation;
  validFrom: string | null;
  validTo: string | null;
  requestedStatus: "ACTIVE" | "INACTIVE" | null;
}
interface Row {
  endpointId: string;
  objectId: string;
  relationId: string | null;
  version: number | null;
  code: string;
  title: string;
  context: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  validFrom: string | null;
  validTo: string | null;
}
interface Choice extends Row, PolicyHierarchyChoice {}
const TAB_LABELS: Record<PolicyRelationKind, string> = {
  subprocess: "policy.tabs.subprocess", organization: "policy.tabs.organization",
  control: "policy.tabs.controls", requirement: "policy.tabs.requirements",
};
function displayStatus(row: Row, draft?: PolicyRelationDraft | null): Row["status"] {
  if (draft?.operation === "CREATE_OR_RESTORE" || draft?.operation === "ACTIVATE" || draft?.operation === "RESTORE") return "ACTIVE";
  if (draft?.operation === "INACTIVATE") return "INACTIVE";
  if (draft?.operation === "DELETE") return "DELETED";
  return draft?.requestedStatus ?? row.status;
}
function displayDates(row: Row, draft?: PolicyRelationDraft | null) {
  return draft && (draft.operation === "CREATE_OR_RESTORE" || draft.operation === "UPDATE")
    ? { from: draft.validFrom, to: draft.validTo }
    : { from: row.validFrom, to: row.validTo };
}
interface Props {
  kind: PolicyRelationKind;
  policyId: string | null;
  policyValidFrom: string | null;
  policyValidTo: string | null;
  readOnly: boolean;
  canView: boolean;
  canManage: boolean;
  busy: boolean;
  canonicalRows?: unknown[];
  onChanges: (changes: PolicyRelationDraft[]) => void;
  onInvalid: (invalid: boolean) => void;
}
function normalizeRows(kind: PolicyRelationKind, source: unknown[]): Row[] {
  if (kind === "subprocess") return (source as PolicySubprocessScopeRow[]).map(r => ({
    endpointId: r.subprocessId, objectId: r.subprocessId, relationId: r.id, version: r.version,
    code: r.subprocessCode, title: r.subprocessTitle,
    context: `${r.processCode} — ${r.processTitle}`,
    status: r.status, validFrom: r.validFrom, validTo: r.validTo,
  }));
  if (kind === "organization") return (source as PolicyOrganizationScopeRow[]).map(r => ({
    endpointId: r.organizationId, objectId: r.organizationId, relationId: r.id, version: r.version,
    code: r.organizationCode, title: r.organizationTitle,
    context: r.parentOrganizationCode ? `${r.parentOrganizationCode} — ${r.parentOrganizationTitle}` : "",
    status: r.status, validFrom: r.validFrom, validTo: r.validTo,
  }));
  if (kind === "control") return (source as PolicyControlScopeRow[]).map(r => ({
    endpointId: r.centralControlScopeId, objectId: r.controlId, relationId: r.id, version: r.version,
    code: r.controlCode, title: r.controlTitle,
    context: `${r.controlGroupCode ? `${r.controlGroupCode} — ${r.controlGroupTitle} / ` : ""}${r.subprocessCode} — ${r.subprocessTitle}`,
    status: r.status, validFrom: r.validFrom, validTo: r.validTo,
  }));
  return (source as PolicyRequirementScopeRow[]).map(r => ({
    endpointId: r.centralRequirementScopeId, objectId: r.requirementId, relationId: r.id, version: r.version,
    code: r.requirementCode, title: r.requirementTitle,
    context: `${r.regulationCode} — ${r.regulationTitle} / ${r.subprocessCode} — ${r.subprocessTitle}`,
    status: r.status, validFrom: r.validFrom, validTo: r.validTo,
  }));
}
function normalizeOptions(kind: PolicyRelationKind, source: unknown[]): Choice[] {
  if (kind === "subprocess") return (source as PolicySubprocessOption[]).map(o => ({
    endpointId: o.subprocessId, objectId: o.subprocessId, parentNodeId: `node:${o.processId}`, relationId: null, version: null,
    code: o.code, title: o.title, context: `${o.processCode} — ${o.processTitle}`,
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
    ancestors: [{ id: `node:${o.processId}`, parentId: null, code: o.processCode, name: o.processTitle, selectable: false }],
  }));
  if (kind === "organization") return (source as PolicyOrganizationOption[]).map(o => ({
    endpointId: o.organizationId, objectId: o.organizationId, parentNodeId: o.parentOrganizationId, relationId: null, version: null,
    code: o.code, title: o.title,
    context: o.parentOrganizationCode ? `${o.parentOrganizationCode} — ${o.parentOrganizationTitle}` : "",
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
  }));
  if (kind === "control") return (source as PolicyControlOption[]).map(o => ({
    endpointId: o.centralControlScopeId, objectId: o.controlId,
    parentNodeId: o.controlGroupCode ? `control-group:${o.subprocessId}:${encodeURIComponent(o.controlGroupCode)}` : `node:${o.subprocessId}`,
    relationId: null, version: null,
    code: o.controlCode, title: o.controlTitle,
    context: `${o.controlGroupCode ? `${o.controlGroupCode} — ${o.controlGroupTitle} / ` : ""}${o.subprocessCode} — ${o.subprocessTitle}`,
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
    ancestors: [
      { id: `node:${o.subprocessId}`, parentId: null, code: o.subprocessCode, name: o.subprocessTitle, selectable: false },
      ...(o.controlGroupCode ? [{ id: `control-group:${o.subprocessId}:${encodeURIComponent(o.controlGroupCode)}`,
        parentId: `node:${o.subprocessId}`, code: o.controlGroupCode, name: o.controlGroupTitle ?? "", selectable: false }] : []),
    ],
  }));
  return (source as PolicyRequirementOption[]).map(o => ({
    endpointId: o.centralRequirementScopeId, objectId: o.requirementId,
    parentNodeId: `regulation:${o.subprocessId}:${encodeURIComponent(o.regulationCode)}`, relationId: null, version: null,
    code: o.requirementCode, title: o.requirementTitle,
    context: `${o.regulationCode} — ${o.regulationTitle} / ${o.subprocessCode} — ${o.subprocessTitle}`,
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
    ancestors: [
      { id: `node:${o.subprocessId}`, parentId: null, code: o.subprocessCode, name: o.subprocessTitle, selectable: false },
      { id: `regulation:${o.subprocessId}:${encodeURIComponent(o.regulationCode)}`, parentId: `node:${o.subprocessId}`,
        code: o.regulationCode, name: o.regulationTitle, selectable: false },
    ],
  }));
}
async function readRows(kind: PolicyRelationKind, id: string, deleted = false): Promise<unknown[]> {
  switch (kind) {
    case "subprocess": return centralPolicyApi.subprocessScopes(id, deleted);
    case "organization": return centralPolicyApi.organizationScopes(id, deleted);
    case "control": return centralPolicyApi.controlScopes(id, deleted);
    case "requirement": return centralPolicyApi.requirementScopes(id, deleted);
  }
}
async function readOptions(kind: PolicyRelationKind): Promise<unknown[]> {
  switch (kind) {
    case "subprocess": return centralPolicyApi.subprocessOptions();
    case "organization": return centralPolicyApi.organizationOptions();
    case "control": return centralPolicyApi.controlOptions();
    case "requirement": return centralPolicyApi.requirementOptions();
  }
}

export default function PolicyRelationTab({ kind, policyId, policyValidFrom, policyValidTo, readOnly, canView, canManage, busy, onChanges, onInvalid, canonicalRows }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>(() => canonicalRows ? normalizeRows(kind, canonicalRows) : []); const [options, setOptions] = useState<Choice[]>([]);
  const [ancestors, setAncestors] = useState<HierarchySelectionNode[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PolicyRelationDraft>>({});
  const beforeDelete = useRef<Record<string, PolicyRelationDraft | undefined>>({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [pickerOpen, setPickerOpen] = useState(false); const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerSelection, setPickerSelection] = useState<Set<string>>(EMPTY_SELECTION);
  const [dateDrafts, setDateDrafts] = useState<Record<string, PersianDateDraftState>>({});
  const [view, setView] = useState<Row | null>(null); const generation = useRef(0);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!canView) return;
    const current = ++generation.current;
    void Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const [live, deleted, choices, hierarchy] = await Promise.all([
          canonicalRows ? Promise.resolve(canonicalRows) : policyId ? readRows(kind, policyId) : Promise.resolve([]), policyId ? readRows(kind, policyId, true) : Promise.resolve([]),
          readOptions(kind), kind === "organization" ? new OrganizationApiRepo().list().then(nodes => nodes.filter(node => node.status !== "DELETED").map(node => ({ id: node.id, parentId: node.parentOrganizationId, code: node.code, name: node.name, selectable: false })))
            : new ProcessApiRepo().list().then(nodes => nodes.filter(node => node.status !== "DELETED" && (kind !== "subprocess" || node.nodeType === "PROCESS")).map(node => ({ id: `node:${node.id}`, parentId: node.parentId ? `node:${node.parentId}` : null, code: node.code, name: node.title, selectable: false }))),
        ]);
        if (current !== generation.current) return;
        const latest = new Map<string, Row>();
        for (const row of [...normalizeRows(kind, live), ...normalizeRows(kind, deleted)]) {
          const previous = latest.get(row.endpointId);
          if (!previous || (previous.version ?? -1) <= (row.version ?? -1)) latest.set(row.endpointId, row);
        }
        setRows([...latest.values()]); setOptions(normalizeOptions(kind, choices)); setAncestors(hierarchy); setError(false);
      } catch { if (current === generation.current) setError(true); }
      finally { if (current === generation.current) setLoading(false); }
    });
    return () => { generation.current += 1; };
  }, [kind, policyId, canView, reload, canonicalRows]);
  const change = (next: Record<string, PolicyRelationDraft>) => { setDrafts(next); onChanges(Object.values(next)); };
  const effective = useMemo(() => {
    const result = rows.map(row => ({ ...row, draft: drafts[row.endpointId] ?? null }));
    for (const draft of Object.values(drafts)) {
      if (rows.some(row => row.endpointId === draft.endpointId)) continue;
      const choice = options.find(option => option.endpointId === draft.endpointId);
      if (choice) result.push({ ...choice, draft });
    }
    return result;
  }, [rows, drafts, options]);
  const pendingDates = Object.values(dateDrafts).some(draft => draft.dirty);
  const invalid = Object.values(dateDrafts).some(draft => !draft.valid) || effective.some(row => {
    if (row.draft?.operation === "DELETE") return false;
    const dates = displayDates(row, row.draft); return Boolean(dates.from && dates.to && dates.from > dates.to);
  });
  useEffect(() => onInvalid(canView && (loading || error || pickerOpen || pendingDates || invalid)), [canView, loading, error, pickerOpen, pendingDates, invalid, onInvalid]);
  const visible = effective.filter(row => dateDrafts[row.endpointId + ":validFrom"]?.dirty || dateDrafts[row.endpointId + ":validTo"]?.dirty || row.draft || row.status !== "DELETED" && (filter === "ALL" || row.status === filter) && `${row.code} ${row.title} ${row.context}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const nodes = useMemo(() => {
    const occupied = new Set(effective.filter(row => displayStatus(row, row.draft) !== "DELETED").map(row => row.endpointId));
    return policySelectionHierarchy(ancestors, options, occupied, {
      assigned: t("policy.relations.selection.assigned"), unavailable: t("catalogRelation.unavailable"),
    });
  }, [ancestors, effective, options, t]);
  const eligibleSelection = new Set(nodes.filter(node => node.selectable).map(node => node.id));
  const validSelection = pickerSelection.size > 0 && [...pickerSelection].every(id => eligibleSelection.has(id));
  const openPicker = () => {
    if (readOnly || !canManage || busy || loading || error) return;
    setPickerSelection(EMPTY_SELECTION); setPickerOpen(true);
  };
  const stage = (next: Record<string, PolicyRelationDraft>, row: Row, status: "ACTIVE" | "INACTIVE", from: string | null, to: string | null) => {
    if (!row.relationId || row.status === "DELETED") next[row.endpointId] = { endpointId: row.endpointId, relationId: null, version: null, operation: "CREATE_OR_RESTORE", validFrom: from, validTo: to, requestedStatus: null };
    else if (row.status === status && row.validFrom === from && row.validTo === to) delete next[row.endpointId];
    else {
      const metadata = row.validFrom !== from || row.validTo !== to;
      next[row.endpointId] = { endpointId: row.endpointId, relationId: row.relationId, version: row.version,
        operation: metadata ? "UPDATE" : status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", validFrom: metadata ? from : null, validTo: metadata ? to : null, requestedStatus: metadata ? status : null };
    }
  };
  const confirmSelection = (ids: Set<string>) => {
    if (readOnly || !canManage || busy || loading || error || !ids.size || [...ids].some(id => !eligibleSelection.has(id))) return;
    const next = { ...drafts };
    for (const id of ids) {
      const baseline = rows.find(row => row.endpointId === id);
      const choice = options.find(option => option.endpointId === id);
      if (!choice?.eligible) continue;
      if (baseline && baseline.status !== "DELETED") {
        if (next[id]?.operation === "DELETE") { const previous = beforeDelete.current[id]; if (previous) next[id] = previous; else delete next[id]; delete beforeDelete.current[id]; }
      } else if (!next[id]) {
        const freshFrom = policyValidFrom && choice.validFrom ? (policyValidFrom > choice.validFrom ? policyValidFrom : choice.validFrom)
          : policyValidFrom ?? choice.validFrom;
        const freshTo = policyValidTo && choice.validTo ? (policyValidTo < choice.validTo ? policyValidTo : choice.validTo)
          : policyValidTo ?? choice.validTo;
        stage(next, baseline ?? choice, "ACTIVE", baseline ? baseline.validFrom : freshFrom, baseline ? baseline.validTo : freshTo);
      }
    }
    change(next); setPickerOpen(false);
  };
  const affected = (status: "ACTIVE" | "INACTIVE" | "DELETED") => visible.filter(row => selected.has(row.endpointId) && (status === "DELETED"
    ? displayStatus(row, row.draft) !== "DELETED" : Boolean(row.relationId && row.status !== "DELETED" && row.draft?.operation !== "DELETE" && displayStatus(row, row.draft) !== status)));
  const batch = (status: "ACTIVE" | "INACTIVE" | "DELETED") => {
    if (readOnly || !canManage || busy || loading || error) return;
    const next = { ...drafts };
    const affectedRows = affected(status);
    if (status === "DELETED") setDateDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => !affectedRows.some(row => key === row.endpointId + ":validFrom" || key === row.endpointId + ":validTo"))));
    for (const row of affectedRows) {
      const dates = displayDates(row, row.draft);
      if (status === "DELETED") {
        if (!row.relationId || row.status === "DELETED") delete next[row.endpointId];
        else { beforeDelete.current[row.endpointId] = next[row.endpointId]; next[row.endpointId] = { endpointId: row.endpointId, relationId: row.relationId, version: row.version, operation: "DELETE", validFrom: null, validTo: null, requestedStatus: null }; }
      } else stage(next, row, status, dates.from, dates.to);
    }
    change(next);
  };
  const updateDate = (row: Row & { draft: PolicyRelationDraft | null }, field: "validFrom" | "validTo", value: string | null) => {
    const next = { ...drafts }; const dates = displayDates(row, row.draft);
    stage(next, row, displayStatus(row, row.draft) === "INACTIVE" ? "INACTIVE" : "ACTIVE", field === "validFrom" ? value : dates.from, field === "validTo" ? value : dates.to); change(next);
  };
  const reportDate = (key: string, draft: PersianDateDraftState) => setDateDrafts(current => {
    const previous = current[key]; return previous?.dirty === draft.dirty && previous.valid === draft.valid && previous.draftValue === draft.draftValue ? current : { ...current, [key]: draft };
  });
  type DisplayRow = typeof effective[number];
  const columns: CatalogRelationColumn<DisplayRow>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.code },
    { key: "name", header: t("catalogRelation.name"), cell: row => <Link accessibleRole="Button" onClick={event => { event.preventDefault(); setView(row); }}>{row.title}</Link> },
    { key: "context", header: t("policy.relations.context"), cell: row => row.context || "—" },
    ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: DisplayRow) => <CatalogRelationDate value={displayDates(row, row.draft)[field === "validFrom" ? "from" : "to"]} label={t(`catalogRelation.${field}`)} editable={!readOnly && canManage && row.draft?.operation !== "DELETE"} disabled={busy || loading}
      onChange={value => updateDate(row, field, value)} onDraftStateChange={draft => reportDate(row.endpointId + ":" + field, draft)} /> })),
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={displayStatus(row, row.draft)} draft={!row.draft ? null : row.draft.operation === "DELETE" ? "delete" : row.draft.operation === "CREATE_OR_RESTORE" ? "new" : row.draft.operation === "ACTIVATE" ? "active" : row.draft.operation === "INACTIVATE" ? "inactive" : "edit"} /> },
  ];
  if (!canView) return <MessageStrip design="Information">{t("policy.relations.noAccess")}</MessageStrip>;
  return <section className="policyRelationTab">
    <CatalogRelationToolbar title={t(TAB_LABELS[kind])} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} editable={!readOnly && canManage} busy={busy || loading}
      canSelect={!error} onSelect={openPicker} canActivate={affected("ACTIVE").length > 0} onActivate={() => batch("ACTIVE")} canInactivate={affected("INACTIVE").length > 0} onInactivate={() => batch("INACTIVE")} canDelete={affected("DELETED").length > 0} onDelete={() => batch("DELETED")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{t("policy.relations.loadError")}<CatalogActionButton onClick={() => setReload(value => value + 1)}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
    {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.endpointId} accessibleName={t("policy.relations.reference")} selectable={!readOnly && canManage} selectedKeys={selected} onSelectionChange={setSelected} loading={loading} busy={busy} emptyText={t("catalogRelation.empty")} />
    {pickerOpen ? <HierarchyMultiSelectionDialog key={`policy-selection:${kind}`} open
      title={t(`policy.relations.selection.${kind}.title`)} searchAccessibleName={t(`policy.relations.selection.${kind}.search`)}
      description={t(`policy.relations.selection.${kind}.hint`)} nodes={nodes} selectedIds={EMPTY_SELECTION}
      busy={busy} loading={loading} error={error ? t("policy.relations.loadError") : null} confirmDisabled={!validSelection}
      onSelectionChange={setPickerSelection} confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")}
      onConfirm={confirmSelection} onClose={() => setPickerOpen(false)} /> : null}
    {view ? <PolicyReferenceView key={`${kind}:${view.objectId}`} kind={kind} objectId={view.objectId} onClose={() => setView(null)} /> : null}
  </section>;
}
