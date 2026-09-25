import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionSheet, BusyIndicator, Button, CheckBox, Dialog, Input, Link, List,
  ListItemCustom, ListItemGroup, MessageStrip, ObjectStatus, Option, Select,
  Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow,
} from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
import { centralPolicyApi } from "../infra/centralPolicy.api";
import PolicyReferenceView from "./PolicyReferenceView";
import type {
  PolicyControlOption, PolicyControlScopeRow, PolicyOrganizationOption,
  PolicyOrganizationScopeRow, PolicyRequirementOption, PolicyRequirementScopeRow,
  PolicyScopeOperation, PolicySubprocessOption, PolicySubprocessScopeRow,
} from "../domain/centralPolicy.model";

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
interface Choice extends Row { eligible: boolean; }
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
  onChanges: (changes: PolicyRelationDraft[]) => void;
  onInvalid: (invalid: boolean) => void;
}
const emptyDate: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };
function isOwnClose(event: unknown) {
  const e = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(e.target && e.target === e.currentTarget);
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
    endpointId: o.subprocessId, objectId: o.subprocessId, relationId: null, version: null,
    code: o.code, title: o.title, context: `${o.processCode} — ${o.processTitle}`,
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
  }));
  if (kind === "organization") return (source as PolicyOrganizationOption[]).map(o => ({
    endpointId: o.organizationId, objectId: o.organizationId, relationId: null, version: null,
    code: o.code, title: o.title,
    context: o.parentOrganizationCode ? `${o.parentOrganizationCode} — ${o.parentOrganizationTitle}` : "",
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
  }));
  if (kind === "control") return (source as PolicyControlOption[]).map(o => ({
    endpointId: o.centralControlScopeId, objectId: o.controlId, relationId: null, version: null,
    code: o.controlCode, title: o.controlTitle,
    context: `${o.controlGroupCode ? `${o.controlGroupCode} — ${o.controlGroupTitle} / ` : ""}${o.subprocessCode} — ${o.subprocessTitle}`,
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
  }));
  return (source as PolicyRequirementOption[]).map(o => ({
    endpointId: o.centralRequirementScopeId, objectId: o.requirementId, relationId: null, version: null,
    code: o.requirementCode, title: o.requirementTitle,
    context: `${o.regulationCode} — ${o.regulationTitle} / ${o.subprocessCode} — ${o.subprocessTitle}`,
    status: "ACTIVE", validFrom: o.validFrom, validTo: o.validTo, eligible: o.status === "ACTIVE",
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
export default function PolicyRelationTab({
  kind, policyId, policyValidFrom, policyValidTo, readOnly, canView, canManage, busy, onChanges, onInvalid,
}: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [deletedRows, setDeletedRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<Choice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PolicyRelationDraft>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionSearch, setSelectionSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<Row | null>(null);
  const [editorFrom, setEditorFrom] = useState("");
  const [editorTo, setEditorTo] = useState("");
  const [fromDraft, setFromDraft] = useState<PersianDateDraftState>(emptyDate);
  const [toDraft, setToDraft] = useState<PersianDateDraftState>(emptyDate);
  const [view, setView] = useState<Row | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    if (!policyId || !canView) return;
    const current = ++generation.current;
    const load = async () => {
      setLoading(true);
      try {
        const [live, deleted] = await Promise.all([
          readRows(kind, policyId), readRows(kind, policyId, true),
        ]);
        if (current !== generation.current) return;
        setRows(normalizeRows(kind, live));
        setDeletedRows(normalizeRows(kind, deleted));
        setError(false);
      } catch {
        if (current === generation.current) setError(true);
      } finally {
        if (current === generation.current) setLoading(false);
      }
    };
    void load();
    return () => { generation.current += 1; };
  }, [kind, policyId, canView]);
  const change = (next: Record<string, PolicyRelationDraft>) => {
    setDrafts(next);
    onChanges(Object.values(next));
  };
  const put = (draft: PolicyRelationDraft) => change({ ...drafts, [draft.endpointId]: draft });
  const undo = (id: string) => {
    const next = { ...drafts }; delete next[id]; change(next);
  };
  const effective = useMemo(() => {
    const result = rows.map(row => ({ ...row, draft: drafts[row.endpointId] ?? null }));
    const known = new Set(rows.map(row => row.endpointId));
    for (const draft of Object.values(drafts)) {
      if (known.has(draft.endpointId) || draft.operation !== "CREATE_OR_RESTORE") continue;
      const choice = options.find(o => o.endpointId === draft.endpointId)
        ?? deletedRows.find(o => o.endpointId === draft.endpointId);
      result.push({ ...(choice ?? { endpointId: draft.endpointId, objectId: draft.endpointId, relationId: null, version: null,
        code: draft.endpointId, title: "", context: "", status: "ACTIVE" as const,
        validFrom: null, validTo: null }), draft });
    }
    return result;
  }, [rows, drafts, options, deletedRows]);
  const visible = effective.filter(row => {
    const status = displayStatus(row, row.draft);
    return (filter === "ALL" || filter === status)
      && `${row.code} ${row.title} ${row.context}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const openSelection = async () => {
    setSelectionOpen(true);
    setSelectionSearch("");
    setSelected(new Set(effective.filter(r => r.draft?.operation !== "DELETE").map(r => r.endpointId)));
    if (!canView) return;
    try {
      const source = await readOptions(kind);
      setOptions(normalizeOptions(kind, source));
      setError(false);
    } catch { setError(true); }
  };
  const choices = useMemo(() => {
    const map = new Map<string, Choice>();
    for (const option of options) map.set(option.endpointId, option);
    for (const row of [...rows, ...deletedRows]) {
      if (!map.has(row.endpointId)) map.set(row.endpointId, { ...row, eligible: false });
    }
    for (const row of effective) {
      if (!map.has(row.endpointId)) map.set(row.endpointId, { ...row, eligible: false });
    }
    return [...map.values()];
  }, [options, rows, deletedRows, effective]);
  const grouped = useMemo(() => {
    const map = new Map<string, Choice[]>();
    for (const choice of choices) {
      if (!`${choice.code} ${choice.title} ${choice.context}`.toLowerCase().includes(selectionSearch.trim().toLowerCase())) continue;
      const key = choice.context || t("policy.relations.ungrouped");
      map.set(key, [...(map.get(key) ?? []), choice]);
    }
    return [...map.entries()];
  }, [choices, selectionSearch, t]);
  const confirmSelection = () => {
    const next = { ...drafts };
    const active = new Set(rows.map(r => r.endpointId));
    for (const id of selected) {
      if (active.has(id)) {
        if (next[id]?.operation === "DELETE") delete next[id];
      } else if (!next[id]) {
        next[id] = { endpointId: id, relationId: null, version: null,
          operation: "CREATE_OR_RESTORE", validFrom: policyValidFrom,
          validTo: policyValidTo, requestedStatus: null };
      }
    }
    for (const id of active) {
      if (!selected.has(id)) {
        const row = rows.find(r => r.endpointId === id)!;
        next[id] = { endpointId: id, relationId: row.relationId, version: row.version,
          operation: "DELETE", validFrom: null, validTo: null, requestedStatus: null };
      }
    }
    for (const id of Object.keys(next)) {
      if (!selected.has(id) && !active.has(id)) delete next[id];
    }
    change(next); setSelectionOpen(false);
  };
  const actionRow = effective.find(r => r.endpointId === actionId) ?? null;
  const rowAction = (row: Row, operation: PolicyScopeOperation) => {
    setActionId(null); setOpener(null);
    put({ endpointId: row.endpointId, relationId: row.relationId, version: row.version,
      operation, validFrom: operation === "UPDATE" ? row.validFrom : null,
      validTo: operation === "UPDATE" ? row.validTo : null,
      requestedStatus: null });
  };
  const openEditor = (row: Row) => {
    setActionId(null); setOpener(null);
    setEditor(row);
    const draft = drafts[row.endpointId];
    setEditorFrom(draft ? draft.validFrom ?? "" : row.validFrom ?? "");
    setEditorTo(draft ? draft.validTo ?? "" : row.validTo ?? "");
    setFromDraft(emptyDate); setToDraft(emptyDate); onInvalid(false);
  };
  const invalidDate = !fromDraft.valid || !toDraft.valid || Boolean(editorFrom && editorTo && editorFrom > editorTo);
  useEffect(() => onInvalid(Boolean(editor && invalidDate)), [editor, invalidDate, onInvalid]);
  const saveEditor = () => {
    if (!editor || invalidDate) return;
    const original = drafts[editor.endpointId];
    put({ endpointId: editor.endpointId,
      relationId: original?.operation === "CREATE_OR_RESTORE" ? null : editor.relationId,
      version: original?.operation === "CREATE_OR_RESTORE" ? null : editor.version,
      operation: original?.operation === "CREATE_OR_RESTORE" ? "CREATE_OR_RESTORE" : "UPDATE",
      validFrom: editorFrom || null, validTo: editorTo || null,
      requestedStatus: original?.requestedStatus ?? null });
    setEditor(null); onInvalid(false);
  };
  if (!canView) return <MessageStrip design="Information" hideCloseButton>{t("policy.relations.noAccess")}</MessageStrip>;
  return <section className="policyRelationTab">
    <div className="policyRelationToolbar">
      <Input value={search} placeholder={t("policy.relations.search")} onInput={e => setSearch(e.target.value)} />
      <Select value={filter} onChange={e => setFilter(e.detail.selectedOption?.value ?? "ALL")}>
        <Option value="ALL">{t("policy.relations.all")}</Option>
        <Option value="ACTIVE">{t("common.active")}</Option>
        <Option value="INACTIVE">{t("common.inactive")}</Option>
      </Select>
      {!readOnly && canManage ? <Button design="Emphasized" disabled={busy} onClick={() => void openSelection()}>{t("policy.relations.select")}</Button> : null}
    </div>
    {error ? <MessageStrip design="Negative" hideCloseButton>{t("policy.relations.loadError")}</MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : visible.length ? <Table headerRow={<TableHeaderRow>
      <TableHeaderCell>{t("policy.relations.reference")}</TableHeaderCell>
      <TableHeaderCell>{t("policy.relations.context")}</TableHeaderCell>
      <TableHeaderCell>{t("policy.fields.validFrom")}</TableHeaderCell>
      <TableHeaderCell>{t("policy.fields.validTo")}</TableHeaderCell>
      <TableHeaderCell>{t("policy.fields.status")}</TableHeaderCell>
      {!readOnly && canManage ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}
    </TableHeaderRow>}>
      {visible.map(row => {
        const status = displayStatus(row, row.draft);
        const dates = displayDates(row, row.draft);
        return <TableRow key={row.endpointId} rowKey={row.endpointId}>
          <TableCell><Link accessibleRole="Button" onClick={e => { e.preventDefault(); setView(row); }}>{row.code} — {row.title}</Link></TableCell>
          <TableCell>{row.context || "—"}</TableCell>
          <TableCell>{formatPersianDate(dates.from)}</TableCell>
          <TableCell>{formatPersianDate(dates.to)}</TableCell>
          <TableCell><ObjectStatus state={row.draft ? "Information" : status === "ACTIVE" ? "Positive" : status === "DELETED" ? "Negative" : "Critical"}>
            {t(`policy.relations.status.${status}`)}{row.draft ? ` · ${t("policy.relations.pending")}` : ""}
          </ObjectStatus></TableCell>
          {!readOnly && canManage ? <TableCell><Button design="Transparent" icon="overflow"
            accessibleName={t("common.actions")} onClick={e => { setActionId(row.endpointId); setOpener(e.currentTarget as HTMLElement); }} /></TableCell> : null}
        </TableRow>;
      })}
    </Table> : <MessageStrip design="Information" hideCloseButton>{t("policy.relations.empty")}</MessageStrip>}
    {!readOnly && canManage ? <ActionSheet open={Boolean(actionRow && opener)} opener={opener} onClose={() => { setActionId(null); setOpener(null); }}>
      {actionRow?.draft ? <>
        {(actionRow.draft.operation === "CREATE_OR_RESTORE" || actionRow.draft.operation === "UPDATE")
          ? <Button icon="edit" onClick={() => openEditor(actionRow)}>{t("common.edit")}</Button> : null}
        <Button icon="undo" onClick={() => { undo(actionRow.endpointId); setActionId(null); setOpener(null); }}>{t("policy.relations.undo")}</Button>
      </> : <>
        <Button icon="edit" onClick={() => actionRow && openEditor(actionRow)}>{t("common.edit")}</Button>
        {actionRow?.status === "ACTIVE" ? <Button icon="pause" onClick={() => actionRow && rowAction(actionRow, "INACTIVATE")}>{t("policy.relations.inactivate")}</Button> : null}
        {actionRow?.status === "INACTIVE" ? <Button icon="accept" onClick={() => actionRow && rowAction(actionRow, "ACTIVATE")}>{t("policy.relations.activate")}</Button> : null}
        <Button icon="delete" onClick={() => actionRow && rowAction(actionRow, "DELETE")}>{t("policy.relations.remove")}</Button>
      </>}
    </ActionSheet> : null}
    <Dialog open={selectionOpen} accessibleName={t("policy.relations.select")} onClose={e => { if (isOwnClose(e)) setSelectionOpen(false); }}>
      <ModalDialogHeader title={t("policy.relations.select")} onClose={() => setSelectionOpen(false)} />
      <Input value={selectionSearch} placeholder={t("policy.relations.search")} onInput={e => setSelectionSearch(e.target.value)} />
      <List separators="Inner" accessibleName={t("policy.relations.select")}>
        {grouped.map(([group, members]) => <ListItemGroup key={group} headerText={group} headerAccessibleName={group}>
          {members.map(choice => <ListItemCustom key={choice.endpointId} type="Inactive" accessibleName={`${choice.code} ${choice.title}`}>
            <CheckBox accessibleName={`${choice.code} ${choice.title}`} checked={selected.has(choice.endpointId)}
              disabled={!choice.eligible && !selected.has(choice.endpointId)}
              onChange={e => setSelected(current => { const next = new Set(current); if (e.target.checked) next.add(choice.endpointId); else next.delete(choice.endpointId); return next; })} />
            <span>{choice.code} — {choice.title}</span>
          </ListItemCustom>)}
        </ListItemGroup>)}
      </List>
      <div className="policyRelationDialogActions"><Button design="Emphasized" onClick={confirmSelection}>{t("common.save")}</Button><Button design="Transparent" onClick={() => setSelectionOpen(false)}>{t("common.cancel")}</Button></div>
    </Dialog>
    <Dialog open={Boolean(editor)} accessibleName={t("policy.relations.edit")} onClose={e => { if (isOwnClose(e)) { setEditor(null); onInvalid(false); } }}>
      <ModalDialogHeader title={t("policy.relations.edit")} onClose={() => { setEditor(null); onInvalid(false); }} />
      <PersianDatePicker value={editorFrom} accessibleName={t("policy.fields.validFrom")} invalidValueMessage={t("common.invalidPersianDate")}
        onChange={setEditorFrom} onDraftStateChange={setFromDraft} />
      <PersianDatePicker value={editorTo} accessibleName={t("policy.fields.validTo")} invalidValueMessage={t("common.invalidPersianDate")}
        onChange={setEditorTo} onDraftStateChange={setToDraft} />
      <div className="policyRelationDialogActions"><Button design="Emphasized" disabled={invalidDate} onClick={saveEditor}>{t("common.save")}</Button><Button design="Transparent" onClick={() => { setEditor(null); onInvalid(false); }}>{t("common.cancel")}</Button></div>
    </Dialog>
    {view ? <PolicyReferenceView key={`${kind}:${view.objectId}`} kind={kind}
      objectId={view.objectId} onClose={() => setView(null)} /> : null}
  </section>;
}
