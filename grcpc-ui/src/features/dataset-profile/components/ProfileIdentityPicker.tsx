import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ColorPalette, ColorPaletteItem, FlexBox, FormItem, Label, List, ListItemCustom, Popover, Text } from "@ui5/webcomponents-react";
import { PROFILE_COLORS, PROFILE_ICONS } from "../domain/profileIdentity";
import ProfileAvatar from "./ProfileAvatar";

export default function ProfileIdentityPicker({ value, disabled, onColor, onIcon }: {
  value: { name: string; colorName: string; iconName: string }; disabled: boolean;
  onColor: (name: string) => void; onIcon: (name: string) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  return <>
    <FormItem labelContent={<FlexBox alignItems="Center" justifyContent="SpaceBetween" className="profileFieldLabel">
      <Label required>{t("profile.color")}</Label>
      <Text>{t(`profile.colors.${value.colorName}`)}</Text>
    </FlexBox>}>
      <FlexBox direction="Column" className="profileManagementAvatar" inert={disabled}>
        <ColorPalette onItemClick={(event) => { const color = PROFILE_COLORS.find((item) => item.value.toLowerCase() === event.detail.color.toLowerCase()); if (color) onColor(color.name); }}>
          {PROFILE_COLORS.map((color) => <ColorPaletteItem key={color.name} value={color.value} selected={value.colorName === color.name} title={t(`profile.colors.${color.name}`)} />)}
        </ColorPalette>
      </FlexBox>
    </FormItem>
    <FormItem labelContent={<Label for={id} required>{t("profile.avatar")}</Label>}>
      <FlexBox alignItems="Center" wrap="Wrap" className="profileManagementActions profileAvatarField">
        <ProfileAvatar id={id} profile={value} size="M" interactive disabled={disabled}
          accessibleName={t("profile.chooseIcon")} tooltip={t("profile.chooseIcon")} onClick={() => setOpen((current) => !current)} />
        <Text>{t(`profile.icons.${value.iconName}`)}</Text>
      </FlexBox>
    </FormItem>
    {typeof document !== "undefined" && createPortal(
      <Popover open={open && !disabled} opener={id} headerText={t("profile.chooseIcon")} placement="Bottom" onClose={() => setOpen(false)}>
        <List className="profileIconChoices" accessibleName={t("profile.chooseIcon")} selectionMode="Single" onSelectionChange={(event) => {
          if (disabled) return;
          const icon = event.detail.selectedItems[0]?.dataset.icon;
          if (icon && PROFILE_ICONS.some((item) => item === icon)) { onIcon(icon); setOpen(false); }
        }}>
          {PROFILE_ICONS.map((icon) => <ListItemCustom key={icon} data-icon={icon} selected={value.iconName === icon} type="Active">
            <FlexBox alignItems="Center" className="profileChoice profileManagementIdentity"><ProfileAvatar profile={{ ...value, name: t(`profile.icons.${icon}`), iconName: icon }} /><Text>{t(`profile.icons.${icon}`)}</Text></FlexBox>
          </ListItemCustom>)}
        </List>
      </Popover>, document.body,
    )}
  </>;
}
