import { useAuthState } from "@/features/auth/state/auth.state";

export function useAppVersion(): string {
    const multiProfileEnabled = useAuthState((state) => state.me?.multiProfileEnabled);
    if (multiProfileEnabled === undefined) return __APP_VERSION__;
    const edition = multiProfileEnabled ? "m" : "s";
    return `${__APP_VERSION__}-${edition}`;
}
