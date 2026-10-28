import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox, MessageStrip } from "@ui5/webcomponents-react";
import { HierarchyMultiSelectionDialog } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import type { LocalRiskRow } from "../domain/local.model";
import type { OrganizationLocalDraft } from "../domain/organizationLocal.model";
import { normalizeOrganizationRiskDraft, organizationRiskDraftFromRow, type OrganizationRiskContext, type OrganizationRisksTableState } from "../domain/organizationRisks.model";
import { buildOrganizationRiskChoices, buildOrganizationRiskChoiceNodes } from "../domain/organizationRiskSelection";
import { loadOrganizationRiskSelection, type OrganizationRiskSelectionData } from "../infra/organizationRiskSelection.api.repo";
import { localApi } from "../infra/local.api.repo";
import OrganizationRisksTable from "./OrganizationRisksTable";

const EMPTY_SELECTION = new Set<string>();
const READY_TABLE: OrganizationRisksTableState = { pending: false, ready: true, dirty: false };
interface Props {
    organizationId: string | null;
    contexts: OrganizationRiskContext[];
    contextsLoading: boolean;
    contextsError: string | null;
    onRetryContexts: () => void;
    canonicalRows?: LocalRiskRow[];
    resetKey: string | number;
    drafts: OrganizationLocalDraft[];
    onChange: Dispatch<SetStateAction<OrganizationLocalDraft[]>>;
    editable: boolean;
    busy: boolean;
    onStateChange: (state: OrganizationRisksTableState) => void;
    deepLinkRowId?: string | null;
    onInvalidDeepLink?: () => void;
    initialStatus?: CatalogRelationFilter;
    onFilterChange?: (filter: CatalogRelationFilter) => void;
}

/** The picker infers the existing Organization/Subprocess Context from an exact Risk Scope. */
export default function OrganizationRisksTab({ organizationId, contexts, contextsLoading, contextsError, onRetryContexts, canonicalRows,
    resetKey, drafts, onChange, editable, busy, onStateChange, deepLinkRowId, onInvalidDeepLink, initialStatus, onFilterChange }: Props) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<LocalRiskRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerError, setPickerError] = useState<string | null>(null);
    const [selectionData, setSelectionData] = useState<OrganizationRiskSelectionData | null>(null);
    const [tableState, setTableState] = useState<OrganizationRisksTableState>(READY_TABLE);
    const rowsGeneration = useRef(0);
    const pickerGeneration = useRef(0);
    const pickerController = useRef<AbortController | null>(null);
    const contextIdsKey = JSON.stringify([...new Set(contexts.flatMap(context => context.id ? [context.id] : []))].sort());
    const readKey = `${organizationId ?? "create"}:${resetKey}:${contextIdsKey}`;
    const readContextIds = useMemo(() => JSON.parse(contextIdsKey) as string[], [contextIdsKey]);
    const loadRows = useCallback(async () => {
        const generation = ++rowsGeneration.current;
        setLoading(true);
        try {
            const groups = organizationId ? await Promise.all(readContextIds.map(contextId =>
                localApi.allRows("risk-scopes", { organizationId, contextId }))) : [];
            if (generation !== rowsGeneration.current) return;
            setRows(groups.flat()); setError(null); setLoadedKey(readKey);
        } catch { if (generation === rowsGeneration.current) setError(t("catalogRelation.loadError")); }
        finally { if (generation === rowsGeneration.current) setLoading(false); }
    }, [organizationId, readContextIds, readKey, t]);
    useEffect(() => {
        let current = true;
        void Promise.resolve().then(() => { if (current) return loadRows(); });
        return () => { current = false; rowsGeneration.current += 1; };
    }, [loadRows]);
    useEffect(() => () => { pickerGeneration.current += 1; pickerController.current?.abort(); }, []);
    const canonical = useMemo(() => {
        const scopeIds = new Set(readContextIds);
        const latest = new Map<string, LocalRiskRow>();
        for (const row of [...rows, ...(canonicalRows ?? [])]) {
            if (row.organizationId !== organizationId || !scopeIds.has(row.organizationSubprocessScopeId)) continue;
            const previous = latest.get(row.id);
            if (!previous || previous.version <= row.version) latest.set(row.id, row);
        }
        return [...latest.values()];
    }, [rows, canonicalRows, organizationId, readContextIds]);
    const localDrafts = drafts.filter(draft => draft.section === "risk-scopes");
    const completeRead = loadedKey === readKey;
    const dataError = contextsError ?? error;
    const tableLoading = contextsLoading || loading || !completeRead && !dataError;
    const reportTableState = useCallback((state: OrganizationRisksTableState) => setTableState(previous =>
        previous.pending === state.pending && previous.ready === state.ready && previous.dirty === state.dirty ? previous : state), []);
    const ready = !pickerOpen && tableState.ready && (!localDrafts.length || completeRead && !dataError && !contextsLoading && !loading);
    const dirty = pickerOpen || tableState.dirty;
    const pending = pickerOpen || tableState.pending;
    useEffect(() => { onStateChange({ pending, ready, dirty }); }, [onStateChange, pending, ready, dirty]);
    useEffect(() => () => onStateChange(READY_TABLE), [onStateChange]);
    const choices = selectionData ? buildOrganizationRiskChoices({ contexts, rows: canonical, drafts, data: selectionData }) : [];
    const nodes = selectionData ? buildOrganizationRiskChoiceNodes(choices, selectionData.processes, {
        local: t("local.riskPicker.local"), central: t("local.riskPicker.central"),
    }) : [];
    const closePicker = () => {
        if (busy) return;
        pickerGeneration.current += 1; pickerController.current?.abort(); setPickerOpen(false);
    };
    const openPicker = async () => {
        if (!editable || busy || tableLoading || dataError || tableState.pending || !completeRead) return;
        const generation = ++pickerGeneration.current;
        pickerController.current?.abort();
        const controller = new AbortController(); pickerController.current = controller;
        setPickerOpen(true); setPickerLoading(true); setPickerError(null); setSelectionData(null);
        try {
            const ids = contexts.filter(context => context.status !== "DELETED").map(context => context.subprocessId);
            const next = await loadOrganizationRiskSelection(ids, controller.signal);
            if (generation === pickerGeneration.current && !controller.signal.aborted) setSelectionData(next);
        } catch {
            if (generation === pickerGeneration.current && !controller.signal.aborted) setPickerError(t("catalogRelation.loadError"));
        } finally { if (generation === pickerGeneration.current) setPickerLoading(false); }
    };
    const stage = (ids: Set<string>) => {
        const byKey = new Map(choices.map(choice => [choice.key, choice]));
        if (!editable || busy || pickerLoading || pickerError || !completeRead || [...ids].some(id => !byKey.has(id))) return;
        const staged: OrganizationLocalDraft[] = [];
        const replaced = new Set<string>();
        for (const id of ids) {
            const choice = byKey.get(id)!;
            const context = choice.context;
            if (choice.original) {
                const baseline = organizationRiskDraftFromRow(choice.original, context);
                const pendingDraft = localDrafts.find(draft => draft.rowId === choice.original!.id || draft.key === baseline.key);
                replaced.add(baseline.key);
                const next = normalizeOrganizationRiskDraft({ ...baseline, ...(pendingDraft ?? {}),
                    status: choice.original.status === "DELETED" ? "ACTIVE" : choice.original.status }, choice.original);
                if (next) staged.push(next);
            } else {
                const central = choice.centralScope;
                if (!central || context.status !== "ACTIVE") return;
                const key = `risk-scopes:${context.key}:${central.riskTemplateId}`;
                replaced.add(key);
                staged.push({ key, section: "risk-scopes", ownerKey: context.key, contextRef: context.contextRef,
                    identityId: central.riskTemplateId, code: choice.code, name: choice.name,
                    operation: "CREATE_OR_RESTORE", status: "ACTIVE", sourceType: "INHERITED_FROM_CENTRAL",
                    centralReferenceId: central.id, metadata: { validFrom: central.validFrom, validTo: central.validTo } });
            }
        }
        onChange(previous => [...previous.filter(draft => !replaced.has(draft.key)), ...staged]);
        closePicker();
    };
    return <FlexBox direction="Column" className="organizationLocalDraftWorkspace">
        {!contextsLoading && !contexts.some(context => context.status !== "DELETED") ? <MessageStrip design="Information" hideCloseButton>{t("local.riskPicker.noContexts")}</MessageStrip> : null}
        <OrganizationRisksTable contexts={contexts} rows={canonical} drafts={drafts} onChange={onChange}
            editable={editable} busy={busy} loading={tableLoading} error={dataError} onSelect={() => void openPicker()}
            onRetry={() => { if (contextsError) onRetryContexts(); else void loadRows(); }} selectionBlocked={pickerOpen || !completeRead || Boolean(contextsError)}
            onStateChange={reportTableState} deepLinkRowId={deepLinkRowId} onInvalidDeepLink={onInvalidDeepLink}
            initialStatus={initialStatus} onFilterChange={onFilterChange} />
        {pickerOpen ? <HierarchyMultiSelectionDialog open title={t("local.riskPicker.title")} searchAccessibleName={t("local.riskPicker.search")}
            nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={pickerLoading} error={pickerError}
            description={t("local.riskPicker.hint")} confirmDisabled={!choices.length}
            confirmText={t("common.select")} cancelText={t("common.cancel")} onConfirm={stage} onClose={closePicker} /> : null}
    </FlexBox>;
}
