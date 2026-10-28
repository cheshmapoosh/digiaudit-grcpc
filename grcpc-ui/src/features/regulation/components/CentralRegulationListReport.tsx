import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useTranslation } from "react-i18next";
import { Bar, Button, BusyIndicator, MessageStrip, Title } from "@ui5/webcomponents-react";

import type {
  CentralRegulationGroupSummary,
  CentralRegulationNodeType,
  CentralRegulationRequirementSummary,
  CentralRegulationSummary,
} from "../domain/centralRegulation.model";
import type { CentralRegulationTreeNode } from "../utils/centralRegulation.tree";
import CentralRegulationTree from "./CentralRegulationTree";
import RegulationCreateMenu from "./RegulationCreateMenu";

interface Props {
  groups: CentralRegulationGroupSummary[];
  regulations: CentralRegulationSummary[];
  requirements: CentralRegulationRequirementSummary[];
  selectedId: string | null;
  expansionAnchorId?: string | null;
  searchText: string;
  busy: boolean;
  error: string | null;
  canCreate: boolean;
  canDelete: boolean;
  allowedCreateTypes: CentralRegulationNodeType[];
  onErrorClose: () => void;
  onSearchTextChange: (value: string) => void;
  onCreate: (type: CentralRegulationNodeType) => void;
  onShow: () => void;
  onDelete: () => void;
  onSelect: (node: CentralRegulationTreeNode) => void;
}

export default function CentralRegulationListReport({
  groups,
  regulations,
  requirements,
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

  return (
    <div className="regulationListReport">
      <Bar
        startContent={<Title level="H4">{t("regulation.list.title")}</Title>}
        endContent={
          <>
            <HeaderSearch value={searchText} onChange={(value) => onSearchTextChange(value)} disabled={busy} accessibleName={t("regulation.list.search")} />
            <RegulationCreateMenu
              disabled={busy || !canCreate}
              nodeTypes={allowedCreateTypes}
              onCreate={onCreate}
            />

            <Button
              design="Emphasized"
              disabled={busy || !selectedId}
              onClick={onShow}
            >
              {t("common.view", { defaultValue: "نمایش" })}
            </Button>
            <Button
              design="Negative"
              disabled={busy || !selectedId || !canDelete}
              onClick={onDelete}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </Button>
          </>
        }
      />


      {error ? (
        <MessageStrip design="Negative" onClose={onErrorClose}>
          {error}
        </MessageStrip>
      ) : null}

      <div className="regulationTreeFrame">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <CentralRegulationTree
          groups={groups}
          regulations={regulations}
          requirements={requirements}
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
