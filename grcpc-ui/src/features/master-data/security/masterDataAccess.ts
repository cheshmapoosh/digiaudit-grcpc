import { useAuthState } from "@/features/auth/state/auth.state";

export const MASTER_DATA_AREAS = ["PROCESS", "RISK", "CONTROL", "GOVERNANCE", "REFERENCE"] as const;
export type MasterDataArea = typeof MASTER_DATA_AREAS[number];
type Identity = { rootUser: boolean; authorities: string[] } | null;

export function canAccessMasterData(me: Identity, area: MasterDataArea, manage = false): boolean {
  return Boolean(me?.rootUser || me?.authorities.includes(`MD_${area}_MANAGE`)
    || (!manage && me?.authorities.includes(`MD_${area}_VIEW`)));
}

export function areaForPath(path: string): MasterDataArea | undefined {
  const areas: Record<string, MasterDataArea> = {
    organizations: "REFERENCE", "account-groups": "REFERENCE",
    processes: "PROCESS", risks: "RISK", controls: "CONTROL", "control-objectives": "CONTROL",
    regulations: "GOVERNANCE", policies: "GOVERNANCE",
  };
  return areas[path.split("/")[1]];
}

export function useMasterDataAccess(area: MasterDataArea) {
  const me = useAuthState((state) => state.me);
  return { view: canAccessMasterData(me, area), manage: canAccessMasterData(me, area, true) };
}
