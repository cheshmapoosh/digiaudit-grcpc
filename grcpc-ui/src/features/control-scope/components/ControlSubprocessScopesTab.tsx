import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BusyIndicator,
  Button,
  Input,
  Label,
  MessageStrip,
  Option,
  Select,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
} from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralSubprocessControlScope, ControlScopeStatusFilter } from "../domain/controlScope.model";
import { controlScopeApi } from "../infra/controlScope.api.repo";
import { useControlScopePermissions } from "../security/controlScopePermissions";
import { controlScopeErrorMessage } from "../utils/controlScopeError";
import "../control-scope.css";

interface Props { controlId: string; }

export default function ControlSubprocessScopesTab({ controlId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = useControlScopePermissions();
  const [rows, setRows] = useState<CentralSubprocessControlScope[]>([]);
  const [filter, setFilter] = useState<ControlScopeStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = ++generationRef.current;
    setBusy(true);
    setLoaded(false);
    try {
      const next = await controlScopeApi.listForControl(controlId, filter, search, signal);
      if (generation === generationRef.current) { setRows(next); setError(null); setLoaded(true); }
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      if (generation === generationRef.current) setError(controlScopeErrorMessage(loadError, t));
    } finally {
      if (generation === generationRef.current) setBusy(false);
    }
  }, [controlId, filter, search, t]);

  useEffect(() => {
    if (!permissions.view) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, permissions.view]);

  if (!permissions.view) return <MessageStrip design="Negative">{t("controlScope.errors.forbidden")}</MessageStrip>;

  return (
    <section className="controlScopeTab">
      <div className="controlScopeToolbar">
        <Title level="H5">{t("control.tabs.subprocesses")}</Title>
        <div className="controlScopeFilter">
          <Label showColon>{t("controlScope.filter.label")}</Label>
          <Select value={filter} disabled={busy} onChange={(event) => setFilter(event.target.value as ControlScopeStatusFilter)}>
            <Option value="ALL">{t("controlScope.filter.all")}</Option>
            <Option value="ACTIVE">{t("controlScope.status.ACTIVE")}</Option>
            <Option value="INACTIVE">{t("controlScope.status.INACTIVE")}</Option>
          </Select>
        </div>
      </div>
      <Input value={search} placeholder={t("controlScope.dialog.subprocessSearch")} disabled={busy} onInput={(event) => setSearch(event.target.value)} />
      {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
      {busy ? <BusyIndicator active delay={0} /> : loaded && rows.length ? <Table headerRow={<TableHeaderRow>
          <TableHeaderCell>{t("controlScope.fields.subprocess")}</TableHeaderCell>
          <TableHeaderCell>{t("controlScope.fields.status")}</TableHeaderCell>
          <TableHeaderCell>{t("controlScope.fields.validFrom")}</TableHeaderCell>
          <TableHeaderCell>{t("controlScope.fields.validTo")}</TableHeaderCell>
        </TableHeaderRow>}>
          {rows.map((row) => <TableRow key={row.id} rowKey={row.id}>
            <TableCell><Button design="Transparent" disabled={busy} onClick={() => navigate(`/processes/${row.subprocessId}`)}>{`${row.subprocessCode} - ${row.subprocessTitle}`}</Button></TableCell>
            <TableCell>{t(`controlScope.status.${row.status}`)}</TableCell>
            <TableCell>{formatPersianDate(row.validFrom)}</TableCell>
            <TableCell>{formatPersianDate(row.validTo)}</TableCell>
          </TableRow>)}
        </Table> : loaded ? <div className="controlScopeEmpty">{t("controlScope.empty")}</div> : null}
    </section>
  );
}
