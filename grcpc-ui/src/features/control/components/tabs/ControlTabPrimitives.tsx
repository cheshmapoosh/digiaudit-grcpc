import { type CSSProperties, type ReactNode } from "react";
import {
    BusyIndicator,
    Button,
    Label,
    MessageStrip,
    Text,
    Title,
} from "@ui5/webcomponents-react";

import type { ControlTableColumn } from "./ControlTabUtils";

const PANEL_STYLE: CSSProperties = {
    display: "grid",
    gap: "1rem",
};

const TOOLBAR_STYLE: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
};

const TABLE_WRAP_STYLE: CSSProperties = {
    overflow: "auto",
    border: "1px solid var(--sapList_BorderColor)",
    background: "var(--sapList_Background)",
};

const TABLE_STYLE: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
};

const TABLE_HEADER_STYLE: CSSProperties = {
    padding: "0.5rem",
    border: "1px solid var(--sapList_BorderColor)",
    background: "var(--sapList_HeaderBackground)",
    fontWeight: 700,
    textAlign: "start",
    whiteSpace: "nowrap",
};

const TABLE_CELL_STYLE: CSSProperties = {
    padding: "0.5rem",
    border: "1px solid var(--sapList_BorderColor)",
    verticalAlign: "top",
    overflowWrap: "anywhere",
};

const FORM_FIELD_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.35rem",
};

export function ControlFormField({
    label,
    required = false,
    fullWidth = false,
    children,
}: {
    label: string;
    required?: boolean;
    fullWidth?: boolean;
    children: ReactNode;
}) {
    return (
        <div style={{ ...FORM_FIELD_STYLE, gridColumn: fullWidth ? "1 / -1" : undefined }}>
            <Label showColon required={required}>
                {label}
            </Label>
            {children}
        </div>
    );
}

export function ControlTabShell({
    title,
    action,
    loading,
    error,
    onErrorClose,
    hideErrorCloseButton = false,
    empty,
    children,
}: {
    title: string;
    action?: ReactNode;
    loading?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    hideErrorCloseButton?: boolean;
    empty?: boolean;
    children: ReactNode;
}) {
    return (
        <div style={PANEL_STYLE}>
            <div style={TOOLBAR_STYLE}>
                <Title level="H5">{title}</Title>
                {action}
            </div>

            {error ? (
                <MessageStrip
                    design="Negative"
                    hideCloseButton={hideErrorCloseButton}
                    onClose={hideErrorCloseButton ? undefined : onErrorClose}
                >
                    {error}
                </MessageStrip>
            ) : null}

            {loading ? (
                <div style={{ display: "grid", placeItems: "center", minHeight: "10rem" }}>
                    <BusyIndicator active delay={0} />
                </div>
            ) : empty ? (
                <Text>{children}</Text>
            ) : (
                children
            )}
        </div>
    );
}

export function ControlTable<T extends { id: string }>({
    items,
    columns,
    accessibleName,
}: {
    items: T[];
    columns: ControlTableColumn<T>[];
    accessibleName?: string;
}) {
    return (
        <div style={TABLE_WRAP_STYLE}>
            <table aria-label={accessibleName} style={TABLE_STYLE}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                style={{
                                    ...TABLE_HEADER_STYLE,
                                    width: column.width,
                                }}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            {columns.map((column) => (
                                <td key={column.key} style={TABLE_CELL_STYLE}>
                                    {column.render(item)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function RowActions({ children }: { children: ReactNode }) {
    return <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>{children}</div>;
}

export function DeleteButton({
    disabled,
    onClick,
    children,
}: {
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <Button design="Transparent" disabled={disabled} onClick={onClick}>
            {children}
        </Button>
    );
}
