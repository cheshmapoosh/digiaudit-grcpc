// src/features/process/service/process.repo.ts
import type { ProcessNode } from "../model/process.types";

export interface ProcessRepo {
    listAll(): Promise<ProcessNode[]>;
    saveAll(nodes: ProcessNode[]): Promise<void>;
}