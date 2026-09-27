import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip, TextArea } from "@ui5/webcomponents-react";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { HttpError } from "@/shared/infra/http.client";
import { localApi } from "../infra/local.api.repo";
import LocalOptionPicker from "./LocalOptionPicker";

interface Props {
    open: boolean;
    subprocessId: string;
    onClose: () => void;
}

const EMPTY_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

export default function LocalContextAssignmentDialog({ open, subprocessId, onClose }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [contextNote, setContextNote] = useState("");
    const [validFrom, setValidFrom] = useState("");
    const [validTo, setValidTo] = useState("");
    const [fromDraft, setFromDraft] = useState(EMPTY_DATE);
    const [toDraft, setToDraft] = useState(EMPTY_DATE);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingContextId, setExistingContextId] = useState<string | null>(null);
    const [existingDeleted, setExistingDeleted] = useState(false);
    const valid = Boolean(organizationId) && fromDraft.valid && toDraft.valid
        && (!validFrom || !validTo || validFrom <= validTo);

    const goToContext = (contextId: string) => {
        if (!organizationId) return;
        const status = existingDeleted ? "&localStatus=DELETED" : "";
        navigate(`/organizations/${organizationId}?tab=subprocesses&localSection=contexts&contextId=${contextId}&localRowId=${contextId}${status}`);
        onClose();
    };

    const submit = async () => {
        if (!organizationId || !valid || busy) return;
        setBusy(true);
        setError(null);
        setExistingContextId(null);
        setExistingDeleted(false);
        try {
            const result = await localApi.create("contexts", { organizationId }, {
                organizationId, subprocessId, contextNote: contextNote.trim() || null,
                validFrom: validFrom || null, validTo: validTo || null,
            });
            goToContext(result.entityId);
        } catch (cause) {
            if (cause instanceof HttpError
                && ["DUPLICATE_RELATION", "LOCAL_RESTORE_REQUIRED"].includes(cause.code ?? "")) {
                try {
                    const found = await localApi.findContext(organizationId, subprocessId,
                        cause.code === "LOCAL_RESTORE_REQUIRED" ? "DELETED" : null);
                    setExistingContextId(found.items[0]?.id ?? null);
                    setExistingDeleted(cause.code === "LOCAL_RESTORE_REQUIRED");
                } catch {
                    setExistingContextId(null);
                }
            }
            setError(cause instanceof Error ? cause.message
                : t("local.errors.save", { defaultValue: "عملیات انجام نشد." }));
        } finally {
            setBusy(false);
        }
    };

    return <Dialog open={open} accessibleName={t("local.assign.subprocess", {
        defaultValue: "انتساب زیرفرآیند به سازمان",
    })} onClose={onClose}
        footer={<div style={{ display: "flex", gap: "0.5rem" }}>
            <Button design="Emphasized" disabled={!valid || busy} onClick={() => void submit()}>
                {t("local.assign.submit", { defaultValue: "ثبت انتساب" })}</Button>
            <Button design="Transparent" disabled={busy} onClick={onClose}>
                {t("common.cancel", { defaultValue: "انصراف" })}</Button>
        </div>}>
        <ModalDialogHeader title={t("local.assign.subprocess", {
            defaultValue: "انتساب زیرفرآیند به سازمان",
        })} onClose={onClose} />
        <div style={{ display: "grid", gap: "0.8rem", minWidth: "26rem", padding: "0.75rem" }}>
            <LocalOptionPicker label={t("local.fields.organization", { defaultValue: "سازمان" })}
                path="options/organizations" value={organizationId} required disabled={busy}
                onChange={setOrganizationId} />
            <div style={{ display: "grid", gap: "0.3rem" }}>
                <Label>{t("local.fields.note", { defaultValue: "یادداشت محلی" })}</Label>
                <TextArea value={contextNote} maxlength={1000} rows={3} disabled={busy}
                    accessibleName={t("local.fields.note", { defaultValue: "یادداشت محلی" })}
                    onInput={(event) => setContextNote(event.target.value)} />
            </div>
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
            {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
            {existingContextId ? <Button design="Transparent"
                onClick={() => goToContext(existingContextId)}>
                {t("local.assign.openExisting", { defaultValue: "نمایش زمینهٔ موجود" })}
            </Button> : null}
        </div>
    </Dialog>;
}
