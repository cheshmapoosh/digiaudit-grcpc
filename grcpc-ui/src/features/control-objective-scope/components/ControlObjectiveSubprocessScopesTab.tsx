import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MessageStrip } from "@ui5/webcomponents-react";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralSubprocessControlObjectiveScope } from "../domain/controlObjectiveScope.model";
import { controlObjectiveScopeApi } from "../infra/controlObjectiveScope.api.repo";
import { useControlObjectiveScopePermissions } from "../security/controlObjectiveScopePermissions";
import { controlObjectiveScopeErrorMessage } from "../utils/controlObjectiveScopeError";

export default function ControlObjectiveSubprocessScopesTab({ controlObjectiveId }: { controlObjectiveId: string; }) {
  const { t } = useTranslation(); const permissions = useControlObjectiveScopePermissions();
  const [rows, setRows] = useState<CentralSubprocessControlObjectiveScope[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  useEffect(() => { const controller = new AbortController(); let current = true;
    if (!permissions.view) return () => controller.abort();
    void controlObjectiveScopeApi.listForControlObjective(controlObjectiveId, "ALL", "", controller.signal)
      .then(next => { if (current) { setRows(next); setError(null); } })
      .catch(cause => { if (current && !(cause instanceof Error && cause.name === "AbortError")) setError(controlObjectiveScopeErrorMessage(cause, t)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [controlObjectiveId, permissions.view, t]);
  const visible = rows.filter(row => row.status !== "DELETED" && (filter === "ALL" || row.status === filter) && `${row.subprocessCode} ${row.subprocessTitle}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const columns: CatalogRelationColumn<CentralSubprocessControlObjectiveScope>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.subprocessCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => <Link href={"/processes/" + row.subprocessId}>{row.subprocessTitle}</Link> },
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} /> },
    { key: "validFrom", header: t("catalogRelation.validFrom"), cell: row => formatPersianDate(row.validFrom) },
    { key: "validTo", header: t("catalogRelation.validTo"), cell: row => formatPersianDate(row.validTo) },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("controlObjectiveScope.errors.forbidden")}</MessageStrip>;
  return <section><CatalogRelationToolbar title={t("controlObjectiveScope.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
    {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.id} accessibleName={t("controlObjectiveScope.title")} loading={loading} emptyText={t("catalogRelation.empty")} />
  </section>;
}
