import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, BusyIndicator, Input, MessageStrip, Title } from "@ui5/webcomponents-react";

import type {
  CentralPolicyGroupSummary,
  CentralPolicyNodeType,
  CentralPolicySummary,
} from "../domain/centralPolicy.model";
import type { CentralPolicyTreeNode } from "../utils/centralPolicy.tree";
import CentralPolicyTree from "./CentralPolicyTree";
import PolicyCreateMenu from "./PolicyCreateMenu";

interface Props {
  groups: CentralPolicyGroupSummary[];
  policies: CentralPolicySummary[];
  selectedId: string | null;
  expansionAnchorId?: string | null;
  searchText: string;
  busy: boolean;
  error: string | null;
  canCreate: boolean;
  canDelete: boolean;
  allowedCreateTypes: CentralPolicyNodeType[];
  onErrorClose: () => void;
  onSearchTextChange: (value: string) => void;
  onCreate: (type: CentralPolicyNodeType) => void;
  onShow: () => void;
  onDelete: () => void;
  onSelect: (node: CentralPolicyTreeNode) => void;
}

export default function CentralPolicyListReport({
  groups,
  policies,
  selectedId,
  expansionAnchorId,
  searchText,
  busy,
  error,
  canCreate,
  canDelete,
  allowedCreateTypes,
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
    () => ({ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", whiteSpace: "nowrap" }),
    [],
  );

  return (
    <div className="policyListReport">
      <Bar
        startContent={<Title level="H4">{t("policy.list.title", { defaultValue: "ساختار سیاست" })}</Title>}
        endContent={
          <div style={actionGroupStyle}>
            <PolicyCreateMenu
              disabled={busy || !canCreate}
              style={actionButtonStyle}
              nodeTypes={allowedCreateTypes}
              onCreate={onCreate}
            />
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
          </div>
        }
      />
      <Input
        value={searchText}
        disabled={busy}
        placeholder={t("policy.list.search", { defaultValue: "جستجو در ساختار سیاست..." })}
        onInput={(event) => onSearchTextChange(event.target.value)}
      />
      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
      <div className="policyTreeFrame">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <CentralPolicyTree
          groups={groups}
          policies={policies}
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
