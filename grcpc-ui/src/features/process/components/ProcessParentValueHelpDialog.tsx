import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  List,
  ListItemStandard,
} from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { ProcessNode } from "../domain/process.model";

interface Props {
  open: boolean;
  items: ProcessNode[];
  selectedParentId: string | null;
  allowNoParent: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (parentId: string | null) => void;
}

export default function ProcessParentValueHelpDialog({
  open,
  items,
  selectedParentId,
  allowNoParent,
  busy = false,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.code.toLocaleLowerCase().includes(query) ||
        item.title.toLocaleLowerCase().includes(query),
    );
  }, [items, searchText]);

  const title = t("process.parent.dialogTitle", { defaultValue: "انتخاب والد" });

  const select = (parentId: string | null) => {
    if (busy) return;
    onSelect(parentId);
    onClose();
  };

  return (
    <Dialog
      className="catalogObjectDialog"
      open={open}
      accessibleName={title}
      onClose={onClose}
    >
      <ModalDialogHeader title={title} onClose={onClose}  actions={<HeaderSearch value={searchText} onChange={(value) => setSearchText(value)} disabled={busy} accessibleName={t("process.parent.search", { defaultValue: "جستجو بر اساس شناسه یا نام" })} />} />
      <div
        style={{
          display: "grid",
          gridTemplateRows: "minmax(0, 1fr) auto",
          gap: "0.75rem",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          maxHeight: "70vh",
          padding: "0.75rem",
          boxSizing: "border-box",
        }}
      >


        <div style={{ overflow: "auto", minHeight: "18rem" }}>
          <List separators="Inner" noDataText={t("common.noData")}>
            {filteredItems.map((item) => (
              <ListItemStandard
                key={item.id}
                selected={item.id === selectedParentId}
                additionalText={item.code}
                description={`${item.code} - ${item.title}`}
                onClick={() => select(item.id)}
              >
                {item.title}
              </ListItemStandard>
            ))}
          </List>
        </div>

        <DialogFooter>
          {allowNoParent && selectedParentId ? <Button design="Negative" disabled={busy} onClick={() => select(null)}>{t("catalog.parentHeader.clear")}</Button> : null}
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
