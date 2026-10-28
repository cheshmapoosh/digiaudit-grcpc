import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, FlexBox } from "@ui5/webcomponents-react";
import { DialogFooterBar } from "./DialogFooter";
import { useDialogOpenAfterRender } from "../hooks/useDialogOpenAfterRender";
import "./management-pages.css";

export function ManagementDetailDialog({ title, busy = false, onEdit, onClose, children }: {
  title: string; busy?: boolean; onEdit?: () => void; onClose: () => void; children: ReactNode;
}) {
  const { t } = useTranslation();
  const open = useDialogOpenAfterRender();
  return <Dialog open={open} data-ui5-compact-size="" className="managementDetailDialog" accessibleName={title} headerText={title}
    onBeforeClose={(event) => { if (busy) event.preventDefault(); }} onClose={onClose}
    footer={<DialogFooterBar>
      {onEdit ? <Button design="Emphasized" disabled={busy} onClick={onEdit}>{t("common.edit")}</Button> : null}
      <Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.close")}</Button>
    </DialogFooterBar>}>
    <FlexBox direction="Column" className="managementDialogContent">{children}</FlexBox>
  </Dialog>;
}
