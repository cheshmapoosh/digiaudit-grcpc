import { CatalogTreeOrder } from "@/shared/components/CatalogTreeOrder";
import { CatalogDeleteButton } from "@/shared/components/CatalogSelection";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Bar, BusyIndicator, MessageStrip, Title } from "@ui5/webcomponents-react";

import type { CentralAccountGroupSummary } from "../domain/centralAccountGroup.model";
import type { CentralAccountGroupTreeNode } from "../utils/centralAccountGroup.tree";
import CentralAccountGroupTree from "./CentralAccountGroupTree";

interface Props {
  rows: CentralAccountGroupSummary[];
  selectedId: string | null;
  expansionAnchorId?: string | null;
  searchText: string;
  busy: boolean;
  error: string | null;
  canCreate: boolean;
  canDelete: boolean;
  onErrorClose: () => void;
  onSearchTextChange: (value: string) => void;
  onCreate: () => void;
  onShow: () => void;
  onDelete: () => void;
  onSelect: (node: CentralAccountGroupTreeNode) => void;
}

export default function CentralAccountGroupListReport({
  rows,
  selectedId,
  expansionAnchorId,
  searchText,
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
    <div className="accountGroupListReport">
      <Bar
        startContent={<Title level="H4">{t("accountGroup.list.title")}</Title>}
        endContent={
          <>
            <HeaderSearch value={searchText} onChange={(value) => onSearchTextChange(value)} disabled={busy} accessibleName={t("accountGroup.list.search")} />
            <Button design="Emphasized" disabled={busy || !canCreate} onClick={onCreate}>
              {t("common.create", { defaultValue: "ایجاد" })}
            </Button>

            <Button design="Default" disabled={busy || !selectedId} onClick={onShow}>
              {t("common.view", { defaultValue: "نمایش" })}
            </Button>
            <CatalogDeleteButton
              design="Negative"
              disabled={busy || !selectedId || !canDelete}
              onClick={onDelete}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </CatalogDeleteButton>
          </>
        }
      />


      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}

      <div className="accountGroupTreeFrame">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <CatalogTreeOrder catalog="ACCOUNT_GROUP" refreshKey={JSON.stringify([rows])} filtered={Boolean(searchText.trim())}>
          <CentralAccountGroupTree
            rows={rows}
            selectedId={selectedId}
            expansionAnchorId={expansionAnchorId}
            searchText={searchText}
            busy={busy}
            onSelect={onSelect}
          />
        </CatalogTreeOrder>
      </div>
    </div>
  );
}
