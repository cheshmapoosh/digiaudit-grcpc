export type BasicDataKind = "organization-types" | "document-types";
export interface BasicDataType {
  id: string;
  profileId: string;
  profileName: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
}
export interface BasicDataSave { name: string; description: string | null; version?: number }
