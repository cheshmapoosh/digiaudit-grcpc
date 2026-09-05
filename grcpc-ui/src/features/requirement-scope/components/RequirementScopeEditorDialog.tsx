import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { RequirementScopeDraftRow, RequirementScopeDraftValues } from "../domain/requirementScope.model";

interface Props {
  open: boolean;
  row: RequirementScopeDraftRow | null;
  busy: boolean;
  onClose: () => void;
  onSave: (values: RequirementScopeDraftValues) => void;
}

const VALID_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };
function nullable(value: string): string | null { return value || null; }

export default function RequirementScopeEditorDialog({ open, row, busy, onClose, onSave }: Props) {
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
      setValidationError(t("requirementScope.validation.invalidDate"));
      return;
    }
    if (validFrom && validTo && validFrom > validTo) {
      setValidationError(t("requirementScope.validation.invalidRange"));
      return;
    }
    onSave({ validFrom: nullable(validFrom), validTo: nullable(validTo) });
  };

  const title = t("requirementScope.dialog.editTitle");
  return (
    <Dialog open={open} accessibleName={title} onClose={onClose} className="requirementScopeEditorDialog">
      <ModalDialogHeader title={title} onClose={onClose} />
      <div className="requirementScopeEditorBody">
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}
        <div className="requirementScopeField requirementScopeFieldWide"><strong>{row ? `${row.requirementCode} - ${row.requirementTitle}` : ""}</strong></div>
        <div className="requirementScopeDateRow">
          <div className="requirementScopeField"><Label showColon>{t("requirementScope.fields.validFrom")}</Label><PersianDatePicker value={validFrom} disabled={busy} accessibleName={t("requirementScope.fields.validFrom")} invalidValueMessage={t("requirementScope.validation.invalidDate")} onChange={setValidFrom} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))} /></div>
          <div className="requirementScopeField"><Label showColon>{t("requirementScope.fields.validTo")}</Label><PersianDatePicker value={validTo} disabled={busy} accessibleName={t("requirementScope.fields.validTo")} invalidValueMessage={t("requirementScope.validation.invalidDate")} onChange={setValidTo} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))} /></div>
        </div>
        <div className="requirementScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={save}>{t("requirementScope.actions.applyDraft")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
