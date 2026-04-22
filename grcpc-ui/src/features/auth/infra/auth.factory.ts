import { AuthApiRepo } from "./auth.api.repo";
import type { AuthRepo } from "./auth.repo";

export function createAuthRepo(): AuthRepo {
    return new AuthApiRepo();
}
