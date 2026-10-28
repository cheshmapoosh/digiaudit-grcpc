import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  BusyIndicator, Button, Dialog, FileUploader, FlexBox, MessageStrip, ObjectStatus,
  Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Text, Title,
} from "@ui5/webcomponents-react";
import { CatalogTableViewport } from "@/shared/components/CatalogTableViewport";
import { DialogFooterBar } from "@/shared/components/DialogFooter";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useDialogOpenAfterRender } from "@/shared/hooks/useDialogOpenAfterRender";
import { HttpError } from "@/shared/infra/http.client";
import { formatPersianDate, toPersianDigits } from "@/shared/utils/date.utils";
import type { RequirementImportIssue, RequirementImportPreview, RequirementImportRow } from "../domain/requirementImport.model";
import { requirementImportApi } from "../infra/requirementImport.api.repo";

interface Props {
  regulationId: string;
  regulationTitle: string;
  reservedCodes: string[];
  onClose: () => void;
  onStaged: (rows: RequirementImportRow[]) => void;
}

const PAGE_SIZE = 25;

function rejectDuplicateDrafts(preview: RequirementImportPreview, reservedCodes: string[]): RequirementImportPreview {
  const occupied = new Set(reservedCodes.map(code => code.trim()));
  const issues: RequirementImportIssue[] = [...preview.issues];
  for (const row of preview.rows) {
    const code = row.code.trim();
    if (row.operation !== "CREATE" || occupied.has(code)) {
      issues.push({ rowNumber: row.rowNumber, field: "code", code: "DUPLICATE_CODE" });
    }
    occupied.add(code);
  }
  return issues.length ? { ...preview, valid: false, rows: [], issues } : preview;
}

/** File parsing/validation is immediate; confirmation only stages parent-owned drafts. */
export default function RequirementImportDialog({ regulationId, regulationTitle, reservedCodes, onClose, onStaged }: Props) {
  const { t, i18n } = useTranslation();
  const open = useDialogOpenAfterRender();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RequirementImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const number = (value: number) => i18n.language.startsWith("fa") ? toPersianDigits(String(value)) : String(value);
  const close = () => { if (!running.current) { mounted.current = false; onClose(); } };

  const selectFile = (next: File | undefined) => {
    if (!next || running.current) return;
    setFile(null); setPreview(null); setPage(0); setError(null);
    if (!next.name.toLowerCase().endsWith(".xlsx")) {
      setError(t("regulation.import.issues.FILE_FORMAT"));
    } else if (next.size === 0 || next.size > 2 * 1024 * 1024) {
      setError(t("regulation.import.issues.FILE_SIZE"));
    } else setFile(next);
  };
  const errorText = (reason: unknown) => {
    if (reason instanceof HttpError) {
      switch (reason.code) {
        case "REQUIREMENT_IMPORT_PREVIEW_STALE": return t("regulation.import.stale");
        case "HIERARCHY_BUSY": return t("regulation.import.hierarchyBusy");
        case "PARENT_NOT_FOUND": return t("regulation.errors.notFound");
        case "FORBIDDEN": case "PROFILE_READ_ONLY": case "PROFILE_ACCESS_DENIED": return t("regulation.import.forbidden");
        case "NETWORK_ERROR": return t("common.networkError");
      }
    }
    return t("regulation.import.failed");
  };
  const downloadTemplate = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const blob = await requirementImportApi.template(regulationId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "regulation-requirements-template.xlsx"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { if (mounted.current) setError(errorText(reason)); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  const validate = async () => {
    if (!file || running.current) return;
    running.current = true; setBusy(true); setError(null); setPreview(null); setPage(0);
    try {
      const next = await requirementImportApi.draftPreview(regulationId, file, reservedCodes);
      if (mounted.current) setPreview(rejectDuplicateDrafts(next, reservedCodes));
    } catch (reason) { if (mounted.current) setError(errorText(reason)); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  const stage = () => {
    if (!preview?.valid || preview.regulationId !== regulationId || !preview.rows.length || running.current) return;
    const current = rejectDuplicateDrafts(preview, reservedCodes);
    if (!current.valid) { setPreview(current); setPage(0); return; }
    running.current = true;
    try { onStaged(current.rows); }
    finally { running.current = false; }
  };
  const count = preview?.valid ? preview.rows.length : preview?.issues.length ?? 0;
  const pages = Math.ceil(count / PAGE_SIZE);
  const offset = page * PAGE_SIZE;
  return createPortal(
    <Dialog open={open} accessibleName={t("regulation.import.title")} className="regulationImportDialog catalogObjectDialog"
      onBeforeClose={event => { if (running.current) event.preventDefault(); }} onClose={close}>
      <ModalDialogHeader title={t("regulation.import.title")} onClose={close} />
      <FlexBox data-catalog-dialog-content direction="Column" className="regulationImportContent" dir={i18n.dir()}>
        <Title level="H5">{t("regulation.import.target", { title: regulationTitle })}</Title>
        <Text>{t("regulation.import.help")}</Text>
        <FlexBox wrap="Wrap" alignItems="Center" className="regulationImportActions">
          <Button icon="download" disabled={busy} onClick={() => void downloadTemplate()}>{t("regulation.import.template")}</Button>
          <FileUploader hideInput accept=".xlsx" disabled={busy} accessibleName={t("regulation.import.chooseFile")}
            onChange={event => { const uploader = event.currentTarget; if (uploader) { selectFile(uploader.files?.[0]); uploader.value = ""; } }}>
            <Button icon="upload" disabled={busy}>{t("regulation.import.chooseFile")}</Button>
          </FileUploader>
          {file ? <Text>{file.name}</Text> : null}
        </FlexBox>
        {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
        {busy ? <BusyIndicator active delay={0} aria-label={t("regulation.import.processing")} /> : null}
        {preview ? <>
          <ObjectStatus state={preview.valid ? "Positive" : "Negative"}>
            {preview.valid ? t("regulation.import.previewReady", { count: preview.rows.length }) : t("regulation.import.invalid", { count: preview.issues.length })}
          </ObjectStatus>
          {preview.valid ? <Text>{t("regulation.import.confirmHelp")}</Text> : null}
          <CatalogTableViewport accessibleName={t("regulation.import.preview")}>
            {preview.valid ? <Table overflowMode="Scroll" noDataText={t("common.noData")} accessibleName={t("regulation.import.preview")} headerRow={<TableHeaderRow>
              {["rowNumber", "title", "description", "code", "sortOrder", "validFrom", "validTo", "operation"].map(field =>
                <TableHeaderCell key={field}>{t(`regulation.import.fields.${field}`)}</TableHeaderCell>)}
            </TableHeaderRow>}>
              {preview.rows.slice(offset, offset + PAGE_SIZE).map(row => <TableRow key={row.rowNumber}>
                <TableCell>{number(row.rowNumber)}</TableCell><TableCell><Text>{row.title}</Text></TableCell>
                <TableCell><Text>{row.description || "—"}</Text></TableCell><TableCell><Text>{row.code}</Text></TableCell>
                <TableCell>{number(row.sortOrder)}</TableCell><TableCell>{formatPersianDate(row.validFrom)}</TableCell>
                <TableCell>{formatPersianDate(row.validTo)}</TableCell><TableCell>{t("regulation.requirements.draftActive")}</TableCell>
              </TableRow>)}
            </Table> : <Table overflowMode="Scroll" noDataText={t("common.noData")} accessibleName={t("regulation.import.validationErrors")} headerRow={<TableHeaderRow>
              <TableHeaderCell>{t("regulation.import.fields.rowNumber")}</TableHeaderCell>
              <TableHeaderCell>{t("regulation.import.column")}</TableHeaderCell><TableHeaderCell>{t("regulation.import.problem")}</TableHeaderCell>
            </TableHeaderRow>}>
              {preview.issues.slice(offset, offset + PAGE_SIZE).map((issue, index) => <TableRow key={`${offset + index}`}>
                <TableCell>{issue.rowNumber > 0 ? number(issue.rowNumber) : "—"}</TableCell>
                <TableCell>{t(`regulation.import.fields.${issue.field}`)}</TableCell>
                <TableCell><Text>{t(`regulation.import.issues.${issue.code}`, { defaultValue: t("regulation.import.failed") })}</Text></TableCell>
              </TableRow>)}
            </Table>}
          </CatalogTableViewport>
          {pages > 1 ? <FlexBox alignItems="Center" justifyContent="Center" className="regulationImportActions">
            <Button disabled={page === 0 || busy} onClick={() => setPage(current => current - 1)}>{t("regulation.import.previous")}</Button>
            <Text>{t("regulation.import.page", { page: number(page + 1), pages: number(pages) })}</Text>
            <Button disabled={page + 1 >= pages || busy} onClick={() => setPage(current => current + 1)}>{t("regulation.import.next")}</Button>
          </FlexBox> : null}
        </> : null}
      </FlexBox>
      <DialogFooterBar slot="footer">
        {!preview?.valid ? <Button design="Emphasized" disabled={!file || busy} onClick={() => void validate()}>{t("regulation.import.validate")}</Button> : null}
        {preview?.valid ? <Button design="Emphasized" disabled={busy} onClick={stage}>{t("regulation.import.save")}</Button> : null}
        <Button disabled={busy} onClick={close}>{t("common.cancel")}</Button>
      </DialogFooterBar>
    </Dialog>, document.body,
  );
}
