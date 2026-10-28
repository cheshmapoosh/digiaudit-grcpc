import OrganizationOwnersTab from "../components/OrganizationOwnersTab";
import type { OrganizationOwnerChange } from "../domain/organization.model";
import { useBasicDataOptions } from "@/features/basic-data";
import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { useAuthState } from "@/features/auth";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import { OrganizationSubprocessTable, OrganizationLocalDraftWorkspace, toOrganizationLocalPayload, type OrganizationLocalDraft, type LocalContextDraft } from "@/features/local-master-data";
import { OrganizationObjectivesTab, type OrganizationObjectiveChange } from "@/features/objective";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Text, ObjectStatus, Input, Label, MessageStrip, Option, Select, Tab, TextArea } from "@ui5/webcomponents-react";

import {
    DocumentManager,
    EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
    toDocumentAggregateRequest,
    type DocumentAggregateDraftError,
    type ParentSaveDocumentDraftState,
} from "@/features/document";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";
import {
    type OrganizationEditableStatus,
    type OrganizationNode,
    type OrganizationNodeCreate,
    type OrganizationNodeUpdate,
    type OrganizationType,
} from "../domain/organization.model";
import { buildTree, collectDescendantIds } from "../utils/organization.tree";

export type OrganizationObjectMode = "create" | "edit" | "view";
export type OrganizationTabKey = "general" | "subprocesses" | "risks" | "controls"
    | "regulations" | "objectives" | "businessObjectives" | "policies" | "owners" | "documents";

interface OrganizationFormState {
    code: string;
    name: string;
    organizationType: OrganizationType;
    organizationTypeId: string;
    status: OrganizationEditableStatus;
    parentOrganizationId: string | null;
    location: string;
    description: string;
    validFrom: string;
    validTo: string;
}

export interface OrganizationObjectPageProps {
    mode: OrganizationObjectMode;
    allItems: OrganizationNode[];
    value: OrganizationNode | null;
    activeTab?: OrganizationTabKey;
    busy?: boolean;
    error?: string | null;
    documentAggregateError?: DocumentAggregateDraftError | null;
    onErrorClose?: () => void;
    onSubmit: (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => Promise<boolean>;
    onCancel: () => void;
    onEdit?: () => void;
    onActiveTabChange?: (tab: OrganizationTabKey) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onDocumentDirtyChange?: (dirty: boolean) => void;
    onLocalDirtyChange?: (dirty: boolean) => void;
    onLocalNavigation?: (params: URLSearchParams) => void;
}

const ROOT_STYLE: CSSProperties = { display: "grid", gap: "0.75rem", minWidth: 0, maxWidth: "100%" };

const FIELD_STYLE: CSSProperties = { display: "grid", gap: "0.35rem" };
const BODY_STYLE: CSSProperties = { minHeight: 0, padding: "0.75rem" };
const FULL_WIDTH_STYLE: CSSProperties = { ...FIELD_STYLE, gridColumn: "1 / -1" };

function toFormState(value: OrganizationNode | null, creating = false): OrganizationFormState {
    return {
        code: value?.code ?? "",
        name: value?.name ?? "",
        organizationType: value?.organizationType ?? "OTHER",
        organizationTypeId: value?.organizationTypeId ?? "",
        status: !creating && value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        parentOrganizationId: value?.parentOrganizationId ?? null,
        location: value?.location ?? "",
        description: value?.description ?? "",
        validFrom: value?.validFrom ?? "",
        validTo: value?.validTo ?? "",
    };
}

function normalized(form: OrganizationFormState, mode: OrganizationObjectMode) {
    const common = {
        name: form.name.trim(),
        organizationType: form.organizationType, organizationTypeId: form.organizationTypeId,
        location: form.location.trim(),
        description: form.description.trim(),
        validFrom: form.validFrom.trim(),
        validTo: form.validTo.trim(),
    };
    return mode === "create"
        ? { ...common, code: form.code.trim().toUpperCase(), parentOrganizationId: form.parentOrganizationId }
        : { ...common, status: form.status, parentOrganizationId: form.parentOrganizationId };
}

function readValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function FormField({ label, required, fullWidth, children }: { label: string; required?: boolean; fullWidth?: boolean; children: ReactNode }) {
    return <div style={fullWidth ? FULL_WIDTH_STYLE : FIELD_STYLE}><Label showColon required={required}>{label}</Label>{children}</div>;
}

export default function OrganizationObjectPage({
    mode, allItems, value, activeTab: controlledTab, busy = false, error, documentAggregateError, onErrorClose,
    onSubmit, onCancel, onEdit, onActiveTabChange, onDirtyChange, onDocumentDirtyChange,
    onLocalDirtyChange, onLocalNavigation,
}: OrganizationObjectPageProps) {
    const { t } = useTranslation();
    const { manage } = useMasterDataAccess("ORGANIZATION");
    const referenceAccess = useMasterDataAccess("REFERENCE");
    const processAccess = useMasterDataAccess("PROCESS");
    const organizationTypes = useBasicDataOptions("organization-types", mode !== "view");
    const canAssignOwner = useAuthState((state) => Boolean(state.me?.rootUser || state.me?.authorities.includes("ROLE_PROFILE_ADMIN")));
    const [ownerChanges, setOwnerChanges] = useState<OrganizationOwnerChange[]>([]);
    const [ownerSelectionDirty, setOwnerSelectionDirty] = useState(false);
    const [subprocessChanges, setSubprocessChanges] = useState<LocalContextDraft[]>([]);
    const [subprocessSelectionPending, setSubprocessSelectionPending] = useState(false);
    const [subprocessReady, setSubprocessReady] = useState(true);
    const [form, setForm] = useState(() => toFormState(value, mode === "create"));
    const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toFormState(value, mode === "create"), mode)));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [parentDialogOpen, setParentDialogOpen] = useState(false);
    const [documentDraft, setDocumentDraft] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
    const [dateDrafts, setDateDrafts] = useState<Record<"validFrom" | "validTo", PersianDateDraftState>>({
        validFrom: { draftValue: "", valid: true, dirty: false },
        validTo: { draftValue: "", valid: true, dirty: false },
    });
    const [internalTab, setInternalTab] = useState<OrganizationTabKey>("general");
    const [localObjectiveDirty, setLocalObjectiveDirty] = useState(false);
    const [objectiveChanges, setObjectiveChanges] = useState<OrganizationObjectiveChange[]>([]);
    const [objectiveReady, setObjectiveReady] = useState(true);
    const [localDrafts, setLocalDrafts] = useState<OrganizationLocalDraft[]>([]);
    const [localPending, setLocalPending] = useState(false);
    const [localReady, setLocalReady] = useState(true);
    const [localAuxiliaryDirty, setLocalAuxiliaryDirty] = useState(false);
    const [ownerReady, setOwnerReady] = useState(true);
    const scopeRef = useRef(mode === "create" ? "CREATE" : value?.id ?? "EMPTY");
    const generalInformationDirty = JSON.stringify(normalized(form, mode)) !== baseline || ownerChanges.length > 0;
    const invalidDateDraft = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
    const dirty = generalInformationDirty || ownerSelectionDirty || invalidDateDraft || localObjectiveDirty
        || subprocessChanges.length > 0 || subprocessSelectionPending || localDrafts.length > 0 || localPending || localAuxiliaryDirty || objectiveChanges.length > 0 || parentDialogOpen;

    const activeTab = controlledTab ?? internalTab;
    const readOnly = mode === "view" || !manage;
    const scope = mode === "create" ? "CREATE" : value?.id ?? "EMPTY";

    useEffect(() => {
        if (scopeRef.current !== scope || !dirty) {
            const next = toFormState(value, mode === "create");
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
    }, [dirty, mode, onDirtyChange, scope, value]);

    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => { onLocalDirtyChange?.(localDrafts.length > 0 || localPending || localAuxiliaryDirty); }, [localDrafts.length, localPending, localAuxiliaryDirty, onLocalDirtyChange]);

    const descendants = useMemo(() => new Set(collectDescendantIds(buildTree(allItems), value?.id)), [allItems, value?.id]);
    const selectedParent = form.parentOrganizationId ? allItems.find((item) => item.id === form.parentOrganizationId) : null;

    const typeLabel = organizationTypes.items.find((item) => item.id === form.organizationTypeId)?.name ?? value?.organizationTypeName ?? t(`organization.types.${form.organizationType}`, { defaultValue: form.organizationType });

    const change = <K extends keyof OrganizationFormState>(key: K, next: OrganizationFormState[K]) => setForm((current) => ({ ...current, [key]: next }));

    const validate = () => {
        if (!form.organizationTypeId || organizationTypes.loading || organizationTypes.error) return setValidationError(t("basicData.typeRequired")), false;
        if (mode === "create" && !form.code.trim()) return setValidationError(t("organization.validation.codeRequired", { defaultValue: "Code is required" })), false;
        if (!form.name.trim()) return setValidationError(t("organization.validation.nameRequired", { defaultValue: "Name is required" })), false;
        if (form.name.trim().length > 255) return setValidationError(t("organization.validation.nameMaxLength", { defaultValue: "Name cannot exceed 255 characters" })), false;
        if (form.location.trim().length > 255) return setValidationError(t("organization.validation.locationMaxLength", { defaultValue: "Location cannot exceed 255 characters" })), false;
        if (invalidDateDraft) return setValidationError(t("organization.validation.invalidDate", { defaultValue: "Invalid date" })), false;
        if (form.parentOrganizationId && (form.parentOrganizationId === value?.id || descendants.has(form.parentOrganizationId) || !allItems.some((item) => item.id === form.parentOrganizationId))) return setValidationError(t("organization.errors.invalidHierarchyMove", { defaultValue: "Invalid parent" })), false;
        if (form.validFrom && form.validTo && form.validFrom > form.validTo) return setValidationError(t("organization.validation.invalidValidityRange", { defaultValue: "Invalid validity range" })), false;
        if (!documentDraft.ready || documentDraft.invalid || documentDraft.uploading) return setValidationError(t("document.errors.finalize", { defaultValue: "Document drafts are not ready" })), false;
        if (subprocessSelectionPending || (subprocessChanges.length > 0 && !subprocessReady) || !localReady || !objectiveReady || !ownerReady || parentDialogOpen) return false;
        setValidationError(null);
        return true;
    };

    const submit = async () => {
        if (readOnly || !validate()) return;
        const localChanges = toOrganizationLocalPayload(localDrafts);
        const subprocesses = subprocessChanges.map(({ subprocessId, operation, contextId, version }) => ({ subprocessId, operation, contextId, version }));
        const payload = mode === "create"
            ? { code: form.code.trim(), name: form.name.trim(), organizationType: form.organizationType, organizationTypeId: form.organizationTypeId, parentOrganizationId: form.parentOrganizationId, ownerAssignments: ownerChanges, subprocesses, ...localChanges, organizationObjectiveChanges: objectiveChanges, location: form.location.trim() || null, description: form.description.trim() || null, validFrom: form.validFrom || null, validTo: form.validTo || null, documents: toDocumentAggregateRequest(documentDraft) } satisfies OrganizationNodeCreate
            : { version: value?.version ?? 0, name: form.name.trim(), organizationType: form.organizationType, organizationTypeId: form.organizationTypeId, status: form.status, parentOrganizationId: form.parentOrganizationId, ownerAssignments: ownerChanges, subprocesses, ...localChanges, organizationObjectiveChanges: objectiveChanges, location: form.location.trim() || null, description: form.description.trim() || null, validFrom: form.validFrom || null, validTo: form.validTo || null, documents: toDocumentAggregateRequest(documentDraft) } satisfies OrganizationNodeUpdate;
        if (await onSubmit(payload)) {
            setLocalDrafts([]);
            setObjectiveChanges([]);
            setLocalPending(false);
            setLocalAuxiliaryDirty(false);
            setLocalObjectiveDirty(false);
            setOwnerChanges([]);
            setOwnerSelectionDirty(false);
            setSubprocessChanges([]);
            setSubprocessSelectionPending(false);
            setBaseline(JSON.stringify(normalized(form, mode)));
            onDirtyChange?.(false);
        }
    };

    const saveDisabled = busy || organizationTypes.loading || Boolean(organizationTypes.error) || !form.organizationTypeId
        || !localReady || !objectiveReady || !ownerReady || parentDialogOpen
        || ownerSelectionDirty
        || subprocessSelectionPending || (subprocessChanges.length > 0 && !subprocessReady)
        || invalidDateDraft
        || documentDraft.uploading
        || documentDraft.invalid
        || !documentDraft.ready
        || (mode !== "create" && !generalInformationDirty && !documentDraft.dirty && subprocessChanges.length === 0 && !localDrafts.length && !objectiveChanges.length);

    return <div style={ROOT_STYLE}>
        <CatalogParentHeader objectTitle={form.name || t("organization.object.modalTitle")} label={t("organization.fields.parent")} parentId={form.parentOrganizationId}
            busy={busy} onClearParent={!readOnly ? () => change("parentOrganizationId", null) : undefined}
            parent={selectedParent ? { code: selectedParent.code, title: selectedParent.name, type: selectedParent.organizationTypeName ?? t(`organization.types.${selectedParent.organizationType}`), status: selectedParent.status } : null}
            selection={!readOnly ? <Button design="Emphasized" disabled={busy} onClick={() => setParentDialogOpen(true)}>{t("catalog.parentHeader.select")}</Button> : null} />

        <DetailTabContainer onTabSelect={(event) => { const key = (event.detail.tab.getAttribute("data-tab-key") as OrganizationTabKey | null); if (key) { if (!controlledTab) setInternalTab(key); onActiveTabChange?.(key); } }}>
            <Tab text={t("organization.tabs.general", { defaultValue: "General Information" })} selected={activeTab === "general"} data-tab-key="general" />
            <Tab text={t("organization.tabs.subprocesses", { defaultValue: "Subprocesses" })} selected={activeTab === "subprocesses"} data-tab-key="subprocesses" />
            <Tab text={t("organization.tabs.risks", { defaultValue: "Risks" })} selected={activeTab === "risks"} data-tab-key="risks" />
            <Tab text={t("organization.tabs.controls", { defaultValue: "Controls" })} selected={activeTab === "controls"} data-tab-key="controls" />
            <Tab text={t("organization.tabs.regulations", { defaultValue: "Regulations" })} selected={activeTab === "regulations"} data-tab-key="regulations" />
            <Tab text={t("organization.tabs.objectives", { defaultValue: "Control Objectives" })} selected={activeTab === "objectives"} data-tab-key="objectives" />
            <Tab text={t("organization.tabs.businessObjectives", { defaultValue: "Objectives" })} selected={activeTab === "businessObjectives"} data-tab-key="businessObjectives" />
            <Tab text={t("organization.tabs.policies", { defaultValue: "Policy" })} selected={activeTab === "policies"} data-tab-key="policies" />
            <Tab text={t("organization.tabs.owners")} selected={activeTab === "owners"} data-tab-key="owners" />
            <Tab text={t("organization.tabs.documents", { defaultValue: "Documents" })} selected={activeTab === "documents"} data-tab-key="documents" />
        </DetailTabContainer>

        {!readOnly && organizationTypes.error ? <MessageStrip design="Negative" hideCloseButton>{organizationTypes.error}</MessageStrip> : null}
        {!readOnly && !organizationTypes.loading && !organizationTypes.error && organizationTypes.items.every((item) => item.status !== "ACTIVE") ? <MessageStrip design="Information" hideCloseButton>{t("basicData.noOrganizationTypes")}</MessageStrip> : null}
        {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}

        <div style={BODY_STYLE}>
            <div style={{ display: activeTab === "general" ? "block" : "none" }}>
                <div className="modalThreeColumnGrid">
                    <FormField label={t("organization.fields.code", { defaultValue: "Code" })} required>{readOnly ? <Text className="objectPageValue">{(form.code) || "—"}</Text> : <Input value={form.code} readonly={mode !== "create"} disabled={busy} onInput={(e) => change("code", readValue(e))} />}</FormField>
                    <FormField label={t("organization.fields.name", { defaultValue: "Name" })} required>{readOnly ? <Text className="objectPageValue">{(form.name) || "—"}</Text> : <Input value={form.name} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => change("name", readValue(e))} />}</FormField>
                    <FormField label={t("organization.fields.organizationType", { defaultValue: "Organization type" })} required>{readOnly ? <Text className="objectPageValue">{(typeLabel) || "—"}</Text> : <Select value={form.organizationTypeId} disabled={busy || organizationTypes.loading || Boolean(organizationTypes.error)} accessibleName={t("organization.fields.organizationType")} onChange={(event) => change("organizationTypeId", event.detail.selectedOption.value ?? "")}>
                        <Option value="" selected={!form.organizationTypeId}>{t("basicData.choose")}</Option>
                        {organizationTypes.items.filter((type) => type.status === "ACTIVE" || type.id === value?.organizationTypeId).map((type) => <Option key={type.id} value={type.id} selected={type.id === form.organizationTypeId}>{type.name}</Option>)}
                    </Select>}</FormField>
                    <FormField label={t("organization.fields.status", { defaultValue: "Status" })}>{mode === "create" ? <ObjectStatus state="Positive">{t("common.active")}</ObjectStatus> : readOnly ? <ObjectStatus state={form.status === "ACTIVE" ? "Positive" : "None"}>{t(form.status === "ACTIVE" ? "common.active" : "common.inactive")}</ObjectStatus> : <Select value={form.status} disabled={mode !== "edit" || busy} accessibleName={t("organization.fields.status", { defaultValue: "Status" })} onChange={(e) => change("status", readValue(e) as OrganizationEditableStatus)}><Option value="ACTIVE">{t("common.active", { defaultValue: "Active" })}</Option><Option value="INACTIVE">{t("common.inactive", { defaultValue: "Inactive" })}</Option></Select>}</FormField>
                    <FormField label={t("organization.fields.location", { defaultValue: "Location" })}>{readOnly ? <Text className="objectPageValue">{(form.location) || "—"}</Text> : <Input value={form.location} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => change("location", readValue(e))} />}</FormField>
                    <div className="modalDateRange"><FormField label={t("organization.fields.validFrom", { defaultValue: "Valid from" })}>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validFrom)) || "—"}</Text> : <PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("organization.fields.validFrom", { defaultValue: "Valid from" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validFrom", next)} onDraftStateChange={(state) => setDateDrafts((current) => current.validFrom.valid === state.valid && current.validFrom.draftValue === state.draftValue && current.validFrom.dirty === state.dirty ? current : { ...current, validFrom: state })} />}</FormField>
                    <FormField label={t("organization.fields.validTo", { defaultValue: "Valid to" })}>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validTo)) || "—"}</Text> : <PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("organization.fields.validTo", { defaultValue: "Valid to" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validTo", next)} onDraftStateChange={(state) => setDateDrafts((current) => current.validTo.valid === state.valid && current.validTo.draftValue === state.draftValue && current.validTo.dirty === state.dirty ? current : { ...current, validTo: state })} />}</FormField></div>
                    <FormField label={t("organization.fields.description", { defaultValue: "Description" })} fullWidth>{readOnly ? <Text className="objectPageValue">{(form.description) || "—"}</Text> : <TextArea value={form.description} readonly={readOnly} disabled={busy} rows={4} accessibleName={t("organization.fields.description", { defaultValue: "Description" })} onInput={(e) => change("description", readValue(e))} />}</FormField>
                </div>
            </div>
            <div style={{ display: activeTab === "owners" ? "block" : "none" }}>
                <OrganizationOwnersTab organizationId={value?.id ?? null} onReadyChange={setOwnerReady} rows={value?.ownerAssignments ?? []} changes={ownerChanges} onChange={setOwnerChanges} onPendingChange={setOwnerSelectionDirty} editable={!readOnly && canAssignOwner} busy={busy} />
            </div>
            <div style={{ display: activeTab === "documents" ? "block" : "none" }}><DocumentManager title={t("organization.tabs.documents", { defaultValue: "Documents" })} targetType="ORG" targetId={value?.id || null} readOnly={readOnly} showActions={!readOnly} busy={busy} persistenceMode="PARENT_SAVE" aggregateError={documentAggregateError} onDirtyChange={onDocumentDirtyChange} onDraftStateChange={setDocumentDraft} /></div>
            <div style={{ display: activeTab === "subprocesses" ? "block" : "none" }}>
                {referenceAccess.view && processAccess.view ? <OrganizationSubprocessTable
                    organizationId={value?.id ?? null} editable={!readOnly && referenceAccess.manage} busy={busy}
                    canonicalRows={value?.localRelationships?.contexts} resetKey={value?.version ?? "create"} changes={subprocessChanges} onChange={setSubprocessChanges}
                    onPendingChange={setSubprocessSelectionPending} onReadyChange={setSubprocessReady} />
                    : <MessageStrip design="Critical" hideCloseButton>{t("local.forbidden")}</MessageStrip>}
            </div>
            <div style={{ display: activeTab !== "general" && activeTab !== "documents" && activeTab !== "owners" && activeTab !== "businessObjectives" && activeTab !== "subprocesses" ? "block" : "none" }}>
                <OrganizationLocalDraftWorkspace organizationId={value?.id ?? null} tab={activeTab} editable={!readOnly} busy={busy}
                    resetKey={value?.version ?? "create"} canonical={value?.localRelationships ?? undefined} subprocessChanges={subprocessChanges} drafts={localDrafts} onChange={setLocalDrafts}
                    onPendingChange={setLocalPending} onReadyChange={setLocalReady} onDirtyChange={setLocalAuxiliaryDirty} navigateWithinOrganization={onLocalNavigation} />
            </div>
            <div style={{ display: activeTab === "businessObjectives" ? "block" : "none" }}><OrganizationObjectivesTab organizationId={value?.id ?? null} manage={!readOnly && referenceAccess.manage} busy={busy} changes={objectiveChanges} onChangesChange={setObjectiveChanges} onDirtyChange={setLocalObjectiveDirty} onReadinessChange={setObjectiveReady} resetKey={value?.version ?? "create"} canonicalRows={value?.localRelationships?.objectives} /></div>
        </div>

        <DialogFooter>
            {mode === "view"
                    ? <Button design="Emphasized" hidden={!manage} disabled={busy || !onEdit} onClick={onEdit}>{t("common.edit", { defaultValue: "Edit" })}</Button>
                    : <Button design="Emphasized" disabled={saveDisabled} onClick={() => void submit()}>{t("common.save", { defaultValue: "Save" })}</Button>
            }
            <Button design="Transparent" disabled={busy} onClick={onCancel}>{mode === "view" ? t("common.close", { defaultValue: "Close" }) : t("common.cancel", { defaultValue: "Cancel" })}</Button>
        </DialogFooter>

        <ParentValueHelpDialog open={parentDialogOpen} items={allItems} currentId={value?.id ?? null} selectedParentId={form.parentOrganizationId} busy={busy} onClose={() => !busy && setParentDialogOpen(false)} onSelect={(id) => { change("parentOrganizationId", id); setParentDialogOpen(false); }} />
    </div>;
}
