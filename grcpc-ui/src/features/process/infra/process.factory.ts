import { ProcessApiRepo } from "./process.api.repo";
import type { ProcessRepo } from "./process.repo";

export function createProcessRepo(): ProcessRepo {
    return new ProcessApiRepo();
}
