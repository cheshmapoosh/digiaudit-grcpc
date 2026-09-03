import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, Label } from "@ui5/webcomponents-react";
import type { CentralControlSummary } from "@/features/control/domain/centralControl.model";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { ControlScopeDraftRow } from "../domain/controlScope.model";

interface Props {
  open: boolean;
  controls: CentralControlSummary[];
  rows: ControlScopeDraftRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: Set<string>) => void;
  canToggle: (controlId: string, currentlySelected: boolean) => boolean;
}

export default function ControlSelectionDialog({ open, controls, rows, busy, onClose, onConfirm, canToggle }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setSearch("");
      setSelected(new Set(rows.filter((row) => row.editState !== "DRAFT_PENDING_DELETE").map((row) => row.controlId)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return controls;
    return controls.filter((control) => control.code.toLocaleLowerCase().includes(query) || control.title.toLocaleLowerCase().includes(query));
  }, [controls, search]);
  const savedByControl = useMemo(() => new Map(rows.filter((row) => row.original).map((row) => [row.controlId, row])), [rows]);
  const toggle = (controlId: string, checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    if (checked) next.add(controlId); else next.delete(controlId);
    return next;
  });

  return (
    <Dialog open={open} accessibleName={t("controlScope.dialog.valueHelpTitle")} onClose={onClose} className="controlScopeValueHelpDialog">
      <ModalDialogHeader title={t("controlScope.dialog.valueHelpTitle")} onClose={onClose} />
      <div className="controlScopeValueHelpBody">
        <Input value={search} placeholder={t("controlScope.dialog.search")} onInput={(event) => setSearch(event.target.value)} />
        <div className="controlScopeSelectionList">
          {filtered.map((control) => {
            const saved = savedByControl.get(control.id);
            const currentlySelected = selected.has(control.id);
            const disabled = (control.status !== "ACTIVE" && !saved) || !canToggle(control.id, currentlySelected);
            return <div className="controlScopeSelectionRow" key={control.id}>
              <CheckBox checked={currentlySelected} disabled={busy || disabled} onChange={(event) => toggle(control.id, event.target.checked)} />
              <div><strong>{control.code}</strong><div>{control.title}</div></div>
              {saved ? <Label>{t(`controlScope.status.${saved.status}`)}</Label> : null}
            </div>;
          })}
        </div>
        <div className="controlScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("controlScope.actions.confirmSelection")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
