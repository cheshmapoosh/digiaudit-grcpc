import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@ui5/webcomponents-react";

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
      className="catalogObjectDialog"
      open={open}
      accessibleName={title}
      onClose={onClose}
    >
      <ModalDialogHeader title={title} onClose={onClose}  actions={<HeaderSearch value={searchText} onChange={(value) => setSearchText(value)} disabled={busy} accessibleName={t("risk.parent.search")} />} />
      <div className="riskParentDialogContent">

        <div className="riskParentTreeFrame">
          <CentralRiskTree
            categories={selectableCategories}
            templates={[]}
            selectedKey={selectedCategoryId ? riskNodeKey("category", selectedCategoryId) : null}
            searchText={searchText}
            busy={busy}
            onSelect={(node) => {
              if (busy) return;
              onSelect(node.id);
              onClose();
            }}
          />
        </div>

        <DialogFooter>
          {!requiredParent && selectedCategoryId ? <Button design="Negative" disabled={busy} onClick={() => { onSelect(null); onClose(); }}>{t("catalog.parentHeader.clear")}</Button> : null}
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
