import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Input } from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { CentralRiskCategorySummary } from "../domain/centralRisk.model";
import {
  collectRiskCategoryDescendantIds,
  riskNodeKey,
} from "../utils/centralRisk.tree";
import CentralRiskTree from "./CentralRiskTree";

interface Props {
  open: boolean;
  categories: CentralRiskCategorySummary[];
  currentCategoryId?: string | null;
  selectedCategoryId?: string | null;
  requiredParent?: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (categoryId: string | null) => void;
}

export default function RiskCategoryValueHelpDialog({
  open,
  categories,
  currentCategoryId,
  selectedCategoryId,
  requiredParent = false,
  busy = false,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");

  const selectableCategories = useMemo(() => {
    const excluded = new Set<string>();
    if (currentCategoryId) {
      excluded.add(currentCategoryId);
      collectRiskCategoryDescendantIds(categories, currentCategoryId).forEach((id) => excluded.add(id));
    }
    return categories.filter((category) => !excluded.has(category.id));
  }, [categories, currentCategoryId]);

  const title = t("risk.parent.dialogTitle");

  return (
    <Dialog
      open={open}
      accessibleName={title}
      style={{ width: "70vw", maxWidth: "70vw" }}
      onClose={onClose}
    >
      <ModalDialogHeader title={title} onClose={onClose} />
      <div className="riskParentDialogContent">
        <Input
          value={searchText}
          disabled={busy}
          placeholder={t("risk.parent.search")}
          onInput={(event) => setSearchText(event.target.value)}
        />

        {!requiredParent ? (
          <Button
            design={!selectedCategoryId ? "Emphasized" : "Default"}
            disabled={busy}
            onClick={() => {
              onSelect(null);
              onClose();
            }}
          >
            {t("risk.parent.none")}
          </Button>
        ) : null}

        <div className="riskParentTreeFrame">
          <CentralRiskTree
            categories={selectableCategories}
            templates={[]}
            selectedKey={selectedCategoryId ? riskNodeKey("category", selectedCategoryId) : null}
            searchText={searchText}
            busy={busy}
            onSelect={(node) => {
              onSelect(node.id);
              onClose();
            }}
          />
        </div>

        <div className="riskParentDialogFooter">
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
