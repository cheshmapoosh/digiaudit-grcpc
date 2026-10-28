import { useTranslation } from "react-i18next";
import { FlexBox, Form, FormItem, Label, ObjectStatus, MessageStrip, Text } from "@ui5/webcomponents-react";
import type { UserDetail } from "@/features/usermanagement";
import { formatPersianDateTime } from "@/shared/utils/date.utils";

export default function UserObjectPage({ value, error }: { value: UserDetail; error?: string | null }) {
  const { t } = useTranslation();
  const fields = [
    ["username", value.username], ["fullName", `${value.firstName} ${value.lastName}`.trim() || "-"],
    ["email", value.email || "-"], ["mobile", value.mobile || "-"],
    ["createdAt", formatPersianDateTime(value.createdAt)], ["lastLoginAt", formatPersianDateTime(value.lastLoginAt)],
  ];
  return <FlexBox direction="Column" className="managementListContent">
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    <ObjectStatus state={value.enabled ? "Positive" : "None"}>{t(value.enabled ? "usermanagement.users.status.enabled" : "usermanagement.users.status.disabled")}</ObjectStatus>
    <Form accessibleMode="Display" accessibleName={t("usermanagement.users.detailTitle")} layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
      {fields.map(([key, text]) => <FormItem key={key} labelContent={<Label>{t(`usermanagement.users.fields.${key}`)}</Label>}><Text>{text}</Text></FormItem>)}
    </Form>
  </FlexBox>;
}
