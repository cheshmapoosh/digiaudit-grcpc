import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FlexBox, Label, MessageStrip, Option, Select } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { useAuthState } from "@/features/auth";
import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import type { OrganizationTabKey } from "@/features/organization/pages/OrganizationObjectPage";
import type { LocalContextDraft, LocalContextRow, LocalControlRow, LocalRequirementRow, LocalRows } from "../domain/local.model";
import type { OrganizationLocalDraft, OrganizationLocalResult, OrganizationLocalSection } from "../domain/organizationLocal.model";
import { LOCAL_SECTIONS, LOCAL_SECTION_BY_KEY } from "../domain/local.sections";
import { localApi } from "../infra/local.api.repo";
import OrganizationLocalDraftTable, { type LocalDraftOwner } from "./OrganizationLocalDraftTable";
import OrganizationRisksTab from "./OrganizationRisksTab";
import OrganizationScopesTab from "./OrganizationScopesTab";
import type { OrganizationRiskContext, OrganizationRisksTableState } from "../domain/organizationRisks.model";
import type { OrganizationScopeSection, OrganizationScopesTableState } from "../domain/organizationScopes.model";

interface Props {
    organizationId: string | null; tab: OrganizationTabKey; editable: boolean; busy: boolean; resetKey: string | number;
    subprocessChanges: LocalContextDraft[]; drafts: OrganizationLocalDraft[]; onChange: Dispatch<SetStateAction<OrganizationLocalDraft[]>>;
    canonical?: OrganizationLocalResult; onPendingChange: (pending: boolean) => void; onReadyChange: (ready: boolean) => void;
    onDirtyChange: (dirty: boolean) => void; navigateWithinOrganization?: (params: URLSearchParams) => void;
}
const SECTIONS = LOCAL_SECTIONS.filter(spec => spec.key !== "contexts" && !spec.key.endsWith("-coverages"));
const RESULT_FIELDS = { "control-scopes": "controls", "risk-scopes": "risks", "control-objective-scopes": "controlObjectives", "requirement-scopes": "requirements", "organization-policies": "organizationPolicies", "context-policies": "contextPolicies", "control-policies": "controlPolicies", "requirement-policies": "requirementPolicies" } as const;
const ORGANIZATION_SCOPE_SECTIONS: OrganizationScopeSection[] = ["control-scopes", "control-objective-scopes", "requirement-scopes"];
const isOrganizationScope = (key?: string): key is OrganizationScopeSection => ORGANIZATION_SCOPE_SECTIONS.some(section => section === key);
type Context = LocalDraftOwner & OrganizationRiskContext;
function latestRows<Row extends { id: string; version: number }>(rows: Row[]): Row[] {
    const latest = new Map<string, Row>();
    for (const row of rows) if (!latest.has(row.id) || latest.get(row.id)!.version <= row.version) latest.set(row.id, row);
    return [...latest.values()];
}
type TableState = { pending: boolean; ready: boolean; dirty: boolean };

/** Keeps every visited context/table mounted; tab/context changes never discard owner drafts. */
export default function OrganizationLocalDraftWorkspace({ organizationId, tab, editable, busy, resetKey, subprocessChanges, drafts, onChange, canonical, onPendingChange, onReadyChange, onDirtyChange, navigateWithinOrganization }: Props) {
    const { t } = useTranslation(); const me = useAuthState(state => state.me); const location = useLocation();
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const referenceView = canAccessMasterData(me, "REFERENCE"); const processView = canAccessMasterData(me, "PROCESS");
    const [contexts, setContexts] = useState<LocalContextRow[]>([]);
    const [targetRows, setTargetRows] = useState<{ controls: LocalControlRow[]; requirements: LocalRequirementRow[] }>({ controls: [], requirements: [] });
    const [reload, setReload] = useState(0);
    const [visited, setVisited] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
    const [contextKey, setContextKey] = useState<string | null>(null); const [targetKey, setTargetKey] = useState<string | null>(null);
    const [sectionKey, setSectionKey] = useState<OrganizationLocalSection | null>(null);
    const [states, setStates] = useState<Record<string, TableState>>({});
    const report = useCallback((key: string, state: TableState) => setStates(previous => {
        const old = previous[key]; return old && old.pending === state.pending && old.ready === state.ready && old.dirty === state.dirty ? previous : { ...previous, [key]: state };
    }), []);
    const reportRisks = useCallback((state: OrganizationRisksTableState) => report("risk-scopes:organization", state), [report]);
    const reportScopes = useCallback((section: OrganizationScopeSection, state: OrganizationScopesTableState) => report(`${section}:organization`, state), [report]);
    const canRead = (areas: Parameters<typeof canAccessMasterData>[1][]) => referenceView && areas.every(area => canAccessMasterData(me, area));
    const requestKey = `${organizationId}:${resetKey}:${reload}:${referenceView}:${processView}:${canAccessMasterData(me, "CONTROL")}:${canAccessMasterData(me, "GOVERNANCE")}`;
    useEffect(() => {
        let current = true;
        void Promise.resolve().then(async () => {
            if (current) { setLoading(true); setLoaded(false); }
            const next = organizationId && referenceView && processView ? await localApi.allContexts(organizationId) : [];
            const currentContexts = next.filter(row => row.status !== "DELETED");
            const targets = await Promise.all(currentContexts.map(async context => ({
                controls: organizationId && canAccessMasterData(me, "CONTROL") && canAccessMasterData(me, "GOVERNANCE") ? await localApi.allRows("control-scopes", { organizationId, contextId: context.id }) : [],
                requirements: organizationId && canAccessMasterData(me, "GOVERNANCE") ? await localApi.allRows("requirement-scopes", { organizationId, contextId: context.id }) : [],
            })));
            if (current) { setContexts(next); setTargetRows({ controls: targets.flatMap(result => result.controls), requirements: targets.flatMap(result => result.requirements) }); setError(null); setLoading(false); setLoaded(true); }
        }).catch(() => { if (current) { setError(t("catalogRelation.loadError")); setLoading(false); } });
        return () => { current = false; };
        // Serialized profile/read scope, not draft edits, owns the baseline request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey, t]);
    const canonicalContexts = latestRows([...contexts, ...(canonical?.contexts ?? [])]);
    const contextItems: Context[] = canonicalContexts.filter(row => row.organizationId === organizationId && (row.status !== "DELETED"
        || subprocessChanges.some(change => change.subprocessId === row.subprocessId && change.operation === "CREATE_OR_RESTORE"))).map(row => {
        const change = subprocessChanges.find(item => item.subprocessId === row.subprocessId);
        const status = change?.operation === "DELETE" ? "DELETED" : change?.operation === "INACTIVATE" ? "INACTIVE" : change ? "ACTIVE" : row.status;
        return { key: row.id, id: row.id, contextRef: { contextId: row.id }, code: row.subprocessCode, name: row.subprocessLabel, label: row.subprocessCode + " — " + row.subprocessLabel,
            subprocessId: row.subprocessId, status, available: status !== "DELETED", eligible: status === "ACTIVE" };
    });
    for (const change of subprocessChanges) if (!contextItems.some(row => row.subprocessId === change.subprocessId)) contextItems.push({
        key: change.contextId ?? "subprocess:" + change.subprocessId, id: change.contextId ?? null,
        contextRef: change.contextId ? { contextId: change.contextId } : { subprocessId: change.subprocessId },
        label: change.code + " — " + change.name, code: change.code, name: change.name, subprocessId: change.subprocessId,
        status: change.operation === "DELETE" ? "DELETED" : change.operation === "INACTIVATE" ? "INACTIVE" : "ACTIVE",
        available: change.operation !== "DELETE", eligible: change.operation !== "DELETE" && change.operation !== "INACTIVATE" });
    const draftContextRef = (draft: OrganizationLocalDraft) => draft.contextRef ?? draft.controlScopeRef?.contextRef ?? draft.requirementScopeRef?.contextRef;
    for (const draft of drafts) {
        const ref = draftContextRef(draft);
        if (ref?.subprocessId && !contextItems.some(row => row.subprocessId === ref.subprocessId)) contextItems.push({
            key: "subprocess:" + ref.subprocessId, id: null, contextRef: ref, subprocessId: ref.subprocessId,
            label: t("catalogRelation.pendingContext"), code: "", name: t("catalogRelation.pendingContext"), status: "DELETED", available: false, eligible: false });
    }
    const selectableContexts = contextItems;
    const selectedContext = contextItems.find(row => row.key === contextKey || contextKey === "subprocess:" + row.subprocessId)
        ?? contextItems.find(row => row.id === params.get("contextId")) ?? null;
    const visibleSpecs = SECTIONS.filter(spec => spec.tab === tab && canRead(spec.areas));
    const activeSpec = visibleSpecs.find(spec => spec.key === sectionKey) ?? visibleSpecs.find(spec => spec.key === params.get("localSection")) ?? visibleSpecs[0];
    const ownsRef = (context: Context, ref: ReturnType<typeof draftContextRef>) => Boolean(ref && (ref.contextId && ref.contextId === context.id || ref.subprocessId && ref.subprocessId === context.subprocessId));
    const targets = (kind: "control" | "requirement", context: Context): LocalDraftOwner[] => {
        const section = kind === "control" ? "control-scopes" : "requirement-scopes";
        const policySection = kind === "control" ? "control-policies" : "requirement-policies";
        const rows = kind === "control" ? [...targetRows.controls, ...(canonical?.controls ?? [])] : [...targetRows.requirements, ...(canonical?.requirements ?? [])];
        const current = latestRows(rows.filter(row => row.organizationId === organizationId && row.organizationSubprocessScopeId === context.id));
        const changes = drafts.filter(draft => draft.section === section && draft.ownerKey === context.key);
        const result: LocalDraftOwner[] = current.filter(row => row.status !== "DELETED" || changes.some(draft => draft.rowId === row.id)).map(row => {
            const control = row as LocalControlRow; const requirement = row as LocalRequirementRow;
            const change = changes.find(draft => draft.rowId === row.id);
            const status = change?.status ?? row.status;
            return { key: row.id, id: row.id, definitionId: kind === "control" ? control.controlId : requirement.requirementId,
                contextRef: context.contextRef, subprocessId: context.subprocessId,
                label: kind === "control" ? control.controlCode + " — " + control.controlLabel : requirement.requirementCode + " — " + requirement.requirementLabel,
                available: context.available !== false && status !== "DELETED", eligible: context.eligible !== false && status === "ACTIVE",
                ...(kind === "control" ? { controlScopeRef: { localControlScopeId: row.id } } : { requirementScopeRef: { localRequirementScopeId: row.id } }) };
        });
        for (const draft of changes) if (!result.some(row => row.id === draft.rowId && draft.rowId)) result.push({
            key: draft.key, id: null, definitionId: draft.identityId, label: draft.code + " — " + draft.name,
            contextRef: context.contextRef, subprocessId: context.subprocessId,
            available: context.available !== false && draft.status !== "DELETED", eligible: context.eligible !== false && draft.status === "ACTIVE",
            ...(kind === "control" ? { controlScopeRef: { contextRef: context.contextRef, controlId: draft.identityId } } : { requirementScopeRef: { contextRef: context.contextRef, requirementId: draft.identityId } }) });
        // An unsaved Scope may have been removed after Policy drafts were staged against it.
        // Retain those owners for explicit draft deletion; never create a hidden dangling write.
        for (const draft of drafts.filter(item => item.section === policySection && ownsRef(context, draftContextRef(item)))) {
            if (result.some(owner => owner.key === draft.ownerKey)) continue;
            const refId = kind === "control" ? draft.controlScopeRef?.localControlScopeId : draft.requirementScopeRef?.localRequirementScopeId;
            result.push({ key: draft.ownerKey, id: refId ?? null, label: t("catalogRelation.unavailable"),
                contextRef: context.contextRef, subprocessId: context.subprocessId, controlScopeRef: draft.controlScopeRef,
                requirementScopeRef: draft.requirementScopeRef, available: false, eligible: false });
        }
        return result;
    };
    const selectedTargets = selectedContext && (activeSpec?.key === "control-policies" || activeSpec?.key === "requirement-policies") ? targets(activeSpec.key === "control-policies" ? "control" : "requirement", selectedContext) : [];
    const selectedTarget = selectedTargets.find(row => row.key === targetKey) ?? selectedTargets.find(row => row.id === params.get("policyTargetId"));
    const danglingContext = drafts.some(draft => draft.operation !== "DELETE" && draftContextRef(draft)
        && !contextItems.some(context => ownsRef(context, draftContextRef(draft)) && context.available !== false));
    const danglingTarget = drafts.some(draft => draft.operation !== "DELETE" && (draft.section === "control-policies" || draft.section === "requirement-policies")
        && !contextItems.some(context => targets(draft.section === "control-policies" ? "control" : "requirement", context)
            .some(target => target.key === draft.ownerKey && target.available !== false)));
    const pending = Object.values(states).some(state => state.pending);
    const ready = !pending && !danglingContext && !danglingTarget && Object.values(states).every(state => state.ready) && (!drafts.length || (!loading && !error));
    useEffect(() => { onPendingChange(pending); }, [onPendingChange, pending]);
    useEffect(() => { onReadyChange(ready); }, [onReadyChange, ready]);
    const auxiliaryDirty = Object.values(states).some(state => state.dirty);
    useEffect(() => { onDirtyChange(auxiliaryDirty); }, [auxiliaryDirty, onDirtyChange]);
    const activeOwnerKey = activeSpec?.key === "risk-scopes" || isOrganizationScope(activeSpec?.key) || activeSpec?.key === "organization-policies" ? "organization"
        : activeSpec?.key === "control-policies" || activeSpec?.key === "requirement-policies" ? selectedTarget?.key : selectedContext?.key;
    const visitedKey = activeSpec && activeOwnerKey ? activeSpec.key + ":" + activeOwnerKey : null;
    useEffect(() => {
        if (!visitedKey) return;
        queueMicrotask(() => setVisited(previous => previous.has(visitedKey) ? previous : new Set([...previous, visitedKey])));
    }, [visitedKey]);
    const clearLocalRow = useCallback(() => {
        if (pending || auxiliaryDirty || !navigateWithinOrganization || !params.has("localRowId")) return;
        const next = new URLSearchParams(location.search); next.delete("localRowId"); navigateWithinOrganization(next);
    }, [location.search, navigateWithinOrganization, params, pending, auxiliaryDirty]);
    useEffect(() => {
        if (!navigateWithinOrganization || !loaded || loading || error || pending || auxiliaryDirty) return;
        const next = new URLSearchParams(location.search);
        if (next.get("localStatus") === "DELETED") { next.delete("localStatus"); next.delete("localRowId"); }
        const contextId = next.get("contextId");
        const validContext = contextId ? contextItems.find(row => row.id === contextId) : null;
        if (contextId && !validContext) { next.delete("contextId"); next.delete("policyTargetId"); next.delete("localRowId"); }
        const requestedSection = next.get("localSection");
        if (requestedSection && !visibleSpecs.some(spec => spec.key === requestedSection)) {
            if (activeSpec) next.set("localSection", activeSpec.key); else next.delete("localSection");
            next.delete("localRowId"); next.delete("policyTargetId");
        }
        const targetId = next.get("policyTargetId");
        if (targetId && !(selectedContext && (activeSpec?.key === "control-policies" || activeSpec?.key === "requirement-policies")
            && selectedTargets.some(row => row.id === targetId && row.available !== false))) { next.delete("policyTargetId"); next.delete("localRowId"); }
        if (next.toString() !== params.toString()) navigateWithinOrganization(next);
        // Canonical scope state governs URL validation; no query identity is ever used to fetch an owner.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, navigateWithinOrganization, loaded, loading, error, organizationId, resetKey, tab, contexts, targetRows, subprocessChanges, drafts, canonical, pending, auxiliaryDirty]);
    const changeContext = (key: string) => {
        setContextKey(key || null); setTargetKey(null);
        if (!navigateWithinOrganization) return;
        const next = new URLSearchParams(location.search); const context = contextItems.find(row => row.key === key);
        if (context?.id) next.set("contextId", context.id); else next.delete("contextId");
        next.delete("policyTargetId"); next.delete("localRowId"); navigateWithinOrganization(next);
    };
    const changeTarget = (key: string) => {
        setTargetKey(key || null);
        if (!navigateWithinOrganization) return;
        const next = new URLSearchParams(location.search); const target = selectedTargets.find(row => row.key === key);
        if (target?.id) next.set("policyTargetId", target.id); else next.delete("policyTargetId");
        next.delete("localRowId"); navigateWithinOrganization(next);
    };
    if (!referenceView) return null;
    const organizationOwner: LocalDraftOwner = { key: "organization", id: organizationId, label: "" };
    const showWorkspace = visibleSpecs.length > 0;
    return <FlexBox direction="Column" className="organizationLocalDraftWorkspace">
        {showWorkspace && visibleSpecs.length > 1 ? <Select value={activeSpec?.key} disabled={busy} accessibleName={t("catalogRelation.metadata")} onChange={event => {
            const section = event.target.value as OrganizationLocalSection; setSectionKey(section); setTargetKey(null);
            if (navigateWithinOrganization) { const next = new URLSearchParams(location.search); next.set("localSection", section); next.delete("localRowId"); next.delete("policyTargetId"); navigateWithinOrganization(next); }
        }}>{visibleSpecs.map(spec => <Option key={spec.key} value={spec.key}>{t(spec.labelKey)}</Option>)}</Select> : null}
        {showWorkspace && activeSpec?.key !== "organization-policies" && activeSpec?.key !== "risk-scopes" && !isOrganizationScope(activeSpec?.key) ? <><Label>{t("catalogRelation.context")}</Label><Select value={selectedContext?.key ?? ""} disabled={busy || loading} accessibleName={t("catalogRelation.context")} onChange={event => changeContext(event.target.value)}><Option value="">{t("catalogRelation.all")}</Option>{selectableContexts.map(context => <Option key={context.key} value={context.key}>{context.label}</Option>)}</Select>{!selectedContext ? <MessageStrip design="Information" hideCloseButton>{t("catalogRelation.chooseContext")}</MessageStrip> : null}</> : null}
        {selectedContext && (activeSpec?.key === "control-policies" || activeSpec?.key === "requirement-policies") ? <><Select value={selectedTarget?.key ?? ""} disabled={busy} accessibleName={t("catalogRelation.metadata")} onChange={event => changeTarget(event.target.value)}><Option value="">{t("catalogRelation.all")}</Option>{selectedTargets.map(target => <Option key={target.key} value={target.key}>{target.label}</Option>)}</Select>{!selectedTarget ? <MessageStrip design="Information" hideCloseButton>{t("catalogRelation.chooseTarget")}</MessageStrip> : null}</> : null}
        {showWorkspace && error && activeSpec?.key !== "risk-scopes" && !isOrganizationScope(activeSpec?.key) ? <MessageStrip design="Negative" hideCloseButton>{error}<CatalogActionButton disabled={busy} onClick={() => setReload(value => value + 1)}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
        {showWorkspace && (danglingContext || danglingTarget) ? <MessageStrip design="Negative" hideCloseButton>{t("catalogRelation.invalid")}</MessageStrip> : null}
        {canRead(["PROCESS", "RISK"]) && (activeSpec?.key === "risk-scopes" || visited.has("risk-scopes:organization") || drafts.some(draft => draft.section === "risk-scopes")) ? <div style={{ display: activeSpec?.key === "risk-scopes" ? "block" : "none" }}>
            <OrganizationRisksTab organizationId={organizationId} contexts={contextItems} contextsLoading={loading || !loaded && !error} contextsError={error}
                onRetryContexts={() => setReload(value => value + 1)} canonicalRows={canonical?.risks} resetKey={resetKey} drafts={drafts} onChange={onChange}
                editable={editable && canAccessMasterData(me, "REFERENCE", true)} busy={busy} onStateChange={reportRisks}
                deepLinkRowId={activeSpec?.key === "risk-scopes" ? params.get("localRowId") : null} onInvalidDeepLink={clearLocalRow}
                initialStatus={params.get("localStatus") === "ACTIVE" || params.get("localStatus") === "INACTIVE" ? params.get("localStatus") as "ACTIVE" | "INACTIVE" : "ALL"}
                onFilterChange={next => { if (!navigateWithinOrganization) return; const query = new URLSearchParams(location.search); if (next === "ALL") query.delete("localStatus"); else query.set("localStatus", next); navigateWithinOrganization(query); }} />
        </div> : null}
        {ORGANIZATION_SCOPE_SECTIONS.filter(section => canRead(LOCAL_SECTION_BY_KEY[section].areas)
            && (activeSpec?.key === section || visited.has(`${section}:organization`) || drafts.some(draft => draft.section === section))).map(section => {
            const visible = activeSpec?.key === section;
            return <div key={`${section}:organization`} style={{ display: visible ? "block" : "none" }}>
                <OrganizationScopesTab section={section} organizationId={organizationId} contexts={contextItems}
                    contextsLoading={loading || !loaded && !error} contextsError={error} onRetryContexts={() => setReload(value => value + 1)}
                    canonicalRows={canonical?.[RESULT_FIELDS[section]]} resetKey={resetKey} drafts={drafts} onChange={onChange}
                    editable={editable && canAccessMasterData(me, "REFERENCE", true)} busy={busy} onStateChange={reportScopes}
                    deepLinkRowId={visible ? params.get("localRowId") : null} onInvalidDeepLink={clearLocalRow}
                    initialStatus={params.get("localStatus") === "ACTIVE" || params.get("localStatus") === "INACTIVE" ? params.get("localStatus") as "ACTIVE" | "INACTIVE" : "ALL"}
                    onFilterChange={next => { if (!navigateWithinOrganization) return; const query = new URLSearchParams(location.search); if (next === "ALL") query.delete("localStatus"); else query.set("localStatus", next); navigateWithinOrganization(query); }} />
            </div>;
        })}
        {SECTIONS.filter(spec => spec.key !== "risk-scopes" && !isOrganizationScope(spec.key) && canRead(spec.areas)).flatMap(spec => {
            const section = spec.key as OrganizationLocalSection;
            const owners: LocalDraftOwner[] = section === "organization-policies" ? [organizationOwner] : section === "control-policies" || section === "requirement-policies" ? contextItems.flatMap(context => targets(section === "control-policies" ? "control" : "requirement", context)) : contextItems;
            return owners.map(owner => {
                const visible = activeSpec?.key === section && (section === "organization-policies" || (section === "control-policies" || section === "requirement-policies" ? selectedTarget?.key === owner.key : selectedContext?.key === owner.key));
                if (!visible && !visited.has(section + ":" + owner.key) && !drafts.some(draft => draft.section === section && draft.ownerKey === owner.key)) return null;
                const rows = canonical?.[RESULT_FIELDS[section]] as LocalRows[OrganizationLocalSection][] | undefined;
                const scopedCanonical = rows?.filter(row => section === "organization-policies" || (section === "control-policies" ? "localControlScopeId" in row && row.localControlScopeId === owner.id : section === "requirement-policies" ? "localRequirementScopeId" in row && row.localRequirementScopeId === owner.id : "organizationSubprocessScopeId" in row && row.organizationSubprocessScopeId === owner.id));
                return <div key={`${section}:${owner.key}`} style={{ display: visible ? "block" : "none" }}><OrganizationLocalDraftTable organizationId={organizationId} section={section} owner={owner} editable={editable && canAccessMasterData(me, "REFERENCE", true)} busy={busy} resetKey={resetKey} drafts={drafts} onChange={onChange} canonicalRows={scopedCanonical} onStateChange={report} initialStatus={params.get("localStatus") === "ACTIVE" ? "ACTIVE" : params.get("localStatus") === "INACTIVE" ? "INACTIVE" : "ALL"}
                    onFilterChange={visible && navigateWithinOrganization ? filter => { const next = new URLSearchParams(location.search); if (filter === "ALL") next.delete("localStatus"); else next.set("localStatus", filter); navigateWithinOrganization(next); } : undefined}
                    deepLinkRowId={visible ? params.get("localRowId") : null} onInvalidDeepLink={clearLocalRow} /></div>;
            });
        })}
    </FlexBox>;
}
