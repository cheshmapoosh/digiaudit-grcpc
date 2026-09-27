import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Button, Input, Label, MessageStrip, Option, Select, TextArea, Title,
} from "@ui5/webcomponents-react";
import { DocumentManager } from "@/features/document";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { HttpError } from "@/shared/infra/http.client";
import type {
    LocalBaseRow, LocalPage, LocalRows, LocalSectionKey, LocalStatus,
} from "../domain/local.model";
import { LOCAL_DOCUMENT_TARGETS } from "../domain/local.model";
import type { LocalSectionSpec } from "../domain/local.sections";
import { localApi, type LocalRouteOwner } from "../infra/local.api.repo";
import LocalOptionPicker from "./LocalOptionPicker";

interface Props {
    spec: LocalSectionSpec;
    organizationId: string;
    contextId: string | null;
    policyTargetId: string | null;
    active: boolean;
    selectedRowId: string | null;
    statusFilter: LocalStatus | null;
    canWrite: boolean;
    onSelectRow: (id: string | null) => void;
    onDirtyChange: (section: LocalSectionKey, dirty: boolean) => void;
    onContextCreated: (id: string) => void;
    resetKey: number;
}

type Draft = Record<string, string | null>;
const EMPTY_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

function textValue(row: LocalBaseRow, field: string): string | null {
    const value = (row as unknown as Record<string, unknown>)[field];
    return typeof value === "string" ? value : null;
}

function rowTitle(row: LocalBaseRow, spec: LocalSectionSpec): string {
    if (spec.key.includes("coverages")) {
        const pair = ["riskTemplateCode", "requirementCode", "controlCode",
            "controlObjectiveCode"].map((field) => textValue(row, field))
            .filter(Boolean).join(" — ");
        if (pair) return pair;
    }
    const first = spec.identityFields[0];
    const codeField = first.name.replace(/Id$/, "Code");
    const labelField = first.name.replace(/Id$/, "Label");
    const code = textValue(row, codeField);
    const label = textValue(row, labelField);
    return [code, label].filter(Boolean).join(" — ")
        || textValue(row, "subprocessLabel")
        || textValue(row, "policyLabel")
        || row.id;
}

function draftFromRow(row: LocalBaseRow, spec: LocalSectionSpec): Draft {
    const result: Draft = {
        validFrom: row.validFrom ?? "",
        validTo: row.validTo ?? "",
    };
    for (const field of spec.identityFields) result[field.name] = textValue(row, field.name);
    if (spec.centralReferenceField) {
        result.sourceType = textValue(row, "sourceType");
        result[spec.centralReferenceField] = textValue(row, spec.centralReferenceField);
    }
    if (spec.noteField) result[spec.noteField] = textValue(row, spec.noteField) ?? "";
    if (spec.key === "control-scopes") {
        for (const field of ["actualOwnerId", "frequencyCode", "executionMethodCode", "testMethodCode"]) {
            result[field] = textValue(row, field);
        }
    }
    if (spec.policy) {
        result.scopeAction = textValue(row, "scopeAction");
        if (spec.key === "organization-policies") {
            result.propagationMode = textValue(row, "propagationMode");
        }
    }
    return result;
}

function emptyDraft(spec: LocalSectionSpec): Draft {
    return draftFromRow({
        id: "", organizationId: "", organizationCode: "", organizationLabel: "",
        status: "ACTIVE", validFrom: null, validTo: null, version: 0,
        createdAt: "", createdBy: "", updatedAt: "", updatedBy: "",
        deletedAt: null, deletedBy: null,
    }, spec);
}

export default function LocalSectionPane({
    spec, organizationId, contextId, policyTargetId, active, selectedRowId,
    statusFilter, canWrite, onSelectRow, onDirtyChange, onContextCreated, resetKey,
}: Props) {
    const { t } = useTranslation();
    const owner = useMemo<LocalRouteOwner>(() => ({
        organizationId, contextId, policyTargetId,
    }), [organizationId, contextId, policyTargetId]);
    const ownerReady = spec.key === "contexts" || spec.key === "organization-policies"
        || (spec.key === "control-policies" || spec.key === "requirement-policies"
            ? Boolean(contextId && policyTargetId) : Boolean(contextId));
    const [listPage, setListPage] = useState(0);
    const [list, setList] = useState<LocalPage<LocalRows[LocalSectionKey]> | null>(null);
    const [row, setRow] = useState<LocalBaseRow | null>(null);
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState<Draft>(() => emptyDraft(spec));
    const [baseline, setBaseline] = useState("");
    const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
    const [documentDirty, setDocumentDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [pendingSelection, setPendingSelection] = useState<string | null | undefined>();
    const [settings, setSettings] = useState<{
        frequencyCodes: string[]; executionMethodCodes: string[]; testMethodCodes: string[];
    } | null>(null);
    const lastReset = useRef(resetKey);
    const invalidDates = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
    const draftDirty = creating || (row !== null && JSON.stringify(draft) !== baseline);
    const dirty = draftDirty || invalidDates || documentDirty;

    useEffect(() => { onDirtyChange(spec.key, dirty); }, [dirty, onDirtyChange, spec.key]);

    useEffect(() => {
        if (lastReset.current === resetKey) return;
        lastReset.current = resetKey;
        queueMicrotask(() => {
            setCreating(false);
            setRow(null);
            setDraft(emptyDraft(spec));
            setBaseline("");
            setDateDrafts({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
            setDocumentDirty(false);
        });
    }, [resetKey, spec]);

    const reloadList = useCallback(async () => {
        if (!active || !ownerReady) return;
        setLoading(true);
        try {
            const result = await localApi.list(spec.key, owner, statusFilter, listPage);
            setList(result);
            setError(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message
                : t("local.errors.list", { defaultValue: "فهرست بارگذاری نشد." }));
        } finally {
            setLoading(false);
        }
    }, [active, ownerReady, spec.key, owner, statusFilter, listPage, t]);

    useEffect(() => { void reloadList(); }, [reloadList]);

    useEffect(() => {
        if (!active || !ownerReady || !selectedRowId || creating || dirty) return;
        let current = true;
        void localApi.detail(spec.key, owner, selectedRowId)
            .then((result) => {
                if (!current) return;
                const next = draftFromRow(result, spec);
                setRow(result);
                setDraft(next);
                setBaseline(JSON.stringify(next));
                setError(null);
            })
            .catch((cause: unknown) => {
                if (!current) return;
                setError(cause instanceof Error ? cause.message
                    : t("local.errors.detail", { defaultValue: "ردیف انتخاب‌شده یافت نشد." }));
            });
        return () => { current = false; };
    }, [active, ownerReady, selectedRowId, creating, dirty, spec, owner, t]);

    useEffect(() => {
        if (spec.key !== "control-scopes" || !active || settings) return;
        void localApi.controlSettings().then(setSettings).catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message
                : t("local.errors.options", { defaultValue: "گزینه‌ها بارگذاری نشدند." }));
        });
    }, [active, settings, spec.key, t]);

    const change = (field: string, value: string | null) => {
        setDraft((previous) => {
            const next = { ...previous, [field]: value };
            if (spec.identityFields.some((identity) => identity.name === field)
                && spec.centralReferenceField) next[spec.centralReferenceField] = null;
            return next;
        });
    };

    const resetEditor = () => {
        setCreating(false);
        setRow(null);
        setDraft(emptyDraft(spec));
        setBaseline("");
        setDateDrafts({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
        setDocumentDirty(false);
    };

    const select = (id: string | null) => {
        if (dirty) {
            setPendingSelection(id);
            return;
        }
        resetEditor();
        onSelectRow(id);
    };

    const confirmDiscard = () => {
        const id = pendingSelection;
        setPendingSelection(undefined);
        resetEditor();
        if (id === "__CREATE__") {
            onSelectRow(null);
            setCreating(true);
        } else if (id !== undefined) onSelectRow(id);
    };

    const startCreate = () => {
        if (dirty) {
            setPendingSelection("__CREATE__");
            return;
        }
        onSelectRow(null);
        setRow(null);
        setDraft(emptyDraft(spec));
        setBaseline("");
        setCreating(true);
    };

    const requiredIdentity = spec.identityFields.every((field) => Boolean(draft[field.name]));
    const sourceReady = !spec.centralReferenceField || (draft.sourceType
        && (draft.sourceType === "LOCAL_ADDED"
            || Boolean(draft[spec.centralReferenceField])));
    const policyReady = !spec.policy || Boolean(draft.scopeAction)
        && (spec.key !== "organization-policies" || Boolean(draft.propagationMode));
    const validityReady = !draft.validFrom || !draft.validTo
        || draft.validFrom <= draft.validTo;
    const saveReady = requiredIdentity && sourceReady && policyReady
        && validityReady && !invalidDates && !busy;

    const validity = () => ({
        validFrom: draft.validFrom || null,
        validTo: draft.validTo || null,
    });

    const save = async () => {
        if (!saveReady || (!creating && !row)) return;
        setBusy(true);
        setError(null);
        try {
            const dates = validity();
            let result: { entityId: string; row: LocalBaseRow };
            if (creating) {
                switch (spec.key) {
                    case "contexts":
                        result = await localApi.create("contexts", owner, {
                            ...dates, organizationId, subprocessId: draft.subprocessId!,
                            contextNote: draft.contextNote || null,
                        }); break;
                    case "control-scopes":
                        result = await localApi.create("control-scopes", owner, {
                            ...dates, controlId: draft.controlId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralControlScopeId: draft.centralControlScopeId || null,
                            actualOwnerId: draft.actualOwnerId || null,
                            frequencyCode: draft.frequencyCode || null,
                            executionMethodCode: draft.executionMethodCode || null,
                            testMethodCode: draft.testMethodCode || null,
                            localContextNote: draft.localContextNote || null,
                        }); break;
                    case "risk-scopes":
                        result = await localApi.create("risk-scopes", owner, {
                            ...dates, riskTemplateId: draft.riskTemplateId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralRiskScopeId: draft.centralRiskScopeId || null,
                        }); break;
                    case "control-objective-scopes":
                        result = await localApi.create("control-objective-scopes", owner, {
                            ...dates, controlObjectiveId: draft.controlObjectiveId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralControlObjectiveScopeId: draft.centralControlObjectiveScopeId || null,
                        }); break;
                    case "requirement-scopes":
                        result = await localApi.create("requirement-scopes", owner, {
                            ...dates, requirementId: draft.requirementId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralRequirementScopeId: draft.centralRequirementScopeId || null,
                        }); break;
                    case "risk-control-coverages":
                        result = await localApi.create("risk-control-coverages", owner, {
                            ...dates, localRiskScopeId: draft.localRiskScopeId!,
                            localControlScopeId: draft.localControlScopeId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralRiskControlCoverageId: draft.centralRiskControlCoverageId || null,
                            coverageNote: draft.coverageNote || null,
                        }); break;
                    case "risk-control-objective-coverages":
                        result = await localApi.create("risk-control-objective-coverages", owner, {
                            ...dates, localRiskScopeId: draft.localRiskScopeId!,
                            localControlObjectiveScopeId: draft.localControlObjectiveScopeId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralRiskControlObjectiveCoverageId:
                                draft.centralRiskControlObjectiveCoverageId || null,
                            coverageNote: draft.coverageNote || null,
                        }); break;
                    case "control-control-objective-coverages":
                        result = await localApi.create("control-control-objective-coverages", owner, {
                            ...dates, localControlScopeId: draft.localControlScopeId!,
                            localControlObjectiveScopeId: draft.localControlObjectiveScopeId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralControlControlObjectiveCoverageId:
                                draft.centralControlControlObjectiveCoverageId || null,
                            coverageNote: draft.coverageNote || null,
                        }); break;
                    case "requirement-control-coverages":
                        result = await localApi.create("requirement-control-coverages", owner, {
                            ...dates, localRequirementScopeId: draft.localRequirementScopeId!,
                            localControlScopeId: draft.localControlScopeId!,
                            sourceType: draft.sourceType as "LOCAL_ADDED" | "INHERITED_FROM_CENTRAL",
                            centralRequirementControlCoverageId:
                                draft.centralRequirementControlCoverageId || null,
                            coverageNote: draft.coverageNote || null,
                        }); break;
                    case "organization-policies":
                        result = await localApi.create("organization-policies", owner, {
                            ...dates, organizationId, policyId: draft.policyId!,
                            scopeAction: draft.scopeAction as "INCLUDE" | "EXCLUDE",
                            propagationMode: draft.propagationMode as "DIRECT_ONLY" | "INCLUDE_DESCENDANTS",
                        }); break;
                    case "context-policies":
                        result = await localApi.create("context-policies", owner, {
                            ...dates, policyId: draft.policyId!,
                            scopeAction: draft.scopeAction as "INCLUDE" | "EXCLUDE",
                        }); break;
                    case "control-policies":
                        result = await localApi.create("control-policies", owner, {
                            ...dates, policyId: draft.policyId!,
                            scopeAction: draft.scopeAction as "INCLUDE" | "EXCLUDE",
                        }); break;
                    case "requirement-policies":
                        result = await localApi.create("requirement-policies", owner, {
                            ...dates, policyId: draft.policyId!,
                            scopeAction: draft.scopeAction as "INCLUDE" | "EXCLUDE",
                        }); break;
                }
            } else {
                const version = row!.version;
                switch (spec.key) {
                    case "contexts":
                        result = await localApi.update("contexts", owner, row!.id, {
                            ...dates, version, contextNote: draft.contextNote || null,
                        }); break;
                    case "control-scopes":
                        result = await localApi.update("control-scopes", owner, row!.id, {
                            ...dates, version, actualOwnerId: draft.actualOwnerId || null,
                            frequencyCode: draft.frequencyCode || null,
                            executionMethodCode: draft.executionMethodCode || null,
                            testMethodCode: draft.testMethodCode || null,
                            localContextNote: draft.localContextNote || null,
                        }); break;
                    case "risk-scopes": case "control-objective-scopes":
                    case "requirement-scopes":
                        result = await localApi.update(spec.key, owner, row!.id, {
                            ...dates, version,
                        }); break;
                    case "risk-control-coverages": case "risk-control-objective-coverages":
                    case "control-control-objective-coverages":
                    case "requirement-control-coverages":
                        result = await localApi.update(spec.key, owner, row!.id, {
                            ...dates, version, coverageNote: draft.coverageNote || null,
                        }); break;
                    case "organization-policies":
                        result = await localApi.update("organization-policies", owner, row!.id, {
                            ...dates, version,
                            scopeAction: draft.scopeAction as "INCLUDE" | "EXCLUDE",
                            propagationMode: draft.propagationMode as "DIRECT_ONLY" | "INCLUDE_DESCENDANTS",
                        }); break;
                    case "context-policies": case "control-policies":
                    case "requirement-policies":
                        result = await localApi.update(spec.key, owner, row!.id, {
                            ...dates, version,
                            scopeAction: draft.scopeAction as "INCLUDE" | "EXCLUDE",
                        }); break;
                }
            }
            const next = draftFromRow(result.row, spec);
            setRow(result.row);
            setDraft(next);
            setBaseline(JSON.stringify(next));
            setCreating(false);
            setInfo(t("local.saved", { defaultValue: "تغییرات محلی ذخیره شد." }));
            onSelectRow(result.entityId);
            if (spec.key === "contexts") onContextCreated(result.entityId);
            await reloadList();
        } catch (cause) {
            if (cause instanceof HttpError && cause.code === "VERSION_CONFLICT") {
                setError(t("local.errors.stale", {
                    defaultValue: "نسخهٔ ردیف تغییر کرده است. پیش‌نویس شما حفظ شد؛ برای بارگذاری مجدد، انصراف را انتخاب کنید.",
                }));
            } else {
                setError(cause instanceof Error ? cause.message
                    : t("local.errors.save", { defaultValue: "ذخیره انجام نشد." }));
            }
        } finally {
            setBusy(false);
        }
    };

    const lifecycle = async (action: "activate" | "inactivate" | "delete" | "restore") => {
        if (!row || dirty) return;
        setBusy(true);
        setError(null);
        try {
            await localApi.lifecycle(spec.key, owner, row.id, action, row.version);
            const nextRow = await localApi.detail(spec.key, owner, row.id);
            setRow(nextRow);
            const nextDraft = draftFromRow(nextRow, spec);
            setDraft(nextDraft);
            setBaseline(JSON.stringify(nextDraft));
            await reloadList();
            if (action === "delete" && statusFilter !== "DELETED") onSelectRow(null);
            setInfo(t("local.lifecycle.saved", { defaultValue: "وضعیت ردیف به‌روزرسانی شد." }));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message
                : t("local.errors.save", { defaultValue: "عملیات انجام نشد." }));
        } finally {
            setBusy(false);
        }
    };

    const centralReferencePath = contextId && spec.centralReferenceOptions
        ? `organization-subprocess-scopes/${contextId}/${spec.centralReferenceOptions}/options`
        : null;
    const centralReferenceParams: Record<string, string | null> = {
        organizationId,
    };
    for (const identity of spec.identityFields) {
        centralReferenceParams[identity.name] = draft[identity.name] ?? null;
    }
    const centralReferenceReady = spec.identityFields.every((field) => Boolean(draft[field.name]));
    const readOnly = !canWrite || Boolean(row && row.status === "DELETED");

    if (!active) return null;
    if (!ownerReady) {
        return <MessageStrip design="Information" hideCloseButton>
            {t("local.selectContextOrTarget", {
                defaultValue: "ابتدا زمینه یا هدف محلی را انتخاب کنید.",
            })}
        </MessageStrip>;
    }

    return <div style={{ display: "grid", gap: "0.8rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "0.5rem", flexWrap: "wrap" }}>
            <Title level="H5">{t(spec.labelKey, { defaultValue: spec.labelFa })}</Title>
            {canWrite ? <Button design="Emphasized" disabled={busy}
                onClick={startCreate}>{t("local.create", { defaultValue: "ایجاد ردیف" })}</Button> : null}
        </div>
        {loading ? <MessageStrip design="Information" hideCloseButton>
            {t("local.loading", { defaultValue: "در حال بارگذاری..." })}
        </MessageStrip> : null}
        {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
        {info ? <MessageStrip design="Positive" onClose={() => setInfo(null)}>{info}</MessageStrip> : null}
        <div style={{ display: "grid", gap: "0.4rem" }}>
            {(list?.items ?? []).map((item) =>
                <Button key={item.id} design={selectedRowId === item.id ? "Emphasized" : "Transparent"}
                    onClick={() => select(item.id)}>
                    {rowTitle(item, spec)} — {t(`local.status.${item.status}`, { defaultValue: item.status })}
                </Button>)}
            {list && list.items.length === 0 ? <MessageStrip design="Information" hideCloseButton>
                {t("local.empty", { defaultValue: "ردیفی برای این بخش وجود ندارد." })}
            </MessageStrip> : null}
            {list ? <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <Button design="Transparent" disabled={listPage === 0 || loading}
                    onClick={() => setListPage((page) => page - 1)}>
                    {t("local.options.previous", { defaultValue: "قبلی" })}
                </Button>
                <span>{list.page + 1} / {Math.max(1, list.totalPages)}</span>
                <Button design="Transparent" disabled={loading || listPage + 1 >= list.totalPages}
                    onClick={() => setListPage((page) => page + 1)}>
                    {t("local.options.next", { defaultValue: "بعدی" })}
                </Button>
            </div> : null}
        </div>
        {(creating || row) ? <div style={{ display: "grid", gap: "0.75rem",
            borderTop: "1px solid var(--sapGroup_ContentBorderColor)", paddingTop: "0.75rem" }}>
            {row ? <MessageStrip design="Information" hideCloseButton>
                {t("local.rowState", { defaultValue: "وضعیت ذخیره‌شده" })}: {row.status}
                {" · "}{t("local.version", { defaultValue: "نسخه" })}: {row.version}
                {textValue(row, "sourceType") ? ` · ${textValue(row, "sourceType")}` : ""}
                {textValue(row, "centralReferenceStatus")
                    ? ` · ${textValue(row, "centralReferenceStatus")}` : ""}
            </MessageStrip> : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.75rem" }}>
                {spec.identityFields.map((field) => {
                    const path = field.local
                        ? contextId ? `organization-subprocess-scopes/${contextId}/${field.options}` : null
                        : field.options;
                    return creating ? <LocalOptionPicker key={field.name}
                        label={t(field.labelKey, { defaultValue: field.labelFa })}
                        path={path} params={field.local ? {
                            organizationId, lifecycleStatus: "ACTIVE",
                        } : undefined}
                        searchable={!field.local} value={draft[field.name] ?? null}
                        required disabled={busy}
                        onChange={(id) => change(field.name, id)} />
                        : <div key={field.name} style={{ display: "grid", gap: "0.3rem" }}>
                            <Label>{t(field.labelKey, { defaultValue: field.labelFa })}</Label>
                            <Input readonly value={textValue(row!, field.name.replace(/Id$/, "Label"))
                                ?? draft[field.name] ?? ""} />
                        </div>;
                })}
                {spec.centralReferenceField ? <>
                    <div style={{ display: "grid", gap: "0.3rem" }}>
                        <Label required>{t("local.fields.sourceType", { defaultValue: "نوع منبع" })}</Label>
                        <Select value={draft.sourceType ?? ""} disabled={!creating || busy}
                            accessibleName={t("local.fields.sourceType", { defaultValue: "نوع منبع" })}
                            onChange={(event) => {
                                change("sourceType", event.target.value || null);
                                change(spec.centralReferenceField!, null);
                            }}>
                            <Option value="">{t("local.options.none", { defaultValue: "انتخاب نشده" })}</Option>
                            <Option value="INHERITED_FROM_CENTRAL">
                                {t("local.source.inherited", { defaultValue: "موروث از مرکزی" })}</Option>
                            <Option value="LOCAL_ADDED">
                                {t("local.source.added", { defaultValue: "افزودهٔ محلی" })}</Option>
                        </Select>
                    </div>
                    {draft.sourceType === "INHERITED_FROM_CENTRAL"
                        ? creating
                            ? <LocalOptionPicker label={t("local.fields.centralReference", {
                                defaultValue: "رابطهٔ مرکزی",
                            })} path={centralReferenceReady ? centralReferencePath : null}
                                params={centralReferenceParams}
                                value={draft[spec.centralReferenceField] ?? null}
                                required disabled={busy}
                                onChange={(id) => change(spec.centralReferenceField!, id)} />
                            : <div style={{ display: "grid", gap: "0.3rem" }}>
                                <Label>{t("local.fields.centralReference", {
                                    defaultValue: "رابطهٔ مرکزی",
                                })}</Label>
                                <Input readonly value={draft[spec.centralReferenceField] ?? ""} />
                            </div>
                        : null}
                </> : null}
                {spec.policy ? <>
                    <div style={{ display: "grid", gap: "0.3rem" }}>
                        <Label required>{t("local.fields.scopeAction", { defaultValue: "تصمیم" })}</Label>
                        <Select value={draft.scopeAction ?? ""} disabled={readOnly || busy}
                            accessibleName={t("local.fields.scopeAction", { defaultValue: "تصمیم" })}
                            onChange={(event) => change("scopeAction", event.target.value || null)}>
                            <Option value="">{t("local.options.none", { defaultValue: "انتخاب نشده" })}</Option>
                            <Option value="INCLUDE">{t("local.action.include", { defaultValue: "شامل" })}</Option>
                            <Option value="EXCLUDE">{t("local.action.exclude", { defaultValue: "مستثنا" })}</Option>
                        </Select>
                    </div>
                    {spec.key === "organization-policies" ? <div style={{ display: "grid", gap: "0.3rem" }}>
                        <Label required>{t("local.fields.propagationMode", {
                            defaultValue: "نحوهٔ انتشار",
                        })}</Label>
                        <Select value={draft.propagationMode ?? ""} disabled={readOnly || busy}
                            accessibleName={t("local.fields.propagationMode", {
                                defaultValue: "نحوهٔ انتشار",
                            })}
                            onChange={(event) => change("propagationMode", event.target.value || null)}>
                            <Option value="">{t("local.options.none", { defaultValue: "انتخاب نشده" })}</Option>
                            <Option value="DIRECT_ONLY">
                                {t("local.propagation.direct", { defaultValue: "فقط مستقیم" })}</Option>
                            <Option value="INCLUDE_DESCENDANTS">
                                {t("local.propagation.descendants", { defaultValue: "شامل زیرمجموعه‌ها" })}</Option>
                        </Select>
                    </div> : null}
                </> : null}
                {spec.key === "control-scopes" ? <>
                    <LocalOptionPicker label={t("local.fields.actualOwner", {
                        defaultValue: "مسئول واقعی",
                    })} path={canWrite ? "options/control-owners" : null}
                        value={draft.actualOwnerId ?? null}
                        currentLabel={row ? textValue(row, "actualOwnerLabel") : null}
                        disabled={readOnly || busy}
                        onChange={(id) => change("actualOwnerId", id)} />
                    {(["frequencyCode", "executionMethodCode", "testMethodCode"] as const)
                        .map((field) => <div key={field} style={{ display: "grid", gap: "0.3rem" }}>
                            <Label>{t(`local.fields.${field}`, { defaultValue: field })}</Label>
                            <Select value={draft[field] ?? ""} disabled={readOnly || busy}
                                accessibleName={t(`local.fields.${field}`, { defaultValue: field })}
                                onChange={(event) => change(field, event.target.value || null)}>
                                <Option value="">{t("local.options.none", { defaultValue: "انتخاب نشده" })}</Option>
                                {(settings?.[`${field.slice(0, -4)}Codes` as keyof typeof settings]
                                    ?? []).map((code) => <Option key={code} value={code}>{code}</Option>)}
                            </Select>
                        </div>)}
                </> : null}
                <div style={{ display: "grid", gap: "0.3rem" }}>
                    <Label>{t("local.fields.validFrom", { defaultValue: "معتبر از" })}</Label>
                    <PersianDatePicker value={draft.validFrom ?? ""} readonly={readOnly}
                        disabled={busy} accessibleName={t("local.fields.validFrom", {
                            defaultValue: "معتبر از",
                        })} invalidValueMessage={t("common.invalidPersianDate", {
                            defaultValue: "تاریخ نامعتبر",
                        })} onChange={(value) => change("validFrom", value)}
                        onDraftStateChange={(state) => setDateDrafts((previous) => ({
                            ...previous, validFrom: state,
                        }))} />
                </div>
                <div style={{ display: "grid", gap: "0.3rem" }}>
                    <Label>{t("local.fields.validTo", { defaultValue: "معتبر تا" })}</Label>
                    <PersianDatePicker value={draft.validTo ?? ""} readonly={readOnly}
                        disabled={busy} accessibleName={t("local.fields.validTo", {
                            defaultValue: "معتبر تا",
                        })} invalidValueMessage={t("common.invalidPersianDate", {
                            defaultValue: "تاریخ نامعتبر",
                        })} onChange={(value) => change("validTo", value)}
                        onDraftStateChange={(state) => setDateDrafts((previous) => ({
                            ...previous, validTo: state,
                        }))} />
                </div>
                {spec.noteField ? <div style={{ gridColumn: "1 / -1", display: "grid", gap: "0.3rem" }}>
                    <Label>{t("local.fields.note", { defaultValue: "یادداشت محلی" })}</Label>
                    <TextArea value={draft[spec.noteField] ?? ""} readonly={readOnly}
                        disabled={busy} maxlength={1000} rows={3}
                        accessibleName={t("local.fields.note", { defaultValue: "یادداشت محلی" })}
                        onInput={(event) => change(spec.noteField!, event.target.value)} />
                </div> : null}
            </div>
            {!validityReady ? <MessageStrip design="Negative" hideCloseButton>
                {t("local.errors.dateRange", { defaultValue: "بازهٔ اعتبار نامعتبر است." })}
            </MessageStrip> : null}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {!readOnly ? <Button design="Emphasized" disabled={!saveReady}
                    onClick={() => void save()}>{t("common.save", { defaultValue: "ذخیره" })}</Button> : null}
                <Button design="Transparent" disabled={busy} onClick={() => select(null)}>
                    {t("common.cancel", { defaultValue: "انصراف" })}</Button>
                {row && canWrite && !dirty ? <>
                    {row.status === "INACTIVE" ? <Button onClick={() => void lifecycle("activate")}>
                        {t("local.lifecycle.activate", { defaultValue: "فعال‌سازی" })}</Button> : null}
                    {row.status === "ACTIVE" ? <Button onClick={() => void lifecycle("inactivate")}>
                        {t("local.lifecycle.inactivate", { defaultValue: "غیرفعال‌سازی" })}</Button> : null}
                    {row.status !== "DELETED" ? <Button design="Negative"
                        onClick={() => void lifecycle("delete")}>
                        {t("common.delete", { defaultValue: "حذف" })}</Button> : null}
                    {row.status === "DELETED" ? <Button onClick={() => void lifecycle("restore")}>
                        {t("local.lifecycle.restore", { defaultValue: "بازیابی" })}</Button> : null}
                </> : null}
            </div>
            {row && row.status !== "DELETED" ? <DocumentManager
                title={t("local.documents", { defaultValue: "اسناد این ردیف" })}
                targetType={LOCAL_DOCUMENT_TARGETS[spec.key]} targetId={row.id}
                readOnly={!canWrite} showActions={canWrite} persistenceMode="STANDALONE"
                onDirtyChange={setDocumentDirty} /> : null}
        </div> : null}
        <DeleteConfirmDialog open={pendingSelection !== undefined}
            title={t("common.unsavedChanges.title", { defaultValue: "تغییرات ذخیره‌نشده" })}
            message={t("common.unsavedChanges.message", {
                defaultValue: "تغییرات ذخیره نشده‌اند. از آن‌ها صرف‌نظر می‌کنید؟",
            })} onClose={() => setPendingSelection(undefined)}
            onConfirm={confirmDiscard}
            confirmText={t("local.discard", { defaultValue: "صرف‌نظر از تغییرات" })} />
    </div>;
}
