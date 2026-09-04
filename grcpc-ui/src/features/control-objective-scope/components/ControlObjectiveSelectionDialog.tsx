import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, List, ListItemCustom, Text } from "@ui5/webcomponents-react";
import type { CentralControlObjectiveSummary } from "@/features/control-objective";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { ControlObjectiveScopeDraftRow } from "../domain/controlObjectiveScope.model";

interface Props {
  open: boolean;
  controlObjectives: CentralControlObjectiveSummary[];
  rows: ControlObjectiveScopeDraftRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: Set<string>) => void;
  canToggle: (controlObjectiveId: string, currentlySelected: boolean) => boolean;
}

export default function ControlObjectiveSelectionDialog({
  open,
  controlObjectives,
  rows,
  busy,
  onClose,
  onConfirm,
  canToggle,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setSearch("");
      setSelected(new Set(
        rows.filter((row) => row.editState !== "DRAFT_PENDING_DELETE")
          .map((row) => row.controlObjectiveId),
      ));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return controlObjectives
      .filter((objective) => !query
        || objective.code.toLocaleLowerCase().includes(query)
        || objective.title.toLocaleLowerCase().includes(query)
        || objective.objectiveClass?.toLocaleLowerCase().includes(query))
      .sort((left, right) => left.code.localeCompare(right.code)
        || left.title.localeCompare(right.title)
        || left.id.localeCompare(right.id));
  }, [controlObjectives, search]);

  const savedByObjective = useMemo(
    () => new Map(rows.filter((row) => row.original).map((row) => [row.controlObjectiveId, row])),
    [rows],
  );
  const toggle = (controlObjectiveId: string, checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    if (checked) next.add(controlObjectiveId); else next.delete(controlObjectiveId);
    return next;
  });

  return (
    <Dialog open={open} accessibleName={t("controlObjectiveScope.dialog.valueHelpTitle")} onClose={onClose} className="controlObjectiveScopeValueHelpDialog">
      <ModalDialogHeader title={t("controlObjectiveScope.dialog.valueHelpTitle")} onClose={onClose} />
      <div className="controlObjectiveScopeValueHelpBody">
        <Input value={search} placeholder={t("controlObjectiveScope.dialog.search")} onInput={(event) => setSearch(event.target.value)} />
        <List className="controlObjectiveScopeSelectionList" separators="Inner" accessibleName={t("controlObjectiveScope.dialog.valueHelpTitle")} noDataText={t("controlObjectiveScope.dialog.noControlObjectives")}>
          {filtered.map((objective) => {
            const saved = savedByObjective.get(objective.id);
            const currentlySelected = selected.has(objective.id);
            const disabled = (objective.status !== "ACTIVE" && !saved)
              || !canToggle(objective.id, currentlySelected);
            const accessibleName = `${objective.code} ${objective.title}`;
            return <ListItemCustom key={objective.id} type="Inactive" accessibleName={accessibleName}>
              <div className="controlObjectiveScopeSelectionItem">
                <CheckBox accessibleName={accessibleName} checked={currentlySelected} disabled={busy || disabled} onChange={(event) => toggle(objective.id, event.target.checked)} />
                <Text className="controlObjectiveScopeSelectionCode">{objective.code}</Text>
                <Text>{objective.title}</Text>
              </div>
            </ListItemCustom>;
          })}
        </List>
        <div className="controlObjectiveScopeDialogFooter">
          <Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("controlObjectiveScope.actions.confirmSelection")}</Button>
          <Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button>
        </div>
      </div>
    </Dialog>
  );
}
