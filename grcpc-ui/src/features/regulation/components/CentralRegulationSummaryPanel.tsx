import { DialogFooterBar } from "@/shared/components/DialogFooter";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Label, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import { formatPersianDate } from "@/shared/utils/date.utils";
import type { CentralRegulationAnyDetail } from "../domain/centralRegulation.model";
import type { CentralRegulationTreeNode } from "../utils/centralRegulation.tree";

interface Props {
  node: CentralRegulationTreeNode;
  value: CentralRegulationAnyDetail;
  parentLabel: string;
  busy: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="regulationSummaryRow">
      <Label showColon>{label}</Label>
      <div>{value}</div>
    </div>
  );
}

export default function CentralRegulationSummaryPanel({
  node,
  value,
  parentLabel,
  busy,
  canEdit,
  onEdit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const typeKey =
    node.type === "GROUP"
      ? "group"
      : node.type === "REGULATION"
        ? "regulation"
        : "requirement";
  const statusState = value.status === "ACTIVE" ? "Positive" : "Negative";

  return (
    <div className="regulationSummaryPanel">
      <Title level="H4">{t("common.details")}</Title>
      <div className="regulationSummaryGrid">
        <Row label={t("regulation.fields.code")} value={<Text>{value.code}</Text>} />
        <Row label={t("regulation.fields.name")} value={<Text>{value.title}</Text>} />
        <Row
          label={t("regulation.fields.type")}
          value={<Text>{t(`regulation.nodeType.${typeKey}`)}</Text>}
        />
        <Row
          label={t("regulation.fields.parent")}
          value={<Text>{parentLabel || t("regulation.parent.none")}</Text>}
        />
        <Row
          label={t("regulation.fields.status")}
          value={
            <ObjectStatus state={statusState}>
              {t(`regulation.status.${value.status}`)}
            </ObjectStatus>
          }
        />
        <Row
          label={t("regulation.fields.validFrom")}
          value={<Text>{formatPersianDate(value.validFrom)}</Text>}
        />
        <Row
          label={t("regulation.fields.validTo")}
          value={<Text>{formatPersianDate(value.validTo)}</Text>}
        />
      </div>
      <DialogFooterBar>
        <Button design="Emphasized" disabled={busy || !canEdit} onClick={onEdit}>
          {t("common.edit", { defaultValue: "ویرایش" })}
        </Button>
        <Button design="Transparent" disabled={busy} onClick={onCancel}>
          {t("common.close", { defaultValue: "بستن" })}
        </Button>
      </DialogFooterBar>
    </div>
  );
}
