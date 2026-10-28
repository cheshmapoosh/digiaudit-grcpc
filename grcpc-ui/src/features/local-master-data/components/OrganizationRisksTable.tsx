import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FlexBox, Link, MessageStrip, Text } from "@ui5/webcomponents-react";
import { DocumentManager } from "@/features/document";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { LocalRiskRow, LocalStatus } from "../domain/local.model";
import type { LocalRelationMetadata, OrganizationLocalDraft } from "../domain/organizationLocal.model";
import { normalizeOrganizationRiskDraft, organizationRiskDraftFromRow, type OrganizationRiskContext, type OrganizationRisksTableState } from "../domain/organizationRisks.model";

interface Props {
    contexts: OrganizationRiskContext[];
    /** Canonical live rows and the internal deleted occupied-pair pool. */
    rows: LocalRiskRow[];
    drafts: OrganizationLocalDraft[];
    onChange: Dispatch<SetStateAction<OrganizationLocalDraft[]>>;
    editable: boolean;
    busy: boolean;
    loading: boolean;
    error: string | null;
    onSelect: () => void;
    onRetry: () => void;
    selectionBlocked?: boolean;
    onStateChange: (state: OrganizationRisksTableState) => void;
    deepLinkRowId?: string | null;
    onInvalidDeepLink?: () => void;
    initialStatus?: CatalogRelationFilter;
    onFilterChange?: (filter: CatalogRelationFilter) => void;
}

interface Row {
    draft: OrganizationLocalDraft;
    original?: LocalRiskRow;
    context?: OrganizationRiskContext;
    pending: boolean;
}

/** One controlled table for all Organization Risk contexts; the parent owns selection and Save. */
export default function OrganizationRisksTable({ contexts, rows, drafts, onChange, editable, busy, loading, error,
    onSelect, onRetry, selectionBlocked = false, onStateChange, deepLinkRowId, onInvalidDeepLink,
    initialStatus = "ALL", onFilterChange }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<CatalogRelationFilter>(initialStatus);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dateDrafts, setDateDrafts] = useState<Record<string, PersianDateDraftState>>({});
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [documentDirty, setDocumentDirty] = useState(false);
    const relevant = drafts.filter(draft => draft.section === "risk-scopes");
    const contextFor = (draft: OrganizationLocalDraft) => contexts.find(context => context.key === draft.ownerKey
        || Boolean(draft.contextRef?.contextId && draft.contextRef.contextId === context.id)
        || Boolean(draft.contextRef?.subprocessId && draft.contextRef.subprocessId === context.subprocessId));
    const allRows: Row[] = rows.map(original => {
        const context = contexts.find(item => item.id === original.organizationSubprocessScopeId);
        const baseline = organizationRiskDraftFromRow(original, context);
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
    const dirty = documentDirty || dateDirty;
    const ready = !documentDirty && !invalid && (!relevant.length || !loading && !error);
    useEffect(() => { onStateChange({ pending: documentDirty, ready, dirty }); }, [dirty, documentDirty, onStateChange, ready]);
    useEffect(() => () => onStateChange({ pending: false, ready: true, dirty: false }), [onStateChange]);
    useEffect(() => {
        if (!deepLinkRowId || loading || error) return;
        const linked = rows.find(row => row.id === deepLinkRowId && row.status !== "DELETED");
        if (!linked) { onInvalidDeepLink?.(); return; }
        const context = contexts.find(item => item.id === linked.organizationSubprocessScopeId);
        const key = organizationRiskDraftFromRow(linked, context).key;
        queueMicrotask(() => setSelected(previous => previous.has(key) ? previous : new Set([...previous, key])));
    }, [contexts, deepLinkRowId, error, loading, onInvalidDeepLink, rows]);

    const update = (row: Row, patch: Pick<Partial<LocalRelationMetadata>, "validFrom" | "validTo">) => {
        if (!editable || busy || loading || row.draft.status === "DELETED" || contextStatus(row) === "DELETED") return;
        const next = normalizeOrganizationRiskDraft({ ...row.draft, metadata: { ...row.draft.metadata, ...patch } }, row.original);
        onChange(previous => [...previous.filter(draft => draft.key !== row.draft.key), ...(next ? [next] : [])]);
    };
    const batch = (status: LocalStatus) => {
        if (!editable || busy || loading) return;
        const targets = affected(status);
        const keys = new Set(targets.map(row => row.draft.key));
        const changes = targets.flatMap(row => {
            const next = normalizeOrganizationRiskDraft({ ...row.draft, status }, row.original);
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
    const columns: CatalogRelationColumn<Row>[] = [
        { key: "subprocess", header: t("local.fields.subprocess"), cell: row => <Text>{[
            row.context?.code ?? row.original?.subprocessCode,
            row.context?.name ?? row.original?.subprocessLabel,
        ].filter(Boolean).join(" — ") || t("catalogRelation.unavailable")}</Text> },
        { key: "code", header: t("catalogRelation.code"), cell: row => row.draft.code },
        { key: "name", header: t("catalogRelation.name"), cell: row => {
            const href = `/risks?riskTemplateId=${encodeURIComponent(row.draft.identityId)}`;
            return <Link href={href} onClick={event => { event.preventDefault(); navigate(href); }}>{row.draft.name}</Link>;
        } },
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
        { key: "documents", header: t("local.documents"), cell: row => row.original && row.original.status !== "DELETED"
            ? <Link onClick={() => { if (!documentDirty) setDocumentId(row.original!.id); }}>{t("local.documents")}</Link> : "—" },
    ];
    const documentRow = allRows.find(row => row.original?.id === documentId && row.original.status !== "DELETED");
    const documentEditable = editable && Boolean(documentRow && contextStatus(documentRow) !== "DELETED");
    return <FlexBox direction="Column" className="organizationLocalDraftTable">
        <CatalogRelationToolbar title={t("local.riskTable.title")} search={search} onSearch={setSearch}
            filter={filter} onFilter={next => { setFilter(next); onFilterChange?.(next); }} editable={editable} busy={busy || loading}
            canSelect={!error && !selectionBlocked && !documentDirty && contexts.some(context => context.status === "ACTIVE")}
            canActivate={affected("ACTIVE").length > 0} canInactivate={affected("INACTIVE").length > 0} canDelete={affected("DELETED").length > 0}
            onSelect={onSelect} onActivate={() => batch("ACTIVE")} onInactivate={() => batch("INACTIVE")} onDelete={() => batch("DELETED")} />
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton disabled={busy || loading} onClick={onRetry}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
        {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
        <CatalogRelationTable rows={displayed} rowKey={row => row.draft.key} columns={columns} selectedKeys={selected}
            onSelectionChange={setSelected} selectable={editable} loading={loading} busy={busy} accessibleName={t("local.riskTable.title")} />
        {documentRow?.original ? <DocumentManager targetType="LOCAL_RISK_SCOPE" targetId={documentRow.original.id}
            title={t("local.documents")} readOnly={!documentEditable} showActions={documentEditable} busy={busy}
            persistenceMode="STANDALONE" onDirtyChange={setDocumentDirty} /> : null}
    </FlexBox>;
}
