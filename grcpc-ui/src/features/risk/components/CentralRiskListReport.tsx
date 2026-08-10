import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  Button,
  BusyIndicator,
  Input,
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
  const actionButtonStyle = useMemo<CSSProperties>(() => ({ minWidth: "8rem" }), []);
  const actionGroupStyle = useMemo<CSSProperties>(
    () => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "0.5rem",
      flexWrap: "wrap",
      whiteSpace: "nowrap",
    }),
    [],
  );

  return (
    <div className="riskListReport">
      <Bar
        startContent={<Title level="H4">{t("risk.list.title")}</Title>}
        endContent={
          <div style={actionGroupStyle}>
            <CentralRiskCreateMenu
              disabled={busy || !canCreate}
              templateEnabled={Boolean(contextCategoryId)}
              style={actionButtonStyle}
              onCreate={onCreate}
            />
            <Button
              design="Emphasized"
              disabled={busy || !selectedKey}
              style={actionButtonStyle}
              onClick={onShow}
            >
              {t("common.view", { defaultValue: "نمایش" })}
            </Button>
            <Button
              design="Negative"
              disabled={busy || !selectedKey || !canDelete}
              style={{ ...actionButtonStyle, marginInlineStart: "0.75rem" }}
              onClick={onDelete}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </Button>
          </div>
        }
      />

      <Input
        value={searchText}
        disabled={busy}
        placeholder={t("risk.list.search")}
        onInput={(event) => onSearchTextChange(event.target.value)}
      />

      {error ? (
        <MessageStrip design="Negative" onClose={onErrorClose}>
          {error}
        </MessageStrip>
      ) : null}

      <div className="riskTreeFrame">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <CentralRiskTree
          categories={categories}
          templates={templates}
          selectedKey={selectedKey}
          expansionAnchorKey={expansionAnchorKey}
          searchText={searchText}
          busy={busy}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
