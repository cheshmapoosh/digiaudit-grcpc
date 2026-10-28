import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, FlexBox, MessageStrip, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Text, Title } from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralRegulationRequirementSummary } from "../domain/centralRegulation.model";
import RequirementImportDialog from "./RequirementImportDialog";

interface Props {
  regulationId: string;
  regulationTitle: string;
  requirements: CentralRegulationRequirementSummary[];
  canImport: boolean;
  editable: boolean;
  busy: boolean;
  onImported: () => Promise<boolean>;
  onPendingChange: (pending: boolean) => void;
}

export default function RegulationRequirementsTab({ regulationId, regulationTitle, requirements, canImport, editable, busy, onImported, onPendingChange }: Props) {
  const { t } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  return <FlexBox direction="Column" className="regulationRequirementsTab">
    <Bar startContent={<Title level="H5">{t("regulation.tabs.requirements")}</Title>} endContent={canImport ?
      <Button icon="excel-attachment" disabled={busy || editable} onClick={() => setImportOpen(true)}>{t("regulation.import.action")}</Button> : null} />
    {editable && canImport ? <MessageStrip design="Information" hideCloseButton>{t("regulation.import.finishEdit")}</MessageStrip> : null}
    {requirements.length ? <Table accessibleName={t("regulation.tabs.requirements")} headerRow={<TableHeaderRow>
      <TableHeaderCell>{t("regulation.import.fields.code")}</TableHeaderCell><TableHeaderCell>{t("regulation.import.fields.title")}</TableHeaderCell>
      <TableHeaderCell>{t("regulation.fields.status")}</TableHeaderCell><TableHeaderCell>{t("regulation.fields.validFrom")}</TableHeaderCell>
      <TableHeaderCell>{t("regulation.fields.validTo")}</TableHeaderCell>
    </TableHeaderRow>}>
      {requirements.map(row => <TableRow key={row.id}><TableCell><Text>{row.code}</Text></TableCell><TableCell><Text>{row.title}</Text></TableCell>
        <TableCell><ObjectStatus state={row.status === "ACTIVE" ? "Positive" : "None"}>{t(`regulation.status.${row.status}`)}</ObjectStatus></TableCell>
        <TableCell>{formatPersianDate(row.validFrom)}</TableCell><TableCell>{formatPersianDate(row.validTo)}</TableCell>
      </TableRow>)}
    </Table> : <MessageStrip design="Information" hideCloseButton>{t("regulation.import.emptyList")}</MessageStrip>}
    {importOpen ? <RequirementImportDialog regulationId={regulationId} regulationTitle={regulationTitle}
      onClose={() => setImportOpen(false)} onImported={onImported} onPendingChange={onPendingChange} /> : null}
  </FlexBox>;
}
