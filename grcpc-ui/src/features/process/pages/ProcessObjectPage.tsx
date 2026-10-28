import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Text, ObjectStatus, Input, Label, MessageStrip, Option, Select, Tab, TextArea } from "@ui5/webcomponents-react";

import { DocumentManager, EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE, toDocumentAggregateRequest, type DocumentAggregateDraftError, type DocumentLinkTargetType, type ParentSaveDocumentDraftState } from "@/features/document";
import { EMPTY_CONTROL_SCOPE_DRAFT_STATE, SubprocessControlScopesTab, useControlScopePermissions, type ControlScopeDraftState } from "@/features/control-scope";
import { EMPTY_RISK_SCOPE_DRAFT_STATE, SubprocessRiskScopesTab, useRiskScopePermissions, type RiskScopeDraftState } from "@/features/risk-scope";
import { EMPTY_CONTROL_OBJECTIVE_SCOPE_DRAFT_STATE, SubprocessControlObjectiveScopesTab, useControlObjectiveScopePermissions, type ControlObjectiveScopeDraftState } from "@/features/control-objective-scope";
import { EMPTY_REQUIREMENT_SCOPE_DRAFT_STATE, SubprocessRequirementScopesTab, useRequirementScopePermissions, type RequirementScopeDraftState } from "@/features/requirement-scope";
import { SubprocessAccountGroupsTab, useControlAccountGroupPermissions } from "@/features/control-account-group";
import { useControlObjectiveAccountGroupPermissions } from "@/features/control-objective-account-group";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate, toEnglishDigits } from "@/shared/utils/date.utils";
import ProcessParentValueHelpDialog from "../components/ProcessParentValueHelpDialog";
import type { ProcessNode, ProcessNodeCreate, ProcessNodeType, ProcessNodeUpdate } from "../domain/process.model";
import { buildTree, collectDescendantIds } from "../utils/process.tree";

export type ProcessObjectMode = "create" | "edit" | "view";
export type ProcessTabKey = "general" | "controls" | "requirements" | "controlObjectives" | "accountGroups" | "riskTemplates" | "documents";

interface ProcessFormState {
    code: string;
    title: string;
    status: "ACTIVE" | "INACTIVE";
    nodeType: ProcessNodeType;
    parentId: string | null;
    sortOrder: string;
    description: string;
    validFrom: string;
    validTo: string;
}

export interface ProcessObjectPageProps {
    mode: ProcessObjectMode;
    allItems: ProcessNode[];
    value: ProcessNode | null;
    parent?: ProcessNode | null;
    requestedNodeType?: ProcessNodeType;
    activeTab?: ProcessTabKey;
    busy?: boolean;
    error?: string | null;
    documentAggregateError?: DocumentAggregateDraftError | null;
    onErrorClose?: () => void;
    onSubmit: (payload: ProcessNodeCreate | ProcessNodeUpdate) => Promise<boolean>;
    onCancel: () => void;
    onEdit?: () => void;
    onActiveTabChange?: (tab: ProcessTabKey) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onDocumentDirtyChange?: (dirty: boolean) => void;
}

const ROOT_STYLE: CSSProperties = { display: "grid", gap: "0.75rem", minWidth: 0, maxWidth: "100%" };

const FIELD_STYLE: CSSProperties = { display: "grid", gap: "0.35rem" };
const BODY_STYLE: CSSProperties = { minHeight: 0, padding: "0.75rem" };

function toFormState(value: ProcessNode | null, parent: ProcessNode | null | undefined, requestedNodeType: ProcessNodeType | undefined): ProcessFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        status: value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        nodeType: value?.nodeType ?? requestedNodeType ?? "PROCESS",
        parentId: value?.parentId ?? parent?.id ?? null,
        sortOrder: String(value?.sortOrder ?? 0),
        description: value?.description ?? "",
        validFrom: value?.validFrom ?? "",
        validTo: value?.validTo ?? "",
    };
}

function parseSortOrder(value: string): number | null {
    const parsed = Number(toEnglishDigits(value).trim() || "0");
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalized(form: ProcessFormState, mode: ProcessObjectMode) {
    const common = { title: form.title.trim(), sortOrder: parseSortOrder(form.sortOrder) ?? 0, description: form.description.trim(), validFrom: form.validFrom.trim(), validTo: form.validTo.trim() };
    return mode === "create" ? { ...common, nodeType: form.nodeType, code: form.code.trim().toUpperCase(), parentId: form.parentId } : { ...common, status: form.status, parentId: form.parentId };
}

function readValue(event: unknown): string { return (event as { target?: { value?: string } }).target?.value ?? ""; }
function optional(value: string): string | null { return value.trim() || null; }
function nodeTypeLabel(type: ProcessNodeType, t: ReturnType<typeof useTranslation>["t"]) { return type === "PROCESS" ? t("process.nodeType.process", { defaultValue: "Process" }) : t("process.nodeType.subProcess", { defaultValue: "Subprocess" }); }
function documentTarget(type: ProcessNodeType): DocumentLinkTargetType { return type === "PROCESS" ? "CENTRAL_PROCESS" : "CENTRAL_SUBPROCESS"; }

function FormField({ label, required, fullWidth, children }: { label: string; required?: boolean; fullWidth?: boolean; children: ReactNode }) {
    return <div style={{ ...FIELD_STYLE, ...(fullWidth ? { gridColumn: "1 / -1" } : undefined) }}><Label showColon required={required}>{label}</Label>{children}</div>;
}

export default function ProcessObjectPage({ mode, allItems, value, parent, requestedNodeType, activeTab: controlledTab, busy = false, error, documentAggregateError, onErrorClose, onSubmit, onCancel, onEdit, onActiveTabChange, onDirtyChange, onDocumentDirtyChange }: ProcessObjectPageProps) {
    const { t } = useTranslation();
    const { manage } = useMasterDataAccess("PROCESS");
    const controlScopePermissions = useControlScopePermissions();
    const accountGroupClassificationPermissions = useControlAccountGroupPermissions();
    const objectiveAccountGroupClassificationPermissions = useControlObjectiveAccountGroupPermissions();
    const riskScopePermissions = useRiskScopePermissions();
    const controlObjectiveScopePermissions = useControlObjectiveScopePermissions();
    const requirementScopePermissions = useRequirementScopePermissions();
    const initial = toFormState(value, parent, requestedNodeType);
    const [form, setForm] = useState(initial);
    const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(initial, mode)));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [internalTab, setInternalTab] = useState<ProcessTabKey>("general");
    const [parentDialogOpen, setParentDialogOpen] = useState(false);
    const [documentDraft, setDocumentDraft] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
    const [controlScopeDraft, setControlScopeDraft] = useState<ControlScopeDraftState>(EMPTY_CONTROL_SCOPE_DRAFT_STATE);
    const [riskScopeDraft, setRiskScopeDraft] = useState<RiskScopeDraftState>(EMPTY_RISK_SCOPE_DRAFT_STATE);
    const [controlObjectiveScopeDraft, setControlObjectiveScopeDraft] = useState<ControlObjectiveScopeDraftState>(EMPTY_CONTROL_OBJECTIVE_SCOPE_DRAFT_STATE);
    const [requirementScopeDraft, setRequirementScopeDraft] = useState<RequirementScopeDraftState>(EMPTY_REQUIREMENT_SCOPE_DRAFT_STATE);
    const [dateDrafts, setDateDrafts] = useState<Record<"validFrom" | "validTo", PersianDateDraftState>>({
        validFrom: { draftValue: "", valid: true, dirty: false },
        validTo: { draftValue: "", valid: true, dirty: false },
    });
    const scope = mode === "create" ? `CREATE:${requestedNodeType ?? "PROCESS"}:${parent?.id ?? "ROOT"}` : value?.id ?? "EMPTY";
    const scopeRef = useRef(scope);
    const generalInformationDirty = JSON.stringify(normalized(form, mode)) !== baseline;
    const invalidDateDraft = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
    const dirty = generalInformationDirty || invalidDateDraft || documentDraft.dirty || controlScopeDraft.dirty || riskScopeDraft.dirty || controlObjectiveScopeDraft.dirty || requirementScopeDraft.dirty;
    const activeTab = controlledTab ?? internalTab;
    const readOnly = mode === "view";

    useEffect(() => {
        if (scopeRef.current !== scope || !dirty) {
            const next = toFormState(value, parent, requestedNodeType);
            let cancelled = false;
            queueMicrotask(() => {
                if (cancelled) return;
                setForm(next);
                setBaseline(JSON.stringify(normalized(next, mode)));
                scopeRef.current = scope;
                onDirtyChange?.(false);
            });
            return () => { cancelled = true; };
        }
    }, [dirty, mode, onDirtyChange, parent, requestedNodeType, scope, value]);
    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

    const processParents = useMemo(() => {
        const excluded = new Set([...(value?.id ? [value.id] : []), ...(value?.nodeType === "PROCESS" ? collectDescendantIds(buildTree(allItems), value.id) : [])]);
        return allItems.filter((item) => item.nodeType === "PROCESS" && !excluded.has(item.id));
    }, [allItems, value]);
    const selectedParent = form.parentId ? allItems.find((item) => item.id === form.parentId) : null;

    const change = <K extends keyof ProcessFormState>(key: K, next: ProcessFormState[K]) => setForm((current) => ({ ...current, [key]: next }));

    const validate = () => {
        if (mode === "create" && !form.code.trim()) return setValidationError(t("process.validation.codeRequired", { defaultValue: "Code is required" })), false;
        if (!form.title.trim()) return setValidationError(t("process.validation.titleRequired", { defaultValue: "Title is required" })), false;
        if (parseSortOrder(form.sortOrder) === null) return setValidationError(t("process.validation.sortOrderInvalid", { defaultValue: "Sort order must be a non-negative integer" })), false;
        if (form.nodeType === "SUBPROCESS" && !form.parentId) return setValidationError(t("process.validation.processRequired", { defaultValue: "Owning process is required" })), false;
        if (invalidDateDraft) return setValidationError(t("process.validation.invalidDate", { defaultValue: "Invalid date" })), false;
        if (form.parentId && !processParents.some((item) => item.id === form.parentId)) return setValidationError(t("process.errors.invalidHierarchyMove", { defaultValue: "Invalid parent" })), false;
        if (form.validFrom && form.validTo && form.validFrom > form.validTo) return setValidationError(t("process.validation.invalidValidityRange", { defaultValue: "Invalid validity range" })), false;
        if (!documentDraft.ready || documentDraft.invalid || documentDraft.uploading) return setValidationError(t("document.errors.finalize", { defaultValue: "Document drafts are not ready" })), false;
        if (form.nodeType === "SUBPROCESS" && (!controlScopeDraft.ready || controlScopeDraft.invalid)) return setValidationError(t("controlScope.validation.notReady")), false;
        if (form.nodeType === "SUBPROCESS" && (!riskScopeDraft.ready || riskScopeDraft.invalid)) return setValidationError(t("riskScope.validation.notReady")), false;
        if (form.nodeType === "SUBPROCESS" && (!controlObjectiveScopeDraft.ready || controlObjectiveScopeDraft.invalid)) return setValidationError(t("controlObjectiveScope.validation.notReady")), false;
        if (form.nodeType === "SUBPROCESS" && (!requirementScopeDraft.ready || requirementScopeDraft.invalid)) return setValidationError(t("requirementScope.validation.notReady")), false;
        setValidationError(null); return true;
    };

    const submit = async () => {
        if (readOnly || !validate()) return;
        const common = { title: form.title.trim(), sortOrder: parseSortOrder(form.sortOrder) ?? 0, description: optional(form.description), validFrom: optional(form.validFrom), validTo: optional(form.validTo), documents: toDocumentAggregateRequest(documentDraft), controlScopeChanges: form.nodeType === "SUBPROCESS" ? controlScopeDraft.changes : [], riskScopeChanges: form.nodeType === "SUBPROCESS" ? riskScopeDraft.changes : [], controlObjectiveScopeChanges: form.nodeType === "SUBPROCESS" ? controlObjectiveScopeDraft.changes : [], requirementScopeChanges: form.nodeType === "SUBPROCESS" ? requirementScopeDraft.changes : [] };
        const payload = mode === "create"
            ? { ...common, nodeType: form.nodeType, code: form.code.trim(), parentId: form.parentId } satisfies ProcessNodeCreate
            : { ...common, version: value?.version ?? 0, status: form.status, parentId: form.parentId } satisfies ProcessNodeUpdate;
        if (await onSubmit(payload)) { setBaseline(JSON.stringify(normalized(form, mode))); onDirtyChange?.(false); }
    };


    const saveDisabled = busy || invalidDateDraft || documentDraft.uploading || documentDraft.invalid || !documentDraft.ready
        || (form.nodeType === "SUBPROCESS" && [controlScopeDraft, riskScopeDraft, controlObjectiveScopeDraft, requirementScopeDraft].some(draft => !draft.ready || draft.invalid))
        || (!generalInformationDirty && !documentDraft.dirty && !controlScopeDraft.dirty && !riskScopeDraft.dirty && !controlObjectiveScopeDraft.dirty && !requirementScopeDraft.dirty);

    return (
        <>
            <div style={ROOT_STYLE}>
                <CatalogParentHeader objectTitle={form.title || nodeTypeLabel(form.nodeType, t)} label={t(form.nodeType === "PROCESS" ? "process.fields.parentProcess" : "process.fields.owningProcess")}
                    parentId={form.parentId} required={form.nodeType === "SUBPROCESS"}
                    busy={busy} onClearParent={!readOnly && manage && form.nodeType === "PROCESS" ? () => change("parentId", null) : undefined}
                    parent={selectedParent ? { code: selectedParent.code, title: selectedParent.title, type: nodeTypeLabel(selectedParent.nodeType, t), status: selectedParent.status } : null}
                    selection={!readOnly && manage ? <Button disabled={busy} onClick={() => setParentDialogOpen(true)}>{t("catalog.parentHeader.select")}</Button> : null} />

                <DetailTabContainer onTabSelect={(event) => { const key = event.detail.tab.getAttribute("data-tab-key") as ProcessTabKey | null; if (key) { if (!controlledTab) setInternalTab(key); onActiveTabChange?.(key); } }}>
                    <Tab text={t("process.tabs.general", { defaultValue: "General Information" })} selected={activeTab === "general"} data-tab-key="general" />
                    {form.nodeType === "SUBPROCESS" ? (
                        <>
                            <Tab text={t("process.tabs.controls", { defaultValue: "Controls" })} selected={activeTab === "controls"} disabled={!controlScopePermissions.view} data-tab-key="controls" />
                            <Tab text={t("process.tabs.requirements")} selected={activeTab === "requirements"} disabled={!requirementScopePermissions.view} data-tab-key="requirements" />
                            <Tab text={t("process.tabs.controlObjectives", { defaultValue: "Control Objectives" })} selected={activeTab === "controlObjectives"} disabled={!controlObjectiveScopePermissions.view} data-tab-key="controlObjectives" />
                            <Tab text={t("process.tabs.accountGroups", { defaultValue: "Account Groups" })} selected={activeTab === "accountGroups"} disabled={!value?.id || !((controlScopePermissions.view && accountGroupClassificationPermissions.view) || (controlObjectiveScopePermissions.view && objectiveAccountGroupClassificationPermissions.view))} data-tab-key="accountGroups" />
                            <Tab text={t("process.tabs.riskTemplates", { defaultValue: "Risk Templates" })} selected={activeTab === "riskTemplates"} disabled={!riskScopePermissions.view} data-tab-key="riskTemplates" />
                        </>
                    ) : null}
                    <Tab text={t("process.tabs.documents", { defaultValue: "Documents" })} selected={activeTab === "documents"} data-tab-key="documents" />
                </DetailTabContainer>

                {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
                {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}
                <div style={BODY_STYLE}>
                    <div style={{ display: activeTab === "general" ? "block" : "none" }}><div className="modalThreeColumnGrid">
                        <FormField label={t("process.fields.code", { defaultValue: "Code" })} required>{readOnly ? <Text className="objectPageValue">{(form.code) || "—"}</Text> : <Input value={form.code} readonly={mode !== "create"} disabled={busy} onInput={(e) => change("code", readValue(e))} />}</FormField>
                        <FormField label={t("process.fields.name", { defaultValue: "Title" })} required>{readOnly ? <Text className="objectPageValue">{(form.title) || "—"}</Text> : <Input value={form.title} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => change("title", readValue(e))} />}</FormField>
                        <FormField label={t("process.fields.nodeType", { defaultValue: "Node type" })}>{readOnly ? <Text className="objectPageValue">{(nodeTypeLabel(form.nodeType, t)) || "—"}</Text> : <Input value={nodeTypeLabel(form.nodeType, t)} readonly />}</FormField>
                        <FormField label={t("process.fields.status", { defaultValue: "Status" })}>{readOnly ? <ObjectStatus state={form.status === "ACTIVE" ? "Positive" : "None"}>{t(form.status === "ACTIVE" ? "common.active" : "common.inactive")}</ObjectStatus> : <Select value={form.status} disabled={mode !== "edit" || busy} accessibleName={t("process.fields.status", { defaultValue: "Status" })} onChange={(e) => change("status", readValue(e) as "ACTIVE" | "INACTIVE")}><Option value="ACTIVE">{t("common.active", { defaultValue: "Active" })}</Option><Option value="INACTIVE">{t("common.inactive", { defaultValue: "Inactive" })}</Option></Select>}</FormField>
                        <FormField label={t("process.fields.sortOrder", { defaultValue: "Sort order" })}>{readOnly ? <Text className="objectPageValue">{(form.sortOrder) || "—"}</Text> : <Input value={form.sortOrder} readonly={readOnly} disabled={busy} onInput={(e) => change("sortOrder", readValue(e))} />}</FormField>
                        <div className="modalDateRange"><FormField label={t("process.fields.validFrom", { defaultValue: "Valid from" })}>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validFrom)) || "—"}</Text> : <PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("process.fields.validFrom", { defaultValue: "Valid from" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validFrom", next)} onDraftStateChange={(state) => setDateDrafts((current) => current.validFrom.valid === state.valid && current.validFrom.draftValue === state.draftValue && current.validFrom.dirty === state.dirty ? current : { ...current, validFrom: state })} />}</FormField>
                        <FormField label={t("process.fields.validTo", { defaultValue: "Valid to" })}>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validTo)) || "—"}</Text> : <PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("process.fields.validTo", { defaultValue: "Valid to" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validTo", next)} onDraftStateChange={(state) => setDateDrafts((current) => current.validTo.valid === state.valid && current.validTo.draftValue === state.draftValue && current.validTo.dirty === state.dirty ? current : { ...current, validTo: state })} />}</FormField></div>
                        <FormField label={t("process.fields.description", { defaultValue: "Description" })} fullWidth>{readOnly ? <Text className="objectPageValue">{(form.description) || "—"}</Text> : <TextArea rows={5} value={form.description} readonly={readOnly} disabled={busy} onInput={(e) => change("description", readValue(e))} />}</FormField>
                    </div></div>
                    <div style={{ display: activeTab === "controls" ? "block" : "none" }}>
                        {form.nodeType === "SUBPROCESS" ? <SubprocessControlScopesTab subprocessId={value?.id || null} readOnly={readOnly} busy={busy} onDraftStateChange={setControlScopeDraft} /> : null}
                    </div>
                    <div style={{ display: activeTab === "riskTemplates" ? "block" : "none" }}>
                        {form.nodeType === "SUBPROCESS" ? <SubprocessRiskScopesTab subprocessId={value?.id || null} readOnly={readOnly} busy={busy} onDraftStateChange={setRiskScopeDraft} /> : null}
                    </div>
                    <div style={{ display: activeTab === "controlObjectives" ? "block" : "none" }}>
                        {form.nodeType === "SUBPROCESS" ? <SubprocessControlObjectiveScopesTab subprocessId={value?.id || null} readOnly={readOnly} busy={busy} onDraftStateChange={setControlObjectiveScopeDraft} /> : null}
                    </div>
                    <div style={{ display: activeTab === "requirements" ? "block" : "none" }}>
                        {form.nodeType === "SUBPROCESS" ? <SubprocessRequirementScopesTab subprocessId={value?.id || null} readOnly={readOnly} busy={busy} onDraftStateChange={setRequirementScopeDraft} /> : null}
                    </div>
                    <div style={{ display: activeTab === "accountGroups" ? "block" : "none" }}>
                        {form.nodeType === "SUBPROCESS" && value?.id ? <SubprocessAccountGroupsTab subprocessId={value.id} /> : null}
                    </div>
                    <div style={{ display: activeTab === "documents" ? "block" : "none" }}><DocumentManager title={t("process.tabs.documents", { defaultValue: "Documents" })} targetType={documentTarget(form.nodeType)} targetId={value?.id || null} readOnly={readOnly} showActions={!readOnly} busy={busy} persistenceMode="PARENT_SAVE" aggregateError={documentAggregateError} onDirtyChange={onDocumentDirtyChange} onDraftStateChange={setDocumentDraft} /></div>
                </div>

                <DialogFooter>{mode === "view" ? <>
                    <Button design="Emphasized" hidden={!manage} disabled={busy || !onEdit} onClick={onEdit}>{t("common.edit", { defaultValue: "Edit" })}</Button>
                </> : <Button design="Emphasized" disabled={saveDisabled} onClick={() => void submit()}>{t("common.save", { defaultValue: "Save" })}</Button>}<Button design="Transparent" disabled={busy} onClick={onCancel}>{mode === "view" ? t("common.close", { defaultValue: "Close" }) : t("common.cancel", { defaultValue: "Cancel" })}</Button></DialogFooter>
            </div>

            <ProcessParentValueHelpDialog
                open={parentDialogOpen}
                items={processParents}
                selectedParentId={form.parentId}
                allowNoParent={form.nodeType === "PROCESS"}
                busy={busy}
                onClose={() => setParentDialogOpen(false)}
                onSelect={(parentId) => change("parentId", parentId)}
            />
        </>
    );
}
