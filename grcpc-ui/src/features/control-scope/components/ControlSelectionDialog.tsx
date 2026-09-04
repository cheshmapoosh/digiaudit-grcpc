import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, List, ListItemCustom, ListItemGroup, Text } from "@ui5/webcomponents-react";
import type { CentralControlGroupSummary, CentralControlSummary } from "@/features/control/domain/centralControl.model";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { ControlScopeDraftRow } from "../domain/controlScope.model";

interface Props {
  open: boolean;
  controls: CentralControlSummary[];
  groups: CentralControlGroupSummary[];
  rows: ControlScopeDraftRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: Set<string>) => void;
  canToggle: (controlId: string, currentlySelected: boolean) => boolean;
}

interface GroupedControls {
  id: string;
  label: string;
  controls: CentralControlSummary[];
}

export default function ControlSelectionDialog({ open, controls, groups, rows, busy, onClose, onConfirm, canToggle }: Props) {
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
  const groupedControls = useMemo<GroupedControls[]>(() => {
    const controlsByGroup = new Map<string, CentralControlSummary[]>();
    const knownGroupIds = new Set(groups.map((group) => group.id));
    const ungrouped: CentralControlSummary[] = [];
    for (const control of filtered) {
      if (!control.controlGroupId || !knownGroupIds.has(control.controlGroupId)) {
        ungrouped.push(control);
        continue;
      }
      const groupControls = controlsByGroup.get(control.controlGroupId) ?? [];
      groupControls.push(control);
      controlsByGroup.set(control.controlGroupId, groupControls);
    }
    const result = [...groups]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code))
      .flatMap((group): GroupedControls[] => {
        const groupControls = controlsByGroup.get(group.id);
        return groupControls?.length ? [{ id: group.id, label: `${group.code} - ${group.title}`, controls: groupControls }] : [];
      });
    if (ungrouped.length) result.push({ id: "ungrouped", label: t("controlScope.dialog.ungrouped"), controls: ungrouped });
    return result;
  }, [filtered, groups, t]);
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
        <List className="controlScopeSelectionList" separators="Inner" accessibleName={t("controlScope.dialog.valueHelpTitle")} noDataText={t("controlScope.dialog.noControls")}>
          {groupedControls.map((group) => <ListItemGroup key={group.id} headerText={group.label} headerAccessibleName={group.label}>
            {group.controls.map((control) => {
              const saved = savedByControl.get(control.id);
              const currentlySelected = selected.has(control.id);
              const disabled = (control.status !== "ACTIVE" && !saved) || !canToggle(control.id, currentlySelected);
              const accessibleName = `${control.code} ${control.title}`;
              return <ListItemCustom key={control.id} type="Inactive" accessibleName={accessibleName}>
                <div className="controlScopeSelectionItem">
                  <CheckBox accessibleName={accessibleName} checked={currentlySelected} disabled={busy || disabled} onChange={(event) => toggle(control.id, event.target.checked)} />
                  <Text className="controlScopeSelectionCode">{control.code}</Text>
                  <Text>{control.title}</Text>
                </div>
              </ListItemCustom>;
            })}
          </ListItemGroup>)}
        </List>
        <div className="controlScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("controlScope.actions.confirmSelection")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
