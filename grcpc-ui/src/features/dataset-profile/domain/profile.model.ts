export interface DatasetProfile {
  id: string;
  name: string;
  description: string | null;
  colorName: string;
  iconName: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface ProfileSave { name: string; description: string | null; colorName: string; iconName: string; version?: number }
