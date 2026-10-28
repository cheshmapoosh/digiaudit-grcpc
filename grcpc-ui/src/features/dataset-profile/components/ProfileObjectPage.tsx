import { useTranslation } from "react-i18next";
import { FlexBox, Form, FormItem, Label, Text, Title } from "@ui5/webcomponents-react";
import type { DatasetProfile } from "../domain/profile.model";
import ProfileAvatar from "./ProfileAvatar";
import ProfileStatus from "./ProfileStatus";

type Props = { profile: DatasetProfile };

export default function ProfileObjectPage({ profile }: Props) {
  const { t } = useTranslation();
  const fields = [
    ["name", profile.name], ["description", profile.description || "-"],
    ["color", t(`profile.colors.${profile.colorName}`)], ["avatar", t(`profile.icons.${profile.iconName}`)],
  ];
  return <FlexBox direction="Column" className="profileManagementContent">
    <FlexBox alignItems="Center" className="profileManagementIdentity">
      <ProfileAvatar profile={profile} size="M" />
      <FlexBox direction="Column"><Title level="H3">{profile.name}</Title><ProfileStatus status={profile.status} /></FlexBox>
    </FlexBox>
    <Form accessibleMode="Display" accessibleName={t("profile.detailTitle")} layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
      {fields.map(([key, value]) => <FormItem key={key} labelContent={<Label>{t(`profile.${key}`)}</Label>}>
        <Text>{value}</Text>
      </FormItem>)}
    </Form>
  </FlexBox>;
}
