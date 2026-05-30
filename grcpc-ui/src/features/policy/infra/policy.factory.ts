import { PolicyApiRepo } from "./policy.api.repo";
import type { PolicyRepo } from "./policy.repo";

export function createPolicyRepo(): PolicyRepo {
    return new PolicyApiRepo();
}
