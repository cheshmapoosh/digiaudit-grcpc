import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Button, Input, Label, MessageStrip, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Title } from "@ui5/webcomponents-react";
import type { CentralControlSummary } from "@/features/control/domain/centralControl.model";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralSubprocessControlScope, ControlScopeChange, ControlScopeDraftRow, ControlScopeDraftState, ControlScopeDraftValues, ControlScopeOptions, ControlScopeStatusFilter } from "../domain/controlScope.model";
import { controlScopeApi } from "../infra/controlScope.api.repo";
import { useControlScopePermissions } from "../security/controlScopePermissions";
import { controlScopeErrorMessage } from "../utils/controlScopeError";
import ControlScopeEditorDialog from "./ControlScopeEditorDialog";
import ControlSelectionDialog from "./ControlSelectionDialog";
import "../control-scope.css";

interface Props {
  subprocessId: string | null;
  readOnly: boolean;
  busy?: boolean;
  onDraftStateChange?: (state: ControlScopeDraftState) => void;
}

const EMPTY_OPTIONS: ControlScopeOptions = { recommendedFrequencyCodes: [], recommendedExecutionMethodCodes: [], recommendedTestMethodCodes: [] };
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
  const [options, setOptions] = useState<ControlScopeOptions>(EMPTY_OPTIONS);
  const [filter, setFilter] = useState<ControlScopeStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const generationRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = ++generationRef.current;
    if (!permissions.view) { setLoading(false); setLoaded(true); setRows([]); return; }
    setLoading(true); setLoaded(false);
    try {
      const [availableControls, scopeOptions, persisted] = await Promise.all([
        controlScopeApi.eligibleControls(signal), controlScopeApi.options(signal),
        subprocessId ? controlScopeApi.listForSubprocess(subprocessId, "ALL", "", signal) : Promise.resolve([]),
      ]);
      if (generation !== generationRef.current) return;
      setControls(availableControls);
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
  const undo = (row: ControlScopeDraftRow) => { if (row.original) setRows((current) => current.map((candidate) => candidate.key === row.key ? fromPersisted(row.original!) : candidate)); };

  if (!permissions.view) return <MessageStrip design="Information">{t("controlScope.errors.forbidden")}</MessageStrip>;
  return <section className="controlScopeTab">
    <div className="controlScopeToolbar"><Title level="H5">{t("controlScope.title")}</Title><div className="controlScopeToolbarGroup"><div className="controlScopeFilter"><Label showColon>{t("controlScope.filter.label")}</Label><Select value={filter} disabled={mutationBusy} onChange={(event) => setFilter(readFilter(event))}><Option value="ALL">{t("controlScope.filter.all")}</Option><Option value="ACTIVE">{t("controlScope.status.ACTIVE")}</Option><Option value="INACTIVE">{t("controlScope.status.INACTIVE")}</Option></Select></div>{!readOnly && (permissions.create || permissions.restore || permissions.delete) ? <Button design="Emphasized" disabled={mutationBusy || !loaded} onClick={() => setSelectionOpen(true)}>{t("controlScope.actions.selectControls")}</Button> : null}</div></div>
    <Input value={search} placeholder={t("controlScope.dialog.search")} disabled={mutationBusy} onInput={(event) => setSearch(event.target.value)} />
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}<Button design="Transparent" onClick={() => void load()}>{t("controlScope.actions.retry")}</Button></MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : loaded && visibleRows.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("controlScope.fields.control")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.frequency")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.executionMethod")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.testMethod")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.lifecycle")}</TableHeaderCell><TableHeaderCell>{t("controlScope.fields.editState")}</TableHeaderCell>{!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}</TableHeaderRow>}>
      {visibleRows.map((row) => <TableRow key={row.key} rowKey={row.key}><TableCell>{`${row.controlCode} - ${row.controlTitle}`}</TableCell><TableCell>{row.recommendedFrequencyCode ? t(`control.operationFrequency.${row.recommendedFrequencyCode}`, { defaultValue: row.recommendedFrequencyCode }) : "-"}</TableCell><TableCell>{row.recommendedExecutionMethodCode ? t(`control.automationType.${row.recommendedExecutionMethodCode}`, { defaultValue: row.recommendedExecutionMethodCode }) : "-"}</TableCell><TableCell>{row.recommendedTestMethodCode ? t(`control.testingTechnique.${row.recommendedTestMethodCode}`, { defaultValue: row.recommendedTestMethodCode }) : "-"}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell><span className={`controlScopeBadge controlScopeStatus${row.status}`}>{t(`controlScope.status.${row.status}`)}</span></TableCell><TableCell><span className={`controlScopeBadge controlScopeEdit${row.editState}`}>{t(`controlScope.editState.${row.editState}`)}</span></TableCell>{!readOnly ? <TableCell><div className="controlScopeActions">{row.editState === "DRAFT_PENDING_DELETE" ? <Button design="Transparent" disabled={mutationBusy} onClick={() => undo(row)}>{t("controlScope.actions.undo")}</Button> : <>{((row.original && permissions.update) || (!row.original && (permissions.create || permissions.restore))) ? <Button design="Transparent" disabled={mutationBusy} onClick={() => setEditingKey(row.key)}>{t("controlScope.actions.edit")}</Button> : null}{row.original && row.status === "ACTIVE" && permissions.lifecycle ? <Button design="Transparent" disabled={mutationBusy} onClick={() => changeLifecycle(row, "INACTIVE")}>{t("controlScope.actions.inactivate")}</Button> : null}{row.original && row.status === "INACTIVE" && permissions.lifecycle ? <Button design="Transparent" disabled={mutationBusy} onClick={() => changeLifecycle(row, "ACTIVE")}>{t("controlScope.actions.activate")}</Button> : null}{((row.original && permissions.delete) || (!row.original && (permissions.create || permissions.restore))) ? <Button design="Negative" disabled={mutationBusy} onClick={() => remove(row)}>{t("controlScope.actions.remove")}</Button> : null}</>}</div></TableCell> : null}</TableRow>)}
    </Table> : loaded ? <div className="controlScopeEmpty">{t("controlScope.empty")}</div> : null}
    <ControlSelectionDialog open={selectionOpen} controls={controls} rows={rows} busy={mutationBusy} onClose={() => setSelectionOpen(false)} onConfirm={confirmSelection} canToggle={(controlId, currentlySelected) => currentlySelected ? (rows.find((row) => row.controlId === controlId)?.original ? permissions.delete : true) : (permissions.create || permissions.restore)} />
    <ControlScopeEditorDialog open={Boolean(editing)} row={editing} options={options} busy={mutationBusy} onClose={() => setEditingKey(null)} onSave={saveEdit} />
  </section>;
}
