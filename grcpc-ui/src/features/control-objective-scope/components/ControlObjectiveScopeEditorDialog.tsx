import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { ControlObjectiveScopeDraftRow, ControlObjectiveScopeDraftValues } from "../domain/controlObjectiveScope.model";

interface Props {
  open: boolean;
  row: ControlObjectiveScopeDraftRow | null;
  busy: boolean;
  onClose: () => void;
  onSave: (values: ControlObjectiveScopeDraftValues) => void;
}

const VALID_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };
function nullable(value: string): string | null { return value || null; }

export default function ControlObjectiveScopeEditorDialog({ open, row, busy, onClose, onSave }: Props) {
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
      setValidationError(t("controlObjectiveScope.validation.invalidDate"));
      return;
    }
    if (validFrom && validTo && validFrom > validTo) {
      setValidationError(t("controlObjectiveScope.validation.invalidRange"));
      return;
    }
    onSave({ validFrom: nullable(validFrom), validTo: nullable(validTo) });
  };

  const title = t("controlObjectiveScope.dialog.editTitle");
  return (
    <Dialog open={open} accessibleName={title} onClose={onClose} className="controlObjectiveScopeEditorDialog">
      <ModalDialogHeader title={title} onClose={onClose} />
      <div className="controlObjectiveScopeEditorBody">
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}
        <div className="controlObjectiveScopeField controlObjectiveScopeFieldWide"><strong>{row ? `${row.controlObjectiveCode} - ${row.controlObjectiveTitle}` : ""}</strong></div>
        <div className="controlObjectiveScopeDateRow">
          <div className="controlObjectiveScopeField"><Label showColon>{t("controlObjectiveScope.fields.validFrom")}</Label><PersianDatePicker value={validFrom} disabled={busy} accessibleName={t("controlObjectiveScope.fields.validFrom")} invalidValueMessage={t("controlObjectiveScope.validation.invalidDate")} onChange={setValidFrom} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))} /></div>
          <div className="controlObjectiveScopeField"><Label showColon>{t("controlObjectiveScope.fields.validTo")}</Label><PersianDatePicker value={validTo} disabled={busy} accessibleName={t("controlObjectiveScope.fields.validTo")} invalidValueMessage={t("controlObjectiveScope.validation.invalidDate")} onChange={setValidTo} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))} /></div>
        </div>
        <div className="controlObjectiveScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={save}>{t("controlObjectiveScope.actions.applyDraft")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
