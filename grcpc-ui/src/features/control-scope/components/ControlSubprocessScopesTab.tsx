import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip } from "@ui5/webcomponents-react";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralSubprocessControlScope } from "../domain/controlScope.model";
import { controlScopeApi } from "../infra/controlScope.api.repo";
import { useControlScopePermissions } from "../security/controlScopePermissions";
import { controlScopeErrorMessage } from "../utils/controlScopeError";

export default function ControlSubprocessScopesTab({ controlId }: { controlId: string; }) {
  const { t } = useTranslation(); const permissions = useControlScopePermissions();
  const [rows, setRows] = useState<CentralSubprocessControlScope[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  useEffect(() => { const controller = new AbortController(); let current = true;
    if (!permissions.view) return () => controller.abort();
    void controlScopeApi.listForControl(controlId, "ALL", "", controller.signal)
      .then(next => { if (current) { setRows(next); setError(null); } })
      .catch(cause => { if (current && !(cause instanceof Error && cause.name === "AbortError")) setError(controlScopeErrorMessage(cause, t)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [controlId, permissions.view, t]);
  const visible = rows.filter(row => row.status !== "DELETED" && (filter === "ALL" || row.status === filter) && `${row.subprocessCode} ${row.subprocessTitle}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const columns: CatalogRelationColumn<CentralSubprocessControlScope>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.subprocessCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.subprocessTitle },
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} /> },
    { key: "validFrom", header: t("catalogRelation.validFrom"), cell: row => formatPersianDate(row.validFrom) },
    { key: "validTo", header: t("catalogRelation.validTo"), cell: row => formatPersianDate(row.validTo) },
  ];
  if (!permissions.view) return <MessageStrip design="Information">{t("controlScope.errors.forbidden")}</MessageStrip>;
  return <section><CatalogRelationToolbar title={t("controlScope.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
    {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.id} accessibleName={t("controlScope.title")} loading={loading} emptyText={t("catalogRelation.empty")} />
  </section>;
}
