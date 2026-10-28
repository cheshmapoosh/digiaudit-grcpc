import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionSheet, BusyIndicator, Button, Icon, Label, Link, MessageStrip, ObjectStatus, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Title } from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { RequirementOption, AssignmentDraftRow, AssignmentDraftState, RequirementControlAssignmentChange, RequirementControlAssignment } from "../domain/requirementControlAssignment.model";
import { requirementControlAssignmentApi } from "../infra/requirementControlAssignment.api.repo";
import { useRequirementControlAssignmentPermissions } from "../security/requirementControlAssignmentPermissions";
import { requirementControlAssignmentErrorMessage } from "../utils/requirementControlAssignmentError";
import RequirementSelectionDialog from "./RequirementSelectionDialog";
import AssignmentValidityDialog from "./AssignmentValidityDialog";
import "@/shared/styles/central-assignment.css";

interface Props { controlId: string | null; readOnly: boolean; busy?: boolean; onDraftStateChange?: (state: AssignmentDraftState) => void; }
function persisted(row: RequirementControlAssignment): AssignmentDraftRow { return { key: row.assignmentId, assignmentId: row.assignmentId, requirementId: row.requirementId, requirementCode: row.requirementCode, requirementTitle: row.requirementTitle, requirementStatus: row.requirementStatus, requirementValidFrom: row.requirementValidFrom, requirementValidTo: row.requirementValidTo, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row }; }
function same(row: AssignmentDraftRow, original: RequirementControlAssignment) { return row.validFrom === original.validFrom && row.validTo === original.validTo && row.status === original.status; }
function changes(rows: AssignmentDraftRow[]): RequirementControlAssignmentChange[] { return rows.flatMap((row): RequirementControlAssignmentChange[] => {
  if (row.editState === "DRAFT_RESTORED") return [{ operation: "RESTORE", requirementId: row.requirementId, assignmentId: row.assignmentId, version: row.version }];
  if (row.original?.status === "DELETED") return [];
  if (row.editState === "DRAFT_DELETE") return [{ operation: "DELETE", requirementId: row.requirementId, assignmentId: row.assignmentId, version: row.version }];
  if (!row.original) return [{ operation: "CREATE_OR_RESTORE", requirementId: row.requirementId, validFrom: row.validFrom, validTo: row.validTo }];
  if (row.editState !== "DRAFT_EDITED") return [];
  const fields = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
  return fields ? [{ operation: "UPDATE", requirementId: row.requirementId, assignmentId: row.assignmentId, version: row.version, validFrom: row.validFrom, validTo: row.validTo, requestedStatus: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" }]
    : [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", requirementId: row.requirementId, assignmentId: row.assignmentId, version: row.version }];
}); }
function opener(event: unknown): HTMLElement | null { const value = (event as { currentTarget?: EventTarget | null }).currentTarget; return value instanceof HTMLElement ? value : null; }

export default function ControlRequirementAssignmentsTab({ controlId, readOnly, busy: parentBusy = false, onDraftStateChange }: Props) {
  const { t } = useTranslation(); const permissions = useRequirementControlAssignmentPermissions();
  const [rows, setRows] = useState<AssignmentDraftRow[]>([]); const [options, setOptions] = useState<RequirementOption[]>([]);
  const [loading, setLoading] = useState(true); const [loaded, setLoaded] = useState(false); const [error, setError] = useState<string | null>(null); const [search, setSearch] = useState(""); const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "DELETED">("ALL");
  const [selectOpen, setSelectOpen] = useState(false); const [editKey, setEditKey] = useState<string | null>(null); const [actionKey, setActionKey] = useState<string | null>(null); const [actionOpener, setActionOpener] = useState<HTMLElement | null>(null); const generation = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => { const current = ++generation.current; if (!permissions.view) { setRows([]); setOptions([]); setLoading(false); setLoaded(true); return; } setLoading(true); setLoaded(false); try { const [optionResponse, canonical, deleted] = await Promise.all([readOnly ? Promise.resolve({ requirements: [] }) : requirementControlAssignmentApi.options(signal), controlId ? requirementControlAssignmentApi.forControl(controlId, signal) : Promise.resolve([]), controlId ? requirementControlAssignmentApi.deletedForControl(controlId, signal) : Promise.resolve([])]); if (current !== generation.current) return; setOptions(optionResponse.requirements); setRows([...canonical, ...deleted].map(persisted)); setError(null); setLoaded(true); } catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; if (current === generation.current) setError(requirementControlAssignmentErrorMessage(cause, t)); } finally { if (current === generation.current) setLoading(false); } }, [controlId, permissions.view, readOnly, t]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const [editorDraft, setEditorDraft] = useState({ dirty: false, invalid: false });
  const [selectionDirty, setSelectionDirty] = useState(false);
  const pending = useMemo(() => changes(rows), [rows]);
  useEffect(() => onDraftStateChange?.({ changes: pending, dirty: pending.length > 0 || editorDraft.dirty || selectionDirty, ready: (loaded || !permissions.view) && !editorDraft.dirty && !selectionDirty, invalid: Boolean(error) || editorDraft.invalid }), [editorDraft, error, loaded, onDraftStateChange, pending, permissions.view, selectionDirty]);
  const visible = useMemo(() => { const needle = search.trim().toLocaleLowerCase(); return rows.filter((row) => (filter === "ALL" ? row.status !== "DELETED" : row.status === filter) && (!needle || row.requirementCode.toLocaleLowerCase().includes(needle) || row.requirementTitle.toLocaleLowerCase().includes(needle))); }, [filter, rows, search]);
  const editing = rows.find((row) => row.key === editKey) ?? null; const action = rows.find((row) => row.key === actionKey) ?? null; const mutationBusy = parentBusy || loading;
  const confirmSelection = (selected: Set<string>) => {
    setRows(current => {
      const optionById = new Map(options.map(item => [item.id, item]));
      const next = current.flatMap((row): AssignmentDraftRow[] => {
        if (row.original?.status === "DELETED") return [selected.has(row.requirementId)
          ? { ...row, status: "ACTIVE", editState: "DRAFT_RESTORED" } : persisted(row.original)];
        if (selected.has(row.requirementId)) return [row.editState === "DRAFT_DELETE" && row.original ? persisted(row.original) : row];
        return row.original ? [{ ...row, editState: "DRAFT_DELETE" }] : [];
      });
      const occupied = new Set(current.map(row => row.requirementId));
      for (const id of selected) {
        if (occupied.has(id)) continue;
        const item = optionById.get(id);
        if (item?.status !== "ACTIVE") continue;
        next.push({ key: `new:${id}`, assignmentId: null, requirementId: id, requirementCode: item.code, requirementTitle: item.title,
          requirementStatus: item.status, requirementValidFrom: item.validFrom, requirementValidTo: item.validTo,
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
  const status = (row: AssignmentDraftRow) => row.editState === "FINAL" ? t(`requirementControlAssignment.status.${row.status}`) : t(`requirementControlAssignment.editState.${row.editState}`);
  if (!permissions.view) return <MessageStrip design="Information">{t("requirementControlAssignment.errors.forbidden")}</MessageStrip>;
  return <section className="centralAssignmentTab"><div className="centralAssignmentToolbar"><Title level="H5">{t("requirementControlAssignment.title")}</Title><div className="centralAssignmentToolbarGroup"><div className="centralAssignmentFilter"><Label showColon>{t("requirementControlAssignment.fields.status")}</Label><Select value={filter} disabled={mutationBusy} onChange={(event) => setFilter(event.target.value as typeof filter)}><Option value="ALL">{t("requirementControlAssignment.filter.all")}</Option><Option value="ACTIVE">{t("requirementControlAssignment.status.ACTIVE")}</Option><Option value="INACTIVE">{t("requirementControlAssignment.status.INACTIVE")}</Option><Option value="DELETED">{t("requirementControlAssignment.status.DELETED")}</Option></Select></div><HeaderSearch value={search} onChange={(value) => setSearch(value)} disabled={mutationBusy} accessibleName={t("requirementControlAssignment.search")} />
  {!readOnly && (permissions.create || permissions.lifecycle || permissions.restore || permissions.delete) ? <Button design="Emphasized" disabled={mutationBusy || !loaded} onClick={() => setSelectOpen(true)}>{t("requirementControlAssignment.actions.select")}</Button> : null}
  </div></div>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}<Button design="Transparent" onClick={() => void load()}>{t("requirementControlAssignment.actions.retry")}</Button></MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : visible.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("requirementControlAssignment.fields.requirement")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.endpointStatus")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.endpointValidity")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.status")}</TableHeaderCell>{!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}</TableHeaderRow>}>{visible.map((row) => <TableRow key={row.key} rowKey={row.key}><TableCell>{<Link href={`/regulations?requirementId=${row.requirementId}`} wrappingType="Normal">{`${row.requirementCode} — ${row.requirementTitle}`}</Link>}</TableCell><TableCell><ObjectStatus state={row.requirementStatus === "ACTIVE" ? "Positive" : "None"}>{t(`requirementControlAssignment.status.${row.requirementStatus}`)}</ObjectStatus></TableCell><TableCell>{formatPersianDate(row.requirementValidFrom)} – {formatPersianDate(row.requirementValidTo)}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell><ObjectStatus state={row.editState === "FINAL" && row.status === "ACTIVE" ? "Positive" : row.editState === "FINAL" ? "None" : "Information"} icon={<Icon name={row.editState === "FINAL" && row.status === "ACTIVE" ? "accept" : row.editState === "FINAL" ? "pause" : "information"} mode="Decorative" />}>{status(row)}</ObjectStatus></TableCell>{!readOnly ? <TableCell><Button design="Transparent" icon="overflow" accessibleName={t("common.actions")} disabled={mutationBusy} onClick={(event) => { setActionKey(row.key); setActionOpener(opener(event)); }} /></TableCell> : null}</TableRow>)}</Table> : loaded ? <div className="centralAssignmentEmpty">{t("requirementControlAssignment.empty")}</div> : null}
    {!readOnly ? <ActionSheet open={Boolean(action && actionOpener)} opener={actionOpener} placement="Bottom" horizontalAlign="End" headerText={t("common.actions")} onClose={closeActions}>{action && action.editState !== "FINAL" ? <>{action.editState !== "DRAFT_DELETE" && action.editState !== "DRAFT_RESTORED" && permissions.update ? <Button icon="edit" onClick={() => run(() => setEditKey(action.key))}>{t("requirementControlAssignment.actions.edit")}</Button> : null}<Button icon="undo" onClick={() => run(() => undo(action))}>{t("requirementControlAssignment.actions.undo")}</Button></> : action?.status === "DELETED" ? <Button icon="undo" disabled={!permissions.restore || action.requirementStatus !== "ACTIVE"} onClick={() => run(() => setRows(current => current.map(row => row.key === action.key ? { ...row, status: "ACTIVE", editState: "DRAFT_RESTORED" } : row)))}>{t("requirementControlAssignment.actions.restore")}</Button> : <>{action && permissions.update ? <Button icon="edit" onClick={() => run(() => setEditKey(action.key))}>{t("requirementControlAssignment.actions.edit")}</Button> : null}{action && permissions.lifecycle && action.status === "ACTIVE" ? <Button icon="pause" onClick={() => run(() => setLifecycle(action, "INACTIVE"))}>{t("requirementControlAssignment.actions.inactivate")}</Button> : null}{action && permissions.lifecycle && action.status === "INACTIVE" ? <Button icon="accept" onClick={() => run(() => setLifecycle(action, "ACTIVE"))}>{t("requirementControlAssignment.actions.activate")}</Button> : null}{action && permissions.delete ? <Button icon="delete" onClick={() => run(() => remove(action))}>{t("requirementControlAssignment.actions.delete")}</Button> : null}</>}</ActionSheet> : null}
    <RequirementSelectionDialog open={selectOpen} options={options} rows={rows} busy={mutationBusy} canSelect={permissions.create || permissions.lifecycle || permissions.restore} canDelete={permissions.delete} onDirtyChange={setSelectionDirty} onClose={() => setSelectOpen(false)} onConfirm={confirmSelection} />
    <AssignmentValidityDialog open={Boolean(editing)} row={editing} busy={mutationBusy} onDraftStateChange={setEditorDraft} onClose={() => setEditKey(null)} onSave={saveValidity} />
  </section>;
}
