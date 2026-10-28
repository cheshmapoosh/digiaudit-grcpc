import type { ReactNode } from "react";
import { FlexBox } from "@ui5/webcomponents-react";
import { useCatalogTableViewport } from "../hooks/useCatalogTableViewport";
import "./catalog-table-viewport.css";

export function CatalogTableViewport({ children, accessibleName, className = "" }: {
    children: ReactNode; accessibleName: string; className?: string;
}) {
    const ref = useCatalogTableViewport();
    return <FlexBox ref={ref} direction="Column" data-catalog-table-viewport
        className={`catalogTableViewport ${className}`} role="region" aria-label={accessibleName} tabIndex={0}>
        {children}
    </FlexBox>;
}
