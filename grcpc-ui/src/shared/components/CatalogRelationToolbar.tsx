import { FlexBox, Option, Select, Title } from "@ui5/webcomponents-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CatalogActionButton } from "./CatalogActionButton";
import { HeaderSearch } from "./HeaderSearch";
import "./catalog-relation.css";

export type CatalogRelationFilter = "ALL" | "ACTIVE" | "INACTIVE";
export function CatalogRelationToolbar({ title, search, onSearch, filter, onFilter,
  editable = false, busy = false, canSelect = false, canActivate = false,
  canInactivate = false, canDelete = false, onSelect, onActivate, onInactivate, onDelete, selectionAction }: {
  title?: string; search: string; onSearch: (value: string) => void;
  filter: CatalogRelationFilter; onFilter: (value: CatalogRelationFilter) => void;
  editable?: boolean; busy?: boolean; canSelect?: boolean; canActivate?: boolean;
  canInactivate?: boolean; canDelete?: boolean; onSelect?: () => void;
  onActivate?: () => void; onInactivate?: () => void; onDelete?: () => void;
  /** A typed owner may replace Select, including null when no selection action exists. */
  selectionAction?: ReactNode;
}) {
  const { t } = useTranslation();
  return <FlexBox wrap="Wrap" alignItems="Center" className="catalogRelationToolbar">
    {title ? <Title level="H5">{title}</Title> : null}
    <Select accessibleName={t("catalogRelation.status")} value={filter} disabled={busy}
      onChange={event => onFilter(event.target.value as CatalogRelationFilter)}>
      <Option value="ALL">{t("catalogRelation.all")}</Option>
      <Option value="ACTIVE">{t("catalogRelation.active")}</Option>
      <Option value="INACTIVE">{t("catalogRelation.inactive")}</Option>
    </Select>
    <HeaderSearch value={search} onChange={onSearch} disabled={busy} accessibleName={t("catalogRelation.search")} />
    {selectionAction !== undefined ? selectionAction : editable
      ? <CatalogActionButton design="Emphasized" disabled={busy || !canSelect} onClick={onSelect}>{t("catalogRelation.select")}</CatalogActionButton>
      : null}
    {editable ? <>
      <CatalogActionButton disabled={busy || !canActivate} onClick={onActivate}>{t("catalogRelation.activate")}</CatalogActionButton>
      <CatalogActionButton disabled={busy || !canInactivate} onClick={onInactivate}>{t("catalogRelation.inactivate")}</CatalogActionButton>
      <CatalogActionButton design="Negative" disabled={busy || !canDelete} onClick={onDelete}>{t("catalogRelation.delete")}</CatalogActionButton>
    </> : null}
  </FlexBox>;
}
