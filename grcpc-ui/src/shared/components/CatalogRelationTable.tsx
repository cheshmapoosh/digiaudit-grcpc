import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, TableSelectionMulti } from "@ui5/webcomponents-react";
import { CatalogTableViewport } from "./CatalogTableViewport";

export interface CatalogRelationColumn<Row> {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
}

/** Presentation only: domain state and commands remain with the owning feature. */
export function CatalogRelationTable<Row>({ rows, columns, rowKey, accessibleName,
  selectedKeys, onSelectionChange, selectable = false, loading = false, busy = false,
  emptyText }: {
  rows: Row[];
  columns: CatalogRelationColumn<Row>[];
  rowKey: (row: Row) => string;
  accessibleName: string;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  selectable?: boolean;
  loading?: boolean;
  busy?: boolean;
  emptyText?: string;
}) {
  const { t } = useTranslation();
  const visibleKeys = new Set(rows.map(rowKey));
  return <CatalogTableViewport accessibleName={accessibleName}>
    <Table accessibleName={accessibleName} overflowMode="Scroll" loading={loading}
      inert={busy || loading} noDataText={emptyText ?? t("catalogRelation.empty")}
      features={selectable ? <TableSelectionMulti selected={[...(selectedKeys ?? [])].filter(key => visibleKeys.has(key)).join(" ")}
        onChange={event => {
          // UI5 select-all changes only this table's currently visible rows.
          const next = new Set([...(selectedKeys ?? [])].filter(key => !visibleKeys.has(key)));
          event.target.getSelectedAsSet().forEach(key => next.add(key));
          onSelectionChange?.(next);
        }} /> : undefined}
      headerRow={<TableHeaderRow>{columns.map(column => <TableHeaderCell key={column.key}>{column.header}</TableHeaderCell>)}</TableHeaderRow>}>
      {rows.map(row => <TableRow key={rowKey(row)} rowKey={rowKey(row)}>
        {columns.map(column => <TableCell key={column.key}>{column.cell(row)}</TableCell>)}
      </TableRow>)}
    </Table>
  </CatalogTableViewport>;
}
