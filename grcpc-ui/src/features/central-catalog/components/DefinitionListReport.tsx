import {
  Button,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
} from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import type { CatalogActionPermissions } from "../security/catalogPermissions";
import type { DefinitionListRow } from "./catalogPresentation.model";

interface Props<T extends DefinitionListRow> {
  title: string;
  rows: T[];
  selectedId: string | null;
  busy: boolean;
  deletedMode: boolean;
  permissions: CatalogActionPermissions;
  onCreate: () => void;
  onSelect: (row: T) => void;
  onToggleDeleted: () => void;
  onRestore: (row: T) => void;
}

export function DefinitionListReport<T extends DefinitionListRow>({
  title,
  rows,
  selectedId,
  busy,
  deletedMode,
  permissions,
  onCreate,
  onSelect,
  onToggleDeleted,
  onRestore,
}: Props<T>) {
  const { t } = useTranslation();
  return (
    <section className="catalogListReport">
      <header className="catalogToolbar">
        <Title level="H3">{title}</Title>
        <span className="catalogToolbarActions">
          <Button
            design="Emphasized"
            hidden={!permissions.create}
            disabled={busy || deletedMode}
            onClick={onCreate}
          >
            {t("common.create", { defaultValue: "ایجاد" })}
          </Button>
          <Button disabled={busy} onClick={onToggleDeleted}>
            {deletedMode
              ? t("common.back", { defaultValue: "بازگشت" })
              : t("centralCatalog.deleted", { defaultValue: "حذف‌شده‌ها" })}
          </Button>
        </span>
      </header>
      <Table
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell>
              {t("common.code", { defaultValue: "کد" })}
            </TableHeaderCell>
            <TableHeaderCell>
              {t("common.title", { defaultValue: "عنوان" })}
            </TableHeaderCell>
            <TableHeaderCell>
              {t("common.status", { defaultValue: "وضعیت" })}
            </TableHeaderCell>
            <TableHeaderCell>
              {t("common.actions", { defaultValue: "عملیات" })}
            </TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {rows.map((row) => (
          <TableRow
            key={row.id}
            rowKey={row.id}
            className={selectedId === row.id ? "catalogSelectedRow" : undefined}
          >
            <TableCell>
              {deletedMode ? (
                row.code
              ) : (
                <Button
                  design="Transparent"
                  disabled={busy}
                  onClick={() => onSelect(row)}
                >
                  {row.code}
                </Button>
              )}
            </TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>
              {deletedMode ? (
                <Button
                  hidden={!permissions.restore}
                  disabled={busy}
                  onClick={() => onRestore(row)}
                >
                  {t("common.restore", { defaultValue: "بازیابی" })}
                </Button>
              ) : (
                <Button
                  design="Transparent"
                  disabled={busy}
                  onClick={() => onSelect(row)}
                >
                  {t("common.view", { defaultValue: "مشاهده" })}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </section>
  );
}
