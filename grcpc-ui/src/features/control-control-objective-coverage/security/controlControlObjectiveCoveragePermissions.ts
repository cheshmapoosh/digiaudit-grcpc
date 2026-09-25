import { useMemo } from "react"; import { useAuthState } from "@/features/auth/state/auth.state"; import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
export function useControlControlObjectiveCoveragePermissions(){const me=useAuthState(s=>s.me);return useMemo(()=>{const refs=canAccessMasterData(me,"CONTROL")&&canAccessMasterData(me,"CONTROL");return{view:canAccessMasterData(me,"PROCESS")&&refs,manage:canAccessMasterData(me,"PROCESS",true)&&refs};},[me]);}


