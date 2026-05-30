import { AccountGroupApiRepo } from "./accountGroup.api.repo";
import type { AccountGroupRepo } from "./accountGroup.repo";

export function createAccountGroupRepo(): AccountGroupRepo {
    return new AccountGroupApiRepo();
}
