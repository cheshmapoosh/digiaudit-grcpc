import { Children, Fragment, cloneElement, isValidElement, type HTMLAttributes, type ReactNode } from "react";
import "./catalog-form-grid.css";

interface FieldProps {
    children?: ReactNode;
    className?: string;
    fullWidth?: boolean;
    wide?: boolean;
}

const DATE_PAIR = /(?:modalDateRange|controlDateRangeRow|accountGroupDateRange|globalControlValidityRow)/;

function fields(children: ReactNode, prefix = ""): ReactNode[] {
    return Children.toArray(children).flatMap(child => {
        if (!isValidElement<FieldProps>(child)) return [child];
        if (child.type === Fragment) return fields(child.props.children, `${prefix}${child.key}:`);
        // Empty layout spacers should not consume a field position.
        if (child.type === "div" && !child.props.className && child.props.children == null) return [];
        return [cloneElement(child, { key: `${prefix}${child.key}` })];
    });
}

/** Layout only: keep existing fields, values and validation owned by their forms. */
export function CatalogFormGrid({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
    const items = fields(children);
    let slots = 0;
    for (const child of items) {
        const field = isValidElement<FieldProps>(child) ? child.props : {};
        const wide = field.fullWidth || field.wide || /(?:Wide\b|modalWideField)/.test(field.className ?? "");
        const pair = DATE_PAIR.test(field.className ?? "");
        if (wide || pair) slots += slots % 2 + 2;
        else slots += 1;
    }
    const columns = Math.ceil(slots / 2) > 3 ? 3 : 2;
    const classes = className.replace(/\bmodal(?:Two|Three)ColumnGrid\b/g, "").trim();
    return <div {...props} className={`catalogAdaptiveFormGrid ${classes}`} data-columns={columns}>{items}</div>;
}
