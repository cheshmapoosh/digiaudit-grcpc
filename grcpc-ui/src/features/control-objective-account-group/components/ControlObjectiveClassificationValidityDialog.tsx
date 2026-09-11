import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { ControlObjectiveClassificationDraftRow } from "../domain/controlObjectiveAccountGroup.model";

const VALID: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

export default function ControlObjectiveClassificationValidityDialog({
  open,
  row,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  row: ControlObjectiveClassificationDraftRow | null;
  busy: boolean;
  onClose: () => void;
  onSave: (from: string | null, to: string | null) => void;
}) {
  const { t } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [drafts, setDrafts] = useState({ from: VALID, to: VALID });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    const timer = window.setTimeout(() => {
      setFrom(row.validFrom ?? "");
      setTo(row.validTo ?? "");
      setDrafts({ from: VALID, to: VALID });
      setError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, row]);

  const save = () => {
    if (!drafts.from.valid || !drafts.to.valid || (from && to && from > to)) {
      setError(t("controlObjectiveAccountGroup.validation.invalidRange"));
      return;
    }
    onSave(from || null, to || null);
  };

  return (
    <Dialog
      open={open}
      accessibleName={t("controlObjectiveAccountGroup.editor.title")}
      className="controlObjectiveAccountGroupDialog"
      onClose={onClose}
    >
      <ModalDialogHeader title={t("controlObjectiveAccountGroup.editor.title")} onClose={onClose} />
      <div className="controlObjectiveAccountGroupDialogBody">
        {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
        <strong>{row ? `${row.accountGroupCode} — ${row.accountGroupTitle}` : ""}</strong>
        <div className="controlObjectiveAccountGroupEditorGrid">
          <div>
            <Label showColon>{t("controlObjectiveAccountGroup.fields.validFrom")}</Label>
            <PersianDatePicker
              value={from}
              disabled={busy}
              accessibleName={t("controlObjectiveAccountGroup.fields.validFrom")}
              invalidValueMessage={t("controlObjectiveAccountGroup.validation.invalidDate")}
              onChange={setFrom}
              onDraftStateChange={(next) => setDrafts((current) => ({ ...current, from: next }))}
            />
          </div>
          <div>
            <Label showColon>{t("controlObjectiveAccountGroup.fields.validTo")}</Label>
            <PersianDatePicker
              value={to}
              disabled={busy}
              accessibleName={t("controlObjectiveAccountGroup.fields.validTo")}
              invalidValueMessage={t("controlObjectiveAccountGroup.validation.invalidDate")}
              onChange={setTo}
              onDraftStateChange={(next) => setDrafts((current) => ({ ...current, to: next }))}
            />
          </div>
        </div>
        <div className="controlObjectiveAccountGroupDialogFooter">
          <Button design="Emphasized" disabled={busy} onClick={save}>
            {t("controlObjectiveAccountGroup.actions.apply")}
          </Button>
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
