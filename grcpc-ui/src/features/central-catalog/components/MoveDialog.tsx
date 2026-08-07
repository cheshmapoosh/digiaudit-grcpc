import {
  Button,
  Dialog,
  Input,
  Label,
  Option,
  Select,
} from "@ui5/webcomponents-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface MoveDestination {
  id: string;
  label: string;
}
interface Props {
  open: boolean;
  requiredParent: boolean;
  currentParentId: string | null;
  currentSortOrder: number;
  destinations: MoveDestination[];
  busy: boolean;
  onClose: () => void;
  onMove: (parentId: string | null, sortOrder: number) => void;
}

export function MoveDialog({
  open,
  requiredParent,
  currentParentId,
  currentSortOrder,
  destinations,
  busy,
  onClose,
  onMove,
}: Props) {
  const { t } = useTranslation();
  const [parentId, setParentId] = useState(currentParentId ?? "");
  const [sortOrder, setSortOrder] = useState(String(currentSortOrder));
  return (
    <Dialog
      open={open}
      headerText={t("centralCatalog.move", { defaultValue: "جابجایی" })}
      footer={
        <div className="catalogToolbarActions">
          <Button
            design="Emphasized"
            disabled={busy || (requiredParent && !parentId)}
            onClick={() => onMove(parentId || null, Number(sortOrder || 0))}
          >
            {t("centralCatalog.move", { defaultValue: "جابجایی" })}
          </Button>
          <Button disabled={busy} onClick={onClose}>
            {t("common.cancel", { defaultValue: "انصراف" })}
          </Button>
        </div>
      }
    >
      <Label>
        {t("centralCatalog.parent", { defaultValue: "والد / مالک" })}
        <Select
          value={parentId}
          disabled={busy}
          onChange={(event) =>
            setParentId(event.detail.selectedOption.dataset.id ?? "")
          }
        >
          {!requiredParent && (
            <Option data-id="">
              {t("centralCatalog.noParent", { defaultValue: "بدون والد" })}
            </Option>
          )}
          {destinations.map((item) => (
            <Option
              key={item.id}
              data-id={item.id}
              selected={item.id === parentId}
            >
              {item.label}
            </Option>
          ))}
        </Select>
      </Label>
      <Label>
        {t("centralCatalog.sortOrder", { defaultValue: "ترتیب نمایش" })}
        <Input
          type="Number"
          value={sortOrder}
          disabled={busy}
          onInput={(event) => setSortOrder(event.target.value)}
        />
      </Label>
    </Dialog>
  );
}
