import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Label, MessageStrip } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { AssignmentDraftRow } from "../domain/controlControlObjectiveAssignment.model";

const VALID: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };
export default function AssignmentValidityDialog({ open, row, busy, onClose, onSave, onDraftStateChange }: { open: boolean; row: AssignmentDraftRow | null; busy: boolean; onClose: () => void; onSave: (from: string | null, to: string | null) => void; onDraftStateChange: (state: { dirty: boolean; invalid: boolean }) => void }) {
  const { t } = useTranslation(); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [drafts, setDrafts] = useState({ from: VALID, to: VALID }); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!open || !row) return; const timer = window.setTimeout(() => { setFrom(row.validFrom ?? ""); setTo(row.validTo ?? ""); setDrafts({ from: VALID, to: VALID }); setError(null); }, 0); return () => window.clearTimeout(timer); }, [open, row]);
  const invalid = !drafts.from.valid || !drafts.to.valid || Boolean(from && to && from > to);
  const dirty = Boolean(open && row && (from !== (row.validFrom ?? "") || to !== (row.validTo ?? "") || drafts.from.dirty || drafts.to.dirty));
  useEffect(() => onDraftStateChange({ dirty, invalid: open && invalid }), [dirty, invalid, onDraftStateChange, open]);
  const save = () => { if (!drafts.from.valid || !drafts.to.valid || (from && to && from > to)) { setError(t("centralAssignment.validation.invalidRange")); return; } onSave(from || null, to || null); };
  return <Dialog open={open} accessibleName={t("centralAssignment.editor.title")} className="centralAssignmentDialog" onClose={onClose}><ModalDialogHeader title={t("centralAssignment.editor.title")} onClose={onClose} /><div className="centralAssignmentDialogBody">{error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}<strong>{row ? `${row.controlObjectiveCode} — ${row.controlObjectiveTitle}` : ""}</strong><div className="centralAssignmentEditorGrid"><div><Label showColon>{t("centralAssignment.fields.validFrom")}</Label><PersianDatePicker value={from} disabled={busy} accessibleName={t("centralAssignment.fields.validFrom")} invalidValueMessage={t("centralAssignment.validation.invalidDate")} onChange={setFrom} onDraftStateChange={(next) => setDrafts((current) => ({ ...current, from: next }))} /></div><div><Label showColon>{t("centralAssignment.fields.validTo")}</Label><PersianDatePicker value={to} disabled={busy} accessibleName={t("centralAssignment.fields.validTo")} invalidValueMessage={t("centralAssignment.validation.invalidDate")} onChange={setTo} onDraftStateChange={(next) => setDrafts((current) => ({ ...current, to: next }))} /></div></div><div className="centralAssignmentDialogFooter"><Button design="Emphasized" disabled={busy} onClick={save}>{t("centralAssignment.actions.apply")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div></div></Dialog>;
}
