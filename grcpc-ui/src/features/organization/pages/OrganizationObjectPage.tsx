import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Label, MessageStrip, Option, Select, Tab, TextArea, Title } from "@ui5/webcomponents-react";

import {
    DocumentManager,
    EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
    toDocumentAggregateRequest,
    type ParentSaveDocumentDraftState,
} from "@/features/document";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";
import {
    ORGANIZATION_TYPES,
    type OrganizationEditableStatus,
    type OrganizationNode,
    type OrganizationNodeCreate,
    type OrganizationNodeUpdate,
    type OrganizationType,
} from "../domain/organization.model";
import { buildTree, collectDescendantIds } from "../utils/organization.tree";

export type OrganizationObjectMode = "create" | "edit" | "view";
export type OrganizationTabKey = "general" | "documents";

interface OrganizationFormState {
    code: string;
    name: string;
    organizationType: OrganizationType;
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
    onErrorClose?: () => void;
    onSubmit: (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => Promise<boolean>;
    onCancel: () => void;
    onEdit?: () => void;
    onActiveTabChange?: (tab: OrganizationTabKey) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onDocumentDirtyChange?: (dirty: boolean) => void;
}

const ROOT_STYLE: CSSProperties = { display: "grid", gap: "0.75rem", minWidth: 0, maxWidth: "100%", background: "var(--sapBackgroundColor)" };
const HEADER_STYLE: CSSProperties = { border: "1px solid var(--sapGroup_ContentBorderColor)", background: "var(--sapGroup_ContentBackground)" };
const HEADER_TITLE_STYLE: CSSProperties = { padding: "0.5rem 1rem", borderBottom: "1px solid var(--sapGroup_ContentBorderColor)", background: "var(--sapList_HeaderBackground)", fontWeight: 700 };
const HEADER_GRID_STYLE: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.35rem 2rem", padding: "0.75rem 1rem" };
const HEADER_ROW_STYLE: CSSProperties = { display: "grid", gridTemplateColumns: "8rem minmax(0, 1fr)", gap: "0.5rem", alignItems: "center" };
const FORM_GRID_STYLE: CSSProperties = { display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };
const FIELD_STYLE: CSSProperties = { display: "grid", gap: "0.35rem" };
const BODY_STYLE: CSSProperties = { border: "1px solid var(--sapGroup_ContentBorderColor)", minHeight: "18rem", padding: "0.75rem" };
const FOOTER_STYLE: CSSProperties = { display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" };
const FULL_WIDTH_STYLE: CSSProperties = { ...FIELD_STYLE, gridColumn: "1 / -1" };

function toFormState(value: OrganizationNode | null): OrganizationFormState {
    return {
        code: value?.code ?? "",
        name: value?.name ?? "",
        organizationType: value?.organizationType ?? "OTHER",
        status: value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
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
        organizationType: form.organizationType,
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

function HeaderItem({ label, value }: { label: string; value?: string | null }) {
    return <div style={HEADER_ROW_STYLE}><strong>{label}:</strong><span style={{ minWidth: 0, wordBreak: "break-word" }}>{value?.trim() || "-"}</span></div>;
}

function FormField({ label, required, fullWidth, children }: { label: string; required?: boolean; fullWidth?: boolean; children: ReactNode }) {
    return <div style={fullWidth ? FULL_WIDTH_STYLE : FIELD_STYLE}><Label showColon required={required}>{label}</Label>{children}</div>;
}

export default function OrganizationObjectPage({
    mode, allItems, value, activeTab: controlledTab, busy = false, error, onErrorClose,
    onSubmit, onCancel, onEdit, onActiveTabChange, onDirtyChange, onDocumentDirtyChange,
}: OrganizationObjectPageProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState(() => toFormState(value));
    const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toFormState(value), mode)));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [parentDialogOpen, setParentDialogOpen] = useState(false);
    const [documentDraft, setDocumentDraft] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
    const [dateDrafts, setDateDrafts] = useState<Record<"validFrom" | "validTo", PersianDateDraftState>>({
        validFrom: { draftValue: "", valid: true, dirty: false },
        validTo: { draftValue: "", valid: true, dirty: false },
    });
    const [internalTab, setInternalTab] = useState<OrganizationTabKey>("general");
    const scopeRef = useRef(mode === "create" ? "CREATE" : value?.id ?? "EMPTY");
    const generalInformationDirty = JSON.stringify(normalized(form, mode)) !== baseline;
    const invalidDateDraft = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
    const dirty = generalInformationDirty || invalidDateDraft;

    const activeTab = controlledTab ?? internalTab;
    const readOnly = mode === "view";
    const scope = mode === "create" ? "CREATE" : value?.id ?? "EMPTY";

    useEffect(() => {
        if (scopeRef.current !== scope || !dirty) {
            const next = toFormState(value);
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

    const descendants = useMemo(() => new Set(collectDescendantIds(buildTree(allItems), value?.id)), [allItems, value?.id]);
    const selectedParent = form.parentOrganizationId ? allItems.find((item) => item.id === form.parentOrganizationId) : null;
    const parentLabel = selectedParent ? `${selectedParent.code} - ${selectedParent.name}` : t("organization.parent.none", { defaultValue: "No parent" });
    const statusLabel = form.status === "ACTIVE" ? t("common.active", { defaultValue: "Active" }) : t("common.inactive", { defaultValue: "Inactive" });
    const typeLabel = t(`organization.types.${form.organizationType}`, { defaultValue: form.organizationType });

    const change = <K extends keyof OrganizationFormState>(key: K, next: OrganizationFormState[K]) => setForm((current) => ({ ...current, [key]: next }));

    const validate = () => {
        if (mode === "create" && !form.code.trim()) return setValidationError(t("organization.validation.codeRequired", { defaultValue: "Code is required" })), false;
        if (!form.name.trim()) return setValidationError(t("organization.validation.nameRequired", { defaultValue: "Name is required" })), false;
        if (form.name.trim().length > 255) return setValidationError(t("organization.validation.nameMaxLength", { defaultValue: "Name cannot exceed 255 characters" })), false;
        if (form.location.trim().length > 255) return setValidationError(t("organization.validation.locationMaxLength", { defaultValue: "Location cannot exceed 255 characters" })), false;
        if (invalidDateDraft) return setValidationError(t("organization.validation.invalidDate", { defaultValue: "Invalid date" })), false;
        if (form.parentOrganizationId && (form.parentOrganizationId === value?.id || descendants.has(form.parentOrganizationId) || !allItems.some((item) => item.id === form.parentOrganizationId))) return setValidationError(t("organization.errors.invalidHierarchyMove", { defaultValue: "Invalid parent" })), false;
        if (form.validFrom && form.validTo && form.validFrom > form.validTo) return setValidationError(t("organization.validation.invalidValidityRange", { defaultValue: "Invalid validity range" })), false;
        if (!documentDraft.ready || documentDraft.invalid || documentDraft.uploading) return setValidationError(t("document.errors.finalize", { defaultValue: "Document drafts are not ready" })), false;
        setValidationError(null);
        return true;
    };

    const submit = async () => {
        if (readOnly || !validate()) return;
        const payload = mode === "create"
            ? { code: form.code.trim(), name: form.name.trim(), organizationType: form.organizationType, parentOrganizationId: form.parentOrganizationId, location: form.location.trim() || null, description: form.description.trim() || null, validFrom: form.validFrom || null, validTo: form.validTo || null, documents: toDocumentAggregateRequest(documentDraft) } satisfies OrganizationNodeCreate
            : { version: value?.version ?? 0, name: form.name.trim(), organizationType: form.organizationType, status: form.status, parentOrganizationId: form.parentOrganizationId, location: form.location.trim() || null, description: form.description.trim() || null, validFrom: form.validFrom || null, validTo: form.validTo || null, documents: toDocumentAggregateRequest(documentDraft) } satisfies OrganizationNodeUpdate;
        if (await onSubmit(payload)) {
            setBaseline(JSON.stringify(normalized(form, mode)));
            onDirtyChange?.(false);
        }
    };

    const saveDisabled = busy
        || invalidDateDraft
        || documentDraft.uploading
        || documentDraft.invalid
        || !documentDraft.ready
        || (!generalInformationDirty && !documentDraft.dirty);

    return <div style={ROOT_STYLE}>
        <div style={HEADER_STYLE}>
            <div style={HEADER_TITLE_STYLE}><Title level="H4">{form.name || t("organization.object.modalTitle", { defaultValue: "Organization" })}</Title></div>
            <div style={HEADER_GRID_STYLE}>
                <HeaderItem label={t("organization.fields.name", { defaultValue: "Name" })} value={form.name} />
                <HeaderItem label={t("organization.fields.code", { defaultValue: "Code" })} value={form.code} />
                <HeaderItem label={t("organization.fields.organizationType", { defaultValue: "Organization type" })} value={typeLabel} />
                <HeaderItem label={t("organization.fields.status", { defaultValue: "Status" })} value={statusLabel} />
                <HeaderItem label={t("organization.fields.parent", { defaultValue: "Parent" })} value={parentLabel} />
                <HeaderItem label={t("organization.fields.location", { defaultValue: "Location" })} value={form.location} />
                <HeaderItem label={t("organization.fields.validity", { defaultValue: "Validity" })} value={`${formatPersianDate(form.validFrom)} - ${formatPersianDate(form.validTo)}`} />
                <HeaderItem label={t("organization.fields.description", { defaultValue: "Description" })} value={form.description} />
                <HeaderItem label={t("organization.fields.createdAt", { defaultValue: "Created at" })} value={formatPersianDateTime(value?.createdAt)} />
                <HeaderItem label={t("organization.fields.updatedAt", { defaultValue: "Updated at" })} value={formatPersianDateTime(value?.updatedAt)} />
            </div>
        </div>

        <DetailTabContainer onTabSelect={(event) => { const key = (event.detail.tab.getAttribute("data-tab-key") as OrganizationTabKey | null); if (key) { if (!controlledTab) setInternalTab(key); onActiveTabChange?.(key); } }}>
            <Tab text={t("organization.tabs.general", { defaultValue: "General Information" })} selected={activeTab === "general"} data-tab-key="general" />
            <Tab text={t("organization.tabs.documents", { defaultValue: "Documents" })} selected={activeTab === "documents"} data-tab-key="documents" />
        </DetailTabContainer>

        {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}

        <div style={BODY_STYLE}>
            <div style={{ display: activeTab === "general" ? "block" : "none" }}>
                <div style={FORM_GRID_STYLE}>
                    <FormField label={t("organization.fields.code", { defaultValue: "Code" })} required><Input value={form.code} readonly={mode !== "create"} disabled={busy} onInput={(e) => change("code", readValue(e))} /></FormField>
                    <FormField label={t("organization.fields.name", { defaultValue: "Name" })} required><Input value={form.name} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => change("name", readValue(e))} /></FormField>
                    <FormField label={t("organization.fields.organizationType", { defaultValue: "Organization type" })} required><Select value={form.organizationType} disabled={readOnly || busy} accessibleName={t("organization.fields.organizationType", { defaultValue: "Organization type" })} onChange={(e) => change("organizationType", readValue(e) as OrganizationType)}>{ORGANIZATION_TYPES.map((type) => <Option key={type} value={type}>{t(`organization.types.${type}`, { defaultValue: type })}</Option>)}</Select></FormField>
                    <FormField label={t("organization.fields.status", { defaultValue: "Status" })}><Select value={form.status} disabled={mode !== "edit" || busy} accessibleName={t("organization.fields.status", { defaultValue: "Status" })} onChange={(e) => change("status", readValue(e) as OrganizationEditableStatus)}><Option value="ACTIVE">{t("common.active", { defaultValue: "Active" })}</Option><Option value="INACTIVE">{t("common.inactive", { defaultValue: "Inactive" })}</Option></Select></FormField>
                    <FormField label={t("organization.fields.parent", { defaultValue: "Parent" })}><div style={{ display: "flex", gap: "0.5rem" }}><Input value={parentLabel} readonly style={{ flex: 1 }} />{!readOnly ? <Button disabled={busy} onClick={() => setParentDialogOpen(true)}>{t("organization.parent.select", { defaultValue: "Select" })}</Button> : null}</div></FormField>
                    <FormField label={t("organization.fields.location", { defaultValue: "Location" })}><Input value={form.location} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => change("location", readValue(e))} /></FormField>
                    <FormField label={t("organization.fields.validFrom", { defaultValue: "Valid from" })}><PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("organization.fields.validFrom", { defaultValue: "Valid from" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validFrom", next)} onDraftStateChange={(state) => setDateDrafts((current) => current.validFrom.valid === state.valid && current.validFrom.draftValue === state.draftValue && current.validFrom.dirty === state.dirty ? current : { ...current, validFrom: state })} /></FormField>
                    <FormField label={t("organization.fields.validTo", { defaultValue: "Valid to" })}><PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("organization.fields.validTo", { defaultValue: "Valid to" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validTo", next)} onDraftStateChange={(state) => setDateDrafts((current) => current.validTo.valid === state.valid && current.validTo.draftValue === state.draftValue && current.validTo.dirty === state.dirty ? current : { ...current, validTo: state })} /></FormField>
                    <FormField label={t("organization.fields.description", { defaultValue: "Description" })} fullWidth><TextArea value={form.description} readonly={readOnly} disabled={busy} rows={4} accessibleName={t("organization.fields.description", { defaultValue: "Description" })} onInput={(e) => change("description", readValue(e))} /></FormField>
                </div>
            </div>
            <div style={{ display: activeTab === "documents" ? "block" : "none" }}><DocumentManager title={t("organization.tabs.documents", { defaultValue: "Documents" })} targetType="ORG" targetId={value?.id || null} readOnly={readOnly} showActions={!readOnly} busy={busy} persistenceMode="PARENT_SAVE" onDirtyChange={onDocumentDirtyChange} onDraftStateChange={setDocumentDraft} /></div>
        </div>

        <div style={FOOTER_STYLE}>
            {mode === "view" ? <Button design="Emphasized" disabled={busy || !onEdit} onClick={onEdit}>{t("common.edit", { defaultValue: "Edit" })}</Button> : <Button design="Emphasized" disabled={saveDisabled} onClick={() => void submit()}>{t("common.save", { defaultValue: "Save" })}</Button>}
            <Button design="Transparent" disabled={busy} onClick={onCancel}>{mode === "view" ? t("common.close", { defaultValue: "Close" }) : t("common.cancel", { defaultValue: "Cancel" })}</Button>
        </div>

        <ParentValueHelpDialog open={parentDialogOpen} items={allItems} currentId={value?.id ?? null} selectedParentId={form.parentOrganizationId} busy={busy} onClose={() => !busy && setParentDialogOpen(false)} onSelect={(id) => { change("parentOrganizationId", id); setParentDialogOpen(false); }} />
    </div>;
}
