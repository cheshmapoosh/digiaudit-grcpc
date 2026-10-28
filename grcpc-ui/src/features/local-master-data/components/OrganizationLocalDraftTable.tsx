import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FlexBox, Link, MessageStrip, Option, Select, Text, TextArea } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { CatalogRelationDate } from "@/shared/components/CatalogRelationDate";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { DocumentManager } from "@/features/document";
import { LOCAL_DOCUMENT_TARGETS, type LocalBaseRow, type LocalOption, type LocalRows, type LocalStatus } from "../domain/local.model";
import type { ContextRef, ControlScopeRef, RequirementScopeRef, LocalRelationMetadata, OrganizationLocalDraft, OrganizationLocalSection } from "../domain/organizationLocal.model";
import { LOCAL_SECTION_BY_KEY } from "../domain/local.sections";
import { localApi } from "../infra/local.api.repo";
import { loadLocalSelectionHierarchy } from "../infra/localSelectionHierarchy";
import { controlScopeApi } from "@/features/control-scope/infra/controlScope.api.repo";
import { riskScopeApi } from "@/features/risk-scope/infra/riskScope.api.repo";
import { controlObjectiveScopeApi } from "@/features/control-objective-scope/infra/controlObjectiveScope.api.repo";
import { requirementScopeApi } from "@/features/requirement-scope/infra/requirementScope.api.repo";

const EMPTY_SELECTION = new Set<string>();
export interface LocalDraftOwner {
    key: string; id: string | null; label: string; contextRef?: ContextRef; subprocessId?: string; definitionId?: string;
    controlScopeRef?: ControlScopeRef; requirementScopeRef?: RequirementScopeRef; available?: boolean; eligible?: boolean;
}
interface Props {
    organizationId: string | null; section: OrganizationLocalSection; owner: LocalDraftOwner;
    editable: boolean; busy: boolean; resetKey: string | number;
    drafts: OrganizationLocalDraft[]; onChange: Dispatch<SetStateAction<OrganizationLocalDraft[]>>;
    canonicalRows?: LocalRows[OrganizationLocalSection][];
    initialStatus?: CatalogRelationFilter; onFilterChange?: (filter: CatalogRelationFilter) => void;
    deepLinkRowId?: string | null; onInvalidDeepLink?: () => void;
    onStateChange: (key: string, state: { pending: boolean; ready: boolean; dirty: boolean }) => void;
}
type Row = { draft: OrganizationLocalDraft; original?: LocalRows[OrganizationLocalSection]; pending: boolean };
const value = (row: LocalBaseRow, key: string) => (row as unknown as Record<string, unknown>)[key];
const string = (row: LocalBaseRow, key: string): string | null => typeof value(row, key) === "string" ? value(row, key) as string : null;

/** Reads and local staging only. The Organization aggregate is the sole relationship writer. */
export default function OrganizationLocalDraftTable({ organizationId, section, owner, editable, busy, resetKey, drafts, onChange, canonicalRows, onStateChange, deepLinkRowId, onInvalidDeepLink, initialStatus = "ALL", onFilterChange }: Props) {
    const { t } = useTranslation(); const navigate = useNavigate(); const spec = LOCAL_SECTION_BY_KEY[section];
    const identity = spec.identityFields[0].name; const policy = Boolean(spec.policy);
    const stateKey = `${section}:${owner.key}`;
    const [rows, setRows] = useState<LocalRows[OrganizationLocalSection][]>(() => canonicalRows ?? []);
    const [loading, setLoading] = useState(Boolean(organizationId && owner.id));
    const [error, setError] = useState<string | null>(null); const [reload, setReload] = useState(0);
    const [filter, setFilter] = useState<CatalogRelationFilter>(initialStatus); const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pickerOpen, setPickerOpen] = useState(false); const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerError, setPickerError] = useState<string | null>(null); const [options, setOptions] = useState<LocalOption[]>([]);
    const [hierarchy, setHierarchy] = useState<HierarchySelectionNode[]>([]);
    const [centralScopes, setCentralScopes] = useState<{ id: string; definitionId: string; validFrom: string | null; validTo: string | null }[]>([]);
    const [source, setSource] = useState<"LOCAL_ADDED" | "INHERITED_FROM_CENTRAL">("LOCAL_ADDED");
    const [dateDrafts, setDateDrafts] = useState<Record<string, PersianDateDraftState>>({});
    const [documentId, setDocumentId] = useState<string | null>(null); const [documentDirty, setDocumentDirty] = useState(false);
    const [owners, setOwners] = useState<LocalOption[]>([]);
    const [metadataReload, setMetadataReload] = useState(0);
    const [metadataLoading, setMetadataLoading] = useState(false);
    const [metadataError, setMetadataError] = useState(false);
    const [settings, setSettings] = useState<{ frequencyCodes: string[]; executionMethodCodes: string[]; testMethodCodes: string[] } | null>(null);
    const ownerRequestKey = JSON.stringify({ organizationId, id: owner.id, section, resetKey, reload });
    useEffect(() => {
        let current = true;
        const request = organizationId && owner.id ? localApi.allRows(section, { organizationId,
            contextId: policy && section !== "context-policies" ? undefined : owner.id,
            policyTargetId: section === "control-policies" || section === "requirement-policies" ? owner.id : undefined }) : Promise.resolve([]);
        void Promise.resolve().then(() => { if (current) setLoading(true); return request; }).then(next => {
            if (current) { setRows(next); setLoading(false); setError(null); }
        }).catch(() => { if (current) { setLoading(false); setError(t("catalogRelation.loadError")); } });
        return () => { current = false; };
        // The serialized owner key prevents unrelated draft renders from reloading the baseline.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownerRequestKey, t]);
    const relevant = drafts.filter(item => item.section === section && item.ownerKey === owner.key);
    const canonical = useMemo(() => {
        const base = new Map(rows.map(row => [row.id, row]));
        canonicalRows?.forEach(row => { if (!base.has(row.id) || base.get(row.id)!.version <= row.version) base.set(row.id, row); });
        return [...base.values()];
    }, [rows, canonicalRows]);
    const fromRow = (row: LocalRows[OrganizationLocalSection]): OrganizationLocalDraft => {
        const identityId = string(row, identity)!;
        const metadata: LocalRelationMetadata = { validFrom: row.validFrom, validTo: row.validTo };
        if (section === "control-scopes") for (const field of ["actualOwnerId", "frequencyCode", "executionMethodCode", "testMethodCode", "localContextNote"] as const) metadata[field] = string(row, field);
        if (policy) metadata.scopeAction = string(row, "scopeAction") as "INCLUDE" | "EXCLUDE";
        if (section === "organization-policies") metadata.propagationMode = string(row, "propagationMode") as "DIRECT_ONLY" | "INCLUDE_DESCENDANTS";
        return { key: `${stateKey}:${identityId}`, ownerKey: owner.key, section, identityId,
            code: string(row, identity.replace(/Id$/, "Code")) ?? "", name: string(row, identity.replace(/Id$/, "Label")) ?? "",
            operation: "UPDATE", rowId: row.id, version: row.version, status: row.status, metadata,
            contextRef: owner.contextRef, controlScopeRef: owner.controlScopeRef, requirementScopeRef: owner.requirementScopeRef,
            sourceType: string(row, "sourceType") as OrganizationLocalDraft["sourceType"],
            centralReferenceId: spec.centralReferenceField ? string(row, spec.centralReferenceField) : undefined };
    };
    const allRows: Row[] = canonical.map(original => ({ original, draft: relevant.find(item => item.rowId === original.id) ?? fromRow(original), pending: relevant.some(item => item.rowId === original.id) }));
    for (const draft of relevant) if (!allRows.some(row => row.draft.key === draft.key)) allRows.push({ draft, pending: true });
    const query = search.trim().toLocaleLowerCase();
    const displayed = allRows.filter(row => row.pending || Object.entries(dateDrafts).some(([key, draft]) => key.startsWith(row.draft.key + ":") && draft.dirty)
        || (row.original?.status !== "DELETED" && (filter === "ALL" || row.draft.status === filter) && (!query || `${row.draft.code} ${row.draft.name}`.toLocaleLowerCase().includes(query))));
    const checked = displayed.filter(row => selected.has(row.draft.key));
    const affected = (target: LocalStatus) => checked.filter(row => row.draft.status !== target && (target === "DELETED" || owner.available !== false && row.original && row.original.status !== "DELETED"));
    const invalid = owner.available === false && relevant.some(item => item.operation !== "DELETE") || Object.values(dateDrafts).some(draft => !draft.valid) || relevant.some(item => Boolean(item.metadata.validFrom && item.metadata.validTo && item.metadata.validFrom > item.metadata.validTo));
    useEffect(() => { onStateChange(stateKey, { pending: pickerOpen || documentDirty, ready: !pickerOpen && !invalid && !documentDirty && (!relevant.length || (!loading && !error && !metadataLoading && !metadataError)), dirty: documentDirty || Object.values(dateDrafts).some(draft => draft.dirty) }); }, [stateKey, pickerOpen, invalid, documentDirty, relevant.length, loading, error, metadataLoading, metadataError, dateDrafts, onStateChange]);
    useEffect(() => () => onStateChange(stateKey, { pending: false, ready: true, dirty: false }), [onStateChange, stateKey]);
    useEffect(() => {
        if (loading || error || !deepLinkRowId) return;
        const linked = canonical.find(row => row.id === deepLinkRowId && row.organizationId === organizationId && row.status !== "DELETED");
        if (!linked) { onInvalidDeepLink?.(); return; }
        const key = stateKey + ":" + string(linked, identity);
        queueMicrotask(() => setSelected(previous => previous.has(key) ? previous : new Set([...previous, key])));
    }, [canonical, deepLinkRowId, error, identity, loading, onInvalidDeepLink, organizationId, stateKey]);
    useEffect(() => {
        if (!editable || section !== "control-scopes") return;
        let current = true;
        void Promise.resolve().then(() => { if (current) { setMetadataLoading(true); setMetadataError(false); } return Promise.all([localApi.allOptions("options/control-owners"), localApi.controlSettings()]); }).then(([nextOwners, nextSettings]) => { if (current) { setOwners(nextOwners); setSettings(nextSettings); } }).catch(() => { if (current) setMetadataError(true); }).finally(() => { if (current) setMetadataLoading(false); });
        return () => { current = false; };
    }, [editable, section, t, metadataReload]);
    const normalize = (next: OrganizationLocalDraft, original?: LocalRows[OrganizationLocalSection]): OrganizationLocalDraft | null => {
        if (!original || original.status === "DELETED") return { ...next, operation: "CREATE_OR_RESTORE", status: "ACTIVE" };
        const originalDraft = fromRow(original);
        const changed = JSON.stringify(next.metadata) !== JSON.stringify(originalDraft.metadata);
        if (next.status === original.status && !changed) return null;
        return { ...next, operation: next.status === "DELETED" ? "DELETE" : changed ? "UPDATE" : next.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE" };
    };
    const update = (row: Row, patch: Partial<LocalRelationMetadata>) => {
        const next = normalize({ ...row.draft, metadata: { ...row.draft.metadata, ...patch } }, row.original);
        onChange(previous => [...previous.filter(item => item.key !== row.draft.key), ...(next ? [next] : [])]);
    };
    const batch = (status: LocalStatus) => {
        const targets = affected(status); const keys = new Set(targets.map(row => row.draft.key));
        const next = targets.flatMap(row => {
            if (status === "DELETED" && (!row.original || row.original.status === "DELETED")) return [];
            const draft = normalize({ ...row.draft, status }, row.original); return draft ? [draft] : [];
        });
        onChange(previous => [...previous.filter(item => !keys.has(item.key)), ...next]);
        if (status === "DELETED") setDateDrafts(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !targets.some(row => key.startsWith(row.draft.key + ":")))));
    };
    const openPicker = async () => {
        if (!editable || busy || owner.eligible === false || owner.available === false) return;
        setPickerOpen(true); setPickerLoading(true); setPickerError(null);
        try {
            const [nextOptions, nextHierarchy] = await Promise.all([localApi.allOptions(spec.identityFields[0].options), loadLocalSelectionHierarchy(section)]);
            let scopes: typeof centralScopes = [];
            if (!policy && owner.subprocessId) {
                switch (section) {
                    case "control-scopes": scopes = (await controlScopeApi.listForSubprocess(owner.subprocessId, "ACTIVE")).map(row => ({ id: row.id, definitionId: row.controlId, validFrom: row.validFrom, validTo: row.validTo })); break;
                    case "risk-scopes": scopes = (await riskScopeApi.listForSubprocess(owner.subprocessId, "ACTIVE")).map(row => ({ id: row.id, definitionId: row.riskTemplateId, validFrom: row.validFrom, validTo: row.validTo })); break;
                    case "control-objective-scopes": scopes = (await controlObjectiveScopeApi.listForSubprocess(owner.subprocessId, "ACTIVE")).map(row => ({ id: row.id, definitionId: row.controlObjectiveId, validFrom: row.validFrom, validTo: row.validTo })); break;
                    case "requirement-scopes": scopes = (await requirementScopeApi.listForSubprocess(owner.subprocessId, "ACTIVE")).map(row => ({ id: row.id, definitionId: row.requirementId, validFrom: row.validFrom, validTo: row.validTo })); break;
                }
            }
            setOptions(nextOptions); setHierarchy(nextHierarchy); setCentralScopes(scopes);
        } catch { setPickerError(t("catalogRelation.loadError")); } finally { setPickerLoading(false); }
    };
    const excluded = new Set(allRows.filter(row => row.draft.status !== "DELETED").map(row => row.draft.identityId));
    const eligible = new Set(options.filter(option => option.displayLabel && option.code && (!option.status || option.status === "ACTIVE") && !excluded.has(option.id)
        && (policy || source === "LOCAL_ADDED" || centralScopes.some(scope => scope.definitionId === option.id))).map(option => option.id));
    const nodes = hierarchy.map(node => ({ ...node, selectable: node.selectable && eligible.has(node.id) }));
    const stage = (ids: Set<string>) => {
        if (!editable || busy || pickerLoading || pickerError || [...ids].some(id => !eligible.has(id))) return;
        const staged: OrganizationLocalDraft[] = [];
        for (const id of ids) {
            const existing = allRows.find(row => row.draft.identityId === id);
            if (existing?.original && existing.original.status !== "DELETED") {
                // Reselecting a pending delete restores its complete metadata draft.
                const restored = normalize({ ...existing.draft, status: existing.original.status }, existing.original); if (restored) staged.push(restored);
                continue;
            }
            const option = options.find(item => item.id === id)!;
            const central = centralScopes.find(scope => scope.definitionId === id);
            staged.push(existing ? { ...existing.draft, operation: "CREATE_OR_RESTORE", status: "ACTIVE" }
                : { key: `${stateKey}:${id}`, section, ownerKey: owner.key, identityId: id, code: option.code!, name: option.displayLabel!,
                    operation: "CREATE_OR_RESTORE", status: "ACTIVE", contextRef: owner.contextRef, controlScopeRef: owner.controlScopeRef, requirementScopeRef: owner.requirementScopeRef,
                    sourceType: policy ? undefined : source, centralReferenceId: source === "INHERITED_FROM_CENTRAL" ? central?.id ?? null : null,
                    metadata: { validFrom: !policy && source === "INHERITED_FROM_CENTRAL" ? central?.validFrom ?? null : null, validTo: !policy && source === "INHERITED_FROM_CENTRAL" ? central?.validTo ?? null : null,
                        ...(section === "control-scopes" ? { actualOwnerId: null, frequencyCode: null, executionMethodCode: null, testMethodCode: null, localContextNote: null } : {}),
                        ...(policy ? { scopeAction: "INCLUDE" as const } : {}), ...(section === "organization-policies" ? { propagationMode: "DIRECT_ONLY" as const } : {}) } });
        }
        onChange(previous => [...previous.filter(item => item.section !== section || item.ownerKey !== owner.key || !ids.has(item.identityId)), ...staged]); setPickerOpen(false);
    };
    const selectMetadata = (row: Row, field: "scopeAction" | "propagationMode" | "actualOwnerId" | "frequencyCode" | "executionMethodCode" | "testMethodCode", choices: { id: string; label: string }[]) => editable && owner.available !== false && row.draft.status !== "DELETED" ? <Select value={row.draft.metadata[field] ?? ""} disabled={busy || metadataLoading || metadataError} accessibleName={t(`local.fields.${field === "actualOwnerId" ? "actualOwner" : field}`)} onChange={event => update(row, { [field]: event.target.value || null })}>
        {field !== "scopeAction" && field !== "propagationMode" ? <Option value="">{t("catalogRelation.all")}</Option> : null}{choices.map(choice => <Option key={choice.id} value={choice.id}>{choice.label}</Option>)}
    </Select> : <Text>{choices.find(choice => choice.id === row.draft.metadata[field])?.label ?? (field === "actualOwnerId" && row.original ? string(row.original, "actualOwnerLabel") : null) ?? (row.draft.metadata[field] ? t("catalogRelation.unavailable") : "—")}</Text>;
    const columns: CatalogRelationColumn<Row>[] = [
        { key: "code", header: t("catalogRelation.code"), cell: row => row.draft.code },
        { key: "name", header: t("catalogRelation.name"), cell: row => {
            const id = encodeURIComponent(row.draft.identityId);
            const href = section === "control-scopes" ? "/controls/" + id : section === "risk-scopes" ? "/risks?riskTemplateId=" + id
                : section === "control-objective-scopes" ? "/control-objectives/" + id : section === "requirement-scopes" ? "/regulations?requirementId=" + id : "/policies?policyId=" + id;
            return <Link href={href} onClick={event => { event.preventDefault(); navigate(href); }}>{row.draft.name}</Link>;
        } },
        { key: "status", header: t("common.status"), cell: row => <CatalogRelationStatus status={row.draft.status} draft={!row.pending ? null : row.draft.operation === "CREATE_OR_RESTORE" ? "new" : row.draft.operation === "DELETE" ? "delete" : row.draft.operation === "UPDATE" ? "edit" : row.draft.status === "ACTIVE" ? "active" : "inactive"} /> },
        ...(["validFrom", "validTo"] as const).map(field => ({ key: field, header: t(`catalogRelation.${field}`), cell: (row: Row) => <CatalogRelationDate value={row.draft.metadata[field]} label={t(`catalogRelation.${field}`)} editable={editable && row.draft.status !== "DELETED"} disabled={busy}
            onChange={next => update(row, { [field]: next })} onDraftStateChange={state => setDateDrafts(previous => { const key = `${row.draft.key}:${field}`; const old = previous[key]; return old?.draftValue === state.draftValue && old.valid === state.valid && old.dirty === state.dirty ? previous : { ...previous, [key]: state }; })} /> })),
    ];
    if (!policy) columns.push({ key: "source", header: t("catalogRelation.source"), cell: row => <Text>{t(row.draft.sourceType === "INHERITED_FROM_CENTRAL" ? "local.source.inherited" : "local.source.added")}</Text> });
    if (policy) columns.push({ key: "scopeAction", header: t("local.fields.scopeAction"), cell: row => selectMetadata(row, "scopeAction", ["INCLUDE", "EXCLUDE"].map(id => ({ id, label: t(id === "INCLUDE" ? "local.action.include" : "local.action.exclude") }))) });
    if (section === "organization-policies") columns.push({ key: "propagationMode", header: t("local.fields.propagationMode"), cell: row => selectMetadata(row, "propagationMode", [{ id: "DIRECT_ONLY", label: t("local.propagation.direct") }, { id: "INCLUDE_DESCENDANTS", label: t("local.propagation.descendants") }]) });
    if (section === "control-scopes") {
        columns.push({ key: "actualOwnerId", header: t("local.fields.actualOwner"), cell: row => selectMetadata(row, "actualOwnerId", owners.filter(option => option.displayLabel).map(option => ({ id: option.id, label: option.displayLabel! }))) });
        for (const field of ["frequencyCode", "executionMethodCode", "testMethodCode"] as const) {
            const codes = settings?.[field === "frequencyCode" ? "frequencyCodes" : field === "executionMethodCode" ? "executionMethodCodes" : "testMethodCodes"] ?? [];
            columns.push({ key: field, header: t(`local.fields.${field}`), cell: row => selectMetadata(row, field, codes.map(id => ({ id, label: t(`control.${field === "frequencyCode" ? "operationFrequency" : field === "executionMethodCode" ? "automationType" : "testingTechnique"}.${id}`) }))) });
        }
        columns.push({ key: "note", header: t("catalogRelation.note"), cell: row => editable && row.draft.status !== "DELETED" ? <TextArea value={row.draft.metadata.localContextNote ?? ""} disabled={busy} maxlength={1000} onInput={event => update(row, { localContextNote: event.target.value || null })} /> : row.draft.metadata.localContextNote ?? "—" });
    }
    columns.push({ key: "documents", header: t("local.documents"), cell: row => row.original && row.original.status !== "DELETED" ? <Link onClick={() => { if (!documentDirty) setDocumentId(row.original!.id); }}>{t("local.documents")}</Link> : "—" });
    const documentRow = canonical.find(row => row.id === documentId && row.status !== "DELETED");
    return <FlexBox direction="Column" className="organizationLocalDraftTable">
        <CatalogRelationToolbar title={t(spec.labelKey)} search={search} onSearch={setSearch} filter={filter} onFilter={next => { setFilter(next); onFilterChange?.(next); }} editable={editable} busy={busy || loading}
            canSelect={!error && !metadataLoading && !metadataError && owner.available !== false && owner.eligible !== false} canActivate={affected("ACTIVE").length > 0} canInactivate={affected("INACTIVE").length > 0} canDelete={affected("DELETED").length > 0}
            onSelect={() => void openPicker()} onActivate={() => batch("ACTIVE")} onInactivate={() => batch("INACTIVE")} onDelete={() => batch("DELETED")} />
        {!policy && editable && owner.available !== false ? <Select value={source} disabled={busy || pickerOpen} accessibleName={t("catalogRelation.source")} onChange={event => setSource(event.target.value as typeof source)}><Option value="LOCAL_ADDED">{t("local.source.added")}</Option><Option value="INHERITED_FROM_CENTRAL">{t("local.source.inherited")}</Option></Select> : null}
        {metadataError ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.loadError")}<CatalogActionButton disabled={busy} onClick={() => setMetadataReload(value => value + 1)}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton disabled={busy} onClick={() => setReload(current => current + 1)}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
        {invalid ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
        <CatalogRelationTable rows={displayed} rowKey={row => row.draft.key} columns={columns} selectable={editable} selectedKeys={selected} onSelectionChange={setSelected} accessibleName={t(spec.labelKey)} loading={loading} busy={busy} />
        {documentRow ? <DocumentManager targetType={LOCAL_DOCUMENT_TARGETS[section]} targetId={documentRow.id} title={t("local.documents")} readOnly={!editable || owner.available === false} showActions={editable && owner.available !== false} persistenceMode="STANDALONE" onDirtyChange={setDocumentDirty} /> : null}
        {pickerOpen ? <HierarchyMultiSelectionDialog open title={t(spec.labelKey)} searchAccessibleName={t("catalogRelation.search")} nodes={nodes} selectedIds={EMPTY_SELECTION} busy={busy} loading={pickerLoading} error={pickerError}
            confirmText={t("common.select")} cancelText={t("common.cancel")} onConfirm={stage} onClose={() => setPickerOpen(false)} /> : null}
    </FlexBox>;
}
