import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, BusyIndicator, Input, MessageStrip, Title } from "@ui5/webcomponents-react";

import type {
  CentralControlGroupSummary,
  CentralControlNodeType,
  CentralControlSummary,
} from "../domain/centralControl.model";
import type { CentralControlTreeNode } from "../utils/centralControl.tree";
import CentralControlTree from "./CentralControlTree";
import ControlCreateMenu from "./ControlCreateMenu";

interface Props {
  groups: CentralControlGroupSummary[];
  controls: CentralControlSummary[];
  selectedId: string | null;
  expansionAnchorId?: string | null;
  searchText: string;
  busy: boolean;
  error: string | null;
  canCreate: boolean;
  canDelete: boolean;
  allowedCreateTypes: CentralControlNodeType[];
  onErrorClose: () => void;
  onSearchTextChange: (value: string) => void;
  onCreate: (type: CentralControlNodeType) => void;
  onShow: () => void;
  onDelete: () => void;
  onSelect: (node: CentralControlTreeNode) => void;
}

export default function CentralControlListReport({
  groups,
  controls,
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
    <div className="controlListReport">
      <Bar
        startContent={<Title level="H4">{t("control.list.title")}</Title>}
        endContent={
          <div style={actionGroupStyle}>
            <ControlCreateMenu
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
        placeholder={t("control.list.search")}
        onInput={(event) => onSearchTextChange(event.target.value)}
      />
      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
      <div className="controlTreeFrame">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <CentralControlTree
          groups={groups}
          controls={controls}
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
