import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";

import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { CentralAccountGroupDetail } from "../domain/centralAccountGroup.model";

interface Props {
  value: CentralAccountGroupDetail;
  parentLabel: string;
  busy: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="accountGroupSummaryRow">
      <strong>{label}</strong>
      <div>{value}</div>
    </div>
  );
}

export default function CentralAccountGroupSummaryPanel({
  value,
  parentLabel,
  busy,
  canEdit,
  onEdit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="accountGroupSummaryPanel">
      <Title level="H4">{value.title}</Title>
      <div className="accountGroupSummaryGrid">
        <Row label={t("accountGroup.fields.code")} value={<Text>{value.code}</Text>} />
        <Row label={t("accountGroup.fields.name")} value={<Text>{value.title}</Text>} />
        <Row label={t("accountGroup.fields.parent")} value={<Text>{parentLabel || t("accountGroup.parent.none")}</Text>} />
        <Row label={t("accountGroup.fields.importance")} value={<Text>{t(`accountGroup.importance.${value.importance}`)}</Text>} />
        <Row label={t("accountGroup.fields.reasonableAssurance")} value={<Text>{value.reasonableAssurance ? t("common.yes", { defaultValue: "بله" }) : t("common.no", { defaultValue: "خیر" })}</Text>} />
        <Row
          label={t("accountGroup.fields.status")}
          value={<ObjectStatus state={value.status === "ACTIVE" ? "Positive" : "Negative"}>{t(`accountGroup.status.${value.status}`)}</ObjectStatus>}
        />
        <Row
          label={t("accountGroup.fields.validFrom")}
          value={<Text>{formatPersianDate(value.validFrom)}</Text>}
        />
        <Row
          label={t("accountGroup.fields.validTo")}
          value={<Text>{formatPersianDate(value.validTo)}</Text>}
        />
        <Row
          label={t("accountGroup.fields.createdAt")}
          value={<Text>{formatPersianDateTime(value.createdAt)}</Text>}
        />
        <Row
          label={t("accountGroup.fields.updatedAt")}
          value={<Text>{formatPersianDateTime(value.updatedAt)}</Text>}
        />
      </div>
      <div className="accountGroupSummaryActions">
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
