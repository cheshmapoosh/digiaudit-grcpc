import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox, MessageStrip } from "@ui5/webcomponents-react";
import { HierarchyMultiSelectionDialog } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import type { OrganizationLocalDraft } from "../domain/organizationLocal.model";
import { LOCAL_SECTION_BY_KEY } from "../domain/local.sections";
import { normalizeOrganizationScopeDraft, organizationScopeDraftFromRow, type OrganizationScopeContext,
    type OrganizationScopeRow, type OrganizationScopeSection, type OrganizationScopesTableState } from "../domain/organizationScopes.model";
import { buildOrganizationScopeChoices, buildOrganizationScopeChoiceNodes } from "../domain/organizationScopeSelection";
import { loadOrganizationScopeSelection, type OrganizationScopeSelectionData } from "../infra/organizationScopeSelection.api.repo";
import { localApi } from "../infra/local.api.repo";
import OrganizationScopesTable from "./OrganizationScopesTable";

const EMPTY_SELECTION = new Set<string>();
const READY_TABLE: OrganizationScopesTableState = { pending: false, ready: true, dirty: false };
interface Props {
    section: OrganizationScopeSection;
    organizationId: string | null;
    contexts: OrganizationScopeContext[];
    contextsLoading: boolean;
    contextsError: string | null;
    onRetryContexts: () => void;
    canonicalRows?: OrganizationScopeRow[];
    resetKey: string | number;
    drafts: OrganizationLocalDraft[];
    onChange: Dispatch<SetStateAction<OrganizationLocalDraft[]>>;
    editable: boolean;
    busy: boolean;
    onStateChange: (section: OrganizationScopeSection, state: OrganizationScopesTableState) => void;
    deepLinkRowId?: string | null;
    onInvalidDeepLink?: () => void;
    initialStatus?: CatalogRelationFilter;
    onFilterChange?: (filter: CatalogRelationFilter) => void;
}

/** These three typed Local Scope families use the existing Organization aggregate command. */
export default function OrganizationScopesTab({ section, organizationId, contexts, contextsLoading, contextsError,
    onRetryContexts, canonicalRows, resetKey, drafts, onChange, editable, busy, onStateChange, deepLinkRowId,
    onInvalidDeepLink, initialStatus, onFilterChange }: Props) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<OrganizationScopeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerError, setPickerError] = useState<string | null>(null);
    const [selectionData, setSelectionData] = useState<OrganizationScopeSelectionData | null>(null);
    const [tableState, setTableState] = useState<OrganizationScopesTableState>(READY_TABLE);
    const rowsGeneration = useRef(0);
    const pickerGeneration = useRef(0);
    const pickerController = useRef<AbortController | null>(null);
    const contextIdsKey = JSON.stringify([...new Set(contexts.flatMap(context => context.id ? [context.id] : []))].sort());
    const readKey = `${section}:${organizationId ?? "create"}:${resetKey}:${contextIdsKey}`;
    const readContextIds = useMemo(() => JSON.parse(contextIdsKey) as string[], [contextIdsKey]);
    const loadRows = useCallback(async () => {
        const generation = ++rowsGeneration.current;
        setLoading(true);
        try {
            const groups = organizationId ? await Promise.all(readContextIds.map(contextId =>
                localApi.allRows(section, { organizationId, contextId }))) : [];
            if (generation !== rowsGeneration.current) return;
            setRows(groups.flat()); setError(null); setLoadedKey(readKey);
        } catch { if (generation === rowsGeneration.current) setError(t("catalogRelation.loadError")); }
        finally { if (generation === rowsGeneration.current) setLoading(false); }
    }, [organizationId, readContextIds, readKey, section, t]);
    useEffect(() => {
        let current = true;
        void Promise.resolve().then(() => { if (current) return loadRows(); });
        return () => { current = false; rowsGeneration.current += 1; };
    }, [loadRows]);
    useEffect(() => () => { pickerGeneration.current += 1; pickerController.current?.abort(); }, []);
    const canonical = useMemo(() => {
        const scopeIds = new Set(readContextIds);
        const latest = new Map<string, OrganizationScopeRow>();
        for (const row of [...rows, ...(canonicalRows ?? [])]) {
            if (row.organizationId !== organizationId || !scopeIds.has(row.organizationSubprocessScopeId)) continue;
            const previous = latest.get(row.id);
            if (!previous || previous.version <= row.version) latest.set(row.id, row);
        }
        return [...latest.values()];
    }, [rows, canonicalRows, organizationId, readContextIds]);
    const localDrafts = drafts.filter(draft => draft.section === section);
    const completeRead = loadedKey === readKey;
    const dataError = contextsError ?? error;
    const tableLoading = contextsLoading || loading || !completeRead && !dataError;
    const reportTableState = useCallback((state: OrganizationScopesTableState) => setTableState(previous =>
        previous.pending === state.pending && previous.ready === state.ready && previous.dirty === state.dirty ? previous : state), []);
    const ready = !pickerOpen && tableState.ready && (!localDrafts.length || completeRead && !dataError && !contextsLoading && !loading);
    const dirty = pickerOpen || tableState.dirty;
    const pending = pickerOpen || tableState.pending;
    useEffect(() => { onStateChange(section, { pending, ready, dirty }); }, [onStateChange, section, pending, ready, dirty]);
    useEffect(() => () => onStateChange(section, READY_TABLE), [onStateChange, section]);
    const choices = selectionData ? buildOrganizationScopeChoices({ section, contexts, rows: canonical, drafts, data: selectionData }) : [];
    const nodes = selectionData ? buildOrganizationScopeChoiceNodes(choices, selectionData.processes, {
        local: t("local.scopePicker.local"), central: t("local.scopePicker.central"),
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
            const next = await loadOrganizationScopeSelection(section, ids, controller.signal);
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
                const baseline = organizationScopeDraftFromRow(section, choice.original, context);
                const pendingDraft = localDrafts.find(draft => draft.rowId === choice.original!.id || draft.key === baseline.key);
                replaced.add(baseline.key);
                const next = normalizeOrganizationScopeDraft({ ...baseline, ...(pendingDraft ?? {}),
                    status: choice.original.status === "DELETED" ? "ACTIVE" : choice.original.status }, choice.original);
                if (next) staged.push(next);
            } else {
                const central = choice.centralScope;
                if (!central || context.status !== "ACTIVE") return;
                const key = `${section}:${context.key}:${central.definitionId}`;
                replaced.add(key);
                staged.push({ key, section, ownerKey: context.key, contextRef: context.contextRef,
                    identityId: central.definitionId, code: choice.code, name: choice.name,
                    operation: "CREATE_OR_RESTORE", status: "ACTIVE", sourceType: "INHERITED_FROM_CENTRAL",
                    centralReferenceId: central.id, metadata: { validFrom: central.validFrom, validTo: central.validTo,
                        ...(section === "control-scopes" ? { actualOwnerId: null, frequencyCode: null,
                            executionMethodCode: null, testMethodCode: null, localContextNote: null } : {}) } });
            }
        }
        onChange(previous => [...previous.filter(draft => !replaced.has(draft.key)), ...staged]);
        closePicker();
    };
    const pickerTitle = t("local.scopePicker.title", { entity: t(LOCAL_SECTION_BY_KEY[section].labelKey) });
    return <FlexBox direction="Column" className="organizationLocalDraftWorkspace">
        {!contextsLoading && !contexts.some(context => context.status !== "DELETED") ? <MessageStrip design="Information" hideCloseButton>{t("local.scopePicker.noContexts")}</MessageStrip> : null}
        <OrganizationScopesTable section={section} contexts={contexts} rows={canonical} drafts={drafts} onChange={onChange}
            editable={editable} busy={busy} loading={tableLoading} error={dataError} onSelect={() => void openPicker()}
            onRetry={() => { if (contextsError) onRetryContexts(); else void loadRows(); }} selectionBlocked={pickerOpen || !completeRead || Boolean(contextsError)}
            onStateChange={reportTableState} deepLinkRowId={deepLinkRowId} onInvalidDeepLink={onInvalidDeepLink}
            initialStatus={initialStatus} onFilterChange={onFilterChange} />
        {pickerOpen ? <HierarchyMultiSelectionDialog open title={pickerTitle} searchAccessibleName={t("local.scopePicker.search")}
            nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={pickerLoading} error={pickerError}
            description={t("local.scopePicker.hint")} confirmDisabled={!choices.length}
            confirmText={t("common.select")} cancelText={t("common.cancel")} onConfirm={stage} onClose={closePicker} /> : null}
    </FlexBox>;
}
