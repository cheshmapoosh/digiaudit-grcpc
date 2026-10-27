import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { ControlObjectiveOption, AssignmentDraftRow } from "../domain/controlControlObjectiveAssignment.model";

interface Props { open: boolean; options: ControlObjectiveOption[]; rows: AssignmentDraftRow[]; busy: boolean; canSelect: boolean; canDelete: boolean; onClose: () => void; onConfirm: (selected: Set<string>) => void; onDirtyChange: (dirty: boolean) => void; }
export default function ControlObjectiveSelectionDialog({ open, options, rows, busy, canSelect, canDelete, onClose, onConfirm, onDirtyChange }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => { setSearch(""); setSelected(new Set(rows.filter(r => r.editState !== "DRAFT_DELETE" && r.status !== "DELETED").map(r => r.controlObjectiveId))); }, 0); return () => window.clearTimeout(timer); }, [open, rows]);
  const selectionChanged = open && (rows.some(row => (row.editState !== "DRAFT_DELETE" && row.status !== "DELETED") !== selected.has(row.controlObjectiveId)) || [...selected].some(id => !rows.some(row => row.controlObjectiveId === id)));
  useEffect(() => onDirtyChange(selectionChanged), [onDirtyChange, selectionChanged]);
  const items = useMemo(() => {
    const all = new Map(options.map(o => [o.id, o]));
    for (const row of rows) if (!all.has(row.controlObjectiveId)) all.set(row.controlObjectiveId, { id: row.controlObjectiveId, code: row.controlObjectiveCode, title: row.controlObjectiveTitle, status: row.controlObjectiveStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE", validFrom: row.controlObjectiveValidFrom, validTo: row.controlObjectiveValidTo });
    const needle = search.trim().toLocaleLowerCase();
    return [...all.values()].filter(o => !needle || o.code.toLocaleLowerCase().includes(needle) || o.title.toLocaleLowerCase().includes(needle));
  }, [options, rows, search]);
  const toggle = (id: string, checked: boolean) => setSelected(current => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; });
  return <Dialog open={open} accessibleName={t("controlControlObjectiveAssignment.selection.title")} className="centralAssignmentDialog" onClose={onClose}>
    <ModalDialogHeader title={t("controlControlObjectiveAssignment.selection.title")} onClose={onClose} />
    <div className="centralAssignmentDialogBody">
      <Input value={search} placeholder={t("controlControlObjectiveAssignment.search")} disabled={busy} onInput={e => setSearch(e.target.value)} />
      <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("controlControlObjectiveAssignment.actions.select")}</TableHeaderCell><TableHeaderCell>{t("controlControlObjectiveAssignment.fields.endpoint")}</TableHeaderCell><TableHeaderCell>{t("controlControlObjectiveAssignment.fields.endpointStatus")}</TableHeaderCell><TableHeaderCell>{t("controlControlObjectiveAssignment.fields.endpointValidity")}</TableHeaderCell></TableHeaderRow>}>
        {items.map(item => { const checked = selected.has(item.id); return <TableRow key={item.id}>
          <TableCell><CheckBox accessibleName={`${item.code} ${item.title}`} checked={checked} disabled={busy || (checked ? !canDelete : !canSelect || item.status !== "ACTIVE")} onChange={e => toggle(item.id, e.target.checked)} /></TableCell>
          <TableCell>{item.code} — {item.title}</TableCell><TableCell><ObjectStatus state={item.status === "ACTIVE" ? "Positive" : "None"}>{t(`controlControlObjectiveAssignment.status.${rows.find(r => r.controlObjectiveId === item.id)?.controlObjectiveStatus ?? item.status}`)}</ObjectStatus></TableCell>
          <TableCell>{formatPersianDate(item.validFrom)} – {formatPersianDate(item.validTo)}</TableCell>
        </TableRow>; })}
      </Table>
      <div className="centralAssignmentDialogFooter"><Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("controlControlObjectiveAssignment.actions.confirm")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
    </div>
  </Dialog>;
}
