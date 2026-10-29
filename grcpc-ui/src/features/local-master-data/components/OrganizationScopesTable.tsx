import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox, MessageStrip, Option, Select, Text, TextArea } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { LocalOption, LocalStatus } from "../domain/local.model";
import { LOCAL_SECTION_BY_KEY } from "../domain/local.sections";
import type { LocalRelationMetadata, OrganizationLocalDraft } from "../domain/organizationLocal.model";
import {
    normalizeOrganizationScopeDraft, organizationScopeDraftFromRow,
    type OrganizationScopeContext, type OrganizationScopeRow, type OrganizationScopeSection, type OrganizationScopesTableState,
} from "../domain/organizationScopes.model";
import { localApi } from "../infra/local.api.repo";

interface Props {
    section: OrganizationScopeSection;
    contexts: OrganizationScopeContext[];
    /** Live rows and the internal deleted occupied-pair pool for this family. */
    rows: OrganizationScopeRow[];
    drafts: OrganizationLocalDraft[];
    onChange: Dispatch<SetStateAction<OrganizationLocalDraft[]>>;
    editable: boolean;
    busy: boolean;
    loading: boolean;
    error: string | null;
    onSelect: () => void;
    onRetry: () => void;
    selectionBlocked?: boolean;
    onStateChange: (state: OrganizationScopesTableState) => void;
    deepLinkRowId?: string | null;
    onInvalidDeepLink?: () => void;
    initialStatus?: CatalogRelationFilter;
    onFilterChange?: (filter: CatalogRelationFilter) => void;
}

interface Row {
    draft: OrganizationLocalDraft;
    original?: OrganizationScopeRow;
    context?: OrganizationScopeContext;
    pending: boolean;
}

type ControlMetadataField = "actualOwnerId" | "frequencyCode" | "executionMethodCode" | "testMethodCode";
type ControlSettings = { frequencyCodes: string[]; executionMethodCodes: string[]; testMethodCodes: string[] };

/** The three typed Local Scope families share the Risk tab's Organization-wide table layout. */
export default function OrganizationScopesTable({ section, contexts, rows, drafts, onChange, editable, busy, loading, error,
    onSelect, onRetry, selectionBlocked = false, onStateChange, deepLinkRowId, onInvalidDeepLink,
    initialStatus = "ALL", onFilterChange }: Props) {
    const { t } = useTranslation();
    const title = t(LOCAL_SECTION_BY_KEY[section].labelKey);
    const [filter, setFilter] = useState<CatalogRelationFilter>(initialStatus);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dateDrafts, setDateDrafts] = useState<Record<string, PersianDateDraftState>>({});
    const [owners, setOwners] = useState<LocalOption[]>([]);
    const [settings, setSettings] = useState<ControlSettings | null>(null);
    const [metadataLoading, setMetadataLoading] = useState(false);
    const [metadataLoaded, setMetadataLoaded] = useState(false);
    const [metadataError, setMetadataError] = useState(false);
    const [metadataReload, setMetadataReload] = useState(0);
    const needsControlMetadata = editable && section === "control-scopes";
    const metadataBlocked = needsControlMetadata && (!metadataLoaded || metadataLoading || metadataError);
    useEffect(() => {
        if (!needsControlMetadata) return;
        let current = true;
        void Promise.resolve().then(async () => {
            if (!current) return;
            setMetadataLoading(true); setMetadataError(false);
            try {
                const [nextOwners, nextSettings] = await Promise.all([
                    localApi.allOptions("options/control-owners"), localApi.controlSettings(),
                ]);
                if (current) { setOwners(nextOwners); setSettings(nextSettings); setMetadataLoaded(true); }
            } catch { if (current) setMetadataError(true); }
            finally { if (current) setMetadataLoading(false); }
        });
        return () => { current = false; };
    }, [needsControlMetadata, metadataReload, t]);
    const relevant = drafts.filter(draft => draft.section === section);
    const contextFor = (draft: OrganizationLocalDraft) => contexts.find(context => context.key === draft.ownerKey
        || Boolean(draft.contextRef?.contextId && draft.contextRef.contextId === context.id)
        || Boolean(draft.contextRef?.subprocessId && draft.contextRef.subprocessId === context.subprocessId));
    const allRows: Row[] = rows.map(original => {
        const context = contexts.find(item => item.id === original.organizationSubprocessScopeId);
        const baseline = organizationScopeDraftFromRow(section, original, context);
        const draft = relevant.find(item => item.rowId === original.id || item.key === baseline.key);
        return { original, context, draft: draft ?? baseline, pending: Boolean(draft) };
    });
    for (const draft of relevant) if (!allRows.some(row => row.draft.key === draft.key)) {
        allRows.push({ draft, context: contextFor(draft), pending: true });
    }
    const contextStatus = (row: Row) => row.context?.status ?? row.original?.contextStatus ?? "DELETED";
    const hasDateDraft = (row: Row, predicate: (state: PersianDateDraftState) => boolean) =>
        (["validFrom", "validTo"] as const).some(field => {
            const state = dateDrafts[`${row.draft.key}:${field}`];
            return state && predicate(state);
        });
    const query = search.trim().toLocaleLowerCase();
    const displayed = allRows.filter(row => row.pending || hasDateDraft(row, state => state.dirty || !state.valid)
        || row.original?.status !== "DELETED" && (filter === "ALL" || row.draft.status === filter)
        && (!query || `${row.draft.code} ${row.draft.name} ${row.context?.code ?? row.original?.subprocessCode ?? ""} ${row.context?.name ?? row.original?.subprocessLabel ?? ""}`.toLocaleLowerCase().includes(query)));
    const checked = displayed.filter(row => selected.has(row.draft.key));
    const affected = (target: LocalStatus) => checked.filter(row => row.draft.status !== target
        && (target === "DELETED" || row.original && row.original.status !== "DELETED"
            && contextStatus(row) !== "DELETED" && (target === "INACTIVE" || contextStatus(row) === "ACTIVE")));
    const requiresActiveContext = (row: Row) => row.draft.operation === "CREATE_OR_RESTORE" || row.draft.operation === "RESTORE"
        || row.draft.operation === "ACTIVATE" || row.draft.status === "ACTIVE" && row.original?.status !== "ACTIVE";
    const invalidReference = (row: Row) => {
        if (!row.pending || row.draft.operation === "DELETE" || row.draft.sourceType !== "INHERITED_FROM_CENTRAL" || !row.original) return false;
        const { centralReferenceStatus, centralReferenceValidFrom, centralReferenceValidTo } = row.original;
        return centralReferenceStatus === null || centralReferenceStatus === "DELETED" || requiresActiveContext(row) && centralReferenceStatus !== "ACTIVE"
            || Boolean(centralReferenceValidFrom && (!row.draft.metadata.validFrom || row.draft.metadata.validFrom < centralReferenceValidFrom))
            || Boolean(centralReferenceValidTo && (!row.draft.metadata.validTo || row.draft.metadata.validTo > centralReferenceValidTo));
    };
    const invalid = allRows.some(row => hasDateDraft(row, state => !state.valid)
        || invalidReference(row)
        || row.pending && row.draft.operation !== "DELETE" && (contextStatus(row) === "DELETED"
            || requiresActiveContext(row) && contextStatus(row) !== "ACTIVE")
        || row.draft.status !== "DELETED" && Boolean(row.draft.metadata.validFrom && row.draft.metadata.validTo
            && row.draft.metadata.validFrom > row.draft.metadata.validTo));
    const dateDirty = allRows.some(row => hasDateDraft(row, state => state.dirty));
    const ready = !invalid && (!relevant.length || !loading && !error && !metadataBlocked);
    useEffect(() => { onStateChange({ pending: false, ready, dirty: dateDirty }); }, [dateDirty, onStateChange, ready]);
    useEffect(() => () => onStateChange({ pending: false, ready: true, dirty: false }), [onStateChange]);
    useEffect(() => {
        if (!deepLinkRowId || loading || error) return;
        const linked = rows.find(row => row.id === deepLinkRowId && row.status !== "DELETED");
        if (!linked) { onInvalidDeepLink?.(); return; }
        const context = contexts.find(item => item.id === linked.organizationSubprocessScopeId);
        const key = organizationScopeDraftFromRow(section, linked, context).key;
        queueMicrotask(() => setSelected(previous => previous.has(key) ? previous : new Set([...previous, key])));
    }, [contexts, deepLinkRowId, error, loading, onInvalidDeepLink, rows, section]);

    const update = (row: Row, patch: Partial<LocalRelationMetadata>) => {
        if (!editable || busy || loading || row.draft.status === "DELETED" || contextStatus(row) === "DELETED") return;
        const next = normalizeOrganizationScopeDraft({ ...row.draft, metadata: { ...row.draft.metadata, ...patch } }, row.original);
        onChange(previous => [...previous.filter(draft => draft.key !== row.draft.key), ...(next ? [next] : [])]);
    };
    const batch = (status: LocalStatus) => {
        if (!editable || busy || loading) return;
        const targets = affected(status);
        const keys = new Set(targets.map(row => row.draft.key));
        const changes = targets.flatMap(row => {
            const next = normalizeOrganizationScopeDraft({ ...row.draft, status }, row.original);
            return next ? [next] : [];
        });
        onChange(previous => [...previous.filter(draft => !keys.has(draft.key)), ...changes]);
        if (status === "DELETED") setDateDrafts(previous => Object.fromEntries(Object.entries(previous)
            .filter(([key]) => !targets.some(row => key.startsWith(row.draft.key + ":")))));
    };
    const reportDate = (row: Row, field: "validFrom" | "validTo", state: PersianDateDraftState) => {
        setDateDrafts(previous => {
            const key = `${row.draft.key}:${field}`;
            const old = previous[key];
            return old?.draftValue === state.draftValue && old.valid === state.valid && old.dirty === state.dirty
                ? previous : { ...previous, [key]: state };
        });
    };
    const metadataLabel = (row: Row, field: ControlMetadataField, choices: { id: string; label: string }[]) => {
        const current = row.draft.metadata[field];
        if (!current) return "—";
        const selectedLabel = choices.find(choice => choice.id === current)?.label;
        if (selectedLabel) return selectedLabel;
        if (field !== "actualOwnerId") return t(`control.${field === "frequencyCode" ? "operationFrequency"
            : field === "executionMethodCode" ? "automationType" : "testingTechnique"}.${current}`, { defaultValue: t("catalogRelation.unavailable") });
        return row.original && "actualOwnerId" in row.original && row.original.actualOwnerId === current
            ? row.original.actualOwnerLabel || t("catalogRelation.unavailable") : t("catalogRelation.unavailable");
    };
    const selectMetadata = (row: Row, field: ControlMetadataField, choices: { id: string; label: string }[]) => {
        if (!editable || row.draft.status === "DELETED") return <Text>{metadataLabel(row, field, choices)}</Text>;
        const current = row.draft.metadata[field];
        return <Select value={current ?? ""} disabled={busy || loading || metadataBlocked || contextStatus(row) === "DELETED"}
            accessibleName={t(`local.fields.${field === "actualOwnerId" ? "actualOwner" : field}`)}
            onChange={event => update(row, { [field]: event.target.value || null })}>
            <Option value="">{t("catalogRelation.all")}</Option>
            {current && !choices.some(choice => choice.id === current) ? <Option value={current}>{metadataLabel(row, field, choices)}</Option> : null}
            {choices.map(choice => <Option key={choice.id} value={choice.id}>{choice.label}</Option>)}
        </Select>;
    };
    const columns: CatalogRelationColumn<Row>[] = [
        { key: "subprocess", header: t("local.fields.subprocess"), cell: row => <Text>{[
            row.context?.code ?? row.original?.subprocessCode,
            row.context?.name ?? row.original?.subprocessLabel,
        ].filter(Boolean).join(" — ") || t("catalogRelation.unavailable")}</Text> },
        { key: "code", header: t("catalogRelation.code"), cell: row => row.draft.code },
        { key: "name", header: t("catalogRelation.name"), cell: row => <Text>{row.draft.name}</Text> },
        { key: "status", header: t("common.status"), cell: row => <CatalogRelationStatus status={row.draft.status}
            draft={!row.pending ? null : row.draft.operation === "CREATE_OR_RESTORE" ? "new" : row.draft.operation === "DELETE" ? "delete"
                : row.draft.operation === "UPDATE" ? "edit" : row.draft.status === "ACTIVE" ? "active" : "inactive"} /> },
        { key: "source", header: t("catalogRelation.source"), cell: row => <Text>{t(row.draft.sourceType === "INHERITED_FROM_CENTRAL" ? "local.source.inherited" : "local.source.added")}</Text> },
        ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`),
            cell: (row: Row) => <CatalogRelationDate key={`${row.draft.key}:${field}`}
                value={row.draft.metadata[field]} label={t(`catalogRelation.${field}`)}
                editable={editable && row.draft.status !== "DELETED"}
                disabled={busy || loading || contextStatus(row) === "DELETED"} onChange={next => update(row, { [field]: next })}
                onDraftStateChange={state => reportDate(row, field, state)} /> })),
    ];
    if (section === "control-scopes") {
        columns.push({ key: "actualOwnerId", header: t("local.fields.actualOwner"), cell: row => selectMetadata(row, "actualOwnerId",
            owners.flatMap(option => option.displayLabel ? [{ id: option.id, label: option.displayLabel }] : [])) });
        for (const field of ["frequencyCode", "executionMethodCode", "testMethodCode"] as const) {
            const codes = settings?.[field === "frequencyCode" ? "frequencyCodes" : field === "executionMethodCode" ? "executionMethodCodes" : "testMethodCodes"] ?? [];
            columns.push({ key: field, header: t(`local.fields.${field}`), cell: row => selectMetadata(row, field, codes.map(id => ({
                id, label: t(`control.${field === "frequencyCode" ? "operationFrequency" : field === "executionMethodCode" ? "automationType" : "testingTechnique"}.${id}`),
            }))) });
        }
        columns.push({ key: "note", header: t("catalogRelation.note"), cell: row => editable && row.draft.status !== "DELETED"
            ? <TextArea value={row.draft.metadata.localContextNote ?? ""} disabled={busy || loading || contextStatus(row) === "DELETED"}
                maxlength={1000} accessibleName={t("catalogRelation.note")} onInput={event => update(row, { localContextNote: event.target.value || null })} />
            : <Text>{row.draft.metadata.localContextNote ?? "—"}</Text> });
    }
    return <FlexBox direction="Column" className="organizationLocalDraftTable">
        <CatalogRelationToolbar title={title} search={search} onSearch={setSearch}
            filter={filter} onFilter={next => { setFilter(next); onFilterChange?.(next); }} editable={editable} busy={busy || loading}
            canSelect={!error && !selectionBlocked && !metadataBlocked && contexts.some(context => context.status === "ACTIVE")}
            canActivate={affected("ACTIVE").length > 0} canInactivate={affected("INACTIVE").length > 0} canDelete={affected("DELETED").length > 0}
            onSelect={() => { if (!metadataBlocked) onSelect(); }} onActivate={() => batch("ACTIVE")} onInactivate={() => batch("INACTIVE")} onDelete={() => batch("DELETED")} />
        {metadataError && needsControlMetadata ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.loadError")}
            <CatalogActionButton disabled={busy || metadataLoading} onClick={() => setMetadataReload(value => value + 1)}>{t("catalogRelation.retry")}</CatalogActionButton>
        </MessageStrip> : null}
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton disabled={busy || loading} onClick={onRetry}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
        {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
        <CatalogRelationTable rows={displayed} rowKey={row => row.draft.key} columns={columns} selectedKeys={selected}
            onSelectionChange={setSelected} selectable={editable} loading={loading} busy={busy} accessibleName={title} />
    </FlexBox>;
}
