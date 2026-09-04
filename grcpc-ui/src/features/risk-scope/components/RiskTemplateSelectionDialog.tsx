import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, List, ListItemCustom, ListItemGroup, Text } from "@ui5/webcomponents-react";
import type { CentralRiskCategorySummary, CentralRiskTemplateSummary } from "@/features/risk/domain/centralRisk.model";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { RiskScopeDraftRow } from "../domain/riskScope.model";

interface Props {
  open: boolean;
  riskTemplates: CentralRiskTemplateSummary[];
  riskCategories: CentralRiskCategorySummary[];
  rows: RiskScopeDraftRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: Set<string>) => void;
  canToggle: (riskTemplateId: string, currentlySelected: boolean) => boolean;
}

interface GroupedRiskTemplates {
  id: string;
  label: string;
  riskTemplates: CentralRiskTemplateSummary[];
}

function categoryPath(
  category: CentralRiskCategorySummary,
  byId: Map<string, CentralRiskCategorySummary>,
): CentralRiskCategorySummary[] {
  const result: CentralRiskCategorySummary[] = [];
  const visited = new Set<string>();
  let current: CentralRiskCategorySummary | undefined = category;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    result.unshift(current);
    current = current.parentCategoryId ? byId.get(current.parentCategoryId) : undefined;
  }
  return result;
}

function compareCategoryPaths(
  left: CentralRiskCategorySummary[],
  right: CentralRiskCategorySummary[],
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

export default function RiskTemplateSelectionDialog({
  open,
  riskTemplates,
  riskCategories,
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
      setSelected(new Set(rows.filter((row) => row.editState !== "DRAFT_PENDING_DELETE").map((row) => row.riskTemplateId)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return riskTemplates;
    return riskTemplates.filter((riskTemplate) =>
      riskTemplate.code.toLocaleLowerCase().includes(query)
      || riskTemplate.title.toLocaleLowerCase().includes(query));
  }, [riskTemplates, search]);

  const groupedRiskTemplates = useMemo<GroupedRiskTemplates[]>(() => {
    const categoryById = new Map(riskCategories.map((category) => [category.id, category]));
    const templatesByCategory = new Map<string, CentralRiskTemplateSummary[]>();
    const ungrouped: CentralRiskTemplateSummary[] = [];
    for (const riskTemplate of filtered) {
      if (!categoryById.has(riskTemplate.riskCategoryId)) {
        ungrouped.push(riskTemplate);
        continue;
      }
      const values = templatesByCategory.get(riskTemplate.riskCategoryId) ?? [];
      values.push(riskTemplate);
      templatesByCategory.set(riskTemplate.riskCategoryId, values);
    }
    const categories = riskCategories
      .map((category) => ({ category, path: categoryPath(category, categoryById) }))
      .sort((left, right) => compareCategoryPaths(left.path, right.path));
    const templateOrder = (left: CentralRiskTemplateSummary, right: CentralRiskTemplateSummary) =>
      left.sortOrder - right.sortOrder
      || left.code.localeCompare(right.code)
      || left.title.localeCompare(right.title)
      || left.id.localeCompare(right.id);
    const result = categories.flatMap(({ category, path }): GroupedRiskTemplates[] => {
      const values = templatesByCategory.get(category.id)?.sort(templateOrder);
      return values?.length
        ? [{ id: category.id, label: path.map((item) => `${item.code} - ${item.title}`).join(" / "), riskTemplates: values }]
        : [];
    });
    if (ungrouped.length) {
      result.push({ id: "ungrouped", label: t("riskScope.dialog.ungrouped"), riskTemplates: ungrouped.sort(templateOrder) });
    }
    return result;
  }, [filtered, riskCategories, t]);

  const savedByRiskTemplate = useMemo(
    () => new Map(rows.filter((row) => row.original).map((row) => [row.riskTemplateId, row])),
    [rows],
  );
  const toggle = (riskTemplateId: string, checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    if (checked) next.add(riskTemplateId); else next.delete(riskTemplateId);
    return next;
  });

  return (
    <Dialog open={open} accessibleName={t("riskScope.dialog.valueHelpTitle")} onClose={onClose} className="riskScopeValueHelpDialog">
      <ModalDialogHeader title={t("riskScope.dialog.valueHelpTitle")} onClose={onClose} />
      <div className="riskScopeValueHelpBody">
        <Input value={search} placeholder={t("riskScope.dialog.search")} onInput={(event) => setSearch(event.target.value)} />
        <List className="riskScopeSelectionList" separators="Inner" accessibleName={t("riskScope.dialog.valueHelpTitle")} noDataText={t("riskScope.dialog.noRiskTemplates")}>
          {groupedRiskTemplates.map((group) => <ListItemGroup key={group.id} headerText={group.label} headerAccessibleName={group.label}>
            {group.riskTemplates.map((riskTemplate) => {
              const saved = savedByRiskTemplate.get(riskTemplate.id);
              const currentlySelected = selected.has(riskTemplate.id);
              const disabled = (riskTemplate.status !== "ACTIVE" && !saved) || !canToggle(riskTemplate.id, currentlySelected);
              const accessibleName = `${riskTemplate.code} ${riskTemplate.title}`;
              return <ListItemCustom key={riskTemplate.id} type="Inactive" accessibleName={accessibleName}>
                <div className="riskScopeSelectionItem">
                  <CheckBox accessibleName={accessibleName} checked={currentlySelected} disabled={busy || disabled} onChange={(event) => toggle(riskTemplate.id, event.target.checked)} />
                  <Text className="riskScopeSelectionCode">{riskTemplate.code}</Text>
                  <Text>{riskTemplate.title}</Text>
                </div>
              </ListItemCustom>;
            })}
          </ListItemGroup>)}
        </List>
        <div className="riskScopeDialogFooter"><Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>{t("riskScope.actions.confirmSelection")}</Button><Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></div>
      </div>
    </Dialog>
  );
}
