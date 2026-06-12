import { httpClient } from "@/shared/infra/http.client";
import type { ControlSummary } from "../domain/control.model";
import type { ControlRepo } from "./control.repo";

const BASE_URL = "/api/controls";

export class ControlApiRepo implements ControlRepo {
    async list(): Promise<ControlSummary[]> {
        return httpClient.get<ControlSummary[]>(BASE_URL);
    }
}
