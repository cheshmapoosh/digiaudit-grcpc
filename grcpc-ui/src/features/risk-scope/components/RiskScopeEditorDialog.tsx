import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { RiskScopeDraftRow, RiskScopeDraftValues } from "../domain/riskScope.model";

interface Props {
  open: boolean;
  row: RiskScopeDraftRow | null;
  busy: boolean;
  onClose: () => void;
  onSave: (values: RiskScopeDraftValues) => void;
}

const VALID_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };
function nullable(value: string): string | null { return value || null; }

export default function RiskScopeEditorDialog({ open, row, busy, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [dateDrafts, setDateDrafts] = useState({ validFrom: VALID_DATE, validTo: VALID_DATE });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    const timer = window.setTimeout(() => {
      setValidFrom(row.validFrom ?? "");
      setValidTo(row.validTo ?? "");
      setDateDrafts({ validFrom: VALID_DATE, validTo: VALID_DATE });
      setValidationError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, row]);

  const save = () => {
    if (!dateDrafts.validFrom.valid || !dateDrafts.validTo.valid) {
      setValidationError(t("riskScope.validation.invalidDate"));
      return;
    }
    if (validFrom && validTo && validFrom > validTo) {
      setValidationError(t("riskScope.validation.invalidRange"));
      return;
    }
    onSave({ validFrom: nullable(validFrom), validTo: nullable(validTo) });
  };

  const title = t("riskScope.dialog.editTitle");
  return (
    <Dialog open={open} accessibleName={title} onClose={onClose} className="riskScopeEditorDialog">
      <ModalDialogHeader title={title} onClose={onClose} />
      <div className="riskScopeEditorBody">
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}
        <div className="riskScopeField riskScopeFieldWide"><strong>{row ? `${row.riskTemplateCode} - ${row.riskTemplateTitle}` : ""}</strong></div>
        <div className="riskScopeDateRow">
          <div className="riskScopeField"><Label showColon>{t("riskScope.fields.validFrom")}</Label><PersianDatePicker value={validFrom} disabled={busy} accessibleName={t("riskScope.fields.validFrom")} invalidValueMessage={t("riskScope.validation.invalidDate")} onChange={setValidFrom} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))} /></div>
          <div className="riskScopeField"><Label showColon>{t("riskScope.fields.validTo")}</Label><PersianDatePicker value={validTo} disabled={busy} accessibleName={t("riskScope.fields.validTo")} invalidValueMessage={t("riskScope.validation.invalidDate")} onChange={setValidTo} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))} /></div>
        </div>
        <div className="riskScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={save}>{t("riskScope.actions.applyDraft")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
