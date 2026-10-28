import { currentProfile, useProfileState } from "@/features/dataset-profile/state/profile.state";
import { useAuthState } from "@/features/auth/state/auth.state";

export const MASTER_DATA_AREAS = ["PROCESS", "RISK", "CONTROL", "GOVERNANCE", "REFERENCE", "ORGANIZATION"] as const;
export type MasterDataArea = typeof MASTER_DATA_AREAS[number];
type Identity = { rootUser: boolean; authorities: string[] } | null;

export function canAccessMasterData(me: Identity, area: MasterDataArea, manage = false): boolean {
  const profile = currentProfile();
  if (!profile || (manage && profile.status !== "ACTIVE")) return false;
  if (area === "ORGANIZATION" && (me?.authorities.includes("MD_REFERENCE_MANAGE") || (!manage && me?.authorities.includes("MD_REFERENCE_VIEW")))) return true;
  return Boolean(me?.rootUser || me?.authorities.includes(`MD_${area}_MANAGE`)
    || (!manage && me?.authorities.includes(`MD_${area}_VIEW`)));
}

export function areaForPath(path: string): MasterDataArea | undefined {
  const areas: Record<string, MasterDataArea> = {
    organizations: "ORGANIZATION", objectives: "REFERENCE", "account-groups": "REFERENCE",
    processes: "PROCESS", risks: "RISK", controls: "CONTROL", "control-objectives": "CONTROL",
    "global-controls": "CONTROL",
    regulations: "GOVERNANCE", policies: "GOVERNANCE",
  };
  return areas[path.split("/")[1]];
}

export function useMasterDataAccess(area: MasterDataArea) {
  useProfileState((state) => state.profiles);
  const me = useAuthState((state) => state.me);
  return { view: canAccessMasterData(me, area), manage: canAccessMasterData(me, area, true) };
}
