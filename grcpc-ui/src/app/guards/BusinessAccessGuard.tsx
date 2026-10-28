import { currentProfile, useProfileState } from "@/features/dataset-profile/state/profile.state";
import { Outlet, useLocation } from "react-router-dom";
import { MessageStrip } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { useAuthState } from "@/features/auth/state/auth.state";
import { areaForPath, canAccessMasterData, MASTER_DATA_AREAS } from "@/features/master-data/security/masterDataAccess";

export default function BusinessAccessGuard() {
  useProfileState((state) => state.profiles);
  const me = useAuthState((state) => state.me);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const area = areaForPath(pathname);
  let allowed = true;
  if ((area || pathname === "/master-data") && !currentProfile()) return <MessageStrip design="Information" hideCloseButton>{t("profile.required")}</MessageStrip>;
  if (area) allowed = canAccessMasterData(me, area, /\/(new|edit)\/?$/.test(pathname));
  if (pathname === "/master-data") allowed = MASTER_DATA_AREAS.some((item) => canAccessMasterData(me, item));
  if (pathname.startsWith("/access-control/users")) allowed = Boolean(me?.rootUser || me?.authorities.includes("ROLE_PROFILE_ADMIN"));
  if (pathname.startsWith("/settings/") || pathname === "/profiles" || pathname.startsWith("/profiles/")
    || pathname === "/access-control/roles" || pathname.startsWith("/access-control/roles/")) allowed = Boolean(me?.rootUser);
  return allowed ? <Outlet /> : <MessageStrip design="Negative" hideCloseButton>{t("security.accessDenied")}</MessageStrip>;
}
