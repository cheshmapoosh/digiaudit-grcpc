import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionSheet, BusyIndicator, Button, Icon, Input, Label, Link, MessageStrip, ObjectStatus, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Title } from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { RiskTemplateOption, AssignmentDraftRow, AssignmentDraftState, RiskControlAssignmentChange, RiskControlAssignment } from "../domain/riskControlAssignment.model";
import { riskControlAssignmentApi } from "../infra/riskControlAssignment.api.repo";
import { useRiskControlAssignmentPermissions } from "../security/riskControlAssignmentPermissions";
import { riskControlAssignmentErrorMessage } from "../utils/riskControlAssignmentError";
import RiskTemplateSelectionDialog from "./RiskTemplateSelectionDialog";
import AssignmentValidityDialog from "./AssignmentValidityDialog";
import "@/shared/styles/central-assignment.css";

interface Props { controlId: string | null; readOnly: boolean; busy?: boolean; onDraftStateChange?: (state: AssignmentDraftState) => void; }
function persisted(row: RiskControlAssignment): AssignmentDraftRow { return { key: row.assignmentId, assignmentId: row.assignmentId, riskTemplateId: row.riskTemplateId, riskTemplateCode: row.riskTemplateCode, riskTemplateTitle: row.riskTemplateTitle, riskTemplateStatus: row.riskTemplateStatus, riskTemplateValidFrom: row.riskTemplateValidFrom, riskTemplateValidTo: row.riskTemplateValidTo, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row }; }
function same(row: AssignmentDraftRow, original: RiskControlAssignment) { return row.validFrom === original.validFrom && row.validTo === original.validTo && row.status === original.status; }
function changes(rows: AssignmentDraftRow[]): RiskControlAssignmentChange[] { return rows.flatMap((row): RiskControlAssignmentChange[] => {
  if (row.editState === "DRAFT_RESTORED") return [{ operation: "RESTORE", riskTemplateId: row.riskTemplateId, assignmentId: row.assignmentId, version: row.version }];
  if (row.original?.status === "DELETED") return [];
  if (row.editState === "DRAFT_DELETE") return [{ operation: "DELETE", riskTemplateId: row.riskTemplateId, assignmentId: row.assignmentId, version: row.version }];
  if (!row.original) return [{ operation: "CREATE_OR_RESTORE", riskTemplateId: row.riskTemplateId, validFrom: row.validFrom, validTo: row.validTo }];
  if (row.editState !== "DRAFT_EDITED") return [];
  const fields = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
  return fields ? [{ operation: "UPDATE", riskTemplateId: row.riskTemplateId, assignmentId: row.assignmentId, version: row.version, validFrom: row.validFrom, validTo: row.validTo, requestedStatus: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" }]
    : [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", riskTemplateId: row.riskTemplateId, assignmentId: row.assignmentId, version: row.version }];
}); }
function opener(event: unknown): HTMLElement | null { const value = (event as { currentTarget?: EventTarget | null }).currentTarget; return value instanceof HTMLElement ? value : null; }

export default function ControlRiskTemplateAssignmentsTab({ controlId, readOnly, busy: parentBusy = false, onDraftStateChange }: Props) {
  const { t } = useTranslation(); const permissions = useRiskControlAssignmentPermissions();
  const [rows, setRows] = useState<AssignmentDraftRow[]>([]); const [options, setOptions] = useState<RiskTemplateOption[]>([]);
  const [loading, setLoading] = useState(true); const [loaded, setLoaded] = useState(false); const [error, setError] = useState<string | null>(null); const [search, setSearch] = useState(""); const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "DELETED">("ALL");
  const [selectOpen, setSelectOpen] = useState(false); const [editKey, setEditKey] = useState<string | null>(null); const [actionKey, setActionKey] = useState<string | null>(null); const [actionOpener, setActionOpener] = useState<HTMLElement | null>(null); const generation = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => { const current = ++generation.current; if (!permissions.view) { setRows([]); setOptions([]); setLoading(false); setLoaded(true); return; } setLoading(true); setLoaded(false); try { const [optionResponse, canonical, deleted] = await Promise.all([readOnly ? Promise.resolve({ riskTemplates: [] }) : riskControlAssignmentApi.options(signal), controlId ? riskControlAssignmentApi.forControl(controlId, signal) : Promise.resolve([]), controlId ? riskControlAssignmentApi.deletedForControl(controlId, signal) : Promise.resolve([])]); if (current !== generation.current) return; setOptions(optionResponse.riskTemplates); setRows([...canonical, ...deleted].map(persisted)); setError(null); setLoaded(true); } catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; if (current === generation.current) setError(riskControlAssignmentErrorMessage(cause, t)); } finally { if (current === generation.current) setLoading(false); } }, [controlId, permissions.view, readOnly, t]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const [editorDraft, setEditorDraft] = useState({ dirty: false, invalid: false });
  const [selectionDirty, setSelectionDirty] = useState(false);
  const pending = useMemo(() => changes(rows), [rows]);
  useEffect(() => onDraftStateChange?.({ changes: pending, dirty: pending.length > 0 || editorDraft.dirty || selectionDirty, ready: (loaded || !permissions.view) && !editorDraft.dirty && !selectionDirty, invalid: Boolean(error) || editorDraft.invalid }), [editorDraft, error, loaded, onDraftStateChange, pending, permissions.view, selectionDirty]);
  const visible = useMemo(() => { const needle = search.trim().toLocaleLowerCase(); return rows.filter((row) => (filter === "ALL" ? row.status !== "DELETED" : row.status === filter) && (!needle || row.riskTemplateCode.toLocaleLowerCase().includes(needle) || row.riskTemplateTitle.toLocaleLowerCase().includes(needle))); }, [filter, rows, search]);
  const editing = rows.find((row) => row.key === editKey) ?? null; const action = rows.find((row) => row.key === actionKey) ?? null; const mutationBusy = parentBusy || loading;
  const confirmSelection = (selected: Set<string>) => {
    setRows(current => {
      const optionById = new Map(options.map(item => [item.id, item]));
      const next = current.flatMap((row): AssignmentDraftRow[] => {
        if (row.original?.status === "DELETED") return [selected.has(row.riskTemplateId)
          ? { ...row, status: "ACTIVE", editState: "DRAFT_RESTORED" } : persisted(row.original)];
        if (selected.has(row.riskTemplateId)) return [row.editState === "DRAFT_DELETE" && row.original ? persisted(row.original) : row];
        return row.original ? [{ ...row, editState: "DRAFT_DELETE" }] : [];
      });
      const occupied = new Set(current.map(row => row.riskTemplateId));
      for (const id of selected) {
        if (occupied.has(id)) continue;
        const item = optionById.get(id);
        if (item?.status !== "ACTIVE") continue;
        next.push({ key: `new:${id}`, assignmentId: null, riskTemplateId: id, riskTemplateCode: item.code, riskTemplateTitle: item.title,
          riskTemplateStatus: item.status, riskTemplateValidFrom: item.validFrom, riskTemplateValidTo: item.validTo,
          status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
      }
      return next;
    });
    setSelectOpen(false);
  };
  const saveValidity = (from: string | null, to: string | null) => { if (!editKey) return; setRows((current) => current.map((row) => { if (row.key !== editKey) return row; const next = { ...row, validFrom: from, validTo: to }; return { ...next, editState: !next.original ? "DRAFT_NEW" : same(next, next.original) ? "FINAL" : "DRAFT_EDITED" }; })); setEditKey(null); };
  const setLifecycle = (row: AssignmentDraftRow, status: "ACTIVE" | "INACTIVE") => setRows((current) => current.map((candidate) => candidate.key !== row.key ? candidate : { ...candidate, status, editState: candidate.original && same({ ...candidate, status }, candidate.original) ? "FINAL" : candidate.original ? "DRAFT_EDITED" : "DRAFT_NEW" }));
  const remove = (row: AssignmentDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? { ...candidate, editState: "DRAFT_DELETE" } : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const undo = (row: AssignmentDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? persisted(row.original!) : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const closeActions = () => { setActionKey(null); setActionOpener(null); }; const run = (fn: () => void) => { closeActions(); fn(); };
  const status = (row: AssignmentDraftRow) => row.editState === "FINAL" ? t(`riskControlAssignment.status.${row.status}`) : t(`riskControlAssignment.editState.${row.editState}`);
  if (!permissions.view) return <MessageStrip design="Information">{t("riskControlAssignment.errors.forbidden")}</MessageStrip>;
  return <section className="centralAssignmentTab"><div className="centralAssignmentToolbar"><Title level="H5">{t("riskControlAssignment.title")}</Title><div className="centralAssignmentToolbarGroup"><Input className="centralAssignmentSearch" value={search} placeholder={t("riskControlAssignment.search")} disabled={mutationBusy} onInput={(event) => setSearch(event.target.value)} /><div className="centralAssignmentFilter"><Label showColon>{t("riskControlAssignment.fields.status")}</Label><Select value={filter} disabled={mutationBusy} onChange={(event) => setFilter(event.target.value as typeof filter)}><Option value="ALL">{t("riskControlAssignment.filter.all")}</Option><Option value="ACTIVE">{t("riskControlAssignment.status.ACTIVE")}</Option><Option value="INACTIVE">{t("riskControlAssignment.status.INACTIVE")}</Option><Option value="DELETED">{t("riskControlAssignment.status.DELETED")}</Option></Select></div>{!readOnly && (permissions.create || permissions.lifecycle || permissions.restore || permissions.delete) ? <Button design="Emphasized" disabled={mutationBusy || !loaded} onClick={() => setSelectOpen(true)}>{t("riskControlAssignment.actions.select")}</Button> : null}</div></div>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}<Button design="Transparent" onClick={() => void load()}>{t("riskControlAssignment.actions.retry")}</Button></MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : visible.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("riskControlAssignment.fields.riskTemplate")}</TableHeaderCell><TableHeaderCell>{t("riskControlAssignment.fields.endpointStatus")}</TableHeaderCell><TableHeaderCell>{t("riskControlAssignment.fields.endpointValidity")}</TableHeaderCell><TableHeaderCell>{t("riskControlAssignment.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("riskControlAssignment.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("riskControlAssignment.fields.status")}</TableHeaderCell>{!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}</TableHeaderRow>}>{visible.map((row) => <TableRow key={row.key} rowKey={row.key}><TableCell>{<Link href={`/risks?riskTemplateId=${row.riskTemplateId}`} wrappingType="Normal">{`${row.riskTemplateCode} — ${row.riskTemplateTitle}`}</Link>}</TableCell><TableCell><ObjectStatus state={row.riskTemplateStatus === "ACTIVE" ? "Positive" : "None"}>{t(`riskControlAssignment.status.${row.riskTemplateStatus}`)}</ObjectStatus></TableCell><TableCell>{formatPersianDate(row.riskTemplateValidFrom)} – {formatPersianDate(row.riskTemplateValidTo)}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell><ObjectStatus state={row.editState === "FINAL" && row.status === "ACTIVE" ? "Positive" : row.editState === "FINAL" ? "None" : "Information"} icon={<Icon name={row.editState === "FINAL" && row.status === "ACTIVE" ? "accept" : row.editState === "FINAL" ? "pause" : "information"} mode="Decorative" />}>{status(row)}</ObjectStatus></TableCell>{!readOnly ? <TableCell><Button design="Transparent" icon="overflow" accessibleName={t("common.actions")} disabled={mutationBusy} onClick={(event) => { setActionKey(row.key); setActionOpener(opener(event)); }} /></TableCell> : null}</TableRow>)}</Table> : loaded ? <div className="centralAssignmentEmpty">{t("riskControlAssignment.empty")}</div> : null}
    {!readOnly ? <ActionSheet open={Boolean(action && actionOpener)} opener={actionOpener} placement="Bottom" horizontalAlign="End" headerText={t("common.actions")} onClose={closeActions}>{action && action.editState !== "FINAL" ? <>{action.editState !== "DRAFT_DELETE" && action.editState !== "DRAFT_RESTORED" && permissions.update ? <Button icon="edit" onClick={() => run(() => setEditKey(action.key))}>{t("riskControlAssignment.actions.edit")}</Button> : null}<Button icon="undo" onClick={() => run(() => undo(action))}>{t("riskControlAssignment.actions.undo")}</Button></> : action?.status === "DELETED" ? <Button icon="undo" disabled={!permissions.restore || action.riskTemplateStatus !== "ACTIVE"} onClick={() => run(() => setRows(current => current.map(row => row.key === action.key ? { ...row, status: "ACTIVE", editState: "DRAFT_RESTORED" } : row)))}>{t("riskControlAssignment.actions.restore")}</Button> : <>{action && permissions.update ? <Button icon="edit" onClick={() => run(() => setEditKey(action.key))}>{t("riskControlAssignment.actions.edit")}</Button> : null}{action && permissions.lifecycle && action.status === "ACTIVE" ? <Button icon="pause" onClick={() => run(() => setLifecycle(action, "INACTIVE"))}>{t("riskControlAssignment.actions.inactivate")}</Button> : null}{action && permissions.lifecycle && action.status === "INACTIVE" ? <Button icon="accept" onClick={() => run(() => setLifecycle(action, "ACTIVE"))}>{t("riskControlAssignment.actions.activate")}</Button> : null}{action && permissions.delete ? <Button icon="delete" onClick={() => run(() => remove(action))}>{t("riskControlAssignment.actions.delete")}</Button> : null}</>}</ActionSheet> : null}
    <RiskTemplateSelectionDialog open={selectOpen} options={options} rows={rows} busy={mutationBusy} canSelect={permissions.create || permissions.lifecycle || permissions.restore} canDelete={permissions.delete} onDirtyChange={setSelectionDirty} onClose={() => setSelectOpen(false)} onConfirm={confirmSelection} />
    <AssignmentValidityDialog open={Boolean(editing)} row={editing} busy={mutationBusy} onDraftStateChange={setEditorDraft} onClose={() => setEditKey(null)} onSave={saveValidity} />
  </section>;
}
