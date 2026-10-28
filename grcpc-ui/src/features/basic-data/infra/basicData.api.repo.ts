import { httpClient } from "@/shared/infra/http.client";
import type { BasicDataKind, BasicDataSave, BasicDataType } from "../domain/basicData.model";

const base = (kind: BasicDataKind) => `/api/basic-data/${kind}`;
export const basicDataApi = {
  list: (kind: BasicDataKind) => httpClient.get<BasicDataType[]>(base(kind)),
  options: (kind: BasicDataKind) => httpClient.get<BasicDataType[]>(`${base(kind)}/options`),
  save: (kind: BasicDataKind, id: string | null, body: BasicDataSave) => id
    ? httpClient.put<BasicDataType>(`${base(kind)}/${id}`, body)
    : httpClient.post<BasicDataType>(base(kind), body),
  lifecycle: (kind: BasicDataKind, row: BasicDataType, command: "activate" | "inactivate" | "delete") =>
    httpClient.post<BasicDataType>(`${base(kind)}/${row.id}/${command}`, { version: row.version }),
};
