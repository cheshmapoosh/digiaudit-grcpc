import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox, Form, FormItem, Label, Text, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, TableSelectionMulti } from "@ui5/webcomponents-react";
import { CatalogTableViewport } from "./CatalogTableViewport";
import "./catalog-relation.css";

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
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set());
  const selection = selectedKeys ?? localSelection;
  const mainColumns = [["code", "username"], ["name", "title"], ["status"], ["validFrom"], ["validTo"]]
    .flatMap(keys => {
      const column = columns.find(item => keys.includes(item.key));
      return column ? [column] : [];
    });
  const details = columns.filter(column => !mainColumns.includes(column));
  const visibleKeys = new Set(rows.map(rowKey));
  const selectedRows = rows.filter(row => selection.has(rowKey(row)));
  const detailRow = selectedRows.length === 1 ? selectedRows[0] : null;
  const detailColumns = details.length > 6 ? 3 : details.length === 1 ? 1 : 2;
  return <FlexBox direction="Column" className="catalogRelationContent">
    <CatalogTableViewport accessibleName={accessibleName}>
    <Table accessibleName={accessibleName} overflowMode="Scroll" loading={loading}
      inert={busy || loading} noDataText={emptyText ?? t("catalogRelation.empty")}
      features={selectable || details.length ? <TableSelectionMulti selected={[...selection].filter(key => visibleKeys.has(key)).join(" ")}
        onChange={event => {
          // UI5 select-all changes only this table's currently visible rows.
          const next = new Set([...selection].filter(key => !visibleKeys.has(key)));
          event.target.getSelectedAsSet().forEach(key => next.add(key));
          if (selectedKeys === undefined) setLocalSelection(next);
          onSelectionChange?.(next);
        }} /> : undefined}
      headerRow={<TableHeaderRow>{mainColumns.map(column => <TableHeaderCell key={column.key}>{column.header}</TableHeaderCell>)}</TableHeaderRow>}>
      {rows.map(row => <TableRow key={rowKey(row)} rowKey={rowKey(row)}>
        {mainColumns.map(column => <TableCell key={column.key}>{column.cell(row)}</TableCell>)}
      </TableRow>)}
    </Table>
    </CatalogTableViewport>
    {details.length ? detailRow ? <Form key={rowKey(detailRow)} headerText={t("catalogRelation.details")} headerLevel="H5"
      accessibleName={t("catalogRelation.details")} accessibleMode={selectable ? "Edit" : "Display"}
      itemSpacing="Normal" labelSpan="S12 M12 L12 XL12" layout={`S1 M2 L${detailColumns} XL${detailColumns}`}>
      {details.map(column => {
        const value = column.cell(detailRow);
        return <FormItem key={column.key} labelContent={<Label>{column.header}</Label>}>
          {typeof value === "string" || typeof value === "number" ? <Text>{value}</Text> : value}
        </FormItem>;
      })}
    </Form> : <Text>{t("catalogRelation.detailsHint")}</Text> : null}
  </FlexBox>;
}
