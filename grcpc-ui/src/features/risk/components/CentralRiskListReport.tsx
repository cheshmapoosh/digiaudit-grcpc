import { CatalogTreeOrder } from "@/shared/components/CatalogTreeOrder";
import { CatalogDeleteButton } from "@/shared/components/CatalogSelection";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import {
  Bar,
  BusyIndicator,
  MessageStrip,
  Title,
} from "@ui5/webcomponents-react";

import type {
  CentralRiskCategorySummary,
  CentralRiskCreateKind,
  CentralRiskTemplateSummary,
} from "../domain/centralRisk.model";
import type { CentralRiskTreeNode } from "../utils/centralRisk.tree";
import CentralRiskCreateMenu from "./CentralRiskCreateMenu";
import CentralRiskTree from "./CentralRiskTree";

interface Props {
  categories: CentralRiskCategorySummary[];
  templates: CentralRiskTemplateSummary[];
  selectedKey: string | null;
  expansionAnchorKey?: string | null;
  searchText: string;
  contextCategoryId: string | null;
  busy: boolean;
  error: string | null;
  canCreate: boolean;
  canDelete: boolean;
  onErrorClose: () => void;
  onSearchTextChange: (value: string) => void;
  onCreate: (kind: CentralRiskCreateKind) => void;
  onShow: () => void;
  onDelete: () => void;
  onSelect: (node: CentralRiskTreeNode) => void;
}

export default function CentralRiskListReport({
  categories,
  templates,
  selectedKey,
  expansionAnchorKey,
  searchText,
  contextCategoryId,
  busy,
  error,
  canCreate,
  canDelete,
  onErrorClose,
  onSearchTextChange,
  onCreate,
  onShow,
  onDelete,
  onSelect,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="riskListReport">
      <Bar
        startContent={<Title level="H4">{t("risk.list.title")}</Title>}
        endContent={
          <>
            <HeaderSearch value={searchText} onChange={(value) => onSearchTextChange(value)} disabled={busy} accessibleName={t("risk.list.search")} />
            <CentralRiskCreateMenu
              disabled={busy || !canCreate}
              templateEnabled={Boolean(contextCategoryId)}
              onCreate={onCreate}
            />

            <Button
              design="Default"
              disabled={busy || !selectedKey}
              onClick={onShow}
            >
              {t("common.view", { defaultValue: "نمایش" })}
            </Button>
            <CatalogDeleteButton
              design="Negative"
              disabled={busy || !selectedKey || !canDelete}
              onClick={onDelete}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </CatalogDeleteButton>
          </>
        }
      />


      {error ? (
        <MessageStrip design="Negative" onClose={onErrorClose}>
          {error}
        </MessageStrip>
      ) : null}

      <div className="riskTreeFrame">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <CatalogTreeOrder catalog="RISK" refreshKey={JSON.stringify([categories, templates])} filtered={Boolean(searchText.trim())}>
          <CentralRiskTree
            categories={categories}
            templates={templates}
            selectedKey={selectedKey}
            expansionAnchorKey={expansionAnchorKey}
            searchText={searchText}
            busy={busy}
            onSelect={onSelect}
          />
        </CatalogTreeOrder>
      </div>
    </div>
  );
}
