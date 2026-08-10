import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, MessageStrip, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { CentralControlDetail } from "../domain/centralControl.model";

export interface CentralControlSummaryPanelProps {
  value: CentralControlDetail | null;
  busy?: boolean;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onCancel: () => void;
}

export default function CentralControlSummaryPanel({
  value,
  busy = false,
  canEdit,
  onEdit,
  onCancel,
}: CentralControlSummaryPanelProps) {
  const { t } = useTranslation();

  const rows = useMemo<Array<[string, ReactNode]>>(() => {
    if (!value) return [];
    return [
      [t("control.fields.name"), value.title],
      [t("control.fields.code"), value.code],
      [t("control.fields.controlClass"), value.controlClass ? t(`control.controlClass.${value.controlClass}`) : "-"],
      [t("control.fields.importance"), value.importance ? t(`control.importance.${value.importance}`) : "-"],
      [t("control.fields.automationType"), value.automationType ? t(`control.automationType.${value.automationType}`) : "-"],
      [t("control.fields.controlPurpose"), value.controlPurpose ? t(`control.controlPurpose.${value.controlPurpose}`) : "-"],
      [t("control.fields.description"), value.description || "-"],
      [
        t("control.fields.status"),
        <ObjectStatus key="status" state={value.status === "ACTIVE" ? "Positive" : "Negative"}>
          {t(`control.status.${value.status}`)}
        </ObjectStatus>,
      ],
      [t("control.fields.validFrom"), formatPersianDate(value.validFrom)],
      [t("control.fields.validTo"), formatPersianDate(value.validTo)],
      [t("control.fields.createdAt"), formatPersianDateTime(value.createdAt)],
      [t("control.fields.updatedAt"), formatPersianDateTime(value.updatedAt)],
    ];
  }, [t, value]);

  return (
    <div className="controlSummaryPanel">
      <Bar startContent={<Title level="H4">{value?.title ?? t("control.summary.title")}</Title>} />

      {value ? (
        <div className="controlSummaryGrid">
          {rows.map(([label, displayValue]) => (
            <div className="controlSummaryRow" key={label}>
              <Label showColon>{label}</Label>
              {typeof displayValue === "string" ? <Text>{displayValue}</Text> : displayValue}
            </div>
          ))}
        </div>
      ) : (
        <MessageStrip design="Information" hideCloseButton>
          {t("control.summary.selectPrompt")}
        </MessageStrip>
      )}

      <Bar
        endContent={
          <>
            <Button
              design="Emphasized"
              disabled={!value || busy || !canEdit}
              onClick={() => value && onEdit(value.id)}
            >
              {t("common.edit", { defaultValue: "ویرایش" })}
            </Button>
            <Button design="Transparent" disabled={busy} onClick={onCancel}>
              {t("common.close", { defaultValue: "بستن" })}
            </Button>
          </>
        }
      />
    </div>
  );
}
