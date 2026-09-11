import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Button, CheckBox, Dialog, MessageStrip, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { ControlObjectiveAccountGroupClassification } from "../domain/controlObjectiveAccountGroup.model";
import { controlObjectiveAccountGroupApi } from "../infra/controlObjectiveAccountGroup.api";
import { controlObjectiveAccountGroupErrorMessage } from "../utils/controlObjectiveAccountGroupError";

export default function DeletedControlObjectiveClassificationDialog({
  open,
  controlObjectiveId,
  stagedAccountGroupIds,
  busy,
  onClose,
  onRestore,
}: {
  open: boolean;
  controlObjectiveId: string;
  stagedAccountGroupIds: Set<string>;
  busy: boolean;
  onClose: () => void;
  onRestore: (rows: ControlObjectiveAccountGroupClassification[]) => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ControlObjectiveAccountGroupClassification[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setSelected(new Set());
      setError(null);
      void controlObjectiveAccountGroupApi.deletedForControlObjective(
        controlObjectiveId,
        controller.signal,
      ).then(setRows).catch((cause) => {
        if (!(cause instanceof Error && cause.name === "AbortError")) {
          setError(controlObjectiveAccountGroupErrorMessage(cause, t));
        }
      }).finally(() => setLoading(false));
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [controlObjectiveId, open, t]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.classificationId)),
    [rows, selected],
  );
  const toggle = (id: string, checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  });

  return (
    <Dialog
      open={open}
      accessibleName={t("controlObjectiveAccountGroup.restore.title")}
      className="controlObjectiveAccountGroupDialog"
      onClose={onClose}
    >
      <ModalDialogHeader title={t("controlObjectiveAccountGroup.restore.title")} onClose={onClose} />
      <div className="controlObjectiveAccountGroupDialogBody">
        {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}
        {loading ? <BusyIndicator active delay={0} /> : rows.length ? (
          <Table headerRow={(
            <TableHeaderRow>
              <TableHeaderCell>{t("controlObjectiveAccountGroup.restore.select")}</TableHeaderCell>
              <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.accountGroup")}</TableHeaderCell>
              <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.status")}</TableHeaderCell>
            </TableHeaderRow>
          )}>
            {rows.map((row) => (
              <TableRow key={row.classificationId} rowKey={row.classificationId}>
                <TableCell>
                  <CheckBox
                    checked={selected.has(row.classificationId)}
                    disabled={busy || stagedAccountGroupIds.has(row.accountGroupId)}
                    accessibleName={`${row.accountGroupCode} ${row.accountGroupTitle}`}
                    onChange={(event) => toggle(row.classificationId, event.target.checked)}
                  />
                </TableCell>
                <TableCell>{`${row.accountGroupCode} — ${row.accountGroupTitle}`}</TableCell>
                <TableCell>
                  <ObjectStatus state="Negative">
                    {t("controlObjectiveAccountGroup.status.DELETED")}
                  </ObjectStatus>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        ) : <div className="controlObjectiveAccountGroupEmpty">{t("controlObjectiveAccountGroup.restore.empty")}</div>}
        <div className="controlObjectiveAccountGroupDialogFooter">
          <Button
            design="Emphasized"
            disabled={busy || loading || selectedRows.length === 0}
            onClick={() => onRestore(selectedRows)}
          >
            {t("controlObjectiveAccountGroup.actions.restore")}
          </Button>
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
