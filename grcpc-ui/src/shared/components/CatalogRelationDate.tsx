import { useTranslation } from "react-i18next";
import { PersianDatePicker, type PersianDateDraftState } from "./PersianDatePicker";
import { formatPersianDate } from "../utils/date.utils";

/** A visible invalid date stays in the native editor and reports readiness to the owner. */
export function CatalogRelationDate({ value, editable, disabled, label, onChange, onDraftStateChange }: {
  value: string | null; editable: boolean; disabled?: boolean; label: string;
  onChange: (value: string | null) => void;
  onDraftStateChange: (state: PersianDateDraftState) => void;
}) {
  const { t } = useTranslation();
  return editable ? <PersianDatePicker value={value ?? ""} disabled={disabled}
    accessibleName={label} invalidValueMessage={t("common.invalidPersianDate")}
    onChange={next => onChange(next || null)} onDraftStateChange={onDraftStateChange} /> : formatPersianDate(value);
}
