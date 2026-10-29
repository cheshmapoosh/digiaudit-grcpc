import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, ObjectStatus } from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import { CatalogRelationTable, type CatalogRelationColumn } from "./CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "./CatalogRelationToolbar";

interface Row { id: string; code: string; title: string; endpointStatus: "ACTIVE" | "INACTIVE" | "DELETED"; endpointValidFrom: string | null; endpointValidTo: string | null; status: "ACTIVE" | "INACTIVE" | "DELETED"; validFrom: string | null; validTo: string | null; }
/** Read-only renderer. Typed adapters own reads; catalog aggregates own every mutation. */
export function ReferenceRelationTable({ load, titleKey }: { load: (signal: AbortSignal) => Promise<Row[]>; titleKey: string }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  useEffect(() => { const controller = new AbortController(); let current = true;
    void Promise.resolve().then(() => { if (current) setLoading(true); return load(controller.signal); })
      .then(next => { if (current) { setRows(next); setError(false); } })
      .catch(() => { if (current) setError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [load]);
  const visible = rows.filter(row => row.status !== "DELETED" && (filter === "ALL" || row.status === filter)
    && `${row.code} ${row.title}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const columns: CatalogRelationColumn<Row>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.code },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.title },
    { key: "endpointStatus", header: t("centralAssignment.fields.endpointStatus"), cell: row => <ObjectStatus state={row.endpointStatus === "ACTIVE" ? "Positive" : "None"}>{t(`centralAssignment.status.${row.endpointStatus}`)}</ObjectStatus> },
    { key: "endpointValidity", header: t("centralAssignment.fields.endpointValidity"), cell: row => `${formatPersianDate(row.endpointValidFrom)} – ${formatPersianDate(row.endpointValidTo)}` },
    { key: "status", header: t("catalogRelation.status"), cell: row => <ObjectStatus state={row.status === "ACTIVE" ? "Positive" : "None"}>{t(`centralAssignment.status.${row.status}`)}</ObjectStatus> },
    { key: "validFrom", header: t("catalogRelation.validFrom"), cell: row => formatPersianDate(row.validFrom) },
    { key: "validTo", header: t("catalogRelation.validTo"), cell: row => formatPersianDate(row.validTo) },
  ];
  return <section><CatalogRelationToolbar title={t(titleKey)} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
    {error ? <MessageStrip design="Negative">{t("centralAssignment.errors.generic")}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.id} loading={loading} accessibleName={t(titleKey)} emptyText={t("catalogRelation.empty")} />
  </section>;
}
