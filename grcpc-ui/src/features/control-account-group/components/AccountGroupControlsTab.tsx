import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MessageStrip } from "@ui5/webcomponents-react";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { ControlAccountGroupClassification } from "../domain/controlAccountGroup.model";
import { controlAccountGroupApi } from "../infra/controlAccountGroup.api";
import { useControlAccountGroupPermissions, useClassificationDestinationPermissions } from "../security/controlAccountGroupPermissions";
import { controlAccountGroupErrorMessage } from "../utils/controlAccountGroupError";

export default function AccountGroupControlsTab({ accountGroupId, allowControlNavigation = true }: { accountGroupId: string; allowControlNavigation?: boolean; }) {
  const { t } = useTranslation(); const permissions = useControlAccountGroupPermissions(); const destinations = useClassificationDestinationPermissions();
  const [rows, setRows] = useState<ControlAccountGroupClassification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  useEffect(() => { const controller = new AbortController(); let current = true;
    if (!permissions.view) return () => controller.abort();
    void controlAccountGroupApi.forAccountGroup(accountGroupId, controller.signal)
      .then(next => { if (current) { setRows(next); setError(null); } })
      .catch(cause => { if (current && !(cause instanceof Error && cause.name === "AbortError")) setError(controlAccountGroupErrorMessage(cause, t)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [accountGroupId, permissions.view, t]);
  const visible = rows.filter(row => row.status !== "DELETED" && (filter === "ALL" || row.status === filter) && `${row.controlCode} ${row.controlTitle}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const columns: CatalogRelationColumn<ControlAccountGroupClassification>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.controlCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => allowControlNavigation && destinations.controlView ? <Link href={"/controls/" + row.controlId}>{row.controlTitle}</Link> : row.controlTitle },
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} /> },
    { key: "validFrom", header: t("catalogRelation.validFrom"), cell: row => formatPersianDate(row.validFrom) },
    { key: "validTo", header: t("catalogRelation.validTo"), cell: row => formatPersianDate(row.validTo) },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("controlAccountGroup.errors.forbidden")}</MessageStrip>;
  return <section><CatalogRelationToolbar title={t("controlAccountGroup.inverse.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
    {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.classificationId} accessibleName={t("controlAccountGroup.inverse.title")} loading={loading} emptyText={t("catalogRelation.empty")} />
  </section>;
}
