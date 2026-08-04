import { useCallback, useEffect, useRef, useState } from "react";
import {
    DatePicker,
    Text,
    type DatePickerDomRef,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-localization/dist/features/calendar/Persian.js";

export interface PersianDateDraftState {
    draftValue: string;
    valid: boolean;
    dirty: boolean;
}

export interface PersianDatePickerProps {
    value: string;
    onChange?: (gregorianIsoValue: string) => void;
    onDraftStateChange?: (state: PersianDateDraftState) => void;
    invalidValueMessage: string;
    accessibleName: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    valueState?: "None" | "Negative";
}

function parseLocalGregorianDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
        ? date
        : null;
}

function toLocalGregorianIso(date: Date): string {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function PersianDatePicker({
    value,
    onChange,
    onDraftStateChange,
    invalidValueMessage,
    accessibleName,
    disabled = false,
    readonly = false,
    required = false,
    valueState = "None",
}: PersianDatePickerProps) {
    const pickerRef = useRef<DatePickerDomRef | null>(null);
    const onDraftStateChangeRef = useRef(onDraftStateChange);
    const modelDisplayRef = useRef("");
    const [displayValue, setDisplayValue] = useState("");
    const [draftInvalid, setDraftInvalid] = useState(false);

    useEffect(() => {
        onDraftStateChangeRef.current = onDraftStateChange;
    }, [onDraftStateChange]);

    const syncFromModel = useCallback((picker: DatePickerDomRef | null) => {
        if (!picker) return;
        const date = value ? parseLocalGregorianDate(value) : null;
        const nextDisplay = date ? picker.formatValue(date) : "";
        modelDisplayRef.current = nextDisplay;
        setDisplayValue(nextDisplay);
        setDraftInvalid(Boolean(value && !date));
        onDraftStateChangeRef.current?.({
            draftValue: nextDisplay,
            valid: !value || Boolean(date),
            dirty: false,
        });
    }, [value]);

    useEffect(() => {
        syncFromModel(pickerRef.current);
    }, [syncFromModel]);

    const reportDraft = (picker: DatePickerDomRef, draftValue: string) => {
        const valid = !draftValue.trim() || picker.isValidDisplayValue(draftValue);
        setDisplayValue(draftValue);
        setDraftInvalid(!valid);
        onDraftStateChangeRef.current?.({
            draftValue,
            valid,
            dirty: draftValue !== modelDisplayRef.current,
        });
    };

    return (
        <DatePicker
            ref={(picker) => {
                pickerRef.current = picker;
            }}
            accessibleName={accessibleName}
            disabled={disabled}
            readonly={readonly}
            required={required}
            primaryCalendarType="Persian"
            value={displayValue}
            displayFormat="yyyy/MM/dd"
            valueState={draftInvalid || valueState === "Negative" ? "Negative" : "None"}
            valueStateMessage={<Text>{invalidValueMessage}</Text>}
            onInput={(event) => reportDraft(event.target, event.target.value)}
            onChange={(event) => {
                const draftValue = event.target.value;
                reportDraft(event.target, draftValue);
                if (!event.detail.valid) return;
                if (!draftValue.trim()) {
                    onChange?.("");
                    return;
                }
                const selectedDate = event.target.dateValue;
                if (selectedDate) {
                    onChange?.(toLocalGregorianIso(selectedDate));
                }
            }}
        />
    );
}
