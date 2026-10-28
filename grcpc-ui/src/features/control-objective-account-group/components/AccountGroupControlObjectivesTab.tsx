import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MessageStrip } from "@ui5/webcomponents-react";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { ControlObjectiveAccountGroupClassification } from "../domain/controlObjectiveAccountGroup.model";
import { controlObjectiveAccountGroupApi } from "../infra/controlObjectiveAccountGroup.api";
import { useControlObjectiveAccountGroupPermissions, useControlObjectiveClassificationDestinationPermissions } from "../security/controlObjectiveAccountGroupPermissions";
import { controlObjectiveAccountGroupErrorMessage } from "../utils/controlObjectiveAccountGroupError";

export default function AccountGroupControlObjectivesTab({ accountGroupId, allowControlObjectiveNavigation = true }: { accountGroupId: string; allowControlObjectiveNavigation?: boolean; }) {
  const { t } = useTranslation(); const permissions = useControlObjectiveAccountGroupPermissions(); const destinations = useControlObjectiveClassificationDestinationPermissions();
  const [rows, setRows] = useState<ControlObjectiveAccountGroupClassification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  useEffect(() => { const controller = new AbortController(); let current = true;
    if (!permissions.view) return () => controller.abort();
    void controlObjectiveAccountGroupApi.forAccountGroup(accountGroupId, controller.signal)
      .then(next => { if (current) { setRows(next); setError(null); } })
      .catch(cause => { if (current && !(cause instanceof Error && cause.name === "AbortError")) setError(controlObjectiveAccountGroupErrorMessage(cause, t)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [accountGroupId, permissions.view, t]);
  const visible = rows.filter(row => row.status !== "DELETED" && (filter === "ALL" || row.status === filter) && `${row.controlObjectiveCode} ${row.controlObjectiveTitle}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const columns: CatalogRelationColumn<ControlObjectiveAccountGroupClassification>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.controlObjectiveCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => allowControlObjectiveNavigation && destinations.controlObjectiveView ? <Link href={"/control-objectives/" + row.controlObjectiveId}>{row.controlObjectiveTitle}</Link> : row.controlObjectiveTitle },
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} /> },
    { key: "validFrom", header: t("catalogRelation.validFrom"), cell: row => formatPersianDate(row.validFrom) },
    { key: "validTo", header: t("catalogRelation.validTo"), cell: row => formatPersianDate(row.validTo) },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("controlObjectiveAccountGroup.errors.forbidden")}</MessageStrip>;
  return <section><CatalogRelationToolbar title={t("controlObjectiveAccountGroup.inverse.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
    {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.classificationId} accessibleName={t("controlObjectiveAccountGroup.inverse.title")} loading={loading} emptyText={t("catalogRelation.empty")} />
  </section>;
}
