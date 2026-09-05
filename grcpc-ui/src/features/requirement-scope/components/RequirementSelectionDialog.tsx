import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, List, ListItemCustom, ListItemGroup, Text } from "@ui5/webcomponents-react";
import type {
  CentralRegulationGroupSummary,
  CentralRegulationRequirementSummary,
  CentralRegulationSummary,
} from "@/features/regulation/domain/centralRegulation.model";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { RequirementScopeDraftRow } from "../domain/requirementScope.model";

interface Props {
  open: boolean;
  requirements: CentralRegulationRequirementSummary[];
  regulations: CentralRegulationSummary[];
  regulationGroups: CentralRegulationGroupSummary[];
  rows: RequirementScopeDraftRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: Set<string>) => void;
  canToggle: (requirementId: string, currentlySelected: boolean) => boolean;
}

interface GroupedRequirements {
  id: string;
  label: string;
  requirements: CentralRegulationRequirementSummary[];
}

function groupPath(
  group: CentralRegulationGroupSummary,
  byId: Map<string, CentralRegulationGroupSummary>,
): CentralRegulationGroupSummary[] {
  const result: CentralRegulationGroupSummary[] = [];
  const visited = new Set<string>();
  let current: CentralRegulationGroupSummary | undefined = group;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    result.unshift(current);
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return result;
}

function compareGroupPaths(
  left: CentralRegulationGroupSummary[],
  right: CentralRegulationGroupSummary[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const byOrder = left[index].sortOrder - right[index].sortOrder;
    if (byOrder) return byOrder;
    const byCode = left[index].code.localeCompare(right[index].code);
    if (byCode) return byCode;
    const byTitle = left[index].title.localeCompare(right[index].title);
    if (byTitle) return byTitle;
    const byId = left[index].id.localeCompare(right[index].id);
    if (byId) return byId;
  }
  return left.length - right.length;
}

export default function RequirementSelectionDialog({
  open,
  requirements,
  regulations,
  regulationGroups,
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
      setSelected(new Set(rows.filter((row) => row.editState !== "DRAFT_PENDING_DELETE").map((row) => row.requirementId)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, rows]);

  const groupedRequirements = useMemo<GroupedRequirements[]>(() => {
    const groupById = new Map(regulationGroups.map((group) => [group.id, group]));
    const regulationById = new Map(regulations.map((regulation) => [regulation.id, regulation]));
    const pathByRegulation = new Map(regulations.map((regulation) => {
      const group = groupById.get(regulation.regulationGroupId);
      return [regulation.id, group ? groupPath(group, groupById) : []] as const;
    }));
    const query = search.trim().toLocaleLowerCase();
    const matches = requirements.filter((requirement) => {
      if (!query) return true;
      const regulation = regulationById.get(requirement.regulationId);
      const context = [
        requirement.code,
        requirement.title,
        regulation?.code,
        regulation?.title,
        ...(pathByRegulation.get(requirement.regulationId) ?? []).flatMap((group) => [group.code, group.title]),
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return context.includes(query);
    });
    const requirementsByRegulation = new Map<string, CentralRegulationRequirementSummary[]>();
    for (const requirement of matches) {
      const values = requirementsByRegulation.get(requirement.regulationId) ?? [];
      values.push(requirement);
      requirementsByRegulation.set(requirement.regulationId, values);
    }
    const regulationOrder = (left: CentralRegulationSummary, right: CentralRegulationSummary) => {
      const byPath = compareGroupPaths(
        pathByRegulation.get(left.id) ?? [],
        pathByRegulation.get(right.id) ?? [],
      );
      return byPath || left.sortOrder - right.sortOrder
        || left.code.localeCompare(right.code)
        || left.title.localeCompare(right.title)
        || left.id.localeCompare(right.id);
    };
    const requirementOrder = (left: CentralRegulationRequirementSummary, right: CentralRegulationRequirementSummary) =>
      left.sortOrder - right.sortOrder
      || left.code.localeCompare(right.code)
      || left.title.localeCompare(right.title)
      || left.id.localeCompare(right.id);
    return [...regulations].sort(regulationOrder).flatMap((regulation): GroupedRequirements[] => {
      const values = requirementsByRegulation.get(regulation.id)?.sort(requirementOrder);
      if (!values?.length) return [];
      const ancestors = pathByRegulation.get(regulation.id) ?? [];
      const label = [...ancestors.map((group) => `${group.code} - ${group.title}`), `${regulation.code} - ${regulation.title}`].join(" / ");
      return [{ id: regulation.id, label, requirements: values }];
    });
  }, [regulationGroups, regulations, requirements, search]);

  const savedByRequirement = useMemo(
    () => new Map(rows.filter((row) => row.original).map((row) => [row.requirementId, row])),
    [rows],
  );
  const toggle = (requirementId: string, checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    if (checked) next.add(requirementId); else next.delete(requirementId);
    return next;
  });

  return (
    <Dialog open={open} accessibleName={t("requirementScope.dialog.valueHelpTitle")} onClose={onClose} className="requirementScopeValueHelpDialog">
      <ModalDialogHeader title={t("requirementScope.dialog.valueHelpTitle")} onClose={onClose} />
      <div className="requirementScopeValueHelpBody">
        <Input value={search} placeholder={t("requirementScope.dialog.search")} onInput={(event) => setSearch(event.target.value)} />
        <List className="requirementScopeSelectionList" separators="Inner" accessibleName={t("requirementScope.dialog.valueHelpTitle")} noDataText={t("requirementScope.dialog.noRequirements")}>
          {groupedRequirements.map((group) => <ListItemGroup key={group.id} headerText={group.label} headerAccessibleName={group.label}>
            {group.requirements.map((requirement) => {
              const saved = savedByRequirement.get(requirement.id);
              const currentlySelected = selected.has(requirement.id);
              const disabled = (requirement.status !== "ACTIVE" && !saved) || !canToggle(requirement.id, currentlySelected);
              const accessibleName = `${requirement.code} ${requirement.title}`;
              return <ListItemCustom key={requirement.id} type="Inactive" accessibleName={accessibleName}>
                <div className="requirementScopeSelectionItem">
                  <CheckBox accessibleName={accessibleName} checked={currentlySelected} disabled={busy || disabled} onChange={(event) => toggle(requirement.id, event.target.checked)} />
                  <Text className="requirementScopeSelectionCode">{requirement.code}</Text>
                  <Text>{requirement.title}</Text>
                </div>
              </ListItemCustom>;
            })}
          </ListItemGroup>)}
        </List>
        <div className="requirementScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("requirementScope.actions.confirmSelection")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
