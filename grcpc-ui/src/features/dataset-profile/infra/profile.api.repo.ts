import { httpClient } from "@/shared/infra/http.client";
import type { DatasetProfile, ProfileSave } from "../domain/profile.model";

const BASE = "/api/dataset-profiles";
export const profileApi = {
  list: () => httpClient.get<DatasetProfile[]>(BASE),
  management: () => httpClient.get<DatasetProfile[]>(`${BASE}/management`),
  save: (id: string | null, value: ProfileSave) => id
    ? httpClient.put<DatasetProfile>(`${BASE}/${id}`, value)
    : httpClient.post<DatasetProfile>(BASE, value),
  lifecycle: (profile: DatasetProfile, command: "activate" | "inactivate" | "delete" | "restore") =>
    httpClient.post<DatasetProfile>(`${BASE}/${profile.id}/${command}`, { version: profile.version }),
};
