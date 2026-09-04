import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionSheet, BusyIndicator, Button, Dialog, Icon, Input, Label, Link, MessageStrip, ObjectStatus, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Tag, Title } from "@ui5/webcomponents-react";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import type { CentralRiskTemplateDetail } from "@/features/risk/domain/centralRisk.model";
import { centralRiskApi } from "@/features/risk/infra/centralRisk.api";
import CentralRiskObjectPage, { type CentralRiskTabKey } from "@/features/risk/pages/CentralRiskObjectPage";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralSubprocessRiskScope, RiskScopeChange, RiskScopeDraftRow, RiskScopeDraftState, RiskScopeDraftValues, RiskScopeSelectionOptions, RiskScopeStatusFilter } from "../domain/riskScope.model";
import { riskScopeApi } from "../infra/riskScope.api.repo";
import { useRiskScopePermissions } from "../security/riskScopePermissions";
import { riskScopeErrorMessage } from "../utils/riskScopeError";
import RiskScopeEditorDialog from "./RiskScopeEditorDialog";
import RiskTemplateSelectionDialog from "./RiskTemplateSelectionDialog";
import "../risk-scope.css";
import "@/features/risk/risk.css";

interface Props {
  subprocessId: string | null;
  readOnly: boolean;
  busy?: boolean;
  onDraftStateChange?: (state: RiskScopeDraftState) => void;
}

const EMPTY_OPTIONS: RiskScopeSelectionOptions = { riskTemplates: [], riskCategories: [] };
const READ_ONLY_RISK_PERMISSIONS: CatalogActionPermissions = { create: false, update: false, move: false, lifecycle: false, delete: false, restore: false, publish: false, documentUpload: false };
function readFilter(event: unknown): RiskScopeStatusFilter { return ((event as { target?: { value?: string } }).target?.value ?? "ALL") as RiskScopeStatusFilter; }
function fromPersisted(row: CentralSubprocessRiskScope): RiskScopeDraftRow {
  return { key: row.id, scopeId: row.id, riskTemplateId: row.riskTemplateId, riskTemplateCode: row.riskTemplateCode, riskTemplateTitle: row.riskTemplateTitle, riskCategoryId: row.riskCategoryId, riskType: row.riskType, status: row.status, validFrom: row.validFrom, validTo: row.validTo, version: row.version, editState: "FINAL", original: row };
}
function sameValues(row: RiskScopeDraftRow, original: CentralSubprocessRiskScope): boolean {
  return row.validFrom === original.validFrom && row.validTo === original.validTo && row.status === original.status;
}
function sameValidity(row: RiskScopeDraftRow, original: CentralSubprocessRiskScope): boolean {
  return row.validFrom === original.validFrom && row.validTo === original.validTo;
}
type ScopeStatusState = "Positive" | "None" | "Information";
interface ScopeStatusPresentation {
  translationKey: string;
  state: ScopeStatusState;
  icon: "accept" | "pause" | "information";
}
function statusFor(row: RiskScopeDraftRow): ScopeStatusPresentation {
  if (row.editState === "FINAL") return row.status === "ACTIVE"
    ? { translationKey: "riskScope.status.ACTIVE", state: "Positive", icon: "accept" }
    : { translationKey: "riskScope.status.INACTIVE", state: "None", icon: "pause" };
  if (row.editState === "DRAFT_PENDING_DELETE") return { translationKey: "riskScope.editState.DELETED", state: "Information", icon: "information" };
  if (row.editState === "DRAFT_NEW") return { translationKey: `riskScope.editState.${row.status}`, state: "Information", icon: "information" };
  if (row.original && row.status !== row.original.status && sameValidity(row, row.original)) {
    return { translationKey: `riskScope.editState.${row.status}`, state: "Information", icon: "information" };
  }
  return { translationKey: "riskScope.editState.EDITED", state: "Information", icon: "information" };
}
function readOpener(event: unknown): HTMLElement | null {
  const currentTarget = (event as { currentTarget?: EventTarget | null }).currentTarget;
  return currentTarget instanceof HTMLElement ? currentTarget : null;
}
function isOwnDialogCloseEvent(event: unknown): boolean {
  const candidate = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(candidate.target && candidate.currentTarget && candidate.target === candidate.currentTarget);
}
function valuesFor(row: RiskScopeDraftRow) { return { validFrom: row.validFrom, validTo: row.validTo }; }
function toChanges(rows: RiskScopeDraftRow[]): RiskScopeChange[] {
  return rows.flatMap((row): RiskScopeChange[] => {
    if (row.editState === "DRAFT_PENDING_DELETE") return [{ operation: "DELETE", riskTemplateId: row.riskTemplateId, scopeId: row.scopeId, version: row.version }];
    if (!row.original) return [{ operation: "CREATE_OR_RESTORE", riskTemplateId: row.riskTemplateId, ...valuesFor(row) }];
    if (row.editState !== "DRAFT_EDITED") return [];
    const validityChanged = row.validFrom !== row.original.validFrom || row.validTo !== row.original.validTo;
    if (validityChanged) return [{ operation: "UPDATE", riskTemplateId: row.riskTemplateId, scopeId: row.scopeId, version: row.version, requestedStatus: row.status, ...valuesFor(row) }];
    return [{ operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", riskTemplateId: row.riskTemplateId, scopeId: row.scopeId, version: row.version }];
  });
}

export default function SubprocessRiskScopesTab({ subprocessId, readOnly, busy: parentBusy = false, onDraftStateChange }: Props) {
  const { t } = useTranslation();
  const permissions = useRiskScopePermissions();
  const [rows, setRows] = useState<RiskScopeDraftRow[]>([]);
  const [options, setOptions] = useState<RiskScopeSelectionOptions>(EMPTY_OPTIONS);
  const [filter, setFilter] = useState<RiskScopeStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [actionRowKey, setActionRowKey] = useState<string | null>(null);
  const [actionSheetOpener, setActionSheetOpener] = useState<HTMLElement | null>(null);
  const [viewRiskTemplateId, setViewRiskTemplateId] = useState<string | null>(null);
  const [viewRiskTemplate, setViewRiskTemplate] = useState<CentralRiskTemplateDetail | null>(null);
  const [viewRiskBusy, setViewRiskBusy] = useState(false);
  const [viewRiskError, setViewRiskError] = useState<string | null>(null);
  const [viewRiskTab, setViewRiskTab] = useState<CentralRiskTabKey>("general");
  const generationRef = useRef(0);
  const viewGenerationRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = ++generationRef.current;
    if (!permissions.view) { setLoading(false); setLoaded(true); setRows([]); return; }
    setLoading(true); setLoaded(false);
    try {
      const [selectionOptions, persisted] = await Promise.all([
        riskScopeApi.options(signal),
        subprocessId ? riskScopeApi.listForSubprocess(subprocessId, "ALL", "", signal) : Promise.resolve([]),
      ]);
      if (generation !== generationRef.current) return;
      setOptions(selectionOptions);
      setRows(persisted.map(fromPersisted));
      setError(null); setLoaded(true);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      if (generation === generationRef.current) { setError(riskScopeErrorMessage(loadError, t)); setLoaded(false); }
    } finally { if (generation === generationRef.current) setLoading(false); }
  }, [permissions.view, subprocessId, t]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const changes = useMemo(() => toChanges(rows), [rows]);
  useEffect(() => { onDraftStateChange?.({ changes, dirty: changes.length > 0, ready: loaded || !permissions.view, invalid: Boolean(error) }); }, [changes, error, loaded, onDraftStateChange, permissions.view]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => (filter === "ALL" || row.status === filter)
      && (!needle || row.riskTemplateCode.toLocaleLowerCase().includes(needle) || row.riskTemplateTitle.toLocaleLowerCase().includes(needle)));
  }, [filter, rows, search]);
  const editing = editingKey ? rows.find((row) => row.key === editingKey) ?? null : null;
  const actionRow = actionRowKey ? rows.find((row) => row.key === actionRowKey) ?? null : null;
  const mutationBusy = parentBusy || loading;

  const confirmSelection = (selectedIds: Set<string>) => {
    setRows((current) => {
      const byRiskTemplate = new Map(options.riskTemplates.map((riskTemplate) => [riskTemplate.id, riskTemplate]));
      const next: RiskScopeDraftRow[] = [];
      for (const row of current) {
        if (selectedIds.has(row.riskTemplateId)) {
          next.push(row.editState === "DRAFT_PENDING_DELETE" && row.original ? fromPersisted(row.original) : row);
        } else if (row.original) {
          next.push({ ...row, editState: "DRAFT_PENDING_DELETE" });
        }
      }
      const occupied = new Set(current.map((row) => row.riskTemplateId));
      for (const riskTemplateId of selectedIds) {
        if (occupied.has(riskTemplateId)) continue;
        const riskTemplate = byRiskTemplate.get(riskTemplateId);
        if (!riskTemplate || riskTemplate.status !== "ACTIVE") continue;
        next.push({ key: `new:${riskTemplate.id}`, scopeId: null, riskTemplateId: riskTemplate.id, riskTemplateCode: riskTemplate.code, riskTemplateTitle: riskTemplate.title, riskCategoryId: riskTemplate.riskCategoryId, riskType: riskTemplate.riskType, status: "ACTIVE", validFrom: null, validTo: null, version: null, editState: "DRAFT_NEW", original: null });
      }
      return next;
    });
    setSelectionOpen(false);
  };

  const saveEdit = (values: RiskScopeDraftValues) => {
    if (!editingKey) return;
    setRows((current) => current.map((row) => {
      if (row.key !== editingKey) return row;
      const next = { ...row, ...values };
      return { ...next, editState: !next.original ? "DRAFT_NEW" : sameValues(next, next.original) ? "FINAL" : "DRAFT_EDITED" };
    }));
    setEditingKey(null);
  };
  const changeLifecycle = (row: RiskScopeDraftRow, status: RiskScopeDraftRow["status"]) => setRows((current) => current.map((candidate) => candidate.key !== row.key ? candidate : { ...candidate, status, editState: candidate.original && sameValues({ ...candidate, status }, candidate.original) ? "FINAL" : candidate.original ? "DRAFT_EDITED" : "DRAFT_NEW" }));
  const remove = (row: RiskScopeDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? { ...candidate, editState: "DRAFT_PENDING_DELETE" } : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const undo = (row: RiskScopeDraftRow) => setRows((current) => row.original ? current.map((candidate) => candidate.key === row.key ? fromPersisted(row.original!) : candidate) : current.filter((candidate) => candidate.key !== row.key));
  const canEditRow = (row: RiskScopeDraftRow) => row.original ? permissions.update : (permissions.create || permissions.restore);
  const canChangeLifecycle = (row: RiskScopeDraftRow) => Boolean(row.original && permissions.lifecycle);
  const canRemoveRow = (row: RiskScopeDraftRow) => (row.original && permissions.delete) || (!row.original && (permissions.create || permissions.restore));
  const hasRowActions = (row: RiskScopeDraftRow) => row.editState !== "FINAL" || canEditRow(row) || canChangeLifecycle(row) || canRemoveRow(row);
  const closeActionSheet = () => { setActionRowKey(null); setActionSheetOpener(null); };
  const runRowAction = (action: () => void) => { closeActionSheet(); action(); };
  const closeRiskView = () => {
    viewGenerationRef.current += 1;
    setViewRiskTemplateId(null);
    setViewRiskTemplate(null);
    setViewRiskError(null);
    setViewRiskBusy(false);
    setViewRiskTab("general");
  };
  const openRiskView = async (riskTemplateId: string) => {
    if (!permissions.riskTemplateView) return;
    const generation = ++viewGenerationRef.current;
    setViewRiskTemplateId(riskTemplateId);
    setViewRiskTemplate(null);
    setViewRiskError(null);
    setViewRiskBusy(true);
    setViewRiskTab("general");
    try {
      const detail = await centralRiskApi.template(riskTemplateId);
      if (generation === viewGenerationRef.current) setViewRiskTemplate(detail);
    } catch {
      if (generation === viewGenerationRef.current) setViewRiskError(t("risk.errors.loadDetail"));
    } finally {
      if (generation === viewGenerationRef.current) setViewRiskBusy(false);
    }
  };

  if (!permissions.view) return <MessageStrip design="Information">{t("riskScope.errors.forbidden")}</MessageStrip>;
  return <section className="riskScopeTab">
    <div className="riskScopeToolbar"><Title level="H5">{t("riskScope.title")}</Title><div className="riskScopeToolbarGroup"><Input className="riskScopeToolbarSearch" value={search} placeholder={t("riskScope.dialog.search")} disabled={mutationBusy} onInput={(event) => setSearch(event.target.value)} /><div className="riskScopeFilter"><Label showColon>{t("riskScope.filter.label")}</Label><Select value={filter} disabled={mutationBusy} onChange={(event) => setFilter(readFilter(event))}><Option value="ALL">{t("riskScope.filter.all")}</Option><Option value="ACTIVE">{t("riskScope.status.ACTIVE")}</Option><Option value="INACTIVE">{t("riskScope.status.INACTIVE")}</Option></Select></div>{!readOnly && (permissions.create || permissions.restore || permissions.delete) ? <Button design="Emphasized" disabled={mutationBusy || !loaded} onClick={() => setSelectionOpen(true)}>{t("riskScope.actions.selectRiskTemplates")}</Button> : null}</div></div>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}<Button design="Transparent" onClick={() => void load()}>{t("riskScope.actions.retry")}</Button></MessageStrip> : null}
    {loading ? <BusyIndicator active delay={0} /> : loaded && visibleRows.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("riskScope.fields.riskTemplate")}</TableHeaderCell><TableHeaderCell>{t("riskScope.fields.riskType")}</TableHeaderCell><TableHeaderCell>{t("riskScope.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("riskScope.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("riskScope.fields.lifecycle")}</TableHeaderCell>{!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}</TableHeaderRow>}>
      {visibleRows.map((row) => {
        const status = statusFor(row);
        return <TableRow key={row.key} rowKey={row.key}><TableCell><Link accessibleRole="Button" interactiveAreaSize="Large" wrappingType="Normal" disabled={!permissions.riskTemplateView} onClick={(event) => { event.preventDefault(); void openRiskView(row.riskTemplateId); }}>{`${row.riskTemplateCode} - ${row.riskTemplateTitle}`}</Link></TableCell><TableCell><Tag design="Set1">{t(`risk.riskType.${row.riskType}`)}</Tag></TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell><ObjectStatus state={status.state} icon={<Icon name={status.icon} mode="Decorative" />}>{t(status.translationKey)}</ObjectStatus></TableCell>{!readOnly ? <TableCell><Button design="Transparent" icon="overflow" accessibleName={t("common.actions")} tooltip={t("common.actions")} disabled={mutationBusy || !hasRowActions(row)} accessibilityAttributes={{ hasPopup: "menu", expanded: actionRowKey === row.key ? "true" : "false" }} onClick={(event) => { const opener = readOpener(event); if (!opener) return; setActionRowKey(row.key); setActionSheetOpener(opener); }} /></TableCell> : null}</TableRow>;
      })}
    </Table> : loaded ? <div className="riskScopeEmpty">{t("riskScope.empty")}</div> : null}
    {!readOnly ? <ActionSheet open={Boolean(actionRow && actionSheetOpener)} opener={actionSheetOpener} placement="Bottom" horizontalAlign="End" headerText={t("common.actions")} onClose={closeActionSheet}>
      {actionRow && actionRow.editState === "DRAFT_PENDING_DELETE" ? <Button icon="undo" disabled={mutationBusy} onClick={() => runRowAction(() => undo(actionRow))}>{t("riskScope.actions.undo")}</Button> : <>
        {actionRow && canEditRow(actionRow) ? <Button icon="edit" disabled={mutationBusy} onClick={() => runRowAction(() => setEditingKey(actionRow.key))}>{t("riskScope.actions.edit")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "ACTIVE" ? <Button icon="pause" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "INACTIVE"))}>{t("riskScope.actions.inactivate")}</Button> : null}
        {actionRow && canChangeLifecycle(actionRow) && actionRow.status === "INACTIVE" ? <Button icon="accept" disabled={mutationBusy} onClick={() => runRowAction(() => changeLifecycle(actionRow, "ACTIVE"))}>{t("riskScope.actions.activate")}</Button> : null}
        {actionRow && canRemoveRow(actionRow) ? <Button icon="delete" disabled={mutationBusy} onClick={() => runRowAction(() => remove(actionRow))}>{t("riskScope.actions.remove")}</Button> : null}
        {actionRow && actionRow.editState !== "FINAL" ? <Button icon="undo" disabled={mutationBusy} onClick={() => runRowAction(() => undo(actionRow))}>{t("riskScope.actions.undo")}</Button> : null}
      </>}
    </ActionSheet> : null}
    <Dialog open={Boolean(viewRiskTemplateId)} accessibleName={t("risk.template.view.title")} className="riskObjectDialog" onClose={(event) => { if (isOwnDialogCloseEvent(event)) closeRiskView(); }}>
      <ModalDialogHeader title={t("risk.template.view.title")} onClose={closeRiskView} />
      <div className="riskDialogContent">
        {viewRiskBusy ? <BusyIndicator active delay={0} /> : viewRiskTemplate ? <CentralRiskObjectPage kind="template" mode="view" value={viewRiskTemplate} categories={options.riskCategories} initialParentCategoryId={viewRiskTemplate.riskCategoryId} activeTab={viewRiskTab} busy={false} permissions={READ_ONLY_RISK_PERMISSIONS} error={viewRiskError} documentError={null} onErrorClose={() => setViewRiskError(null)} onSubmit={async () => false} onCancel={closeRiskView} onEdit={() => undefined} onActiveTabChange={setViewRiskTab} onDirtyChange={() => undefined} /> : viewRiskError ? <MessageStrip design="Negative" hideCloseButton>{viewRiskError}</MessageStrip> : null}
      </div>
    </Dialog>
    <RiskTemplateSelectionDialog open={selectionOpen} riskTemplates={options.riskTemplates} riskCategories={options.riskCategories} rows={rows} busy={mutationBusy} onClose={() => setSelectionOpen(false)} onConfirm={confirmSelection} canToggle={(riskTemplateId, currentlySelected) => currentlySelected ? (rows.find((row) => row.riskTemplateId === riskTemplateId)?.original ? permissions.delete : true) : (permissions.create || permissions.restore)} />
    <RiskScopeEditorDialog open={Boolean(editing)} row={editing} busy={mutationBusy} onClose={() => setEditingKey(null)} onSave={saveEdit} />
  </section>;
}
