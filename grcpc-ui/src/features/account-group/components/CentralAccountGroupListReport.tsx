import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, BusyIndicator, Input, MessageStrip, Title } from "@ui5/webcomponents-react";

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
  const actionButtonStyle = useMemo(() => ({ minWidth: "8rem" }), []);

  return (
    <div className="accountGroupListReport">
      <Bar
        startContent={<Title level="H4">{t("accountGroup.list.title")}</Title>}
        endContent={
          <>
            <Button design="Emphasized" disabled={busy || !canCreate} style={actionButtonStyle} onClick={onCreate}>
              {t("common.create", { defaultValue: "ایجاد" })}
            </Button>
            <Button design="Emphasized" disabled={busy || !selectedId} style={actionButtonStyle} onClick={onShow}>
              {t("common.view", { defaultValue: "نمایش" })}
            </Button>
            <Button
              design="Negative"
              disabled={busy || !selectedId || !canDelete}
              style={{ ...actionButtonStyle, marginInlineStart: "0.75rem" }}
              onClick={onDelete}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </Button>
          </>
        }
      />

      <Input
        value={searchText}
        disabled={busy}
        placeholder={t("accountGroup.list.search")}
        onInput={(event) => onSearchTextChange(event.target.value)}
      />

      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}

      <div className="accountGroupTreeFrame">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <CentralAccountGroupTree
          rows={rows}
          selectedId={selectedId}
          expansionAnchorId={expansionAnchorId}
          searchText={searchText}
          busy={busy}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
