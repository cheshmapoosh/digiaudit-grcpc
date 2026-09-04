import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip, Option, Select } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { ControlScopeDraftRow, ControlScopeDraftValues, ControlScopeOptions } from "../domain/controlScope.model";

interface Props {
  open: boolean;
  row: ControlScopeDraftRow | null;
  options: ControlScopeOptions;
  busy: boolean;
  onClose: () => void;
  onSave: (values: ControlScopeDraftValues) => void;
}

const VALID_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };
function readValue(event: unknown): string { return (event as { target?: { value?: string } }).target?.value ?? ""; }
function nullable(value: string): string | null { return value || null; }

export default function ControlScopeEditorDialog({ open, row, options, busy, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [frequency, setFrequency] = useState("");
  const [executionMethod, setExecutionMethod] = useState("");
  const [testMethod, setTestMethod] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [dateDrafts, setDateDrafts] = useState({ validFrom: VALID_DATE, validTo: VALID_DATE });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    const timer = window.setTimeout(() => {
      setFrequency(row.recommendedFrequencyCode ?? "");
      setExecutionMethod(row.recommendedExecutionMethodCode ?? "");
      setTestMethod(row.recommendedTestMethodCode ?? "");
      setValidFrom(row.validFrom ?? "");
      setValidTo(row.validTo ?? "");
      setDateDrafts({ validFrom: VALID_DATE, validTo: VALID_DATE });
      setValidationError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, row]);

  const save = () => {
    if (!dateDrafts.validFrom.valid || !dateDrafts.validTo.valid) {
      setValidationError(t("controlScope.validation.invalidDate"));
      return;
    }
    if (validFrom && validTo && validFrom > validTo) {
      setValidationError(t("controlScope.validation.invalidRange"));
      return;
    }
    onSave({
      recommendedFrequencyCode: nullable(frequency),
      recommendedExecutionMethodCode: nullable(executionMethod),
      recommendedTestMethodCode: nullable(testMethod),
      validFrom: nullable(validFrom),
      validTo: nullable(validTo),
    });
  };

  const title = t("controlScope.dialog.editTitle");
  return (
    <Dialog open={open} accessibleName={title} onClose={onClose} className="controlScopeEditorDialog">
      <ModalDialogHeader title={title} onClose={onClose} />
      <div className="controlScopeEditorBody">
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}
        <div className="controlScopeField controlScopeFieldWide"><strong>{row ? `${row.controlCode} - ${row.controlTitle}` : ""}</strong></div>
        <div className="controlScopeField"><Label showColon>{t("controlScope.fields.frequency")}</Label><Select value={frequency} disabled={busy} onChange={(event) => setFrequency(readValue(event))}><Option value="">{t("controlScope.options.none")}</Option>{options.recommendedFrequencyCodes.map((code) => <Option key={code} value={code}>{t(`control.operationFrequency.${code}`, { defaultValue: code })}</Option>)}</Select></div>
        <div className="controlScopeField"><Label showColon>{t("controlScope.fields.executionMethod")}</Label><Select value={executionMethod} disabled={busy} onChange={(event) => setExecutionMethod(readValue(event))}><Option value="">{t("controlScope.options.none")}</Option>{options.recommendedExecutionMethodCodes.map((code) => <Option key={code} value={code}>{t(`control.automationType.${code}`, { defaultValue: code })}</Option>)}</Select></div>
        <div className="controlScopeField"><Label showColon>{t("controlScope.fields.testMethod")}</Label><Select value={testMethod} disabled={busy} onChange={(event) => setTestMethod(readValue(event))}><Option value="">{t("controlScope.options.none")}</Option>{options.recommendedTestMethodCodes.map((code) => <Option key={code} value={code}>{t(`control.testingTechnique.${code}`, { defaultValue: code })}</Option>)}</Select></div>
        <div className="controlScopeDateRow">
          <div className="controlScopeField"><Label showColon>{t("controlScope.fields.validFrom")}</Label><PersianDatePicker value={validFrom} disabled={busy} accessibleName={t("controlScope.fields.validFrom")} invalidValueMessage={t("controlScope.validation.invalidDate")} onChange={setValidFrom} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))} /></div>
          <div className="controlScopeField"><Label showColon>{t("controlScope.fields.validTo")}</Label><PersianDatePicker value={validTo} disabled={busy} accessibleName={t("controlScope.fields.validTo")} invalidValueMessage={t("controlScope.validation.invalidDate")} onChange={setValidTo} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))} /></div>
        </div>
        <div className="controlScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={save}>{t("controlScope.actions.applyDraft")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
