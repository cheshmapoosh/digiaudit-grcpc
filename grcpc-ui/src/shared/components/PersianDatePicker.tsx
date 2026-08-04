import { useState } from "react";
import { DatePicker, Text } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-localization/dist/features/calendar/Persian.js";

export interface PersianDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    invalidValueMessage: string;
    accessibleName: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    valueState?: "None" | "Negative";
}

export function PersianDatePicker({
    value,
    onChange,
    invalidValueMessage,
    accessibleName,
    disabled = false,
    readonly = false,
    required = false,
    valueState = "None",
}: PersianDatePickerProps) {
    const [invalidState, setInvalidState] = useState({ value, invalid: false });
    const invalid = invalidState.value === value && invalidState.invalid;

    return (
        <DatePicker
            accessibleName={accessibleName}
            disabled={disabled}
            readonly={readonly}
            required={required}
            primaryCalendarType="Persian"
            value={value}
            valueFormat="yyyy-MM-dd"
            displayFormat="yyyy/MM/dd"
            valueState={invalid || valueState === "Negative" ? "Negative" : "None"}
            valueStateMessage={<Text>{invalidValueMessage}</Text>}
            onChange={(event) => {
                const { valid, value: apiValue } = event.detail;
                setInvalidState({ value, invalid: !valid });
                if (valid) {
                    onChange(apiValue);
                }
            }}
        />
    );
}
