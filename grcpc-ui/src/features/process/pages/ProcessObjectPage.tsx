import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Input, Label, MessageStrip, Option, Select, Tab, TextArea, Title } from "@ui5/webcomponents-react";

import { DocumentManager, type DocumentLinkTargetType } from "@/features/document";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker } from "@/shared/components/PersianDatePicker";
import { formatPersianDate, formatPersianDateTime, toEnglishDigits } from "@/shared/utils/date.utils";
import type { ProcessMoveCommand, ProcessNode, ProcessNodeCreate, ProcessNodeType, ProcessNodeUpdate } from "../domain/process.model";
import { buildTree, collectDescendantIds } from "../utils/process.tree";

export type ProcessObjectMode = "create" | "edit" | "view";
export type ProcessTabKey = "general" | "documents";

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
    onErrorClose?: () => void;
    onSubmit: (payload: ProcessNodeCreate | ProcessNodeUpdate) => Promise<boolean>;
    onMove?: (payload: ProcessMoveCommand) => Promise<boolean>;
    onCancel: () => void;
    onEdit?: () => void;
    onActiveTabChange?: (tab: ProcessTabKey) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onDocumentDirtyChange?: (dirty: boolean) => void;
}

const ROOT_STYLE: CSSProperties = { display: "grid", gap: "0.75rem", minWidth: 0, maxWidth: "100%", background: "var(--sapBackgroundColor)" };
const HEADER_STYLE: CSSProperties = { border: "1px solid var(--sapGroup_ContentBorderColor)", background: "var(--sapGroup_ContentBackground)" };
const HEADER_TITLE_STYLE: CSSProperties = { padding: "0.5rem 1rem", borderBottom: "1px solid var(--sapGroup_ContentBorderColor)", background: "var(--sapList_HeaderBackground)", fontWeight: 700 };
const HEADER_GRID_STYLE: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.35rem 2rem", padding: "0.75rem 1rem" };
const HEADER_ROW_STYLE: CSSProperties = { display: "grid", gridTemplateColumns: "8rem minmax(0, 1fr)", gap: "0.5rem", alignItems: "center" };
const FORM_GRID_STYLE: CSSProperties = { display: "grid", gap: "1rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };
const FIELD_STYLE: CSSProperties = { display: "grid", gap: "0.35rem" };
const BODY_STYLE: CSSProperties = { border: "1px solid var(--sapGroup_ContentBorderColor)", minHeight: "22rem", padding: "1rem" };
const FOOTER_STYLE: CSSProperties = { display: "flex", justifyContent: "center", gap: "2rem", paddingTop: "1rem" };

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
    return mode === "create" ? { ...common, nodeType: form.nodeType, code: form.code.trim().toUpperCase(), parentId: form.parentId } : { ...common, status: form.status };
}

function readValue(event: unknown): string { return (event as { target?: { value?: string } }).target?.value ?? ""; }
function selectedDataValue(event: unknown, fallback: string): string { return (event as { detail?: { selectedOption?: { getAttribute?: (name: string) => string | null } } }).detail?.selectedOption?.getAttribute?.("data-value") ?? fallback; }
function optional(value: string): string | null { return value.trim() || null; }
function nodeTypeLabel(type: ProcessNodeType, t: ReturnType<typeof useTranslation>["t"]) { return type === "PROCESS" ? t("process.nodeType.process", { defaultValue: "Process" }) : t("process.nodeType.subProcess", { defaultValue: "Subprocess" }); }
function documentTarget(type: ProcessNodeType): DocumentLinkTargetType { return type === "PROCESS" ? "CENTRAL_PROCESS" : "CENTRAL_SUBPROCESS"; }

function HeaderItem({ label, value }: { label: string; value?: string | null }) {
    return <div style={HEADER_ROW_STYLE}><strong>{label}:</strong><span style={{ minWidth: 0, wordBreak: "break-word" }}>{value?.trim() || "-"}</span></div>;
}
function FormField({ label, required, fullWidth, children }: { label: string; required?: boolean; fullWidth?: boolean; children: ReactNode }) {
    return <div style={{ ...FIELD_STYLE, ...(fullWidth ? { gridColumn: "1 / -1" } : undefined) }}><Label showColon required={required}>{label}</Label>{children}</div>;
}

export default function ProcessObjectPage({ mode, allItems, value, parent, requestedNodeType, activeTab: controlledTab, busy = false, error, onErrorClose, onSubmit, onMove, onCancel, onEdit, onActiveTabChange, onDirtyChange, onDocumentDirtyChange }: ProcessObjectPageProps) {
    const { t } = useTranslation();
    const initial = toFormState(value, parent, requestedNodeType);
    const [form, setForm] = useState(initial);
    const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(initial, mode)));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [internalTab, setInternalTab] = useState<ProcessTabKey>("general");
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [moveParentId, setMoveParentId] = useState<string | null>(value?.parentId ?? null);
    const scope = mode === "create" ? `CREATE:${requestedNodeType ?? "PROCESS"}:${parent?.id ?? "ROOT"}` : value?.id ?? "EMPTY";
    const scopeRef = useRef(scope);
    const dirty = JSON.stringify(normalized(form, mode)) !== baseline;
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
                setMoveParentId(value?.parentId ?? null);
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
    const parentLabel = selectedParent ? `${selectedParent.code} - ${selectedParent.title}` : t("process.parent.none", { defaultValue: "No parent" });
    const statusLabel = form.status === "ACTIVE" ? t("common.active", { defaultValue: "Active" }) : t("common.inactive", { defaultValue: "Inactive" });
    const change = <K extends keyof ProcessFormState>(key: K, next: ProcessFormState[K]) => setForm((current) => ({ ...current, [key]: next }));

    const validate = () => {
        if (mode === "create" && !form.code.trim()) return setValidationError(t("process.validation.codeRequired", { defaultValue: "Code is required" })), false;
        if (!form.title.trim()) return setValidationError(t("process.validation.titleRequired", { defaultValue: "Title is required" })), false;
        if (parseSortOrder(form.sortOrder) === null) return setValidationError(t("process.validation.sortOrderInvalid", { defaultValue: "Sort order must be a non-negative integer" })), false;
        if (form.nodeType === "SUBPROCESS" && !form.parentId) return setValidationError(t("process.validation.processRequired", { defaultValue: "Owning process is required" })), false;
        if (form.validFrom && form.validTo && form.validFrom > form.validTo) return setValidationError(t("process.validation.invalidValidityRange", { defaultValue: "Invalid validity range" })), false;
        setValidationError(null); return true;
    };

    const submit = async () => {
        if (readOnly || !validate()) return;
        const common = { title: form.title.trim(), sortOrder: parseSortOrder(form.sortOrder) ?? 0, description: optional(form.description), validFrom: optional(form.validFrom), validTo: optional(form.validTo) };
        const payload = mode === "create"
            ? { ...common, nodeType: form.nodeType, code: form.code.trim(), parentId: form.parentId } satisfies ProcessNodeCreate
            : { ...common, version: value?.version ?? 0, status: form.status } satisfies ProcessNodeUpdate;
        if (await onSubmit(payload)) { setBaseline(JSON.stringify(normalized(form, mode))); onDirtyChange?.(false); }
    };

    const moveInvalid = !value || (value.nodeType === "SUBPROCESS" && !moveParentId) || (moveParentId !== null && !processParents.some((item) => item.id === moveParentId));
    const confirmMove = async () => {
        if (!value || !onMove || moveInvalid || moveParentId === value.parentId) return;
        if (await onMove({ parentId: moveParentId, version: value.version })) { setForm((current) => ({ ...current, parentId: moveParentId })); setMoveDialogOpen(false); }
    };

    return <div style={ROOT_STYLE}>
        <div style={HEADER_STYLE}>
            <div style={HEADER_TITLE_STYLE}><Title level="H4">{mode === "create" ? t("process.object.createModalTitle", { defaultValue: "Create" }) : form.title}</Title></div>
            <div style={HEADER_GRID_STYLE}>
                <HeaderItem label={t("process.fields.name", { defaultValue: "Title" })} value={form.title} />
                <HeaderItem label={t("process.fields.code", { defaultValue: "Code" })} value={form.code} />
                <HeaderItem label={t("process.fields.nodeType", { defaultValue: "Node type" })} value={nodeTypeLabel(form.nodeType, t)} />
                <HeaderItem label={t("process.fields.status", { defaultValue: "Status" })} value={statusLabel} />
                <HeaderItem label={form.nodeType === "PROCESS" ? t("process.fields.parentProcess", { defaultValue: "Parent process" }) : t("process.fields.owningProcess", { defaultValue: "Owning process" })} value={parentLabel} />
                <HeaderItem label={t("process.fields.validity", { defaultValue: "Validity" })} value={`${formatPersianDate(form.validFrom)} - ${formatPersianDate(form.validTo)}`} />
                <HeaderItem label={t("process.fields.createdAt", { defaultValue: "Created at" })} value={formatPersianDateTime(value?.createdAt)} />
                <HeaderItem label={t("process.fields.updatedAt", { defaultValue: "Updated at" })} value={formatPersianDateTime(value?.updatedAt)} />
            </div>
        </div>

        <DetailTabContainer onTabSelect={(event) => { const key = event.detail.tab.getAttribute("data-tab-key") as ProcessTabKey | null; if (key) { if (!controlledTab) setInternalTab(key); onActiveTabChange?.(key); } }}>
            <Tab text={t("process.tabs.general", { defaultValue: "General Information" })} selected={activeTab === "general"} data-tab-key="general" />
            <Tab text={t("process.tabs.documents", { defaultValue: "Documents" })} selected={activeTab === "documents"} data-tab-key="documents" />
        </DetailTabContainer>

        {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}
        <div style={BODY_STYLE}>
            <div style={{ display: activeTab === "general" ? "block" : "none" }}><div style={FORM_GRID_STYLE}>
                <FormField label={t("process.fields.code", { defaultValue: "Code" })} required><Input value={form.code} readonly={mode !== "create"} disabled={busy} onInput={(e) => change("code", readValue(e))} /></FormField>
                <FormField label={t("process.fields.name", { defaultValue: "Title" })} required><Input value={form.title} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => change("title", readValue(e))} /></FormField>
                <FormField label={t("process.fields.nodeType", { defaultValue: "Node type" })}><Input value={nodeTypeLabel(form.nodeType, t)} readonly /></FormField>
                <FormField label={t("process.fields.status", { defaultValue: "Status" })}><Select value={form.status} disabled={mode !== "edit" || busy} accessibleName={t("process.fields.status", { defaultValue: "Status" })} onChange={(e) => change("status", readValue(e) as "ACTIVE" | "INACTIVE")}><Option value="ACTIVE">{t("common.active", { defaultValue: "Active" })}</Option><Option value="INACTIVE">{t("common.inactive", { defaultValue: "Inactive" })}</Option></Select></FormField>
                <FormField label={form.nodeType === "PROCESS" ? t("process.fields.parentProcess", { defaultValue: "Parent process" }) : t("process.fields.owningProcess", { defaultValue: "Owning process" })} required={form.nodeType === "SUBPROCESS"}><Select disabled={mode !== "create" || busy} accessibleName={t("process.fields.parentProcess", { defaultValue: "Parent process" })} onChange={(e) => change("parentId", selectedDataValue(e, form.parentId ?? "") || null)}>{form.nodeType === "PROCESS" ? <Option data-value="" selected={!form.parentId}>{t("process.parent.none", { defaultValue: "No parent" })}</Option> : null}{processParents.map((item) => <Option key={item.id} data-value={item.id} selected={item.id === form.parentId}>{item.code} - {item.title}</Option>)}</Select></FormField>
                <FormField label={t("process.fields.sortOrder", { defaultValue: "Sort order" })}><Input value={form.sortOrder} readonly={readOnly} disabled={busy} onInput={(e) => change("sortOrder", readValue(e))} /></FormField>
                <FormField label={t("process.fields.validFrom", { defaultValue: "Valid from" })}><PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("process.fields.validFrom", { defaultValue: "Valid from" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validFrom", next)} /></FormField>
                <FormField label={t("process.fields.validTo", { defaultValue: "Valid to" })}><PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("process.fields.validTo", { defaultValue: "Valid to" })} invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "Invalid date" })} onChange={(next) => change("validTo", next)} /></FormField>
                <FormField label={t("process.fields.description", { defaultValue: "Description" })} fullWidth><TextArea rows={5} value={form.description} readonly={readOnly} disabled={busy} onInput={(e) => change("description", readValue(e))} /></FormField>
            </div></div>
            <div style={{ display: activeTab === "documents" ? "block" : "none" }}><DocumentManager title={t("process.tabs.documents", { defaultValue: "Documents" })} targetType={documentTarget(form.nodeType)} targetId={value?.id ?? null} readOnly={readOnly} showActions={!readOnly} onDirtyChange={onDocumentDirtyChange} saveFirstMessage={t("process.documents.saveFirst", { defaultValue: "Save the process item before finalizing documents." })} /></div>
        </div>

        <div style={FOOTER_STYLE}>{mode === "view" ? <><Button design="Emphasized" disabled={busy || !onEdit} onClick={onEdit}>{t("common.edit", { defaultValue: "Edit" })}</Button><Button disabled={busy || !onMove} onClick={() => { setMoveParentId(value?.parentId ?? null); setMoveDialogOpen(true); }}>{t("process.move.action", { defaultValue: "Move" })}</Button></> : <Button design="Emphasized" disabled={busy} onClick={() => void submit()}>{t("common.save", { defaultValue: "Save" })}</Button>}<Button design="Transparent" disabled={busy} onClick={onCancel}>{mode === "view" ? t("common.close", { defaultValue: "Close" }) : t("common.cancel", { defaultValue: "Cancel" })}</Button></div>

        <Dialog open={moveDialogOpen} accessibleName={t("process.move.title", { defaultValue: "Move" })} onClose={() => !busy && setMoveDialogOpen(false)}><ModalDialogHeader title={t("process.move.title", { defaultValue: "Move" })} onClose={() => !busy && setMoveDialogOpen(false)} /><div style={{ display: "grid", gap: "1rem", minWidth: "28rem" }}><Select disabled={busy} onChange={(e) => setMoveParentId(selectedDataValue(e, moveParentId ?? "") || null)}>{value?.nodeType === "PROCESS" ? <Option data-value="" selected={!moveParentId}>{t("process.parent.none", { defaultValue: "No parent" })}</Option> : null}{processParents.map((item) => <Option key={item.id} data-value={item.id} selected={item.id === moveParentId}>{item.code} - {item.title}</Option>)}</Select><div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}><Button design="Emphasized" disabled={busy || !onMove || moveInvalid || moveParentId === value?.parentId} onClick={() => void confirmMove()}>{t("process.move.confirm", { defaultValue: "Move" })}</Button><Button design="Transparent" disabled={busy} onClick={() => setMoveDialogOpen(false)}>{t("common.cancel", { defaultValue: "Cancel" })}</Button></div></div></Dialog>
    </div>;
}
