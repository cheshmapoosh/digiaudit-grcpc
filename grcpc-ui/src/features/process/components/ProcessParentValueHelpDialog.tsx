import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  Input,
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
    onSelect(parentId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      accessibleName={title}
      style={{ width: "72vw", maxWidth: "72vw" }}
      onClose={onClose}
    >
      <ModalDialogHeader title={title} onClose={onClose} />
      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gap: "0.75rem",
          width: "68vw",
          minWidth: "32rem",
          maxWidth: "68vw",
          maxHeight: "70vh",
          padding: "0.75rem",
          boxSizing: "border-box",
        }}
      >
        <Input
          value={searchText}
          disabled={busy}
          placeholder={t("process.parent.search", { defaultValue: "جستجو بر اساس شناسه یا نام" })}
          onInput={(event) => setSearchText(event.target.value)}
        />

        <div style={{ overflow: "auto", minHeight: "18rem" }}>
          <List separators="Inner">
            {allowNoParent ? (
              <ListItemStandard
                selected={!selectedParentId}
                onClick={() => select(null)}
              >
                {t("process.parent.none", { defaultValue: "بدون والد" })}
              </ListItemStandard>
            ) : null}
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

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
