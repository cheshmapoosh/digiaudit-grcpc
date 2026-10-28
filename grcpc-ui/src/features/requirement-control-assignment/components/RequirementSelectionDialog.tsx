import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { RequirementOption, AssignmentDraftRow } from "../domain/requirementControlAssignment.model";

interface Props { open: boolean; options: RequirementOption[]; rows: AssignmentDraftRow[]; busy: boolean; canSelect: boolean; canDelete: boolean; onClose: () => void; onConfirm: (selected: Set<string>) => void; onDirtyChange: (dirty: boolean) => void; }
export default function RequirementSelectionDialog({ open, options, rows, busy, canSelect, canDelete, onClose, onConfirm, onDirtyChange }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => { setSearch(""); setSelected(new Set(rows.filter(r => r.editState !== "DRAFT_DELETE" && r.status !== "DELETED").map(r => r.requirementId))); }, 0); return () => window.clearTimeout(timer); }, [open, rows]);
  const selectionChanged = open && (rows.some(row => (row.editState !== "DRAFT_DELETE" && row.status !== "DELETED") !== selected.has(row.requirementId)) || [...selected].some(id => !rows.some(row => row.requirementId === id)));
  useEffect(() => onDirtyChange(selectionChanged), [onDirtyChange, selectionChanged]);
  const items = useMemo(() => {
    const all = new Map(options.map(o => [o.id, o]));
    for (const row of rows) if (!all.has(row.requirementId)) all.set(row.requirementId, { id: row.requirementId, code: row.requirementCode, title: row.requirementTitle, status: row.requirementStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE", validFrom: row.requirementValidFrom, validTo: row.requirementValidTo });
    const needle = search.trim().toLocaleLowerCase();
    return [...all.values()].filter(o => !needle || o.code.toLocaleLowerCase().includes(needle) || o.title.toLocaleLowerCase().includes(needle));
  }, [options, rows, search]);
  const toggle = (id: string, checked: boolean) => setSelected(current => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; });
  return <Dialog open={open} accessibleName={t("requirementControlAssignment.selection.title")} className="centralAssignmentDialog" onClose={onClose}>
    <ModalDialogHeader title={t("requirementControlAssignment.selection.title")} onClose={onClose}  actions={<HeaderSearch value={search} onChange={(value) => setSearch(value)} disabled={busy} accessibleName={t("requirementControlAssignment.search")} />} />
    <div className="centralAssignmentDialogBody">

      <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("requirementControlAssignment.actions.select")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.endpoint")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.endpointStatus")}</TableHeaderCell><TableHeaderCell>{t("requirementControlAssignment.fields.endpointValidity")}</TableHeaderCell></TableHeaderRow>}>
        {items.map(item => { const checked = selected.has(item.id); return <TableRow key={item.id}>
          <TableCell><CheckBox accessibleName={`${item.code} ${item.title}`} checked={checked} disabled={busy || (checked ? !canDelete : !canSelect || item.status !== "ACTIVE")} onChange={e => toggle(item.id, e.target.checked)} /></TableCell>
          <TableCell>{item.code} — {item.title}</TableCell><TableCell><ObjectStatus state={item.status === "ACTIVE" ? "Positive" : "None"}>{t(`requirementControlAssignment.status.${rows.find(r => r.requirementId === item.id)?.requirementStatus ?? item.status}`)}</ObjectStatus></TableCell>
          <TableCell>{formatPersianDate(item.validFrom)} – {formatPersianDate(item.validTo)}</TableCell>
        </TableRow>; })}
      </Table>
      <DialogFooter><Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("requirementControlAssignment.actions.confirm")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></DialogFooter>
    </div>
  </Dialog>;
}
