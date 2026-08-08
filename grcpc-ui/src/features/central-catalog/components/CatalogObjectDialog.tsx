import type { ReactNode } from "react";
import { Dialog } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

interface CatalogObjectDialogProps {
  open: boolean;
  title: string;
  mode: "create" | "edit" | "view";
  onClose: () => void;
  children: ReactNode;
}

export function CatalogObjectDialog({
  open,
  title,
  mode,
  onClose,
  children,
}: CatalogObjectDialogProps) {
  const { t } = useTranslation();
  const action =
    mode === "create"
      ? t("common.create", { defaultValue: "ایجاد" })
      : mode === "edit"
        ? t("common.edit", { defaultValue: "ویرایش" })
        : t("common.view", { defaultValue: "مشاهده" });
  const dialogTitle = `${action} — ${title}`;
  const handleDialogClose = (event: unknown) => {
    const closeEvent = event as {
      target?: EventTarget | null;
      currentTarget?: EventTarget | null;
    };
    if (closeEvent.currentTarget && closeEvent.target !== closeEvent.currentTarget) return;
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      accessibleName={dialogTitle}
      className="catalogObjectDialog"
      onClose={handleDialogClose}
    >
      <ModalDialogHeader title={dialogTitle} onClose={() => onClose()} />
      <div className="catalogObjectDialogContent">{children}</div>
    </Dialog>
  );
}
