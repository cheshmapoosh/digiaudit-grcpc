import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Link, MessageStrip, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Title } from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";

interface Row { id: string; code: string; title: string; href: string; endpointStatus: "ACTIVE" | "INACTIVE" | "DELETED"; endpointValidFrom: string | null; endpointValidTo: string | null; status: "ACTIVE" | "INACTIVE" | "DELETED"; validFrom: string | null; validTo: string | null; }
/** Presentation only. Typed feature adapters own reads; catalog aggregates own every mutation. */
export function ReferenceRelationTable({ load, titleKey }: { load: (signal: AbortSignal) => Promise<Row[]>; titleKey: string }) {
  const { t } = useTranslation(); const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  useEffect(() => { const controller = new AbortController(); let current = true;
    void Promise.resolve().then(() => { if (current) setLoading(true); return load(controller.signal); }).then(next => { if (current) { setRows(next); setError(false); } }).catch(() => { if (current) setError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [load]);
  return <section><Title level="H5">{t(titleKey)}</Title>{error ? <MessageStrip design="Negative">{t("centralAssignment.errors.generic")}</MessageStrip> : loading ? <BusyIndicator active delay={0} /> : rows.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("centralAssignment.fields.owner")}</TableHeaderCell><TableHeaderCell>{t("centralAssignment.fields.endpointStatus")}</TableHeaderCell><TableHeaderCell>{t("centralAssignment.fields.endpointValidity")}</TableHeaderCell><TableHeaderCell>{t("centralAssignment.fields.status")}</TableHeaderCell><TableHeaderCell>{t("centralAssignment.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("centralAssignment.fields.validTo")}</TableHeaderCell></TableHeaderRow>}>
    {rows.map(row => <TableRow key={row.id}><TableCell><Link href={row.href}>{row.code} — {row.title}</Link></TableCell><TableCell><ObjectStatus state={row.endpointStatus === "ACTIVE" ? "Positive" : "None"}>{t(`centralAssignment.status.${row.endpointStatus}`)}</ObjectStatus></TableCell><TableCell>{formatPersianDate(row.endpointValidFrom)} – {formatPersianDate(row.endpointValidTo)}</TableCell><TableCell><ObjectStatus state={row.status === "ACTIVE" ? "Positive" : "None"}>{t(`centralAssignment.status.${row.status}`)}</ObjectStatus></TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell></TableRow>)}
  </Table> : <MessageStrip design="Information">{t("centralAssignment.empty")}</MessageStrip>}</section>;
}
