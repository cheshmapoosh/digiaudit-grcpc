import { httpClient } from "@/shared/infra/http.client";
import type { RequirementImportPreview, RequirementImportResult } from "../domain/requirementImport.model";

function base(regulationId: string) {
  return `/api/master-data/central/regulations/${encodeURIComponent(regulationId)}/requirements/import`;
}

function upload(file: File, fingerprint?: string) {
  const data = new FormData();
  data.append("file", file);
  if (fingerprint) data.append("fingerprint", fingerprint);
  return data;
}

export const requirementImportApi = {
  template: (regulationId: string) =>
    httpClient.get<Blob>(`${base(regulationId)}/template`, {
      responseType: "blob",
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    }),
  preview: (regulationId: string, file: File) =>
    httpClient.post<RequirementImportPreview>(`${base(regulationId)}/preview`, upload(file), { successMessage: false }),
  draftPreview: (regulationId: string, file: File, reservedCodes: string[]) => {
    const data = upload(file);
    reservedCodes.forEach(code => data.append("reservedCodes", code));
    return httpClient.post<RequirementImportPreview>(`${base(regulationId)}/preview?draft=true`, data, { successMessage: false });
  },
  commit: (regulationId: string, file: File, fingerprint: string) =>
    httpClient.post<RequirementImportResult>(base(regulationId), upload(file, fingerprint), { successMessage: false }),
};
