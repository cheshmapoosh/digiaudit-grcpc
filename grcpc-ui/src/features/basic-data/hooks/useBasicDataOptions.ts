import { useEffect, useState } from "react";
import type { BasicDataKind, BasicDataType } from "../domain/basicData.model";
import { basicDataApi } from "../infra/basicData.api.repo";

export function useBasicDataOptions(kind: BasicDataKind, enabled = true) {
  const [state, setState] = useState<{ items: BasicDataType[]; loading: boolean; error: string | null }>({ items: [], loading: true, error: null });
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void basicDataApi.options(kind).then((items) => {
      if (current) setState({ items, loading: false, error: null });
    }).catch((error: unknown) => {
      if (current) setState({ items: [], loading: false, error: error instanceof Error ? error.message : "" });
    });
    return () => { current = false; };
  }, [enabled, kind]);
  return { ...state, loading: enabled && state.loading };
}
