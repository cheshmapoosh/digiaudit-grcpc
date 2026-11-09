import { formatPersianDate } from "../utils/date.utils";

export function CatalogRelationDate({ value }: { value: string | null }) {
  return formatPersianDate(value);
}
