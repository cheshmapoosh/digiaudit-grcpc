import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionSheet, BusyIndicator, Button, Dialog, Icon, Input, Label, Link, MessageStrip, ObjectStatus, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Title } from "@ui5/webcomponents-react";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import type { CentralRegulationRequirementDetail } from "@/features/regulation/domain/centralRegulation.model";
import { centralRegulationApi } from "@/features/regulation/infra/centralRegulation.api";
import CentralRegulationObjectPage, { type CentralRegulationTabKey } from "@/features/regulation/pages/CentralRegulationObjectPage";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralSubprocessRequirementScope, RequirementScopeChange, RequirementScopeDraftRow, RequirementScopeDraftState, RequirementScopeDraftValues, RequirementScopeSelectionOptions, RequirementScopeStatusFilter } from "../domain/requirementScope.model";
import { requirementScopeApi } from "../infra/requirementScope.api.repo";
import { useRequirementScopePermissions } from "../security/requirementScopePermissions";
import { requirementScopeErrorMessage } from "../utils/requirementScopeError";
import RequirementScopeEditorDialog from "./RequirementScopeEditorDialog";
import RequirementSelectionDialog from "./RequirementSelectionDialog";
import "../requirement-scope.css";
import "@/features/regulation/regulation.css";

interface Props {
  subprocessId: string | null;
  readOnly: boolean;
  busy?: boolean;
  onDraftStateChange?: (state: RequirementScopeDraftState) => void;
}

const EMPTY_OPTIONS: RequirementScopeSelectionOptions = { regulationGroups: [], regulations: [], requirements: [] };
const READ_ONLY_REGULATION_PERMISSIONS: CatalogActionPermissions = { create: false, update: false, move: false, lifecycle: false, delete: false, restore: false, publish: false, documentUpload: false };
function readFilter(event: unknown): RequirementScopeStatusFilter { return ((event as { target?: { value?: string } }).target?.value ?? "ALL") as RequirementScopeStatusFilter; }
function fromPersisted(row: CentralSubprocessRequirementScope): RequirementScopeDraftRow {
  return { key: row.id, scopeId: row.id, requirementId: row.requirementId, requirementCode: row.requirementCode, requirementTitle: row.requirementTitle, regulationId: row.regulationId, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row };
}
function sameValues(row: RequirementScopeDraftRow, original: CentralSubprocessRequirementScope): boolean {
  return row.validFrom === original.validFrom && row.validTo === original.validTo && row.status === original.status;
}
function sameValidity(row: RequirementScopeDraftRow, original: CentralSubprocessRequirementScope): boolean {
  return row.validFrom === original.validFrom && row.validTo === original.validTo;
}
type ScopeStatusState = "Positive" | "None" | "Information";
interface ScopeStatusPresentation { translationKey: string; state: ScopeStatusState; icon: "accept" | "pause" | "information"; }
function statusFor(row: RequirementScopeDraftRow): ScopeStatusPresentation {
  if (row.editState === "FINAL") return row.status === "ACTIVE"
    ? { translationKey: "requirementScope.status.ACTIVE", state: "Positive", icon: "accept" }
    : { translationKey: "requirementScope.status.INACTIVE", state: "None", icon: "pause" };
  if (row.editState === "DRAFT_PENDING_DELETE") return { translationKey: "requirementScope.editState.DELETED", state: "Information", icon: "information" };
  if (row.editState === "DRAFT_NEW") return { translationKey: `requirementScope.editState.${row.status}`, state: "Information", icon: "information" };
  if (row.original && row.status !== row.original.status && sameValidity(row, row.original)) {
    return { translationKey: `requirementScope.editState.${row.status}`, state: "Information", icon: "information" };
  }
  return { translationKey: "requirementScope.editState.EDITED", state: "Information", icon: "information" };
}
function readOpener(event: unknown): HTMLElement | null {
  const currentTarget = (event as { currentTarget?: EventTarget | null }).currentTarget;
  return currentTarget instanceof HTMLElement ? currentTarget : null;
}
function isOwnDialogCloseEvent(event: unknown): boolean {
  const candidate = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(candidate.target && candidate.currentTarget && candidate.target === candidate.currentTarget);
}
function valuesFor(row: RequirementScopeDraftRow) { return { validFrom: row.validFrom, validTo: row.validTo }; }
function toChanges(rows: RequirementScopeDraftRow[]): RequirementScopeChange[] {
  return rows.flatMap((row): RequirementScopeChange[] => {
    if (row.editState === "DRAFT_PENDING_DELETE") return [{ operation: "DELETE", requirementId: row.requirementId, scopeId: row.scopeId, version: row.version }];
    if (!row.original) return [{ operation: "CREATE_OR_RESTORE", requirementId: row.requirementId, ...valuesFor(row) }];
    if (row.editState !== "DRAFT_EDITED") return [];
    const validityChanged = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    if (validityChanged) return [{ operation: "UPDATE", requirementId: row.requirementId, scopeId: row.scopeId, version: row.version, requestedStatus: row.status, ...valuesFor(row) }];
    return [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", requirementId: row.requirementId, scopeId: row.scopeId, version: row.version }];
  });
}

export default function SubprocessRequirementScopesTab({ subprocessId, readOnly, busy: parentBusy = false, onDraftStateChange }: Props) {
  const { t } = useTranslation();
  const permissions = useRequirementScopePermissions();
  const [rows, setRows] = useState<RequirementScopeDraftRow[]>([]);
  const [options, setOptions] = useState<RequirementScopeSelectionOptions>(EMPTY_OPTIONS);
  const [filter, setFilter] = useState<RequirementScopeStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [actionRowKey, setActionRowKey] = useState<string | null>(null);
  const [actionSheetOpener, setActionSheetOpener] = useState<HTMLElement | null>(null);
  const [viewRequirementId, setViewRequirementId] = useState<string | null>(null);
  const [viewRequirement, setViewRequirement] = useState<CentralRegulationRequirementDetail | null>(null);
  const [viewRequirementBusy, setViewRequirementBusy] = useState(false);
  const [viewRequirementError, setViewRequirementError] = useState<string | null>(null);
  const [viewRequirementTab, setViewRequirementTab] = useState<CentralRegulationTabKey>("general");
  const generationRef = useRef(0);
  const viewGenerationRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = ++generationRef.current;
    if (!permissions.view) { setLoading(false); setLoaded(true); setRows([]); return; }
    setLoading(true); setLoaded(false);
    try {
      const [selectionOptions, persisted] = await Promise.all([
        requirementScopeApi.options(signal),
        subprocessId ? requirementScopeApi.listForSubprocess(subprocessId, "ALL", "", signal) : Promise.resolve([]),
      ]);
      if (generation !== generationRef.current) return;
      setOptions(selectionOptions);
      setRows(persisted.map(fromPersisted));
      setError(null); setLoaded(true);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      if (generation === generationRef.current) { setError(requirementScopeErrorMessage(loadError, t)); setLoaded(false); }
    } finally { if (generation === generationRef.current) setLoading(false); }
  }, [permissions.view, subprocessId, t]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const changes = useMemo(() => toChanges(rows), [rows]);
  useEffect(() => { onDraftStateChange?.({ changes, dirty: changes.length > 0, ready: loaded || !permissions.view, invalid: Boolean(error) }); }, [changes, error, loaded, onDraftStateChange, permissions.view]);

  const regulationsById = useMemo(() => new Map(options.regulations.map((regulation) => [regulation.id, regulation])), [options.regulations]);
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const regulation = regulationsById.get(row.regulationId);
      return (filter === "ALL" || row.status === filter) && (!needle
        || row.requirementCode.toLocaleLowerCase().includes(needle)
        || row.requirementTitle.toLocaleLowerCase().includes(needle)
        || regulation?.code.toLocaleLowerCase().includes(needle)
        || regulation?.title.toLocaleLowerCase().includes(needle));
    });
  }, [filter, regulationsById, rows, search]);
  const editing = editingKey ? rows.find((row) => row.key === editingKey) ?? null : null;
  const actionRow = actionRowKey ? rows.find((row) => row.key === actionRowKey) ?? null : null;
  const mutationBusy = parentBusy || loading;

  const confirmSelection = (selectedIds: Set<string>) => {
    setRows((current) => {
      const byRequirement = new Map(options.requirements.map((requirement) => [requirement.id, requirement]));
      const next: RequirementScopeDraftRow[] = [];
      for (const row of current) {
        if (selectedIds.has(row.requirementId)) next.push(row.editState === "DRAFT_PENDING_DELETE" && row.original ? fromPersisted(row.original) : row);
        else if (row.original) next.push({ ...row, editState: "DRAFT_PENDING_DELETE" });
      }
      const occupied = new Set(current.map((row) => row.requirementId));
      for (const requirementId of selectedIds) {
        if (occupied.has(requirementId)) continue;
        const requirement = byRequirement.get(requirementId);
        if (!requirement || requirement.status !== "ACTIVE") continue;
        next.push({ key: `new:${requirement.id}`, scopeId: null, requirementId: requirement.id, requirementCode: requirement.code, requirementTitle: requirement.title, regulationId: requirement.regulationId, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
      }
      return next;
    });
    setSelectionOpen(false);
  };

  const saveEdit = (values: RequirementScopeDraftValues) => {
    if (!editingKey) return;
    setRows((current) => current.map((row) => {
      if (row.key !== editingKey) return row;
      const next = { ...row, ...values };
      return { ...next, editState: !next.original ? "DRAFT_NEW" : sameValues(next, next.original) ? "FINAL" : "DRAFT_EDITED" };
    }));
    setEditingKey(null);
  };
  const changeLifecycle = (row: RequirementScopeDraftRow, status: RequirementScopeDraftRow["status"]) => setRows((current) => current.map((candidate) => candidate.key !== row.key ? candidate : { ...candidate, status, editState: candidate.original && sameValues({ ...candidate, status }, candidate.original) ? "FINAL" : candidate.original ? "DRAFT_EDITED" : "DRAFT_NEW" }));
  const remove = (row: RequirementScopeDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? { ...candidate, editState: "DRAFT_PENDING_DELETE" } : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const undo = (row: RequirementScopeDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? fromPersisted(row.original!) : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const canEditRow = (row: RequirementScopeDraftRow) => row.original ? permissions.update : (permissions.create || permissions.restore);
  const canChangeLifecycle = (row: RequirementScopeDraftRow) => Boolean(row.original && permissions.lifecycle);
  const canRemoveRow = (row: RequirementScopeDraftRow) => (row.original && permissions.delete) || (!row.original && (permissions.create || permissions.restore));
  const hasRowActions = (row: RequirementScopeDraftRow) => row.editState !== "FINAL" || canEditRow(row) || canChangeLifecycle(row) || canRemoveRow(row);
  const closeActionSheet = () => { setActionRowKey(null); setActionSheetOpener(null); };
  const runRowAction = (action: () => void) => { closeActionSheet(); action(); };
  const closeRequirementView = () => {
    viewGenerationRef.current += 1;
    setViewRequirementId(null); setViewRequirement(null); setViewRequirementError(null); setViewRequirementBusy(false); setViewRequirementTab("general");
  };
  const openRequirementView = async (requirementId: string) => {
    if (!permissions.requirementView) return;
    const generation = ++viewGenerationRef.current;
    setViewRequirementId(requirementId); setViewRequirement(null); setViewRequirementError(null); setViewRequirementBusy(true); setViewRequirementTab("general");
    try {
      const detail = await centralRegulationApi.requirement(requirementId);
      if (generation === viewGenerationRef.current) setViewRequirement(detail);
    } catch {
      if (generation === viewGenerationRef.current) setViewRequirementError(t("regulation.errors.loadDetail"));
    } finally { if (generation === viewGenerationRef.current) setViewRequirementBusy(false); }
  };

  if (!permissions.view) return <MessageStrip design="Information">{t("requirementScope.errors.forbidden")}</MessageStrip>;
  return <section className="requirementScopeTab">
    <div className="requirementScopeToolbar"><Title level="H5">{t("requirementScope.title")}</Title><div className="requirementScopeToolbarGroup"><Input className="requirementScopeToolbarSearch" value={search} placeholder={t("requirementScope.dialog.search")} disabled={mutationBusy} onInput={(event) => setSearch(event.target.value)} /><div className="requirementScopeFilter"><Label showColon>{t("requirementScope.filter.label")}</Label><Select value={filter} disabled={mutationBusy} onChange={(event) => setFilter(readFilter(event))}><Option value="ALL">{t("requirementScope.filter.all")}</Option><Option value="ACTIVE">{t("requirementScope.status.ACTIVE")}</Option><Option value="INACTIVE">{t("requirementScope.status.INACTIVE")}</Option></Select></div>{!readOnly && (permissions.create || permissions.restore || permissions.delete) ? <Button design="Emphasized" disabled={mutationBusy || !loaded} onClick={() => setSelectionOpen(true)}>{t("requirementScope.actions.selectRequirements")}</Button> : null}</div></div>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}<Button design="Transparent" onClick={() => void load()}>{t("requirementScope.actions.retry")}</Button></MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : loaded && visibleRows.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("requirementScope.fields.requirement")}</TableHeaderCell><TableHeaderCell>{t("requirementScope.fields.regulation")}</TableHeaderCell><TableHeaderCell>{t("requirementScope.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("requirementScope.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("requirementScope.fields.lifecycle")}</TableHeaderCell>{!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}</TableHeaderRow>}>
      {visibleRows.map((row) => {
        const status = statusFor(row);
        const regulation = regulationsById.get(row.regulationId);
        return <TableRow key={row.key} rowKey={row.key}><TableCell><Link accessibleRole="Button" interactiveAreaSize="Large" wrappingType="Normal" disabled={!permissions.requirementView} onClick={(event) => { event.preventDefault(); void openRequirementView(row.requirementId); }}>{`${row.requirementCode} - ${row.requirementTitle}`}</Link></TableCell><TableCell>{regulation ? `${regulation.code} - ${regulation.title}` : "-"}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell><ObjectStatus state={status.state} icon={<Icon name={status.icon} mode="Decorative" />}>{t(status.translationKey)}</ObjectStatus></TableCell>{!readOnly ? <TableCell><Button design="Transparent" icon="overflow" accessibleName={t("common.actions")} tooltip={t("common.actions")} disabled={mutationBusy || !hasRowActions(row)} accessibilityAttributes={{ hasPopup: "menu", expanded: actionRowKey === row.key ? "true" : "false" }} onClick={(event) => { const opener = readOpener(event); if (!opener) return; setActionRowKey(row.key); setActionSheetOpener(opener); }} /></TableCell> : null}</TableRow>;
      })}
    </Table> : loaded ? <div className="requirementScopeEmpty">{t("requirementScope.empty")}</div> : null}
    {!readOnly ? <ActionSheet open={Boolean(actionRow && actionSheetOpener)} opener={actionSheetOpener} placement="Bottom" horizontalAlign="End" headerText={t("common.actions")} onClose={closeActionSheet}>
      {actionRow && actionRow.editState === "DRAFT_PENDING_DELETE" ? <Button icon="undo" disabled={mutationBusy} onClick={() => runRowAction(() => undo(actionRow))}>{t("requirementScope.actions.undo")}</Button> : <>
        {actionRow && canEditRow(actionRow) ? <Button icon="edit" disabled={mutationBusy} onClick={() => runRowAction(() => setEditingKey(actionRow.key))}>{t("requirementScope.actions.edit")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "ACTIVE" ? <Button icon="pause" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "INACTIVE"))}>{t("requirementScope.actions.inactivate")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "INACTIVE" ? <Button icon="accept" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "ACTIVE"))}>{t("requirementScope.actions.activate")}</Button> : null}
        {actionRow && canRemoveRow(actionRow) ? <Button icon="delete" disabled={mutationBusy} onClick={() => runRowAction(() => remove(actionRow))}>{t("requirementScope.actions.remove")}</Button> : null}
        {actionRow && actionRow.editState !== "FINAL" ? <Button icon="undo" disabled={mutationBusy} onClick={() => runRowAction(() => undo(actionRow))}>{t("requirementScope.actions.undo")}</Button> : null}
      </>}
    </ActionSheet> : null}
    <Dialog open={Boolean(viewRequirementId)} accessibleName={t("regulation.view.title")} className="regulationObjectDialog" onClose={(event) => { if (isOwnDialogCloseEvent(event)) closeRequirementView(); }}>
      <ModalDialogHeader title={t("regulation.view.title")} onClose={closeRequirementView} />
      <div className="regulationDialogContent">
        {viewRequirementBusy ? <BusyIndicator active delay={0} /> : viewRequirement ? <CentralRegulationObjectPage mode="view" nodeType="REQUIREMENT" value={viewRequirement} initialParentId={viewRequirement.regulationId} parentCandidates={options.regulations} activeTab={viewRequirementTab} busy={false} permissions={READ_ONLY_REGULATION_PERMISSIONS} error={viewRequirementError} documentError={null} onErrorClose={() => setViewRequirementError(null)} onSubmit={async () => false} onCancel={closeRequirementView} onEdit={() => undefined} onActiveTabChange={setViewRequirementTab} onDirtyChange={() => undefined} /> : viewRequirementError ? <MessageStrip design="Negative" hideCloseButton>{viewRequirementError}</MessageStrip> : null}
      </div>
    </Dialog>
    <RequirementSelectionDialog open={selectionOpen} requirements={options.requirements} regulations={options.regulations} regulationGroups={options.regulationGroups} rows={rows} busy={mutationBusy} onClose={() => setSelectionOpen(false)} onConfirm={confirmSelection} canToggle={(requirementId, currentlySelected) => { const persisted = Boolean(rows.find((row) => row.requirementId === requirementId)?.original); return currentlySelected ? (persisted ? permissions.delete : true) : (persisted || permissions.create || permissions.restore); }} />
    <RequirementScopeEditorDialog open={Boolean(editing)} row={editing} busy={mutationBusy} onClose={() => setEditingKey(null)} onSave={saveEdit} />
  </section>;
}
