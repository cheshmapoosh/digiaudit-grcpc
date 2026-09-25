import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BusyIndicator,
  Link,
  MessageStrip,
  ObjectStatus,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
} from "@ui5/webcomponents-react";

import { formatPersianDate } from "@/shared/utils/date.utils";

export interface CoverageInverseRow {
  id: string;
  subprocessId: string;
  subprocessCode: string;
  subprocessTitle: string;
  relatedId: string;
  relatedCode: string;
  relatedTitle: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  validFrom: string | null;
  validTo: string | null;
  endpointSummary: string;
}

interface Props {
  title?: string;
  empty: string;
  load: (signal: AbortSignal) => Promise<CoverageInverseRow[]>;
  columns: {
    subprocess: string;
    related: string;
    status: string;
    validity: string;
    endpoint: string;
  };
  errorText: string;
  relatedHref?: (id: string) => string;
}

export function CoverageInverseTable({ title, empty, load, columns, errorText, relatedHref }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CoverageInverseRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void Promise.resolve()
      .then(() => {
        if (active) setBusy(true);
        return load(controller.signal);
      })
      .then((nextRows) => {
        if (!active) return;
        setRows(nextRows);
        setError(false);
      })
      .catch((cause: unknown) => {
        if (active && !(cause instanceof Error && cause.name === "AbortError")) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [load]);

  return (
    <section>
      {title ? <Title level="H5">{title}</Title> : null}
      {error ? (
        <MessageStrip design="Negative">{errorText}</MessageStrip>
      ) : busy ? (
        <BusyIndicator active delay={0} />
      ) : rows.length ? (
        <Table
          headerRow={(
            <TableHeaderRow>
              <TableHeaderCell>{columns.subprocess}</TableHeaderCell>
              <TableHeaderCell>{columns.related}</TableHeaderCell>
              <TableHeaderCell>{columns.status}</TableHeaderCell>
              <TableHeaderCell>{columns.validity}</TableHeaderCell>
              <TableHeaderCell>{columns.endpoint}</TableHeaderCell>
            </TableHeaderRow>
          )}
        >
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link href={`/processes/${row.subprocessId}`}>
                  {`${row.subprocessCode} - ${row.subprocessTitle}`}
                </Link>
              </TableCell>
              <TableCell>
                {relatedHref ? (
                  <Link href={relatedHref(row.relatedId)}>
                    {`${row.relatedCode} - ${row.relatedTitle}`}
                  </Link>
                ) : `${row.relatedCode} - ${row.relatedTitle}`}
              </TableCell>
              <TableCell>
                <ObjectStatus state={row.status === "ACTIVE" ? "Positive" : "None"}>
                  {t(`coverage.status.${row.status}`, { defaultValue: row.status })}
                </ObjectStatus>
              </TableCell>
              <TableCell>
                {`${formatPersianDate(row.validFrom)} – ${formatPersianDate(row.validTo)}`}
              </TableCell>
              <TableCell>
                {row.endpointSummary
                  .split(" / ")
                  .map((status) => t(`coverage.status.${status}`, { defaultValue: status }))
                  .join(" / ")}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      ) : (
        <div>{empty}</div>
      )}
    </section>
  );
}
