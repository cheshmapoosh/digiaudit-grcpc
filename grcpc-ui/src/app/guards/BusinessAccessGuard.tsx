import { Outlet, useLocation } from "react-router-dom";
import { MessageStrip } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { useAuthState } from "@/features/auth/state/auth.state";
import { areaForPath, canAccessMasterData, MASTER_DATA_AREAS } from "@/features/master-data/security/masterDataAccess";

export default function BusinessAccessGuard() {
  const me = useAuthState((state) => state.me);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const area = areaForPath(pathname);
  let allowed = true;
  if (area) allowed = canAccessMasterData(me, area, /\/(new|edit)\/?$/.test(pathname));
  if (pathname === "/master-data") allowed = MASTER_DATA_AREAS.some((item) => canAccessMasterData(me, item));
  if (pathname.startsWith("/access-control/users")) allowed = Boolean(me?.rootUser || me?.authorities.includes("USER_VIEW"));
  if (pathname.startsWith("/access-control/roles")) allowed = Boolean(me?.rootUser || me?.authorities.includes("ROLE_VIEW"));
  return allowed ? <Outlet /> : <MessageStrip design="Negative" hideCloseButton>{t("security.accessDenied")}</MessageStrip>;
}
