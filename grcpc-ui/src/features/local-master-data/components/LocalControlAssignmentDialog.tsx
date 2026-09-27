import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip, Option, Select, TextArea } from "@ui5/webcomponents-react";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { localApi } from "../infra/local.api.repo";
import LocalOptionPicker from "./LocalOptionPicker";
import type { LocalSource } from "../domain/local.model";

interface Props {
    open: boolean;
    controlId: string;
    onClose: () => void;
}
const EMPTY_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

export default function LocalControlAssignmentDialog({ open, controlId, onClose }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [subprocessId, setSubprocessId] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<LocalSource | null>(null);
    const [centralControlScopeId, setCentralControlScopeId] = useState<string | null>(null);
    const [actualOwnerId, setActualOwnerId] = useState<string | null>(null);
    const [frequencyCode, setFrequencyCode] = useState<string | null>(null);
    const [executionMethodCode, setExecutionMethodCode] = useState<string | null>(null);
    const [testMethodCode, setTestMethodCode] = useState<string | null>(null);
    const [localContextNote, setLocalContextNote] = useState("");
    const [validFrom, setValidFrom] = useState("");
    const [validTo, setValidTo] = useState("");
    const [fromDraft, setFromDraft] = useState(EMPTY_DATE);
    const [toDraft, setToDraft] = useState(EMPTY_DATE);
    const [settings, setSettings] = useState<{
        frequencyCodes: string[]; executionMethodCodes: string[]; testMethodCodes: string[];
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let current = true;
        void localApi.controlSettings().then((result) => {
            if (current) setSettings(result);
        }).catch((cause: unknown) => {
            if (current) setError(cause instanceof Error ? cause.message
                : t("local.errors.options", { defaultValue: "گزینه‌ها بارگذاری نشدند." }));
        });
        return () => { current = false; };
    }, [open, t]);

    const valid = Boolean(organizationId && subprocessId && sourceType)
        && (sourceType !== "INHERITED_FROM_CENTRAL" || Boolean(centralControlScopeId))
        && fromDraft.valid && toDraft.valid
        && (!validFrom || !validTo || validFrom <= validTo);

    const submit = async () => {
        if (!valid || !organizationId || !subprocessId || !sourceType || busy) return;
        setBusy(true);
        setError(null);
        try {
            const result = await localApi.assignControl({
                organizationId, subprocessId, controlId, sourceType,
                centralControlScopeId: sourceType === "INHERITED_FROM_CENTRAL"
                    ? centralControlScopeId : null,
                actualOwnerId, frequencyCode, executionMethodCode, testMethodCode,
                localContextNote: localContextNote.trim() || null,
                validFrom: validFrom || null, validTo: validTo || null,
            });
            navigate(`/organizations/${result.organizationId}?tab=controls&contextId=${result.contextId}&localSection=control-scopes&localRowId=${result.localControlScopeId}`);
            onClose();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message
                : t("local.errors.save", { defaultValue: "عملیات انجام نشد." }));
        } finally {
            setBusy(false);
        }
    };

    return <Dialog open={open} accessibleName={t("local.assign.control", {
        defaultValue: "انتساب کنترل به سازمان",
    })} onClose={onClose}
        footer={<div style={{ display: "flex", gap: "0.5rem" }}>
            <Button design="Emphasized" disabled={!valid || busy}
                onClick={() => void submit()}>
                {t("local.assign.submit", { defaultValue: "ثبت انتساب" })}</Button>
            <Button design="Transparent" disabled={busy} onClick={onClose}>
                {t("common.cancel", { defaultValue: "انصراف" })}</Button>
        </div>}>
        <ModalDialogHeader title={t("local.assign.control", {
            defaultValue: "انتساب کنترل به سازمان",
        })} onClose={onClose} />
        <div style={{ display: "grid", gap: "0.8rem", minWidth: "28rem", padding: "0.75rem" }}>
            <LocalOptionPicker label={t("local.fields.organization", { defaultValue: "سازمان" })}
                path="options/organizations" value={organizationId} required disabled={busy}
                onChange={setOrganizationId} />
            <LocalOptionPicker label={t("local.fields.subprocess", { defaultValue: "زیرفرآیند" })}
                path="options/subprocesses" value={subprocessId} required disabled={busy}
                onChange={(id) => { setSubprocessId(id); setCentralControlScopeId(null); }} />
            <div style={{ display: "grid", gap: "0.3rem" }}>
                <Label required>{t("local.fields.sourceType", { defaultValue: "نوع منبع" })}</Label>
                <Select value={sourceType ?? ""} disabled={busy}
                    accessibleName={t("local.fields.sourceType", { defaultValue: "نوع منبع" })}
                    onChange={(event) => {
                        setSourceType(event.target.value as LocalSource || null);
                        setCentralControlScopeId(null);
                    }}>
                    <Option value="">{t("local.options.none", { defaultValue: "انتخاب نشده" })}</Option>
                    <Option value="INHERITED_FROM_CENTRAL">
                        {t("local.source.inherited", { defaultValue: "موروث از مرکزی" })}</Option>
                    <Option value="LOCAL_ADDED">
                        {t("local.source.added", { defaultValue: "افزودهٔ محلی" })}</Option>
                </Select>
            </div>
            {sourceType === "INHERITED_FROM_CENTRAL" ? <LocalOptionPicker
                label={t("local.fields.centralReference", { defaultValue: "رابطهٔ مرکزی" })}
                path={subprocessId ? "options/central-control-scopes" : null}
                params={{ subprocessId, controlId }}
                value={centralControlScopeId} required disabled={busy}
                onChange={setCentralControlScopeId} /> : null}
            <LocalOptionPicker label={t("local.fields.actualOwner", { defaultValue: "مسئول واقعی" })}
                path="options/control-owners" value={actualOwnerId} disabled={busy}
                onChange={setActualOwnerId} />
            {(["frequencyCode", "executionMethodCode", "testMethodCode"] as const).map(
                (field) => {
                    const value = field === "frequencyCode" ? frequencyCode
                        : field === "executionMethodCode" ? executionMethodCode : testMethodCode;
                    const setValue = field === "frequencyCode" ? setFrequencyCode
                        : field === "executionMethodCode" ? setExecutionMethodCode : setTestMethodCode;
                    const options = field === "frequencyCode" ? settings?.frequencyCodes
                        : field === "executionMethodCode" ? settings?.executionMethodCodes
                            : settings?.testMethodCodes;
                    return <div key={field} style={{ display: "grid", gap: "0.3rem" }}>
                        <Label>{t(`local.fields.${field}`, { defaultValue: field })}</Label>
                        <Select value={value ?? ""} disabled={busy}
                            accessibleName={t(`local.fields.${field}`, { defaultValue: field })}
                            onChange={(event) => setValue(event.target.value || null)}>
                            <Option value="">{t("local.options.none", {
                                defaultValue: "انتخاب نشده",
                            })}</Option>
                            {(options ?? []).map((code) => <Option key={code} value={code}>{code}</Option>)}
                        </Select>
                    </div>;
                })}
            <div style={{ display: "grid", gap: "0.3rem" }}>
                <Label>{t("local.fields.validFrom", { defaultValue: "معتبر از" })}</Label>
                <PersianDatePicker value={validFrom} disabled={busy}
                    accessibleName={t("local.fields.validFrom", { defaultValue: "معتبر از" })}
                    invalidValueMessage={t("common.invalidPersianDate", {
                        defaultValue: "تاریخ نامعتبر",
                    })} onChange={setValidFrom} onDraftStateChange={setFromDraft} />
            </div>
            <div style={{ display: "grid", gap: "0.3rem" }}>
                <Label>{t("local.fields.validTo", { defaultValue: "معتبر تا" })}</Label>
                <PersianDatePicker value={validTo} disabled={busy}
                    accessibleName={t("local.fields.validTo", { defaultValue: "معتبر تا" })}
                    invalidValueMessage={t("common.invalidPersianDate", {
                        defaultValue: "تاریخ نامعتبر",
                    })} onChange={setValidTo} onDraftStateChange={setToDraft} />
            </div>
            <div style={{ display: "grid", gap: "0.3rem" }}>
                <Label>{t("local.fields.note", { defaultValue: "یادداشت محلی" })}</Label>
                <TextArea value={localContextNote} maxlength={1000} rows={3} disabled={busy}
                    accessibleName={t("local.fields.note", { defaultValue: "یادداشت محلی" })}
                    onInput={(event) => setLocalContextNote(event.target.value)} />
            </div>
            {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        </div>
    </Dialog>;
}
