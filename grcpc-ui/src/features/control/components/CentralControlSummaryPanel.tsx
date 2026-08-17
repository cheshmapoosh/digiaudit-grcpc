import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, MessageStrip, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { CentralControlDetail, CentralControlGroupDetail, CentralControlNodeType } from "../domain/centralControl.model";

type Value = CentralControlDetail | CentralControlGroupDetail;

interface Props {
  type: CentralControlNodeType;
  value: Value | null;
  busy?: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

export default function CentralControlSummaryPanel({ type, value, busy = false, canEdit, onEdit, onCancel }: Props) {
  const { t } = useTranslation();
  const rows = useMemo<Array<[string, ReactNode]>>(() => {
    if (!value) return [];
    const common: Array<[string, ReactNode]> = [
      [t("control.fields.name"), value.title],
      [t("control.fields.code"), value.code],
    ];
    if (type === "CONTROL") {
      const control = value as CentralControlDetail;
      common.push(
        [t("control.fields.controlClass"), control.controlClass ? t(`control.controlClass.${control.controlClass}`) : "-"],
        [t("control.fields.importance"), control.importance ? t(`control.importance.${control.importance}`) : "-"],
        [t("control.fields.controlRisk"), control.controlRisk ? t(`control.controlRisk.${control.controlRisk}`) : "-"],
      );
    }
    common.push(
      [t("control.fields.description"), value.description || "-"],
      [t("control.fields.status"), <ObjectStatus key="status" state={value.status === "ACTIVE" ? "Positive" : "Negative"}>{t(`control.status.${value.status}`)}</ObjectStatus>],
      [t("control.fields.validFrom"), formatPersianDate(value.validFrom)],
      [t("control.fields.validTo"), formatPersianDate(value.validTo)],
      [t("control.fields.createdAt"), formatPersianDateTime(value.createdAt)],
      [t("control.fields.updatedAt"), formatPersianDateTime(value.updatedAt)],
    );
    return common;
  }, [t, type, value]);

  return (
    <div className="controlSummaryPanel">
      <Bar startContent={<Title level="H4">{value?.title ?? t("control.summary.title")}</Title>} />
      {value ? <div className="controlSummaryGrid">{rows.map(([label, displayValue]) => <div className="controlSummaryRow" key={label}><Label showColon>{label}</Label>{typeof displayValue === "string" ? <Text>{displayValue}</Text> : displayValue}</div>)}</div> : <MessageStrip design="Information" hideCloseButton>{t("control.summary.selectPrompt")}</MessageStrip>}
      <Bar endContent={<><Button design="Emphasized" disabled={!value || busy || !canEdit} onClick={onEdit}>{t("common.edit", { defaultValue: "ویرایش" })}</Button><Button design="Transparent" disabled={busy} onClick={onCancel}>{t("common.close", { defaultValue: "بستن" })}</Button></>} />
    </div>
  );
}
