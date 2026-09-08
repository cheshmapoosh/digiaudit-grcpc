import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Link, MessageStrip, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Title } from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { ControlAccountGroupClassification } from "../domain/controlAccountGroup.model";
import { controlAccountGroupApi } from "../infra/controlAccountGroup.api";
import { useClassificationDestinationPermissions, useControlAccountGroupPermissions } from "../security/controlAccountGroupPermissions";
import { controlAccountGroupErrorMessage } from "../utils/controlAccountGroupError";
import "../control-account-group.css";

export default function AccountGroupControlsTab({ accountGroupId, allowControlNavigation = true }: { accountGroupId: string; allowControlNavigation?: boolean }) {
  const { t } = useTranslation(); const permissions = useControlAccountGroupPermissions(); const destinations = useClassificationDestinationPermissions(); const [rows, setRows] = useState<ControlAccountGroupClassification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); if (!permissions.view) return () => controller.abort(); void controlAccountGroupApi.forAccountGroup(accountGroupId, controller.signal).then(setRows).catch((cause) => { if (!(cause instanceof Error && cause.name === "AbortError")) setError(controlAccountGroupErrorMessage(cause, t)); }).finally(() => setLoading(false)); return () => controller.abort(); }, [accountGroupId, permissions.view, t]);
  if (!permissions.view) return <MessageStrip design="Information">{t("controlAccountGroup.errors.forbidden")}</MessageStrip>;
  return <section className="controlAccountGroupTab"><Title level="H5">{t("controlAccountGroup.inverse.title")}</Title>{error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}{loading ? <BusyIndicator active delay={0} /> : rows.length ? <Table headerRow={<TableHeaderRow><TableHeaderCell>{t("controlAccountGroup.fields.control")}</TableHeaderCell><TableHeaderCell>{t("controlAccountGroup.fields.validFrom")}</TableHeaderCell><TableHeaderCell>{t("controlAccountGroup.fields.validTo")}</TableHeaderCell><TableHeaderCell>{t("controlAccountGroup.fields.status")}</TableHeaderCell></TableHeaderRow>}>{rows.map((row) => <TableRow key={row.classificationId} rowKey={row.classificationId}><TableCell>{allowControlNavigation && destinations.controlView ? <Link href="/controls" wrappingType="Normal">{`${row.controlCode} — ${row.controlTitle}`}</Link> : `${row.controlCode} — ${row.controlTitle}`}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell><ObjectStatus state={row.status === "ACTIVE" ? "Positive" : "None"}>{t(`controlAccountGroup.status.${row.status}`)}</ObjectStatus></TableCell></TableRow>)}</Table> : <div className="controlAccountGroupEmpty">{t("controlAccountGroup.inverse.empty")}</div>}</section>;
}
