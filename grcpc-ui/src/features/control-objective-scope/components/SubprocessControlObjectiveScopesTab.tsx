import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionSheet, BusyIndicator, Button, Dialog, Icon, Input, Label, Link, MessageStrip, ObjectStatus, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Tag, Title } from "@ui5/webcomponents-react";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import type { CentralControlObjectiveDetail } from "@/features/control-objective/domain/centralControlObjective.model";
import { centralControlObjectiveApi } from "@/features/control-objective/infra/centralControlObjective.api";
import CentralControlObjectiveObjectPage, { type CentralControlObjectiveTabKey } from "@/features/control-objective/pages/CentralControlObjectiveObjectPage";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralSubprocessControlObjectiveScope, ControlObjectiveScopeChange, ControlObjectiveScopeDraftRow, ControlObjectiveScopeDraftState, ControlObjectiveScopeDraftValues, ControlObjectiveScopeSelectionOptions, ControlObjectiveScopeStatusFilter } from "../domain/controlObjectiveScope.model";
import { controlObjectiveScopeApi } from "../infra/controlObjectiveScope.api.repo";
import { useControlObjectiveScopePermissions } from "../security/controlObjectiveScopePermissions";
import { controlObjectiveScopeErrorMessage } from "../utils/controlObjectiveScopeError";
import ControlObjectiveScopeEditorDialog from "./ControlObjectiveScopeEditorDialog";
import ControlObjectiveSelectionDialog from "./ControlObjectiveSelectionDialog";
import "../control-objective-scope.css";
import "@/features/control-objective/controlObjective.css";

interface Props {
  subprocessId: string | null;
  readOnly: boolean;
  busy?: boolean;
  onDraftStateChange?: (state: ControlObjectiveScopeDraftState) => void;
}

const EMPTY_OPTIONS: ControlObjectiveScopeSelectionOptions = { controlObjectives: [] };
const READ_ONLY_CONTROL_OBJECTIVE_PERMISSIONS: CatalogActionPermissions = { create: false, update: false, move: false, lifecycle: false, delete: false, restore: false, publish: false, documentUpload: false };
function readFilter(event: unknown): ControlObjectiveScopeStatusFilter { return ((event as { target?: { value?: string } }).target?.value ?? "ALL") as ControlObjectiveScopeStatusFilter; }
function fromPersisted(row: CentralSubprocessControlObjectiveScope): ControlObjectiveScopeDraftRow {
  return { key: row.id, scopeId: row.id, controlObjectiveId: row.controlObjectiveId, controlObjectiveCode: row.controlObjectiveCode, controlObjectiveTitle: row.controlObjectiveTitle, objectiveClass: row.objectiveClass, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row };
}
function sameValues(row: ControlObjectiveScopeDraftRow, original: CentralSubprocessControlObjectiveScope): boolean {
  return row.validFrom === original.validFrom && row.validTo === original.validTo && row.status === original.status;
}
function sameValidity(row: ControlObjectiveScopeDraftRow, original: CentralSubprocessControlObjectiveScope): boolean {
  return row.validFrom === original.validFrom && row.validTo === original.validTo;
}
type ScopeStatusState = "Positive" | "None" | "Information";
interface ScopeStatusPresentation {
  translationKey: string;
  state: ScopeStatusState;
  icon: "accept" | "pause" | "information";
}
function statusFor(row: ControlObjectiveScopeDraftRow): ScopeStatusPresentation {
  if (row.editState === "FINAL") return row.status === "ACTIVE"
    ? { translationKey: "controlObjectiveScope.status.ACTIVE", state: "Positive", icon: "accept" }
    : { translationKey: "controlObjectiveScope.status.INACTIVE", state: "None", icon: "pause" };
  if (row.editState === "DRAFT_PENDING_DELETE") return { translationKey: "controlObjectiveScope.editState.DELETED", state: "Information", icon: "information" };
  if (row.editState === "DRAFT_NEW") return { translationKey: `controlObjectiveScope.editState.${row.status}`, state: "Information", icon: "information" };
  if (row.original && row.status !== row.original.status && sameValidity(row, row.original)) {
    return { translationKey: `controlObjectiveScope.editState.${row.status}`, state: "Information", icon: "information" };
  }
  return { translationKey: "controlObjectiveScope.editState.EDITED", state: "Information", icon: "information" };
}
function readOpener(event: unknown): HTMLElement | null {
  const currentTarget = (event as { currentTarget?: EventTarget | null }).currentTarget;
  return currentTarget instanceof HTMLElement ? currentTarget : null;
}
function isOwnDialogCloseEvent(event: unknown): boolean {
  const candidate = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(candidate.target && candidate.currentTarget && candidate.target === candidate.currentTarget);
}
function valuesFor(row: ControlObjectiveScopeDraftRow) { return { validFrom: row.validFrom, validTo: row.validTo }; }
function toChanges(rows: ControlObjectiveScopeDraftRow[]): ControlObjectiveScopeChange[] {
  return rows.flatMap((row): ControlObjectiveScopeChange[] => {
    if (row.editState === "DRAFT_PENDING_DELETE") return [{ operation: "DELETE", controlObjectiveId: row.controlObjectiveId, scopeId: row.scopeId, version: row.version }];
    if (!row.original) return [{ operation: "CREATE_OR_RESTORE", controlObjectiveId: row.controlObjectiveId, ...valuesFor(row) }];
    if (row.editState !== "DRAFT_EDITED") return [];
    const validityChanged = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    if (validityChanged) return [{ operation: "UPDATE", controlObjectiveId: row.controlObjectiveId, scopeId: row.scopeId, version: row.version, requestedStatus: row.status, ...valuesFor(row) }];
    return [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", controlObjectiveId: row.controlObjectiveId, scopeId: row.scopeId, version: row.version }];
  });
}

export default function SubprocessControlObjectiveScopesTab({ subprocessId, readOnly, busy: parentBusy = false, onDraftStateChange }: Props) {
  const { t } = useTranslation();
  const permissions = useControlObjectiveScopePermissions();
  const [rows, setRows] = useState<ControlObjectiveScopeDraftRow[]>([]);
  const [options, setOptions] = useState<ControlObjectiveScopeSelectionOptions>(EMPTY_OPTIONS);
  const [filter, setFilter] = useState<ControlObjectiveScopeStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [actionRowKey, setActionRowKey] = useState<string | null>(null);
  const [actionSheetOpener, setActionSheetOpener] = useState<HTMLElement | null>(null);
  const [viewControlObjectiveId, setViewControlObjectiveId] = useState<string | null>(null);
  const [viewControlObjective, setViewControlObjective] = useState<CentralControlObjectiveDetail | null>(null);
  const [viewControlObjectiveBusy, setViewControlObjectiveBusy] = useState(false);
  const [viewControlObjectiveError, setViewControlObjectiveError] = useState<string | null>(null);
  const [viewControlObjectiveTab, setViewControlObjectiveTab] = useState<CentralControlObjectiveTabKey>("general");
  const generationRef = useRef(0);
  const viewGenerationRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = ++generationRef.current;
    if (!permissions.view) { setLoading(false); setLoaded(true); setRows([]); return; }
    setLoading(true); setLoaded(false);
    try {
      const [selectionOptions, persisted] = await Promise.all([
        controlObjectiveScopeApi.options(signal),
        subprocessId ? controlObjectiveScopeApi.listForSubprocess(subprocessId, "ALL", "", signal) : Promise.resolve([]),
      ]);
      if (generation !== generationRef.current) return;
      setOptions(selectionOptions);
      setRows(persisted.map(fromPersisted));
      setError(null); setLoaded(true);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      if (generation === generationRef.current) { setError(controlObjectiveScopeErrorMessage(loadError, t)); setLoaded(false); }
    } finally { if (generation === generationRef.current) setLoading(false); }
  }, [permissions.view, subprocessId, t]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const changes = useMemo(() => toChanges(rows), [rows]);
  useEffect(() => { onDraftStateChange?.({ changes, dirty: changes.length > 0, ready: loaded || !permissions.view, invalid: Boolean(error) }); }, [changes, error, loaded, onDraftStateChange, permissions.view]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => (filter === "ALL" || row.status === filter)
      && (!needle || row.controlObjectiveCode.toLocaleLowerCase().includes(needle) || row.controlObjectiveTitle.toLocaleLowerCase().includes(needle)));
  }, [filter, rows, search]);
  const editing = editingKey ? rows.find((row) => row.key === editingKey) ?? null : null;
  const actionRow = actionRowKey ? rows.find((row) => row.key === actionRowKey) ?? null : null;
  const mutationBusy = parentBusy || loading;

  const confirmSelection = (selectedIds: Set<string>) => {
    setRows((current) => {
      const byControlObjective = new Map(options.controlObjectives.map((controlObjective) => [controlObjective.id, controlObjective]));
      const next: ControlObjectiveScopeDraftRow[] = [];
      for (const row of current) {
        if (selectedIds.has(row.controlObjectiveId)) {
          next.push(row.editState === "DRAFT_PENDING_DELETE" && row.original ? fromPersisted(row.original) : row);
        } else if (row.original) {
          next.push({ ...row, editState: "DRAFT_PENDING_DELETE" });
        }
      }
      const occupied = new Set(current.map((row) => row.controlObjectiveId));
      for (const controlObjectiveId of selectedIds) {
        if (occupied.has(controlObjectiveId)) continue;
        const controlObjective = byControlObjective.get(controlObjectiveId);
        if (!controlObjective || controlObjective.status !== "ACTIVE") continue;
        next.push({ key: `new:${controlObjective.id}`, scopeId: null, controlObjectiveId: controlObjective.id, controlObjectiveCode: controlObjective.code, controlObjectiveTitle: controlObjective.title, objectiveClass: controlObjective.objectiveClass, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
      }
      return next;
    });
    setSelectionOpen(false);
  };

  const saveEdit = (values: ControlObjectiveScopeDraftValues) => {
    if (!editingKey) return;
    setRows((current) => current.map((row) => {
      if (row.key !== editingKey) return row;
      const next = { ...row, ...values };
      return { ...next, editState: !next.original ? "DRAFT_NEW" : sameValues(next, next.original) ? "FINAL" : "DRAFT_EDITED" };
    }));
    setEditingKey(null);
  };
  const changeLifecycle = (row: ControlObjectiveScopeDraftRow, status: ControlObjectiveScopeDraftRow["status"]) => setRows((current) => current.map((candidate) => candidate.key !== row.key ? candidate : { ...candidate, status, editState: candidate.original && sameValues({ ...candidate, status }, candidate.original) ? "FINAL" : candidate.original ? "DRAFT_EDITED" : "DRAFT_NEW" }));
  const remove = (row: ControlObjectiveScopeDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? { ...candidate, editState: "DRAFT_PENDING_DELETE" } : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const undo = (row: ControlObjectiveScopeDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? fromPersisted(row.original!) : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const canEditRow = (row: ControlObjectiveScopeDraftRow) => row.original ? permissions.update : (permissions.create || permissions.restore);
  const canChangeLifecycle = (row: ControlObjectiveScopeDraftRow) => Boolean(row.original && permissions.lifecycle);
  const canRemoveRow = (row: ControlObjectiveScopeDraftRow) => (row.original && permissions.delete) || (!row.original && (permissions.create || permissions.restore));
  const hasRowActions = (row: ControlObjectiveScopeDraftRow) => row.editState !== "FINAL" || canEditRow(row) || canChangeLifecycle(row) || canRemoveRow(row);
  const closeActionSheet = () => { setActionRowKey(null); setActionSheetOpener(null); };
  const runRowAction = (action: () => void) => { closeActionSheet(); action(); };
  const closeControlObjectiveView = () => {
    viewGenerationRef.current += 1;
    setViewControlObjectiveId(null);
    setViewControlObjective(null);
    setViewControlObjectiveError(null);
    setViewControlObjectiveBusy(false);
    setViewControlObjectiveTab("general");
  };
  const openControlObjectiveView = async (controlObjectiveId: string) => {
    if (!permissions.controlObjectiveView) return;
    const generation = ++viewGenerationRef.current;
    setViewControlObjectiveId(controlObjectiveId);
    setViewControlObjective(null);
    setViewControlObjectiveError(null);
    setViewControlObjectiveBusy(true);
    setViewControlObjectiveTab("general");
    try {
      const detail = await centralControlObjectiveApi.detail(controlObjectiveId);
      if (generation === viewGenerationRef.current) setViewControlObjective(detail);
    } catch {
      if (generation === viewGenerationRef.current) setViewControlObjectiveError(t("controlObjective.errors.loadDetail"));
    } finally {
      if (generation === viewGenerationRef.current) setViewControlObjectiveBusy(false);
    }
  };

  if (!permissions.view) return <MessageStrip design="Information">{t("controlObjectiveScope.errors.forbidden")}</MessageStrip>;
  return <section className="controlObjectiveScopeTab">
    <div className="controlObjectiveScopeToolbar"><Title level="H5">{t("controlObjectiveScope.title")}</Title><div className="controlObjectiveScopeToolbarGroup"><Input className="controlObjectiveScopeToolbarSearch" value={search} placeholder={t("controlObjectiveScope.dialog.search")} disabled={mutationBusy} onInput={(event) => setSearch(event.target.value)} /><div className="controlObjectiveScopeFilter"><Label showColon>{t("controlObjectiveScope.filter.label")}</Label><Select value={filter} disabled={mutationBusy} onChange={(event) => setFilter(readFilter(event))}><Option value="ALL">{t("controlObjectiveScope.filter.all")}</Option><Option value="ACTIVE">{t("controlObjectiveScope.status.ACTIVE")}</Option><Option value="INACTIVE">{t("controlObjectiveScope.status.INACTIVE")}</Option></Select></div>{!readOnly && (permissions.create || permissions.restore || permissions.delete) ? <Button design="Emphasized" disabled={mutationBusy || !loaded} onClick={() => setSelectionOpen(true)}>{t("controlObjectiveScope.actions.selectControlObjectives")}</Button> : null}</div></div>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}<Button design="Transparent" onClick={() => void load()}>{t("controlObjectiveScope.actions.retry")}</Button></MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : loaded && visibleRows.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("controlObjectiveScope.fields.controlObjective")}</TableHeaderCell><TableHeaderCell>{t("controlObjectiveScope.fields.objectiveClass")}</TableHeaderCell><TableHeaderCell>{t("controlObjectiveScope.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("controlObjectiveScope.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("controlObjectiveScope.fields.lifecycle")}</TableHeaderCell>{!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}</TableHeaderRow>}>
      {visibleRows.map((row) => {
        const status = statusFor(row);
        return <TableRow key={row.key} rowKey={row.key}><TableCell><Link accessibleRole="Button" interactiveAreaSize="Large" wrappingType="Normal" disabled={!permissions.controlObjectiveView} onClick={(event) => { event.preventDefault(); void openControlObjectiveView(row.controlObjectiveId); }}>{`${row.controlObjectiveCode} - ${row.controlObjectiveTitle}`}</Link></TableCell><TableCell>{row.objectiveClass ? <Tag design="Set1">{row.objectiveClass}</Tag> : "-"}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell><ObjectStatus state={status.state} icon={<Icon name={status.icon} mode="Decorative" />}>{t(status.translationKey)}</ObjectStatus></TableCell>{!readOnly ? <TableCell><Button design="Transparent" icon="overflow" accessibleName={t("common.actions")} tooltip={t("common.actions")} disabled={mutationBusy || !hasRowActions(row)} accessibilityAttributes={{ hasPopup: "menu", expanded: actionRowKey === row.key ? "true" : "false" }} onClick={(event) => { const opener = readOpener(event); if (!opener) return; setActionRowKey(row.key); setActionSheetOpener(opener); }} /></TableCell> : null}</TableRow>;
      })}
    </Table> : loaded ? <div className="controlObjectiveScopeEmpty">{t("controlObjectiveScope.empty")}</div> : null}
    {!readOnly ? <ActionSheet open={Boolean(actionRow && actionSheetOpener)} opener={actionSheetOpener} placement="Bottom" horizontalAlign="End" headerText={t("common.actions")} onClose={closeActionSheet}>
      {actionRow && actionRow.editState === "DRAFT_PENDING_DELETE" ? <Button icon="undo" disabled={mutationBusy} onClick={() => runRowAction(() => undo(actionRow))}>{t("controlObjectiveScope.actions.undo")}</Button> : <>
        {actionRow && canEditRow(actionRow) ? <Button icon="edit" disabled={mutationBusy} onClick={() => runRowAction(() => setEditingKey(actionRow.key))}>{t("controlObjectiveScope.actions.edit")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "ACTIVE" ? <Button icon="pause" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "INACTIVE"))}>{t("controlObjectiveScope.actions.inactivate")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "INACTIVE" ? <Button icon="accept" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "ACTIVE"))}>{t("controlObjectiveScope.actions.activate")}</Button> : null}
        {actionRow && canRemoveRow(actionRow) ? <Button icon="delete" disabled={mutationBusy} onClick={() => runRowAction(() => remove(actionRow))}>{t("controlObjectiveScope.actions.remove")}</Button> : null}
        {actionRow && actionRow.editState !== "FINAL" ? <Button icon="undo" disabled={mutationBusy} onClick={() => runRowAction(() => undo(actionRow))}>{t("controlObjectiveScope.actions.undo")}</Button> : null}
      </>}
    </ActionSheet> : null}
    <Dialog open={Boolean(viewControlObjectiveId)} accessibleName={t("controlObjective.view.title")} className="controlObjectiveObjectDialog" onClose={(event) => { if (isOwnDialogCloseEvent(event)) closeControlObjectiveView(); }}>
      <ModalDialogHeader title={t("controlObjective.view.title")} onClose={closeControlObjectiveView} />
      <div className="controlObjectiveDialogContent">
        {viewControlObjectiveBusy ? <BusyIndicator active delay={0} /> : viewControlObjective ? <CentralControlObjectiveObjectPage mode="view" value={viewControlObjective} activeTab={viewControlObjectiveTab} busy={false} permissions={READ_ONLY_CONTROL_OBJECTIVE_PERMISSIONS} error={viewControlObjectiveError} documentError={null} onErrorClose={() => setViewControlObjectiveError(null)} onSubmit={async () => false} onCancel={closeControlObjectiveView} onEdit={() => undefined} onActiveTabChange={setViewControlObjectiveTab} onDirtyChange={() => undefined} /> : viewControlObjectiveError ? <MessageStrip design="Negative" hideCloseButton>{viewControlObjectiveError}</MessageStrip> : null}
      </div>
    </Dialog>
    <ControlObjectiveSelectionDialog open={selectionOpen} controlObjectives={options.controlObjectives} rows={rows} busy={mutationBusy} onClose={() => setSelectionOpen(false)} onConfirm={confirmSelection} canToggle={(controlObjectiveId, currentlySelected) => currentlySelected ? (rows.find((row) => row.controlObjectiveId === controlObjectiveId)?.original ? permissions.delete : true) : (permissions.create || permissions.restore)} />
    <ControlObjectiveScopeEditorDialog open={Boolean(editing)} row={editing} busy={mutationBusy} onClose={() => setEditingKey(null)} onSave={saveEdit} />
  </section>;
}
