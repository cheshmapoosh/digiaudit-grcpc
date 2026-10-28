import { Avatar, type AvatarPropTypes } from "@ui5/webcomponents-react";
import type { DatasetProfile } from "../domain/profile.model";
import { profileAvatarForeground } from "../utils/profileAvatar";
import { profileColor, profileIcon } from "../domain/profileIdentity";

type Props = {
  id?: string;
  profile: Pick<DatasetProfile, "name" | "colorName" | "iconName">;
  size?: AvatarPropTypes["size"];
  interactive?: boolean;
  disabled?: boolean;
  onClick?: AvatarPropTypes["onClick"];
  accessibleName?: string;
  tooltip?: string;
};

export default function ProfileAvatar({ id, profile, size = "XS", interactive = false, disabled = false, onClick, accessibleName, tooltip }: Props) {
  const color = profileColor(profile.colorName).value;
  return <Avatar
    id={id}
    size={size}
    shape="Circle"
    icon={profileIcon(profile.iconName)}
    fallbackIcon="building"
    accessibleName={accessibleName ?? profile.name}
    title={tooltip ?? profile.name}
    accessibilityAttributes={interactive ? { hasPopup: "dialog" } : undefined}
    interactive={interactive}
    disabled={disabled}
    onClick={onClick}
    style={{ backgroundColor: color, color: profileAvatarForeground(color) }}
  />;
}
