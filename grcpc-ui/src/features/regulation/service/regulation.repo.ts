import type { RegulationEntity, RegulationId, RegulationUpsertInput } from "../model/regulation.types";

export interface RegulationRepo {
    list(): Promise<RegulationEntity[]>;
    getById(id: RegulationId): Promise<RegulationEntity | null>;
    create(input: RegulationUpsertInput): Promise<RegulationEntity>;
    update(id: RegulationId, input: RegulationUpsertInput): Promise<RegulationEntity>;
    delete(id: RegulationId): Promise<void>;
}