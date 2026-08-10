import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { CentralPolicyAnyDetail, CentralPolicyType } from "../domain/centralPolicy.model";
import type { CentralPolicyTreeNode } from "../utils/centralPolicy.tree";

interface Props {
  node: CentralPolicyTreeNode;
  value: CentralPolicyAnyDetail;
  parentLabel: string;
  busy: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="policySummaryRow">
      <strong>{label}</strong>
      <div>{value}</div>
    </div>
  );
}

function policyTypeLabel(type: CentralPolicyType, t: ReturnType<typeof useTranslation>["t"]) {
  const labels: Record<CentralPolicyType, string> = {
    POLICY: t("policy.policyType.policy", { defaultValue: "سیاست" }),
    PROCEDURE: t("policy.policyType.procedure", { defaultValue: "دستورالعمل" }),
    ANNOUNCEMENT: t("policy.policyType.announcement", { defaultValue: "اطلاعیه" }),
    WORK_INSTRUCTION: t("policy.policyType.workInstruction", { defaultValue: "روش اجرایی" }),
  };
  return labels[type];
}

export default function CentralPolicySummaryPanel({
  node,
  value,
  parentLabel,
  busy,
  canEdit,
  onEdit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const statusState = value.status === "ACTIVE" ? "Positive" : "Negative";
  const policyType = node.type === "POLICY" ? (value as { policyType: CentralPolicyType }).policyType : null;

  return (
    <div className="policySummaryPanel">
      <Title level="H4">{value.title}</Title>
      <div className="policySummaryGrid">
        <Row label={t("policy.fields.identifier", { defaultValue: "شناسه" })} value={<Text>{value.code}</Text>} />
        <Row label={t("policy.fields.name", { defaultValue: "نام" })} value={<Text>{value.title}</Text>} />
        <Row
          label={t("policy.fields.type", { defaultValue: "نوع" })}
          value={<Text>{node.type === "GROUP" ? t("policy.nodeType.group", { defaultValue: "گروه سیاست" }) : t("policy.nodeType.policy", { defaultValue: "سیاست" })}</Text>}
        />
        {policyType ? (
          <Row label={t("policy.fields.policyType", { defaultValue: "نوع سیاست" })} value={<Text>{policyTypeLabel(policyType, t)}</Text>} />
        ) : null}
        <Row
          label={t("policy.fields.parent", { defaultValue: "والد" })}
          value={<Text>{parentLabel || t("policy.parent.none", { defaultValue: "بدون والد" })}</Text>}
        />
        <Row
          label={t("policy.fields.status", { defaultValue: "وضعیت" })}
          value={
            <ObjectStatus state={statusState}>
              {value.status === "ACTIVE"
                ? t("common.active", { defaultValue: "فعال" })
                : t("common.inactive", { defaultValue: "غیرفعال" })}
            </ObjectStatus>
          }
        />
        <Row label={t("policy.fields.validFrom", { defaultValue: "تاریخ اعتبار از" })} value={<Text>{formatPersianDate(value.validFrom)}</Text>} />
        <Row label={t("policy.fields.validTo", { defaultValue: "تاریخ اعتبار تا" })} value={<Text>{formatPersianDate(value.validTo)}</Text>} />
        <Row label={t("policy.fields.createdAt", { defaultValue: "تاریخ ایجاد" })} value={<Text>{formatPersianDateTime(value.createdAt)}</Text>} />
        <Row label={t("policy.fields.updatedAt", { defaultValue: "تاریخ بروزرسانی" })} value={<Text>{formatPersianDateTime(value.updatedAt)}</Text>} />
      </div>
      <div className="policySummaryActions">
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
