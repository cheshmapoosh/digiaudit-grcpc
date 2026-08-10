import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { CentralControlObjectiveDetail } from "../domain/centralControlObjective.model";

interface Props {
  value: CentralControlObjectiveDetail;
  busy: boolean;
  canEdit: boolean;
  onEdit: (id?: string) => void;
  onCancel: () => void;
}

export default function CentralControlObjectiveSummaryPanel({
  value,
  busy,
  canEdit,
  onEdit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const rows = useMemo<Array<[string, ReactNode]>>(
    () => [
      [t("controlObjective.fields.name"), value.title],
      [t("controlObjective.fields.code"), value.code],
      [t("controlObjective.fields.objectiveClass"), value.objectiveClass ?? "-"],
      [t("controlObjective.fields.description"), value.description ?? "-"],
      [
        t("controlObjective.fields.status"),
        <ObjectStatus key="status" state={value.status === "ACTIVE" ? "Positive" : "Negative"}>
          {t(`controlObjective.status.${value.status}`)}
        </ObjectStatus>,
      ],
      [t("controlObjective.fields.validFrom"), formatPersianDate(value.validFrom)],
      [t("controlObjective.fields.validTo"), formatPersianDate(value.validTo)],
      [t("controlObjective.fields.createdAt"), formatPersianDateTime(value.createdAt)],
      [t("controlObjective.fields.updatedAt"), formatPersianDateTime(value.updatedAt)],
    ],
    [t, value],
  );

  return (
    <div className="controlObjectiveSummaryPanel">
      <Bar startContent={<Title level="H4">{value.title}</Title>} />
      <div className="controlObjectiveSummaryGrid">
        {rows.map(([label, displayValue]) => (
          <div className="controlObjectiveSummaryRow" key={label}>
            <Label showColon>{label}</Label>
            {typeof displayValue === "string" ? <Text>{displayValue}</Text> : displayValue}
          </div>
        ))}
      </div>
      <div className="controlObjectiveObjectFooter">
        <Button design="Emphasized" disabled={busy || !canEdit} onClick={() => onEdit(value.id)}>
          {t("common.edit", { defaultValue: "ویرایش" })}
        </Button>
        <Button design="Transparent" disabled={busy} onClick={onCancel}>
          {t("common.cancel", { defaultValue: "انصراف" })}
        </Button>
      </div>
    </div>
  );
}
