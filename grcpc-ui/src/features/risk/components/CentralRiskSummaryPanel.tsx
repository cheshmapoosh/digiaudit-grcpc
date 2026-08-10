import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type {
  CentralRiskCategoryDetail,
  CentralRiskNodeKind,
  CentralRiskTemplateDetail,
} from "../domain/centralRisk.model";

type Detail = CentralRiskCategoryDetail | CentralRiskTemplateDetail;

interface Props {
  kind: CentralRiskNodeKind;
  value: Detail;
  parentLabel: string;
  busy: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

export default function CentralRiskSummaryPanel({
  kind,
  value,
  parentLabel,
  busy,
  canEdit,
  onEdit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const template = kind === "template" ? (value as CentralRiskTemplateDetail) : null;
  const rows: Array<[string, ReactNode]> = [
    [t("risk.fields.code"), value.code],
    [t("risk.fields.name"), value.title],
    [t("risk.fields.nodeType"), t(`risk.nodeType.${kind}`)],
    [
      t(kind === "category" ? "risk.fields.parentCategory" : "risk.fields.riskCategory"),
      parentLabel || "-",
    ],
    ...(template
      ? ([[t("risk.fields.riskType"), t(`risk.riskType.${template.riskType}`)]] as Array<[string, ReactNode]>)
      : []),
    [
      t("risk.fields.status"),
      <ObjectStatus key="status" state={value.status === "ACTIVE" ? "Positive" : "Negative"}>
        {t(`risk.status.${value.status}`)}
      </ObjectStatus>,
    ],
    [t("risk.fields.validFrom"), formatPersianDate(value.validFrom)],
    [t("risk.fields.validTo"), formatPersianDate(value.validTo)],
    [t("risk.fields.createdAt"), formatPersianDateTime(value.createdAt)],
    [t("risk.fields.updatedAt"), formatPersianDateTime(value.updatedAt)],
  ];

  return (
    <div className="riskSummaryPanel">
      <Bar startContent={<Title level="H4">{value.title}</Title>} />
      <div className="riskSummaryGrid">
        {rows.map(([label, displayValue]) => (
          <div className="riskSummaryRow" key={label}>
            <Label showColon>{label}</Label>
            {typeof displayValue === "string" ? <Text>{displayValue || "-"}</Text> : displayValue}
          </div>
        ))}
        <div className="riskSummaryRow">
          <Label showColon>{t("risk.fields.description")}</Label>
          <Text>{value.description || "-"}</Text>
        </div>
      </div>
      <div className="riskSummaryActions">
        <Button design="Emphasized" disabled={busy || !canEdit} onClick={onEdit}>
          {t("common.edit", { defaultValue: "ویرایش" })}
        </Button>
        <Button design="Transparent" disabled={busy} onClick={onCancel}>
          {t("common.close", { defaultValue: "بستن" })}
        </Button>
      </div>
    </div>
  );
}
