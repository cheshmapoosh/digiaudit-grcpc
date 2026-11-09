import { currentProfile, useProfileState } from "@/features/dataset-profile/state/profile.state";
import { matchPath, Navigate, Outlet, useLocation } from "react-router-dom";
import { MessageStrip } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { useAuthState } from "@/features/auth/state/auth.state";
import { areaForPath, canAccessMasterData, MASTER_DATA_AREAS } from "@/features/master-data/security/masterDataAccess";

export default function BusinessAccessGuard() {
  useProfileState((state) => state.profiles);
  const me = useAuthState((state) => state.me);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const profileManagement = matchPath("/profiles/*", pathname) || matchPath("/settings/profiles", pathname);
  if (profileManagement && me?.multiProfileEnabled === false) return <Navigate to="/dashboard" replace />;

  const area = areaForPath(pathname);
  let allowed = true;
  if ((area || pathname === "/master-data") && !currentProfile()) return <MessageStrip design="Information" hideCloseButton>{t("profile.required")}</MessageStrip>;
  if (area) allowed = canAccessMasterData(me, area, /\/(new|edit)\/?$/.test(pathname));
  if (pathname === "/master-data") allowed = MASTER_DATA_AREAS.some((item) => canAccessMasterData(me, item));
  if (pathname.startsWith("/access-control/users")) allowed = Boolean(me?.rootUser || me?.authorities.includes("ROLE_PROFILE_ADMIN"));
  if (pathname === "/basic-data" || pathname.startsWith("/basic-data/")) {
    allowed = Boolean(me?.rootUser || me?.authorities.includes("ROLE_PROFILE_ADMIN"));
    if (allowed && !currentProfile()) return <MessageStrip design="Information" hideCloseButton>{t("profile.required")}</MessageStrip>;
  }
  if (pathname.startsWith("/settings/") || profileManagement
    || pathname === "/access-control/roles" || pathname.startsWith("/access-control/roles/")) allowed = Boolean(me?.rootUser);
  return allowed ? <Outlet /> : <MessageStrip design="Negative" hideCloseButton>{t("security.accessDenied")}</MessageStrip>;
}
