// src/features/process/service/process.api.repo.ts
import type { ProcessNode } from "../model/process.types";
import type { ProcessRepo } from "./process.repo";

export const processApiRepo: ProcessRepo = {
    async listAll(): Promise<ProcessNode[]> {
        // TODO: GET /process-nodes (flat)
        throw new Error("processApiRepo.listAll is not implemented");
    },

    async saveAll(_: ProcessNode[]): Promise<void> {
        // TODO: PUT /process-nodes/bulk  (یا چند call)
        throw new Error("processApiRepo.saveAll is not implemented");
    },
};