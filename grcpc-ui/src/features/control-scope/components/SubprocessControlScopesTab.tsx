import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionSheet, BusyIndicator, Button, Dialog, Icon, Input, Label, Link, MessageStrip, ObjectStatus, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Title } from "@ui5/webcomponents-react";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import type { CentralControlDetail, CentralControlGroupSummary, CentralControlSummary } from "@/features/control/domain/centralControl.model";
import { centralControlApi } from "@/features/control/infra/centralControl.api.repo";
import CentralControlObjectPage from "@/features/control/pages/CentralControlObjectPage";
import { formatPersianDate } from "@/shared/utils/date.utils";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { CentralSubprocessControlScope, ControlScopeChange, ControlScopeDraftRow, ControlScopeDraftState, ControlScopeDraftValues, ControlScopeOptions, ControlScopeStatusFilter } from "../domain/controlScope.model";
import { controlScopeApi } from "../infra/controlScope.api.repo";
import { useControlScopePermissions } from "../security/controlScopePermissions";
import { controlScopeErrorMessage } from "../utils/controlScopeError";
import ControlScopeEditorDialog from "./ControlScopeEditorDialog";
import ControlSelectionDialog from "./ControlSelectionDialog";
import "../control-scope.css";
import "@/features/control/control.css";

interface Props {
  subprocessId: string | null;
  readOnly: boolean;
  busy?: boolean;
  onDraftStateChange?: (state: ControlScopeDraftState) => void;
}

const EMPTY_OPTIONS: ControlScopeOptions = { recommendedFrequencyCodes: [], recommendedExecutionMethodCodes: [], recommendedTestMethodCodes: [] };
const READ_ONLY_CONTROL_PERMISSIONS: CatalogActionPermissions = { create: false, update: false, move: false, lifecycle: false, delete: false, restore: false, publish: false, documentUpload: false };
function readFilter(event: unknown): ControlScopeStatusFilter { return ((event as { target?: { value?: string } }).target?.value ?? "ALL") as ControlScopeStatusFilter; }
function fromPersisted(row: CentralSubprocessControlScope): ControlScopeDraftRow {
  return { key: row.id, scopeId: row.id, controlId: row.controlId, controlCode: row.controlCode, controlTitle: row.controlTitle, recommendedFrequencyCode: row.recommendedFrequencyCode, recommendedExecutionMethodCode: row.recommendedExecutionMethodCode, recommendedTestMethodCode: row.recommendedTestMethodCode, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row };
}
function sameValues(row: ControlScopeDraftRow, original: CentralSubprocessControlScope): boolean {
  return row.recommendedFrequencyCode === original.recommendedFrequencyCode
    && row.recommendedExecutionMethodCode === original.recommendedExecutionMethodCode
    && row.recommendedTestMethodCode === original.recommendedTestMethodCode
    && row.validFrom === original.validFrom && row.validTo === original.validTo && row.status === original.status;
}
function sameConfigurationValues(row: ControlScopeDraftRow, original: CentralSubprocessControlScope): boolean {
  return row.recommendedFrequencyCode === original.recommendedFrequencyCode
    && row.recommendedExecutionMethodCode === original.recommendedExecutionMethodCode
    && row.recommendedTestMethodCode === original.recommendedTestMethodCode
    && row.validFrom === original.validFrom && row.validTo === original.validTo;
}
type ScopeStatusState = "Positive" | "None" | "Information";
interface ScopeStatusPresentation {
  translationKey: string;
  state: ScopeStatusState;
  icon: "accept" | "pause" | "information";
}
function statusFor(row: ControlScopeDraftRow): ScopeStatusPresentation {
  if (row.editState === "FINAL") return row.status === "ACTIVE"
    ? { translationKey: "controlScope.status.ACTIVE", state: "Positive", icon: "accept" }
    : { translationKey: "controlScope.status.INACTIVE", state: "None", icon: "pause" };
  if (row.editState === "DRAFT_PENDING_DELETE") return { translationKey: "controlScope.editState.DELETED", state: "Information", icon: "information" };
  if (row.editState === "DRAFT_NEW") return { translationKey: `controlScope.editState.${row.status}`, state: "Information", icon: "information" };
  if (row.editState === "DRAFT_EDITED" && row.original && row.status !== row.original.status && sameConfigurationValues(row, row.original)) {
    return { translationKey: `controlScope.editState.${row.status}`, state: "Information", icon: "information" };
  }
  return { translationKey: "controlScope.editState.EDITED", state: "Information", icon: "information" };
}
function renderObjectStatus(text: string, presentation: ScopeStatusPresentation) {
  return <ObjectStatus state={presentation.state} icon={<Icon name={presentation.icon} mode="Decorative" />}>{text}</ObjectStatus>;
}
function readOpener(event: unknown): HTMLElement | null {
  const currentTarget = (event as { currentTarget?: EventTarget | null }).currentTarget;
  return currentTarget instanceof HTMLElement ? currentTarget : null;
}
function isOwnDialogCloseEvent(event: unknown): boolean {
  const candidate = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(candidate.target && candidate.currentTarget && candidate.target === candidate.currentTarget);
}
function valuesFor(row: ControlScopeDraftRow) {
  return { recommendedFrequencyCode: row.recommendedFrequencyCode, recommendedExecutionMethodCode: row.recommendedExecutionMethodCode, recommendedTestMethodCode: row.recommendedTestMethodCode, validFrom: row.validFrom, validTo: row.validTo };
}
function toChanges(rows: ControlScopeDraftRow[]): ControlScopeChange[] {
  return rows.flatMap((row): ControlScopeChange[] => {
    if (row.editState === "DRAFT_PENDING_DELETE") return [{ operation: "DELETE", controlId: row.controlId, scopeId: row.scopeId, version: row.version }];
    if (!row.original) return [{ operation: "CREATE_OR_RESTORE", controlId: row.controlId, ...valuesFor(row) }];
    if (row.editState !== "DRAFT_EDITED") return [];
    const fieldsChanged = row.recommendedFrequencyCode !== row.original.recommendedFrequencyCode
      || row.recommendedExecutionMethodCode !== row.original.recommendedExecutionMethodCode
      || row.recommendedTestMethodCode !== row.original.recommendedTestMethodCode
      || row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    if (fieldsChanged) return [{ operation: "UPDATE", controlId: row.controlId, scopeId: row.scopeId, version: row.version, requestedStatus: row.status, ...valuesFor(row) }];
    return [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", controlId: row.controlId, scopeId: row.scopeId, version: row.version }];
  });
}

export default function SubprocessControlScopesTab({ subprocessId, readOnly, busy: parentBusy = false, onDraftStateChange }: Props) {
  const { t } = useTranslation();
  const permissions = useControlScopePermissions();
  const [rows, setRows] = useState<ControlScopeDraftRow[]>([]);
  const [controls, setControls] = useState<CentralControlSummary[]>([]);
  const [controlGroups, setControlGroups] = useState<CentralControlGroupSummary[]>([]);
  const [options, setOptions] = useState<ControlScopeOptions>(EMPTY_OPTIONS);
  const [filter, setFilter] = useState<ControlScopeStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [actionRowKey, setActionRowKey] = useState<string | null>(null);
  const [actionSheetOpener, setActionSheetOpener] = useState<HTMLElement | null>(null);
  const [viewControlId, setViewControlId] = useState<string | null>(null);
  const [viewControl, setViewControl] = useState<CentralControlDetail | null>(null);
  const [viewControlBusy, setViewControlBusy] = useState(false);
  const [viewControlError, setViewControlError] = useState<string | null>(null);
  const [viewControlTab, setViewControlTab] = useState<"general" | "subprocesses" | "regulations" | "requirements" | "risks" | "accountGroups" | "documents">("general");
  const generationRef = useRef(0);
  const viewGenerationRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = ++generationRef.current;
    if (!permissions.view) { setLoading(false); setLoaded(true); setRows([]); return; }
    setLoading(true); setLoaded(false);
    try {
      const [availableControls, availableControlGroups, scopeOptions, persisted] = await Promise.all([
        controlScopeApi.eligibleControls(signal), centralControlApi.listGroups(), controlScopeApi.options(signal),
        subprocessId ? controlScopeApi.listForSubprocess(subprocessId, "ALL", "", signal) : Promise.resolve([]),
      ]);
      if (generation !== generationRef.current) return;
      setControls(availableControls);
      setControlGroups(availableControlGroups);
      setOptions(scopeOptions);
      setRows(persisted.map(fromPersisted));
      setError(null); setLoaded(true);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      if (generation === generationRef.current) { setError(controlScopeErrorMessage(loadError, t)); setLoaded(false); }
    } finally { if (generation === generationRef.current) setLoading(false); }
  }, [permissions.view, subprocessId, t]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const changes = useMemo(() => toChanges(rows), [rows]);
  useEffect(() => { onDraftStateChange?.({ changes, dirty: changes.length > 0, ready: loaded || !permissions.view, invalid: Boolean(error) }); }, [changes, error, loaded, onDraftStateChange, permissions.view]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => (filter === "ALL" || row.status === filter)
      && (!needle || row.controlCode.toLocaleLowerCase().includes(needle) || row.controlTitle.toLocaleLowerCase().includes(needle)));
  }, [filter, rows, search]);
  const editing = editingKey ? rows.find((row) => row.key === editingKey) ?? null : null;
  const actionRow = actionRowKey ? rows.find((row) => row.key === actionRowKey) ?? null : null;
  const mutationBusy = parentBusy || loading;

  const confirmSelection = (selectedIds: Set<string>) => {
    setRows((current) => {
      const byControl = new Map(controls.map((control) => [control.id, control]));
      const next: ControlScopeDraftRow[] = [];
      for (const row of current) {
        if (selectedIds.has(row.controlId)) {
          next.push(row.editState === "DRAFT_PENDING_DELETE" && row.original ? fromPersisted(row.original) : row);
        } else if (!row.original) {
          continue;
        } else {
          next.push({ ...row, editState: "DRAFT_PENDING_DELETE" });
        }
      }
      const occupied = new Set(current.map((row) => row.controlId));
      for (const controlId of selectedIds) {
        if (occupied.has(controlId)) continue;
        const control = byControl.get(controlId);
        if (!control || control.status !== "ACTIVE") continue;
        next.push({ key: `new:${control.id}`, scopeId: null, controlId: control.id, controlCode: control.code, controlTitle: control.title, recommendedFrequencyCode: null, recommendedExecutionMethodCode: null, recommendedTestMethodCode: null, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
      }
      return next;
    });
    setSelectionOpen(false);
  };

  const saveEdit = (values: ControlScopeDraftValues) => {
    if (!editingKey) return;
    setRows((current) => current.map((row) => {
      if (row.key !== editingKey) return row;
      const next = { ...row, ...values };
      return { ...next, editState: !next.original ? "DRAFT_NEW" : sameValues(next, next.original) ? "FINAL" : "DRAFT_EDITED" };
    }));
    setEditingKey(null);
  };
  const changeLifecycle = (row: ControlScopeDraftRow, status: "ACTIVE" | "INACTIVE") => setRows((current) => current.map((candidate) => candidate.key !== row.key ? candidate : { ...candidate, status, editState: candidate.original && sameValues({ ...candidate, status }, candidate.original) ? "FINAL" : candidate.original ? "DRAFT_EDITED" : "DRAFT_NEW" }));
  const remove = (row: ControlScopeDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? { ...candidate, editState: "DRAFT_PENDING_DELETE" } : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const undo = (row: ControlScopeDraftRow) => setRows((current) => row.original
    ? current.map((candidate) => candidate.key === row.key ? fromPersisted(row.original!) : candidate)
    : current.filter((candidate) => candidate.key !== row.key));
  const canEditRow = (row: ControlScopeDraftRow) => Boolean(row.original && permissions.update);
  const canChangeLifecycle = (row: ControlScopeDraftRow) => Boolean(row.original && permissions.lifecycle);
  const canRemoveRow = (row: ControlScopeDraftRow) => (row.original && permissions.delete) || (!row.original && (permissions.create || permissions.restore));
  const hasRowActions = (row: ControlScopeDraftRow) => row.editState !== "FINAL" || canEditRow(row) || canChangeLifecycle(row) || canRemoveRow(row);
  const closeActionSheet = () => { setActionRowKey(null); setActionSheetOpener(null); };
  const runRowAction = (action: () => void) => { closeActionSheet(); action(); };
  const closeControlView = () => {
    viewGenerationRef.current += 1;
    setViewControlId(null);
    setViewControl(null);
    setViewControlError(null);
    setViewControlBusy(false);
    setViewControlTab("general");
  };
  const openControlView = async (centralControlId: string) => {
    const generation = ++viewGenerationRef.current;
    setViewControlId(centralControlId);
    setViewControl(null);
    setViewControlError(null);
    setViewControlBusy(true);
    setViewControlTab("general");
    try {
      const detail = await centralControlApi.detail(centralControlId);
      if (generation === viewGenerationRef.current) setViewControl(detail);
    } catch {
      if (generation === viewGenerationRef.current) setViewControlError(t("control.errors.loadDetail"));
    } finally {
      if (generation === viewGenerationRef.current) setViewControlBusy(false);
    }
  };

  if (!permissions.view) return <MessageStrip design="Information">{t("controlScope.errors.forbidden")}</MessageStrip>;
  return <section className="controlScopeTab">
    <div className="controlScopeToolbar"><Title level="H5">{t("controlScope.title")}</Title><div className="controlScopeToolbarGroup"><Input className="controlScopeToolbarSearch" value={search} placeholder={t("controlScope.dialog.search")} disabled={mutationBusy} onInput={(event) => setSearch(event.target.value)} /><div className="controlScopeFilter"><Label showColon>{t("controlScope.filter.label")}</Label><Select value={filter} disabled={mutationBusy} onChange={(event) => setFilter(readFilter(event))}><Option value="ALL">{t("controlScope.filter.all")}</Option><Option value="ACTIVE">{t("controlScope.status.ACTIVE")}</Option><Option value="INACTIVE">{t("controlScope.status.INACTIVE")}</Option></Select></div>{!readOnly && (permissions.create || permissions.restore || permissions.delete) ? <Button design="Emphasized" disabled={mutationBusy || !loaded} onClick={() => setSelectionOpen(true)}>{t("controlScope.actions.selectControls")}</Button> : null}</div></div>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}<Button design="Transparent" onClick={() => void load()}>{t("controlScope.actions.retry")}</Button></MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : loaded && visibleRows.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("controlScope.fields.control")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.frequency")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.executionMethod")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.testMethod")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.lifecycle")}</TableHeaderCell>{!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}</TableHeaderRow>}>
      {visibleRows.map((row) => {
        const status = statusFor(row);
        return <TableRow key={row.key} rowKey={row.key}><TableCell><Link accessibleRole="Button" interactiveAreaSize="Large" wrappingType="Normal" onClick={(event) => { event.preventDefault(); void openControlView(row.controlId); }}>{`${row.controlCode} - ${row.controlTitle}`}</Link></TableCell><TableCell>{row.recommendedFrequencyCode ? t(`control.operationFrequency.${row.recommendedFrequencyCode}`, { defaultValue: row.recommendedFrequencyCode }) : "-"}</TableCell><TableCell>{row.recommendedExecutionMethodCode ? t(`control.automationType.${row.recommendedExecutionMethodCode}`, { defaultValue: row.recommendedExecutionMethodCode }) : "-"}</TableCell><TableCell>{row.recommendedTestMethodCode ? t(`control.testingTechnique.${row.recommendedTestMethodCode}`, { defaultValue: row.recommendedTestMethodCode }) : "-"}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell>{renderObjectStatus(t(status.translationKey), status)}</TableCell>{!readOnly ? <TableCell><Button design="Transparent" icon="overflow" accessibleName={t("common.actions")} tooltip={t("common.actions")} disabled={mutationBusy || !hasRowActions(row)} accessibilityAttributes={{ hasPopup: "menu", expanded: actionRowKey === row.key ? "true" : "false" }} onClick={(event) => { const opener = readOpener(event); if (!opener) return; setActionRowKey(row.key); setActionSheetOpener(opener); }} /></TableCell> : null}</TableRow>;
      })}
    </Table> : loaded ? <div className="controlScopeEmpty">{t("controlScope.empty")}</div> : null}
    {!readOnly ? <ActionSheet open={Boolean(actionRow && actionSheetOpener)} opener={actionSheetOpener} placement="Bottom" horizontalAlign="End" headerText={t("common.actions")} onClose={closeActionSheet}>
      {actionRow && actionRow.editState !== "FINAL" ? <Button icon="undo" disabled={mutationBusy} onClick={() => runRowAction(() => undo(actionRow))}>{t("controlScope.actions.undo")}</Button> : <>
        {actionRow && canEditRow(actionRow) ? <Button icon="edit" disabled={mutationBusy} onClick={() => runRowAction(() => setEditingKey(actionRow.key))}>{t("controlScope.actions.edit")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "ACTIVE" ? <Button icon="pause" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "INACTIVE"))}>{t("controlScope.actions.inactivate")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "INACTIVE" ? <Button icon="accept" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "ACTIVE"))}>{t("controlScope.actions.activate")}</Button> : null}
        {actionRow && canRemoveRow(actionRow) ? <Button icon="delete" disabled={mutationBusy} onClick={() => runRowAction(() => remove(actionRow))}>{t("controlScope.actions.remove")}</Button> : null}
      </>}
    </ActionSheet> : null}
    <Dialog open={Boolean(viewControlId)} accessibleName={t("control.view.title")} className="controlObjectDialog" onClose={(event) => { if (isOwnDialogCloseEvent(event)) closeControlView(); }}>
      <ModalDialogHeader title={t("control.view.title")} onClose={closeControlView} />
      <div className="controlDialogContent">
        {viewControlBusy ? <BusyIndicator active delay={0} /> : viewControl ?
          <CentralControlObjectPage key={`${viewControl.id}:view`} mode="view" value={viewControl} initialControlGroupId={viewControl.controlGroupId} groups={controlGroups} activeTab={viewControlTab} busy={false} permissions={READ_ONLY_CONTROL_PERMISSIONS} error={viewControlError} documentError={null} onErrorClose={() => setViewControlError(null)} onSubmit={async () => false} onCancel={closeControlView} onEdit={() => undefined} onActiveTabChange={setViewControlTab} onDirtyChange={() => undefined} />
        : viewControlError ? <MessageStrip design="Negative" hideCloseButton>{viewControlError}</MessageStrip> : null}
      </div>
    </Dialog>
    <ControlSelectionDialog open={selectionOpen} controls={controls} groups={controlGroups} rows={rows} busy={mutationBusy} onClose={() => setSelectionOpen(false)} onConfirm={confirmSelection} canToggle={(controlId, currentlySelected) => currentlySelected ? (rows.find((row) => row.controlId === controlId)?.original ? permissions.delete : true) : (permissions.create || permissions.restore)} />
    <ControlScopeEditorDialog open={Boolean(editing)} row={editing} options={options} busy={mutationBusy} onClose={() => setEditingKey(null)} onSave={saveEdit} />
  </section>;
}
