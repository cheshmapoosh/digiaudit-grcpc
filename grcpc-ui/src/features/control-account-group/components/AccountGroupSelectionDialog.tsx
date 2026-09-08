import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, ObjectStatus, Tree, TreeItemCustom } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { AccountGroupOption, ClassificationDraftRow } from "../domain/controlAccountGroup.model";

interface Props { open: boolean; options: AccountGroupOption[]; rows: ClassificationDraftRow[]; busy: boolean; canSelect: boolean; canDelete: boolean; onClose: () => void; onConfirm: (selected: Set<string>) => void; }
function matches(node: AccountGroupOption, search: string): AccountGroupOption | null { const children = node.children.map((child) => matches(child, search)).filter(Boolean) as AccountGroupOption[]; const own = node.code.toLocaleLowerCase().includes(search) || node.title.toLocaleLowerCase().includes(search); return own || children.length ? { ...node, children } : null; }

function OptionItem({ node, selected, lockedIds, busy, onToggle }: { node: AccountGroupOption; selected: Set<string>; lockedIds: Set<string>; busy: boolean; onToggle: (id: string, checked: boolean) => void }) {
  const { t } = useTranslation(); const disabled = lockedIds.has(node.id) || node.status !== "ACTIVE";
  return <TreeItemCustom expanded content={<div className="controlAccountGroupTreeContent"><CheckBox accessibleName={`${node.code} ${node.title}`} checked={selected.has(node.id)} disabled={busy || disabled} onChange={(event) => onToggle(node.id, event.target.checked)} /><span className="controlAccountGroupCode">{node.code}</span><span>{node.title}</span>{node.status !== "ACTIVE" ? <ObjectStatus state="None">{t("controlAccountGroup.status.INACTIVE")}</ObjectStatus> : null}</div>}>
    {node.children.map((child) => <OptionItem key={child.id} node={child} selected={selected} lockedIds={lockedIds} busy={busy} onToggle={onToggle} />)}
  </TreeItemCustom>;
}

export default function AccountGroupSelectionDialog({ open, options, rows, busy, canSelect, canDelete, onClose, onConfirm }: Props) {
  const { t } = useTranslation(); const [search, setSearch] = useState(""); const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => { setSearch(""); setSelected(new Set(rows.filter((row) => row.editState !== "DRAFT_DELETE").map((row) => row.accountGroupId))); }, 0); return () => window.clearTimeout(timer); }, [open, rows]);
  const tree = useMemo(() => { const needle = search.trim().toLocaleLowerCase(); return needle ? options.map((node) => matches(node, needle)).filter(Boolean) as AccountGroupOption[] : options; }, [options, search]);
  const persistedIds = useMemo(() => new Set(rows.filter((row) => row.original).map((row) => row.accountGroupId)), [rows]);
  const lockedIds = useMemo(() => { const result = new Set<string>(); for (const row of rows) { const currentlySelected = selected.has(row.accountGroupId); if (row.original && currentlySelected && !canDelete) result.add(row.accountGroupId); } return result; }, [canDelete, rows, selected]);
  const toggle = (id: string, checked: boolean) => { if ((checked && !persistedIds.has(id) && !canSelect) || (!checked && persistedIds.has(id) && !canDelete)) return; setSelected((current) => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; }); };
  return <Dialog open={open} accessibleName={t("controlAccountGroup.selection.title")} className="controlAccountGroupDialog" onClose={onClose}><ModalDialogHeader title={t("controlAccountGroup.selection.title")} onClose={onClose} /><div className="controlAccountGroupDialogBody"><Input value={search} placeholder={t("controlAccountGroup.selection.search")} disabled={busy} onInput={(event) => setSearch(event.target.value)} /><div className="controlAccountGroupTreeFrame"><Tree accessibleName={t("controlAccountGroup.selection.title")}>{tree.map((node) => <OptionItem key={node.id} node={node} selected={selected} lockedIds={lockedIds} busy={busy} onToggle={toggle} />)}</Tree></div><div className="controlAccountGroupDialogFooter"><Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("controlAccountGroup.actions.confirm")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div></div></Dialog>;
}
